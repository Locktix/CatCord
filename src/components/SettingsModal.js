import React, { useState } from "react";
import UserProfile from "./UserProfile";

const categories = [
  { key: "account", label: "Mon compte" },
  { key: "appearance", label: "Apparence" },
  { key: "lang", label: "Langues" },
  { key: "advanced", label: "Avancés" },
  { key: "logout", label: "Déconnexion" },
];

export default function SettingsModal({ onClose, onLogout }) {
  const [selected, setSelected] = useState("account");
  const [theme, setTheme] = useState("system");
  const [fontSize, setFontSize] = useState("normal");
  const [avatarShape, setAvatarShape] = useState("round");
  const [success, setSuccess] = useState("");

  const handleSave = () => {
    setSuccess("Paramètres enregistrés !");
    setTimeout(() => setSuccess(""), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-2xl p-0 shadow-2xl relative max-w-2xl w-full flex min-h-[500px]">
        {/* Sidebar */}
        <div className="w-56 bg-gray-800 rounded-l-2xl flex flex-col py-8 px-2 gap-2">
          {categories.map(cat => (
            <button
              key={cat.key}
              className={`text-left px-4 py-3 rounded font-semibold text-sm transition mb-1 ${selected === cat.key ? 'bg-indigo-600 text-white' : 'text-purple-200 hover:bg-gray-700'}`}
              onClick={() => setSelected(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {/* Contenu */}
        <div className="flex-1 p-10 overflow-y-auto">
          <button className="absolute top-4 right-8 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
          {selected === "account" && <>
            <UserProfile />
            <div className="mt-6 flex justify-end">
              <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded text-white font-semibold">Enregistrer</button>
            </div>
            {success && <div className="text-green-400 text-sm text-center mt-2">{success}</div>}
          </>}
          {selected === "appearance" && (
            <>
              <div>
                <h2 className="text-xl font-bold mb-4">Apparence</h2>
                <div className="mb-4">
                  <label className="block font-semibold mb-1">Thème</label>
                  <select value={theme} onChange={e => setTheme(e.target.value)} className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none">
                    <option value="system">Système</option>
                    <option value="light">Clair</option>
                    <option value="dark">Sombre</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block font-semibold mb-1">Taille de police</label>
                  <select value={fontSize} onChange={e => setFontSize(e.target.value)} className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none">
                    <option value="small">Petite</option>
                    <option value="normal">Normale</option>
                    <option value="large">Grande</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block font-semibold mb-1">Forme des avatars</label>
                  <select value={avatarShape} onChange={e => setAvatarShape(e.target.value)} className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none">
                    <option value="round">Rond</option>
                    <option value="square">Carré</option>
                  </select>
                </div>
                <div className="mt-8">
                  <label className="block font-semibold mb-2">Prévisualisation</label>
                  <div className={`flex items-center gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700`}>
                    <img
                      src="https://api.dicebear.com/7.x/thumbs/svg?seed=preview"
                      alt="avatar"
                      className={`w-10 h-10 object-cover border-2 border-indigo-500 ${avatarShape === 'round' ? 'rounded-full' : 'rounded'}`}
                    />
                    <div className="flex flex-col" style={{ fontSize: fontSize === 'small' ? '0.85rem' : fontSize === 'large' ? '1.25rem' : '1rem' }}>
                      <span className="font-semibold text-white">Aperçu utilisateur</span>
                      <span className="text-purple-200">Ceci est un message d'exemple.</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded text-white font-semibold">Enregistrer</button>
              </div>
              {success && <div className="text-green-400 text-sm text-center mt-2">{success}</div>}
            </>
          )}
          {selected === "lang" && (
            <>
              <div>
                <h2 className="text-xl font-bold mb-4">Langue de l'interface</h2>
                <select className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded text-white font-semibold">Enregistrer</button>
              </div>
              {success && <div className="text-green-400 text-sm text-center mt-2">{success}</div>}
            </>
          )}
          {selected === "advanced" && (
            <>
              <div>
                <h2 className="text-xl font-bold mb-4">Paramètres avancés</h2>
                <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" className="accent-indigo-600" />
                  Activer les notifications de bureau
                </label>
                <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" className="accent-indigo-600" />
                  Mode compact (bientôt)
                </label>
                <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" className="accent-indigo-600" />
                  Afficher les ID techniques (bientôt)
                </label>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded text-white font-semibold">Enregistrer</button>
              </div>
              {success && <div className="text-green-400 text-sm text-center mt-2">{success}</div>}
            </>
          )}
          {selected === "logout" && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-lg text-purple-200">Tu veux te déconnecter ?</div>
              <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded text-white font-bold">Déconnexion</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 