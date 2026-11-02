import fs from 'node:fs';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
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

// 手機上傳頁（/lala/）收到的照片：public/lala/<成員檔名>.jpg。
// 成員沒自己設定拉拉看時，有這張照片就自動改用拉拉看；不想用就刪掉照片。
export const lalaUploaded = (id: string) => fs.existsSync(`public/lala/${id}.jpg`);

export async function getMembers() {
  const all = (await getCollection('members'))
    .map((m) => m.data.avatar_style === '一般' && !m.data.lala_photo && lalaUploaded(m.id)
      ? { ...m, data: { ...m.data, avatar_style: '拉拉看' as const, lala_photo: `/lala/${m.id}.jpg` } }
      : m)
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

// 專題分類（大學專題頁的篩選）
export const projectCats = [
  { key: 'wear', tag: '智慧運動穿戴', re: /棒球|IMU|槓鈴|手眼/, img: '/images/baseball.jpg', bg: '#5C4A37' },
  { key: 'video', tag: '運動影像分析', re: /足球|籃球|高爾夫|姿態|好球帶|校準|VR/, img: '/images/pose.jpg', bg: '#2F3B36' },
  { key: 'med', tag: '智慧醫療影像', re: /視網膜|阿茲海默|口罩|臉部/, img: '', bg: '#4A685D' },
  { key: 'hci', tag: '人機互動與 3D', re: /擴增|Lighthouse|立體|門禁|Kinect|KINECT/, img: '', bg: '#6B5A48' },
  { key: 'vision', tag: '影像辨識', re: /./, img: '', bg: '#3E4A5A' },
];

// 碩論分類（研究所頁的卡片圖）
const masterCats = [
  { re: /手套/, tag: '智慧運動穿戴', img: '/images/glove.jpg', bg: '#5C4A37' },
  { re: /球棒/, tag: '智慧運動穿戴', img: '/images/bat.jpg', bg: '#5C4A37' },
  { re: /棒球|FSR/, tag: '智慧運動穿戴', img: '/images/baseball.jpg', bg: '#5C4A37' },
  { re: /球衣|軌跡/, tag: '運動影像分析', img: '/images/pose2.jpg', bg: '#2F3B36' },
  { re: /拼圖|機械/, tag: '機器人與邊緣 AI', img: '/images/arm.jpg', bg: '#3E4A5A' },
  { re: /視網膜/, tag: '智慧醫療影像', img: '', bg: '#4A685D' },
  { re: /表情|輕量/, tag: '機器人與邊緣 AI', img: '', bg: '#3E4A5A' },
];
export const masterCat = (thesis = '') =>
  masterCats.find((c) => c.re.test(thesis)) ?? { tag: '影像與訊號處理', img: '', bg: '#6B5A48' };

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
