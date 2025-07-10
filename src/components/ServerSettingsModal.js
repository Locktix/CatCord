import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { doc, updateDoc, getDoc, onSnapshot, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteServer = async () => {
    if (!server || server.owner !== user?.uid) return;
    
    setDeleting(true);
    try {
      // 1. Supprimer tous les salons du serveur
      const channelsQuery = query(collection(db, "channels"), where("serverId", "==", serverId));
      const channelsSnap = await getDocs(channelsQuery);
      
      // 2. Supprimer tous les messages des salons
      for (const channelDoc of channelsSnap.docs) {
        const messagesQuery = query(collection(db, "messages"), where("channelId", "==", channelDoc.id));
        const messagesSnap = await getDocs(messagesQuery);
        
        // Supprimer chaque message
        for (const messageDoc of messagesSnap.docs) {
          await deleteDoc(messageDoc.ref);
        }
        
        // Supprimer le salon
        await deleteDoc(channelDoc.ref);
      }
      
      // 3. Supprimer toutes les références du serveur dans les profils utilisateurs
      const usersQuery = query(collection(db, "users"));
      const usersSnap = await getDocs(usersQuery);
      
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        let hasChanges = false;
        
        // Supprimer le serveur de la liste des serveurs de l'utilisateur
        if (userData.servers && userData.servers.includes(serverId)) {
          userData.servers = userData.servers.filter(id => id !== serverId);
          hasChanges = true;
        }
        
        // Supprimer le serveur de la liste des serveurs administrés
        if (userData.adminServers && userData.adminServers.includes(serverId)) {
          userData.adminServers = userData.adminServers.filter(id => id !== serverId);
          hasChanges = true;
        }
        
        // Mettre à jour l'utilisateur si des changements ont été faits
        if (hasChanges) {
          await updateDoc(userDoc.ref, {
            servers: userData.servers || [],
            adminServers: userData.adminServers || []
          });
        }
      }
      
      // 4. Supprimer toutes les invitations liées à ce serveur
      const invitesQuery = query(collection(db, "invites"), where("serverId", "==", serverId));
      const invitesSnap = await getDocs(invitesQuery);
      
      for (const inviteDoc of invitesSnap.docs) {
        await deleteDoc(inviteDoc.ref);
      }
      
      // 5. Supprimer toutes les notifications liées à ce serveur
      const notificationsQuery = query(collection(db, "notifications"), where("serverId", "==", serverId));
      const notificationsSnap = await getDocs(notificationsQuery);
      
      for (const notificationDoc of notificationsSnap.docs) {
        await deleteDoc(notificationDoc.ref);
      }
      
      // 6. Supprimer le serveur lui-même
      await deleteDoc(doc(db, "servers", serverId));
      
      setDeleting(false);
      onClose();
      
      // Rediriger vers la page d'accueil
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la suppression du serveur:", error);
      alert("Erreur lors de la suppression du serveur");
      setDeleting(false);
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

          {/* Section suppression (seulement pour le propriétaire) */}
          {server.owner === user?.uid && (
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-bold text-red-400 mb-4">Zone dangereuse</h3>
              <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4">
                <p className="text-red-200 text-sm mb-4">
                  La suppression d'un serveur est irréversible. Tous les salons, messages et membres seront définitivement supprimés.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 py-2 rounded font-semibold"
                >
                  {deleting ? "Suppression..." : "Supprimer le serveur"}
                </button>
              </div>
            </div>
          )}

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

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-gray-900 rounded-xl p-8 shadow-xl flex flex-col items-center max-w-md w-full">
              <div className="text-2xl text-red-400 font-bold mb-4">⚠️ Attention</div>
              <div className="text-purple-200 mb-6 text-center">
                Êtes-vous sûr de vouloir supprimer le serveur <strong>"{server.name}"</strong> ?<br />
                Cette action est irréversible et supprimera définitivement :
                <ul className="text-left mt-3 space-y-1 text-sm">
                  <li>• Tous les salons du serveur</li>
                  <li>• Tous les messages</li>
                  <li>• Toutes les références dans les profils utilisateurs</li>
                  <li>• Toutes les invitations</li>
                  <li>• Toutes les notifications</li>
                  <li>• L'image du serveur</li>
                </ul>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDeleteServer}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 py-2 rounded font-semibold"
                >
                  {deleting ? "Suppression..." : "Oui, supprimer"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-4 py-2 rounded font-semibold"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 