/**
 * LLM client: gemma4 via OpenAI-compatible /v1/chat/completions.
 * API-ключ живёт только на сервере (.env) и не отправляется на клиент.
 */
const config = {
  baseUrl: process.env.LLM_BASE_URL || "https://llm.alem.ai/v1",
  apiKey: process.env.LLM_API_KEY || "",
  model: process.env.LLM_MODEL || "gemma4",
  timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || "45000", 10),
};

/**
 * LLM часто оборачивает JSON в ```json ... ``` или в лишний текст —
 * снимаем markdown-ограждения и вытаскиваем первый JSON-блок.
 */
function extractJson(text) {
  if (!text) throw new Error("Empty response from LLM");
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const firstObj = t.indexOf("{");
  const firstArr = t.indexOf("[");
  let start = -1;
  if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) start = firstObj;
  else if (firstArr !== -1) start = firstArr;
  if (start === -1) throw new Error("JSON not found in LLM response");
  const close = t[start] === "{" ? "}" : "]";
  const end = t.lastIndexOf(close);
  if (end <= start) throw new Error("JSON not found in LLM response");
  return JSON.parse(t.slice(start, end + 1));
}

async function chatOnce(systemPrompt, userPrompt, timeoutMs = config.timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned empty content");
    return extractJson(content);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Запрос к LLM с ожиданием строгого JSON.
 * По умолчанию — одна повторная попытка при сбое (таймаут, сетка, битый JSON).
 * opts: { attempts, timeoutMs } — для «быстрых» эндпоинтов (аналитика).
 */
async function chatJSON(systemPrompt, userPrompt, opts = {}) {
  const attempts = Math.max(1, opts.attempts || 2);
  const timeoutMs = opts.timeoutMs || config.timeoutMs;
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await chatOnce(systemPrompt, userPrompt, timeoutMs);
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastErr;
}

module.exports = { chatJSON, config };
