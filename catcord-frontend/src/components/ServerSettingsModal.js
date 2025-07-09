import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function ServerSettingsModal({ server, onClose }) {
  const [name, setName] = useState(server.name);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchChannels = async () => {
      const q = query(collection(db, "channels"), where("serverId", "==", server.id));
      const snap = await getDocs(q);
      setChannels(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchChannels();
  }, [server.id]);

  const handleSave = async () => {
    setSaving(true);
    await updateDoc(doc(db, "servers", server.id), { name });
    setSaving(false);
    setSuccess("Nom du serveur modifié !");
    setTimeout(() => setSuccess(""), 2000);
  };

  const handleDeleteChannel = async (channelId) => {
    await deleteDoc(doc(db, "channels", channelId));
    setChannels(channels.filter(c => c.id !== channelId));
  };

  const handleDeleteServer = async () => {
    setSaving(true);
    // Supprime tous les salons
    for (const c of channels) {
      await deleteDoc(doc(db, "channels", c.id));
    }
    // Supprime le serveur
    await deleteDoc(doc(db, "servers", server.id));
    setSaving(false);
    window.location.reload(); // Force le refresh pour sortir du serveur supprimé
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-2xl p-10 shadow-2xl relative max-w-lg w-full">
        <button className="absolute top-4 right-8 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
        <h2 className="text-2xl font-bold mb-6">Paramètres du serveur</h2>
        <div className="mb-6">
          <label className="block font-semibold mb-1">Nom du serveur</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none w-full"
          />
        </div>
        <div className="mb-6">
          <label className="block font-semibold mb-2">Salons</label>
          {loading ? (
            <div className="text-purple-200">Chargement...</div>
          ) : channels.length === 0 ? (
            <div className="text-purple-300">Aucun salon.</div>
          ) : (
            <ul className="space-y-2">
              {channels.map(channel => (
                <li key={channel.id} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2">
                  <span className="flex-1"># {channel.name}</span>
                  <button onClick={() => handleDeleteChannel(channel.id)} className="text-xs text-red-400 hover:underline">Supprimer</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded text-white font-semibold"
          >
            Enregistrer
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded text-white font-bold"
          >
            Supprimer le serveur
          </button>
        </div>
        {success && <div className="text-green-400 text-sm text-center mt-4">{success}</div>}
        {confirmDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-gray-900 rounded-xl p-8 shadow-xl flex flex-col items-center">
              <div className="text-lg text-red-400 mb-4">Confirmer la suppression du serveur ?</div>
              <div className="flex gap-4">
                <button onClick={handleDeleteServer} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-white font-bold">Oui, supprimer</button>
                <button onClick={() => setConfirmDelete(false)} className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded text-white">Annuler</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 