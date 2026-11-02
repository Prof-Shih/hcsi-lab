// 拉拉看頭像：按住頭像往外拉，放手會彈回；靜止時會眨眼、微笑。
// 用法：在圓形頭像元素加 data-lala="<照片網址>"，再呼叫 mountLala()。
// 照片必須依 public/lala-photo-guide.svg 的構圖拍攝（正方形、雙眼與嘴角對準參考點），
// 下面的眨眼／微笑位移是依那個構圖算的。

// 參考構圖（以 640×640 為基準）
export const T = 640;
export const EYES = [[215, 290], [425, 290]];
export const MOUTH = [[262, 500, -1], [378, 500, 1]];
const N = 40;
const NV = (N + 1) * (N + 1);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 預先算好眨眼（bD）與微笑（sD）的位移場，所有頭像共用
const bD = new Float32Array(NV * 2);
const sD = new Float32Array(NV * 2);
const uvs = new Float32Array(NV * 2);
const g = (d: number, s: number) => Math.exp(-d * d / (2 * s * s));
for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
  const k = (j * (N + 1) + i) * 2, u = i / N * T, v = j / N * T;
  uvs[k] = i / N; uvs[k + 1] = j / N;
  for (const [ex, ey] of EYES) { const f = Math.min(1, 1.35 * g(u - ex, 30) * g(v - (ey + 4), 22)); bD[k + 1] += ((ey + 14) - v) * f; }
  for (const [mx, my, sd] of MOUTH) { const w = g(Math.hypot(u - mx, v - my), 30); sD[k] += sd * 9 * w; sD[k + 1] -= 24 * w; }
  for (const [ex, ey] of EYES) { const w = g(u - ex, 40) * g(v - (ey + 45), 22); sD[k + 1] -= 11 * w; }
}
const idx = new Uint16Array(N * N * 6);
for (let j = 0, q = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
  idx.set([a, b, c, b, d, c], q); q += 6;
}

const VS = `attribute vec2 p;attribute vec2 uv;uniform float S;varying vec2 v;
void main(){v=uv;gl_Position=vec4(p.x/S*2.-1.,1.-p.y/S*2.,0.,1.);}`;
const FS = `precision mediump float;varying vec2 v;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,v);}`;

// 把照片裁成圓形貼圖（圓外透明），四周留白讓拉長時不會被裁掉
function circleTexture(img: HTMLImageElement, px: number) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const x = c.getContext('2d')!;
  x.beginPath(); x.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2); x.clip();
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, px, px);
  return c;
}

