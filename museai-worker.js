/**
 * Muse AI 问答代理（Cloudflare Worker）
 * 作用：接收原型发来的问题和馆方资料摘录，调用 Claude API，按固定格式返回。
 * API Key 只存在 Worker 的环境变量里，不会出现在网页代码中。
 *
 * 需要在 Worker 设置里添加：
 *   ANTHROPIC_API_KEY   （Secret）你的 Anthropic API Key
 *   ALLOWED_ORIGIN      允许调用的网站，例如 https://yrong6781-dotcom.github.io
 *   MODEL_OPUS / MODEL_SONNET / MODEL_HAIKU   （可选）三档对应的模型 ID，
 *                       取值见 https://docs.claude.com/en/docs/about-claude/models
 */

const DEFAULT_MODEL = "claude-sonnet-4-5";

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

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": allowed === "*" ? "*" : (origin === allowed ? origin : allowed),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
    if (allowed !== "*" && origin !== allowed) return new Response("forbidden", { status: 403, headers: cors });

    let body;
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400, cors); }
    const question = String(body.question || "").slice(0, 500);
    if (!question) return json({ error: "empty question" }, 400, cors);

    const models = { opus: env.MODEL_OPUS, sonnet: env.MODEL_SONNET, haiku: env.MODEL_HAIKU };
    const model = models[body.tier] || env.MODEL_SONNET || DEFAULT_MODEL;
    const sources = Object.entries(body.sources || {}).map(([k, v]) => `S${k} = ${v}`).join("\n");
    const context = String(body.context || "").slice(0, 6000);

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
${context || "（未检索到相关资料）"}

【访客问题】
${question}`;

    // 保证消息以 user 开头、user/assistant 交替
    const messages = [];
    for (const m of history) {
      if (!messages.length && m.role !== "user") continue;
      if (messages.length && messages[messages.length - 1].role === m.role) continue;
      messages.push(m);
    }
    if (messages.length && messages[messages.length - 1].role === "user") messages.pop();
    messages.push({ role: "user", content: userMsg });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens: 800, system: SYSTEM, messages }),
    });
    if (!r.ok) return json({ error: "upstream " + r.status }, 502, cors);
    const data = await r.json();
    const text = (data.content || []).map(c => c.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "no json" }, 502, cors);
    try {
      const out = JSON.parse(m[0]);
      return json({ paras: out.paras || [], followups: out.followups || [] }, 200, cors);
    } catch {
      return json({ error: "bad model json" }, 502, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
}
