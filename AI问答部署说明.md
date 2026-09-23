# 让 AI 问答接上真实大模型

不做下面这些步骤，原型也能用：问答会自动用**离线资料库检索**来回答，只摘录馆方资料，资料里没有的问题会直接说没有，不会编造。

要接上真实大模型（DeepSeek），需要一个小代理来保管 API Key。Key 不能直接写进网页，否则任何人打开网页源代码都能看到。代理用 Cloudflare Worker 搭建，免费额度够作品集用。

## 1. 获取 API Key
1. 登录 https://platform.deepseek.com ，创建一个 API Key。
2. 在余额页面按需充值/设置限额，防止被人刷。

## 2. 部署代理
1. 注册或登录 https://dash.cloudflare.com ，进入 **Workers & Pages → Create → Create Worker**，名字填 `museai-proxy`。
2. 点 **Edit code**，删掉默认代码，把 `museai-worker.js` 的全部内容粘贴进去，然后点 **Deploy**。
3. 进入这个 Worker 的 **Settings → Variables and Secrets**，添加：
   - `DEEPSEEK_API_KEY`：类型选 **Secret**，值填第 1 步的 Key
   - `ALLOWED_ORIGIN`：`https://yrong6781-dotcom.github.io`（只允许你的作品集网站调用）
   - （可选）`MODEL_SONNET`、`MODEL_OPUS`、`MODEL_HAIKU`：对应问答页右上角三档模型的模型 ID。不填的话分别用代码里的默认值 `deepseek-chat`、`deepseek-reasoner`、`deepseek-chat`，可用模型见 https://api-docs.deepseek.com/quick_start/pricing 。
4. 复制 Worker 的地址，形如 `https://museai-proxy.xxx.workers.dev`。

## 3. 把地址填进原型
打开 `curator-prototype.html`，搜索 `AI_ENDPOINT`，把引号里填上第 2 步复制的地址：

```js
const AI_ENDPOINT = "https://museai-proxy.xxx.workers.dev";
```

保存后推送到 GitHub。

## 4. 怎么确认接上了
在问答页随便问一个问题，看回答下方的小标签：
- `DeepSeek Chat · 依据馆方资料生成`：回答来自大模型
- `离线资料检索 · 未经 AI 改写`：还没配置代理
- `大模型暂不可用 · 已改用离线资料检索`：代理出错或超时，已自动切换到离线模式

说明：页面上的四个推荐问题（推荐问题、展品对比、文化转译、时代脉络）使用策展人预置、核对过的回答，保证演示效果稳定，所以不会调用大模型。
