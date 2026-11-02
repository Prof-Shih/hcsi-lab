# 開發準則

給在 `Prof-Shih/hcsi-lab` 寫程式的實驗室成員。只改內容（成員、論文、消息）請用後台，看 [docs/editing-guide.md](docs/editing-guide.md)。

## 原則

1. **多用 AI 開發**：Claude Code、Copilot、Codex、Cursor 都可以。它們會自動讀 [AGENTS.md](AGENTS.md) 的專案規則，你只要用中文描述想要的結果。
2. **不要直接改 `main`**：`main` 一更新就會部署到線上網站。每件事開一個分支，用 PR 合併。
3. **`npm run build` 通過才算完成**：沒有測試框架，build 會順便檢查所有內容欄位。
4. **AI 寫的程式你要看得懂**：送 PR 前自己讀過一遍 diff，看不懂就請 AI 解釋，不要把看不懂的東西合進去。

## 流程

```bash
# 1. 第一次
git clone https://github.com/Prof-Shih/hcsi-lab.git
cd hcsi-lab && npm install

# 2. 每次開工：從最新的 main 開分支
git switch main && git pull --rebase
git switch -c feat/awards-page

# 3. 叫 AI 開發，例如：
#    「新增一個獲獎紀錄頁，後台可以編輯，照 AGENTS.md 的常見任務做」
npm run dev        # 本機看效果：http://localhost:4321/hcsi-lab/
npm run build      # 必須通過

# 4. 提交並開 PR
git add -A && git commit -m "新增獲獎紀錄頁"
git push -u origin feat/awards-page
gh pr create --fill   # 或到 GitHub 網頁按 Compare & pull request
```

5. PR 會自動跑 **Build** 檢查，並自動請網站管理員 **陳洺安（@machencompeq）** review。
6. **只有管理員會 merge**，其他人開完 PR 就好，不要自己按 merge。要修改時直接在同一個分支繼續 commit、push，PR 會自動更新。
7. merge 後 2～5 分鐘網站自動更新。回到第 2 步開下一個分支。

## 分支命名

`<類型>/<簡短英文描述>`

| 類型 | 用途 | 例子 |
|---|---|---|
| `feat/` | 新功能、新頁面 | `feat/awards-page` |
| `fix/` | 修 bug | `fix/member-photo-size` |
| `style/` | 只改外觀 | `style/nav-underline` |
| `docs/` | 改說明文件 | `docs/contributing` |
| `chore/` | 套件更新、設定 | `chore/astro-upgrade` |

## 給 AI 的好提示

- 先說**目標**，再說**限制**：「成員頁照片改成圓形，手機版也要正常，不要改到其他頁」。
- 要它**先計畫再動手**：「先列出要改哪些檔案，我確認後再改」。
- 改完要它**跑 `npm run build` 並回報結果**。
- 卡住時把錯誤訊息整段貼給它，不要只說「壞了」。

## 不要做

- `git push --force`、刪除 `main`
- 把密碼、token、別人沒同意公開的照片或聯絡方式 commit 進來（repo 是公開的，歷史永久保留）
- 沒講好就改 `.github/workflows/`、`astro.config.mjs` 的 `site`／`base`、`.pages.yml` 的 `media`
- 一個 PR 混好幾件不相關的事
- 自己 merge PR（由管理員 merge）

## 遇到問題

- push 被拒絕：`git pull --rebase` 後再 push。
- PR 的 Build 紅叉：點 **Details** 看錯誤，貼給 AI 修。
- 分支落後 `main` 太多：`git pull --rebase origin main`，有衝突請 AI 協助解。
