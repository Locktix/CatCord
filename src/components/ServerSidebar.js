import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import ProfileBadge from './ProfileBadge';
import UserProfile from './UserProfile';
import ProfileBadgeAvatarOnly from './ProfileBadgeAvatarOnly';
import SettingsModal from './SettingsModal';
import { signOut } from 'firebase/auth';
import ServerSettingsModal from './ServerSettingsModal';
import FriendListModal from './FriendListModal';

export default function ServerSidebar({ user, selectedServer, setSelectedServer, setSelectedChannel, onShowDM }) {
  const [servers, setServers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [selectedServerData, setSelectedServerData] = useState(null);
  const [showFriends, setShowFriends] = useState(false);

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
          <div className="bg-gray-900 rounded-2xl p-10 shadow-2xl relative max-w-2xl w-full">
            <UserProfile />
            <button className="mt-4 text-xs text-indigo-400 hover:underline absolute top-2 right-4" onClick={() => setShowProfile(false)}>Fermer</button>
          </div>
        </div>
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onLogout={async () => { await signOut(auth); setShowSettings(false); }} />
      )}
      {/* Bouton accès DM en haut */}
      <div className="flex flex-col items-center w-full mb-2 mt-2">
        <button
          className="w-12 h-12 flex items-center justify-center bg-purple-700 hover:bg-purple-800 rounded-full text-2xl text-white shadow transition"
          title="Messages privés"
          onClick={onShowDM}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-.659 1.591l-7.5 7.5a2.25 2.25 0 01-3.182 0l-7.5-7.5A2.25 2.25 0 012.25 6.993V6.75" />
          </svg>
        </button>
        {/* Bouton Amis */}
        <button
          className="w-12 h-12 flex items-center justify-center bg-green-700 hover:bg-green-800 rounded-full text-2xl text-white shadow transition mt-2"
          title="Amis"
          onClick={() => setShowFriends(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.964 0a9 9 0 10-11.964 0m11.964 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
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
          <div key={server.id} className="relative flex items-center justify-center w-full">
            <button
              onClick={() => { setSelectedServer(server.id); setSelectedChannel(null); }}
              className={`w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold transition border-2 ${selectedServer === server.id ? 'border-indigo-400 bg-indigo-600' : 'border-transparent bg-gray-800 hover:bg-indigo-700'}`}
              title={server.name}
            >
              {server.name[0]?.toUpperCase()}
            </button>
            {/* Bouton paramètres serveur si owner */}
            {selectedServer === server.id && server.owner === user?.uid && (
              <button
                className="absolute right-0 top-0 w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-indigo-700 rounded-full text-lg text-white shadow transition border-2 border-indigo-400"
                title="Paramètres du serveur"
                onClick={async (e) => {
                  e.stopPropagation();
                  setSelectedServerData(server);
                  setShowServerSettings(true);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.01c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.01 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.01 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.01c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.572-1.01c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.01-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.01-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.01z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      {/* Bouton paramètres en bas */}
      <div className="mt-auto mb-2 flex flex-col items-center w-full">
        <button
          className="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-indigo-700 rounded-full text-2xl text-white shadow transition"
          title="Paramètres"
          onClick={() => setShowSettings(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.01c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.01 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.01 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.01c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.572-1.01c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.01-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.01-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.01z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      {/* Modale paramètres serveur */}
      {showServerSettings && selectedServerData && (
        <ServerSettingsModal server={selectedServerData} onClose={() => setShowServerSettings(false)} />
      )}
      {/* Modale amis */}
      {showFriends && (
        <FriendListModal onClose={() => setShowFriends(false)} />
      )}
    </div>
  );
} 