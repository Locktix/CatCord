import React, { useEffect, useRef, useState } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";

export default function CallModal({ open, onClose, otherUser, dmId, isReceiver = false }) {
  const [callState, setCallState] = useState("connecting"); // connecting, in-call, ended
  const [error, setError] = useState(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pcRef = useRef();
  const localStreamRef = useRef();
  const user = auth.currentUser;
  const callDocId = `${dmId}_${user.uid}_${otherUser.uid}`;

  // Utilitaires Firestore pour la signalisation
  const offerDoc = doc(db, "calls", "global_offers");
  const answerDoc = doc(db, "calls", "global_answers");

  useEffect(() => {
    if (!open) return;
    
    if (isReceiver) {
      // Si c'est le receveur, attendre l'offre
      waitForOffer();
    } else {
      // Si c'est l'initiateur, démarrer l'appel
      checkPermissionsAndStartCall();
    }
    
    return () => cleanup();
    // eslint-disable-next-line
  }, [open]);

  async function waitForOffer() {
    setCallState("waiting");
    
    // Créer un objet temporaire pour stocker les listeners
    const listeners = {};
    
    // Écouter l'offre de l'initiateur
    listeners.unsubOffer = onSnapshot(offerDoc, async (snap) => {
      const data = snap.data();
      if (data && data.to === user.uid && data.from === otherUser.uid) {
        // Accepter l'appel automatiquement
        await acceptCall(data.offer);
      }
    });
    
    // Écouter les réponses
    listeners.unsubAnswer = onSnapshot(answerDoc, async (snap) => {
      const data = snap.data();
      if (data && data.to === user.uid && data.from === otherUser.uid) {
        if (data.answer === "declined") {
          setError("L'appel a été refusé");
          setCallState("ended");
        }
      }
    });
    
    // Stocker les listeners dans pcRef pour le cleanup
    pcRef.current = { _listeners: listeners };
  }

  async function acceptCall(offer) {
    try {
      // Obtenir les permissions
      const localStream = await getLocalStream();
      
      // Créer la connexion WebRTC
      const pc = new window.RTCPeerConnection();
      pcRef.current = pc;
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      
      // Gérer les événements
      setupPeerConnection(pc);
      
      // Accepter l'offre
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Envoyer la réponse
      await setDoc(answerDoc, { 
        answer: answer, 
        from: user.uid, 
        to: otherUser.uid,
        dmId: dmId 
      });
      
      setCallState("in-call");
    } catch (err) {
      setError("Erreur lors de l'acceptation de l'appel: " + err.message);
      setCallState("ended");
    }
  }

  async function checkPermissionsAndStartCall() {
    try {
      // Vérifier les permissions
      const permissions = await navigator.permissions.query({ name: 'microphone' });
      if (permissions.state === 'denied') {
        setError("Permission microphone refusée. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
        setCallState("ended");
        return;
      }
      
      // Essayer d'obtenir les permissions
      await navigator.mediaDevices.getUserMedia({ audio: true });
      startCall();
    } catch (err) {
      setError("Impossible d'accéder au microphone. Vérifiez les permissions de votre navigateur.");
      setCallState("ended");
    }
  }

  async function getLocalStream() {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (videoError) {
      console.log("Vidéo non disponible, tentative audio seul:", videoError);
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
  }

  function setupPeerConnection(pc) {
    // ICE candidates locaux
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await setDoc(doc(db, "calls", `${callDocId}_ice_${user.uid}`), { candidate: event.candidate.toJSON() });
      }
    };

    // Flux distant
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
  }

  async function startCall() {
    setCallState("connecting");
    try {
      // 1. Obtenir le flux local
      const localStream = await getLocalStream();
      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      // 2. Créer la connexion WebRTC
      const pc = new window.RTCPeerConnection();
      pcRef.current = pc;
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      // 3. Configurer la connexion
      setupPeerConnection(pc);

      // 4. Créer et envoyer l'offre
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(offerDoc, { 
        offer: offer, 
        from: user.uid, 
        to: otherUser.uid,
        fromName: user.displayName || user.email,
        dmId: dmId 
      });

      // 5. Écouter la réponse
      const unsubAnswer = onSnapshot(answerDoc, async (snap) => {
        const data = snap.data();
        if (data && data.to === user.uid && data.from === otherUser.uid) {
          if (data.answer === "declined") {
            setError("L'appel a été refusé");
            setCallState("ended");
          } else if (data.answer && data.answer.type) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallState("in-call");
          }
        }
      });

      // 6. Écouter les ICE candidates distants
      const unsubRemoteIce = onSnapshot(doc(db, "calls", `${callDocId}_ice_${otherUser.uid}`), async (snap) => {
        const data = snap.data();
        if (data && data.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {}
        }
      });

      // Cleanup listeners on unmount
      pcRef.current._unsubAnswer = unsubAnswer;
      pcRef.current._unsubRemoteIce = unsubRemoteIce;
    } catch (err) {
      setError("Erreur lors de l'initialisation de l'appel : " + err.message);
      setCallState("ended");
    }
  }

  async function cleanup() {
    if (pcRef.current) {
      // Si c'est une connexion WebRTC, la fermer
      if (pcRef.current.close) {
        pcRef.current.close();
      }
      
      // Nettoyer les listeners
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
      await deleteDoc(offerDoc);
      await deleteDoc(answerDoc);
      await deleteDoc(doc(db, "calls", `${callDocId}_ice_${user.uid}`));
      await deleteDoc(doc(db, "calls", `${callDocId}_ice_${otherUser.uid}`));
    } catch (error) {
      console.log("Erreur lors du nettoyage des documents:", error);
    }
    
    setCallState("ended");
  }

  async function handleHangup() {
    await cleanup();
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 flex flex-col items-center">
        <h2 className="text-xl font-bold text-white mb-4">Appel avec {otherUser.pseudo || otherUser.uid}</h2>
        <div className="flex gap-4 mb-4">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-40 h-32 bg-black rounded" />
          <video ref={remoteVideoRef} autoPlay playsInline className="w-40 h-32 bg-black rounded" />
        </div>
        <div className="mb-2 text-purple-200">{callState === "connecting" ? "Connexion..." : callState === "in-call" ? "En appel" : "Appel terminé"}</div>
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
          {error && (
            <button onClick={startCall} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold">Réessayer</button>
          )}
        </div>
      </div>
    </div>
  );
} 