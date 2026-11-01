// 內容層的唯一定義：collection、欄位、enum 選項都在這裡。
// .pages.yml 的欄位必須與這裡一一對應（改這裡就要同步改 .pages.yml）。
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// ---- enum 選項（頁面一律從這裡引用，不要寫死） ----
export const MEMBER_ROLES = ['教授', '博士生', '碩士生', '大學專題生', '畢業生'] as const;
// 頭像風格：選「拉拉看」必須上傳依 public/lala-photo-guide.svg 構圖拍的 lala_photo
export const AVATAR_STYLES = ['一般', '拉拉看'] as const;
export const PUB_TYPES = ['journal', 'conference', 'thesis', 'other'] as const;
export const RESEARCH_GROUPS = [
  { zh: 'AIoT 生理訊號分析與低延遲傳輸', en: 'AIoT Physiological Signal Analytics' },
  { zh: '大型語言模型智慧內容分析', en: 'Intelligent Content Analysis with LLMs' },
  { zh: '多模態人機互動與即時資訊蒐集', en: 'Multimodal HCI & Real-time Sensing' },
] as const;
const GROUP_NAMES = RESEARCH_GROUPS.map((g) => g.zh) as [string, ...string[]];

// 圖片、檔案欄位存的是網址路徑（CMS 上傳到 public/uploads/，寫入 /uploads/xxx）
const path = z.string().regex(/^(\/|https?:\/\/)/, '路徑要以 / 或 http(s):// 開頭');
// CMS 清空欄位時可能寫入 "" 或 null，先移除，讓選填欄位與預設值正常運作
const clean = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (d) => (d && typeof d === "object" ? Object.fromEntries(Object.entries(d).filter(([, v]) => v !== "" && v !== null)) : d),
    schema,
  );
const md = (dir: string) => glob({ base: `./src/content/${dir}`, pattern: '**/*.md' });

const members = defineCollection({
  loader: md('members'),
  schema: clean(z.object({
    name: z.string().min(1),
    name_en: z.string().optional(),
    role: z.enum(MEMBER_ROLES),
    enroll_year: z.number().int().optional(),
    photo: path.optional(),
    email: z.string().optional(),
    interests: z.array(z.string()).default([]),
    order: z.number().default(99),
    // 以下為本站延伸欄位（wireframe 需要）
    edu: z.string().optional(),
    topic: z.string().optional(),
    instagram: z.string().optional(),
    grad_year: z.number().int().optional(),
    dept: z.string().optional(),
    thesis: z.string().optional(),
    honor: z.string().optional(),
    job: z.string().optional(),
    avatar_style: z.enum(AVATAR_STYLES).default('一般'),
    lala_photo: path.optional(),
  }).refine((m) => m.avatar_style !== '拉拉看' || Boolean(m.lala_photo), {
    message: '頭像風格選「拉拉看」時，必須上傳「拉拉看照片」（依對位參考圖拍攝的正方形正面照）',
    path: ['lala_photo'],
  })),
});

const publications = defineCollection({
  loader: md('publications'),
  schema: clean(z.object({
    title: z.string().min(1),
    authors: z.array(z.string()).min(1),
    venue: z.string().min(1),
    year: z.number().int(),
    type: z.enum(PUB_TYPES),
    domestic: z.boolean().default(false),
    url: z.string().optional(),
    pdf: path.optional(),
    award: z.string().optional(),
  })),
});

const news = defineCollection({
  loader: md('news'),
  schema: clean(z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    cover: path.optional(),
  })),
});

const research = defineCollection({
  loader: md('research'),
  schema: clean(z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    cover: path.optional(),
    order: z.number().default(99),
    // 延伸欄位
    title_en: z.string().optional(),
    group: z.enum(GROUP_NAMES),
    tagline: z.string().optional(),
    short: z.string().optional(),
    color: z.string().default('#3E4A5A'),
    gallery: z.array(z.object({ src: path, cap: z.string() })).default([]),
    skills: z.array(z.string()).default([]),
    keywords_zh: z.string().optional(),
    keywords_en: z.string().optional(),
  })),
});

const settings = defineCollection({
  loader: glob({ base: './src/content/settings', pattern: 'site.yml' }),
  schema: clean(z.object({
    lab_name: z.string(),
    lab_name_en: z.string(),
    short_name: z.string(),
    dept: z.string(),
    intro: z.string(),
    address: z.string(),
    room: z.string().optional(),
    lab_room: z.string().optional(),
    email: z.string(),
    phone: z.string().optional(),
    map_query: z.string().default('國立中央大學'),
  })),
});

export const collections = { members, publications, news, research, settings };
