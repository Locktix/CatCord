import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, getDoc } from "firebase/firestore";

export default function ChannelPanel({ serverId, selectedChannel, setSelectedChannel }) {
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [server, setServer] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!serverId) return;
    setLoading(true);
    const q = query(collection(db, "channels"), where("serverId", "==", serverId));
    const unsub = onSnapshot(q, (snapshot) => {
      setChannels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [serverId]);

  // Vérifier si l'utilisateur est propriétaire ou admin du serveur
  useEffect(() => {
    if (!serverId || !user) return;
    const fetchServer = async () => {
      const serverDoc = await getDoc(doc(db, "servers", serverId));
      if (serverDoc.exists()) {
        const serverData = serverDoc.data();
        setServer(serverData);
        setIsOwner(serverData.owner === user.uid);
        setIsAdmin(serverData.admins && serverData.admins.includes(user.uid));
      }
    };
    fetchServer();
  }, [serverId, user]);

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || (!isOwner && !isAdmin)) return;
    const docRef = await addDoc(collection(db, "channels"), {
      name: newChannelName,
      serverId,
      createdAt: serverTimestamp(),
    });
    setNewChannelName("");
    setSelectedChannel(docRef.id);
  };

  if (!serverId) return <div className="w-56 bg-gray-800 h-screen p-4 border-r border-gray-900"></div>;

  return (
    <div className="w-56 bg-gray-800 h-screen p-4 border-r border-gray-900 flex flex-col">
      <h3 className="text-lg font-bold mb-4">Salons</h3>
      {(isOwner || isAdmin) && (
        <form onSubmit={handleCreateChannel} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Nouveau salon"
            value={newChannelName}
            onChange={e => setNewChannelName(e.target.value)}
            className="flex-1 px-2 py-1 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none text-sm min-w-0"
            required
          />
          <button type="submit" className="w-9 h-9 flex items-center justify-center bg-purple-600 hover:bg-purple-500 rounded text-white text-xl font-bold p-0 transition shadow">+</button>
        </form>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-gray-900 min-h-0">
        {loading ? (
          <div className="text-purple-200">Chargement...</div>
        ) : channels.length === 0 ? (
          <div className="text-purple-300">Aucun salon.</div>
        ) : (
          <ul className="space-y-1">
            {channels.map(channel => (
              <li
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={`px-3 py-2 rounded cursor-pointer flex items-center gap-2 transition text-sm font-medium ${selectedChannel === channel.id ? 'bg-purple-700 text-white' : 'bg-gray-900 hover:bg-purple-800 text-purple-200'}`}
              >
                <span>#</span> {channel.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 