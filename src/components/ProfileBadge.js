import React, { useEffect, useState, useContext } from "react";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { AvatarShapeContext } from "./SettingsModal";

const statusColors = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-400",
  offline: "bg-gray-400"
};

export default function ProfileBadge({ onEdit }) {
  const user = auth.currentUser;
  const [profile, setProfile] = useState({ pseudo: "", avatar: "", status: "offline" });
  const avatarShape = useContext(AvatarShapeContext);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
    return () => unsub();
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg mt-2">
      <div className="relative">
        <img
          src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`}
          alt="avatar"
          className={`w-10 h-10 object-cover border-2 border-indigo-500 ${avatarShape === 'round' ? 'rounded-full' : 'rounded'}`}
        />
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${statusColors[profile.status] || 'bg-gray-400'}`}></span>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-sm text-white">{profile.pseudo || user.email}</span>
        <span className="text-xs text-purple-300">{profile.status ? profile.status : 'offline'}</span>
      </div>
      <button onClick={onEdit} className="ml-auto text-indigo-400 hover:underline text-xs">Profil</button>
    </div>
  );
} 