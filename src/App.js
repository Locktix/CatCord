import React, { useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthForm from './components/AuthForm';
import ServerSidebar from './components/ServerSidebar';
import ChannelPanel from './components/ChannelPanel';
import MessagePanel from './components/MessagePanel';
import MemberPanel from './components/MemberPanel';
import DMList from './components/DMList';
import DMPanel from './components/DMPanel';
import CallNotification from './components/CallNotification';
import LoadingScreen from './components/LoadingScreen';
import { doc, getDoc } from 'firebase/firestore';
import { useNotifications, NotificationBubbles } from './components/NotificationSystem';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedDM, setSelectedDM] = useState(null);
  const [dmConversations, setDmConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  
  // Système de notifications
  const {
    notifications,
    addNotification,
    removeNotification,
    isEnabled,
    soundEnabled,
    windowsNotifications,
    toggleNotifications,
    toggleSound,
    toggleWindowsNotifications
  } = useNotifications();

  useEffect(() => {
    const startTime = Date.now();
    const minLoadingTime = 3000; // 3 secondes minimum
    
    // Animation de progression
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      // Progression finale
      setLoadingProgress(100);
      
      setTimeout(() => {
        setUser(user);
        setLoading(false);
      }, remainingTime);
    });
    
    return () => {
      unsubscribe();
      clearInterval(progressInterval);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
      const q = query(collection(require('./firebase').db, 'privateConversations'), where('members', 'array-contains', user.uid));
      const unsub = onSnapshot(q, (snap) => {
        setDmConversations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return unsub;
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      const unsub = onSnapshot(doc(require('./firebase').db, 'users', user.uid), snap => {
        setFriends(snap.data()?.friends || []);
      });
      return unsub;
    });
  }, [user]);

  const handleStartDM = async (uid) => {
    // Cherche ou crée une conversation privée entre user.uid et uid
    if (!user || !uid) return;
    const members = [user.uid, uid].sort();
    const convQuery = await import('firebase/firestore').then(({ query, collection, where, getDocs, addDoc }) => {
      return { query, collection, where, getDocs, addDoc };
    });
    const { query, collection, where, getDocs, addDoc } = convQuery;
    const q = query(collection(require('./firebase').db, 'privateConversations'), where('members', '==', members));
    const snap = await getDocs(q);
    let convId;
    if (!snap.empty) {
      convId = snap.docs[0].id;
    } else {
      const docRef = await addDoc(collection(require('./firebase').db, 'privateConversations'), { members });
      convId = docRef.id;
    }
    setSelectedDM(convId);
    setSelectedServer(null);
    setSelectedChannel(null);
  };

  // Expose la fonction globale pour ouvrir un DM depuis n'importe où
  window.openDMWithUser = handleStartDM;

  const handleShowDM = () => {
    setSelectedDM("show"); // On force l'affichage de la vue DMList même sans DM sélectionné
    setSelectedServer(null);
    setSelectedChannel(null);
  };

  // Loading screen
  if (loading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex flex-col items-center justify-center text-white">
        <div className="bg-black bg-opacity-40 rounded-2xl shadow-2xl p-10 flex flex-col items-center w-full max-w-md">
          <div className="mb-6">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="#6366F1"/>
              <path d="M44 40C44 40 41 37 32 37C23 37 20 40 20 40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <ellipse cx="25.5" cy="28.5" rx="3.5" ry="4.5" fill="white"/>
              <ellipse cx="38.5" cy="28.5" rx="3.5" ry="4.5" fill="white"/>
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Catcord</h1>
          <p className="text-lg mb-6 text-purple-200 text-center">Le chat vocal et textuel nouvelle génération, inspiré de Discord.</p>
          <AuthForm user={user} onAuth={() => {}} />
        </div>
        <footer className="mt-10 text-purple-300 text-sm opacity-70">&copy; {new Date().getFullYear()} Catcord. Inspiré par Discord.</footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white overflow-hidden min-w-0 flex-nowrap md:flex-nowrap flex-wrap">
      {selectedDM ? (
        <>
          <DMList selectedDM={selectedDM === "show" ? null : selectedDM} onSelect={setSelectedDM} onBack={selectedDM === "show" ? () => setSelectedDM(null) : undefined} />
          {selectedDM !== "show" && dmConversations.some(conv => conv.id === selectedDM) ? (
            <DMPanel dmId={selectedDM} onBack={() => setSelectedDM("show")} />
          ) : selectedDM !== "show" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-purple-300 text-lg p-8">
              <div className="mb-6 text-2xl font-bold">Pas de discussion privée actuellement</div>
              <div className="mb-4 text-purple-200">Démarre une conversation avec un ami :</div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {friends.length === 0 ? (
                  <div className="text-purple-400">Tu n'as pas encore d'amis.</div>
                ) : (
                  friends.map(uid => (
                    <FriendDMStarter key={uid} uid={uid} onStartDM={handleStartDM} />
                  ))
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <ServerSidebar user={user} selectedServer={selectedServer} setSelectedServer={setSelectedServer} setSelectedChannel={setSelectedChannel} onShowDM={handleShowDM} />
          <ChannelPanel serverId={selectedServer} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel} />
          <MessagePanel channelId={selectedChannel} selectedServer={selectedServer} />
          <MemberPanel serverId={selectedServer} onStartDM={handleStartDM} />
        </>
      )}
      <CallNotification />
      
      {/* Bulles de notifications */}
      <NotificationBubbles 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
}

function FriendDMStarter({ uid, onStartDM }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    getDoc(doc(require('./firebase').db, 'users', uid)).then(snap => setProfile(snap.data()));
  }, [uid]);
  if (!profile) return null;
  return (
    <button
      onClick={() => onStartDM(uid)}
      className="flex items-center gap-3 bg-gray-800 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow transition"
    >
      <img src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500" />
      <span className="font-semibold">{profile.pseudo}{profile.discriminator ? `#${profile.discriminator}` : ''}</span>
      <span className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-1 rounded text-white font-semibold">DM</span>
    </button>
  );
}

export default App;
