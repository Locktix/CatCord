import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import MessageList from './MessageList';

export default function ChannelList({ serverId }) {
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    if (!serverId) return;
    const q = query(collection(db, "channels"), where("serverId", "==", serverId));
    const unsub = onSnapshot(q, (snapshot) => {
      setChannels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [serverId]);

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    await addDoc(collection(db, "channels"), {
      name: newChannelName,
      serverId,
      createdAt: serverTimestamp(),
    });
    setNewChannelName("");
  };

  if (!serverId) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <h3 className="text-lg font-bold mb-2">Salons du serveur</h3>
      <form onSubmit={handleCreateChannel} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nom du salon"
          value={newChannelName}
          onChange={e => setNewChannelName(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
          required
        />
        <button type="submit" className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-white font-semibold">Créer</button>
      </form>
      {loading ? (
        <div className="text-purple-200">Chargement...</div>
      ) : channels.length === 0 ? (
        <div className="text-purple-300">Aucun salon pour l'instant.</div>
      ) : (
        <ul className="space-y-2">
          {channels.map(channel => (
            <li key={channel.id} className={`bg-gray-800 bg-opacity-60 rounded p-2 flex items-center cursor-pointer ${selectedChannel === channel.id ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => setSelectedChannel(channel.id)}>
              <span className="font-semibold"># {channel.name}</span>
            </li>
          ))}
        </ul>
      )}
      {selectedChannel && <MessageList channelId={selectedChannel} />}
    </div>
  );
} 