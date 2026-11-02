// 全站小趣味（減少動態效果時全部關閉）：
// 1. 點站內連結：球棒在點擊處旁揮一棒，把球打到點擊位置，落點迸出波紋後才換頁（約半秒）。
// 2. 背景骨架：姿態估測的 17 個關節點組成小人，各自不同外型、跳不同的舞；點一下就揮棒並顯示偵測框。透明度低、在內容後面，不影響閱讀。
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
// 每個小人外型、顏色、關節點形狀、舞步都不同；點一下他就拿起球棒揮擊，並顯示姿態偵測框與動作標籤。
// COCO 17 點：0 鼻、5/6 肩、7/8 肘、9/10 腕、11/12 髖、13/14 膝、15/16 踝
const BONES = [[5, 7], [7, 9], [6, 8], [8, 10], [5, 6], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [0, 5], [0, 6]];
type Pt = [number, number];
type Body = { arm: number; leg: number; torso: number };
// 從 origin 出發畫兩節肢體；角度以「垂直向下」為 0、往前（+x）為正
const limb = (o: Pt, a1: number, a2: number, l1: number, l2: number): [Pt, Pt] => {
  const e: Pt = [o[0] + Math.sin(a1) * l1, o[1] + Math.cos(a1) * l1];
  return [e, [e[0] + Math.sin(a1 + a2) * l2, e[1] + Math.cos(a1 + a2) * l2]];
};
type Angles = { lean?: number; dy?: number; hx?: number; ra: [number, number]; la: [number, number]; rl: [number, number]; ll: [number, number] };
function build(b: Body, g: Angles): Pt[] {
  const dy = g.dy ?? 0, hx = g.hx ?? 0;
  const hip: Pt = [hx, dy], sh: Pt = [hx + (g.lean ?? 0) * b.torso, dy - b.torso];
  const p: Pt[] = [];
  p[0] = [sh[0] + 0.04, sh[1] - 0.17];
  p[1] = p[2] = p[3] = p[4] = p[0];
  p[5] = [sh[0] - 0.07, sh[1]]; p[6] = [sh[0] + 0.07, sh[1]];
  [p[7], p[9]] = limb(p[5], g.la[0], g.la[1], 0.16 * b.arm, 0.15 * b.arm);
  [p[8], p[10]] = limb(p[6], g.ra[0], g.ra[1], 0.16 * b.arm, 0.15 * b.arm);
  p[11] = [hip[0] - 0.05, hip[1]]; p[12] = [hip[0] + 0.05, hip[1]];
  [p[13], p[15]] = limb(p[11], g.ll[0], g.ll[1], 0.25 * b.leg, 0.25 * b.leg);
  [p[14], p[16]] = limb(p[12], g.rl[0], g.rl[1], 0.25 * b.leg, 0.25 * b.leg);
  return p;
}
const S = Math.sin, PI = Math.PI;
const DANCES: Record<string, (t: number) => Angles> = {
  disco: (t) => { const up = S(t * 1.5) > 0; const b = Math.abs(S(t * 3)); return { hx: S(t * 1.5) * 0.05, dy: -b * 0.03, ra: [up ? PI * 0.85 : PI * 0.25, 0], la: [-0.5, 1.6], rl: [0.15, -0.1 - b * 0.3], ll: [-0.15, 0.1] }; },
  wave: (t) => ({ hx: S(t) * 0.04, ra: [PI * 0.85 + S(t * 3) * 0.35, S(t * 3) * 0.4], la: [-PI * 0.85 + S(t * 3 + 1) * 0.35, S(t * 3 + 1) * 0.4], rl: [0.12, 0], ll: [-0.12, 0] }),
  jump: (t) => { const h = Math.max(0, S(t * 2.2)); return { dy: -h * 0.22, ra: [PI * (0.3 + 0.55 * h), 0.2], la: [-PI * (0.3 + 0.55 * h), -0.2], rl: [0.2 + h * 0.6, -h * 1.4], ll: [-0.2 + h * 0.6, -h * 1.4] }; },
  twist: (t) => { const s = S(t * 2.4); return { hx: s * 0.06, lean: -s * 0.15, ra: [1.4, 1.3 + s * 0.4], la: [-1.4, -1.3 + s * 0.4], rl: [0.15 + s * 0.12, -0.25 - s * 0.15], ll: [-0.15 + s * 0.12, -0.25 + s * 0.15] }; },
  robot: (t) => { const k = Math.floor(t * 1.3) % 4; const A = [[PI / 2, -PI / 2], [PI / 2, PI / 2], [0, PI / 2], [PI / 2, 0]][k]; return { ra: [A[0], A[1]], la: [-A[1], -A[0]], rl: [k % 2 ? 0.3 : 0, 0], ll: [k % 2 ? 0 : -0.3, 0] }; },
};
// 揮棒（側視）：雙手從後肩上方預備（0–0.45 秒）→ 胸前水平擊球（0.45–0.7）→ 收到前肩上方；手肘由肩與手的位置推算
function batting(b: Body, s: number): { kp: Pt[]; bat: number } {
  const ease = (x: number) => 1 - (1 - x) * (1 - x);
  const u = ease(s < 0.45 ? 0 : Math.min(1, (s - 0.45) / 0.25)), f = ease(s > 0.7 ? Math.min(1, (s - 0.7) / 0.4) : 0);
  const kp = build(b, { lean: 0.08 - u * 0.2, hx: -0.04 + u * 0.08, ra: [0, 0], la: [0, 0], rl: [0.35 - u * 0.25, -0.15], ll: [-0.32 + u * 0.12, 0.1 + u * 0.15] });
  const lerp = (a: Pt, c: Pt, t: number): Pt => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
  const top = kp[5][1];
  const hand = lerp(lerp([-0.14, top - 0.16], [0.3, top + 0.08], u), [0.04, top - 0.16], f);
  for (const [sh, el, wr] of [[5, 7, 9], [6, 8, 10]] as const) {
    const S0 = kp[sh], m: Pt = [(S0[0] + hand[0]) / 2, (S0[1] + hand[1]) / 2 + 0.06 * b.arm];
    kp[el] = m; kp[wr] = [hand[0] + (sh === 5 ? -0.015 : 0.015), hand[1]];
  }
  return { kp, bat: -2.7 + u * 4.27 + f * 2.6 };
}

