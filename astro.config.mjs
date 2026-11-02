import { defineConfig } from 'astro/config';

// 目前放在個人帳號的 repo Prof-Shih/hcsi-lab → 網址 https://prof-shih.github.io/hcsi-lab/
// 頁面裡的站內網址一律經過 src/lib.ts 的 u()，改 base 時頁面不用動。
// 日後移到 <org>.github.io 或綁定自訂網域：site 改成新網址、base 改成 '/'（自訂網域另加 public/CNAME），
// 並把 .pages.yml 的 media.output 改回 /uploads（已上傳內容裡的 /hcsi-lab/uploads 也要一併取代）。
export default defineConfig({
  site: 'https://prof-shih.github.io',
  base: '/hcsi-lab',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
