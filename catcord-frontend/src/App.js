import React, { useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthForm from './components/AuthForm';
import ServerSidebar from './components/ServerSidebar';
import ChannelPanel from './components/ChannelPanel';
import MessagePanel from './components/MessagePanel';
import MemberPanel from './components/MemberPanel';

function App() {
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

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
      {/* Sidebar serveurs */}
      <ServerSidebar user={user} selectedServer={selectedServer} setSelectedServer={setSelectedServer} setSelectedChannel={setSelectedChannel} />
      {/* Panel salons */}
      <ChannelPanel serverId={selectedServer} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel} />
      {/* Panel messages */}
      <MessagePanel channelId={selectedChannel} />
      {/* Panel membres */}
      <MemberPanel serverId={selectedServer} />
    </div>
  );
}

export default App;
