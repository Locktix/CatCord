const fs = require('fs-extra');
const path = require('path');

async function buildDev() {
  console.log('Copie des fichiers de développement...');
  
  // Créer le dossier build s'il n'existe pas
  await fs.ensureDir('build');
  
  // Copier le dossier public
  await fs.copy('public', 'build');
  
  // Copier le dossier src
  await fs.copy('src', 'build/src');
  
  // Créer un index.html simple
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="./favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="CatzCord - Chat Application" />
    <link rel="apple-touch-icon" href="./logo192.png" />
    <link rel="manifest" href="./manifest.json" />
    <title>CatzCord</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script src="./src/index.js"></script>
  </body>
</html>`;
  
  await fs.writeFile('build/index.html', indexHtml);
  
  console.log('Build de développement terminé !');
}

buildDev().catch(console.error); 