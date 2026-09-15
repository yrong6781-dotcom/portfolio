# Rong Yan · Portfolio

Rong Yan 的个人作品集网站，展示 UI / 视觉 / 动效设计项目。

## 页面

- **首页** `index.html`：Hero、About Me、Skills、横向滑动的 Projects、页脚动效头像
- **项目详情**
  - `project-bodycode.html` — Bodycode
  - `project-bodycode-admin.html` — Bodycode 后台管理系统
  - `project-grow.html` — Grow
  - `project-sugo.html` — SUGO（含界面 / 弹窗 / 头像框动效视频）
  - `project-muse.html` — Muse AI

## 目录结构

```
index.html               首页
project-*.html           项目详情页
style.css                首页样式
project-detail.css/.js   详情页共用样式与交互（入场动画、滚动显现）
projects-scroll.js       首页项目卡片横向滚动
footer-avatar.js         页脚头像动效（眼睛跟随鼠标）
site-extras.js           全站：自定义鼠标、背景音乐跨页、复制邮箱/电话
main.js                  模板原有的通用脚本
src/                     图片、视频、音乐等静态资源
```

纯静态 HTML / CSS / JS，无需构建。

## 本地预览

```bash
python3 -m http.server 5501
```

然后打开 <http://localhost:5501>。

## 部署

使用 GitHub Pages：仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`。
线上地址：<https://yrong6781-dotcom.github.io/portfolio/>
如需自定义域名，在根目录添加 `CNAME` 文件并在域名服务商处配置 DNS。

## 联系

- 邮箱：1289815855@qq.com
- GitHub：[yrong6781-dotcom](https://github.com/yrong6781-dotcom)

## 致谢与许可

网站基于 [Vinod Jangid](https://github.com/vinodjangid07/vinodjangid07.github.io) 的开源作品集模板修改，模板以 MIT License 发布，见 [LICENSE](./LICENSE)。
作品集中的设计作品版权归 Rong Yan 所有。
