import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc } from "firebase/firestore";

export default function InviteModal({ serverId, onClose }) {
  const user = auth.currentUser;
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Récupère les membres du serveur
  const [members, setMembers] = useState([]);
  useEffect(() => {
    getDoc(doc(db, "servers", serverId)).then(snap => setMembers(snap.data()?.members || []));
  }, [serverId]);

  // Suggestions d'amis non membres
  useEffect(() => {
    let active = true;
    if (!search.trim() || search.length < 2) {
      setSuggestions([]);
      return;
    }
    (async () => {
      setLoading(true);
      const val = search.trim();
      let q;
      if (val.includes('#')) {
        const [pseudo, discriminator] = val.split('#');
        q = query(collection(db, "users"), where("pseudo", ">=", pseudo), where("pseudo", "<=", pseudo + '\uf8ff'), where("discriminator", ">=", discriminator || "0000"), where("discriminator", "<=", (discriminator || "9999") + '\uf8ff'));
      } else {
        q = query(collection(db, "users"), where("pseudo", ">=", val), where("pseudo", "<=", val + '\uf8ff'));
      }
      const snap = await getDocs(q);
      if (!active) return;
      setSuggestions(snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid && !members.includes(u.id))
        .slice(0, 5));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [search, user, members]);

  // Invitation : envoie un message dans le DM
  const handleInvite = async (friend) => {
    setError(""); setSuccess("");
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
    // Envoie le message d'invitation
    await addDoc(collection(db, "privateConversations", convId, "messages"), {
      text: `Invitation à rejoindre un serveur` ,
      type: "invite",
      serverId,
      dmId: convId,
      from: user.uid,
      createdAt: new Date(),
      status: "pending"
    });
    setSuccess("Invitation envoyée dans les DM !");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl relative max-w-md w-full">
        <button className="absolute top-4 right-4 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
        <h2 className="text-2xl font-bold mb-6">Inviter un membre</h2>
        <input
          type="text"
          placeholder="Pseudo ou pseudo#ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none mb-4"
        />
        {loading && <div className="text-purple-200 mb-2">Recherche...</div>}
        {suggestions.length > 0 && (
          <ul className="mb-4 space-y-2">
            {suggestions.map(u => (
              <li key={u.id} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2">
                <img src={u.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${u.id}`} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500" />
                <span className="font-semibold">{u.pseudo}</span>
                <span className="text-xs text-purple-300">#{u.discriminator}</span>
                <button onClick={() => handleInvite(u)} className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-sm font-semibold">Inviter</button>
              </li>
            ))}
          </ul>
        )}
        {success && <div className="text-green-400 text-sm mb-2">{success}</div>}
        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
      </div>
    </div>
  );
} 