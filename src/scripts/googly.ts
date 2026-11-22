// 成員頁「眼睛跟著游標轉」：滑鼠進到成員區時，在每張頭貼的眼睛位置疊上一對卡通眼睛，眼珠跟著游標轉。
// 眼睛位置用 MediaPipe Face Landmarker 在瀏覽器內偵測（和 facecam.ts 同一套），照片不會上傳。
// 只在有滑鼠的裝置、沒開「減少動態效果」時啟用；第一次滑進成員區才下載模型，不影響頁面載入。
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
// 特徵點：兩眼的內外眼角、虹膜中心（478 點模型）
const EYE_PTS = [[33, 133, 468], [362, 263, 473]];

type Eye = { el: HTMLElement; pupil: HTMLElement; r: number };

export function mountGoogly(areaSel: string, imgSel: string) {
  if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const area = document.querySelector<HTMLElement>(areaSel);
  if (!area) return;
  const eyes: Eye[] = [];
  let started = false;

  const start = async () => {
    if (started) return;
    started = true;
    try {
      const { FilesetResolver, FaceLandmarker } = await import(/* @vite-ignore */ `${MP}/vision_bundle.mjs`);
      const fileset = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
      const lm = await FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL }, runningMode: 'IMAGE', numFaces: 1 });
      for (const img of area.querySelectorAll<HTMLImageElement>(imgSel)) {
        if (!img.complete) await new Promise((r) => img.addEventListener('load', r, { once: true }));
        const pts = lm.detect(img).faceLandmarks?.[0];
        if (pts) place(img, pts);
      }
      lm.close();
    } catch (e) {
      console.warn('[googly] 眼睛偵測載入失敗', e);
    }
  };

  // 依 object-fit: cover 的裁切，把照片上的特徵點換算成頭貼框內的百分比位置
  const place = (img: HTMLImageElement, pts: { x: number; y: number }[]) => {
    const box = img.parentElement!;
    const W = img.clientWidth, H = img.clientHeight, nw = img.naturalWidth, nh = img.naturalHeight;
    const s = Math.max(W / nw, H / nh), ox = (W - nw * s) / 2, oy = (H - nh * s) / 2;
    const P = (i: number) => ({ x: (pts[i].x * nw * s + ox) / W, y: (pts[i].y * nh * s + oy) / H });
    const wrap = document.createElement('span');
    wrap.className = 'googly';
    wrap.setAttribute('aria-hidden', 'true');
    for (const [a, b] of EYE_PTS) {
      const p = P(a), q = P(b);
      const w = Math.hypot((p.x - q.x) * W, (p.y - q.y) * H);
      const r = Math.max(7, w * 0.62);
      const el = document.createElement('i');
      el.style.cssText = `left:${((p.x + q.x) / 2) * 100}%;top:${((p.y + q.y) / 2) * 100}%;width:${r * 2}px;height:${r * 2}px`;
      const pupil = document.createElement('b');
      el.append(pupil);
      wrap.append(el);
      eyes.push({ el, pupil, r });
    }
    box.append(wrap);
  };

  let raf = 0, mx = 0, my = 0;
  const look = () => {
    raf = 0;
    for (const { el, pupil, r } of eyes) {
      const b = el.getBoundingClientRect();
      const dx = mx - (b.left + b.width / 2), dy = my - (b.top + b.height / 2);
      const d = Math.hypot(dx, dy) || 1, m = Math.min(d / 6, r * 0.45);
      pupil.style.transform = `translate(${(dx / d) * m}px, ${(dy / d) * m}px)`;
    }
  };
  area.addEventListener('pointerenter', () => { start(); area.classList.add('googly-on'); });
  area.addEventListener('pointerleave', () => area.classList.remove('googly-on'));
  area.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(look); });
}
