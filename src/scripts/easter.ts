// 彩蛋：在任何頁面打出「hcsi」，或在首頁連點大標「HCSI Lab.」的珊瑚色句點 3 下，
// 一顆 3D 棒球旋轉著投向螢幕，撞上後出現裂痕與「好球！」。
// 縫線是球面上的參數曲線（x=a·cos t+b·cos 3t、y=a·sin t−b·sin 3t、z=2√(ab)·sin 2t，a+b=1），每幀旋轉後投影。

const A = 0.7, B = 0.3, C = 2 * Math.sqrt(A * B);
const N = 160;
const seam = Array.from({ length: N }, (_, i) => {
  const t = (i / N) * Math.PI * 2;
  return [A * Math.cos(t) + B * Math.cos(3 * t), A * Math.sin(t) - B * Math.sin(3 * t), C * Math.sin(2 * t)];
});

function rotate([x, y, z]: number[], ax: number, ay: number) {
  const y1 = y * Math.cos(ax) - z * Math.sin(ax), z1 = y * Math.sin(ax) + z * Math.cos(ax);
  return [x * Math.cos(ay) + z1 * Math.sin(ay), y1, -x * Math.sin(ay) + z1 * Math.cos(ay)];
}

function drawBall(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, ax: number, ay: number) {
  const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.7, '#EFE9DD'); g.addColorStop(1, '#BFB5A3');
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  // 縫線：只畫面向鏡頭的一半（z > 0），兩側各一排短針腳
  const pts = seam.map((p) => rotate(p, ax, ay));
  c.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[(i + 1) % N];
    if (p[2] <= 0 || q[2] <= 0) continue;
    const px = cx + p[0] * r, py = cy + p[1] * r, qx = cx + q[0] * r, qy = cy + q[1] * r;
    const dx = qx - px, dy = qy - py, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, w = r * 0.07 * p[2];
    c.strokeStyle = `rgba(200,50,40,${0.35 + 0.65 * p[2]})`;
    c.lineWidth = Math.max(1, r * 0.022);
    c.beginPath(); c.moveTo(px, py); c.lineTo(qx, qy); c.stroke();
    if (i % 3 === 0) {
      c.beginPath();
      c.moveTo(px - nx * w + dx * 0.3, py - ny * w + dy * 0.3); c.lineTo(px + nx * w - dx * 0.3, py + ny * w - dy * 0.3);
      c.stroke();
    }
  }
}

function cracks(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, k: number) {
  c.strokeStyle = `rgba(43,43,43,${0.7 * k})`;
  c.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    let a = (i / 9) * Math.PI * 2 + 0.3, x = cx, y = cy;
    c.beginPath(); c.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      a += (Math.sin(i * 7 + s * 3) * 0.5);
      x += Math.cos(a) * r * 0.35; y += Math.sin(a) * r * 0.35;
      c.lineTo(x, y);
    }
    c.stroke();
  }
}

let running = false;
function pitch() {
  if (running) return;
  running = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toast = document.createElement('div');
  toast.className = 'egg-toast';
  toast.textContent = '好球！Strike! ⚾';
  if (reduce) {
    document.body.append(toast);
    setTimeout(() => { toast.remove(); running = false; }, 2000);
    return;
  }
  const cv = document.createElement('canvas');
  cv.className = 'egg-canvas';
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  document.body.append(cv);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.32;
  const t0 = performance.now(), FLY = 1100, HOLD = 1300;
  const frame = (now: number) => {
    const t = now - t0;
    c.clearRect(0, 0, W, H);
    if (t < FLY) {
      // 從遠方飛來：距離越近越大，路徑略帶下墜，持續旋轉
      const k = t / FLY, e = k * k * k;
      const r = R * (0.04 + 0.96 * e);
      drawBall(c, cx + (1 - e) * W * 0.18, cy - Math.sin(k * Math.PI) * H * 0.12 + (1 - e) * H * 0.08, r, t / 90, t / 140);
      requestAnimationFrame(frame);
    } else if (t < FLY + HOLD) {
      const k = 1 - (t - FLY) / HOLD;
      c.globalAlpha = k;
      drawBall(c, cx, cy, R, FLY / 90, FLY / 140);
      cracks(c, cx, cy, R, 1);
      c.globalAlpha = 1;
      if (!toast.isConnected) document.body.append(toast);
      requestAnimationFrame(frame);
    } else {
      cv.remove(); toast.remove(); running = false;
    }
  };
  requestAnimationFrame(frame);
}

export function mountEaster() {
  let typed = '';
  addEventListener('keydown', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select, [contenteditable="true"]') || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-4);
    if (typed === 'hcsi') pitch();
  });
  const dot = document.querySelector<HTMLElement>('.egg-dot');
  let clicks = 0, timer = 0;
  dot?.addEventListener('click', () => {
    clicks++;
    clearTimeout(timer);
    timer = window.setTimeout(() => { clicks = 0; }, 1200);
    if (clicks >= 3) { clicks = 0; pitch(); }
  });
}
