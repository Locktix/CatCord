import React from 'react';

export default function LoadingScreen({ 
  message = "Chargement...", 
  subtitle = "Connexion à Firebase...",
  progress = 0 
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex flex-col items-center justify-center text-white">
      <div className="bg-black bg-opacity-40 rounded-2xl shadow-2xl p-10 flex flex-col items-center w-full max-w-md">
        {/* Logo animé */}
        <div className="mb-6 animate-pulse">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#6366F1"/>
            <path d="M44 40C44 40 41 37 32 37C23 37 20 40 20 40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <ellipse cx="25.5" cy="28.5" rx="3.5" ry="4.5" fill="white"/>
            <ellipse cx="38.5" cy="28.5" rx="3.5" ry="4.5" fill="white"/>
          </svg>
        </div>
        
        {/* Titre */}
        <h1 className="text-4xl font-extrabold mb-2 tracking-tight animate-fade-in">
          Catcord
        </h1>
        
        {/* Message de chargement dynamique */}
        <p className="text-lg mb-6 text-purple-200 text-center animate-fade-in">
          {progress < 30 ? "Initialisation..." : 
           progress < 60 ? "Connexion à Firebase..." : 
           progress < 90 ? "Chargement des données..." : 
           "Finalisation..."}
        </p>
        
        {/* Spinner animé */}
        <div className="flex space-x-2 mb-4">
          <div 
            className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" 
            style={{ animationDelay: '0ms' }}
          ></div>
          <div 
            className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" 
            style={{ animationDelay: '150ms' }}
          ></div>
          <div 
            className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" 
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>
        
        {/* Sous-titre dynamique */}
        <div className="text-sm text-purple-300 opacity-70 animate-fade-in">
          {progress < 30 ? "Préparation de l'application..." : 
           progress < 60 ? "Établissement de la connexion..." : 
           progress < 90 ? "Récupération des informations..." : 
           "Préparation de l'interface..."}
        </div>
        
        {/* Barre de progression */}
        <div className="w-full bg-gray-700 rounded-full h-2 mt-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Pourcentage */}
        <div className="text-xs text-purple-300 mt-2">
          {Math.round(progress)}%
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-10 text-purple-300 text-sm opacity-70 animate-fade-in">
        &copy; {new Date().getFullYear()} Catcord. Inspiré par Discord.
      </footer>
    </div>
  );
} 