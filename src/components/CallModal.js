// TODO DELETE ALL DOCS ON CLEANUP

import React, { useEffect, useRef, useState } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, onSnapshot, deleteDoc, collection, addDoc } from "firebase/firestore";

export default function CallModal({ open, onClose, otherUser, dmId, isReceiver = false }) {
  const [callState, setCallState] = useState("connecting"); // connecting, in-call, ended
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(""); // Pour le debug
  const [isCallActive, setIsCallActive] = useState(false); // Pour empêcher les doubles appels
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pcRef = useRef();
  const localStreamRef = useRef();
  const user = auth.currentUser;
  const pendingCandidates = useRef([]); // Buffer ICE candidates
  const remoteAnswerSet = useRef(false); // Pour éviter double setRemoteDescription

  // ID SYMÉTRIQUE pour la signalisation (toujours le même pour les deux utilisateurs)
  const callDocId = [dmId, user.uid, otherUser.uid].sort().join('_');
  console.log("callDocId utilisé :", callDocId, "user.uid:", user.uid, "otherUser.uid:", otherUser.uid, "dmId:", dmId);
  const offerDoc = doc(db, "calls", `offer_${callDocId}`);
  const answerDoc = doc(db, "calls", `answer_${callDocId}`);
  const localIceDoc = doc(db, "calls", `${callDocId}_ice_${user.uid}`);
  const remoteIceDoc = doc(db, "calls", `${callDocId}_ice_${otherUser.uid}`);

  useEffect(() => {
    if (!open) return;
    setCallState("connecting");
    setError(null);
    setDebugInfo("Initialisation...");
    setIsCallActive(false);
    remoteAnswerSet.current = false; // Reset à chaque nouvel appel
    if (isReceiver) {
      waitForOffer();
    } else {
      checkPermissionsAndStartCall();
    }
    return () => cleanup();
    // eslint-disable-next-line
  }, [open]);

  // Empêcher double appel
  useEffect(() => {
    if (!open || isReceiver) return;
    const checkExistingCall = onSnapshot(offerDoc, (snap) => {
      const data = snap.data();
      if (data && data.from === otherUser.uid && data.to === user.uid) {
        setDebugInfo("Appel entrant détecté, fermeture de l'initiateur");
        setError("L'autre utilisateur vous appelle déjà");
        setCallState("ended");
        setIsCallActive(true);
      }
    });
    return () => checkExistingCall();
  }, [open, isReceiver]);

  async function waitForOffer() {
    setCallState("waiting");
    setDebugInfo("En attente de l'offre...");
    const listeners = {};
    listeners.unsubOffer = onSnapshot(offerDoc, async (snap) => {
      const data = snap.data();
      console.log("Data reçu dans waitForOffer:", data);
      if (!data || typeof data.offer !== "object") {
        // Document sans offre valide, on ignore
        return;
      }
      console.log("Offre reçue (brut):", data.offer);
      setDebugInfo(`Offre reçue: ${data ? JSON.stringify(data) : 'non'}`);
      setIsCallActive(true);
      await acceptCall(data.offer);
    });
    listeners.unsubAnswer = onSnapshot(answerDoc, async (snap) => {
      const data = snap.data();
      if (!data || !data.answer) return; // Ignore les docs invalides
      console.log("Réponse reçue:", data.answer);
      setDebugInfo(`Réponse reçue: ${data ? JSON.stringify(data) : 'non'}`);
      if (data && data.to === user.uid && data.from === otherUser.uid) {
        if (data.answer === "declined") {
          setError("L'appel a été refusé");
          setCallState("ended");
        }
      }
    });
    pcRef.current = { _listeners: listeners };
  }

  async function acceptCall(offer) {
    console.log("acceptCall exécuté (receveur)", offer);
    try {
      setDebugInfo("Acceptation de l'appel...");
      const localStream = await getLocalStream();
      const pc = new window.RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      setupPeerConnection(pc);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Ajoute tous les ICE candidates reçus avant la remote description
      for (const candidate of pendingCandidates.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Erreur ajout ICE candidate (buffer):", e);
        }
      }
      pendingCandidates.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("ECRITURE ANSWER FIRESTORE", answerDoc, answer);
      await setDoc(answerDoc, {
        answer: answer,
        from: user.uid,
        to: otherUser.uid,
        dmId: dmId,
        timestamp: Date.now()
      });
      console.log("Réponse écrite dans Firestore !");
      try {
        //await deleteDoc(offerDoc);
      } catch (e) {
        console.log("Offre déjà supprimée");
      }
      setCallState("in-call");
      setDebugInfo("Appel accepté et connecté");
    } catch (err) {
      console.error("Erreur acceptCall:", err);
      setError("Erreur lors de l'acceptation de l'appel: " + err.message);
      setCallState("ended");
    }
  }

  async function checkPermissionsAndStartCall() {
    console.log("🔍 checkPermissionsAndStartCall DÉMARRÉ");
    try {
      setDebugInfo("Vérification des permissions...");
      const permissions = await navigator.permissions.query({ name: 'microphone' });
      if (permissions.state === 'denied') {
        setError("Permission microphone refusée. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
        setCallState("ended");
        return;
      }
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setDebugInfo("Permissions OK, démarrage de l'appel...");
      startCall();
    } catch (err) {
      console.error("Erreur permissions:", err);
      setError("Impossible d'accéder au microphone. Vérifiez les permissions de votre navigateur.");
      setCallState("ended");
    }
  }

  async function getLocalStream() {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  function setupPeerConnection(pc) {
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log("ICE candidate local:", event.candidate);
        await setDoc(localIceDoc, {
          candidate: event.candidate.toJSON(),
          timestamp: Date.now()
        });
      }
    };
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      setDebugInfo(`État connexion: ${pc.connectionState}`);
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        setCallState("ended");
        setError("Connexion perdue");
      }
    };
    pc.ontrack = (event) => {
      console.log("Track reçu:", event.streams[0]);
      setDebugInfo("Flux distant reçu");
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      setDebugInfo(`ICE: ${pc.iceConnectionState}`);
    };
  }

  async function startCall() {
    console.log("🚀 startCall DÉMARRÉ");
    setCallState("connecting");
    setDebugInfo("Démarrage de l'appel...");
    setIsCallActive(true);
    try {
      const localStream = await getLocalStream();
      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      setDebugInfo("Flux local obtenu");
      const pc = new window.RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      setupPeerConnection(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Envoi de l\'offre dans Firestore:', offer);
      try {
        await setDoc(offerDoc, {
          type: "offer",
          offer: offer,
          from: user.uid,
          to: otherUser.uid,
          fromName: user.displayName || user.email,
          dmId: dmId,
          timestamp: Date.now()
        });
        console.log("✅ Écriture réussie dans Firestore");
      } catch (writeError) {
        console.error("❌ Erreur écriture Firestore:", writeError);
        setError("Impossible d'écrire dans Firestore: " + writeError.message);
        setCallState("ended");
        return;
      }
      console.log("OFFER DOC ÉCRIT !");
      console.log("=== CONFIRMATION ÉCRITURE ===");
      console.log("Document ID:", offerDoc.id);
      console.log("Collection:", offerDoc.parent.id);
      console.log("Données écrites:", {
        type: "offer",
        offer: offer,
        from: user.uid,
        to: otherUser.uid,
        fromName: user.displayName || user.email,
        dmId: dmId,
        timestamp: Date.now()
      });
      const unsubAnswer = onSnapshot(answerDoc, async (snap) => {
        const data = snap.data();
        if (!data || (typeof data.answer !== "object" && data.answer !== "declined")) {
          // Document sans réponse valide, on ignore
          return;
        }
        console.log("Réponse reçue:", data.answer);
        if (data.answer && typeof data.answer === "object" && !remoteAnswerSet.current) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          for (const c of pendingCandidates.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
          pendingCandidates.current = [];
          setCallState("in-call");
          setDebugInfo("Appel connecté");
          remoteAnswerSet.current = true; // Marque comme fait
        }
      });
      const unsubRemoteIce = onSnapshot(remoteIceDoc, async (snap) => {
        const data = snap.data();
        if (data && data.candidate) {
          console.log("ICE candidate distant reçu:", data.candidate);
          setDebugInfo("ICE distant reçu");
                     const candidateObj = data.candidate;
           if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
             // Bufferise si remoteDescription pas encore posée
             pendingCandidates.current.push(candidateObj);
           } else {
             try {
               await pc.addIceCandidate(new RTCIceCandidate(candidateObj));
             } catch (e) {
               console.error("Erreur ajout ICE candidate:", e);
             }
           }
        }
      });
      pcRef.current._unsubAnswer = unsubAnswer;
      pcRef.current._unsubRemoteIce = unsubRemoteIce;
    } catch (err) {
      console.error("Erreur startCall:", err);
      setError("Erreur lors de l'initialisation de l'appel : " + err.message);
      setCallState("ended");
    }
  }

  async function cleanup() {
    setDebugInfo("Nettoyage...");
    remoteAnswerSet.current = false; // Reset le flag au cleanup
    if (pcRef.current) {
      if (pcRef.current.close) {
        pcRef.current.close();
      }
      if (pcRef.current._listeners) {
        if (pcRef.current._listeners.unsubOffer) pcRef.current._listeners.unsubOffer();
        if (pcRef.current._listeners.unsubAnswer) pcRef.current._listeners.unsubAnswer();
      }
      if (pcRef.current._unsubAnswer) pcRef.current._unsubAnswer();
      if (pcRef.current._unsubRemoteIce) pcRef.current._unsubRemoteIce();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      //await deleteDoc(offerDoc);
      //await deleteDoc(answerDoc);
      //await deleteDoc(localIceDoc);
     // await deleteDoc(remoteIceDoc);
    } catch (error) {
      console.log("Erreur lors du nettoyage des documents:", error);
    }
    setCallState("ended");
    setIsCallActive(false);
    remoteAnswerSet.current = false; // Reset le flag à chaque nouvel appel
  }

  async function handleHangup() {
    await cleanup();
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 flex flex-col items-center max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Appel avec {otherUser.pseudo || otherUser.uid}</h2>
        <div className="flex gap-4 mb-4">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-40 h-32 bg-black rounded" />
          <video ref={remoteVideoRef} autoPlay playsInline className="w-40 h-32 bg-black rounded" />
        </div>
        <div className="mb-2 text-purple-200">
          {callState === "connecting" ? "Connexion..." :
            callState === "waiting" ? "En attente..." :
            callState === "in-call" ? "En appel" : "Appel terminé"}
        </div>
        {/* Debug info */}
        <div className="text-xs text-gray-400 mb-2 text-center max-w-sm">
          {debugInfo}
        </div>
        {error && (
          <div className="text-red-400 mb-2 text-center max-w-sm">
            {error}
            <div className="text-xs text-gray-400 mt-1">
              Vérifiez que votre navigateur a accès au microphone et à la caméra.
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={handleHangup} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-semibold">Raccrocher</button>
          {error && !isCallActive && (
            <button onClick={startCall} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold">Réessayer</button>
          )}
        </div>
      </div>
    </div>
  );
} 