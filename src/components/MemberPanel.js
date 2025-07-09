import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, arrayRemove, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const statusColors = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-400",
  offline: "bg-gray-400"
};

function MemberProfileModal({ uid, onClose, onDM, onAddFriend, isFriend, isSelf }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    getDoc(doc(db, "users", uid)).then(snap => setProfile(snap.data()));
  }, [uid]);
  if (!profile) return null;
  const createdAt = profile.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : "?";
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl relative max-w-xs w-full flex flex-col items-center">
        <button className="absolute top-4 right-4 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
        <img src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 mb-4" />
        <div className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          {profile.pseudo} <span className="text-purple-300">#{profile.discriminator}</span> {profile.owner && <span>👑</span>}
        </div>
        <div className="text-sm text-purple-200 mb-2">Inscrit le : {createdAt}</div>
        {profile.status && <div className="text-xs text-green-400 mb-1">Statut : {profile.status}</div>}
        {!isSelf && (
          <div className="flex gap-2 mt-2">
            {isFriend ? (
              <button onClick={() => onDM(uid)} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-semibold">Message privé</button>
            ) : (
              <button onClick={() => onAddFriend(uid)} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white font-semibold">Ajouter en ami</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MemberPanel({ serverId, onStartDM }) {
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const [leaving, setLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [friends, setFriends] = useState([]);

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

  // Récupérer la liste d'amis de l'utilisateur courant
  const auth = getAuth();
  const currentUser = auth.currentUser;
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid)).then(snap => setFriends(snap.data()?.friends || []));
  }, [currentUser]);

  const handleStartDM = async (uid) => {
    if (onStartDM) {
      onStartDM(uid);
    }
  };

  const handleAddFriend = async (uid) => {
    if (!currentUser) return;
    await addDoc(collection(db, "friendRequests"), {
      from: currentUser.uid,
      to: uid,
      status: "pending",
      createdAt: new Date(),
    });
    alert("Demande envoyée !");
  };

  const handleLeaveServer = async () => {
    if (!currentUser || !serverId) return;
    if (owner === currentUser.uid) {
      alert("En tant que propriétaire, vous ne pouvez pas quitter le serveur. Vous devez le supprimer depuis les paramètres.");
      return;
    }
    setLeaving(true);
    try {
      await updateDoc(doc(db, "servers", serverId), {
        members: arrayRemove(currentUser.uid)
      });
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors du départ du serveur:", error);
      alert("Erreur lors du départ du serveur");
    }
    setLeaving(false);
    setShowLeaveConfirm(false);
  };

  if (!serverId) return <div className="w-56 bg-gray-800 h-screen p-4 border-l border-gray-900"></div>;

  const renderMember = (uid) => {
    const p = profiles[uid] || {};
    const isOwner = uid === owner;
    return (
      <li key={uid} className="rounded px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-800 bg-gray-900" onClick={() => setSelectedMember(uid)}>
        <img
          src={p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`}
          alt="avatar"
          className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500"
        />
        <span className="font-semibold text-sm">{p.pseudo || uid} {isOwner && <span>👑</span>}</span>
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
          {/* Section propriétaire */}
          {owner && profiles[owner] && (
            <div className="mb-2">
              <div className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">Propriétaire</div>
              <ul className="space-y-2">
                {renderMember(owner)}
              </ul>
            </div>
          )}
          {/* Section membres */}
          <div className="mt-4">
            <div className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">Membres</div>
            <ul className="space-y-2">
              {members.filter(uid => uid !== owner).map(uid => renderMember(uid))}
            </ul>
          </div>
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
      {selectedMember && (
        <MemberProfileModal
          uid={selectedMember}
          onClose={() => setSelectedMember(null)}
          onDM={handleStartDM}
          onAddFriend={handleAddFriend}
          isFriend={friends.includes(selectedMember)}
          isSelf={selectedMember === currentUser?.uid}
        />
      )}
    </div>
  );
} 