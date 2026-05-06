(function(){
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const el = document.getElementById('hero-viz');
    if (el) el.remove();
    return;
  }

  const container = document.getElementById('hero-viz');
  if (!container) return;

  const root = getComputedStyle(document.documentElement);
  const ACCENT = (root.getPropertyValue('--accent').trim() || '#e85d3a');
  const FG_DIM = (root.getPropertyValue('--fg-2').trim() || '#7c8290');

  function hexToRgb(h) {
    const n = parseInt(h.replace('#',''), 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  }
  const ACCENT_RGB = hexToRgb(ACCENT);
  const FG_DIM_RGB = hexToRgb(FG_DIM);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nodeSpacing = 12;
  let W = 0, H = 0;
  let nodes = [];
  let pulses = [];
  let frameCount = 0;

  function buildNodes() {
    nodes = [];
    const cols = Math.max(8, Math.floor(W / nodeSpacing));
    const rows = Math.max(8, Math.floor(H / nodeSpacing));
    const xStep = W / cols;
    const yStep = H / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        nodes.push({ x: x * xStep + xStep/2, y: y * yStep + yStep/2, light: 0 });
      }
    }
  }

  function updateMask() {
    const hero = container.parentElement;
    const h1 = hero && hero.querySelector('h1');
    if (!hero || !h1) return;
    const containerTop = container.getBoundingClientRect().top;
    const h1Bottom = h1.getBoundingClientRect().bottom;
    const fadeStart = Math.max(0, h1Bottom - containerTop + 8);
    const fadeEnd = fadeStart + 50;
    const mask = `linear-gradient(to bottom, black ${fadeStart}px, transparent ${fadeEnd}px)`;
    container.style.maskImage = mask;
    container.style.webkitMaskImage = mask;
  }

  function resize() {
    W = container.clientWidth;
    H = container.clientHeight;
    if (W === 0 || H === 0) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    buildNodes();
    updateMask();
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateMask);
  }

  function frame() {
    frameCount++;
    if (frameCount % 40 === 0) {
      pulses.push({ x: Math.random() * W, y: Math.random() * H, r: 0 });
    }
    pulses = pulses.filter(p => p.r < Math.max(W, H) * 1.4);
    for (const p of pulses) p.r += 1.8;

    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      n.light *= 0.965;
      let hits = 0;
      for (const p of pulses) {
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (Math.abs(d - p.r) < 6) hits++;
      }
      if (hits > 0) n.light = Math.max(n.light, hits);
      const v = n.light;
      if (v > 0.04) {
        const alpha = Math.min(1, v * 0.4);
        const radius = 1.1 + Math.max(0, v - 1) * 0.75;
        if (v > 1.1) {
          const haloR = radius * 6;
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
          grad.addColorStop(0, `rgba(${ACCENT_RGB[0]},${ACCENT_RGB[1]},${ACCENT_RGB[2]},${(v - 1) * 0.18})`);
          grad.addColorStop(1, `rgba(${ACCENT_RGB[0]},${ACCENT_RGB[1]},${ACCENT_RGB[2]},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${ACCENT_RGB[0]},${ACCENT_RGB[1]},${ACCENT_RGB[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${FG_DIM_RGB[0]},${FG_DIM_RGB[1]},${FG_DIM_RGB[2]},0.06)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
})();
