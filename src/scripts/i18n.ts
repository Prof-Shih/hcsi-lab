// 語言切換：中文是原始內容；切到英文時下載 /i18n/en.json，把頁面上的中文文字逐一換成 AI 翻好的英文。
// 找不到譯文的文字維持中文。之後動態加入的文字（小幫手回答、輪播、篩選結果）也會自動翻譯。
// 選擇存在 localStorage；網址加 ?lang=en 或 ?lang=zh 可直接指定（方便分享英文版連結）。
import type { Dict } from '../i18n';

const KEY = 'hcsi-lang';
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'PRE']);
const ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
const CJK = /[㐀-鿿]/;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export const getLang = () => { try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'zh'; } catch { return 'zh'; } };
const setLang = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* 私密視窗存不了就只套用這次 */ } };

function makeTranslator(d: Dict) {
  const pats = d.patterns.map((p) => ({ re: new RegExp(p.zh), en: p.en }));
  const tr = (raw: string): string | undefined => {
    const s = norm(raw);
    if (!s || !CJK.test(s)) return undefined;
    if (s in d.strings) return d.strings[s];
    for (const p of pats) {
      const m = s.match(p.re);
      if (m) return p.en.replace(/\$(\d)/g, (_, i) => { const c = m[+i] ?? ''; return d.strings[norm(c)] ?? c; });
    }
    return undefined;
  };
  return tr;
}

export async function mountI18n(url: string) {
  const root = document.documentElement;
  const done = () => root.classList.remove('i18n-wait');
  const btns = document.querySelectorAll<HTMLButtonElement>('[data-lang-toggle]');
  const lang = getLang();
  btns.forEach((b) => b.addEventListener('click', () => {
    setLang(getLang() === 'en' ? 'zh' : 'en');
    const u = new URL(location.href);
    u.searchParams.delete('lang');
    location.replace(u.href);
  }));
  // 成員自用的「我的資料」頁不翻譯（送出的資料必須是中文原文）
  if (lang !== 'en' || document.body.hasAttribute('data-i18n-off')) { done(); return; }

  let d: Dict;
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    d = await r.json();
  } catch { done(); return; }
  const tr = makeTranslator(d);
  root.lang = d.lang;
  btns.forEach((b) => { b.textContent = d.back; b.setAttribute('aria-label', '切換為中文 Switch to Chinese'); b.lang = 'zh-Hant'; });

  const textNode = (n: Text) => {
    const v = n.nodeValue ?? '';
    const t = tr(v);
    if (t === undefined) return;
    let lead = /^\s/.test(v) ? ' ' : '';
    let tail = /\s$/.test(v) ? ' ' : '';
    // 被拆成好幾段的句子（中間夾連結或粗體）：英文需要補上字與字之間的空白
    if (!lead && n.previousSibling && /^[A-Za-z0-9(“]/.test(t)) lead = ' ';
    if (/^[,.;:!?)]/.test(t)) lead = ''; // 英文標點緊接前一個字
    if (!tail && n.nextSibling && /[A-Za-z0-9:,)”]$/.test(t)) tail = ' ';
    n.nodeValue = lead + t + tail;
  };
  const skip = (el: Element | null) => !!el?.closest('script,style,textarea,noscript,[data-i18n-skip]');
  const element = (el: Element) => {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v) { const t = tr(v); if (t !== undefined) el.setAttribute(a, t); }
    }
  };
  const walk = (node: Node) => {
    if (node.nodeType === 3) { if (!skip(node.parentElement)) textNode(node as Text); return; }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    if (SKIP.has(el.tagName) || skip(el)) return;
    element(el);
    el.querySelectorAll('*').forEach((c) => { if (!SKIP.has(c.tagName)) element(c); });
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) if (!skip(t.parentElement)) textNode(t as Text);
  };

  const title = tr(document.title);
  if (title !== undefined) document.title = title;
  const desc = document.querySelector('meta[name="description"]');
  const dv = desc?.getAttribute('content');
  if (desc && dv) { const t = tr(dv); if (t !== undefined) desc.setAttribute('content', t); }
  walk(document.body);
  done();

  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') walk(m.target);
      else if (m.type === 'attributes' && m.target.nodeType === 1) element(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
