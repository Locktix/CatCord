import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const statusOptions = [
  { value: "online", label: "En ligne" },
  { value: "busy", label: "Occupé" },
  { value: "away", label: "Absent" },
  { value: "offline", label: "Hors ligne" },
];

export default function UserProfile() {
  const user = auth.currentUser;
  const [profile, setProfile] = useState({ pseudo: "", avatar: "", status: "online" });
  const [loading, setLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleChange = e => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = e => {
    if (e.target.files[0]) setAvatarFile(e.target.files[0]);
  };

  const handleDeleteAvatar = async () => {
    setSaving(true);
    await setDoc(doc(db, "users", user.uid), {
      ...profile,
      avatar: "",
    });
    setProfile(p => ({ ...p, avatar: "" }));
    setAvatarFile(null);
    setSaving(false);
    setSuccess("Avatar supprimé !");
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    let avatarUrl = profile.avatar;
    if (avatarFile) {
      const avatarRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(avatarRef, avatarFile);
      avatarUrl = await getDownloadURL(avatarRef);
    }
    await setDoc(doc(db, "users", user.uid), {
      ...profile,
      avatar: avatarUrl,
    });
    setProfile(p => ({ ...p, avatar: avatarUrl }));
    setAvatarFile(null);
    setSaving(false);
    setSuccess("Profil mis à jour !");
  };

  if (!user) return null;

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-lg w-full max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Mon profil</h2>
      {loading ? (
        <div className="text-purple-200">Chargement...</div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <img
              src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
            />
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm" />
          </div>
          {profile.avatar && (
            <button type="button" onClick={handleDeleteAvatar} className="text-xs text-red-400 hover:underline w-fit">Supprimer l'avatar</button>
          )}
          <input
            type="email"
            value={user.email}
            readOnly
            className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none opacity-60 cursor-not-allowed"
          />
          <input
            type="text"
            name="pseudo"
            placeholder="Pseudo"
            value={profile.pseudo}
            onChange={handleChange}
            className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
            required
          />
          <select
            name="status"
            value={profile.status}
            onChange={handleChange}
            className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-semibold flex items-center justify-center gap-2">
            {saving && <span className="loader border-2 border-t-2 border-indigo-200 rounded-full w-4 h-4 animate-spin"></span>}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {success && <div className="text-green-400 text-sm text-center">{success}</div>}
        </form>
      )}
    </div>
  );
} 