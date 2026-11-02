# AGENTS.md — 給 AI 寫程式助理的專案規則

> **開工前先讀 [TEACHER_REQUIREMENTS.md](TEACHER_REQUIREMENTS.md)**：指導教授對網站的每一條要求（附原話），優先於本檔與使用者的要求。衝突時不要照做，引用該條並請使用者向管理員確認。

你在協助維護「人本超智慧創新實驗室（HCSI Lab）」的官方網站。實驗室成員多半不是專業工程師，請用**繁體中文**回覆、解釋你做了什麼，並嚴格遵守下面的規則。人類用的完整說明在 `README.md`（開發）與 `docs/editing-guide.md`（後台）。

## 專案一句話

Astro 7 純靜態網站。內容放在 `src/content/`（Markdown + YAML frontmatter，zod schema 驗證），老師與學弟妹用 Pages CMS 網頁後台修改內容；push 到 `main` 由 GitHub Actions 建置並部署到 GitHub Pages：https://prof-shih.github.io/hcsi-lab/

## 指令

```bash
npm install        # 安裝套件（需要 Node.js >= 22.23.4，建議 24）
npm run dev        # 本機預覽：http://localhost:4321/hcsi-lab/（注意 /hcsi-lab/）
npm run build      # 完整建置＋schema 檢查。任何修改完成前都必須通過
npm run preview    # 預覽建置結果
```

沒有測試框架；**`npm run build` 通過就是驗收標準**。改了頁面請再用 `npm run dev` 實際打開相關網址確認。

## 架構

| 路徑 | 用途 | 誰改 |
|---|---|---|
| `src/content/{members,publications,news,research}/` | 一筆一檔的內容 | Pages CMS（人類）；你只在使用者要求時改 |
| `src/content/settings/site.yml` | 實驗室基本資料（單一檔） | Pages CMS |
| `src/content.config.ts` | 所有 collection 的 zod schema 與 enum（`MEMBER_ROLES`、`PUB_TYPES`、`RESEARCH_GROUPS`、`AVATAR_STYLES`） | 程式 |
| `.pages.yml` | Pages CMS 後台欄位設定 | 程式 |
| `src/lib.ts` | 讀取內容並排序的函式（`getMembers`、`getPubs`、`getNews`、`getTopics`、`getSite`）、`u()`、其他工具 | 程式 |
| `src/pages/` | 檔案即路由；`[slug].astro` 用 `getStaticPaths()` | 程式 |
| `src/layouts/Layout.astro` | 共用頁首、選單、頁尾；props `title`、`active`、`description` | 程式 |
| `src/config/nav.ts` | 主選單與 `NAV` 索引常數 | 程式 |
| `src/data/*.json` | 尚未搬進後台的資料（首頁輪播、教授學經歷、大學專題、日常照片） | 程式 |
| `src/scripts/lala.ts` | 拉拉看頭像（WebGL） | 程式 |
| `src/styles/global.css` | 全站樣式與 CSS 變數 | 程式 |
| `public/` | 原樣輸出；`public/uploads/` 是 CMS 上傳區 | — |
| `.github/workflows/deploy.yml` | CI/CD | 程式（勿隨意改） |
| `Dockerfile`、`nginx.conf` | 實驗室 VM 備援站（同樣在 `/hcsi-lab/` 底下） | 程式 |

## 必須遵守的規則

1. **站內網址一律經過 `u()`**（`import { u } from '../lib'`）。網站部署在 `/hcsi-lab/` 底下：
   - 正確：`href={u('/members/')}`、`src={u(m.data.photo)}`、`href={u(`/news/${n.id}/`)}`
   - 錯誤：`href="/members/"`、`src="/images/x.jpg"`
   - `mailto:`、`tel:`、外部網址不必包（包了也無害）。`u()` 遇到已含 `/hcsi-lab` 的路徑不會重複加。
   - 送到瀏覽器端 JS 的路徑（例如 `define:vars` 的資料）要在 frontmatter 先用 `u()` 處理。
