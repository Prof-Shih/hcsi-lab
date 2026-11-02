// 全站小趣味（減少動態效果時全部關閉）：
// 1. 點站內連結：球棒在點擊處旁揮一棒，把球打到點擊位置，落點迸出波紋後才換頁（約半秒）。
// 2. 背景骨架：姿態估測的 17 個關節點組成小人，在背景慢跑、偶爾揮棒；透明度低、在內容後面，不影響閱讀。
import { drawBall } from './easter';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- 1. 打擊轉場 ----
function overlay() {
  const cv = document.createElement('canvas');
  cv.className = 'egg-canvas';
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  document.body.append(cv);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  return { cv, c };
}

function drawBat(c: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number) {
  c.save();
  c.translate(x, y); c.rotate(ang);
  // 握把在原點，棒身往 +x 延伸、越來越粗
  c.fillStyle = '#C08B5C'; c.strokeStyle = '#2B2B2B'; c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(0, -len * 0.018); c.lineTo(len * 0.45, -len * 0.026);
  c.quadraticCurveTo(len * 0.8, -len * 0.06, len, -len * 0.055);
  c.arc(len, 0, len * 0.055, -Math.PI / 2, Math.PI / 2);
  c.quadraticCurveTo(len * 0.8, len * 0.06, len * 0.45, len * 0.026);
  c.lineTo(0, len * 0.018); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#2B2B2B';
  c.beginPath(); c.arc(-len * 0.02, 0, len * 0.03, 0, Math.PI * 2); c.fill();
  c.restore();
}

function hitTo(tx: number, ty: number, done: () => void) {
  const { cv, c } = overlay();
  const W = innerWidth, H = innerHeight;
  // 打者站在點擊處的左下或右下（看哪邊空間大），球從棒頭飛向點擊處
  const side = tx > W / 2 ? -1 : 1;
  const len = Math.min(170, Math.max(110, W * 0.12));
  const px = Math.min(W - 20, Math.max(20, tx + side * len * 1.15)), py = Math.min(H - 20, ty + len * 0.9);
  const a0 = side > 0 ? Math.PI * 0.95 : Math.PI * 0.05, a1 = side > 0 ? Math.PI * 1.55 : -Math.PI * 0.55;
  const SWING = 170, FLY = 300, POP = 160, t0 = performance.now();
  let navigated = false;
  const go = () => { if (!navigated) { navigated = true; done(); } };
  setTimeout(go, SWING + FLY + POP + 200); // 保險：動畫卡住也會換頁
  const frame = (now: number) => {
    const t = now - t0;
    c.clearRect(0, 0, W, H);
    const k = Math.min(1, t / SWING);
    const ang = a0 + (a1 - a0) * (1 - (1 - k) * (1 - k));
    c.globalAlpha = t < SWING + FLY ? 1 : Math.max(0, 1 - (t - SWING - FLY) / POP);
    drawBat(c, px, py, ang, len);
    if (t >= SWING) {
      const f = Math.min(1, (t - SWING) / FLY);
      const sx = px + Math.cos(a1) * len, sy = py + Math.sin(a1) * len;
      const bx = sx + (tx - sx) * f, by = sy + (ty - sy) * f - Math.sin(f * Math.PI) * 60;
      if (f < 1) drawBall(c, bx, by, 11, t / 40, t / 55);
      else {
        const p = Math.min(1, (t - SWING - FLY) / POP);
        c.strokeStyle = `rgba(224,122,95,${1 - p})`; c.lineWidth = 3;
        c.beginPath(); c.arc(tx, ty, 10 + p * 34, 0, Math.PI * 2); c.stroke();
        drawBall(c, tx, ty, 11 * (1 - p * 0.4), 0, 0);
      }
    }
    if (t < SWING + FLY + POP) requestAnimationFrame(frame);
    else { go(); setTimeout(() => cv.remove(), 600); }
  };
  requestAnimationFrame(frame);
}

function mountHit() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest('a');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.protocol !== location.protocol) return;
    if (url.pathname === location.pathname && url.hash) return; // 同頁錨點照常捲動
    if (/\.(pdf|mp4|jpg|png)$/i.test(url.pathname)) return;
    e.preventDefault();
    hitTo(e.clientX, e.clientY, () => { location.href = url.href; });
  });
}

// ---- 2. 背景骨架 ----
// COCO 17 點的骨架連線
const BONES = [[5, 7], [7, 9], [6, 8], [8, 10], [5, 6], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [0, 5], [0, 6]];

