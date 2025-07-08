import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from "firebase/firestore";

const statusColors = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-400",
  offline: "bg-gray-400"
};

export default function MessageList({ channelId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const user = auth.currentUser;
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!channelId) return;
    const q = query(
      collection(db, "messages"),
      where("channelId", "==", channelId),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
      // Récupérer les profils des auteurs
      const uids = Array.from(new Set(msgs.map(m => m.authorId)));
      Promise.all(uids.map(async uid => {
        const snap = await getDoc(doc(db, "users", uid));
        return { uid, data: snap.exists() ? snap.data() : {} };
      })).then(arr => {
        const profs = {};
        arr.forEach(({ uid, data }) => { profs[uid] = data; });
        setProfiles(profs);
      });
    });
    return () => unsub();
  }, [channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await addDoc(collection(db, "messages"), {
      content: newMessage,
      channelId,
      author: user.email,
      authorId: user.uid,
      createdAt: serverTimestamp(),
    });
    setNewMessage("");
  };

  if (!channelId) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-6 flex flex-col h-[400px] bg-gray-900 bg-opacity-60 rounded-xl shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-purple-200">Chargement...</div>
        ) : messages.length === 0 ? (
          <div className="text-purple-300">Aucun message pour l'instant.</div>
        ) : (
          messages.map(msg => {
            const p = profiles[msg.authorId] || {};
            return (
              <div key={msg.id} className={`flex gap-2 items-start ${msg.authorId === user.uid ? 'justify-end' : ''}`}>
                {msg.authorId !== user.uid && (
                  <div className="relative">
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.authorId}`}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500"
                    />
                    <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-gray-900 ${statusColors[p.status] || 'bg-gray-400'}`}></span>
                  </div>
                )}
                <div className={`p-2 rounded max-w-[70%] ${msg.authorId === user.uid ? 'bg-indigo-700 text-right ml-10' : 'bg-gray-800 text-left mr-2'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-purple-200">{p.pseudo || msg.author}</span>
                    <span className="text-xs text-purple-400 opacity-60">{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : ''}</span>
                  </div>
                  <div className="text-base break-words">{msg.content}</div>
                </div>
                {msg.authorId === user.uid && (
                  <div className="relative">
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.authorId}`}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500"
                    />
                    <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-gray-900 ${statusColors[p.status] || 'bg-gray-400'}`}></span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSendMessage} className="flex gap-2 p-3 border-t border-gray-800 bg-gray-900 rounded-b-xl">
        <input
          type="text"
          placeholder="Écrire un message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
          required
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-semibold">Envoyer</button>
      </form>
    </div>
  );
} 