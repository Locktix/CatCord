import React, { useEffect, useState, useContext } from "react";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { AvatarShapeContext } from "./SettingsModal";

export default function ProfileBadgeAvatarOnly() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState("");
  const avatarShape = useContext(AvatarShapeContext);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setAvatar(snap.data().avatar);
    });
    return () => unsub();
  }, [user]);

  if (!user) return null;

  return (
    <img
      src={avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`}
      alt="avatar"
      className={`w-12 h-12 object-cover border-2 border-indigo-500 ${avatarShape === 'round' ? 'rounded-full' : 'rounded'}`}
    />
  );
} 