type Shape = 'circle' | 'square' | 'diamond';
type Person = {
  x: number; y: number; h: number; dir: number; speed: number; dance: string;
  body: Body; shape: Shape; bone: string; joint: string;
  t: number; batT: number; conf: string; kp: Pt[];
  ball?: { x: number; y: number; vx: number; vy: number; t: number };
};
const LOOKS: { body: Body; shape: Shape; bone: string; joint: string }[] = [
  { body: { arm: 1, leg: 1, torso: 0.45 }, shape: 'circle', bone: '91,123,111', joint: '224,122,95' },
  { body: { arm: 1.15, leg: 0.9, torso: 0.42 }, shape: 'square', bone: '160,112,63', joint: '91,123,111' },
  { body: { arm: 0.9, leg: 1.15, torso: 0.48 }, shape: 'diamond', bone: '62,74,90', joint: '224,179,65' },
  { body: { arm: 1.05, leg: 1.05, torso: 0.4 }, shape: 'circle', bone: '138,62,42', joint: '192,139,92' },
  { body: { arm: 0.95, leg: 0.95, torso: 0.5 }, shape: 'square', bone: '74,104,93', joint: '210,70,58' },
];

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
  const names = Object.keys(DANCES);
  const n = W < 768 ? 3 : 5;
  const people: Person[] = Array.from({ length: n }, (_, i) => ({
    ...LOOKS[i % LOOKS.length],
    x: (W / n) * (i + 0.5), y: H * (0.3 + 0.55 * (((i * 37) % 10) / 10)),
    dir: i % 2 ? -1 : 1, speed: 0.15 + (i % 3) * 0.1, h: 80 + ((i * 13) % 4) * 14,
    dance: names[i % names.length], t: i * 1.7, batT: -1, conf: '', kp: [],
  }));

  // 點小人：拿球棒揮擊並顯示偵測框（點到連結、按鈕、輸入框或正在選字時不觸發）
  document.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('a, button, input, textarea, select, label, [role="button"], .chat, .carousel') || !getSelection()?.isCollapsed) return;
    for (const p of people) {
      if (!p.kp.length || p.batT >= 0) continue;
      const xs = p.kp.map((q) => q[0]), ys = p.kp.map((q) => q[1]);
      if (e.clientX > Math.min(...xs) - 18 && e.clientX < Math.max(...xs) + 18 && e.clientY > Math.min(...ys) - 18 && e.clientY < Math.max(...ys) + 18) {
        p.batT = 0; p.conf = (0.9 + Math.random() * 0.09).toFixed(2); p.ball = undefined;
        break;
      }
    }
  });

  const dot = (x: number, y: number, r: number, shape: Shape) => {
    c.beginPath();
    if (shape === 'circle') c.arc(x, y, r, 0, PI * 2);
    else if (shape === 'square') c.rect(x - r, y - r, r * 2, r * 2);
    else { c.moveTo(x, y - r * 1.3); c.lineTo(x + r * 1.3, y); c.lineTo(x, y + r * 1.3); c.lineTo(x - r * 1.3, y); c.closePath(); }
    c.fill();
  };

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(50, now - last) / 1000; last = now;
    c.clearRect(0, 0, W, H);
    for (const p of people) {
      let local: Pt[], bat: number | null = null;
      if (p.batT >= 0) {
        p.batT += dt;
        const r = batting(p.body, Math.min(1.3, p.batT));
        local = r.kp; bat = r.bat;
        if (p.batT > 0.58 && !p.ball) p.ball = { x: NaN, y: NaN, vx: p.dir * (420 + Math.random() * 200), vy: -260 - Math.random() * 160, t: 0 };
        if (p.batT > 2.2) { p.batT = -1; p.ball = undefined; }
      } else {
        p.t += dt;
        p.x += p.dir * p.speed * 30 * dt;
        if (p.x < -60) p.x = W + 50;
        if (p.x > W + 60) p.x = -50;
        local = build(p.body, DANCES[p.dance](p.t));
      }
      p.kp = local.map(([x, y]) => [p.x + x * p.h * p.dir, p.y + y * p.h] as Pt);
      const on = p.batT >= 0;
      c.lineWidth = on ? 3 : 2; c.lineCap = 'round';
      c.strokeStyle = `rgba(${p.bone},${on ? 0.85 : 0.24})`;
      for (const [a, b] of BONES) { c.beginPath(); c.moveTo(p.kp[a][0], p.kp[a][1]); c.lineTo(p.kp[b][0], p.kp[b][1]); c.stroke(); }
      if (bat !== null) {
        // 球棒：從右手腕往外延伸
        const w = p.kp[10], L = p.h * 0.42;
        c.strokeStyle = 'rgba(192,139,92,.95)'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(w[0] + Math.sin(bat) * L * p.dir, w[1] + Math.cos(bat) * L); c.stroke();
      }
      for (let i = 0; i < 17; i++) {
        if (i >= 1 && i <= 4) continue;
        c.fillStyle = `rgba(${i === 0 ? '224,122,95' : p.joint},${on ? 0.95 : 0.34})`;
        dot(p.kp[i][0], p.kp[i][1], i === 0 ? 5.5 : on ? 4 : 3, p.shape);
      }
      if (p.ball) {
        const b = p.ball;
        if (Number.isNaN(b.x)) { b.x = p.kp[10][0]; b.y = p.kp[10][1]; }
        b.t += dt; b.x += b.vx * dt; b.vy += 500 * dt; b.y += b.vy * dt;
        drawBall(c, b.x, b.y, 7, b.t * 20, b.t * 14);
      }
      if (on) {
        // 姿態偵測框與動作標籤
        const xs = p.kp.map((q) => q[0]), ys = p.kp.map((q) => q[1]);
        const x0 = Math.min(...xs) - 10, y0 = Math.min(...ys) - 14, x1 = Math.max(...xs) + 10, y1 = Math.max(...ys) + 8;
        c.setLineDash([6, 4]); c.strokeStyle = 'rgba(224,122,95,.9)'; c.lineWidth = 1.5;
        c.strokeRect(x0, y0, x1 - x0, y1 - y0); c.setLineDash([]);
        const label = `${p.batT < 0.45 ? 'stance' : p.batT < 0.75 ? 'batting' : 'follow-through'} ${p.conf}`;
        c.font = '600 12px Inter, sans-serif';
        const tw = c.measureText(label).width + 12;
        c.fillStyle = 'rgba(224,122,95,.95)'; c.fillRect(x0, y0 - 20, tw, 18);
        c.fillStyle = '#fff'; c.fillText(label, x0 + 6, y0 - 7);
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
