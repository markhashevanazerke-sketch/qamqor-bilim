/**
 * one-shot: replaces direct Gemini calls in public/js/app.js
 * with local backend endpoints /api/adapter and /api/todo.
 */
const fs = require("fs");
const FILE = require("path").join(__dirname, "..", "public", "js", "app.js");
let s = fs.readFileSync(FILE, "utf8");

// --- runLessonAdapterAI: prompt+Gemini+local-fallback block -> backend call ---
const a1 = s.indexOf('const langName = state.lang === "kk" ? "Kazakh (Қазақ тілі)" : "Russian (Русский язык)";');
const a2 = s.indexOf("state.adapterData = parsed;");
if (a1 === -1 || a2 === -1 || a2 < a1) throw new Error("adapter anchors not found");
const newA = `let parsed = null;
      try {
        const res = await fetch("/api/adapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleVal, text: textVal, lang: state.lang })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        parsed = await res.json();
      } catch (e) {
        // Сервер сам отвечает локальным фолбэком при сбое LLM; сюда попадаем только при потере сети
        showToast(state.lang === "ru" ? "Соединение с сервером потеряно" : "Серверге байланыс жоқ", "⚠️");
        btn.disabled = false;
        spinner.classList.add("hidden");
        return;
      }

      state.adapterData = parsed;`;
s = s.slice(0, a1) + newA + s.slice(a2 + "state.adapterData = parsed;".length);

// --- runTaskBreakerAI: prompt+Gemini+local-fallback block -> backend call ---
const b1 = s.indexOf("const countMap = { 1: 3, 2: 5, 3: 7 };");
const b2 = s.indexOf("state.todoTaskTitle = taskText;");
if (b1 === -1 || b2 === -1 || b2 < b1) throw new Error("todo anchors not found");
const newB = `let stepsArr = null;
      try {
        const res = await fetch("/api/todo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: taskText, level: state.todoLevel, lang: state.lang })
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.steps)) stepsArr = data.steps;
        }
      } catch (e) {}

      if (!stepsArr || !Array.isArray(stepsArr)) {
        const isKK = state.lang === "kk";
        stepsArr = isKK
          ? [
              \`Жұмыс орнын дайындау: «\${taskText}»\`,
              "Қажетті құралдарды үстелге қою",
              "Бірінші кішкентай бөлігін орындау",
              "Терең тыныс алып, 1 минут демалу",
              "Қалған бөлігін байсалды аяқтау"
            ]
          : [
              \`Подготовить рабочее место для: «\${taskText}»\`,
              "Положить рядом всё необходимое",
              "Сделать самую первую маленькую часть",
              "Сделать спокойный вдох и выдох",
              "Завершить оставшуюся часть без спешки"
            ];
      }

      state.todoTaskTitle = taskText;`;
s = s.slice(0, b1) + newB + s.slice(b2 + "state.todoTaskTitle = taskText;".length);

fs.writeFileSync(FILE, s);
console.log("app.js patched: AI calls now go through /api/adapter and /api/todo");
