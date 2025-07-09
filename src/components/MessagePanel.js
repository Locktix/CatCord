import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import MessageList from "./MessageList";

export default function MessagePanel({ channelId, selectedServer }) {
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    if (!channelId) return setChannel(null);
    const fetchChannel = async () => {
      const docRef = doc(db, "channels", channelId);
      const snap = await getDoc(docRef);
      setChannel(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    };
    fetchChannel();
  }, [channelId]);

  if (!channelId) {
    // Si on est sur un serveur mais pas de salon sélectionné
    if (selectedServer) {
      return <div className="flex-1 h-screen flex items-center justify-center bg-gray-900 bg-opacity-60 text-purple-200 text-xl">Sélectionne un salon</div>;
    }
    
    // Sinon, écran de bienvenue
    return (
      <div className="flex-1 h-screen flex flex-col items-center justify-center bg-gray-900 bg-opacity-60 text-white">
        <div className="text-center">
          <div className="mb-6">
            <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="#6366F1"/>
              <path d="M44 40C44 40 41 37 32 37C23 37 20 40 20 40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <ellipse cx="25.5" cy="28.5" rx="3.5" ry="4.5" fill="white"/>
              <ellipse cx="38.5" cy="28.5" rx="3.5" ry="4.5" fill="white"/>
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Bienvenue sur CatCord</h1>
          <p className="text-lg text-purple-200 mb-6">Sélectionnez un serveur et un salon pour commencer à discuter</p>
          <div className="flex items-center justify-center space-x-2 text-purple-300">
            <span>🎮</span>
            <span>Discussions</span>
            <span>•</span>
            <span>🎵</span>
            <span>Musique</span>
            <span>•</span>
            <span>📞</span>
            <span>Appels</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen flex flex-col bg-gray-900 bg-opacity-60 min-w-0">
      <div className="px-6 py-4 border-b border-gray-800 text-lg font-bold flex items-center gap-2 bg-gray-900 bg-opacity-80">
        <span className="text-purple-400">#</span> {channel ? channel.name : "..."}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-gray-900 min-h-0">
        <MessageList channelId={channelId} />
      </div>
    </div>
  );
} 