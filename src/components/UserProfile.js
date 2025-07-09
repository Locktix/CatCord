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

  const predefinedAvatars = [
    `https://api.dicebear.com/7.x/thumbs/svg?seed=cat1`,
    `https://api.dicebear.com/7.x/thumbs/svg?seed=cat2`,
    `https://api.dicebear.com/7.x/thumbs/svg?seed=cat3`,
    `https://api.dicebear.com/7.x/thumbs/svg?seed=cat4`,
    `https://api.dicebear.com/7.x/thumbs/svg?seed=cat5`,
    `https://api.dicebear.com/7.x/thumbs/svg?seed=cat6`,
  ];

  const fontSizes = [
    { value: "sm", label: "Petite" },
    { value: "base", label: "Normale" },
    { value: "lg", label: "Grande" },
    { value: "xl", label: "Très grande" },
  ];
  const avatarShapes = [
    { value: "rounded-full", label: "Rond" },
    { value: "rounded-lg", label: "Arrondi" },
    { value: "", label: "Carré" },
  ];

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile.fontSize) {
      document.documentElement.classList.remove("text-sm", "text-base", "text-lg", "text-xl");
      document.documentElement.classList.add(`text-${profile.fontSize}`);
    }
  }, [profile.fontSize]);

  const handleChange = e => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = async (e) => {
    if (e.target.files[0]) {
      setSaving(true);
      const file = e.target.files[0];
      const avatarRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(avatarRef, file);
      const avatarUrl = await getDownloadURL(avatarRef);
      await setDoc(doc(db, "users", user.uid), {
        ...profile,
        avatar: avatarUrl,
      });
      setProfile(p => ({ ...p, avatar: avatarUrl }));
      setAvatarFile(null);
      setSaving(false);
      setSuccess("Avatar mis à jour !");
    }
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

  const handleSelectPredefined = async (url) => {
    setSaving(true);
    await setDoc(doc(db, "users", user.uid), {
      ...profile,
      avatar: url,
    });
    setProfile(p => ({ ...p, avatar: url }));
    setAvatarFile(null);
    setSaving(false);
    setSuccess("Avatar mis à jour !");
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
    <div>
      {loading ? (
        <div className="text-purple-200">Chargement...</div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg font-bold text-white">Avatar</span>
              <span className="flex-1 border-b border-gray-700"></span>
            </div>
            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                <img
                  src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`}
                  alt="avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-500 shadow-lg bg-gray-900"
                />
                {profile.avatar && (
                  <button type="button" onClick={handleDeleteAvatar} className="absolute bottom-0 right-0 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-full shadow-lg">Supprimer</button>
                )}
              </div>
              {profile.avatar && !predefinedAvatars.includes(profile.avatar) && (
                <span className="text-xs text-purple-300 mt-2 bg-gray-800 px-2 py-1 rounded-full">Photo personnalisée</span>
              )}
            </div>
            <div className="mb-2 text-xs text-purple-400 font-semibold uppercase tracking-wider">Avatars prédéfinis</div>
            <div className="flex gap-2 flex-wrap justify-center mb-4">
              {predefinedAvatars.map((url, i) => (
                <button
                  type="button"
                  key={url}
                  onClick={() => handleSelectPredefined(url)}
                  className={`p-0.5 rounded-full border-2 ${profile.avatar === url ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-transparent'} hover:bg-gray-800 transition`}
                  title={`Avatar ${i + 1}`}
                  disabled={saving}
                >
                  <img src={url} alt={`avatar ${i + 1}`} className="w-12 h-12 rounded-full object-cover" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-center mt-2 mb-2">
              <span className="flex-1 border-b border-gray-700"></span>
              <span className="text-xs text-gray-400">ou</span>
              <span className="flex-1 border-b border-gray-700"></span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded cursor-pointer text-sm font-semibold flex items-center gap-2 shadow border border-indigo-700">
                <span className="text-lg">📷</span> Uploader une photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={saving}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none opacity-60 cursor-not-allowed w-full"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Pseudo</label>
            <input
              type="text"
              name="pseudo"
              placeholder="Pseudo"
              value={profile.pseudo}
              onChange={handleChange}
              className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none w-full"
              required
            />
            {profile.discriminator && (
              <div className="text-xs text-purple-300 mt-1">#{profile.discriminator}</div>
            )}
          </div>
          <div>
            <label className="block font-semibold mb-1">Statut</label>
            <select
              name="status"
              value={profile.status}
              onChange={handleChange}
              className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none w-full"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {success && <div className="text-green-400 text-sm text-center">{success}</div>}
        </form>
      )}
    </div>
  );
} 