2. **不要用 `u` 當變數或參數名稱**（例如 `.map((u) => …)`），會遮蔽 `u()`，建置時出現 `u is not a function`。
3. **schema 與 `.pages.yml` 必須一一對應**：欄位名稱、必填、enum 選項、list。改一邊就要改另一邊。Markdown 內文在 `.pages.yml` 固定叫 `body`（`type: rich-text`），不寫進 schema。
4. **enum 選項只定義在 `src/content.config.ts`**，頁面從那裡 import，不要寫死字串清單。
5. **每個 schema 外面包 `clean(...)`**：Pages CMS 清空欄位時會寫入 `""` 或 `null`，`clean()` 會先移除，選填欄位與 `.default()` 才會正常。
6. **圖片／檔案欄位用 `path`**（`src/content.config.ts` 裡定義，要求以 `/` 或 `http(s)://` 開頭）。Pages CMS 上傳後寫入的路徑是 `/hcsi-lab/uploads/...`（`.pages.yml` 的 `media.output`）。
7. **選填欄位缺值時頁面要正常顯示**：用 `{x && …}` 或預設值，不要假設一定有。
8. **collection 讀出來的順序不固定**：排序寫在 `src/lib.ts` 的讀取函式裡。
9. **完成前執行 `npm run build`**，並把結果告訴使用者。失敗就修到通過，不要留下壞掉的建置。
10. **不要 commit 秘密或個人資料**：repo 是公開的，commit 過就永久留在歷史。不要放密碼、token、金鑰、別人沒同意公開的照片或聯絡方式。
11. **Git**（完整流程見 `CONTRIBUTING.md`）：
    - 開工前 `git switch main && git pull --rebase`。小改（文字、圖片、單一檔案）可直接在 `main` commit；大改（新頁面、版面、多檔案、schema）開分支 `git switch -c <類型>/<簡述>`（例如 `feat/awards-page`），不確定就開分支。
    - 使用者說網站壞了要回滾：用 `git revert <SHA>`（不要 reset／force push），並提醒他可先到 Actions → Deploy → Run workflow 填舊 SHA 立即救線上（見 CONTRIBUTING.md）。
    - 一個分支只做一件事；完成後用 `gh pr create` 開 PR，內文寫改了什麼、`npm run build` 結果、截圖（改到畫面時）。不要自己 merge。
    - **禁止 `git push --force`、禁止刪除 `main`**（GitHub ruleset 也會擋）。被拒絕就 `git pull --rebase` 後再 push。
    - commit 訊息用繁體中文、一句話說清楚改了什麼。
    - 除非使用者明確要求，不要自己 push；push 前先讓使用者看過改動。
11a. **多人同時開發**（很多人和 AI 同時在推 `main`）：
    - 開工前：`gh issue list` 看有沒有人已認領同一件事；使用者要做的事沒有 issue，就提議 `gh issue create` 並指派給他（`--assignee @me`）。別人認領中的不要做，先告訴使用者。
    - commit 前、push 前都 `git pull --rebase`。push 被拒就再 rebase 一次再 push，最多重試 3 次，仍失敗就停下來回報。
    - **rebase 衝突**：兩邊的改動都保留後 `git rebase --continue`；無法判斷就 `git rebase --abort` 並回報使用者。**禁止**用 `git reset --hard`、`git checkout -- .`、`git stash drop`、`git push --force`、`--no-verify` 解決任何問題。
    - 只改任務需要的行：不要重排、重新格式化或「順手整理」共用檔案（`global.css`、`Layout.astro`、`nav.ts`、`content.config.ts`、`.pages.yml`、`package*.json`），這是衝突的主要來源。改這些檔案一律開分支發 PR。
    - 不要新增套件（`npm install <pkg>`），除非使用者明確要求並開 PR：`package-lock.json` 幾乎一定衝突。
    - pre-push hook 會跑 `npm run build`；失敗就修，不可跳過。
12. **不要動這些，除非使用者明確要求並理解後果**：`.github/workflows/deploy.yml`、`astro.config.mjs` 的 `site`／`base`、`.pages.yml` 的 `media`、`package.json` 的 Astro 主版本。
13. **改欄位名稱時連舊內容一起改**：所有 `src/content/` 下用到該欄位的檔案都要更新，否則建置失敗。
14. **拉拉看**：手機收集頁 `src/pages/lala.astro` 把照片存成 `public/lala/<成員檔名>.jpg`；`getMembers()` 看到這個檔、且成員沒自行設定拉拉看時，自動改用拉拉看（`lalaUploaded()`）。`src/data/lala-upload.json` 的 `open` 由管理員控制，不要自己改。其餘：`members` 的 `avatar_style: 拉拉看` 必須有 `lala_photo`，且檔案要存在於 `public/`（`getMembers()` 會檢查）。眨眼／微笑位置依 `src/scripts/lala.ts` 的 `EYES`／`MOUTH`，與 `public/lala-photo-guide.svg` 的紅點一致，改一邊要改另一邊。不要把任何真人照片加進 repo 當範例。
15. Astro 與 Pages CMS 的 API 會隨版本改變。不確定寫法時先查官方文件（docs.astro.build、pagescms.org/docs），不要憑記憶猜。注意 Astro 7 的 zod 從 `astro/zod` import，loader 從 `astro/loaders` import；預設 Markdown 處理器不是 unified，`markdown.rehypePlugins` 需要另裝 `@astrojs/markdown-remark`。

