import fs from 'node:fs';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { z } from 'astro/zod';
import { MEMBER_ROLES } from './content.config';
import undergrad from './data/undergrad-projects.json';

export type Member = CollectionEntry<'members'>;
export type Pub = CollectionEntry<'publications'>['data'];
export type Topic = CollectionEntry<'research'>;
export type Project = (typeof undergrad)[number];

// ---- 讀取內容（排序在這裡統一處理，collection 本身不保證順序） ----
export async function getSite() {
  const s = await getEntry('settings', 'site');
  if (!s) throw new Error('缺少 src/content/settings/site.yml');
  return s.data;
}

// 手機上傳頁（/lala/）收到的照片：拉拉看在 public/lala/<成員檔名>.jpg，一般頭像在 public/avatars/<成員檔名>.jpg。
// 成員檔沒自己設定時才自動套用；不想用就刪掉照片。
export const lalaUploaded = (id: string) => fs.existsSync(`public/lala/${id}.jpg`);
export const avatarUploaded = (id: string) => fs.existsSync(`public/avatars/${id}.jpg`);

// 手機「我的資料」頁（/me/）送出的個人資料：src/data/profiles/<成員檔名>/<時間>.json，取檔名最新的一份覆蓋成員檔欄位。
// 這些檔案從 GitHub 網頁直接 commit、不經 pre-push 建置檢查，所以格式不符時只警告並略過，不讓建置失敗。
const profileSchema = z.object({
  name_en: z.string(),
  role: z.enum(MEMBER_ROLES),
  enroll_year: z.number().int(),
  email: z.string(),
  edu: z.string(),
  topic: z.string(),
  interests: z.array(z.string()),
  instagram: z.string(),
  website: z.string(),
}).partial().strict();
const profileFiles = import.meta.glob<unknown>('./data/profiles/*/*.json', { eager: true, import: 'default' });
let profileCache: Record<string, z.infer<typeof profileSchema>> | undefined;
export const latestProfiles = () => {
  if (profileCache) return profileCache;
  const out: Record<string, z.infer<typeof profileSchema>> = (profileCache = {});
  for (const file of Object.keys(profileFiles).sort()) {
    const id = file.split('/').at(-2)!;
    const r = profileSchema.safeParse(profileFiles[file]);
    if (r.success) out[id] = r.data;
    else console.warn(`[profiles] 略過 src/${file.slice(2)}：${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('；')}`);
  }
  return out;
};

export async function getMembers() {
  const profiles = latestProfiles();
  const all = (await getCollection('members'))
    .map((m) => {
      const d = { ...m.data, ...profiles[m.id] };
      if (d.avatar_style === '一般' && !d.lala_photo && lalaUploaded(m.id)) {
        d.avatar_style = '拉拉看';
        d.lala_photo = `/lala/${m.id}.jpg`;
      }
      if (!d.photo && avatarUploaded(m.id)) d.photo = `/avatars/${m.id}.jpg`;
      return { ...m, data: d };
    })
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
  // 拉拉看照片要真的存在（避免填了路徑卻沒上傳）
  for (const m of all) {
    const p = m.data.avatar_style === '拉拉看' ? m.data.lala_photo : undefined;
    if (p?.startsWith('/') && !fs.existsSync(`public${decodeURI(stripBase(p))}`)) {
      throw new Error(`src/content/members/${m.id}.md：找不到拉拉看照片 ${p}，請重新上傳`);
    }
  }
  return {
    pi: all.filter((m) => m.data.role === '教授'),
    current: all.filter((m) => m.data.role !== '教授' && m.data.role !== '畢業生'),
    alumni: all.filter((m) => m.data.role === '畢業生')
      .sort((a, b) => (b.data.grad_year ?? 0) - (a.data.grad_year ?? 0) || a.data.order - b.data.order),
  };
}

const typeRank = { journal: 0, conference: 1, other: 2, thesis: 3 } as const;
export async function getPubs(): Promise<Pub[]> {
  return (await getCollection('publications'))
    .sort((a, b) => b.data.year - a.data.year || typeRank[a.data.type] - typeRank[b.data.type] || a.id.localeCompare(b.id))
    .map((e) => e.data);
}

