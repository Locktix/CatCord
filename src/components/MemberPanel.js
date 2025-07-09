import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const statusColors = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-400",
  offline: "bg-gray-400"
};

export default function MemberPanel({ serverId, onStartDM }) {
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const [leaving, setLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

  const handleStartDM = async (uid) => {
    if (onStartDM) {
      onStartDM(uid);
    }
  };

  const handleLeaveServer = async () => {
    if (!currentUser || !serverId) return;
    
    // L'owner ne peut pas quitter le serveur (il doit le supprimer)
    if (owner === currentUser.uid) {
      alert("En tant que propriétaire, vous ne pouvez pas quitter le serveur. Vous devez le supprimer depuis les paramètres.");
      return;
    }

    setLeaving(true);
    try {
      await updateDoc(doc(db, "servers", serverId), {
        members: arrayRemove(currentUser.uid)
      });
      // Rediriger vers la liste des serveurs
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors du départ du serveur:", error);
      alert("Erreur lors du départ du serveur");
    }
    setLeaving(false);
    setShowLeaveConfirm(false);
  };

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
        {uid !== currentUser?.uid && (
          <button
            className="ml-auto text-xs bg-purple-700 hover:bg-purple-800 text-white px-2 py-1 rounded transition"
            onClick={() => handleStartDM(uid)}
          >
            Message privé
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="w-56 bg-gray-800 h-screen p-4 border-l border-gray-900 flex flex-col">
      <h3 className="text-lg font-bold mb-4">Membres</h3>
      {loading ? (
        <div className="text-purple-200">Chargement...</div>
      ) : (
        <>
          <ul className="space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-700 scrollbar-track-gray-900 min-h-0">
            {owner && renderMember(owner, true)}
            {members.filter(uid => uid !== owner).map(uid => renderMember(uid, false))}
          </ul>
          {/* Bouton pour quitter le serveur */}
          {currentUser && owner !== currentUser.uid && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowLeaveConfirm(true)}
                disabled={leaving}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-3 py-2 rounded text-sm font-semibold transition"
              >
                {leaving ? "Départ..." : "Quitter le serveur"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Overlay de confirmation pour quitter (modale centrale) */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Quitter le serveur</h3>
            <p className="text-purple-200 mb-6">Êtes-vous sûr de vouloir quitter ce serveur ?</p>
            <div className="flex gap-3">
              <button
                onClick={handleLeaveServer}
                disabled={leaving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 py-2 rounded font-semibold"
              >
                {leaving ? "Départ..." : "Quitter"}
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
                className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-4 py-2 rounded font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 