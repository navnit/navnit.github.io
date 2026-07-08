/* Build Mode: Navnit — 3D voxel world (<navnit-world> web component, uses global THREE) */
(function () {
  if (customElements.get('navnit-world')) return;

  var PALETTES = {
    dusk:  { skyTop: '#191740', skyBot: '#ff8a5c', fog: 0x2b2352, hemiSky: 0x9a8ce0, hemiGnd: 0x3a2b4f, hemiI: 0.85, sunC: 0xffb36b, sunI: 1.15, amb: 0.22, stars: 0.65 },
    day:   { skyTop: '#6fbdf2', skyBot: '#eaf6ff', fog: 0xa8d4ef, hemiSky: 0xcfe8ff, hemiGnd: 0x6f8a5f, hemiI: 0.95, sunC: 0xfff2d0, sunI: 1.25, amb: 0.35, stars: 0.0 },
    night: { skyTop: '#04060f', skyBot: '#1b2140', fog: 0x0d1226, hemiSky: 0x4a5aa8, hemiGnd: 0x1a1530, hemiI: 0.7, sunC: 0x9fb4ff, sunI: 0.8, amb: 0.18, stars: 1.0 }
  };

  var PLOTS = [
    { id: 'foundation',  x: 0,    z: 0.4 },
    { id: 'tower',       x: -6.9, z: -3.0 },
    { id: 'observatory', x: 6.9,  z: -3.0 },
    { id: 'lab',         x: -6.9, z: 3.8 },
    { id: 'garage',      x: 6.9,  z: 3.8 },
    { id: 'library',     x: 0,    z: -6.9 },
    { id: 'signal',      x: 0,    z: 7.6 }
  ];

  function waitForThree() {
    return new Promise(function (res) {
      (function poll() { if (window.THREE) res(window.THREE); else setTimeout(poll, 40); })();
    });
  }

  function skyTexture(top, bot) {
    var c = document.createElement('canvas'); c.width = 2; c.height = 256;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top); gr.addColorStop(0.62, top); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    var t = new THREE.CanvasTexture(c); return t;
  }

  class NavnitWorld extends HTMLElement {
    static get observedAttributes() { return ['palette', 'auto-orbit', 'build-speed']; }

    connectedCallback() {
      if (this._init) return; this._init = true;
      var self = this;
      this.style.cssText = 'display:block;width:100%;height:100%;position:relative;overflow:hidden;touch-action:none;';
      this._anims = [];        // {update(dt,t) -> false when done}
      this._structures = {};   // id -> group
      this._bosses = {};       // id -> group
      this._pads = {};         // id -> {group, frameMats, hit, state}
      this._selected = null;
      this._buildSpeed = parseFloat(this.getAttribute('build-speed') || '1') || 1;
      this._autoOrbit = this.getAttribute('auto-orbit') !== 'false';
      waitForThree().then(function () { self._setup(); });
    }

    attributeChangedCallback(name, _o, v) {
      if (!this._scene) return;
      if (name === 'palette') this.setPalette(v);
      if (name === 'auto-orbit') this._autoOrbit = v !== 'false';
      if (name === 'build-speed') this._buildSpeed = parseFloat(v) || 1;
    }

    _setup() {
      var self = this;
      var renderer = this._renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.cssText = 'position:absolute;inset:0;display:block;';
      this.appendChild(renderer.domElement);

      var scene = this._scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x000000, 26, 64);

      var cam = this._cam = new THREE.PerspectiveCamera(46, 1, 0.1, 200);

      // camera rig (spherical around target), lerped toward desired each frame
      this._rig = { theta: 0.75, phi: 1.08, r: 26, tgt: new THREE.Vector3(0, 1.2, 0) };
      this._want = { theta: 0.75, phi: 1.08, r: 26, tgt: new THREE.Vector3(0, 1.2, 0) };
      this._shakeT = 0;

      var hemi = this._hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9);
      scene.add(hemi);
      var amb = this._amb = new THREE.AmbientLight(0xffffff, 0.25);
      scene.add(amb);
      var sun = this._sun = new THREE.DirectionalLight(0xffffff, 1);
      sun.position.set(16, 26, 9);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
      sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
      sun.shadow.camera.far = 80; sun.shadow.bias = -0.0004;
      scene.add(sun);

      // stars
      var sg = new THREE.BufferGeometry(), pts = [];
      for (var i = 0; i < 320; i++) {
        var a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 40, y = 6 + Math.random() * 55;
        pts.push(Math.cos(a) * d, y, Math.sin(a) * d);
      }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      this._starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.7, sizeAttenuation: true, fog: false });
      scene.add(new THREE.Points(sg, this._starMat));

      this._matCache = {};
      this._geoCache = {};
      this._buildIsland();
      this._buildPads();
      this._buildClouds();
      this._initPeople();
      this.setPalette(this.getAttribute('palette') || 'dusk');
      this._initControls();

      var ro = new ResizeObserver(function () { self._resize(); });
      ro.observe(this); this._resize();

      this._clock = new THREE.Clock();
      renderer.setAnimationLoop(function () { self._tick(); });
      this.dispatchEvent(new CustomEvent('world-ready', { bubbles: true }));
      this._ready = true;
    }

    _resize() {
      var w = this.clientWidth || 2, h = this.clientHeight || 2;
      this._renderer.setSize(w, h);
      this._cam.aspect = w / h; this._cam.updateProjectionMatrix();
    }

    /* ---------- materials / voxels ---------- */
    _mat(c, e, o) {
      var key = c + '|' + (e || 0) + '|' + (o == null ? 1 : o);
      if (!this._matCache[key]) {
        var m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.02 });
        if (e) { m.emissive = new THREE.Color(c); m.emissiveIntensity = e; }
        if (o != null && o < 1) { m.transparent = true; m.opacity = o; }
        this._matCache[key] = m;
      }
      return this._matCache[key];
    }
    _geo(w, h, d) {
      var key = w + 'x' + h + 'x' + d;
      if (!this._geoCache[key]) this._geoCache[key] = new THREE.BoxGeometry(w, h, d);
      return this._geoCache[key];
    }
    // spec: [x, y(bottom), z, w, h, d, color, {e,o,ns,tag,rx,ry,rz}]
    _box(s) {
      var opts = s[7] || {};
      var m = new THREE.Mesh(this._geo(s[3], s[4], s[5]), this._mat(s[6], opts.e, opts.o));
      m.position.set(s[0], s[1] + s[4] / 2, s[2]);
      if (opts.rx) m.rotation.x = opts.rx;
      if (opts.ry) m.rotation.y = opts.ry;
      if (opts.rz) m.rotation.z = opts.rz;
      if (opts.tag) m.userData.tag = opts.tag;
      if (!opts.ns) { m.castShadow = true; m.receiveShadow = true; }
      return m;
    }
    _group(specs) {
      var g = new THREE.Group();
      for (var i = 0; i < specs.length; i++) g.add(this._box(specs[i]));
      return g;
    }

    /* ---------- island ---------- */
    _buildIsland() {
      var G = 0x55b04f, D = 0x7a5236, S = 0x5d6472, specs = [];
      specs.push([0, -1.3, 0, 22, 1.3, 20, G]);
      specs.push([0, -2.6, 0, 19.4, 1.3, 17.4, D]);
      specs.push([0, -4.0, 0, 15.6, 1.4, 13.6, D]);
      specs.push([0, -5.6, 0, 10.4, 1.6, 8.8, S]);
      specs.push([0, -7.0, 0, 5.4, 1.4, 4.6, S]);
      // stepped edge nibs for voxel silhouette
      var nibs = [[-11.6, -1.3, -4, 1.3], [11.6, -1.3, 3, 1.3], [-8, -1.3, 10.6, 1.3], [5, -1.3, -10.6, 1.3], [10.2, -2.2, -9.2, 1.1], [-10.8, -2.4, 8.6, 1.1]];
      for (var i = 0; i < nibs.length; i++) {
        var n = nibs[i]; specs.push([n[0], n[1], n[2], n[3], n[3], n[3], i % 2 ? D : G]);
      }
      this._island = this._group(specs);
      this._scene.add(this._island);
      // floating rocks
      var rocks = [];
      for (var r = 0; r < 5; r++) {
        var a = r / 5 * Math.PI * 2 + 0.6, dist = 14 + (r % 2) * 4;
        var size = 0.8 + (r % 3) * 0.5;
        var rock = this._box([Math.cos(a) * dist, -3 - (r % 3) * 2.2, Math.sin(a) * dist, size, size, size, S]);
        this._scene.add(rock); rocks.push(rock);
        (function (rockM, ph) {
          rockM.userData.base = rockM.position.y;
          rocks.push(rockM);
        })(rock, r);
      }
      this._rocks = rocks;
    }

    /* ---------- pads ---------- */
    _buildPads() {
      var self = this;
      this._hitMeshes = [];
      PLOTS.forEach(function (p) {
        var g = new THREE.Group();
        g.position.set(p.x, 0, p.z);
        var base = self._box([0, 0, 0, 3.5, 0.22, 3.5, 0x272d45]);
        g.add(base);
        var frameMat = new THREE.MeshStandardMaterial({ color: 0x3a4570, roughness: 0.6, emissive: 0x3a4570, emissiveIntensity: 0.0 });
        var fr = [];
        [[-1.62, 0], [1.62, 0], [0, -1.62], [0, 1.62]].forEach(function (o, i) {
          var horiz = i > 1;
          var m = new THREE.Mesh(self._geo(horiz ? 3.5 : 0.26, 0.3, horiz ? 0.26 : 3.5), frameMat);
          m.position.set(o[0], 0.15 + 0.15, o[1]);
          g.add(m); fr.push(m);
        });
        var hit = new THREE.Mesh(self._geo(3.9, 2.4, 3.9), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.y = 1.2; hit.userData.plotId = p.id;
        g.add(hit);
        self._hitMeshes.push(hit);
        self._scene.add(g);
        self._pads[p.id] = { group: g, frameMat: frameMat, pos: new THREE.Vector3(p.x, 0, p.z), state: 'locked', pulse: 0, hit: hit };
      });
    }

    setPadState(id, state) { // locked | available | active | boss | built
      var pad = this._pads[id]; if (!pad) return;
      pad.state = state;
      if (pad.hit) { // built structures get a taller hit box so the whole building is clickable
        var tall = state === 'built';
        pad.hit.scale.y = tall ? 3 : 1;
        pad.hit.position.y = tall ? 3.6 : 1.2;
      }
    }

    /* ---------- palette ---------- */
    setPalette(name) {
      var P = PALETTES[name] || PALETTES.dusk;
      this._pal = P;
      if (this._skyTex) this._skyTex.dispose();
      this._skyTex = skyTexture(P.skyTop, P.skyBot);
      this._scene.background = this._skyTex;
      this._scene.fog.color.setHex(P.fog);
      this._hemi.color.setHex(P.hemiSky); this._hemi.groundColor.setHex(P.hemiGnd); this._hemi.intensity = P.hemiI;
      this._sun.color.setHex(P.sunC); this._sun.intensity = P.sunI;
      this._amb.intensity = P.amb;
      this._starMat.opacity = P.stars;
    }

    /* ---------- controls ---------- */
    _initControls() {
      var self = this, el = this._renderer.domElement;
      var ptrs = new Map(), downAt = null, moved = 0, pinchD = 0;
      el.addEventListener('pointerdown', function (e) {
        ptrs.set(e.pointerId, [e.clientX, e.clientY]);
        el.setPointerCapture(e.pointerId);
        downAt = [e.clientX, e.clientY, performance.now()];
        moved = 0;
        if (ptrs.size === 2) {
          var a = Array.from(ptrs.values());
          pinchD = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
        }
      });
      el.addEventListener('pointermove', function (e) {
        if (!ptrs.has(e.pointerId)) return;
        var prev = ptrs.get(e.pointerId);
        var dx = e.clientX - prev[0], dy = e.clientY - prev[1];
        ptrs.set(e.pointerId, [e.clientX, e.clientY]);
        moved += Math.abs(dx) + Math.abs(dy);
        if (ptrs.size === 1) {
          self._want.theta -= dx * 0.0055;
          self._want.phi = Math.min(1.42, Math.max(0.5, self._want.phi - dy * 0.004));
          self._userSpun = true;
        } else if (ptrs.size === 2) {
          var a = Array.from(ptrs.values());
          var d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
          if (pinchD) self._want.r = Math.min(42, Math.max(9, self._want.r * (pinchD / d)));
          pinchD = d;
        }
      });
      function up(e) {
        if (ptrs.has(e.pointerId)) ptrs.delete(e.pointerId);
        if (downAt && moved < 8 && performance.now() - downAt[2] < 450 && ptrs.size === 0) {
          self._clickAt(e.clientX, e.clientY);
        }
        if (ptrs.size === 0) downAt = null;
      }
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', function (e) {
        e.preventDefault();
        self._want.r = Math.min(42, Math.max(9, self._want.r * (1 + e.deltaY * 0.0012)));
      }, { passive: false });
    }

    _clickAt(cx, cy) {
      var rect = this._renderer.domElement.getBoundingClientRect();
      var v = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
      var rc = new THREE.Raycaster(); rc.setFromCamera(v, this._cam);
      var ph = rc.intersectObjects(this._peopleHits || [], false);
      if (ph.length) { this._pokePerson(ph[0].object.userData.pIdx); return; }
      var hits = rc.intersectObjects(this._hitMeshes, false);
      if (hits.length) {
        this.dispatchEvent(new CustomEvent('plot-click', { bubbles: true, detail: { id: hits[0].object.userData.plotId } }));
      } else {
        this.dispatchEvent(new CustomEvent('world-click', { bubbles: true }));
      }
    }

    /* ---------- camera poses ---------- */
    _pose(theta, phi, r, tx, ty, tz) {
      this._want.theta = theta; this._want.phi = phi; this._want.r = r;
      this._want.tgt.set(tx, ty, tz);
    }
    focusOverview() { this._pose(this._want.theta, 1.06, 26, 0, 1.4, 0); }
    focusTitle() { this._pose(0.75, 1.12, 30, 0, 2.2, 0); }
    focusPlot(id) {
      var p = this._pads[id]; if (!p) return;
      var a = Math.atan2(p.pos.x - 0, p.pos.z - 0) + 0.0001;
      this._pose(a + 0.35, 1.12, 12.5, p.pos.x * 0.8, 1.4, p.pos.z * 0.8);
    }
    focusBoss(id) {
      var p = this._pads[id]; if (!p) return;
      var a = Math.atan2(p.pos.x, p.pos.z);
      this._pose(a + 0.22, 1.22, 9.5, p.pos.x, 2.8, p.pos.z);
    }
    shake(amt) { this._shakeT = Math.max(this._shakeT, amt || 0.5); }

    /* ---------- frame loop ---------- */
    _tick() {
      var dt = Math.min(this._clock.getDelta(), 0.05);
      var t = this._clock.elapsedTime;
      var rig = this._rig, want = this._want;

      if (this._autoOrbitOn) want.theta += dt * 0.12;
      rig.theta += (want.theta - rig.theta) * 0.075;
      rig.phi += (want.phi - rig.phi) * 0.075;
      rig.r += (want.r - rig.r) * 0.075;
      rig.tgt.lerp(want.tgt, 0.075);

      var sx = 0, sy = 0;
      if (this._shakeT > 0) {
        this._shakeT -= dt * 2.2;
        var s = Math.max(this._shakeT, 0);
        sx = (Math.random() - 0.5) * s * 0.5; sy = (Math.random() - 0.5) * s * 0.4;
      }
      var cp = this._cam.position;
      cp.x = rig.tgt.x + rig.r * Math.sin(rig.phi) * Math.sin(rig.theta) + sx;
      cp.y = rig.tgt.y + rig.r * Math.cos(rig.phi) + sy;
      cp.z = rig.tgt.z + rig.r * Math.sin(rig.phi) * Math.cos(rig.theta);
      this._cam.lookAt(rig.tgt.x + sx, rig.tgt.y + sy, rig.tgt.z);

      // pad pulses
      for (var id in this._pads) {
        var pad = this._pads[id], m = pad.frameMat;
        if (pad.state === 'active') { m.color.setHex(0xffc83d); m.emissive.setHex(0xffc83d); m.emissiveIntensity = 0.65 + Math.sin(t * 5) * 0.35; }
        else if (pad.state === 'available') { m.color.setHex(0x5a6ca8); m.emissive.setHex(0x5a6ca8); m.emissiveIntensity = 0.3 + Math.sin(t * 2.4) * 0.15; }
        else if (pad.state === 'boss') { m.color.setHex(0xff5d5d); m.emissive.setHex(0xff5d5d); m.emissiveIntensity = 0.6 + Math.sin(t * 7) * 0.3; }
        else if (pad.state === 'built') { m.color.setHex(0x3ddc84); m.emissive.setHex(0x3ddc84); m.emissiveIntensity = 0.28; }
        else { m.color.setHex(0x3a4570); m.emissive.setHex(0x3a4570); m.emissiveIntensity = 0.05; }
      }

      // floating rocks bob
      if (this._rocks) for (var i = 0; i < this._rocks.length; i++) {
        var rk = this._rocks[i];
        if (rk.userData.base != null) rk.position.y = rk.userData.base + Math.sin(t * 0.7 + i * 1.7) * 0.35;
      }

      // island gentle float
      if (this._island) this._island.position.y = Math.sin(t * 0.5) * 0.08;

      // clouds drift
      if (this._clouds) for (var ci = 0; ci < this._clouds.length; ci++) {
        var cl = this._clouds[ci];
        cl.position.x += cl.userData.v * dt;
        if (cl.position.x > 34) cl.position.x = -34;
      }

      // people
      if (this._people) this._updatePeople(dt, t);

      // custom animations
      for (var k = this._anims.length - 1; k >= 0; k--) {
        if (this._anims[k](dt, t) === false) this._anims.splice(k, 1);
      }

      this._renderer.render(this._scene, this._cam);
    }

    get autoOrbit() { return !!this._autoOrbitOn; }
    set autoOrbit(v) { this._autoOrbitOn = !!v; }

    /* ================= STRUCTURES / BOSSES / FX ================= */

    _specsFor(id) {
      var E = function (v) { return { e: v }; };
      var GOLD = 0xffc83d;
      if (id === 'foundation') return [
        [0, 0.25, 0, 3.0, 0.5, 3.0, 0x6f7c96], [0, 0.75, 0, 2.4, 0.5, 2.4, 0x8fa1c0],
        [0, 1.25, 0, 1.5, 2.6, 0.95, 0x4a5570],
        [0, 1.55, 0.51, 0.85, 1.6, 0.06, GOLD, { e: 0.9 }],
        [0, 3.85, 0, 1.8, 0.35, 1.2, 0x8fa1c0],
        [-1.05, 0.75, -1.05, 0.5, 0.9, 0.5, 0x6f7c96], [1.05, 0.75, 1.05, 0.5, 0.9, 0.5, 0x6f7c96],
        [1.05, 0.75, -1.05, 0.5, 0.6, 0.5, 0x8fa1c0], [-1.05, 0.75, 1.05, 0.5, 0.6, 0.5, 0x8fa1c0]
      ];
      if (id === 'tower') return [
        [0, 0.25, 0, 3.2, 1.6, 3.2, 0x41597f], [0, 1.85, 0, 2.6, 1.6, 2.6, 0x5b7fb8],
        [0, 3.45, 0, 2.0, 1.5, 2.0, 0x41597f], [0, 4.95, 0, 1.4, 1.4, 1.4, 0x5b7fb8],
        [-1.45, 0.25, 1.45, 0.5, 2.3, 0.5, 0x33476b], [1.45, 0.25, 1.45, 0.5, 2.3, 0.5, 0x33476b],
        [-1.45, 0.25, -1.45, 0.5, 2.3, 0.5, 0x33476b], [1.45, 0.25, -1.45, 0.5, 2.3, 0.5, 0x33476b],
        [0, 0.8, 1.62, 0.8, 0.55, 0.08, 0xffd76b, { e: 0.8, tag: 'win' }],
        [0, 2.35, 1.32, 0.7, 0.5, 0.08, 0xffd76b, { e: 0.8, tag: 'win' }],
        [0, 3.85, 1.02, 0.6, 0.45, 0.08, 0xffd76b, { e: 0.8, tag: 'win' }],
        [0, 6.35, 0, 0.18, 1.3, 0.18, 0x33476b],
        [0, 7.65, 0, 0.4, 0.4, 0.4, GOLD, { e: 1.0, tag: 'tip' }]
      ];
      if (id === 'observatory') return [
        [0, 0.25, 0, 3.0, 1.2, 3.0, 0x2e7d76], [0, 1.45, 0, 2.4, 0.9, 2.4, 0x3aa8a0],
        [0, 2.35, 0, 2.0, 0.6, 2.0, 0x2e7d76], [0, 2.95, 0, 1.4, 0.55, 1.4, 0x3aa8a0],
        [0, 3.5, 0, 0.8, 0.45, 0.8, 0x2e7d76],
        [0, 2.6, 0.95, 0.5, 1.0, 0.35, 0x9fe8e0, { e: 0.75 }],
        [1.55, 0.25, 1.2, 0.28, 2.7, 0.28, 0x24605b],
        [1.55, 2.95, 1.2, 1.35, 0.16, 1.35, 0xbfe8e4, { rx: -0.5, tag: 'dish' }],
        [-1.15, 0.25, 1.45, 0.5, 0.7, 0.5, 0x3aa8a0, { tag: 'bar' }],
        [-0.45, 0.25, 1.45, 0.5, 1.2, 0.5, 0x4fc2b8, { tag: 'bar' }],
        [0.25, 0.25, 1.45, 0.5, 1.7, 0.5, 0x6fe0d4, { e: 0.35, tag: 'bar' }]
      ];
      if (id === 'lab') return [
        [0, 0.25, 0, 3.2, 0.5, 3.2, 0x3b3260],
        [0, 0.75, 0, 2.8, 1.7, 2.4, 0x5a4a9c],
        [0, 1.1, 1.28, 1.9, 0.9, 0.08, 0x7de8ff, { e: 0.8 }],
        [-1.0, 0.75, 1.28, 0.55, 1.0, 0.08, 0x3b3260],
        [0, 2.45, 0, 3.0, 0.35, 2.6, 0x8a6cf0],
        [0.95, 2.8, -0.4, 0.16, 1.25, 0.16, 0x3b3260],
        [0.95, 4.05, -0.4, 0.48, 0.48, 0.48, 0xb79aff, { e: 0.95, tag: 'orb' }],
        [1.9, 3.1, 0, 0.5, 0.32, 0.5, 0x8a6cf0, { e: 0.4, tag: 'drone' }]
      ];
      if (id === 'garage') return [
        [0, 0.25, 0, 3.2, 2.0, 2.6, 0xc96f2e],
        [0, 0.35, 1.32, 1.9, 1.5, 0.12, 0x8a4a1c],
        [0, 1.05, 1.4, 1.9, 0.14, 0.06, 0xe8a75a],
        [0, 2.25, 0, 3.4, 0.4, 2.8, 0xa8551f],
        [0, 2.65, 0.85, 2.2, 0.8, 0.18, 0xffe2b8, { e: 0.35 }],
        [1.15, 0.25, -1.15, 0.9, 0.7, 0.6, 0xe8873a],
        [0.8, 0.25, -0.8, 0.28, 0.28, 0.28, 0x5a3a20], [1.5, 0.25, -1.5, 0.28, 0.28, 0.28, 0x5a3a20],
        [1.15, 1.35, -1.15, 1.15, 0.14, 0.85, GOLD, { e: 0.5 }],
        [1.15, 0.95, -1.45, 0.14, 0.4, 0.14, 0x5a3a20]
      ];
      if (id === 'library') {
        var s = [
          [-1.6, 0.25, 0, 0.5, 3.6, 1.0, 0x6e4526], [1.6, 0.25, 0, 0.5, 3.6, 1.0, 0x6e4526],
          [0, 0.25, 0, 2.7, 0.3, 0.95, 0xa06a3c], [0, 1.25, 0, 2.7, 0.25, 0.95, 0xa06a3c],
          [0, 2.2, 0, 2.7, 0.25, 0.95, 0xa06a3c], [0, 3.15, 0, 2.7, 0.25, 0.95, 0xa06a3c],
          [0, 3.85, 0, 3.9, 0.4, 1.25, 0x8a5630],
          [-1.2, 4.25, 0.3, 0.4, 0.5, 0.4, 0xffe2b8, { e: 0.7 }]
        ];
        var bc = [0xd95f5f, 0x5b7fb8, 0x3aa8a0, 0xffc83d, 0x8a6cf0, 0xe8873a];
        for (var r = 0; r < 3; r++) for (var b = 0; b < 5; b++) {
          var h = 0.62 + ((b * 7 + r * 3) % 3) * 0.09;
          s.push([-1.1 + b * 0.55, [0.55, 1.5, 2.45][r], 0, 0.42, h, 0.6, bc[(b + r * 2) % 6]]);
        }
        return s;
      }
      if (id === 'signal') return [
        [0, 0.25, 0, 2.6, 0.8, 2.6, 0x6b3535],
        [0, 1.05, 0, 0.95, 1.6, 0.95, 0xd94f4f], [0, 2.65, 0, 0.7, 1.6, 0.7, 0xf0f0f0],
        [0, 4.25, 0, 0.5, 1.6, 0.5, 0xd94f4f], [0, 5.85, 0, 0.34, 1.4, 0.34, 0xf0f0f0],
        [0, 3.3, 0, 1.9, 0.16, 0.16, 0x6b3535], [0, 3.3, 0, 0.16, 0.16, 1.9, 0x6b3535],
        [0.7, 4.6, 0, 0.55, 0.12, 0.55, 0xffe2b8, { rx: -0.6 }],
        [0, 7.25, 0, 0.75, 0.75, 0.75, GOLD, { e: 1.1, tag: 'beacon' }]
      ];
      return [];
    }

    _bossSpecs(id) {
      if (id === 'canvas') return [
        [0, 0.4, 0, 2.5, 3.2, 0.34, 0xf4f1e8],
        [0, 3.6, 0, 2.9, 0.22, 0.5, 0xcfc9b8], [0, 0.18, 0, 2.9, 0.22, 0.5, 0xcfc9b8],
        [-1.44, 0.18, 0, 0.22, 3.64, 0.5, 0xcfc9b8], [1.44, 0.18, 0, 0.22, 3.64, 0.5, 0xcfc9b8],
        [-0.5, 2.45, 0.2, 0.3, 0.42, 0.12, 0x22242e], [0.5, 2.45, 0.2, 0.3, 0.42, 0.12, 0x22242e]
      ];
      if (id === 'beast') {
        var s = [];
        for (var i = 0; i < 6; i++) {
          var sz = 1.15 - i * 0.12;
          s.push([Math.sin(i * 1.1) * 0.75, 0.5 + i * 0.05, 1.3 - i * 0.62, sz, sz, sz, i % 2 ? 0x8a4a2c : 0x6e3a20, { tag: 'seg' + i }]);
        }
        s.push([-0.28, 1.75, 1.55, 0.18, 0.3, 0.18, 0xff5d5d, { e: 1, tag: 'seg0' }]);
        s.push([0.28, 1.75, 1.55, 0.18, 0.3, 0.18, 0xff5d5d, { e: 1, tag: 'seg0' }]);
        s.push([-0.4, 2.0, 1.1, 0.2, 0.5, 0.2, 0x4a2413, { tag: 'seg0' }]);
        s.push([0.4, 2.0, 1.1, 0.2, 0.5, 0.2, 0x4a2413, { tag: 'seg0' }]);
        return s;
      }
      if (id === 'oom') {
        var s = [[0, 0.3, 0, 2.3, 1.9, 2.1, 0x6a44c0]];
        var lumps = [[-1.25, 0.6, 0.4, 0.8], [1.2, 0.5, -0.3, 0.9], [0.5, 2.1, 0.3, 0.85], [-0.7, 2.0, -0.4, 0.75], [0.9, 1.9, -0.8, 0.6], [-1.1, 1.6, 0.9, 0.55]];
        for (var i = 0; i < lumps.length; i++) { var l = lumps[i]; s.push([l[0], l[1], l[2], l[3], l[3], l[3], i % 2 ? 0x7a4fd0 : 0x5e3aa8]); }
        s.push([-0.45, 1.45, 1.06, 0.34, 0.5, 0.1, 0xffffff]); s.push([0.45, 1.45, 1.06, 0.34, 0.5, 0.1, 0xffffff]);
        s.push([-0.45, 1.55, 1.12, 0.18, 0.26, 0.08, 0x1a1030]); s.push([0.45, 1.55, 1.12, 0.18, 0.26, 0.08, 0x1a1030]);
        s.push([0, 0.75, 1.08, 0.9, 0.22, 0.1, 0x1a1030]);
        return s;
      }
      if (id === 'goblin') return [
        [0, 0, 0, 1.0, 1.0, 0.75, 0x4f9e3a],
        [0, 1.05, 0, 0.85, 0.75, 0.7, 0x62b848],
        [-0.62, 1.45, 0, 0.4, 0.3, 0.12, 0x4f9e3a], [0.62, 1.45, 0, 0.4, 0.3, 0.12, 0x4f9e3a],
        [-0.2, 1.3, 0.37, 0.16, 0.2, 0.08, 0xffe95c, { e: 1 }], [0.2, 1.3, 0.37, 0.16, 0.2, 0.08, 0xffe95c, { e: 1 }],
        [0, 1.08, 0.37, 0.4, 0.1, 0.08, 0x2a4a1c],
        [-0.28, -0.5, 0, 0.3, 0.5, 0.35, 0x3d7a2c], [0.28, -0.5, 0, 0.3, 0.5, 0.35, 0x3d7a2c],
        [0.85, 0.55, 0.3, 0.5, 0.14, 0.5, 0xffc83d, { e: 0.6, tag: 'coin' }],
        [0.85, 0.71, 0.3, 0.5, 0.14, 0.5, 0xe8a41f, { e: 0.5, tag: 'coin' }],
        [0.85, 0.87, 0.3, 0.5, 0.14, 0.5, 0xffc83d, { e: 0.6, tag: 'coin' }]
      ];
      if (id === 'dragon') return [
        [0, 0.55, 0, 2.5, 0.85, 0.95, 0x8a8aa8],
        [1.6, 0.7, 0, 0.9, 0.75, 0.8, 0x9a9ab8],
        [2.2, 0.75, 0, 0.5, 0.4, 0.55, 0x8a8aa8],
        [1.75, 1.15, 0.28, 0.16, 0.22, 0.1, 0xff5d5d, { e: 1 }], [1.75, 1.15, -0.28, 0.16, 0.22, 0.1, 0xff5d5d, { e: 1 }],
        [-1.5, 0.6, 0, 0.7, 0.55, 0.6, 0x7a7a98], [-2.1, 0.65, 0, 0.45, 0.35, 0.4, 0x8a8aa8],
        [0, 1.1, 0.85, 1.7, 0.12, 1.3, 0xb8b8d0, { tag: 'wingL' }],
        [0, 1.1, -0.85, 1.7, 0.12, 1.3, 0xb8b8d0, { tag: 'wingR' }],
        [0.6, 0.1, 1.3, 0.8, 0.8, 0.8, 0xd8d8e8, { o: 0.32, ns: 1, tag: 'fog' }],
        [-0.9, 0.3, -1.2, 1.0, 1.0, 1.0, 0xd8d8e8, { o: 0.28, ns: 1, tag: 'fog' }],
        [1.9, -0.2, -0.6, 0.7, 0.7, 0.7, 0xd8d8e8, { o: 0.3, ns: 1, tag: 'fog' }]
      ];
      if (id === 'kraken') {
        var s = [
          [0, 1.5, 0, 1.9, 1.0, 1.8, 0x1d4a68],
          [0, 2.5, 0, 1.5, 0.7, 1.4, 0x17394f],
          [0, 3.2, 0, 0.9, 0.5, 0.9, 0x1d4a68],
          [-0.45, 1.8, 0.92, 0.4, 0.5, 0.1, 0xffc83d, { e: 0.9 }], [0.45, 1.8, 0.92, 0.4, 0.5, 0.1, 0xffc83d, { e: 0.9 }],
          [-0.45, 1.9, 0.98, 0.18, 0.24, 0.08, 0x0a1622], [0.45, 1.9, 0.98, 0.18, 0.24, 0.08, 0x0a1622]
        ];
        for (var t = 0; t < 6; t++) {
          var a = t / 6 * Math.PI * 2, tx = Math.cos(a) * 0.85, tz = Math.sin(a) * 0.8;
          for (var j = 0; j < 3; j++) {
            var sz = 0.5 - j * 0.11;
            s.push([tx + Math.cos(a) * j * 0.22, 1.15 - j * 0.52, tz + Math.sin(a) * j * 0.22, sz, 0.55, sz, j % 2 ? 0x17394f : 0x123048, { tag: 'tent' + t }]);
          }
        }
        return s;
      }
      if (id === 'ghost') return [
        [0, 0.25, 0, 1.7, 1.6, 1.25, 0xd8ecff, { o: 0.82 }],
        [0, 1.85, 0, 1.25, 0.95, 1.05, 0xe8f4ff, { o: 0.88 }],
        [0, 2.8, 0, 0.7, 0.35, 0.7, 0xd8ecff, { o: 0.8 }],
        [-0.3, 2.2, 0.55, 0.24, 0.36, 0.08, 0x1a2438], [0.3, 2.2, 0.55, 0.24, 0.36, 0.08, 0x1a2438],
        [0, 1.95, 0.56, 0.3, 0.12, 0.06, 0x1a2438],
        [-0.62, -0.35, 0, 0.4, 0.5, 0.95, 0xcfe4fa, { o: 0.72, tag: 'fr0' }],
        [-0.21, -0.35, 0, 0.4, 0.5, 0.95, 0xd8ecff, { o: 0.72, tag: 'fr1' }],
        [0.21, -0.35, 0, 0.4, 0.5, 0.95, 0xcfe4fa, { o: 0.72, tag: 'fr2' }],
        [0.62, -0.35, 0, 0.4, 0.5, 0.95, 0xd8ecff, { o: 0.72, tag: 'fr3' }],
        [0.98, 1.05, 0.4, 0.62, 0.44, 0.12, 0xfff4d0],
        [0.98, 1.15, 0.47, 0.2, 0.2, 0.06, 0xffc83d, { e: 0.7 }]
      ];
      return [];
    }

    /* ---------- animation helpers ---------- */
    _ease(x) { return 1 - Math.pow(1 - x, 3); }

    _registerAmbient(group, kind) {
      var self = this;
      var base = group.position.y;
      this._anims.push(function (dt, t) {
        if (!group.parent) return false;
        group.children.forEach(function (m) {
          var tag = m.userData.tag; if (!tag) return;
          if (tag === 'drone') { m.position.x = Math.cos(t * 1.4) * 1.9; m.position.z = Math.sin(t * 1.4) * 1.9 - 0.4; m.position.y = 3.3 + Math.sin(t * 3) * 0.15; }
          if (tag === 'dish') m.rotation.z = Math.sin(t * 0.8) * 0.35;
          if (tag === 'beacon') m.material.emissiveIntensity = 0.7 + Math.sin(t * 2.4) * 0.5;
          if (tag === 'orb') m.material.emissiveIntensity = 0.6 + Math.sin(t * 3.2) * 0.35;
          if (tag === 'tip') m.material.emissiveIntensity = 0.6 + Math.sin(t * 1.8) * 0.4;
        });
        return true;
      });
    }

    _registerBossAnim(group, id) {
      var base = group.position.y;
      var self = this;
      var fireAcc = 1.7;
      this._anims.push(function (dt, t) {
        if (!group.parent || group.userData.dead) return false;
        group.position.y = base + Math.sin(t * 1.8) * 0.18;
        group.rotation.y = (group.userData.baseRy || 0) + Math.sin(t * 0.6) * 0.14;
        if (id === 'dragon') {
          fireAcc += dt;
          if (fireAcc > 3.2) {
            fireAcc = Math.random() * 0.9;
            self._dragonFire(group, 11, 1);
            self.dispatchEvent(new CustomEvent('dragon-fire', { bubbles: true }));
          }
        }
        if (id === 'oom') { var s = 1 + Math.sin(t * 2.6) * 0.05; group.scale.set(s, s, s); }
        group.children.forEach(function (m) {
          var tag = m.userData.tag; if (!tag) return;
          if (tag === 'wingL') m.rotation.x = 0.25 + Math.sin(t * 5) * 0.4;
          if (tag === 'wingR') m.rotation.x = -0.25 - Math.sin(t * 5) * 0.4;
          if (tag === 'coin') m.rotation.y = t * 2.5;
          if (tag === 'fog') { m.rotation.y = t * 0.5; m.position.y += Math.sin(t * 2 + m.position.x) * 0.002; }
          if (tag.indexOf('fr') === 0) m.position.y = -0.1 + Math.sin(t * 4 + parseInt(tag.slice(2), 10) * 1.6) * 0.09;
          if (tag.indexOf('seg') === 0) m.position.y += Math.sin(t * 3.5 + parseInt(tag.slice(3), 10)) * 0.004;
          if (tag.indexOf('tent') === 0) { var i = parseInt(tag.slice(4), 10); m.rotation.x = Math.sin(t * 2.2 + i) * 0.18; m.rotation.z = Math.cos(t * 2.2 + i) * 0.18; }
        });
        return true;
      });
    }

    /* ---------- clouds ---------- */
    _buildClouds() {
      this._clouds = [];
      var cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, opacity: 0.88 });
      for (var i = 0; i < 7; i++) {
        var g = new THREE.Group();
        var n = 2 + (i % 3);
        for (var j = 0; j < n; j++) {
          var m = new THREE.Mesh(this._geo(1.6 + ((i * 3 + j * 7) % 5) * 0.5, 0.55, 1.3 + ((i + j * 3) % 4) * 0.4), cm);
          m.position.set((j - (n - 1) / 2) * 1.5 + ((j * 13 + i) % 3) * 0.25, ((j + i) % 3 - 1) * 0.18, ((j * 5 + i * 2) % 3 - 1) * 0.55);
          g.add(m);
        }
        g.position.set(-30 + (i / 7) * 60, 10.5 + (i % 4) * 1.8, -20 + ((i * 5) % 7) * 5.5);
        g.userData.v = 0.3 + (i % 3) * 0.18;
        this._scene.add(g);
        this._clouds.push(g);
      }
    }

    /* ---------- people ---------- */
    _initPeople() {
      var self = this;
      this._people = []; this._peopleT = 0; this._peopleHits = [];
      // building lots are obstacles — people walk the streets between them (door points sit just outside)
      this._obstacles = PLOTS.map(function (pl) { return { id: pl.id, x: pl.x, z: pl.z, h: 2.05 }; });
      var skin = 0xf0c8a0, pants = 0x2a3050;
      var shirts = { foundation: 0x8fa1c0, tower: 0x5b7fb8, observatory: 0x3aa8a0, lab: 0x8a6cf0, garage: 0xe8873a, library: 0xa06a3c, signal: 0xd94f4f };
      PLOTS.forEach(function (pl, idx) {
        var g = new THREE.Group();
        var shirt = shirts[pl.id] || 0x8fa1c0;
        var legL = self._box([-0.09, 0, 0, 0.15, 0.28, 0.17, pants]);
        var legR = self._box([0.09, 0, 0, 0.15, 0.28, 0.17, pants]);
        var body = self._box([0, 0.28, 0, 0.36, 0.42, 0.24, shirt]);
        var armL = self._box([-0.25, 0.32, 0, 0.11, 0.32, 0.15, shirt]);
        var armR = self._box([0.25, 0.32, 0, 0.11, 0.32, 0.15, shirt]);
        var head = self._box([0, 0.7, 0, 0.32, 0.32, 0.3, skin]);
        [legL, legR, body, armL, armR, head].forEach(function (m) { g.add(m); });
        var bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, fog: false }));
        bubble.scale.set(1.5, 1.15, 1);
        bubble.position.y = 1.65;
        bubble.visible = false;
        bubble.renderOrder = 999;
        g.add(bubble);
        var hitM = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.85, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
        hitM.position.y = 0.75;
        hitM.userData.pIdx = idx;
        g.add(hitM);
        self._peopleHits.push(hitM);
        var toC = new THREE.Vector3(-pl.x, 0, -pl.z).normalize();
        var perp = new THREE.Vector3(-toC.z, 0, toC.x);
        var home = new THREE.Vector3(pl.x + toC.x * 3.1, 0, pl.z + toC.z * 3.1);
        g.position.copy(home);
        self._scene.add(g);
        self._people.push({
          g: g, plot: pl.id, legL: legL, legR: legR, armL: armL, armR: armR, bubble: bubble,
          home: home, perp: perp, door: new THREE.Vector3(pl.x + toC.x * 2.25, 0, pl.z + toC.z * 2.25),
          center: new THREE.Vector3(pl.x, 0, pl.z),
          mode: '', state: 'pace', dir: idx % 2 ? 1 : -1, target: null, waitT: idx * 0.4, insideT: 0,
          phase: idx * 2.1, speed: 0.8 + (idx % 3) * 0.18, strollN: 0, seed: 7 + idx * 31,
          bubbleKind: null, forceHappyT: 0, happyBubbleT: 0, jumpT: 0, wasBuilt: false,
          chatT: 0, chatCd: 0, clickT: 0, visitT: 0, lookT: 0, lookT0: 0, baseRy: 0, visitX: 0, visitZ: 0
        });
      });
    }

    _rand(p) { p.seed = (p.seed * 9301 + 49297) % 233280; return p.seed / 233280; }

    _pushOut(v, skipId) { // push a point out of any building lot (minimal axis), so walkers slide along walls
      for (var i = 0; i < this._obstacles.length; i++) {
        var o = this._obstacles[i];
        if (o.id === skipId) continue;
        var dx = v.x - o.x, dz = v.z - o.z;
        if (Math.abs(dx) < o.h && Math.abs(dz) < o.h) {
          if (o.h - Math.abs(dx) < o.h - Math.abs(dz)) v.x = o.x + (dx >= 0 ? o.h : -o.h);
          else v.z = o.z + (dz >= 0 ? o.h : -o.h);
        }
      }
      return v;
    }

    _faceToward(p, x, z, dt) {
      var want = Math.atan2(x - p.g.position.x, z - p.g.position.z);
      var diff = ((want - p.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      p.g.rotation.y += diff * Math.min(1, dt * 6);
    }

    _pokePerson(i) {
      var p = this._people[i]; if (!p || !p.g.visible) return;
      p.clickT = 1.8;
      if (p.state !== 'cheer' && p.state !== 'inside') {
        if (p.state === 'chat') p.armR.position.y = 0.32;
        p.state = 'cheer'; p.jumpT = 0.75; p.target = null;
      }
      var c = this._cam.position;
      p.g.rotation.y = Math.atan2(c.x - p.g.position.x, c.z - p.g.position.z);
    }

    _bubbleTex(kind) {
      this._bubbleCache = this._bubbleCache || {};
      if (this._bubbleCache[kind]) return this._bubbleCache[kind];
      var c = document.createElement('canvas'); c.width = 170; c.height = 130;
      var x = c.getContext('2d');
      x.fillStyle = '#10141f'; x.fillRect(6, 2, 158, 92);
      var bg = kind === 'heart' ? '#eafff2' : '#f7f4ea';
      x.fillStyle = bg; x.fillRect(12, 8, 146, 80);
      x.fillStyle = '#10141f';
      x.beginPath(); x.moveTo(70, 90); x.lineTo(104, 90); x.lineTo(87, 127); x.closePath(); x.fill();
      x.fillStyle = bg;
      x.beginPath(); x.moveTo(77, 86); x.lineTo(97, 86); x.lineTo(87, 116); x.closePath(); x.fill();
      if (kind === 'heart') {
        var px = 10, ox = 85 - 3.5 * px, oy = 20;
        var map = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
        x.fillStyle = '#e84a5f';
        for (var r = 0; r < map.length; r++) for (var q = 0; q < 7; q++) if (map[r][q] === '1') x.fillRect(ox + q * px, oy + r * px, px, px);
      } else {
        x.fillStyle = kind === '!' ? '#d93838' : '#1a2030';
        x.font = '900 ' + (kind.length > 3 ? '34px' : kind.length > 1 ? '42px' : '56px') + ' monospace';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(kind, 85, 48);
      }
      var t = new THREE.CanvasTexture(c);
      this._bubbleCache[kind] = t;
      return t;
    }

    _updatePeople(dt, t) {
      var self = this;
      this._peopleT += dt;
      var PROB = { foundation: '?', tower: 'DEBT', observatory: 'OOM', lab: '$$$', garage: 'FOG', library: 'HUH?', signal: '...' };
      var builtCount = Object.keys(this._structures).length;
      var bossPlot = null;
      Object.keys(this._pads).forEach(function (k) { if (self._pads[k].state === 'boss') bossPlot = k; });
      // everyone celebrates a newly completed building
      if (this._lastBuilt === undefined) this._lastBuilt = builtCount;
      if (builtCount > this._lastBuilt && this._peopleT > 2.5) {
        this._people.forEach(function (q) {
          if (q.state !== 'inside') { q.state = 'cheer'; q.jumpT = 0.85 + Math.random() * 0.35; q.happyBubbleT = 1.8; }
        });
      }
      this._lastBuilt = builtCount;
      // finale parade: once everything is built, march a loop every so often
      if (builtCount >= this._people.length && !bossPlot) {
        if (this._paradeT > 0) this._paradeT -= dt;
        else {
          this._paradeGap = (this._paradeGap === undefined) ? 2.5 : this._paradeGap - dt;
          if (this._paradeGap <= 0) { this._paradeT = 14; this._paradeGap = 36; }
        }
      } else { this._paradeT = 0; this._paradeGap = 2.5; }

      this._people.forEach(function (p) {
        var built = !!self._structures[p.plot];
        var mode = bossPlot ? (p.plot === bossPlot ? 'flee' : 'watch')
          : (self._paradeT > 0 && built) ? 'parade'
          : built ? 'happy' : 'wait';
        if (mode !== p.mode) {
          p.mode = mode; p.target = null; p.waitT = 0;
          if (!p.g.visible) p.g.visible = true;
          p.state = mode === 'happy' ? 'stroll' : mode === 'wait' ? 'pace' : mode === 'parade' ? 'parade' : mode === 'watch' ? 'watchGo' : 'fleeRun';
          if (mode === 'flee') {
            var away = new THREE.Vector3(-p.center.x, 0, -p.center.z).normalize();
            p.target = self._pushOut(p.home.clone().addScaledVector(away, 2.6));
          }
          if (mode === 'watch' && bossPlot) { // gather at a safe ring around the fight
            var bp = self._pads[bossPlot].pos;
            var dir = new THREE.Vector3(p.g.position.x - bp.x, 0, p.g.position.z - bp.z);
            if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
            dir.normalize();
            p.target = self._pushOut(new THREE.Vector3(
              Math.max(-9.5, Math.min(9.5, bp.x + dir.x * 6.4)), 0,
              Math.max(-8.2, Math.min(8.2, bp.z + dir.z * 6.4))));
          }
        }
        if (built && !p.wasBuilt) { p.wasBuilt = true; p.forceHappyT = 2.6; }
        if (!built && p.wasBuilt) { p.wasBuilt = false; p.g.visible = true; }

        var kind = '';
        if (p.clickT > 0) { p.clickT -= dt; kind = 'HI!'; }
        else if (p.forceHappyT > 0) { p.forceHappyT -= dt; kind = 'heart'; }
        else if (mode === 'flee') kind = '!';
        else if (p.state === 'watchGo') kind = '!';
        else if (p.state === 'chat') kind = '...';
        else if (mode === 'wait') kind = PROB[p.plot] || '?';
        else if (p.happyBubbleT > 0) kind = 'heart';
        if (p.happyBubbleT > 0) p.happyBubbleT -= dt;
        if (p.chatCd > 0) p.chatCd -= dt;

        var moving = false;
        var sp = p.speed * (mode === 'flee' ? 1.9 : 1);

        if (p.state === 'cheer') {
          p.jumpT -= dt;
          p.g.position.y = Math.abs(Math.sin((1.1 - p.jumpT) * 9)) * 0.42 * Math.max(p.jumpT, 0);
          if (p.jumpT <= 0) { p.g.position.y = 0; p.state = mode === 'wait' ? 'pace' : 'stroll'; p.target = null; }
        } else if (p.state === 'inside') {
          p.insideT -= dt;
          if (p.insideT <= 0) {
            p.g.visible = true; p.state = 'stroll'; p.target = null;
            if (self._rand(p) < 0.55) p.happyBubbleT = 1.7;
          }
        } else if (p.state === 'chat') {
          p.chatT -= dt;
          p.armR.position.y = 0.32 + (p.chatT > 1.4 ? Math.abs(Math.sin(t * 11)) * 0.2 : 0); // wave hello
          if (p.chatT <= 0) { p.armR.position.y = 0.32; p.state = mode === 'wait' ? 'pace' : 'stroll'; p.target = null; p.waitT = 0.5; }
        } else if (p.state === 'look') {
          p.lookT -= dt;
          p.g.rotation.y = p.baseRy + Math.sin((p.lookT0 - p.lookT) * 2.6) * 0.7;
          if (p.lookT <= 0) { p.state = mode === 'wait' ? 'pace' : 'stroll'; p.target = null; }
        } else if (p.state === 'watchWait' || p.state === 'fleeWait') {
          if (bossPlot) self._faceToward(p, self._pads[bossPlot].pos.x, self._pads[bossPlot].pos.z, dt);
        } else if (p.state === 'visitWait') {
          p.visitT -= dt;
          self._faceToward(p, p.visitX, p.visitZ, dt);
          if (p.visitT <= 0) { p.state = 'stroll'; p.target = null; p.waitT = 0.3; }
        } else {
          if (p.state === 'parade') { // march a loop around the plaza
            var pa = Math.atan2(p.g.position.z, p.g.position.x);
            p.target = new THREE.Vector3(Math.cos(pa + 0.5) * 4.35, 0, Math.sin(pa + 0.5) * 4.35);
            if (p.happyBubbleT <= 0 && self._rand(p) < dt * 0.12) p.happyBubbleT = 1.3;
          }
          if (!p.target && p.state !== 'fleeRun') {
            if ((p.state === 'pace' || p.state === 'stroll') && self._rand(p) < 0.14) { // pause and look around
              p.state = 'look'; p.lookT = p.lookT0 = 1.3 + self._rand(p) * 1.2; p.baseRy = p.g.rotation.y;
            } else if (p.state === 'pace') {
              p.dir = -p.dir;
              p.target = self._pushOut(p.home.clone().addScaledVector(p.perp, p.dir * 1.35));
            } else if (p.state === 'stroll') {
              var others = builtCount > 1 ? PLOTS.filter(function (q) { return q.id !== p.plot && self._structures[q.id]; }) : [];
              if (built && p.strollN >= 2 + Math.floor(self._rand(p) * 2)) {
                p.strollN = 0; p.state = 'toDoor'; p.target = p.door.clone();
              } else if (others.length && self._rand(p) < 0.3) { // go visit a neighbor's building
                var vq = others[Math.floor(self._rand(p) * others.length) % others.length];
                var vtc = new THREE.Vector3(-vq.x, 0, -vq.z).normalize();
                p.visitX = vq.x; p.visitZ = vq.z;
                p.state = 'visitGo'; p.strollN++;
                p.target = self._pushOut(new THREE.Vector3(vq.x + vtc.x * 3.0, 0, vq.z + vtc.z * 3.0));
              } else {
                var a = self._rand(p) * Math.PI * 2, r = 2.2 + self._rand(p) * 1.6;
                p.target = self._pushOut(new THREE.Vector3(
                  Math.max(-9.5, Math.min(9.5, p.center.x + Math.cos(a) * r)), 0,
                  Math.max(-8.2, Math.min(8.2, p.center.z + Math.sin(a) * r))));
                p.strollN++;
              }
            } else if (p.state === 'toDoor') p.target = p.door.clone();
            else if (p.state === 'watchGo') { p.state = 'watchWait'; }
            else if (p.state === 'visitGo') { p.state = 'stroll'; }
          }
          if (p.waitT > 0) { p.waitT -= dt; }
          else if (p.target) {
            var dx = p.target.x - p.g.position.x, dz = p.target.z - p.g.position.z;
            var d = Math.hypot(dx, dz);
            if (d > 0.14) {
              moving = true;
              var step = Math.min(sp * dt, d);
              var ox = p.g.position.x, oz = p.g.position.z;
              p.g.position.x += dx / d * step; p.g.position.z += dz / d * step;
              self._pushOut(p.g.position, p.state === 'toDoor' ? p.plot : null); // own lot passable when heading in the door
              var real = Math.hypot(p.g.position.x - ox, p.g.position.z - oz);
              if (real < step * 0.3) { // wedged against a wall/corner — give up on this target
                p.stuckT = (p.stuckT || 0) + dt;
                if (p.stuckT > 1.1) {
                  p.stuckT = 0; p.target = null;
                  if (p.state === 'toDoor') p.state = 'stroll';
                  else if (p.state === 'fleeRun') p.state = 'fleeWait';
                  else if (p.state === 'watchGo') p.state = 'watchWait';
                  else if (p.state === 'visitGo') p.state = 'stroll';
                }
              } else p.stuckT = 0;
              var want = Math.atan2(dx, dz), cur = p.g.rotation.y;
              var diff = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
              p.g.rotation.y = cur + diff * Math.min(1, dt * 8);
            } else {
              if (p.state === 'toDoor') { p.state = 'inside'; p.insideT = 1.8 + self._rand(p) * 2.2; p.g.visible = false; p.target = null; }
              else if (p.state === 'fleeRun') { p.target = null; p.state = 'fleeWait'; }
              else if (p.state === 'watchGo') { p.target = null; p.state = 'watchWait'; }
              else if (p.state === 'visitGo') { p.target = null; p.state = 'visitWait'; p.visitT = 2 + self._rand(p) * 1.8; }
              else { p.target = null; p.waitT = 0.7 + self._rand(p) * 1.6; }
            }
          }
        }

        if (moving) {
          p.phase += dt * 10;
          var sw = Math.sin(p.phase);
          p.legL.position.y = 0.14 + Math.max(0, sw) * 0.13;
          p.legR.position.y = 0.14 + Math.max(0, -sw) * 0.13;
          p.armL.position.z = sw * 0.09; p.armR.position.z = -sw * 0.09;
          if (p.state !== 'cheer') p.g.position.y = Math.abs(Math.sin(p.phase)) * 0.03;
        } else {
          p.legL.position.y = 0.14; p.legR.position.y = 0.14;
          p.armL.position.z = 0; p.armR.position.z = 0;
          if (p.state !== 'cheer') p.g.position.y += (0 - p.g.position.y) * 0.2;
        }

        if (kind !== p.bubbleKind) {
          p.bubbleKind = kind;
          if (!kind) p.bubble.visible = false;
          else {
            p.bubble.material.map = self._bubbleTex(kind);
            p.bubble.material.needsUpdate = true;
            p.bubble.visible = true;
          }
        }
        if (p.bubble.visible) p.bubble.position.y = 1.65 + Math.sin(t * 2.2 + p.phase) * 0.06;
      });

      // when two idle villagers cross paths, they stop and chat
      this._chatScanT = (this._chatScanT || 0) - dt;
      if (this._chatScanT <= 0) {
        this._chatScanT = 0.6;
        var free = function (q) { return (q.state === 'stroll' || q.state === 'pace') && q.g.visible && q.chatCd <= 0; };
        for (var ci = 0; ci < this._people.length; ci++) {
          var pa2 = this._people[ci]; if (!free(pa2)) continue;
          for (var cj = ci + 1; cj < this._people.length; cj++) {
            var pb2 = this._people[cj]; if (!free(pb2)) continue;
            var cdd = Math.hypot(pa2.g.position.x - pb2.g.position.x, pa2.g.position.z - pb2.g.position.z);
            if (cdd < 1.35) {
              pa2.state = 'chat'; pa2.chatT = 2.6; pa2.chatCd = 16 + Math.random() * 8; pa2.target = null;
              pb2.state = 'chat'; pb2.chatT = 2.6; pb2.chatCd = 16 + Math.random() * 8; pb2.target = null;
              pa2.g.rotation.y = Math.atan2(pb2.g.position.x - pa2.g.position.x, pb2.g.position.z - pa2.g.position.z);
              pb2.g.rotation.y = Math.atan2(pa2.g.position.x - pb2.g.position.x, pa2.g.position.z - pb2.g.position.z);
              break;
            }
          }
        }
      }
    }

    /* ---------- public game API ---------- */
    placeSeed(id, color) {
      var self = this, pad = this._pads[id];
      return new Promise(function (res) {
        var m = self._box([0, 0, 0, 1.15, 1.15, 1.15, color || 0xffffff]);
        m.position.set(pad.pos.x, 8, pad.pos.z);
        self._scene.add(m);
        self._seeds = self._seeds || {}; self._seeds[id] = m;
        var t0 = null;
        self._anims.push(function (dt, t) {
          if (t0 === null) t0 = t;
          var k = Math.min((t - t0) / 0.55, 1), e = self._ease(k);
          m.position.y = 8 - (8 - 0.82) * e;
          if (k >= 1) { m.scale.set(1.15, 0.85, 1.15); setTimeout(function () { m.scale.set(1, 1, 1); res(); }, 90); return false; }
          return true;
        });
      });
    }

    spawnBoss(id, plotId) {
      var self = this, pad = this._pads[plotId];
      this.setPadState(plotId, 'boss');
      return new Promise(function (res) {
        var g = self._group(self._bossSpecs(id));
        g.position.set(pad.pos.x, 2.1, pad.pos.z);
        // face the camera's destination azimuth (focusBoss was just called)
        var ang = self._want.theta;
        if (id === 'dragon') ang -= Math.PI / 2; // dragon model faces +x
        g.rotation.y = ang;
        g.userData.baseRy = ang;
        g.userData.bossId = id;
        g.scale.set(0.01, 0.01, 0.01);
        self._scene.add(g);
        self._bosses[plotId] = g;
        var t0 = null;
        self._anims.push(function (dt, t) {
          if (t0 === null) t0 = t;
          var k = Math.min((t - t0) / 0.5, 1);
          var s = k < 0.8 ? self._ease(k / 0.8) * 1.12 : 1.12 - 0.12 * self._ease((k - 0.8) / 0.2);
          g.scale.set(s, s, s);
          if (k >= 1) { g.scale.set(1, 1, 1); self._registerBossAnim(g, id); res(); return false; }
          return true;
        });
        self.shake(0.6);
      });
    }

    bossHit(plotId) {
      var g = this._bosses[plotId]; if (!g) return;
      var self = this;
      this.shake(0.9);
      if (g.userData.bossId === 'dragon') this._dragonFire(g, 24, 1.5);
      g.children.forEach(function (m) {
        if (!m.userData.origMat) m.userData.origMat = m.material;
        m.material = self._mat(0xff3333, 0.9, null);
      });
      setTimeout(function () {
        g.children.forEach(function (m) { if (m.userData.origMat) m.material = m.userData.origMat; });
      }, 260);
    }

    _dragonFire(group, count, power) {
      var self = this;
      power = power || 1;
      var colors = [0xffd23f, 0xff8a3c, 0xff5d2c];
      var parts = [];
      for (var i = 0; i < count; i++) {
        var m = this._box([0, 0, 0, 0.22, 0.22, 0.22, colors[i % 3], { e: 1.2, ns: 1 }]);
        m.material = m.material.clone(); m.material.transparent = true;
        var mouth = new THREE.Vector3(2.5, 0.72, 0);
        group.localToWorld(mouth);
        m.position.copy(mouth);
        var dir = new THREE.Vector3(1, 0.06 + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.5);
        dir.applyQuaternion(group.quaternion).normalize();
        m.userData.vel = dir.multiplyScalar((3.6 + Math.random() * 2.6) * power);
        m.userData.life = 0.45 + Math.random() * 0.35;
        m.userData.age = 0;
        this._scene.add(m);
        parts.push(m);
      }
      this._anims.push(function (dt, t) {
        var alive = false;
        parts.forEach(function (m) {
          if (!m.parent) return;
          m.userData.age += dt;
          var k = m.userData.age / m.userData.life;
          if (k >= 1) { self._scene.remove(m); return; }
          alive = true;
          m.userData.vel.y += dt * 1.3;
          m.userData.vel.multiplyScalar(1 - dt * 1.7);
          m.position.addScaledVector(m.userData.vel, dt);
          var s = 1 + k * 1.7;
          m.scale.set(s, s, s);
          m.material.opacity = 1 - k;
          m.rotation.x += dt * 5; m.rotation.y += dt * 4;
        });
        return alive;
      });
    }

    defeatBoss(plotId) {
      var self = this, g = this._bosses[plotId];
      if (!g) return Promise.resolve();
      g.userData.dead = true;
      delete this._bosses[plotId];
      this.shake(1.1);
      return new Promise(function (res) {
        var parts = g.children.slice();
        parts.forEach(function (m) {
          m.material = m.material.clone(); m.material.transparent = true;
          var v = new THREE.Vector3(m.position.x + (Math.random() - 0.5), m.position.y * 0.3 + Math.random() * 1.2 + 0.6, m.position.z + (Math.random() - 0.5));
          v.normalize().multiplyScalar(5 + Math.random() * 5);
          m.userData.vel = v; m.userData.rot = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
        });
        var t0 = null;
        self._anims.push(function (dt, t) {
          if (t0 === null) t0 = t;
          var k = (t - t0) / 1.15;
          parts.forEach(function (m) {
            m.userData.vel.y -= 14 * dt;
            m.position.addScaledVector(m.userData.vel, dt);
            m.rotation.x += m.userData.rot.x * dt; m.rotation.y += m.userData.rot.y * dt;
            m.material.opacity = Math.max(0, 1 - k * 1.1);
          });
          if (k >= 1) { self._scene.remove(g); res(); return false; }
          return true;
        });
      });
    }

    buildStructure(id, instant) {
      var self = this, pad = this._pads[id];
      if (this._structures[id]) return Promise.resolve();
      if (this._seeds && this._seeds[id]) { this._scene.remove(this._seeds[id]); delete this._seeds[id]; }
      var specs = this._specsFor(id);
      var g = new THREE.Group();
      g.position.set(pad.pos.x, 0, pad.pos.z);
      this._scene.add(g);
      this._structures[id] = g;
      this.setPadState(id, 'built');
      var meshes = specs.map(function (s) { return self._box(s); });
      if (instant) {
        meshes.forEach(function (m) { g.add(m); });
        this._registerAmbient(g, id);
        return Promise.resolve();
      }
      var step = 0.09 / this._buildSpeed, dur = 0.34 / this._buildSpeed;
      return new Promise(function (res) {
        meshes.forEach(function (m, i) {
          var targetY = m.position.y, delay = i * step, t0 = null, added = false;
          self._anims.push(function (dt, t) {
            if (t0 === null) t0 = t;
            var k = (t - t0 - delay) / dur;
            if (k < 0) return true;
            if (!added) { g.add(m); added = true; self.dispatchEvent(new CustomEvent('build-tick', { bubbles: true, detail: { i: i } })); }
            var e = self._ease(Math.min(k, 1));
            m.position.y = targetY + (1 - e) * 4.5;
            var sc = Math.min(1, 0.4 + e * 0.6);
            m.scale.set(sc, sc, sc);
            if (k >= 1) { m.position.y = targetY; m.scale.set(1, 1, 1); return false; }
            return true;
          });
        });
        setTimeout(function () {
          self._registerAmbient(g, id);
          self.dispatchEvent(new CustomEvent('build-done', { bubbles: true, detail: { id: id } }));
          res();
        }, (meshes.length * step + dur) * 1000 + 260);
      });
    }

    celebrate() {
      var self = this, pad = this._pads.signal;
      this._autoOrbitOn = true;
      if (this._people) this._people.forEach(function (p) { p.forceHappyT = 6; });
      // light beam
      var beam = new THREE.Mesh(this._geo(0.9, 30, 0.9), new THREE.MeshBasicMaterial({ color: 0xffc83d, transparent: true, opacity: 0.0, fog: false }));
      beam.position.set(pad.pos.x, 7.6 + 15, pad.pos.z);
      this._scene.add(beam);
      this._beam = beam;
      var t0 = null;
      this._anims.push(function (dt, t) {
        if (!beam.parent) return false;
        if (t0 === null) t0 = t;
        var k = Math.min((t - t0) / 0.8, 1);
        beam.material.opacity = 0.34 * k * (0.75 + Math.sin(t * 3) * 0.25);
        return true;
      });
      // voxel confetti
      var colors = [0xffc83d, 0x5b7fb8, 0x3aa8a0, 0x8a6cf0, 0xe8873a, 0xd94f4f, 0x62b848];
      for (var w = 0; w < 2; w++) {
        setTimeout(function () {
          var parts = [];
          for (var i = 0; i < 46; i++) {
            var m = self._box([0, 0, 0, 0.34, 0.34, 0.34, colors[i % colors.length], { e: 0.5, ns: 1 }]);
            m.position.set((Math.random() - 0.5) * 4, 3 + Math.random() * 2, (Math.random() - 0.5) * 4);
            m.material = m.material.clone(); m.material.transparent = true;
            m.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 9, 7 + Math.random() * 7, (Math.random() - 0.5) * 9);
            self._scene.add(m); parts.push(m);
          }
          var tt0 = null;
          self._anims.push(function (dt, t) {
            if (tt0 === null) tt0 = t;
            var k = (t - tt0) / 2.4;
            parts.forEach(function (m) {
              m.userData.vel.y -= 9.5 * dt;
              m.position.addScaledVector(m.userData.vel, dt);
              m.rotation.x += dt * 4; m.rotation.z += dt * 3;
              m.material.opacity = Math.max(0, 1 - k);
            });
            if (k >= 1) { parts.forEach(function (m) { self._scene.remove(m); }); return false; }
            return true;
          });
        }, w * 900);
      }
      this._pose(this._want.theta + 0.5, 1.02, 30, 0, 3.4, 0);
    }

    resetWorld() {
      var self = this;
      Object.keys(this._structures).forEach(function (k) { self._scene.remove(self._structures[k]); });
      Object.keys(this._bosses).forEach(function (k) { self._scene.remove(self._bosses[k]); });
      if (this._seeds) Object.keys(this._seeds).forEach(function (k) { self._scene.remove(self._seeds[k]); });
      if (this._beam) { this._scene.remove(this._beam); this._beam = null; }
      this._structures = {}; this._bosses = {}; this._seeds = {};
      if (this._people) this._people.forEach(function (p) { p.g.visible = true; p.mode = ''; p.target = null; p.state = 'pace'; });
      Object.keys(this._pads).forEach(function (k) { self.setPadState(k, 'locked'); });
      this._autoOrbitOn = false;
      this.focusOverview();
    }
  }

  customElements.define('navnit-world', NavnitWorld);
})();
