// 多語系字典：src/i18n/<語言>.json → 扁平化成 { strings, patterns } 給瀏覽器端使用。
// JSON 結構說明見 en.json 的 _meta.rules。
import en from './en.json';
import undergrad from '../data/undergrad-projects.json';

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

export function buildDict(locale: Locale): Dict {
  const src = LOCALES[locale] as unknown as Record<string, unknown> & { _meta: { html_lang: string; label: string; switch_to_source_label: string }; patterns: Pattern[] };
  // 先檢查 pattern 都是合法的正規表示式，壞掉就讓建置失敗
  for (const p of src.patterns) new RegExp(p.zh);
  return { lang: src._meta.html_lang, label: src._meta.label, back: src._meta.switch_to_source_label, strings: { ...flatten(src, {}), ...projectTitles() }, patterns: src.patterns };
}