export async function getNews() {
  return (await getCollection('news')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getTopics() {
  return (await getCollection('research')).sort((a, b) => a.data.order - b.data.order);
}

export const undergradProjects = undergrad;

// ---- 小工具 ----
// 站內網址加上 base（例如 /hcsi-lab）。外部網址、mailto:、tel:、undefined 原樣回傳。
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export function u<T extends string | undefined>(p: T): T {
  if (typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//')) return p;
  if (BASE && (p === BASE || p.startsWith(BASE + '/'))) return p; // 已經加過
  return (BASE + p) as T;
}
// 反過來：去掉 base，換回 public/ 底下的路徑（後台上傳的路徑本身含 base）
export const stripBase = (p: string) => (BASE && p.startsWith(BASE + '/') ? p.slice(BASE.length) : p);
export const pubLink = (p: Pub) => p.url || (p.pdf ?? `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`);
export const authorLine = (p: Pub) => p.authors.join(', ');
export const initial = (name: string) => name.slice(-1);
export const ym = (d: Date) => `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

// 依研究主題的關鍵字，找出相關的碩論、專題與論文
export function related(t: Topic, alumni: Member[], pubs: Pub[]) {
  const zr = t.data.keywords_zh ? new RegExp(t.data.keywords_zh, 'i') : null;
  const er = t.data.keywords_en ? new RegExp(t.data.keywords_en, 'i') : null;
  return {
    masters: zr ? alumni.filter((m) => m.data.thesis && zr.test(m.data.thesis)) : [],
    projects: undergrad.filter((p) => (zr && zr.test(p.zh)) || (er && er.test(p.en))),
    pubs: er ? pubs.filter((p) => p.type !== 'thesis' && er.test(p.title)) : [],
  };
}

// 專題分類（大學專題頁的篩選）。只決定分類標籤與色塊，不配圖：
// 以前從分類圖庫依序挑圖，結果圖片和題目對不上（老師 11/3 指正）。
// 要放圖，請在 src/data/undergrad-projects.json 該筆加 img（必須是那組專題自己的成果圖）。
export const projectCats = [
  { key: 'wear', tag: '智慧運動穿戴', re: /棒球|IMU|槓鈴|手眼/, bg: '#5C4A37' },
  { key: 'video', tag: '運動影像分析', re: /足球|籃球|高爾夫|姿態|好球帶|校準|VR/, bg: '#2F3B36' },
  { key: 'med', tag: '智慧醫療影像', re: /視網膜|阿茲海默/, bg: '#4A685D' },
  { key: 'hci', tag: '人機互動與 3D', re: /擴增|Lighthouse|立體|門禁|Kinect|KINECT/, bg: '#6B5A48' },
  { key: 'vision', tag: '影像辨識', re: /./, bg: '#3E4A5A' },
];

// 碩論分類（研究所頁的卡片圖）
// imgs 只放「就是這篇論文做的東西」的圖（依老師〈5. IoT works〉：智慧棒球、球棒、打擊手套、機械手臂拼圖）。
// 只是主題相近、但不是該論文成果的圖不要放（例：球衣辨識論文不放老師 2005 年的球衣圖）。
const masterCats = [
  { re: /手套/, tag: '智慧運動穿戴', imgs: ['/images/glove.jpg', '/images/glove2.jpg'], bg: '#5C4A37' },
  { re: /球棒/, tag: '智慧運動穿戴', imgs: ['/images/bat.jpg', '/images/bat-structure.jpg'], bg: '#5C4A37' },
  { re: /FSR|壓力感測/, tag: '智慧運動穿戴', imgs: ['/images/baseball.jpg', '/images/ball-exploded.jpg', '/images/ball-module.jpg'], bg: '#5C4A37' },
  { re: /棒球/, tag: '智慧運動穿戴', imgs: [], bg: '#5C4A37' },
  { re: /球衣|軌跡/, tag: '運動影像分析', imgs: [], bg: '#2F3B36' },
  { re: /拼圖|機械/, tag: '機器人與邊緣 AI', imgs: ['/images/arm.jpg'], bg: '#3E4A5A' },
  { re: /視網膜/, tag: '智慧醫療影像', imgs: [], bg: '#4A685D' },
  { re: /表情|輕量/, tag: '機器人與邊緣 AI', imgs: [], bg: '#3E4A5A' },
];
export const masterCat = (thesis = '') =>
  masterCats.find((c) => c.re.test(thesis)) ?? { tag: '影像與訊號處理', imgs: [] as string[], bg: '#6B5A48' };

// 同一頁的卡片不重複用圖：依序取分類圖庫中還沒用過的；用完就不放圖（只顯示分類色塊）
export function imagePicker(used = new Set<string>()) {
  return (imgs: readonly string[]) => {
    const img = imgs.find((i) => !used.has(i)) ?? '';
    if (img) used.add(img);
    return img;
  };
}

export async function getCounts() {
  const [pubs, { alumni }] = await Promise.all([getPubs(), getMembers()]);
  return {
    journal: pubs.filter((p) => p.type === 'journal' && !p.domestic).length,
    conference: pubs.filter((p) => p.type === 'conference' && !p.domestic).length,
    awards: pubs.filter((p) => p.award).length,
    masters: alumni.length,
    projects: undergrad.length,
  };
}
