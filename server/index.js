/**
 * Qamqor Bilim — сервер: статика фронтенда + ИИ-эндпоинты (gemma4).
 *
 *   GET  /api/health   — статус и модель
 *   POST /api/adapter  — ИИ-адаптер урока «1 в 4» (Diffit + LittleLit + PECS + Quiz)
 *   POST /api/todo     — умный дробитель задач
 */
require("dotenv").config();
const path = require("path");
const express = require("express");
const { chatJSON, config } = require("./llm");
const { adapterSystem, adapterUser, todoSystem, todoUser } = require("./prompts");
const { localAdapterFallback, localTodoFallback } = require("./fallback");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "200kb" }));

// ---------- validation / normalization ----------

// Уровень сложности -> количество шагов (те же значения, что в прототипе)
const LEVEL_TARGETS = { 1: 3, 2: 5, 3: 7 };

function str(v, max = 4000) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function normalizeAdapter(d, title, text, lang) {
  if (!d || typeof d !== "object") throw new Error("bad shape");
  const simple = (Array.isArray(d.simple) ? d.simple : [])
    .map((s) => str(s, 400))
    .filter(Boolean)
    .slice(0, 5);
  const steps = (Array.isArray(d.steps) ? d.steps : [])
    .map((st) => ({
      icon: str(st?.icon, 4) || "✨",
      title: str(st?.title, 60),
      text: str(st?.text, 200),
    }))
    .filter((st) => st.title || st.text)
    .slice(0, 6);
  const pecs = (Array.isArray(d.pecs) ? d.pecs : [])
    .map((p) => ({ icon: str(p?.icon, 4) || "📚", word: str(p?.word, 60), desc: str(p?.desc, 120) }))
    .filter((p) => p.word)
    .slice(0, 4);
  const q = d.quiz || {};
  const options = (Array.isArray(q.options) ? q.options : [])
    .map((o) => str(o, 160))
    .filter(Boolean)
    .slice(0, 3);
  let correct = Number(q.correct);
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) correct = 0;
  return {
    title: str(d.title, 120) || title,
    simple,
    steps,
    pecs,
    quiz: { q: str(q.q, 240), options, correct },
  };
}

function normalizeTodo(d, target, lang) {
  if (!d || typeof d !== "object") throw new Error("bad shape");
  let steps = [];
  if (Array.isArray(d.steps)) {
    steps = d.steps.map((s) => str(s, 160)).filter(Boolean);
  } else {
    // key-value формат: step_1, step_2, ...
    for (let i = 1; i <= target; i++) {
      const v = str(d["step_" + i], 160);
      if (v) steps.push(v);
    }
  }
  if (!steps.length) throw new Error("empty steps");
  const pool = PAD_STEPS[lang] || PAD_STEPS.ru;
  let i = 0;
  while (steps.length < target && i < pool.length) {
    steps.push(pool[i]);
    i++;
  }
  return { steps: steps.slice(0, target) };
}

// Спокойные «запасные» шаги на случай, если LLM вернёт меньше, чем просили
const PAD_STEPS = {
  ru: [
    "Сделать короткую паузу и выдохнуть",
    "Взять воды и попить",
    "Посмотреть на следующий шаг",
    "Продолжить спокойно и не спеша",
    "Собрать свои вещи на место",
    "Похвалить себя за старание",
  ],
  kk: [
    "Қысқа үзіліс алып, тыныс алу",
    "Суды ішіп алу",
    "Келесі қадамға қарау",
    "Байсалды жалғастыру",
    "Заттарды жинау",
    "Өзіңді жүректен мақтау",
  ],
};

// ---------- API ----------

app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: config.model, llmConfigured: Boolean(config.apiKey) });
});

app.post("/api/adapter", async (req, res) => {
  const title = str(req.body?.title, 200);
  const text = str(req.body?.text, 8000);
  const lang = req.body?.lang === "kk" ? "kk" : "ru";
  if (!text.trim()) return res.status(400).json({ error: "text required" });

  try {
    const raw = await chatJSON(adapterSystem(lang), adapterUser(title, text));
    res.json({ ...normalizeAdapter(raw, title, text, lang), source: "ai" });
  } catch (err) {
    console.warn("[adapter] LLM failed, using local fallback:", err.message);
    res.json({ ...localAdapterFallback(title || "Текст", text, lang), source: "fallback" });
  }
});

app.post("/api/todo", async (req, res) => {
  const task = str(req.body?.task, 500);
  const level = [1, 2, 3].includes(req.body?.level) ? req.body.level : 2;
  const target = LEVEL_TARGETS[level];
  const lang = req.body?.lang === "kk" ? "kk" : "ru";
  if (!task.trim()) return res.status(400).json({ error: "task required" });

  try {
    const raw = await chatJSON(todoSystem(lang, target), todoUser(task));
    res.json({ ...normalizeTodo(raw, target, lang), source: "ai" });
  } catch (err) {
    console.warn("[todo] LLM failed, using local fallback:", err.message);
    res.json({ ...localTodoFallback(task, level, lang), source: "fallback" });
  }
});

// ---------- static frontend ----------

app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, () => {
  console.log(`Qamqor Bilim: http://localhost:${PORT}`);
  console.log(`LLM: ${config.model} @ ${config.baseUrl} (key: ${config.apiKey ? "set" : "MISSING — fallback only"})`);
});
