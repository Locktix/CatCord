import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, arrayRemove, collection, query, where, getDocs, addDoc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const statusColors = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-400",
  offline: "bg-gray-400"
};

function MemberProfileModal({ uid, onClose, onDM, onAddFriend, isFriend, isSelf, serverId, isOwner, currentUserRole }) {
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState("member");
  const [changingRole, setChangingRole] = useState(false);
  
  useEffect(() => {
    getDoc(doc(db, "users", uid)).then(snap => setProfile(snap.data()));
  }, [uid]);

  // Récupérer le rôle de l'utilisateur dans ce serveur en temps réel
  useEffect(() => {
    if (!serverId || !uid) return;
    
    const unsub = onSnapshot(doc(db, "servers", serverId), (serverSnap) => {
      if (serverSnap.exists()) {
        const serverData = serverSnap.data();
        if (serverData.owner === uid) {
          setUserRole("owner");
        } else if (serverData.admins && serverData.admins.includes(uid)) {
          setUserRole("admin");
        } else {
          setUserRole("member");
        }
      }
    });
    
    return () => unsub();
  }, [serverId, uid]);

  const handleRoleChange = async (newRole) => {
    if (!serverId || !uid || changingRole) return;
    setChangingRole(true);
    try {
      const serverRef = doc(db, "servers", serverId);
      const serverDoc = await getDoc(serverRef);
      const serverData = serverDoc.data();
      
      if (newRole === "admin") {
        // Ajouter aux admins
        const currentAdmins = serverData.admins || [];
        if (!currentAdmins.includes(uid)) {
          await updateDoc(serverRef, {
            admins: [...currentAdmins, uid]
          });
        }
      } else if (newRole === "member") {
        // Retirer des admins
        const currentAdmins = serverData.admins || [];
        await updateDoc(serverRef, {
          admins: currentAdmins.filter(adminId => adminId !== uid)
        });
      }
      setUserRole(newRole);
    } catch (error) {
      console.error("Erreur lors du changement de rôle:", error);
      alert("Erreur lors du changement de rôle");
    }
    setChangingRole(false);
  };

  if (!profile) return null;
  const createdAt = profile.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : "?";
  
  const getRoleColor = (role) => {
    switch (role) {
      case "owner": return "text-yellow-400";
      case "admin": return "text-red-400";
      case "member": return "text-purple-400";
      default: return "text-gray-400";
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "owner": return "👑";
      case "admin": return "🛡️";
      case "member": return "👤";
      default: return "👤";
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl relative max-w-xs w-full flex flex-col items-center">
        <button className="absolute top-4 right-4 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
        <img src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 mb-4" />
        <div className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          {profile.pseudo} <span className="text-purple-300">#{profile.discriminator}</span>
        </div>
        <div className={`text-sm font-semibold mb-2 flex items-center gap-1 ${getRoleColor(userRole)}`}>
          {getRoleIcon(userRole)} {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
        </div>
        <div className="text-sm text-purple-200 mb-2">Inscrit le : {createdAt}</div>
        {profile.status && <div className="text-xs text-green-400 mb-1">Statut : {profile.status}</div>}
        
        {/* Gestion des rôles (seulement pour les owners) */}
        {isOwner && !isSelf && userRole !== "owner" && (
          <div className="w-full mb-4">
            <label className="block text-sm font-medium text-purple-200 mb-2">Changer le rôle</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleRoleChange("admin")}
                disabled={changingRole || userRole === "admin"}
                className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition ${
                  userRole === "admin" 
                    ? "bg-red-600 text-white" 
                    : "bg-gray-700 hover:bg-red-600 text-white"
                }`}
              >
                {changingRole ? "..." : "Admin"}
              </button>
              <button
                onClick={() => handleRoleChange("member")}
                disabled={changingRole || userRole === "member"}
                className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition ${
                  userRole === "member" 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-700 hover:bg-purple-600 text-white"
                }`}
              >
                {changingRole ? "..." : "Membre"}
              </button>
            </div>
          </div>
        )}

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
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const [leaving, setLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if (!serverId) return;
    setLoading(true);
    
    // Utiliser onSnapshot pour écouter les changements en temps réel
    const unsub = onSnapshot(doc(db, "servers", serverId), async (serverSnap) => {
      if (!serverSnap.exists()) {
        setMembers([]);
        setOwner(null);
        setAdmins([]);
        setProfiles({});
        setLoading(false);
        return;
      }
      
      const data = serverSnap.data();
      setOwner(data.owner);
      setAdmins(data.admins || []);
      setMembers(data.members || []);
      
      // Récupérer les profils
      const profs = {};
      await Promise.all((data.members || []).map(async uid => {
        const snap = await getDoc(doc(db, "users", uid));
        profs[uid] = snap.exists() ? snap.data() : {};
      }));
      setProfiles(profs);
      setLoading(false);
    });
    
    return () => unsub();
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
    const isAdmin = admins.includes(uid);
    
    const getRoleIcon = (uid) => {
      if (isOwner) return "👑";
      if (isAdmin) return "🛡️";
      return "👤";
    };

    const getRoleColor = (uid) => {
      if (isOwner) return "text-yellow-400";
      if (isAdmin) return "text-red-400";
      return "text-purple-400";
    };

    return (
      <li key={uid} className="rounded px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-800 bg-gray-900" onClick={() => setSelectedMember(uid)}>
        <img
          src={p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`}
          alt="avatar"
          className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500"
        />
        <span className={`text-xs ${getRoleColor(uid)}`}>{getRoleIcon(uid)}</span>
        <span className="font-semibold text-sm">{p.pseudo || uid}</span>
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
          {/* Bloc scrollable pour la liste des membres */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-700 scrollbar-track-gray-900 min-h-0">
            {/* Section propriétaire */}
            {owner && profiles[owner] && (
              <div className="mb-2">
                <div className="text-xs text-yellow-400 font-semibold mb-1 uppercase tracking-wider">Propriétaire</div>
                <ul className="space-y-2">
                  {renderMember(owner)}
                </ul>
              </div>
            )}
            {/* Section admins */}
            {admins.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-red-400 font-semibold mb-1 uppercase tracking-wider">Admins</div>
                <ul className="space-y-2">
                  {admins.filter(uid => uid !== owner).map(uid => renderMember(uid))}
                </ul>
              </div>
            )}
            {/* Section membres */}
            <div className="mt-4">
              <div className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">Membres</div>
              <ul className="space-y-2">
                {members.filter(uid => uid !== owner && !admins.includes(uid)).map(uid => renderMember(uid))}
              </ul>
            </div>
          </div>
        </>
      )}
      {/* Bouton quitter toujours en bas */}
      {currentUser && owner !== currentUser.uid && (
        <div className="pt-4 mt-4 border-t border-gray-700">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            disabled={leaving}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-3 py-2 rounded text-sm font-semibold transition"
          >
            {leaving ? "Départ..." : "Quitter le serveur"}
          </button>
        </div>
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
          serverId={serverId}
          isOwner={owner === currentUser?.uid}
          currentUserRole={owner === currentUser?.uid ? "owner" : admins.includes(currentUser?.uid) ? "admin" : "member"}
        />
      )}
    </div>
  );
} 