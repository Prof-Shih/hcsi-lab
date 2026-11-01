# HCSI Lab 網站

人本超智慧創新實驗室（國立中央大學資訊管理學系，指導教授 施皇嘉）官方網站。

- 線上網址：https://machencompeq.github.io/hcsi-lab/
- 技術：Astro 7（純靜態輸出）＋ Content Collections（zod schema）＋ Pages CMS 後台 ＋ GitHub Actions → GitHub Pages
- 原則：**內容與程式分離**。後台（CMS）只能寫 `src/content/` 和 `public/uploads/`，其餘由程式人員維護。

給不寫程式的人：請看 [docs/editing-guide.md](docs/editing-guide.md)。

## 架構

```
[編輯層]  Pages CMS 網頁後台 ──┐
          實驗室電腦 VS Code + Git ─┴─→ commit 到 main
[內容層]  src/content/   Markdown + YAML（唯一資料來源）
[呈現層]  src/layouts, pages, components, styles
[部署層]  push main → GitHub Actions 建置 → GitHub Pages
```

| 路徑 | 內容 | 誰維護 |
|---|---|---|
| `src/content/members/` | 成員（一人一檔，含教授與畢業生） | CMS |
| `src/content/publications/` | 論文（一篇一檔） | CMS |
| `src/content/news/` | 最新消息 | CMS |
| `src/content/research/` | 研究主題 | CMS |
| `src/content/settings/site.yml` | 實驗室基本資料 | CMS |
| `public/uploads/` | 後台上傳的圖片、PDF | CMS |
| `src/content.config.ts` | 所有 collection 的 schema 與 enum 選項 | 程式人員 |
| `.pages.yml` | 後台欄位設定（必須與 schema 一一對應） | 程式人員 |
| `src/config/nav.ts` | 主選單 | 程式人員 |
| `src/data/*.json` | 首頁輪播、指導教授學經歷、大學專題、實驗室日常照片 | 程式人員 |
| `src/scripts/lala.ts`、`public/lala-photo-guide.svg` | 拉拉看頭像互動與拍照對位參考圖 | 程式人員 |
| `public/images/` | 版面用的固定圖片 | 程式人員 |

頁面：首頁、研究主題（列表＋內頁）、研究所、大學專題、指導教授、著作、成員、聯絡、最新消息（列表＋內頁，從首頁進入）、404。

## 本機開發

需要 Node.js 24 LTS（最低 22.23.4，見 `.nvmrc`）。

```bash
git clone https://github.com/machencompeq/hcsi-lab.git
cd hcsi-lab
npm install        # 第一次
npm run dev        # 本機預覽 http://localhost:4321
npm run build      # 確認可建置（含 schema 驗證）
npm run preview    # 預覽建置結果
```

## 開發流程

- **開工前一定先 `git pull --rebase`**，因為後台存檔也會直接 commit 到 `main`。
- 小改：修改 → `npm run build` 通過 → push `main`。
- 大改：開 branch → PR → 等 CI 建置通過 → merge。
- repo 目前在個人帳號 `machencompeq` 下。規格書建議移到實驗室的 GitHub Organization（老師為 Owner）；移過去後改 `astro.config.mjs` 的 `site`／`base` 即可。

## 部署

`.github/workflows/deploy.yml`：push 到 `main` 就建置並發佈。建置失敗（例如某個內容欄位不符 schema）時**不會發佈**，線上維持上一個成功版本；到 repo 的 Actions 分頁看錯誤訊息，會寫出是哪個檔案的哪個欄位。

第一次設定：repo Settings → Pages → Source 選 **GitHub Actions**。

日後綁定自訂網域：新增 `public/CNAME`（內容為網域），並把 `astro.config.mjs` 的 `site` 改成該網域，不需改其他程式。

## 擴充：新增一種內容類型

1. `src/content.config.ts`：新增 collection 與 zod schema，加進最後的 `collections`。
2. `.pages.yml`：在 `content:` 下新增對應設定，欄位名稱、必填、選項、list 與 schema 一致。
3. `src/lib.ts`：加一個讀取函式（負責排序）。
4. `src/pages/`：建立列表頁與內頁（參考 `src/pages/news/`）；需要的話在 `src/config/nav.ts` 加選單。
5. `npm run build` 通過後 push，後台就會出現這種內容。

