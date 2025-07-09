import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import ChannelList from './ChannelList';

export default function ServerList() {
  const [servers, setServers] = useState([]);
  const [newServerName, setNewServerName] = useState("");
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const [selectedServer, setSelectedServer] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "servers"), where("members", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setServers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    await addDoc(collection(db, "servers"), {
      name: newServerName,
      owner: user.uid,
      members: [user.uid],
      createdAt: serverTimestamp(),
    });
    setNewServerName("");
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Mes serveurs</h2>
      <form onSubmit={handleCreateServer} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nom du serveur"
          value={newServerName}
          onChange={e => setNewServerName(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
          required
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-semibold">Créer</button>
      </form>
      {loading ? (
        <div className="text-purple-200">Chargement...</div>
      ) : servers.length === 0 ? (
        <div className="text-purple-300">Aucun serveur pour l'instant.</div>
      ) : (
        <ul className="space-y-2">
          {servers.map(server => (
            <li key={server.id} className={`bg-gray-900 bg-opacity-60 rounded p-3 flex items-center justify-between cursor-pointer ${selectedServer === server.id ? 'ring-2 ring-indigo-500' : ''}`}
                onClick={() => setSelectedServer(server.id)}>
              <span className="font-semibold">{server.name}</span>
              <span className="text-xs text-purple-300">ID: {server.id.slice(0, 6)}...</span>
            </li>
          ))}
        </ul>
      )}
      {selectedServer && <ChannelList serverId={selectedServer} />}
    </div>
  );
} 