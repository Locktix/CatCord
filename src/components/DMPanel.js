import React, { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
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
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!dmId) return;
    const q = query(collection(db, "privateConversations", dmId, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [dmId]);

  useEffect(() => {
    if (!dmId || !user) return;
    const fetchOtherUser = async () => {
      const convSnap = await getDoc(doc(db, "privateConversations", dmId));
      if (!convSnap.exists()) return;
      const members = convSnap.data().members;
      const otherUid = members.find(uid => uid !== user.uid);
      if (!otherUid) return;
      const userSnap = await getDoc(doc(db, "users", otherUid));
      setOtherUser(userSnap.exists() ? { uid: otherUid, ...userSnap.data() } : { uid: otherUid });
    };
    fetchOtherUser();
  }, [dmId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
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
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const fileRef = ref(storage, `dmFiles/${dmId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (err) => {
          console.error("Erreur upload:", err);
          alert("Erreur lors de l'envoi du fichier");
          setUploading(false);
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
          } catch (error) {
            console.error("Erreur finalisation upload:", error);
            setUploading(false);
          }
        }
      );
    } catch (err) {
      console.error("Erreur lors de l'envoi du fichier:", err);
      alert("Erreur lors de l'envoi du fichier");
      setUploading(false);
      setUploadProgress(0);
    }
    
    e.target.value = "";
  };

  const handleDeleteMessage = async (msgId) => {
    if (window.confirm("Supprimer ce message ?")) {
      try {
        // Récupérer le message pour obtenir l'URL du fichier
        const messageDoc = await getDoc(doc(db, "privateConversations", dmId, "messages", msgId));
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
        await deleteDoc(doc(db, "privateConversations", dmId, "messages", msgId));
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression du message");
      }
    }
  };

  // Supprimer la conversation (pour l'utilisateur courant)
  const handleDeleteConversation = async () => {
    setDeleting(true);
    await updateDoc(doc(db, "privateConversations", dmId), {
      members: arrayUnion("__deleted__"),
      members: (otherUser ? [otherUser.uid] : [])
    });
    setDeleting(false);
    window.location.reload();
  };

  if (!dmId) return null;

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
              className="w-full text-left px-4 py-3 hover:bg-gray-800 text-red-400 font-semibold rounded-t"
              onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }}
              disabled={deleting}
            >
              Supprimer la conversation
            </button>
            <button
              className="w-full text-left px-4 py-3 hover:bg-gray-800 text-purple-200 font-semibold rounded-b"
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
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                    <img src={msg.fileUrl} alt={msg.fileName} className="max-w-[200px] max-h-[200px] rounded mb-1" />
                    <div className="text-xs text-purple-200 underline">{msg.fileName}</div>
                  </a>
                ) : (
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline">
                    📎 {msg.fileName}
                  </a>
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
          <div className="flex items-center gap-2 ml-2 w-32">
            <div className="flex-1 h-2 bg-gray-700 rounded">
              <div className="h-2 bg-indigo-500 rounded" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <span className="text-xs text-purple-200 w-8 text-right">{uploadProgress}%</span>
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
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-900 rounded-xl p-8 shadow-xl flex flex-col items-center max-w-sm w-full">
            <div className="text-lg text-red-400 font-bold mb-4">Supprimer la conversation ?</div>
            <div className="text-purple-200 mb-6 text-center">Cette conversation disparaîtra de votre liste, mais pas de celle de l'autre utilisateur. Cette action est irréversible.</div>
            <div className="flex gap-4 mt-2">
              <button
                onClick={handleDeleteConversation}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-white font-bold"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
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