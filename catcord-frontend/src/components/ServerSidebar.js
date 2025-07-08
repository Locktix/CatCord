import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import ProfileBadge from './ProfileBadge';
import UserProfile from './UserProfile';
import ProfileBadgeAvatarOnly from './ProfileBadgeAvatarOnly';

export default function ServerSidebar({ user, selectedServer, setSelectedServer, setSelectedChannel }) {
  const [servers, setServers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "servers"), where("members", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setServers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    const docRef = await addDoc(collection(db, "servers"), {
      name: newServerName,
      owner: user.uid,
      members: [user.uid],
      createdAt: serverTimestamp(),
    });
    setNewServerName("");
    setShowForm(false);
    setSelectedServer(docRef.id);
    setSelectedChannel(null);
  };

  return (
    <div className="h-screen w-20 bg-gray-900 flex flex-col items-center py-4 space-y-4 shadow-xl relative overflow-hidden">
      {/* Overlay profil utilisateur */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl relative max-w-xs w-full">
            <UserProfile />
            <button className="mt-4 text-xs text-indigo-400 hover:underline absolute top-2 right-4" onClick={() => setShowProfile(false)}>Fermer</button>
          </div>
        </div>
      )}
      {/* Avatar utilisateur centré en haut, sans texte */}
      <div className="flex flex-col items-center w-full mb-2">
        <div className="cursor-pointer" onClick={() => setShowProfile(true)}>
          <ProfileBadgeAvatarOnly />
        </div>
      </div>
      {/* Overlay création serveur */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-60">
          <form onSubmit={handleCreateServer} className="bg-gray-900 rounded-2xl p-6 shadow-2xl flex flex-col items-center w-full max-w-xs">
            <h2 className="text-lg font-bold mb-2 text-white">Créer un serveur</h2>
            <input
              type="text"
              placeholder="Nom du serveur"
              value={newServerName}
              onChange={e => setNewServerName(e.target.value)}
              className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none text-sm mb-2 w-full"
              required
            />
            <div className="flex gap-2 w-full">
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded text-white text-sm flex-1">Créer</button>
              <button type="button" className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white text-sm flex-1" onClick={() => setShowForm(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}
      {/* Bouton + pour créer un serveur */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-12 h-12 flex items-center justify-center bg-indigo-700 hover:bg-indigo-600 rounded-full text-3xl font-bold mb-2 transition"
        title="Créer un serveur"
      >
        +
      </button>
      {/* Liste des serveurs sous forme de bulles */}
      <div className="flex flex-col items-center gap-3 flex-1 w-full overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-700 scrollbar-track-gray-900">
        {servers.map(server => (
          <button
            key={server.id}
            onClick={() => { setSelectedServer(server.id); setSelectedChannel(null); }}
            className={`w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold transition border-2 ${selectedServer === server.id ? 'border-indigo-400 bg-indigo-600' : 'border-transparent bg-gray-800 hover:bg-indigo-700'}`}
            title={server.name}
          >
            {server.name[0]?.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
} 