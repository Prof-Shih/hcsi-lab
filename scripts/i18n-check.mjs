// 列出網站上還沒有英文譯文的中文文字。用法：npm run build && node scripts/i18n-check.mjs
// 結果交給 AI 做專業翻譯（不要用 Google 翻譯），加進 src/i18n/en.json 對應的分區。
// 只有人名的文字（沒有英文名的人維持中文）也會列出，可以忽略。
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist';
const dict = JSON.parse(fs.readFileSync(path.join(dist, 'i18n/en.json'), 'utf8'));
const pats = dict.patterns.map((p) => new RegExp(p.zh));
const cjk = /[㐀-鿿]/;
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const dec = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const ok = (s) => s in dict.strings || pats.some((re) => re.test(s));

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); } })(dist);

const missing = new Map();
for (const f of files) {
  if (f.includes(`${path.sep}me${path.sep}`)) continue; // 我的資料頁不翻譯
  let h = fs.readFileSync(f, 'utf8');
  if (h.includes('http-equiv="refresh"')) continue; // 轉址頁
  h = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const texts = [...h.split(/<[^>]+>/), ...[...h.matchAll(/\s(?:alt|title|aria-label|placeholder|content)="([^"]*)"/g)].map((m) => m[1])];
  for (const t of texts) {
    const s = norm(dec(t));
    if (s && cjk.test(s) && !ok(s)) {
      if (!missing.has(s)) missing.set(s, new Set());
      missing.get(s).add(path.relative(dist, f));
    }
  }
}
for (const [s, where] of missing) console.log(`${JSON.stringify(s)}\t${[...where].slice(0, 3).join(', ')}`);
console.error(`\n字典 ${Object.keys(dict.strings).length} 條、規則 ${pats.length} 條；未翻譯 ${missing.size} 條（含只有人名的文字）。`);
