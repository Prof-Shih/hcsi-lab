// 多語系字典：src/i18n/<語言>.json → 扁平化成 { strings, patterns } 給瀏覽器端使用。
// JSON 結構說明見 en.json 的 _meta.rules。
import en from './en.json';
import undergrad from '../data/undergrad-projects.json';
import details from '../data/project-details.json';

export type Pattern = { zh: string; en: string };
export type Dict = { lang: string; label: string; back: string; strings: Record<string, string>; patterns: Pattern[] };

export const LOCALES = { en } as const;
export type Locale = keyof typeof LOCALES;

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

// _meta 與 patterns 以外的每一區都是「中文原文 → 譯文」；分區只為了好維護，執行時合併成一張表。
function flatten(obj: Record<string, unknown>, out: Record<string, string>) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_meta' || k === 'patterns') continue;
    if (typeof v === 'string') out[norm(k)] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v as Record<string, unknown>, out);
  }
  return out;
}

// 大學專題題目的英文以老師資料（undergrad-projects.json 的 en）為準，不另外翻譯
const projectTitles = () => Object.fromEntries(undergrad.filter((p) => p.en).map((p) => [norm(p.zh), p.en]));
// 詳細頁的學期「113 學年第 2 學期」→ Spring 2025（民國學年＋1911 為秋季學期西元年，第 2 學期為隔年春季）
const termTexts = () => Object.fromEntries([...new Set(undergrad.map((p) => p.sem))].filter((t) => /^\d{4}$/.test(t)).map((t) => {
  const y = Number(t.slice(0, 3)) + 1911; const second = t[3] === '2';
  return [`${t.slice(0, 3)} 學年第 ${t[3]} 學期`, second ? `Spring ${y + 1}` : `Fall ${y}`];
}));

// 專題／碩論詳細頁：project-details.json 每個中文欄位旁都有 *_en（AI 專業翻譯），直接配對
type Detail = Record<string, unknown>;
const detailTexts = () => {
  const out: Record<string, string> = {};
  const pair = (zh: unknown, en: unknown) => { if (typeof zh === 'string' && typeof en === 'string' && zh) out[norm(zh)] = en; };
  const all = [...Object.values(details.undergrad), ...Object.values(details.theses)] as Detail[];
  for (const d of all) {
    pair(d.hook, d.hook_en);
    pair(d.problem, d.problem_en);
    for (const k of ['method', 'results'] as const) {
      const zh = d[k] as string[]; const en = d[`${k}_en`] as string[];
      zh.forEach((t, i) => pair(t, en[i]));
    }
    for (const x of [...(d.stats as Detail[]), ...(d.figures as Detail[])]) { pair(x.label, x.label_en); pair(x.cap, x.cap_en); }
  }
  return out;
};

export function buildDict(locale: Locale): Dict {
  const src = LOCALES[locale] as unknown as Record<string, unknown> & { _meta: { html_lang: string; label: string; switch_to_source_label: string }; patterns: Pattern[] };
  // 先檢查 pattern 都是合法的正規表示式，壞掉就讓建置失敗
  for (const p of src.patterns) new RegExp(p.zh);
  return { lang: src._meta.html_lang, label: src._meta.label, back: src._meta.switch_to_source_label, strings: { ...flatten(src, {}), ...projectTitles(), ...termTexts(), ...detailTexts() }, patterns: src.patterns };
}
