export function showXPToast(amount: number) {
  if (!document.getElementById("xp-toast-style")) {
    const style = document.createElement("style");
    style.id = "xp-toast-style";
    style.textContent = `
      @keyframes xpIn {
        0%   { transform: translateX(130%) scale(0.8); opacity: 0; }
        18%  { transform: translateX(-6px) scale(1.08); opacity: 1; }
        25%  { transform: translateX(0) scale(1); }
        75%  { transform: translateX(0) scale(1); opacity: 1; }
        100% { transform: translateX(130%) scale(0.9); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed; top:72px; right:24px; z-index:10000;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    color:#fff; font-family:system-ui,-apple-system,sans-serif;
    font-size:17px; font-weight:800; letter-spacing:-0.2px;
    padding:11px 22px; border-radius:999px;
    box-shadow:0 4px 28px rgba(99,102,241,0.55);
    pointer-events:none; display:flex; align-items:center; gap:8px;
    animation:xpIn 2.8s cubic-bezier(0.34,1.56,0.64,1) forwards;
  `;
  toast.innerHTML = `<span style="font-size:19px">⚡</span>+${amount} XP`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2850);
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
}

const COLORS = ["#2EC866","#6366F1","#F59E0B","#EF4444","#38bdf8","#a78bfa","#fb7185","#fbbf24"];

export function fireConfetti(count = 120) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const fromLeft = i < count / 2;
    const spreadDeg = Math.random() * 55 + 25;          // 25–80° arc
    const rad = (spreadDeg * Math.PI) / 180;
    const speed = Math.random() * 13 + 9;

    particles.push({
      x: fromLeft ? 0 : canvas.width,
      y: canvas.height,
      vx:  Math.cos(rad) * speed * (fromLeft ? 1 : -1),
      vy: -Math.sin(rad) * speed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 9 + 5,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 14,
      opacity: 1,
    });
  }

  let frame = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    let alive = false;

    for (const p of particles) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.38;          // gravity
      p.vx *= 0.99;          // drag
      p.rotation += p.rotSpeed;
      if (frame > 55) p.opacity = Math.max(0, p.opacity - 0.018);
      if (p.opacity > 0) alive = true;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size * 0.28, p.size, p.size * 0.56);
      ctx.restore();
    }

    if (alive) requestAnimationFrame(tick);
    else canvas.remove();
  }

  requestAnimationFrame(tick);
}