### 拉拉看頭像

成員可在後台把「頭像風格」改成「拉拉看」：成員頁的頭像就能被按住拉長、放手彈回，靜止時會眨眼、微笑。

- 必須另外上傳「拉拉看照片」：正方形正面照，依 `public/lala-photo-guide.svg` 讓雙眼、嘴角對準紅點。眨眼與微笑的位置是照這個構圖算的，沒對準會怪。
- 選了拉拉看卻沒上傳照片、或照片檔不存在，建置會失敗並指出是哪個成員。
- 參考點座標寫在 `src/scripts/lala.ts` 的 `EYES` / `MOUTH`，要改構圖時兩邊一起改。
- 不支援 WebGL 的裝置只顯示靜態照片；系統開啟「減少動態效果」時不會自動眨眼、微笑。

## 注意事項

- **站內網址一定要經過 `u()`**（`src/lib.ts`），例如 `href={u('/members/')}`、`src={u(m.photo)}`；直接寫 `href="/members/"` 在 `/hcsi-lab/` 底下會壞。後台上傳的檔案路徑本身就含 `/hcsi-lab`（`.pages.yml` 的 `media.output`）；Markdown 內文裡手打的站內連結請寫完整網址。
- 欄位定義以 `content.config.ts` 為準。改了 schema 一定要同步改 `.pages.yml`。
- CMS 清空欄位時可能寫入 `""` 或 `null`，schema 外層的 `clean()` 會先移除，選填欄位不受影響。
- 研究主題的 `keywords_zh` / `keywords_en` 是正規表示式（以 `|` 分隔），用來自動找出相關碩論、專題與論文。
- `Dockerfile`、`nginx.conf` 是舊的自架方案，正式部署不使用；只在想用實驗室 VM 做內部預覽時才用。

## 權限與防竄改

個人帳號的 repo 只有「擁有者」和「collaborator」兩種身分，**collaborator 一律有寫入權限**：能直接 push 到 `main`（＝直接改線上網站），也能改 `.github/workflows/`。所以：

- **寫程式的人不要加 collaborator**：請他 fork → 改 → 開 PR，擁有者審過再 merge。fork 的 PR 拿不到部署權限，看得到程式碼但動不了網站。
- **只有用後台改內容的人才加 collaborator**（Pages CMS 需要寫入權限），而且只加信得過的人。
- repo Settings → Rules → Rulesets 為 `main` 開：禁止 force push、禁止刪除分支，讓歷史紀錄無法被抹掉，出事可以 revert。
- Settings → Environments → `github-pages` 限制只有 `main` 能部署（預設就是）。
- 所有 collaborator 都要開 GitHub 兩步驟驗證（2FA）。
- 人一多、需要分「只能改內容」和「能改程式」時，把 repo 轉移到 Organization，用 team 權限細分。

## 待確認事項（目前採用的預設值）

| 項目 | 目前做法 |
|---|---|
| repo | `machencompeq/hcsi-lab`（個人帳號；`base` 為 `/hcsi-lab`，站內網址一律經過 `u()`） |
| repo 公開或私有 | 公開（免費方案的 GitHub Pages 需要公開 repo） |
| Wireframe | Claude 線框圖 artifact「HCSI Lab 網站線框圖」，版面已依此實作 |
| 中英雙語 | 僅中文；schema 已保留 `name_en`、`title_en` 等欄位 |
| 後台編輯者 | 待提供名單與 GitHub 帳號，加為 repo collaborator 後即可登入後台 |
| 既有內容 | 已一次匯入：論文 119 篇（老師著作目錄，2026/8/7 版）、畢業碩士 13 位、研究主題 6 個、消息 4 則 |
| 目前成員資料 | 6 位成員的身分暫填「碩士生」，學經歷、照片、信箱待各人在後台補 |
| 品牌素材 | 沿用線框圖的配色與字型；Logo 暫用文字標誌 |
