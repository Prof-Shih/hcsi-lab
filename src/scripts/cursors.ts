// 自訂游標：5 款（設計稿見管理員的 Claude artifact「HCSI Lab 游標提案」），頁尾可切換，選擇存在 localStorage。
// 每款有平常（a）與指到連結、按鈕（b）兩種；hot 為點擊熱點。觸控裝置沒有游標，不受影響。
export const DEFAULT_CURSOR = 'ball';

export const CURSORS: Record<string, { name: string; a: string; b: string; hot: [number, number]; hotB: [number, number] }> = {
  ball: {
    name: '棒球',
    a: `<circle cx="16" cy="16" r="12" fill="#fff" stroke="#2B2B2B" stroke-width="1.6"/><path d="M8.5 7.5c3 3 3 14 0 17M23.5 7.5c-3 3-3 14 0 17" fill="none" stroke="#D2463A" stroke-width="1.4"/><path d="M9.8 10.5l1.8-.6M10.4 14l1.8-.3M10.4 18l1.8.3M9.8 21.5l1.8.6M22.2 10.5l-1.8-.6M21.6 14l-1.8-.3M21.6 18l-1.8.3M22.2 21.5l-1.8.6" stroke="#D2463A" stroke-width="1.1"/>`,
    b: `<path d="M1 12h6M2 17h5M1 22h5" stroke="#C08B5C" stroke-width="1.8" stroke-linecap="round"/><circle cx="19" cy="16" r="11" fill="#fff" stroke="#2B2B2B" stroke-width="1.6"/><path d="M12.5 8c2.6 2.8 2.6 13.2 0 16M25.5 8c-2.6 2.8-2.6 13.2 0 16" fill="none" stroke="#D2463A" stroke-width="1.4"/>`,
    hot: [16, 16], hotB: [19, 16],
  },
  bat: {
    name: '球棒',
    a: `<path d="M4.2 3.2c2.6-.9 5.4.3 7.2 2.1l15 15c.8.8.8 2 0 2.8l-.7.7c-.8.8-2 .8-2.8 0l-15-15C6.1 6.9 3.3 5.8 4.2 3.2z" fill="#C08B5C" stroke="#2B2B2B" stroke-width="1.3"/><path d="M22.4 22.4l3.6 3.6" stroke="#2B2B2B" stroke-width="3.2" stroke-linecap="round"/><circle cx="27.4" cy="27.4" r="2.2" fill="#5B7B6F" stroke="#2B2B2B" stroke-width="1"/>`,
    b: `<circle cx="6" cy="6" r="5.4" fill="#E07A5F" opacity=".35"/><path d="M4.2 3.2c2.6-.9 5.4.3 7.2 2.1l15 15c.8.8.8 2 0 2.8l-.7.7c-.8.8-2 .8-2.8 0l-15-15C6.1 6.9 3.3 5.8 4.2 3.2z" fill="#D9A06C" stroke="#2B2B2B" stroke-width="1.3"/><path d="M22.4 22.4l3.6 3.6" stroke="#2B2B2B" stroke-width="3.2" stroke-linecap="round"/><circle cx="27.4" cy="27.4" r="2.2" fill="#E07A5F" stroke="#2B2B2B" stroke-width="1"/>`,
    hot: [4, 4], hotB: [4, 4],
  },
  joint: {
    name: '關節點',
    a: `<circle cx="16" cy="16" r="9" fill="none" stroke="#5B7B6F" stroke-width="1.6" stroke-dasharray="3 2.4"/><circle cx="16" cy="16" r="4" fill="#E07A5F" stroke="#fff" stroke-width="1.4"/>`,
    b: `<path d="M16 16L5 7M16 16l11 9" stroke="#5B7B6F" stroke-width="2.4" stroke-linecap="round"/><circle cx="5" cy="7" r="2.6" fill="#E0B341" stroke="#fff" stroke-width="1"/><circle cx="27" cy="25" r="2.6" fill="#E0B341" stroke="#fff" stroke-width="1"/><circle cx="16" cy="16" r="5" fill="#E07A5F" stroke="#fff" stroke-width="1.6"/>`,
    hot: [16, 16], hotB: [16, 16],
  },
  arrow: {
    name: '木頭箭頭',
    a: `<path d="M5 3l18 13.5-7.6 1.4 4.4 8.6-3.4 1.8-4.4-8.7L5 25z" fill="#C08B5C" stroke="#2B2B2B" stroke-width="1.4" stroke-linejoin="round"/>`,
    b: `<path d="M11 4.5c0-1.4 2.6-1.4 2.6 0v9l1.2-.2V11c0-1.4 2.5-1.4 2.5 0v2.6l1.1-.1v-1.6c0-1.4 2.5-1.4 2.5 0v2l1-.1c0-1.3 2.4-1.3 2.4.2V21c0 4-2.6 7-6.6 7h-2.2c-2.6 0-4-1-5.4-3L6.6 18.6c-.8-1.2.9-2.7 2-1.6L11 19.6z" fill="#E07A5F" stroke="#2B2B2B" stroke-width="1.3" stroke-linejoin="round"/>`,
    hot: [5, 3], hotB: [12, 4],
  },
  otto: {
    name: 'Otto',
    a: `<path d="M5 3.5l5 6" stroke="#2B2B2B" stroke-width="1.4" stroke-linecap="round"/><circle cx="4.6" cy="3.4" r="2" fill="#E07A5F"/><rect x="8" y="9" width="18" height="10" rx="2.5" fill="#D2463A" stroke="#2B2B2B" stroke-width="1.3"/><rect x="8" y="17" width="18" height="10" rx="2" fill="#fff" stroke="#2B2B2B" stroke-width="1.3"/><circle cx="13" cy="14" r="2.6" fill="#fff" stroke="#2B2B2B"/><circle cx="21" cy="14" r="2.6" fill="#fff" stroke="#2B2B2B"/><circle cx="13" cy="14" r="1.1" fill="#2B2B2B"/><circle cx="21" cy="14" r="1.1" fill="#2B2B2B"/>`,
    b: `<path d="M5 3.5l5 6" stroke="#2B2B2B" stroke-width="1.4" stroke-linecap="round"/><circle cx="4.6" cy="3.4" r="2.4" fill="#E0B341"/><rect x="8" y="9" width="18" height="10" rx="2.5" fill="#D2463A" stroke="#2B2B2B" stroke-width="1.3"/><rect x="8" y="17" width="18" height="10" rx="2" fill="#fff" stroke="#2B2B2B" stroke-width="1.3"/><path d="M10.6 14.6c1-1.8 3.8-1.8 4.8 0M18.6 14.6c1-1.8 3.8-1.8 4.8 0" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M14 22c1.6 1.4 4.4 1.4 6 0" fill="none" stroke="#D2463A" stroke-width="1.4" stroke-linecap="round"/>`,
    hot: [3, 2], hotB: [3, 2],
  },
};