## 新成員第一次開工（使用者剛 clone、說「幫我開始」或沒有明確任務時，主動照做）

使用者通常只收到一句「clone 下來叫 AI 讀」，其他都靠你帶。一次做一步，每步用一句話告訴使用者在做什麼。

1. **環境**：`node -v`（需 >= 22.23.4）→ `npm install` → `npm run build` 確認可建置。缺 Node 就教使用者安裝 Node.js 24 LTS。
2. **身分**：`git config user.name`／`user.email` 沒設就請使用者提供後設定；`gh auth status` 確認登入的帳號是收到協作邀請的那個。
3. **讀規則**：向使用者用三句話摘要 `TEACHER_REQUIREMENTS.md`、`CONTRIBUTING.md` 的重點（老師要求優先、小改可直接 push、大改開分支發 PR 給管理員）。
4. **填自己的成員資料**：
   - 問使用者中文姓名，在 `src/content/members/` 找 `name` 相同的檔（姓名可能有錯字，找到相近的要跟使用者確認）；沒有就新增 `<英文姓名拼音，小寫、連字號>.md`。
   - 逐一詢問並填寫：`name_en`、`role`（只能是 `MEMBER_ROLES` 之一）、`enroll_year`、`email`、`edu`（學歷）、`topic`（研究題目）、`interests`（list）、`instagram`（可空）。把 `[… — 待補]` 佔位字換成實際內容；使用者不想填的欄位整行刪掉，不要留佔位字。
   - **照片**：只放使用者本人提供、同意公開的照片，存到 `public/uploads/`，`photo: /hcsi-lab/uploads/<檔名>`。沒有就不放（會顯示預設頭像）。不可替別人填資料或放別人的照片。
   - 不要改 `order`，除非使用者要求。
   - **拉拉看頭像（一定要提醒）**：若 `src/data/lala-upload.json` 的 `open` 是 `true`，告訴使用者「用手機打開 https://prof-shih.github.io/hcsi-lab/lala/ ，選名字、拍照、對準紅點、照指示傳上 GitHub」。不要在電腦上替他處理照片，也不要自己改 `avatar_style`／`lala_photo`：上傳到 `public/lala/<成員檔名>.jpg` 後網站會自動切換。
5. `npm run build` 通過 → 給使用者看 `git diff` → 使用者同意後 commit（例：「更新陳洺安的成員資料」）並 push `main`（這是小改）。
6. 告訴使用者：網站約 2～5 分鐘後更新，網址 https://prof-shih.github.io/hcsi-lab/members/ ；之後想開發新功能，到 `gh issue list` 挑沒人認領的（多半對應 `TEACHER_REQUIREMENTS.md` 未完成項目），認領後再動手。

## 常見任務

### 新增一種後台可編輯的內容（例如「獲獎紀錄」）

1. `src/content.config.ts`：新增 `defineCollection({ loader: md('awards'), schema: clean(z.object({ … })) })`，加進最後的 `collections`。
2. `.pages.yml`：在 `content:` 下、`site` 之前新增對應 collection（`path: src/content/awards`、`format: yaml-frontmatter`、`filename`、`fields` 與 schema 一致，另加 `body`）。
3. `src/lib.ts`：新增 `getAwards()`，在這裡排序。
4. `src/pages/awards/index.astro`（需要內頁再加 `[slug].astro`，參考 `src/pages/news/`）。所有網址用 `u()`。
5. 需要的話在 `src/config/nav.ts` 的 `nav` 與 `NAV` 加項目（選單最多約 10 項），頁面的 `active` 用 `NAV.xxx`。
6. 放一筆範例內容，`npm run build` 通過。

### 新增欄位到既有內容

schema 加欄位（通常 `.optional()` 或 `.default()`，避免舊資料失效）→ `.pages.yml` 加對應欄位 → 頁面顯示（處理缺值）→ build。

### 把 `src/data/*.json` 搬進後台

建立 collection（或 `settings` 那種單一檔）→ 用腳本把 JSON 轉成 `src/content/` 下的檔案 → 頁面改用 `src/lib.ts` 的讀取函式 → 刪除舊 JSON → build 並比對頁面內容與數量沒變。

## 回報方式

完成後用繁體中文告訴使用者：改了哪些檔案、為什麼、`npm run build` 的結果、需要他們自己做的事（例如到後台填資料、push、在 GitHub 設定）。遇到規則與使用者要求衝突時，先說明風險再請使用者決定。
