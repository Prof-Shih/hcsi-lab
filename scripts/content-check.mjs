// 內容健檢：一次列出網站上還沒補好的地方，巡站不用靠人一頁一頁看。
// 用法：npm run build && node scripts/content-check.mjs
// 只讀檔、不改任何東西；有問題也不會讓建置失敗。
//   1. 頁面上看得到的「待補」「TODO」等佔位文字
//   2. 站內連結、圖片、影片指到不存在的檔案
//   3. 在學成員缺頭像、學歷、研究題目、信箱
//   4. 英文版還沒翻譯的文字數（明細跑 node scripts/i18n-check.mjs）
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const dist = 'dist';
const BASE = '/hcsi-lab';
if (!fs.existsSync(dist)) { console.error('找不到 dist/，請先執行 npm run build'); process.exit(1); }

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); } })(dist);
const page = (f) => '/' + path.relative(dist, f).replace(/\\/g, '/').replace(/index\.html$/, '');
const dec = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

let total = 0;
const section = (title, rows) => {
  console.log(`\n■ ${title}（${rows.length}）`);
  if (!rows.length) console.log('  沒有問題 ✓');
  for (const r of rows) console.log('  - ' + r);
  total += rows.length;
};

// 1. 佔位文字（只看畫面上的文字，不看程式碼）
const PH = /待補|待確認|TODO|TBD|lorem ipsum|\[[^\]\n]{0,30}(?:照片|圖片|影片|待)[^\]\n]{0,30}\]/i;
const ph = [];
for (const f of files) {
  if (page(f).startsWith('/me/')) continue; // 手機表單本來就有提示文字
  const h = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const texts = [...h.split(/<[^>]+>/), ...[...h.matchAll(/\s(?:alt|title|aria-label)="([^"]*)"/g)].map((m) => m[1])];
  for (const t of texts) {
    const s = dec(t).replace(/\s+/g, ' ').trim();
    if (s && PH.test(s)) ph.push(`${page(f)}：${s.slice(0, 60)}`);
  }
}
section('頁面上的佔位文字', [...new Set(ph)]);

// 2. 壞掉的站內連結與檔案
const broken = new Map();
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  for (const [, url] of h.matchAll(/\s(?:href|src|poster)="([^"#?]+)/g)) {
    if (!url.startsWith(BASE + '/') || url.startsWith(BASE + '/_astro/')) continue;
    let p = decodeURIComponent(url.slice(BASE.length));
    if (p.endsWith('/')) p += 'index.html';
    const hit = fs.existsSync(path.join(dist, p)) || fs.existsSync(path.join(dist, p, 'index.html'));
    if (!hit) { if (!broken.has(url)) broken.set(url, new Set()); broken.get(url).add(page(f)); }
  }
}
section('壞掉的站內連結／檔案', [...broken].map(([url, where]) => `${url}　← ${[...where].slice(0, 3).join('、')}`));

// 3. 在學成員的資料（手機 /me/ 送出的最新一份會覆蓋成員檔）
const fm = (s) => Object.fromEntries([...(s.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').matchAll(/^(\w+):\s*(.*)$/gm)].map(([, k, v]) => [k, v.replace(/^["']|["']$/g, '').trim()]));
const empty = (v) => !v || /待補/.test(v);
const rows = [];
for (const file of fs.readdirSync('src/content/members').filter((f) => f.endsWith('.md'))) {
  const id = file.replace(/\.md$/, '');
  const d = fm(fs.readFileSync(`src/content/members/${file}`, 'utf8').replace(/\r\n/g, '\n'));
  const dir = `src/data/profiles/${id}`;
  if (fs.existsSync(dir)) {
    const last = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().pop();
    if (last) { try { Object.assign(d, JSON.parse(fs.readFileSync(`${dir}/${last}`, 'utf8'))); } catch {} }
  }
  if (d.role === '畢業生') continue;
  const lack = [];
  const hasPhoto = d.photo || d.lala_photo || fs.existsSync(`public/avatars/${id}.jpg`) || fs.existsSync(`public/lala/${id}.jpg`);
  if (!hasPhoto && d.role !== '教授') lack.push('頭像'); // 教授照片寫在 members.astro
  if (d.role !== '教授') {
    if (empty(d.edu)) lack.push('學歷');
    if (empty(d.topic)) lack.push('研究題目');
    if (empty(d.email)) lack.push('信箱');
  }
  if (lack.length) rows.push(`${d.name || id}（${d.role}，${id}）缺：${lack.join('、')}`);
}
section('在學成員缺的資料（請本人用手機 /me/ 補）', rows);

// 4. 英文翻譯
let i18n = '';
try { i18n = execFileSync(process.execPath, ['scripts/i18n-check.mjs'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch {}
const n = i18n.split('\n').filter(Boolean).length;
console.log(`\n■ 英文版未翻譯文字：${n} 條（含只有中文名的人名，明細：node scripts/i18n-check.mjs）`);

console.log(`\n共 ${total} 個待處理項目。`);
