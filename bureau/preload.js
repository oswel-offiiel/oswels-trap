/* =====================================================================
   OSWEL'S TRAP — preload.js  (version PC)
   Le pont entre la page du jeu et le processus principal (main.js).
   La page n'a PAS accès à Node.js (sécurité) : elle reçoit seulement
   l'objet window.OTDesktop avec ces quelques fonctions.
   ===================================================================== */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('OTDesktop', {
  estPC: true,
  plateforme: process.platform,                       // 'win32' (Windows) ou 'linux'
  // réseau local
  lanDemarrer: () => ipcRenderer.invoke('lan:demarrer'),
  lanArreter: () => ipcRenderer.invoke('lan:arreter'),
  lanInfos: () => ipcRenderer.invoke('lan:infos'),
  // fenêtre
  ouvrir: (url) => ipcRenderer.invoke('app:ouvrir', url),     // aller sur la manette d'un autre PC
  retourJeu: () => ipcRenderer.invoke('app:retourJeu'),
  pleinEcran: () => ipcRenderer.invoke('app:pleinEcran'),
  quitter: () => ipcRenderer.invoke('app:quitter'),
});
