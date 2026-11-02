import { defineConfig } from 'astro/config';

// 目前放在個人帳號的 repo Prof-Shih/hcsi-lab → 網址 https://prof-shih.github.io/hcsi-lab/
// 頁面裡的站內網址一律經過 src/lib.ts 的 u()，改 base 時頁面不用動。
// 日後移到 <org>.github.io 或綁定自訂網域：site 改成新網址、base 改成 '/'（自訂網域另加 public/CNAME），
// 並把 .pages.yml 的 media.output 改回 /uploads（已上傳內容裡的 /hcsi-lab/uploads 也要一併取代）。
export default defineConfig({
  site: 'https://prof-shih.github.io',
  base: '/hcsi-lab',
  trailingSlash: 'ignore',
  // 樣式一律內嵌進 HTML：GitHub Pages 讓 HTML 快取 10 分鐘，若樣式是獨立的雜湊檔，
  // 頻繁部署後快取中的舊 HTML 會去要已被刪掉的舊 CSS，整頁變成沒有樣式。
  build: { format: 'directory', inlineStylesheets: 'always' },
});
