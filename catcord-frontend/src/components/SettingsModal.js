import React, { useState } from "react";
import UserProfile from "./UserProfile";

const categories = [
  { key: "account", label: "Mon compte" },
  { key: "appearance", label: "Apparence (bientôt)" },
  { key: "lang", label: "Langues" },
  { key: "advanced", label: "Avancés" },
  { key: "logout", label: "Déconnexion" },
];

export default function SettingsModal({ onClose, onLogout }) {
  const [selected, setSelected] = useState("account");

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
              disabled={cat.key === 'appearance'}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {/* Contenu */}
        <div className="flex-1 p-10 overflow-y-auto">
          <button className="absolute top-4 right-8 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
          {selected === "account" && <UserProfile />}
          {selected === "appearance" && (
            <div className="text-purple-300">La personnalisation de l'interface arrive bientôt !</div>
          )}
          {selected === "lang" && (
            <div>
              <h2 className="text-xl font-bold mb-4">Langue de l'interface</h2>
              <select className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          )}
          {selected === "advanced" && (
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