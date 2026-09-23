/**
 * Muse AI 问答代理（腾讯云 云函数 SCF · Node.js 运行时）
 * 作用：接收原型发来的问题和馆方资料摘录，调用 DeepSeek API，按固定格式返回。
 * API Key 只存在云函数的环境变量里，不会出现在网页代码中。
 *
 * 部署方式：云函数 SCF，运行环境选 Node.js 16 / 18，
 * 触发方式选「HTTP函数」或绑定一个 API 网关触发器（两者的 event 格式一致）。
 *
 * 需要在函数「环境变量」里添加：
 *   DEEPSEEK_API_KEY    你的 DeepSeek API Key（在 https://platform.deepseek.com 创建）
 *   ALLOWED_ORIGIN      允许调用的网站，例如 https://yrong6781-dotcom.github.io
 *   MODEL_OPUS / MODEL_SONNET / MODEL_HAIKU   （可选）三档对应的模型 ID，
 *                       不填则分别用 deepseek-reasoner / deepseek-chat / deepseek-chat，
 *                       可选模型见 https://api-docs.deepseek.com/quick_start/pricing
 *
 * 入口函数名（创建函数时填）：index.main_handler
 */

"use strict";

const https = require("https");

const SYSTEM = `你是大英博物馆 AI 导览「Muse AI」。回答访客关于展品的问题。
规则：
1. 事实只能来自【馆方资料】。能被资料直接支持的句子标为 archive，并写上资料编号 s（S1 → 1）。
2. 你自己的解释、类比、背景补充标为 inferred。常识性背景可以写，但要谨慎，不确定就不写。
3. 资料里没有答案时，直说资料库里没有，不要编造年代、尺寸、人名、数字。
4. 不回答估价、真伪鉴定、买卖相关问题。
5. 按访客类型调整讲法：intl 国际游客多用跨文化类比；local 国内深度游客讲工艺和细节；family 亲子用简单的故事和短句。
6. 用 lang 指定的语言回答（zh 中文，en 英文）。最多 3 段，每段不超过 80 个汉字或 60 个英文单词。
7. 只输出 JSON，不要任何其他文字：
{"paras":[{"k":"archive","s":1,"t":"……"},{"k":"inferred","t":"……"}],"followups":["追问1","追问2","追问3"]}`;

exports.main_handler = async (event, context) => {
  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin || "";
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  const cors = {
    "Access-Control-Allow-Origin": allowed === "*" ? "*" : (origin === allowed ? origin : allowed),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };

  const method = event.httpMethod || (event.requestContext && event.requestContext.httpMethod) || "";
  if (method === "OPTIONS") return resp(204, cors, "");
  if (method !== "POST") return resp(405, cors, "POST only");
  if (allowed !== "*" && origin !== allowed) return resp(403, cors, "forbidden");

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json({ error: "bad json" }, 400, cors); }
  const question = String(body.question || "").slice(0, 500);
  if (!question) return json({ error: "empty question" }, 400, cors);

  const models = {
    opus: process.env.MODEL_OPUS || "deepseek-reasoner",
    sonnet: process.env.MODEL_SONNET || "deepseek-chat",
    haiku: process.env.MODEL_HAIKU || "deepseek-chat",
  };
  const model = models[body.tier] || "deepseek-chat";
  const sources = Object.entries(body.sources || {}).map(([k, v]) => `S${k} = ${v}`).join("\n");
  const kbContext = String(body.context || "").slice(0, 6000);

  const history = Array.isArray(body.history) ? body.history.slice(-6)
    .filter(m => (m.role === "user" || m.role === "assistant") && m.content)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 1500) })) : [];

  const userMsg =
`lang: ${body.lang === "en" ? "en" : "zh"}
visitor: ${body.visitor || "local"}
当前展品: ${body.object || "未指定"}

【资料编号】
${sources}

【馆方资料】（[S数字] 为档案原文，[AI] 为已有的解读）
${kbContext || "（未检索到相关资料）"}

【访客问题】
${question}`;

  // 保证消息以 user 开头、user/assistant 交替
  const history2 = [];
  for (const m of history) {
    if (!history2.length && m.role !== "user") continue;
    if (history2.length && history2[history2.length - 1].role === m.role) continue;
    history2.push(m);
  }
  if (history2.length && history2[history2.length - 1].role === "user") history2.pop();

  const messages = [{ role: "system", content: SYSTEM }, ...history2, { role: "user", content: userMsg }];

  let data;
  try {
    data = await callDeepSeek(model, messages);
  } catch (e) {
    return json({ error: "upstream " + (e && e.message ? e.message : "error") }, 502, cors);
  }

  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return json({ error: "no json" }, 502, cors);
  try {
    const out = JSON.parse(m[0]);
    return json({ paras: out.paras || [], followups: out.followups || [] }, 200, cors);
  } catch {
    return json({ error: "bad model json" }, 502, cors);
  }
};

function callDeepSeek(model, messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ model, max_tokens: 800, messages });
    const req = https.request({
      hostname: "api.deepseek.com",
      path: "/chat/completions",
      method: "POST",
      headers: {
        "authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
      },
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(String(res.statusCode)));
          return;
        }
        try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function json(obj, statusCode, cors) {
  return resp(statusCode, { ...cors, "content-type": "application/json; charset=utf-8" }, JSON.stringify(obj));
}

function resp(statusCode, headers, body) {
  return { isBase64Encoded: false, statusCode, headers, body };
}
