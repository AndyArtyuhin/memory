/* Memory — app logic. Settings live in config.js; you shouldn't need to edit this file. */
(function () {
  const CFG = window.MEMORY_CONFIG;
  const M = CFG.model;
  const THREE = AFRAME.THREE;
  const html = document.documentElement;

  /* ---------- shared: scale and centre any model so its largest side = size ---------- */
  function fitObject(obj, size) {
    const parent = obj.parent;
    if (parent) parent.remove(obj);
    obj.position.set(0, 0, 0); obj.scale.set(1, 1, 1); obj.rotation.set(0, 0, 0);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const dim = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const k = size / (Math.max(dim.x, dim.y, dim.z) || 1);
    obj.scale.setScalar(k);
    obj.position.copy(centre).multiplyScalar(-k);
    if (parent) parent.add(obj);
  }

  AFRAME.registerComponent('fit-model', {
    schema: { size: { default: 1 } },
    init() {
      this.el.addEventListener('model-loaded', () => {
        fitObject(this.el.getObject3D('mesh'), this.data.size);
      });
    },
  });

  /* ---------- build the AR scene from config ---------- */
  const p = M.position, r = M.rotation || { x: 0, y: 0, z: 0 };
  const f = M.float || 0;
  const pos = (dz) => `${p.x} ${p.y} ${p.z + dz}`;
  const shadowSize = M.size * 1.45;

  document.getElementById('ar').innerHTML = `
  <a-scene
    mindar-image="imageTargetSrc: ${CFG.marker.file}; autoStart: false; uiLoading: no; uiScanning: no; uiError: no; filterMinCF: 0.0001; filterBeta: 0.001; missTolerance: 6; warmupTolerance: 3"
    renderer="colorManagement: true; antialias: true; alpha: true"
    vr-mode-ui="enabled: false" xr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false" embedded>
    <a-assets timeout="30000">
      <a-asset-item id="model" src="${M.file}"></a-asset-item>
    </a-assets>
    <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
    <a-entity light="type: ambient; intensity: 0.65"></a-entity>
    <a-entity light="type: directional; intensity: 0.95" position="-0.6 0.8 1.2"></a-entity>

    <a-entity id="anchor" mindar-image-target="targetIndex: 0">
      ${M.shadow ? `<a-plane id="shadow" position="${p.x} ${p.y} 0.002" width="${shadowSize}" height="${shadowSize}"
        material="transparent: true; opacity: 0; shader: flat; depthWrite: false"></a-plane>` : ''}
      <a-entity id="lift" position="${pos(0)}" scale="0.001 0.001 0.001"
        animation__in="property: scale; from: 0.001 0.001 0.001; to: 1 1 1; dur: 1100; easing: easeOutCubic; startEvents: reveal"
        ${f ? `animation__float="property: position; from: ${pos(-f)}; to: ${pos(f)}; dir: alternate; dur: 3200; loop: true; easing: easeInOutSine"` : ''}>
        <a-entity ${M.spinSeconds ? `animation__spin="property: rotation; from: 0 0 0; to: 0 0 360; dur: ${M.spinSeconds * 1000}; loop: true; easing: linear"` : ''}>
          <!-- rotate 90° on X so the model's "up" (Y) points out of the marker -->
          <a-entity rotation="90 0 0">
            <a-entity rotation="${r.x} ${r.y} ${r.z}">
              <a-gltf-model src="#model" fit-model="size: ${M.size}"></a-gltf-model>
            </a-entity>
          </a-entity>
        </a-entity>
      </a-entity>
    </a-entity>
  </a-scene>`;

  /* ---------- title: stretch "MEMORY" to the exact width of the text column ---------- */
  (function fitTitle() {
    const h = document.querySelector('h1');
    if (!h) return;
    const ctx = document.createElement('canvas').getContext('2d');
    function fit() {
      const W = h.parentElement.clientWidth;
      if (!W) return;
      const cs = getComputedStyle(h);
      h.style.fontSize = '100px'; h.style.marginLeft = '0px';
      const r = document.createRange(); r.selectNodeContents(h);
      const box = r.getBoundingClientRect().width;               /* advance width at 100px, letter-spacing included */
      const ls = parseFloat(getComputedStyle(h).letterSpacing) || 0;
      const text = h.textContent.trim();
      /* side bearings of the first and last letters, so the ink (not the empty glyph box) touches both edges */
      let lsb = 0, rsb = 0;
      try {
        ctx.font = cs.fontWeight + ' 100px ' + cs.fontFamily;
        const a = ctx.measureText(text[0]), z = ctx.measureText(text[text.length - 1]);
        if (isFinite(a.actualBoundingBoxLeft)) lsb = -a.actualBoundingBoxLeft;
        if (isFinite(z.actualBoundingBoxRight)) rsb = z.width - z.actualBoundingBoxRight;
      } catch (e) {}
      const ink = box - ls - lsb - rsb;                           /* trailing letter-spacing is not ink */
      const k = W / ink;
      h.style.fontSize = (100 * k).toFixed(2) + 'px';
      h.style.marginLeft = (-lsb * k).toFixed(2) + 'px';
    }
    fit();
    if (document.fonts) { document.fonts.ready.then(fit); document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', fit); }
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 300));
  })();

  /* ---------- language ---------- */
  document.querySelectorAll('[data-hint]').forEach(el => { el.textContent = CFG.hint[el.dataset.hint] || ''; });
  function setLang(l) {
    html.lang = l;
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.set === l));
    try { sessionStorage.setItem('lang', l); } catch (e) {}
  }
  /* Language follows the device: the first French or English entry in the phone's language list wins.
     Any other device language gets English. A manual switch only lasts for the current visit. */
  setLang(window.MEMORY_DEVICE_LANG ? window.MEMORY_DEVICE_LANG() : 'en');
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.set)));

  /* ---------- environment checks: local file, in-app browser ---------- */
  const ua = navigator.userAgent || '';
  const isInApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|musical_ly|Snapchat|LinkedInApp|Twitter|Pinterest/i.test(ua);
  const notice = document.getElementById('notice');
  function note(cls) { notice.hidden = false; notice.querySelector('.' + cls).hidden = false; }
  if (location.protocol === 'file:' && !window.MEMORY_BUNDLED) note('n-file');
  else if (isInApp) { note('n-inapp'); document.getElementById('copy').hidden = false; }
  document.getElementById('copy').addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(location.href); }
    catch (err) {
      const t = document.createElement('textarea'); t.value = location.href; document.body.appendChild(t);
      t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove();
    }
    b.innerHTML = '<span lang="fr">Lien copié</span><span lang="en">Link copied</span>';
  });

  /* ---------- AR flow ---------- */
  const intro = document.getElementById('intro');
  const hud = document.getElementById('hud');
  const btn = document.getElementById('start');
  const err = document.getElementById('err');
  const sceneEl = document.querySelector('a-scene');
  const anchor = document.getElementById('anchor');
  const lift = document.getElementById('lift');
  const shadow = document.getElementById('shadow');

  function busy(on) {
    btn.disabled = on;
    btn.querySelector('.lbl-idle').hidden = on;
    btn.querySelector('.lbl-busy').hidden = !on;
  }
  function showError(kind) {
    busy(false);
    intro.classList.remove('gone');
    hud.classList.remove('on');
    err.querySelectorAll('p').forEach(el => el.hidden = !el.classList.contains('m-' + kind));
    err.classList.add('show');
  }

  sceneEl.addEventListener('loaded', () => {
    if (!shadow) return;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.5, 'rgba(0,0,0,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const mesh = shadow.getObject3D('mesh');
    if (mesh) { mesh.material.map = new THREE.CanvasTexture(c); mesh.material.needsUpdate = true; }
  });

  let started = false, readyTimer = null;
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    err.classList.remove('show');
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('insecure'); return;
    }
    busy(true);

    /* Ask for the camera ourselves, inside the tap, so every browser shows its permission prompt
       and we can tell the visitor exactly what went wrong. Then hand the camera over to MindAR. */
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
      stream.getTracks().forEach(t => t.stop());
    } catch (e) {
      const n = e && e.name;
      showError(n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError' ? 'nocam'
              : n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError' ? 'busy'
              : 'denied');
      return;
    }

    const run = () => {
      const sys = sceneEl.systems['mindar-image-system'];
      if (!sys) { showError('load'); return; }
      clearTimeout(readyTimer);
      readyTimer = setTimeout(() => { if (!hud.classList.contains('on')) showError('load'); }, 25000);
      sys.start(); started = true;
    };
    if (sceneEl.hasLoaded) run(); else sceneEl.addEventListener('loaded', run, { once: true });
  });

  sceneEl.addEventListener('arReady', () => { clearTimeout(readyTimer); busy(false); intro.classList.add('gone'); hud.classList.add('on'); });
  sceneEl.addEventListener('arError', () => { clearTimeout(readyTimer); started = false; showError('denied'); });

  let lostAt = 0, shown = false;
  anchor.addEventListener('targetFound', () => {
    hud.classList.add('found');
    if (!shown || Date.now() - lostAt > 1500) {
      lift.setAttribute('scale', '0.001 0.001 0.001');
      lift.emit('reveal');
    }
    shown = true;
    const sm = shadow && shadow.getObject3D('mesh'); if (sm) sm.material.opacity = 0.9;
  });
  anchor.addEventListener('targetLost', () => { hud.classList.remove('found'); lostAt = Date.now(); });

  document.getElementById('close').addEventListener('click', () => {
    const sys = sceneEl.systems['mindar-image-system'];
    if (sys && started) { sys.stop(); started = false; }
    hud.classList.remove('on', 'found');
    intro.classList.remove('gone');
    shown = false;
  });

  /* ---------- 3D viewer on the home page: turn the object with a finger ---------- */
  (function viewer() {
    const hero = document.getElementById('hero');
    const canvas = document.getElementById('ball3d');
    const V = M.viewer || {};
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    const a = THREE.MathUtils.degToRad(V.angle ?? 50);
    camera.position.set(0, Math.sin(a) * 2.6, Math.cos(a) * 2.6);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(-1.2, 2.2, 1.6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(1.5, -0.5, -1); scene.add(rim);

    const pivot = new THREE.Group(); scene.add(pivot);

    function size() {
      const b = hero.getBoundingClientRect();
      renderer.setSize(b.width, b.height, false);
      camera.aspect = b.width / b.height; camera.updateProjectionMatrix();
    }
    size(); window.addEventListener('resize', size);

    new THREE.GLTFLoader().load(M.file, g => {
      const aniso = renderer.capabilities.getMaxAnisotropy();
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => {
          if (m.map) m.map.anisotropy = aniso;
          if (m.normalMap) { m.normalMap.anisotropy = aniso; m.normalScale.multiplyScalar(0.6); }
        });
      });
      const holder = new THREE.Group(); holder.add(g.scene);
      fitObject(g.scene, 1);
      const rr = M.rotation || {};
      holder.rotation.set(THREE.MathUtils.degToRad(rr.x || 0), THREE.MathUtils.degToRad(rr.y || 0), THREE.MathUtils.degToRad(rr.z || 0));
      pivot.add(holder);
      hero.classList.add('loaded'); canvas.classList.add('ready');
    }, undefined, e => { console.error('Model failed to load:', M.file, e); hero.classList.add('failed'); });

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dragging = false, lx = 0, ly = 0, vx = 0, vy = 0, lastTouch = 0;
    const axY = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
    const axSide = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camera.position).normalize();
    function turn(dx, dy) {
      q.setFromAxisAngle(axY, dx); pivot.quaternion.premultiply(q);
      q.setFromAxisAngle(axSide, dy); pivot.quaternion.premultiply(q);
    }
    canvas.addEventListener('pointerdown', e => {
      dragging = true; lx = e.clientX; ly = e.clientY; vx = vy = 0;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const k = 3.2 / canvas.clientWidth;
      const dx = (e.clientX - lx) * k, dy = (e.clientY - ly) * k;
      lx = e.clientX; ly = e.clientY;
      turn(dx, dy); vx = dx; vy = dy; lastTouch = performance.now();
    });
    const end = () => { dragging = false; lastTouch = performance.now(); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('keydown', e => {
      const s = 0.15, m = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
      if (m) { e.preventDefault(); turn(m[0], m[1]); lastTouch = performance.now(); }
    });

    let visible = true;
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
    function frame() {
      requestAnimationFrame(frame);
      if (!visible || intro.classList.contains('gone')) return;
      if (!dragging) {
        vx *= 0.94; vy *= 0.94;
        if (Math.abs(vx) + Math.abs(vy) > 0.0002) turn(vx, vy);
        else if (V.autoSpin !== false && !reduce && performance.now() - lastTouch > 2500) turn(0.0035, 0);
      }
      renderer.render(scene, camera);
    }
    frame();
  })();
})();
