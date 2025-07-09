import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, onSnapshot, deleteDoc, setDoc } from "firebase/firestore";
import CallModal from "./CallModal";

export default function CallNotification() {
  const [incomingCall, setIncomingCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // Écouter les appels entrants
    const unsubOffers = onSnapshot(doc(db, "calls", "global_offers"), (snap) => {
      const data = snap.data();
      if (data && data.to === user.uid && data.from !== user.uid) {
        setIncomingCall(data);
      }
    });

    return () => unsubOffers();
  }, [user]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    setShowCallModal(true);
    setIncomingCall(null);
    
    // Envoyer la réponse d'acceptation
    await setDoc(doc(db, "calls", "global_answers"), {
      from: user.uid,
      to: incomingCall.from,
      answer: "accepted",
      dmId: incomingCall.dmId
    });
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    
    // Envoyer la réponse de refus
    await setDoc(doc(db, "calls", "global_answers"), {
      from: user.uid,
      to: incomingCall.from,
      answer: "declined",
      dmId: incomingCall.dmId
    });
    
    setIncomingCall(null);
  };

  const handleCloseCallModal = () => {
    setShowCallModal(false);
  };

  if (!incomingCall && !showCallModal) return null;

  if (incomingCall) {
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

  if (showCallModal) {
    return (
      <CallModal
        open={showCallModal}
        onClose={handleCloseCallModal}
        otherUser={{ uid: incomingCall?.from, pseudo: incomingCall?.fromName }}
        dmId={incomingCall?.dmId}
        isReceiver={true}
      />
    );
  }

  return null;
} 