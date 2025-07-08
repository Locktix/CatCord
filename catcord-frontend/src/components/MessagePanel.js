import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import MessageList from "./MessageList";

export default function MessagePanel({ channelId }) {
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

  if (!channelId)
    return <div className="flex-1 h-screen flex items-center justify-center bg-gray-900 bg-opacity-60 text-purple-200 text-xl">Sélectionne un salon</div>;

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