---
title: "運動影像分析"
title_en: "Sports Video Analytics"
summary: "人體姿態估測、球員追蹤、球衣號碼辨識、場地線相機校正、事件偵測——把比賽影片變成教練看得懂的數據。"
cover: "/images/pose2.jpg"
order: 2
group: "AIoT 生理訊號分析與低延遲傳輸"
tagline: "從轉播畫面看懂足球、籃球、網球、高爾夫"
short: "姿態估測、球員追蹤、球衣號碼辨識、場地線相機校正，把比賽影片變成數據。"
color: "#2F3B36"
gallery:
  - src: "/images/pose.jpg"
    cap: "WebNN 邊緣姿態估測"
  - src: "/images/pose2.jpg"
    cap: "打擊動作骨架分析"
  - src: "/images/baseball-gui.jpg"
    cap: "棒球轉播語意分析系統（2003）"
  - src: "/images/soccer-lines.jpg"
    cap: "足球場線偵測與場地定位（2005）"
  - src: "/images/jersey.jpg"
    cap: "球員球衣號碼辨識（2005）"
  - src: "/images/referee.jpg"
    cap: "足球事件分析：裁判偵測（2006）"
  - src: "/images/scoreboard.jpg"
    cap: "比分字幕框擷取與解讀（2008）"
  - src: "/images/baseball-frames.jpg"
    cap: "注意力排序的精彩關鍵畫面（2009）"
skills:
  - "姿態估測"
  - "多物件追蹤"
  - "相機校正"
  - "事件偵測"
  - "輕量化模型"
keywords_zh: "足球|籃球|網球|高爾夫|姿態|校準|校正|好球帶|球衣|軌跡"
keywords_en: "soccer|basketball|tennis|golf|sports|jersey|trajectory|calibration|pose|release point|yoga"
---

## 影片：棒球轉播的視覺注意力模型

施老師博士論文〈A Study on Content-based Attention Ranking and In-game Stats Tagging for Sports Videos〉（2008）的研究：模擬觀眾看轉播時「眼睛會被什麼吸引」，用來找出精彩畫面並排序。

<video class="video-embed" controls preload="none" poster="/hcsi-lab/videos/attention-spatial.jpg" src="/hcsi-lab/videos/attention-spatial.mp4"></video>

空間注意力模型：結合色彩、亮度、方向三種特徵圖。

<video class="video-embed" controls preload="none" poster="/hcsi-lab/videos/attention-temporal.jpg" src="/hcsi-lab/videos/attention-temporal.mp4"></video>

時間注意力圖：畫面中正在動的區域。

<video class="video-embed" controls preload="none" poster="/hcsi-lab/videos/attention-skin.jpg" src="/hcsi-lab/videos/attention-skin.mp4"></video>

膚色注意力圖：找出畫面中的球員。
