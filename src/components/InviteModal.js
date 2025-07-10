import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, onSnapshot } from "firebase/firestore";

export default function InviteModal({ serverId, onClose }) {
  const user = auth.currentUser;
  const [friends, setFriends] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Récupère la liste d'amis
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      const data = snap.data();
      setFriends(data?.friends || []);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Récupère les membres du serveur
  useEffect(() => {
    getDoc(doc(db, "servers", serverId)).then(snap => setMembers(snap.data()?.members || []));
  }, [serverId]);

  // Invitation : envoie un message dans le DM
  const handleInvite = async (friend) => {
    setError(""); setSuccess("");
    try {
      // Crée ou récupère le DM
      const membersArr = [user.uid, friend.id].sort();
      const q = query(collection(db, "privateConversations"), where("members", "==", membersArr));
      const snap = await getDocs(q);
      let convId;
      if (!snap.empty) {
        convId = snap.docs[0].id;
      } else {
        const docRef = await addDoc(collection(db, "privateConversations"), { members: membersArr });
        convId = docRef.id;
      }
      
      // Récupère le nom du serveur
      const serverDoc = await getDoc(doc(db, "servers", serverId));
      const serverName = serverDoc.data()?.name || "Serveur";
      
      // Envoie le message d'invitation
      await addDoc(collection(db, "privateConversations", convId, "messages"), {
        text: `Invitation à rejoindre le serveur "${serverName}"`,
        type: "invite",
        serverId,
        dmId: convId,
        from: user.uid,
        author: user.email,
        authorId: user.uid,
        createdAt: new Date(),
        status: "pending"
      });
      setSuccess(`Invitation envoyée à ${friend.pseudo} dans les DM !`);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'invitation:", error);
      setError("Erreur lors de l'envoi de l'invitation");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl relative max-w-md w-full">
        <button className="absolute top-4 right-4 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
        <h2 className="text-2xl font-bold mb-6">Inviter un ami</h2>
        
        {loading ? (
          <div className="text-purple-200">Chargement...</div>
        ) : friends.length === 0 ? (
          <div className="text-purple-300 mb-4">Tu n'as pas encore d'amis.</div>
        ) : (
          <div className="mb-4">
            <h3 className="text-lg font-bold mb-3 text-purple-200">Tes amis</h3>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {friends
                .filter(friendId => !members.includes(friendId)) // Filtre les amis déjà membres
                .map(friendId => (
                  <FriendInviteItem key={friendId} uid={friendId} onInvite={handleInvite} />
                ))}
            </ul>
            {friends.filter(friendId => !members.includes(friendId)).length === 0 && (
              <div className="text-purple-300 text-center py-4">Tous tes amis sont déjà membres de ce serveur.</div>
            )}
          </div>
        )}
        
        {success && <div className="text-green-400 text-sm mb-2">{success}</div>}
        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
      </div>
    </div>
  );
}

function FriendInviteItem({ uid, onInvite }) {
  const [profile, setProfile] = useState(null);
  const [inviting, setInviting] = useState(false);
  
  useEffect(() => {
    getDoc(doc(db, "users", uid)).then(snap => setProfile(snap.data()));
  }, [uid]);
  
  const handleInvite = async () => {
    setInviting(true);
    await onInvite({ id: uid, ...profile });
    setInviting(false);
  };
  
  if (!profile) return <div className="text-purple-300">Chargement...</div>;
  
  return (
    <li className="flex items-center gap-3 bg-gray-800 rounded px-3 py-2">
      <img 
        src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`} 
        alt="avatar" 
        className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500" 
      />
      <div className="flex-1">
        <span className="font-semibold text-white">{profile.pseudo}</span>
        {profile.discriminator && (
          <span className="text-xs text-purple-300 ml-1">#{profile.discriminator}</span>
        )}
      </div>
      <button 
        onClick={handleInvite}
        disabled={inviting}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm font-semibold"
      >
        {inviting ? "Invitation..." : "Inviter"}
      </button>
    </li>
  );
} 