import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const statusColors = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-400",
  offline: "bg-gray-400"
};

export default function MemberPanel({ serverId }) {
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    if (!serverId) return;
    setLoading(true);
    const fetchMembers = async () => {
      const serverSnap = await getDoc(doc(db, "servers", serverId));
      if (!serverSnap.exists()) {
        setMembers([]);
        setOwner(null);
        setProfiles({});
        setLoading(false);
        return;
      }
      const data = serverSnap.data();
      setOwner(data.owner);
      setMembers(data.members || []);
      // Récupérer les profils
      const profs = {};
      await Promise.all((data.members || []).map(async uid => {
        const snap = await getDoc(doc(db, "users", uid));
        profs[uid] = snap.exists() ? snap.data() : {};
      }));
      setProfiles(profs);
      setLoading(false);
    };
    fetchMembers();
  }, [serverId]);

  // Pour afficher l'email, on utilise l'API Auth (limité au user courant, sinon on affiche l'uid)
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!serverId) return <div className="w-56 bg-gray-800 h-screen p-4 border-l border-gray-900"></div>;

  const renderMember = (uid, isOwner = false) => {
    const p = profiles[uid] || {};
    return (
      <li key={uid} className={`rounded px-3 py-2 flex items-center gap-2 ${isOwner ? 'bg-indigo-700 text-white font-semibold' : 'bg-gray-900 text-purple-200'}`}>
        <div className="relative">
          <img
            src={p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500"
          />
          <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-gray-800 ${statusColors[p.status] || 'bg-gray-400'}`}></span>
        </div>
        <span className="font-semibold text-sm">{p.pseudo || uid}</span>
        {isOwner && <span className="text-xs bg-indigo-900 px-2 py-1 rounded ml-2">Owner</span>}
      </li>
    );
  };

  return (
    <div className="w-56 bg-gray-800 h-screen p-4 border-l border-gray-900 flex flex-col">
      <h3 className="text-lg font-bold mb-4">Membres</h3>
      {loading ? (
        <div className="text-purple-200">Chargement...</div>
      ) : (
        <ul className="space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-700 scrollbar-track-gray-900 min-h-0">
          {owner && renderMember(owner, true)}
          {members.filter(uid => uid !== owner).map(uid => renderMember(uid, false))}
        </ul>
      )}
    </div>
  );
} 