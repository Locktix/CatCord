import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

export default function DMPanel({ dmId, onBack }) {
  const user = auth.currentUser;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!dmId) return;
    const q = query(collection(db, "privateConversations", dmId, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [dmId]);

  useEffect(() => {
    if (!dmId || !user) return;
    const fetchOtherUser = async () => {
      const convSnap = await getDoc(doc(db, "privateConversations", dmId));
      if (!convSnap.exists()) return;
      const members = convSnap.data().members;
      const otherUid = members.find(uid => uid !== user.uid);
      if (!otherUid) return;
      const userSnap = await getDoc(doc(db, "users", otherUid));
      setOtherUser(userSnap.exists() ? { uid: otherUid, ...userSnap.data() } : { uid: otherUid });
    };
    fetchOtherUser();
  }, [dmId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    await addDoc(collection(db, "privateConversations", dmId, "messages"), {
      text: input,
      author: user.uid,
      createdAt: serverTimestamp(),
    });
    setInput("");
  };

  if (!dmId) return null;

  return (
    <div className="flex-1 h-screen flex flex-col bg-gray-900 bg-opacity-60 min-w-0">
      <div className="px-6 py-4 border-b border-gray-800 text-lg font-bold flex items-center gap-3 bg-gray-900 bg-opacity-80">
        {onBack && (
          <button onClick={onBack} className="mr-2 text-purple-300 hover:text-white">←</button>
        )}
        {otherUser && (
          <>
            <img src={otherUser.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${otherUser.uid}`} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500" />
            <span>DM avec {otherUser.pseudo ? `${otherUser.pseudo}${otherUser.discriminator ? '#' + otherUser.discriminator : ''}` : otherUser.uid}</span>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.author === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-lg max-w-xs break-words ${msg.author === user.uid ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-purple-100'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-gray-800 bg-gray-900 bg-opacity-80">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
          placeholder="Écrire un message..."
        />
        <button type="submit" className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-white font-semibold">Envoyer</button>
      </form>
    </div>
  );
} 