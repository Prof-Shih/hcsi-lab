// 網站地圖：建置時列出所有頁面，給 Google 收錄用（不另裝 @astrojs/sitemap，避免改 package-lock）
// 新增頁面不用改這裡：靜態頁自動列出，[slug] 頁沿用該頁自己的 getStaticPaths()。
import type { APIRoute } from 'astro';

// 不需要被搜尋到的頁面
const SKIP = ['/404/', '/me/', '/lala/'];

type Mod = { getStaticPaths?: () => Promise<{ params: Record<string, string> }[]> | { params: Record<string, string> }[] };
const pages = import.meta.glob<Mod>('./**/*.astro', { eager: true });

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const paths: string[] = [];
  for (const [file, mod] of Object.entries(pages)) {
    const route = file.replace(/^\./, '').replace(/\.astro$/, '').replace(/\/index$/, '/').replace(/([^/])$/, '$1/');
    if (!route.includes('[')) { paths.push(route); continue; }
    for (const { params } of (await mod.getStaticPaths?.()) ?? []) {
      paths.push(route.replace(/\[(\w+)\]/g, (_, k) => params[k]));
    }
  }
  const urls = [...new Set(paths)].filter((p) => !SKIP.includes(p)).sort()
    .map((p) => `  <url><loc>${new URL(base + p, site).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
