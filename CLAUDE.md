# Muse AI · 大英博物馆 AI 导览原型

作品集里的一个交互原型：`curator-prototype.html`（单文件，HTML + CSS + JS 全部内联），配图在 `src/projects/curator/`。
仓库里其他文件（index.html、project-*.html 等）是作品集网站的其他项目，改 Muse AI 时不要动它们。

回复用中文。

## 项目背景
- Goldsmiths《The User Experience of AI》小组课程项目（Group 3，2026）。
- 目标用户：国际游客 / 国内深度游客 / 亲子家庭，三种角色在引导页选择，决定讲解方式、路线和海报。
- 三个设计重点：① 识别失败时有降级路径（视觉识别 → NFC → 展签号）；② 版式由 AI 按展品与访客编排，不是模板填空；③ 每句讲解可核验、可纠错（馆方档案 / AI 推断分开标注）。

## 页面（`SCREENS`）
splash 启动页 → onboard 角色引导 → **home 首页** / guide 展品识别 / detail 展品详情 / chat 问答 / route 路线 / report 参观报告 / profile 我的。
- 底部标签栏（`TABS`）：首页、识别、路线、我的。问答不在标签栏，从右下角金色 AI 光球（`#fab`）和首页搜索框进入。
- 返回键统一用 `goBack(fallback)`，回到上一页（`S.prevScreen`）。
- 切页用 `go(id)`，打开展品详情用 `openObj(id)`（必须指定展品，不要直接 `go('detail')`）。

## 代码结构（在 curator-prototype.html 里搜索）
- `const T = {` 中英双语文案；静态元素用 `data-t="key"`，新增文案两种语言都要加。
- `const OBJECTS` 三件有完整讲解的展品：david 大维德花瓶、cong 良渚玉琮、scroll 女史箴图。
- 龙纹琉璃砖、象牙雕花扇、玉茶壶没有讲解，点击走 `openStub()`（"讲解整理中"，不生成内容）。
- `const STOPS` 路线；`acceptDivert()` 智能改道（真实调整顺序和时长，可撤销）。
- `renderHome()` 首页；`HOME_ITEMS` / `HOME_CATS` 首页展品与分类。
- `openPoster()` + `POSTER_DATA` 四种报告海报：研究笔记 / 文化之旅 / 故事记录 / 打卡图鉴。
- AI 问答引擎：搜索 `AI 问答引擎`。`AI_ENDPOINT` 为空时用本地资料库检索（`buildKB` / `retrieve` / `localAnswer`，资料里没有就不答）；填了代理地址就调用大模型（`remoteAnswer`），失败自动回退本地。`CURATED` 是四个推荐入口的预置回答。
- 代理：`museai-worker.js`（Cloudflare Worker，目前按 Anthropic Claude API 写）；部署步骤见 `AI问答部署说明.md`。

## 视觉规范
- 主题覆盖层在 CSS 末尾：搜索 `Muse AI · 深墨底 + 鎏金`。旧的浅色 jade 主题还在上方，被覆盖，不要删 token 名（`--jade-*` 现在映射为金色系）。
- 颜色：底 `--paper` #262C2D；普通卡片 `--surface`；重点区块纯黑 `--deep` #0D1011 + 金色细边；强调金 `--gold` #E2CC98；金底上的文字用 `--gold-ink` 深色。
- 字体：标题/展品名用衬线 `--font-serif`（宋体），正文无衬线。
- 圆角（搜索 `设计规范 · 圆角`）：6 标签徽章 / 12 缩略图输入框 / 16 常规卡片 / 20 主视觉卡片 / 28 弹层与标签栏 / 999 按钮胶囊 / 50% 圆形图标按钮。
- 识别置信度三档：高=实心金、中=黑底琥珀橙描边、低=黑底珊瑚红虚线。
- 视觉参考：小红书「有料设计素材 · 塑古寻踪」非遗博物馆 APP（深墨底 + 鎏金、底部金色托盘标签栏）。

## 待办
- [ ] 接入 DeepSeek API：把 `museai-worker.js` 改成调用 DeepSeek（OpenAI 兼容格式），问答页右上角模型名（`MODELS`）一起改掉，不要再显示 Claude。
- [ ] 语音提问目前是模拟的（`voiceDone()` 固定问同一个问题），可改用浏览器 Web Speech API。
- [ ] 楼层地图 `floorplan.jpg` 底图是示意图，不是大英博物馆真实布局。
- [ ] 确认展品信息：玉茶壶（照片 IMG_2985）的名称与年代；龙纹琉璃砖、象牙扇的展厅号（目前写 33 号厅）。
- [ ] 旧的 AI 生成图（dragon-vessel.jpg、cong-tube.jpg、mount-tai-scroll.jpg 等）已不再使用，可从仓库删除。

## 工作方式
- 改完用浏览器实际打开检查（手机尺寸约 430×932），中英文都看；控制台不能有报错。
- 推送前先让我确认效果。
- 启动页底部"学生概念项目 · 非大英博物馆官方应用"要保留。
