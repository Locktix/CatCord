import React, { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useNotifications } from "./NotificationSystem";
import CallModal from "./CallModal";

export default function DMPanel({ dmId, onBack }) {
  const user = auth.currentUser;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef(null);
  const [showCall, setShowCall] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadTaskRef, setUploadTaskRef] = useState(null);
  const [showUploadCanceled, setShowUploadCanceled] = useState(false);
  const [conversationExists, setConversationExists] = useState(true);
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const { addNotification } = useNotifications();
  const lastMessageTimeRef = useRef(null);

  useEffect(() => {
    if (!dmId || typeof dmId !== 'string') {
      setConversationExists(false);
      return;
    }
    const q = query(collection(db, "privateConversations", dmId, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      console.log('Messages DM actuels:', msgs.length);
      
      // Détecter les nouveaux messages DM en utilisant le timestamp
      if (msgs.length > 0) {
        const latestMessage = msgs[msgs.length - 1];
        const messageTime = latestMessage.createdAt?.toDate?.() || new Date();
        
        if (lastMessageTimeRef.current && messageTime > lastMessageTimeRef.current) {
          console.log('Nouveau message DM détecté par timestamp');
          console.log('Message:', latestMessage);
          console.log('Auteur:', latestMessage.author, 'Utilisateur actuel:', user?.uid);
          
          if (latestMessage.author !== user?.uid) {
            console.log('Notification pour DM de:', otherUser?.pseudo || 'Quelqu\'un');
            addNotification('dm', {
              title: `Message privé de ${otherUser?.pseudo || 'Quelqu\'un'}`,
              body: latestMessage.text || latestMessage.fileUrl ? 'Fichier envoyé' : 'Nouveau message',
              soundType: 'dm'
            });
          } else {
            console.log('Message de l\'utilisateur actuel, pas de notification');
          }
        }
        
        lastMessageTimeRef.current = messageTime;
      }
    }, (error) => {
      // Si la conversation n'existe plus
      console.log("Conversation introuvable:", error);
      setConversationExists(false);
    });
    return () => unsub();
  }, [dmId]);

  useEffect(() => {
    if (!dmId || typeof dmId !== 'string' || !user) return;
    const fetchOtherUser = async () => {
      try {
        const convSnap = await getDoc(doc(db, "privateConversations", dmId));
        if (!convSnap.exists()) {
          setConversationExists(false);
          return;
        }
        const members = convSnap.data().members;
        const otherUid = members.find(uid => uid !== user.uid);
        if (!otherUid) return;
        // Utiliser onSnapshot pour écouter les changements du profil en temps réel
        const unsub = onSnapshot(doc(db, "users", otherUid), (userSnap) => {
          setOtherUser(userSnap.exists() ? { uid: otherUid, ...userSnap.data() } : { uid: otherUid });
        });
        return () => unsub();
      } catch (error) {
        console.log("Erreur lors de la récupération de la conversation:", error);
        setConversationExists(false);
      }
    };
    fetchOtherUser();
  }, [dmId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !dmId || typeof dmId !== 'string') return;
    
    try {
      await addDoc(collection(db, "privateConversations", dmId, "messages"), {
        text: input,
        author: user.uid,
        createdAt: serverTimestamp(),
      });
      setInput("");
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      alert("Erreur lors de l'envoi du message");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !dmId || typeof dmId !== 'string') return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fileRef = ref(storage, `dmFiles/${dmId}/${Date.now()}_${file.name}`);
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
            alert("Erreur lors de l'envoi du fichier");
          }
          setUploading(false);
          setUploadTaskRef(null);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, "privateConversations", dmId, "messages"), {
              fileUrl: url,
              fileName: file.name,
              fileType: file.type,
              author: user.uid,
              createdAt: serverTimestamp(),
              text: "",
            });
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
      console.error("Erreur lors de l'envoi du fichier:", err);
      alert("Erreur lors de l'envoi du fichier");
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

  const downloadFile = async (fileUrl, fileName) => {
    try {
      // Créer un lien temporaire pour le téléchargement
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      // Créer un URL pour le blob
      const url = window.URL.createObjectURL(blob);
      
      // Créer un élément <a> temporaire
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      alert("Erreur lors du téléchargement du fichier");
    }
  };

  const handleDeleteMessage = async (msgId) => {
    setMessageToDelete(msgId);
    setShowDeleteMessageConfirm(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    try {
      // Récupérer le message pour obtenir l'URL du fichier
      const messageDoc = await getDoc(doc(db, "privateConversations", dmId, "messages", messageToDelete));
      const messageData = messageDoc.data();
      
      // Supprimer le fichier de Firebase Storage si il existe
      if (messageData.fileUrl) {
        try {
          const fileRef = ref(storage, messageData.fileUrl);
          await deleteObject(fileRef);
        } catch (storageError) {
          console.log("Fichier déjà supprimé ou introuvable:", storageError);
        }
      }
      
      // Supprimer le message de Firestore
      await deleteDoc(doc(db, "privateConversations", dmId, "messages", messageToDelete));
      
      setShowDeleteMessageConfirm(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression du message");
      setShowDeleteMessageConfirm(false);
      setMessageToDelete(null);
    }
  };



  if (!dmId || typeof dmId !== 'string' || !conversationExists) return (
    <div className="flex-1 flex items-center justify-center text-purple-300 text-lg">
      Aucune conversation sélectionnée ou cette conversation n'existe plus.
    </div>
  );

  return (
    <div className="flex-1 h-screen flex flex-col bg-gray-900 bg-opacity-60 min-w-0">
      <div className="px-6 py-4 border-b border-gray-800 text-lg font-bold flex items-center gap-3 bg-gray-900 bg-opacity-80 relative">
        {onBack && (
          <button onClick={onBack} className="mr-2 text-purple-300 hover:text-white">←</button>
        )}
        {otherUser && (
          <>
            <img src={otherUser.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${otherUser.uid}`} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500" />
            <span>DM avec {otherUser.pseudo ? `${otherUser.pseudo}${otherUser.discriminator ? '#' + otherUser.discriminator : ''}` : otherUser.uid}</span>
            <button onClick={() => setShowCall(true)} className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-white text-sm font-semibold">📞 Appeler</button>
          </>
        )}
        {/* Bouton settings */}
        <button
          className="absolute top-4 right-6 text-xl text-indigo-300 hover:text-white"
          onClick={() => setShowSettings(v => !v)}
          title="Paramètres de la conversation"
        >⚙️</button>
        {showSettings && (
          <div className="absolute top-12 right-6 bg-gray-900 border border-gray-700 rounded shadow-lg z-50 min-w-[220px]">
            <button
              className="w-full text-left px-4 py-3 hover:bg-gray-800 text-purple-200 font-semibold"
              onClick={() => setShowSettings(false)}
            >
              Fermer
            </button>
            {/* Ici tu peux ajouter d'autres options utiles */}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.author === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-lg max-w-xs break-words relative ${msg.author === user.uid ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-purple-100'}`}>
              {msg.type === 'invite' ? (
                <InviteMessage msg={msg} user={user} dmId={dmId} />
              ) : msg.fileUrl ? (
                msg.fileType && msg.fileType.startsWith('image/') ? (
                  <div>
                    <img 
                      src={msg.fileUrl} 
                      alt={msg.fileName} 
                      className="max-w-[200px] max-h-[200px] rounded mb-1" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.textContent = '❌ Image non disponible';
                      }}
                    />
                    <button 
                      onClick={() => downloadFile(msg.fileUrl, msg.fileName)}
                      className="text-xs text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                    >
                      📥 {msg.fileName}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => downloadFile(msg.fileUrl, msg.fileName)}
                    className="text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                  >
                    📎 📥 {msg.fileName}
                  </button>
                )
              ) : (
                msg.text
              )}
              {msg.author === user.uid && (
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="absolute top-1 right-1 text-xs text-red-300 hover:text-red-500"
                  title="Supprimer le message"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-gray-800 bg-gray-900 bg-opacity-80">
        <label className="flex items-center cursor-pointer">
          <span className="text-2xl px-2 text-purple-300 hover:text-white">📎</span>
          <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
          placeholder="Écrire un message..."
          disabled={uploading}
        />
        <button type="submit" className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-white font-semibold" disabled={uploading}>Envoyer</button>
        {uploading && (
          <div className="flex items-center gap-2 ml-2 w-40">
            <div className="flex-1 h-2 bg-gray-700 rounded">
              <div className="h-2 bg-indigo-500 rounded" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <span className="text-xs text-purple-200 w-8 text-right">{uploadProgress}%</span>
            <button
              type="button"
              onClick={handleCancelUpload}
              className="ml-2 text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
            >Annuler</button>
          </div>
        )}
      </form>
      {showCall && otherUser && (
        <CallModal
          open={showCall}
          onClose={() => setShowCall(false)}
          otherUser={otherUser}
          dmId={dmId}
        />
      )}

      {showUploadCanceled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-900 rounded-xl p-8 shadow-xl flex flex-col items-center max-w-sm w-full">
            <div className="text-lg text-purple-300 font-bold mb-4">Envoi annulé</div>
            <div className="text-purple-200 mb-6 text-center">L'envoi du fichier a été annulé.</div>
            <button
              onClick={() => setShowUploadCanceled(false)}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded text-white font-bold"
            >OK</button>
          </div>
        </div>
      )}
      {showDeleteMessageConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-900 rounded-xl p-8 shadow-xl flex flex-col items-center max-w-sm w-full">
            <div className="text-lg text-red-400 font-bold mb-4">Supprimer le message ?</div>
            <div className="text-purple-200 mb-6 text-center">Ce message sera définitivement supprimé. Cette action est irréversible.</div>
            <div className="flex gap-4 mt-2">
              <button
                onClick={confirmDeleteMessage}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-white font-bold"
              >
                Supprimer
              </button>
              <button
                onClick={() => {
                  setShowDeleteMessageConfirm(false);
                  setMessageToDelete(null);
                }}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded text-white"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InviteMessage({ msg, user, dmId }) {
  const [accepted, setAccepted] = React.useState(msg.status === 'accepted');
  const [refused, setRefused] = React.useState(msg.status === 'refused');
  const [loading, setLoading] = React.useState(false);
  const [serverName, setServerName] = React.useState('');
  
  React.useEffect(() => {
    getDoc(doc(db, 'servers', msg.serverId)).then(snap => setServerName(snap.data()?.name || 'Serveur'));
  }, [msg.serverId]);
  
  const handleAccept = async () => {
    setLoading(true);
    try {
      // Ajouter l'utilisateur au serveur
      await updateDoc(doc(db, 'servers', msg.serverId), {
        members: arrayUnion(user.uid)
      });
      // Marquer l'invitation comme acceptée
      await updateDoc(doc(db, 'privateConversations', dmId, 'messages', msg.id), { 
        status: 'accepted' 
      });
      setAccepted(true);
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error);
    }
    setLoading(false);
  };
  
  const handleRefuse = async () => {
    setLoading(true);
    try {
      // Marquer l'invitation comme refusée
      await updateDoc(doc(db, 'privateConversations', dmId, 'messages', msg.id), { 
        status: 'refused' 
      });
      setRefused(true);
    } catch (error) {
      console.error('Erreur lors du refus:', error);
    }
    setLoading(false);
  };
  
  // Vérifier si l'utilisateur actuel est l'expéditeur de l'invitation
  const isSender = msg.from === user.uid;
  
  if (accepted) return <span className="text-green-400">Invitation acceptée !</span>;
  if (refused) return <span className="text-red-400">Invitation refusée.</span>;
  
  return (
    <div>
      <div className="mb-2">Invitation à rejoindre <span className="font-bold text-indigo-300">{serverName}</span></div>
      {isSender ? (
        <div className="text-purple-300 text-sm">En attente de réponse...</div>
      ) : (
        <div className="flex gap-2">
          <button onClick={handleAccept} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-semibold">Accepter</button>
          <button onClick={handleRefuse} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold">Refuser</button>
        </div>
      )}
    </div>
  );
} 