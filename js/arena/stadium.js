/* =====================================================================
   OSWEL'S TRAP — arena/stadium.js
   Le STADE autour des arènes de la Soirée OSWEL : gradins avec public
   qui réagit, pylônes de lumière, écrans géants, bandeau LED au bord
   de l'arène, et un décor propre à chaque ambiance :
     forge   : engrenages qui tournent, cheminées qui fument
     lab     : capsules lumineuses, bobines électriques
     machine : tuyaux, pistons, voyants
     city    : immeubles aux fenêtres allumées
     nexus   : cristaux flottants, anneaux de portail
     piege   : barrières de chantier, gyrophares
   Rien n'est placé devant la caméra (côté +z) : on voit toujours le jeu.
   Léger : quelques maillages + deux maillages « instanciés » pour le public.
   ===================================================================== */
window.OT = window.OT || {};

OT.ArenaStadium = (function () {
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const TAU = Math.PI * 2;

  // couleurs propres à chaque ambiance : gradins, métal, LED, ciel
  const LOOK = {
    forge:   { stand: 0x3a2a20, metal: 0x5c4a3e, led: 0xff8a2b, ground: 0x1f1510, crowd: [0xff8a2b, 0xffd28a, 0xe8473a, 0x6e5848, 0xf2c230] },
    lab:     { stand: 0x2f4a4d, metal: 0x7fb1ad, led: 0x3cff9a, ground: 0x10221f, crowd: [0x3cff9a, 0xcfe6e4, 0x5ad1ff, 0x2fd3d3, 0xffffff] },
    machine: { stand: 0x2e3136, metal: 0x6a6f76, led: 0xffcc33, ground: 0x15171a, crowd: [0xffcc33, 0xff5533, 0x8f959c, 0x3d8bff, 0xffffff] },
    city:    { stand: 0x3a2c38, metal: 0x8a6a5a, led: 0xffcc33, ground: 0x1d1620, crowd: [0xffcc33, 0xff6fae, 0x3d8bff, 0xff8a2b, 0xffffff] },
    nexus:   { stand: 0x2a1d45, metal: 0x5a3f8a, led: 0xff7ad1, ground: 0x120a22, crowd: [0xff7ad1, 0xb78cff, 0x5ad1ff, 0xffffff, 0x8e5bd6] },
    piege:   { stand: 0x2a3424, metal: 0x5a5448, led: 0x3cff9a, ground: 0x10180d, crowd: [0x3cff9a, 0xffcc33, 0xff5533, 0xeaffdc, 0x3d8bff] },
  };

  function std(color, o = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: lin(color), roughness: 0.75, metalness: 0.15 }, o));
  }
  function glow(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({ color: lin(color), toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  }

  // un écran géant : texte dessiné sur une toile
  function screenTex(lines, accent) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const draw = (ls) => {
      g.fillStyle = '#05060a'; g.fillRect(0, 0, 512, 256);
      // lignes de balayage
      g.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 512, 2);
      g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(8, 8, 496, 240);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = accent; g.font = 'bold 30px "Chakra Petch", sans-serif'; g.fillText(ls[0] || '', 256, 52);
      g.fillStyle = '#ffffff'; g.font = '64px "Bungee", "Arial Black", sans-serif'; g.fillText(ls[1] || '', 256, 132, 470);
      g.fillStyle = '#d8d8e8'; g.font = 'bold 28px "Chakra Petch", sans-serif'; g.fillText(ls[2] || '', 256, 204, 470);
    };
    draw(lines);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return { tex: t, set(ls) { draw(ls); t.needsUpdate = true; } };
  }

  function build(box, theme, def) {
    const L = LOOK[theme] || LOOK.forge;
    const G = new THREE.Group(); G.name = 'stadium';
    const anim = [];                         // petites animations du décor
    const dyn = new Set();                   // ce qui bouge : on ne le fusionne pas
    const x0 = box.x0, x1 = box.x1, z0 = box.z0, z1 = box.z1;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0;
    const accent = '#' + L.led.toString(16).padStart(6, '0');

    // ----- le sol tout autour (sous l'arène) -----
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 90, D + 90), std(L.ground, { roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(cx, -0.06, cz); ground.receiveShadow = true;
    G.add(ground);
    // grandes lignes au sol (comme un parquet de stade), en lumière très douce
    const lineM = glow(L.led, 0.08);
    for (let k = -3; k <= 3; k++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(W + 30, 0.08), lineM); l.rotation.x = -Math.PI / 2;
      l.position.set(cx, -0.05, cz + k * (D / 2 + 4) / 1.5); G.add(l);
    }

    // ----- bandeau LED au ras de l'arène (il pulse quand l'ambiance monte) -----
    const ledM = glow(L.led, 0.9);
    const m = 0.9;
    [[cx, z0 - m, W + 2 * m, 0.12], [cx, z1 + m, W + 2 * m, 0.12]].forEach(([x, z, w, d]) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), ledM); s.position.set(x, 0.02, z); G.add(s);
    });
    [[x0 - m, cz], [x1 + m, cz]].forEach(([x, z]) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, D + 2 * m), ledM); s.position.set(x, 0.02, z); G.add(s);
    });

    // ----- gradins : au fond et sur les côtés (jamais devant) -----
    const tiers = 4, step = 1.25, rise = 0.62, gap = 2.6;
    const standM = std(L.stand), edgeM = std(L.metal, { metalness: 0.5, roughness: 0.4 });
    const seats = [];   // places du public : [x, y, z, angle]
    function standRow(ax, az, len, along, face) {
      // along : 'x' (gradin le long de x) ou 'z' ; face : angle vers l'arène
      for (let k = 0; k < tiers; k++) {
        const h = 0.4 + (k + 1) * rise, off = gap + k * step;
        const geo = along === 'x' ? new THREE.BoxGeometry(len + k * 2.4, h, step) : new THREE.BoxGeometry(step, h, len + k * 2.4);
        const b = new THREE.Mesh(geo, standM);
        const px = along === 'x' ? ax : ax + Math.sign(ax - cx) * off, pz = along === 'x' ? az + Math.sign(az - cz) * off : az;
        b.position.set(px, h / 2 - 0.05, pz); b.receiveShadow = true; G.add(b);
        // nez de marche métallique
        const lipGeo = along === 'x' ? new THREE.BoxGeometry(len + k * 2.4, 0.08, 0.14) : new THREE.BoxGeometry(0.14, 0.08, len + k * 2.4);
        const lip = new THREE.Mesh(lipGeo, edgeM);
        lip.position.set(along === 'x' ? px : px - Math.sign(ax - cx) * step / 2, h - 0.02, along === 'x' ? pz - Math.sign(az - cz) * step / 2 : pz);
        G.add(lip);
        // spectateurs sur cette marche
        const n = Math.floor((len + k * 2.4) / 0.78);
        for (let i = 0; i < n; i++) {
          if (Math.random() < 0.16) continue;            // quelques places vides
          const t = (i + 0.5) / n - 0.5;
          const sx = along === 'x' ? px + t * (len + k * 2.4) : px;
          const sz = along === 'x' ? pz : pz + t * (len + k * 2.4);
          seats.push([sx + (Math.random() - 0.5) * 0.15, h, sz + (Math.random() - 0.5) * 0.15, face]);
        }
      }
    }
    standRow(cx, z0 - 0.4, W + 3, 'x', 0);                    // au fond (face à +z)
    standRow(x0 - 0.4, cz + 0.6, D + 2, 'z', Math.PI / 2);     // à gauche
    standRow(x1 + 0.4, cz + 0.6, D + 2, 'z', -Math.PI / 2);    // à droite
    // un muret bas devant (côté caméra) : il ferme le stade sans rien cacher
    const front = new THREE.Mesh(new THREE.BoxGeometry(W + 12, 0.35, 0.4), edgeM);
    front.position.set(cx, 0.12, z1 + 2.4); G.add(front);

    // ----- le public (deux maillages « instanciés » : corps + têtes) -----
    let crowd = null;
    const maxN = mobile ? 220 : 520;
    if (seats.length > maxN) { for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; } seats.length = maxN; }
    if (seats.length) {
      const n = seats.length;
      const bodyGeo = new THREE.CylinderGeometry(0.17, 0.22, 0.5, 7); bodyGeo.translate(0, 0.25, 0);
      const headGeo = new THREE.SphereGeometry(0.15, 8, 6); headGeo.translate(0, 0.66, 0);
      const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
      const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
      const skins = [0x5a3420, 0x7a4a2c, 0x8d5a3a, 0x3e2416, 0xa06a48, 0xc68a5e];
      const col = new THREE.Color(), dummy = new THREE.Object3D();
      const data = seats.map((s, i) => {
        bodies.setColorAt(i, col.copy(lin(L.crowd[i % L.crowd.length])));
        heads.setColorAt(i, col.copy(lin(skins[Math.floor(Math.random() * skins.length)])));
        return { x: s[0], y: s[1], z: s[2], a: s[3], ph: Math.random() * TAU, sp: 2 + Math.random() * 3, kind: Math.random() };
      });
      bodies.instanceColor.needsUpdate = true; heads.instanceColor.needsUpdate = true;
      bodies.frustumCulled = heads.frustumCulled = false;
      G.add(bodies, heads); dyn.add(bodies); dyn.add(heads);
      crowd = {
        update(t, hype) {
          for (let i = 0; i < data.length; i++) {
            const d = data[i];
            // ça bouge un peu tout le temps ; ça saute quand il se passe quelque chose
            const j = Math.max(0, Math.sin(t * d.sp + d.ph)) * (0.04 + hype * (d.kind > 0.35 ? 0.42 : 0.18));
            dummy.position.set(d.x, d.y + j, d.z);
            dummy.rotation.set(0, d.a + Math.sin(t * 0.7 + d.ph) * 0.25, 0);
            dummy.scale.setScalar(1);
            dummy.updateMatrix();
            bodies.setMatrixAt(i, dummy.matrix); heads.setMatrixAt(i, dummy.matrix);
          }
          bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
        },
      };
    }

    // ----- pylônes de lumière dans les coins du fond -----
    const poleM = edgeM, lampM = glow(0xfff4d8), haloM = new THREE.MeshBasicMaterial({ color: lin(0xfff0c8), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const corners = [[x0 - gap - tiers * step - 1.2, z0 - gap - tiers * step - 0.6], [x1 + gap + tiers * step + 1.2, z0 - gap - tiers * step - 0.6]];
    corners.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 10, 8), poleM); pole.position.set(x, 5, z); G.add(pole);
      const head = new THREE.Group(); head.position.set(x, 10.2, z);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.3), poleM); head.add(frame);
      for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), lampM); l.position.set(-0.8 + (i % 3) * 0.8, i < 3 ? 0.28 : -0.28, 0.16); head.add(l); }
      const halo = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), haloM); halo.position.z = 0.2; head.add(halo);
      head.lookAt(cx, 0, cz); G.add(head);
      anim.push((t) => { halo.material.opacity = 0.18 + Math.sin(t * 2 + x) * 0.03; });
    });

    // ----- écrans géants au-dessus des gradins du fond -----
    const scr = screenTex(['SOIRÉE OSWEL', (def.icon || '') + ' ' + (def.name || ''), ''], accent);
    const sw = Math.min(14, W * 0.55), sh = sw / 2;
    const zb = z0 - gap - tiers * step - 0.4;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }));
    screen.position.set(cx, 0.4 + tiers * rise + sh / 2 + 1.2, zb); G.add(screen);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.4, sh + 0.4, 0.3), edgeM); bezel.position.set(cx, screen.position.y, zb - 0.2); G.add(bezel);
    [-1, 1].forEach((sd) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, screen.position.y, 0.3), edgeM); leg.position.set(cx + sd * sw * 0.4, screen.position.y / 2, zb - 0.3); G.add(leg); });

    // ----- le décor propre à l'ambiance (derrière / sur les côtés) -----
    const far = z0 - gap - tiers * step - 3;
    const side = (sd) => (sd < 0 ? x0 - gap - tiers * step - 3 : x1 + gap + tiers * step + 3);
    if (theme === 'forge') {
      const gearM = std(0x8a6a4a, { metalness: 0.7, roughness: 0.35 });
      [[-1, 4.2, 3.2], [1, 3.4, 2.6], [-1, 2.6, 1.8], [1, 5.2, 4]].forEach(([sd, y, r], i) => {
        const g = OT.Models && OT.Models.gear ? OT.Models.gear(r, 10 + i * 2, gearM, 0.35) : new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 6, 16), gearM);
        g.position.set(side(sd) + (i > 1 ? sd * 2 : 0), y, far + 2 + i * 2.2); g.rotation.y = sd * 0.6; G.add(g);
        dyn.add(g); anim.push((t, dt) => { g.rotation.z += dt * (i % 2 ? -0.4 : 0.5); });
      });
      // cheminées qui fument
      const smokeM = new THREE.MeshBasicMaterial({ color: 0x3a302a, transparent: true, opacity: 0.35, depthWrite: false });
      [-1, 1].forEach((sd) => {
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 9, 10), std(0x4a3226)); ch.position.set(cx + sd * W * 0.38, 4.5, far - 3); G.add(ch);
        const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 6, 18), glow(0xff7a1a)); glowRing.rotation.x = Math.PI / 2; glowRing.position.set(ch.position.x, 9, ch.position.z); G.add(glowRing);
        const puffs = [];
        for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), smokeM); G.add(p); puffs.push({ m: p, t: k / 6 }); }
        anim.push((t, dt) => puffs.forEach((p) => { p.t = (p.t + dt * 0.12) % 1; p.m.position.set(ch.position.x + Math.sin(p.t * 5) * 0.6, 9.5 + p.t * 7, ch.position.z); p.m.scale.setScalar(0.6 + p.t * 2.2); }));
      });
    } else if (theme === 'lab') {
      [-1, 1].forEach((sd) => {
        for (let k = 0; k < 3; k++) {
          const x = side(sd), z = far + 3 + k * 4.2;
          const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.2, 16, 1, true), new THREE.MeshStandardMaterial({ color: lin(0xcfe6e4), transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
          glass.position.set(x, 2.1, z);
          const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.4, 16), glow(k % 2 ? 0x3cff9a : 0x5ad1ff, 0.55)); liquid.position.set(x, 1.7, z);
          const capT = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 16), edgeM); capT.position.set(x, 3.8, z);
          const capB = capT.clone(); capB.position.y = 0.4;
          G.add(glass, liquid, capT, capB);
          dyn.add(liquid); anim.push((t) => { liquid.scale.y = 0.9 + Math.sin(t * 1.5 + k) * 0.08; });
        }
      });
      // bobine électrique au fond
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, 6, 12), edgeM); coil.position.set(cx, 3, far - 2); G.add(coil);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), glow(0x9fe7ff)); ball.position.set(cx, 6.6, far - 2); G.add(ball);
      dyn.add(ball); anim.push((t) => { ball.scale.setScalar(1 + Math.sin(t * 9) * 0.04 + (Math.random() < 0.05 ? 0.15 : 0)); });
    } else if (theme === 'machine') {
      const pipeM = std(0x6a6f76, { metalness: 0.75, roughness: 0.3 });
      for (let k = 0; k < 4; k++) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, W + 20, 10), pipeM); p.rotation.z = Math.PI / 2; p.position.set(cx, 5 + k * 1.1, far - 1 - k * 0.8); G.add(p);
      }
      [-1, 1].forEach((sd) => {
        for (let k = 0; k < 2; k++) {
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4, 1.8), std(0x42464c, { metalness: 0.5 })); body.position.set(side(sd), 2, far + 3 + k * 5); G.add(body);
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 10), pipeM); rod.position.set(side(sd), 5, far + 3 + k * 5); G.add(rod);
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glow(0xffcc33)); lamp.position.set(side(sd) - sd * 0.95, 3.2, far + 3 + k * 5); G.add(lamp);
          dyn.add(rod); dyn.add(lamp); anim.push((t) => { rod.position.y = 5 + Math.abs(Math.sin(t * 2 + k + sd)) * 1.4; lamp.visible = Math.sin(t * 6 + k) > -0.2; });
        }
      });
    } else if (theme === 'city') {
      const winTex = (() => {
        const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
        g.fillStyle = '#141018'; g.fillRect(0, 0, 64, 128);
        for (let y = 4; y < 128; y += 10) for (let x = 4; x < 64; x += 10) { g.fillStyle = Math.random() < 0.55 ? (Math.random() < 0.5 ? '#ffd28a' : '#9fd8ff') : '#2a2230'; g.fillRect(x, y, 6, 6); }
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
      })();
      for (let k = 0; k < 9; k++) {
        const h = 6 + Math.random() * 10, w = 3 + Math.random() * 3;
        const tex = winTex.clone(); tex.needsUpdate = true; tex.repeat.set(w / 3, h / 6);
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xbbbbbb }));
        b.position.set(cx - W * 0.8 + k * (W * 1.6 / 8), h / 2, far - 5 - Math.random() * 4); G.add(b);
      }
      [-1, 1].forEach((sd) => {
        const sign = screenTex(['OSWEL CITY', '★ ★ ★', 'ouvert la nuit'], '#ff6fae');
        const s = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshBasicMaterial({ map: sign.tex, toneMapped: false }));
        s.position.set(side(sd), 4, far + 6); s.rotation.y = -sd * 0.9; G.add(s);
      });
    } else if (theme === 'nexus') {
      const crys = std(0xb78cff, { emissive: lin(0x5a2a9a), emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.2 });
      for (let k = 0; k < 8; k++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.8 + Math.random() * 1.2, 0), crys);
        const sd = k % 2 ? 1 : -1, y0 = 3 + Math.random() * 5;
        c.position.set(side(sd) + sd * Math.random() * 4, y0, far + Math.random() * (D + 6)); G.add(c);
        dyn.add(c); anim.push((t, dt) => { c.rotation.y += dt * 0.6; c.position.y = y0 + Math.sin(t + k) * 0.5; });
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.25, 8, 40), glow(0xff7ad1, 0.85)); ring.position.set(cx, 6, far - 3); G.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.12, 8, 40), glow(0x5ad1ff, 0.85)); ring2.position.copy(ring.position); G.add(ring2);
      dyn.add(ring); dyn.add(ring2); anim.push((t, dt) => { ring.rotation.z += dt * 0.4; ring2.rotation.z -= dt * 0.7; ring2.rotation.x = Math.sin(t * 0.5) * 0.4; });
    } else if (theme === 'piege') {
      const stripe = (() => {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
        g.fillStyle = '#ffcc33'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#111'; for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 11, 0); g.lineTo(i + 11 - 64, 64); g.lineTo(i - 64, 64); g.fill(); }
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); return t;
      })();
      [-1, 1].forEach((sd) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, D + 6), new THREE.MeshStandardMaterial({ map: stripe })); bar.position.set(side(sd) + sd, 1.4, cz); G.add(bar);
        for (let k = 0; k < 3; k++) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), edgeM); post.position.set(side(sd) + sd, 0.8, cz - D / 2 + k * D / 2); G.add(post);
          const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glow(0xff8a2b)); beacon.position.set(side(sd) + sd, 1.8, cz - D / 2 + k * D / 2); G.add(beacon);
          dyn.add(beacon); anim.push((t) => { beacon.visible = Math.sin(t * 8 + k * 2 + sd) > 0; });
        }
      });
    }

    // performance : les pièces fixes du stade (gradins, rebords, pylônes, tuyaux…) fusionnées en quelques maillages
    if (OT.Chars && OT.Chars.merge) OT.Chars.merge(G, dyn);
    let hype = 0.2, t = 0, frameN = 0;
    return {
      group: G,
      // ambiance : 0 = calme, 1 = délire (un but, une explosion, une fin de manche)
      hype(v) { hype = Math.min(1.4, Math.max(hype, v)); },
      title(lines) { scr.set(lines); },
      update(dt) {
        t += dt;
        hype = Math.max(0.15, hype - dt * 0.35);
        // le public bouge 30 fois par seconde (largement assez, et deux fois moins de calcul)
        frameN = (frameN + 1) % 2;
        if (crowd && frameN === 0) crowd.update(t, hype);
        ledM.opacity = 0.55 + Math.sin(t * (3 + hype * 6)) * 0.25 + hype * 0.2;
        for (const f of anim) f(t, dt);
      },
      dispose() {
        G.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      },
    };
  }
  return { build };
})();