const uri = (body: string) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${body}</svg>`);
const KEY = 'hcsi-cursor';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* 私密視窗等情況存不了，就只套用這一次 */ } };

export function mountCursors() {
  if (!matchMedia('(pointer: fine)').matches) return;
  const style = document.createElement('style');
  document.head.append(style);
  const apply = (k: string) => {
    const c = CURSORS[k] ?? CURSORS[DEFAULT_CURSOR];
    style.textContent = k === 'none' ? '' : `html { cursor: url("${uri(c.a)}") ${c.hot[0]} ${c.hot[1]}, auto; }
      a, button, [role="button"], label, select, summary, .egg-dot, .face { cursor: url("${uri(c.b)}") ${c.hotB[0]} ${c.hotB[1]}, pointer; }
      input, textarea { cursor: text; }`;
    document.querySelectorAll<HTMLButtonElement>('.cursor-pick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === k)));
  };
  const pick = document.querySelector('.cursor-pick');
  if (pick) {
    for (const [k, c] of [...Object.entries(CURSORS), ['none', { name: '一般', a: '' }] as const]) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.c = k; b.title = c.name; b.setAttribute('aria-label', `游標：${c.name}`);
      if (c.a) { const img = document.createElement('img'); img.src = uri(c.a); img.alt = ''; b.append(img); }
      else b.textContent = c.name;
      b.addEventListener('click', () => { write(k); apply(k); });
      pick.append(b);
    }
  }
  apply(read() ?? DEFAULT_CURSOR);
}
