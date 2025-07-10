import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";

export default function DMList({ selectedDM, onSelect, onBack }) {
  const user = auth.currentUser;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "privateConversations"),
      where("members", "array-contains", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (!user) return null;

  return (
    <div className="w-56 bg-gray-800 h-screen p-4 border-r border-gray-900 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        {onBack && (
          <button onClick={onBack} className="text-purple-300 hover:text-white text-xl">←</button>
        )}
        <h3 className="text-lg font-bold">Messages privés</h3>
      </div>
      {loading ? (
        <div className="text-purple-200">Chargement...</div>
      ) : conversations.length === 0 ? (
        <div className="text-purple-300">Aucune conversation.</div>
      ) : (
        <ul className="space-y-2">
          {conversations.map(conv => {
            const otherUid = conv.members.find(uid => uid !== user.uid);
            return (
              <DMListItem
                key={conv.id}
                convId={conv.id}
                otherUid={otherUid}
                selected={selectedDM === conv.id}
                onSelect={onSelect}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DMListItem({ convId, otherUid, selected, onSelect }) {
  const [otherProfile, setOtherProfile] = React.useState(null);
  
  React.useEffect(() => {
    if (!otherUid) return; // Protection contre otherUid undefined
    const unsub = onSnapshot(doc(db, "users", otherUid), (snap) => {
      setOtherProfile(snap.data());
    });
    return () => unsub();
  }, [otherUid]);
  
  // Si otherUid n'existe pas, on ne rend rien
  if (!otherUid) return null;
  
  return (
    <li>
      <button
        onClick={() => onSelect(convId)}
        className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition text-sm font-medium ${selected ? 'bg-purple-700 text-white' : 'bg-gray-900 hover:bg-purple-800 text-purple-200'}`}
      >
        <img src={otherProfile?.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${otherUid}`} alt="avatar" className="w-6 h-6 rounded-full object-cover mr-2" />
        <span className="font-semibold">{otherProfile ? `${otherProfile.pseudo}${otherProfile.discriminator ? '#' + otherProfile.discriminator : ''}` : '...'}</span>
      </button>
    </li>
  );
} 