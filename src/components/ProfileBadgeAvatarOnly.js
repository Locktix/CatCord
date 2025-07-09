import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProfileBadgeAvatarOnly() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setAvatar(snap.data().avatar);
    };
    fetchProfile();
  }, [user]);

  if (!user) return null;

  return (
    <img
      src={avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`}
      alt="avatar"
      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500"
    />
  );
} 