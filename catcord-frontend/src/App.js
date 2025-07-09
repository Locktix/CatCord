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

function App() {
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedDM, setSelectedDM] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

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
          {selectedDM !== "show" && <DMPanel dmId={selectedDM} onBack={() => setSelectedDM("show")} />}
        </>
      ) : (
        <>
          <ServerSidebar user={user} selectedServer={selectedServer} setSelectedServer={setSelectedServer} setSelectedChannel={setSelectedChannel} onShowDM={handleShowDM} />
          <ChannelPanel serverId={selectedServer} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel} />
          <MessagePanel channelId={selectedChannel} />
          <MemberPanel serverId={selectedServer} onStartDM={handleStartDM} />
        </>
      )}
    </div>
  );
}

export default App;
