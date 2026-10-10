/* =====================================================================
   OSWEL'S TRAP — le petit programme de la page de téléchargement
   1. Il demande à GitHub quelle est la DERNIÈRE version du jeu et met à jour
      tous les boutons (liens, tailles, numéro de version) : quand tu publies
      la 1.6 sur GitHub, la page suit toute seule, sans rien modifier ici.
      Si GitHub ne répond pas, les liens de la 1.5.0 écrits dans la page restent valables.
   2. Il reconnaît l'appareil du visiteur (Windows, Linux, Android…) et adapte
      le grand bouton « Télécharger ».
   3. Petits plus : boutons « Copier », partage WhatsApp, visionneuse d'images.
   Rien ici ne doit casser la page : chaque partie est protégée (try/catch).
   ===================================================================== */
(function () {
  'use strict';

  const DEPOT = 'oswel-offiiel/oswels-trap';
  const API = 'https://api.github.com/repos/' + DEPOT + '/releases/latest';
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------- 1. Les fichiers à reconnaître dans la liste de GitHub (d'après leur nom) ---------- */
  const FICHIERS = {
    'win-exe': /windows.*\.exe$/i,          // Oswels-Trap-1.5.0-windows-installation.exe
    'win-zip': /windows.*\.zip$/i,          // Oswels-Trap-1.5.0-windows-x64.zip
    'linux-appimage': /\.appimage$/i,       // Oswels-Trap-1.5.0-linux-x86_64.AppImage
    'linux-deb': /\.deb$/i,                 // Oswels-Trap-1.5.0-linux-amd64.deb
    'linux-pacman': /\.pacman$/i,           // Oswels-Trap-1.5.0-linux-x64.pacman
    'android-apk': /\.apk$/i,               // Oswels-Trap-1.5.0-android.apk
  };

  // Valeurs de secours : la version 1.5.0 (si GitHub est injoignable ou trop sollicité)
  const BASE = 'https://github.com/' + DEPOT + '/releases/download/v1.5.0/';
  const SECOURS = {
    version: '1.5.0',
    date: '2026-10-10T11:07:38Z',
    fichiers: {
      'win-exe': { url: BASE + 'Oswels-Trap-1.5.0-windows-installation.exe', taille: 166830874 },
      'win-zip': { url: BASE + 'Oswels-Trap-1.5.0-windows-x64.zip', taille: 209179147 },
      'linux-appimage': { url: BASE + 'Oswels-Trap-1.5.0-linux-x86_64.AppImage', taille: 181294774 },
      'linux-deb': { url: BASE + 'Oswels-Trap-1.5.0-linux-amd64.deb', taille: 154785608 },
      'linux-pacman': { url: BASE + 'Oswels-Trap-1.5.0-linux-x64.pacman', taille: 146047812 },
      'android-apk': { url: BASE + 'Oswels-Trap-1.5.0-android.apk', taille: 66657023 },
    },
  };

  /* ---------- 2. Petits outils ---------- */
  // 166830874 octets → « 159 Mo » (1 Mo = 1 048 576 octets, comme l'affichent les téléphones et Windows)
  function mo(octets) {
    if (!octets) return '';
    const m = octets / 1048576;
    return (m >= 100 ? String(Math.round(m)) : m.toFixed(1).replace('.', ',')) + ' Mo';
  }
  function dateFr(iso) {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  // copier un texte (avec une méthode de secours pour les vieux navigateurs)
  async function copier(texte) {
    try { await navigator.clipboard.writeText(texte); return true; } catch (e) { /* on essaie autrement */ }
    const t = document.createElement('textarea');
    t.value = texte; t.setAttribute('readonly', '');
    t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    return ok;
  }

  /* ---------- 3. Quel appareil ? ---------- */
  function detecterOS() {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';                 // (avant « linux » : Android contient aussi « Linux »)
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    if (/windows/i.test(ua)) return 'windows';
    // les iPad récents se présentent comme un Mac : on les reconnaît à leur écran tactile
    if (/macintosh|mac os x/i.test(ua)) return navigator.maxTouchPoints > 1 ? 'ios' : 'mac';
    if (/cros/i.test(ua)) return 'autre';                      // Chromebook : on laisse choisir
    if (/linux|x11/i.test(ua)) return 'linux';
    return 'autre';
  }
  const OS = detecterOS();

  // le grand bouton, selon l'appareil : [titre, fichier, description]
  const CTA = {
    windows: ['Télécharger pour Windows', 'win-exe', 'Installateur'],
    linux: ['Télécharger pour Linux', 'linux-appimage', 'AppImage · toutes distributions'],
    android: ['Télécharger pour Android', 'android-apk', 'Application APK'],
    // pas d'application iPhone ni Mac : le jeu complet se joue dans le navigateur (dossier jouer/)
    ios: ['Jouer sur iPhone', 'web', 'Dans Safari · sans installation'],
    mac: ['Jouer sur Mac', 'web', 'Dans le navigateur · sans installation'],
  };

  function majCTA(info) {
    const btn = $('#cta-principal'), titre = $('#cta-titre'), detail = $('#cta-detail'), note = $('#cta-note');
    if (!btn || !titre || !detail) return;
    const c = CTA[OS];
    const web = $('#cta-web');
    if (c && c[1] === 'web') {
      btn.href = 'jouer/';
      titre.textContent = c[0];
      detail.textContent = c[2];
      if (web) web.hidden = true;                      // (le grand bouton fait déjà « jouer dans le navigateur »)
    } else if (c && info.fichiers[c[1]]) {
      const f = info.fichiers[c[1]];
      btn.href = f.url;
      titre.textContent = c[0];
      detail.textContent = c[2] + ' · ' + mo(f.taille) + ' · v' + info.version;
    } else {
      btn.href = '#telecharger';
      titre.textContent = 'Choisir ma version';
      detail.textContent = 'Windows · Linux · Android · iPhone';
    }
    if (note) {
      let msg = '';
      if (OS === 'linux') msg = 'Ubuntu, Debian, Arch ou CachyOS ? Les paquets .deb et .pacman sont plus bas.';
      if (OS === 'ios') msg = 'Pour l\'installer comme une application : dans Safari, touche Partager puis « Sur l\'écran d\'accueil ».';
      if (OS === 'mac') msg = 'Le jeu complet tourne dans Safari, Chrome ou Firefox, sans rien installer.';
      if (OS === 'android') msg = 'Le téléphone demandera peut-être d\'autoriser l\'installation : c\'est expliqué plus bas.';
      note.textContent = msg;
      note.hidden = !msg;
    }
    // la carte de l'appareil du visiteur est mise en avant
    const cible = OS === 'ios' || OS === 'mac' ? 'web' : OS;
    const carte = document.querySelector('.plateforme[data-os="' + cible + '"]');
    if (carte) {
      carte.classList.add('vous');
      const ici = carte.querySelector('.ici'); if (ici) ici.hidden = false;
    }
  }

  /* ---------- 4. Mettre la page à jour avec la dernière version ---------- */
  function appliquer(info) {
    $$('[data-version]').forEach((el) => { el.textContent = info.version; });
    $$('[data-date]').forEach((el) => { el.textContent = info.date ? '· publiée le ' + dateFr(info.date) : ''; });
    $$('[data-fichier]').forEach((a) => {
      const f = info.fichiers[a.dataset.fichier];
      if (!f) return;
      a.href = f.url;
      const t = a.querySelector('[data-taille]');
      if (t && f.taille) t.textContent = mo(f.taille);
    });
    majCTA(info);
  }

  async function derniereVersion() {
    // déjà demandée il y a moins de 10 minutes ? (GitHub limite à 60 demandes par heure et par visiteur)
    try {
      const c = JSON.parse(sessionStorage.getItem('ot-version') || 'null');
      if (c && Date.now() - c.t < 10 * 60 * 1000 && c.info) return c.info;
    } catch (e) { /* stockage indisponible : pas grave */ }
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const minuteur = setTimeout(() => ctrl && ctrl.abort(), 6000);
    try {
      const r = await fetch(API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl ? ctrl.signal : undefined });
      if (!r.ok) throw new Error('GitHub a répondu ' + r.status);
      const j = await r.json();
      const info = { version: String(j.tag_name || '').replace(/^v/i, '') || SECOURS.version, date: j.published_at || '', fichiers: {} };
      for (const a of j.assets || []) {
        for (const k in FICHIERS) {
          if (!info.fichiers[k] && FICHIERS[k].test(a.name)) info.fichiers[k] = { url: a.browser_download_url, taille: a.size };
        }
      }
      if (!Object.keys(info.fichiers).length) throw new Error('aucun fichier reconnu');
      // un fichier absent de la nouvelle version ? on garde le lien de secours plutôt qu'un bouton mort
      for (const k in SECOURS.fichiers) if (!info.fichiers[k]) info.fichiers[k] = SECOURS.fichiers[k];
      try { sessionStorage.setItem('ot-version', JSON.stringify({ t: Date.now(), info })); } catch (e) { /* tant pis */ }
      return info;
    } finally {
      clearTimeout(minuteur);
    }
  }

  // d'abord les valeurs de secours (immédiat), puis la vraie dernière version dès que GitHub répond
  try { appliquer(SECOURS); } catch (e) { /* la page reste utilisable avec ses liens écrits en dur */ }
  derniereVersion().then(appliquer).catch(() => { /* GitHub injoignable : les liens 1.5.0 restent */ });

  /* ---------- 5. Les boutons « Copier » des commandes Linux ---------- */
  $$('.copier').forEach((b) => {
    b.addEventListener('click', async () => {
      const code = b.parentElement && b.parentElement.querySelector('code');
      if (!code) return;
      const ok = await copier(code.textContent.trim());
      b.textContent = ok ? 'Copié ✓' : 'Sélectionne le texte';
      b.classList.toggle('ok', ok);
      setTimeout(() => { b.textContent = 'Copier'; b.classList.remove('ok'); }, 1800);
    });
  });

  /* ---------- 6. Partager ---------- */
  try {
    const adresse = location.origin + location.pathname;
    const message = 'Oswel\'s Trap 😈 le jeu de plateforme qui te piège. Gratuit sur Windows, Linux et Android : ' + adresse;
    const wa = $('#partage-whatsapp');
    if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(message);
    const lien = $('#partage-lien');
    if (lien) {
      // sur téléphone : la feuille de partage du système ; sinon : copier l'adresse
      if (navigator.share) lien.textContent = 'Partager…';
      lien.addEventListener('click', async () => {
        if (navigator.share) {
          try { await navigator.share({ title: 'Oswel\'s Trap', text: 'Le jeu de plateforme qui te piège.', url: adresse }); } catch (e) { /* partage annulé */ }
          return;
        }
        const ok = await copier(adresse);
        lien.textContent = ok ? 'Lien copié ✓' : adresse;
        setTimeout(() => { lien.textContent = 'Copier le lien'; }, 2200);
      });
    }
  } catch (e) { /* partage indisponible */ }

  /* ---------- 7. La visionneuse d'images ---------- */
  try {
    const dlg = $('#visionneuse');
    const images = $$('.vignette img');
    if (dlg && images.length) {
      const grande = dlg.querySelector('img'), legende = dlg.querySelector('.legende');
      let i = 0;
      const montrer = (k) => {
        i = (k + images.length) % images.length;
        grande.src = images[i].currentSrc || images[i].src;
        grande.alt = images[i].alt;
        legende.textContent = images[i].alt;
      };
      images.forEach((img, k) => {
        img.parentElement.addEventListener('click', () => {
          if (typeof dlg.showModal !== 'function') { window.open(img.src, '_blank', 'noopener'); return; }
          montrer(k); dlg.showModal();
        });
      });
      dlg.querySelector('.v-fermer').addEventListener('click', () => dlg.close());
      dlg.querySelector('.v-prec').addEventListener('click', () => montrer(i - 1));
      dlg.querySelector('.v-suiv').addEventListener('click', () => montrer(i + 1));
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });     // clic à côté de l'image
      dlg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') montrer(i - 1);
        if (e.key === 'ArrowRight') montrer(i + 1);
      });
      // glisser le doigt pour changer d'image
      let x0 = null;
      dlg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      dlg.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) montrer(i + (dx < 0 ? 1 : -1));
      });
    }
  } catch (e) { /* sans visionneuse, les images restent visibles */ }
})();
