// 拉拉看自動拍照：像銀行開戶驗證一樣，用前鏡頭即時偵測臉，逐步提示姿勢與表情，
// 全部合格且穩定後自動拍照，並依眼睛、嘴角位置把照片對準拉拉看構圖（lala.ts 的 EYES／MOUTH）。
// 偵測在瀏覽器內執行（MediaPipe Face Landmarker），影像不會上傳到任何伺服器。
import { T, EYES, MOUTH } from './lala';

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// 特徵點編號（478 點模型）：虹膜中心、嘴角、鼻尖
const IRIS = [468, 473];
const MOUTH_CORNERS = [61, 291];
const NOSE = 1;

// 合格門檻
const LIMIT = {
  roll: 6,          // 頭歪的角度（度）
  yaw: 0.10,        // 鼻尖偏離兩眼中線／眼距
  pitchMin: 0.42,   // （鼻尖−眼）／（嘴−眼）的高度比例：太小＝抬頭、太大＝低頭
  pitchMax: 0.72,
  minEye: 90,       // 原始影像中的眼距（像素），太小代表太遠、照片會糊
  blink: 0.35,      // 眨眼程度
  smile: 0.3,       // 微笑程度
  jaw: 0.12,        // 張嘴程度
  hold: 15,         // 連續合格幾幀才拍
};

type Pt = { x: number; y: number };
export type Cue = { ok: boolean; text: string; progress: number };

// 最小平方相似轉換（縮放＋旋轉＋平移），把 src 點對到 dst 點；回傳 canvas setTransform 參數
function similarity(src: Pt[], dst: Pt[]) {
  const n = src.length;
  const ms = { x: src.reduce((a, p) => a + p.x, 0) / n, y: src.reduce((a, p) => a + p.y, 0) / n };
  const md = { x: dst.reduce((a, p) => a + p.x, 0) / n, y: dst.reduce((a, p) => a + p.y, 0) / n };
  let a = 0, b = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const sx = src[i].x - ms.x, sy = src[i].y - ms.y, dx = dst[i].x - md.x, dy = dst[i].y - md.y;
    a += sx * dx + sy * dy; b += sx * dy - sy * dx; den += sx * sx + sy * sy;
  }
  const c = a / den, s = b / den;
  return [c, s, -s, c, md.x - (c * ms.x - s * ms.y), md.y - (s * ms.x + c * ms.y)] as const;
}

const byX = (p: Pt[]) => [...p].sort((m, n) => m.x - n.x);
const TARGET: Pt[] = [...byX(EYES.map(([x, y]) => ({ x, y }))), ...byX(MOUTH.map(([x, y]) => ({ x, y })))];

// 依特徵點判斷要給使用者的下一個提示（一次只講一件事）
function judge(lm: Pt[], shapes: Record<string, number>, w: number, h: number): string | null {
  const P = (i: number) => ({ x: lm[i].x * w, y: lm[i].y * h });
  const [e1, e2] = byX(IRIS.map(P));
  const [m1, m2] = byX(MOUTH_CORNERS.map(P));
  const nose = P(NOSE);
  const eye = Math.hypot(e2.x - e1.x, e2.y - e1.y);
  const em = { x: (e1.x + e2.x) / 2, y: (e1.y + e2.y) / 2 };
  const mm = { x: (m1.x + m2.x) / 2, y: (m1.y + m2.y) / 2 };
  const roll = Math.atan2(e2.y - e1.y, e2.x - e1.x) * 180 / Math.PI;
  const yaw = (nose.x - em.x) / eye;
  const pitch = (nose.y - em.y) / (mm.y - em.y);

  if (eye < LIMIT.minEye) return '再靠近一點';
  // 裁切範圍要在畫面內：用眼距估算頭的範圍
  const cx = (em.x + mm.x) / 2, cy = (em.y + mm.y) / 2, half = eye * (T / 2) / (EYES[1][0] - EYES[0][0]);
  if (cx - half < 0 || cx + half > w || cy - half * 1.1 < 0 || cy + half * 0.9 > h) return eye > w * 0.3 ? '遠一點，讓整個頭在畫面裡' : '把臉移到畫面中間';
  if (Math.abs(yaw) > LIMIT.yaw) return '臉轉正，直視鏡頭';
  if (pitch < LIMIT.pitchMin) return '下巴往下收一點';
  if (pitch > LIMIT.pitchMax) return '下巴抬高一點';
  if (Math.abs(roll) > LIMIT.roll) return '頭擺正，不要歪';
  if ((shapes.eyeBlinkLeft ?? 0) > LIMIT.blink || (shapes.eyeBlinkRight ?? 0) > LIMIT.blink) return '眼睛睜開';
  if ((shapes.jawOpen ?? 0) > LIMIT.jaw) return '嘴巴閉起來';
  if ((shapes.mouthSmileLeft ?? 0) > LIMIT.smile || (shapes.mouthSmileRight ?? 0) > LIMIT.smile) return '先不要笑，放鬆表情';
  return null;
}

export async function startFaceCam(video: HTMLVideoElement, onCue: (c: Cue) => void, onShot: (photo: HTMLCanvasElement) => void) {
  onCue({ ok: false, text: '載入人臉偵測中…', progress: 0 });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
  let marker;
  try {
    video.srcObject = stream;
    await video.play();
    const { FilesetResolver, FaceLandmarker } = await import(/* @vite-ignore */ `${MP}/vision_bundle.mjs`);
    const fileset = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
    const make = (delegate: 'GPU' | 'CPU') => FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numFaces: 2, outputFaceBlendshapes: true,
    });
    marker = await make('GPU').catch(() => make('CPU'));
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    throw err;
  }

  let held = 0, stopped = false, last = -1;
  const stop = () => { stopped = true; stream.getTracks().forEach((t) => t.stop()); marker.close(); };

  const tick = () => {
    if (stopped) return;
    if (video.currentTime !== last && video.videoWidth) {
      last = video.currentTime;
      const w = video.videoWidth, h = video.videoHeight;
      const res = marker.detectForVideo(video, performance.now());
      const faces: Pt[][] = res.faceLandmarks ?? [];
      let msg: string | null;
      if (faces.length === 0) msg = '看不到臉，請正對鏡頭';
      else if (faces.length > 1) msg = '畫面裡只能有一個人';
      else {
        const shapes: Record<string, number> = {};
        for (const c of res.faceBlendshapes?.[0]?.categories ?? []) shapes[c.categoryName] = c.score;
        msg = judge(faces[0], shapes, w, h);
      }
      held = msg ? 0 : held + 1;
      onCue({ ok: !msg, text: msg ?? '很好，保持不動…', progress: held / LIMIT.hold });
      if (held >= LIMIT.hold) {
        // 拍照：把這一幀依眼睛、嘴角對到拉拉看構圖
        const lm = faces[0];
        const P = (i: number) => ({ x: lm[i].x * w, y: lm[i].y * h });
        const src = [...byX(IRIS.map(P)), ...byX(MOUTH_CORNERS.map(P))];
        const out = document.createElement('canvas');
        out.width = out.height = T;
        const c = out.getContext('2d')!;
        c.fillStyle = '#fff'; c.fillRect(0, 0, T, T);
        c.setTransform(...similarity(src, TARGET));
        c.drawImage(video, 0, 0, w, h);
        stop();
        onCue({ ok: true, text: '拍好了！', progress: 1 });
        onShot(out);
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return stop;
}
