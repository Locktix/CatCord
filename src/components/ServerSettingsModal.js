import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { doc, updateDoc, getDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import InviteModal from './InviteModal';

export default function ServerSettingsModal({ serverId, onClose }) {
  const user = auth.currentUser;
  const [server, setServer] = useState(null);
  const [serverName, setServerName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTaskRef, setUploadTaskRef] = useState(null);
  const [showUploadCanceled, setShowUploadCanceled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!serverId) return;
    const unsub = onSnapshot(doc(db, "servers", serverId), (serverSnap) => {
      if (serverSnap.exists()) {
        const serverData = serverSnap.data();
        setServer({ id: serverSnap.id, ...serverData });
        setServerName(serverData.name || "");
      }
    });
    return () => unsub();
  }, [serverId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fileRef = ref(storage, `serverIcons/${serverId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      setUploadTaskRef(uploadTask);
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (err) => {
          if (err.code === 'storage/canceled') {
            setShowUploadCanceled(true);
          } else {
            alert("Erreur lors de l'upload de l'image");
          }
          setUploading(false);
          setUploadTaskRef(null);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            await updateDoc(doc(db, "servers", serverId), {
              icon: url
            });
            setServer(prev => ({ ...prev, icon: url }));
            setUploading(false);
            setUploadProgress(0);
            setUploadTaskRef(null);
          } catch (error) {
            console.error("Erreur finalisation upload:", error);
            setUploading(false);
            setUploadTaskRef(null);
          }
        }
      );
    } catch (err) {
      console.error("Erreur lors de l'upload:", err);
      alert("Erreur lors de l'upload de l'image");
      setUploading(false);
      setUploadTaskRef(null);
    }
    e.target.value = "";
  };

  const handleCancelUpload = () => {
    if (uploadTaskRef) {
      uploadTaskRef.cancel();
      setUploading(false);
      setUploadProgress(0);
      setUploadTaskRef(null);
    }
  };

  const handleSave = async () => {
    if (!serverName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "servers", serverId), {
        name: serverName.trim()
      });
      setSaving(false);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Erreur lors de la sauvegarde");
      setSaving(false);
    }
  };

  if (!server) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl relative max-w-md w-full">
        <button className="absolute top-4 right-6 text-indigo-400 hover:underline text-sm" onClick={onClose}>Fermer</button>
        <h2 className="text-2xl font-bold mb-6">Paramètres du serveur</h2>
        
        <div className="space-y-6">
          {/* Image du serveur */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Image du serveur</label>
            <div className="flex items-center gap-4">
              <img 
                src={server.icon || `https://api.dicebear.com/7.x/shapes/svg?seed=${serverId}`} 
                alt="Server icon" 
                className="w-16 h-16 rounded-lg object-cover border-2 border-indigo-500"
              />
              <div className="flex-1">
                <label className="flex items-center cursor-pointer">
                  <span className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-semibold">Changer l'image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                </label>
                {uploading && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded">
                        <div className="h-2 bg-indigo-500 rounded" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                      <span className="text-xs text-purple-200 w-8 text-right">{uploadProgress}%</span>
                      <button
                        onClick={handleCancelUpload}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                      >Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nom du serveur */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Nom du serveur</label>
            <input
              type="text"
              value={serverName}
              onChange={e => setServerName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
              placeholder="Nom du serveur"
            />
          </div>

          {/* Inviter des membres */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Inviter des membres</label>
            <button
              onClick={() => setShowInvite(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-semibold"
            >
              Inviter un membre
            </button>
          </div>

          {/* Bouton sauvegarder */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !serverName.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 px-4 py-2 rounded text-white font-semibold"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
            >
              Annuler
            </button>
          </div>
        </div>

        {/* Overlay upload annulé */}
        {showUploadCanceled && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-gray-900 rounded-xl p-8 shadow-xl flex flex-col items-center max-w-sm w-full">
              <div className="text-lg text-purple-300 font-bold mb-4">Upload annulé</div>
              <div className="text-purple-200 mb-6 text-center">L'upload de l'image a été annulé.</div>
              <button
                onClick={() => setShowUploadCanceled(false)}
                className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded text-white font-bold"
              >OK</button>
            </div>
          </div>
        )}

        {/* Modal d'invitation */}
        {showInvite && (
          <InviteModal serverId={serverId} onClose={() => setShowInvite(false)} />
        )}
      </div>
    </div>
  );
} 