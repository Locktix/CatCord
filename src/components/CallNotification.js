import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, onSnapshot, deleteDoc, setDoc, collection, query, where } from "firebase/firestore";
import CallModal from "./CallModal";

export default function CallNotification() {
  const [incomingCall, setIncomingCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // Écouter seulement les offres d'appel (documents qui commencent par "offer_")
    const callsQuery = query(
      collection(db, "calls"), 
      where("to", "==", user.uid)
    );

    const unsubOffers = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const docId = change.doc.id;
        
        // Vérifier que c'est une offre d'appel (commence par "offer_")
        if (data && data.offer && data.from !== user.uid && change.type === 'added' && docId.startsWith('offer_')) {
          console.log("Appel entrant détecté:", data);
          setIncomingCall({
            ...data,
            callId: change.doc.id
          });
        }
        
        // Si l'offre est supprimée, nettoyer l'état seulement si on n'a pas encore accepté
        if (change.type === 'removed' && docId.startsWith('offer_') && !showCallModal) {
          setIncomingCall(null);
        }
      });
    });

    return () => unsubOffers();
  }, [user, showCallModal]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    setShowCallModal(true);
    // Ne pas supprimer incomingCall ici, le CallModal s'en occupera
    
    console.log("Appel accepté, ouverture du modal");
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    
    try {
      // Envoyer la réponse de refus
      const callDocId = `${incomingCall.dmId}_${incomingCall.from}_${user.uid}`;
      const answerDoc = doc(db, "calls", `answer_${callDocId}`);
      
      await setDoc(answerDoc, {
        from: user.uid,
        to: incomingCall.from,
        answer: "declined",
        dmId: incomingCall.dmId,
        timestamp: Date.now()
      });
      
      // Supprimer l'offre
      await deleteDoc(doc(db, "calls", incomingCall.callId));
      
      console.log("Appel refusé");
    } catch (error) {
      console.error("Erreur lors du refus:", error);
    }
    
    setIncomingCall(null);
  };

  const handleCloseCallModal = () => {
    setShowCallModal(false);
    setIncomingCall(null); // Nettoyer quand le modal se ferme
  };

  if (!incomingCall && !showCallModal) return null;

  if (incomingCall && !showCallModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg p-6 flex flex-col items-center">
          <div className="text-2xl mb-4">📞</div>
          <h2 className="text-xl font-bold text-white mb-2">Appel entrant</h2>
          <p className="text-purple-200 mb-4">de {incomingCall.fromName || incomingCall.from}</p>
          <div className="flex gap-4">
            <button 
              onClick={handleAcceptCall}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded text-white font-semibold"
            >
              Accepter
            </button>
            <button 
              onClick={handleDeclineCall}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded text-white font-semibold"
            >
              Refuser
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCallModal && incomingCall) {
    return (
      <CallModal
        open={showCallModal}
        onClose={handleCloseCallModal}
        otherUser={{ uid: incomingCall.from, pseudo: incomingCall.fromName }}
        dmId={incomingCall.dmId}
        isReceiver={true}
      />
    );
  }

  return null;
} 