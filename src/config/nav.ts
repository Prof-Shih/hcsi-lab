// 主選單（程式人員維護）。順序即各頁 Layout 的 active 索引。
export const nav = [
  { label: '首頁', href: '/' },
  { label: '研究主題', href: '/research/' },
  { label: '研究所', href: '/graduate/' },
  { label: '大學專題', href: '/undergrad/' },
  { label: '指導教授', href: '/pi/' },
  { label: '著作', href: '/publications/' },
  { label: '成員', href: '/members/' },
  { label: '聯絡', href: '/contact/' },
];

// 各頁在 nav 裡的位置，避免頁面寫死數字
export const NAV = { home: 0, research: 1, graduate: 2, undergrad: 3, pi: 4, publications: 5, members: 6, contact: 7 } as const;