function mount(el: HTMLElement, img: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'lala-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) return; // 不支援 WebGL：保留原本的靜態照片
  el.appendChild(canvas);
  el.classList.add('lala-on');

  const sh = (t: number, s: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  const uvBuf = gl.createBuffer(), posBuf = gl.createBuffer(), iBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  const aUV = gl.getAttribLocation(prog, 'uv'); gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(aP);
  const uS = gl.getUniformLocation(prog, 'S');
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // 畫布是頭像的 3 倍大，頭像在正中間（CSS 負責定位）
  let R = 0, C = 0, S = 0;
  const rest = new Float32Array(NV * 2), pos = new Float32Array(NV * 2), vel = new Float32Array(NV * 2), draw = new Float32Array(NV * 2);
  const tex = gl.createTexture();
  const layout = () => {
    R = el.offsetWidth / 2; S = R * 6; C = S / 2;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.height = Math.round(S * dpr);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const k = (j * (N + 1) + i) * 2;
      rest[k] = pos[k] = C - R + 2 * R * i / N; rest[k + 1] = pos[k + 1] = C - R + 2 * R * j / N;
      vel[k] = vel[k + 1] = 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, circleTexture(img, Math.min(512, Math.round(2 * R * dpr * 1.5))));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  // 拖曳：座標換算成畫布座標
  let drag: { id: number; gx: number; gy: number; sx: number; sy: number; dx: number; dy: number; moved: number } | null = null;
  const local = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left - R + C, e.clientY - r.top - R + C]; };
  el.addEventListener('pointerdown', (e) => {
    if (drag || e.button > 0) return;
    const [x, y] = local(e);
    if (Math.hypot(x - C, y - C) > R * 1.05) return;
    el.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, gx: x, gy: y, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, moved: 0 };
    wake();
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    let dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    const L = Math.hypot(dx, dy), max = R * 1.7;
    if (L > max) { dx *= max / L; dy *= max / L; }
    drag.dx = dx; drag.dy = dy; drag.moved = Math.max(drag.moved, L);
  });
  const end = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved < 6) { // 輕點：啵一下（點擊事件照常觸發，例如打開介紹）
      const s = R * 0.5;
      for (let v = 0; v < NV; v++) {
        const k = v * 2, ex = rest[k] - drag.gx, ey = rest[k + 1] - drag.gy, d2 = ex * ex + ey * ey, w = Math.exp(-d2 / (2 * s * s)), d = Math.sqrt(d2) || 1;
        const rx = rest[k] - C, ry = rest[k + 1] - C, rr = Math.hypot(rx, ry) || 1;
        const edge = Math.min(1, Math.max(0, (rr - R * 0.7) / (R * 0.3))), out = Math.max(0, (ex * rx + ey * ry) / (d * rr));
        const f = w * ((1 - edge) + edge * out); vel[k] += ex / d * f * 9; vel[k + 1] += ey / d * f * 9;
      }
    } else { // 拉過就不要觸發點擊
      el.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopImmediatePropagation(); }, { capture: true, once: true });
    }
    drag = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  const step = () => {
    const sig = R * 0.36, inv = 1 / (2 * sig * sig);
    const k = drag ? 0.3 : (reduce ? 0.3 : 0.09), damp = drag ? 0.62 : (reduce ? 0.5 : 0.86);
    let energy = 0;
    for (let v = 0; v < NV; v++) {
      const i = v * 2; let tx = rest[i], ty = rest[i + 1];
      const rx = rest[i] - C, ry = rest[i + 1] - C, rr = Math.hypot(rx, ry) || 1, ux = rx / rr, uy = ry / rr;
      const edge = Math.min(1, Math.max(0, (rr - R * 0.7) / (R * 0.3)));
      if (drag) {
        const ex = rest[i] - drag.gx, ey = rest[i + 1] - drag.gy; let w = Math.exp(-(ex * ex + ey * ey) * inv);
        const dl = Math.hypot(drag.dx, drag.dy) || 1, out = Math.max(0, (drag.dx * ux + drag.dy * uy) / dl);
        w *= (1 - edge) + edge * out; tx += drag.dx * w; ty += drag.dy * w;
      }
      vel[i] = (vel[i] + (tx - pos[i]) * k) * damp; vel[i + 1] = (vel[i + 1] + (ty - pos[i + 1]) * k) * damp;
      pos[i] += vel[i]; pos[i + 1] += vel[i + 1];
      // 輪廓只往外撐、不往內凹
      if (rr > R * 0.85) {
        const pr = (pos[i] - C) * ux + (pos[i + 1] - C) * uy;
        if (pr < rr) { pos[i] += (rr - pr) * ux; pos[i + 1] += (rr - pr) * uy; const vr = vel[i] * ux + vel[i + 1] * uy; if (vr < 0) { vel[i] -= vr * ux; vel[i + 1] -= vr * uy; } }
      }
      energy += Math.abs(vel[i]) + Math.abs(vel[i + 1]);
    }
    return energy;
  };

  // 自動表情：隨機眨眼、偶爾微笑（每個頭像錯開時間）
  let blinkAt = 800 + Math.random() * 2400, smileAt = 2000 + Math.random() * 5000, smileEnd = 0, idle = 1;
  const ease = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const expr = (t: number) => {
    if (reduce) return [0, 0];
    if (t > blinkAt + 200) { blinkAt = t + 1800 + Math.random() * 3200; if (Math.random() < .2) blinkAt = t + 260; }
    let b = 0; const bt = t - blinkAt; if (bt > 0 && bt < 200) b = Math.sin(bt / 200 * Math.PI);
    if (t > smileAt && !smileEnd) smileEnd = smileAt + 300 + 1200 + Math.random() * 900;
    let sm = 0;
    if (smileEnd) {
      sm = t < smileAt + 300 ? ease((t - smileAt) / 300) : t < smileEnd ? 1 : ease(1 - (t - smileEnd) / 400);
      if (t > smileEnd + 400) { smileEnd = 0; sm = 0; smileAt = t + 3500 + Math.random() * 3500; }
    }
    return [Math.min(1, b + sm * .3), sm];
  };

  let visible = true, raf = 0;
  const frame = (t: number) => {
    raf = 0;
    step();
    idle += ((drag ? 0 : 1) - idle) * (drag ? .35 : .04);
    const [b, sm] = expr(t), sc = 2 * R / T * idle;
    for (let v = 0; v < NV * 2; v++) draw[v] = pos[v] + sc * (b * bD[v] + sm * sD[v]);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uS, S);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, draw, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    if (visible || drag) wake();
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

  // 不在畫面上時暫停，省電
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }).observe(el);
  new ResizeObserver(() => { layout(); wake(); }).observe(el);
  layout();
  wake();
}

export function mountLala(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-lala]').forEach((el) => {
    const img = new Image();
    img.onload = () => mount(el, img);
    img.src = el.dataset.lala!;
  });
}