function pose(t: number, swing: number) {
  // 以骨盆為原點、身高約 1 的側面跑步姿勢；swing>0 時混入揮棒動作
  const run = Math.sin(t), run2 = Math.sin(t + Math.PI);
  const p: number[][] = [];
  const hip = [0, 0], sh = [0.05, -0.42];
  p[0] = [sh[0] + 0.06, sh[1] - 0.17];
  p[1] = p[2] = p[3] = p[4] = p[0];
  p[5] = [sh[0] - 0.02, sh[1]]; p[6] = [sh[0] + 0.02, sh[1]];
  const arm = (s: number) => [[sh[0] + Math.sin(s) * 0.18, sh[1] + 0.2], [sh[0] + Math.sin(s) * 0.26 + 0.1, sh[1] + 0.3 - Math.cos(s) * 0.05]];
  let [e1, w1] = arm(run * 0.9), [e2, w2] = arm(run2 * 0.9);
  if (swing > 0) {
    // 揮棒：兩手一起從後上方掃到前方
    const s = -1.6 + swing * 3.2;
    e1 = e2 = [sh[0] + Math.cos(s) * 0.16, sh[1] + Math.sin(s) * 0.16 + 0.05];
    w1 = w2 = [sh[0] + Math.cos(s) * 0.3, sh[1] + Math.sin(s) * 0.3 + 0.05];
  }
  p[7] = e1; p[9] = w1; p[8] = e2; p[10] = w2;
  p[11] = [hip[0] - 0.02, hip[1]]; p[12] = [hip[0] + 0.02, hip[1]];
  const leg = (s: number) => [[Math.sin(s) * 0.2, 0.26 - Math.max(0, Math.cos(s)) * 0.04], [Math.sin(s) * 0.26 - (Math.cos(s) > 0 ? 0.12 : 0), 0.52 - Math.max(0, -Math.cos(s)) * 0.08]];
  const [k1, a1] = leg(swing > 0 ? 0.3 : run), [k2, a2] = leg(swing > 0 ? -0.4 : run2);
  p[13] = k1; p[15] = a1; p[14] = k2; p[16] = a2;
  return p;
}

function mountSkeletons() {
  const cv = document.createElement('canvas');
  cv.className = 'bones-canvas';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const c = cv.getContext('2d')!;
  let W = 0, H = 0;
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener('resize', size);
  const n = W < 768 ? 2 : 4;
  const people = Array.from({ length: n }, (_, i) => ({
    x: Math.random() * W, y: H * (0.25 + 0.6 * (i / Math.max(1, n - 1))),
    dir: i % 2 ? -1 : 1, speed: 0.5 + Math.random() * 0.5, h: 70 + Math.random() * 40,
    phase: Math.random() * 6, swingAt: 4000 + Math.random() * 9000,
  }));
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(50, now - last); last = now;
    c.clearRect(0, 0, W, H);
    for (const p of people) {
      p.swingAt -= dt;
      let swing = 0;
      if (p.swingAt < 0) {
        swing = Math.min(1, -p.swingAt / 700);
        if (p.swingAt < -1100) p.swingAt = 6000 + Math.random() * 10000;
      } else {
        p.x += p.dir * p.speed * dt * 0.06;
        p.phase += dt * 0.008 * p.speed;
      }
      if (p.x < -60) p.x = W + 40; if (p.x > W + 60) p.x = -40;
      const kp = pose(p.phase, swing).map(([x, y]) => [p.x + x * p.h * p.dir, p.y + y * p.h]);
      c.lineWidth = 2; c.lineCap = 'round';
      c.strokeStyle = 'rgba(91,123,111,.22)';
      for (const [a, b] of BONES) { c.beginPath(); c.moveTo(kp[a][0], kp[a][1]); c.lineTo(kp[b][0], kp[b][1]); c.stroke(); }
      for (const i of [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
        c.fillStyle = i === 0 ? 'rgba(224,122,95,.35)' : 'rgba(192,139,92,.32)';
        c.beginPath(); c.arc(kp[i][0], kp[i][1], i === 0 ? 5 : 3, 0, Math.PI * 2); c.fill();
      }
    }
    if (!document.hidden) requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); requestAnimationFrame(frame); } });
  requestAnimationFrame(frame);
}

export function mountFun() {
  if (reduce) return;
  mountHit();
  mountSkeletons();
}
