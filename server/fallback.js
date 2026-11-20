/**
 * Локальный фолбэк (ported из прототипа): если LLM недоступна —
 * платформа продолжает работать на простых правилах.
 */

function localAdapterFallback(title, text, lang) {
  const kk = lang === "kk";
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const simple = sentences.length ? sentences : [text];
  const steps = [
    { icon: "📖", title: kk ? "Оқу" : "Чтение", text: kk ? "Бастапқы сөйлемді мұқият оқу" : "Прочитать первое предложение внимательно" },
    { icon: "🧠", title: kk ? "Түсіну" : "Понимание", text: kk ? "Негізгі ойды айту" : "Сказать главную мысль своими словами" },
    { icon: "✍️", title: kk ? "Жазу" : "Запись", text: kk ? "Ең маңызды сөзді жазу" : "Записать самое важное слово" },
    { icon: "⭐", title: kk ? "Мақтау" : "Похвала", text: kk ? "Өзіңді мақта: «Супер!»" : "Похвалить себя: «Супер!»" }
  ];
  const words = text.split(/\s+/).map((w) => w.replace(/[.,;:!?«»()"']/g, "")).filter((w) => w.length > 3).slice(0, 3);
  const pecs = (words.length ? words : [kk ? "мәтін" : "текст", kk ? "тақырып" : "тема", kk ? "ой" : "мысль"]).map((w, i) => ({
    icon: ["📚", "✨", "💡"][i] || "📚",
    word: w,
    desc: kk ? "Мәтіндегі маңызды сөз" : "Важное слово из текста"
  }));
  const quiz = {
    q: kk ? `«${title}» тақырыбында не турды?` : `О чём был текст «${title}»?`,
    options: [
      sentences[0] || text,
      ...(kk ? ["Шоу мен қвидан турды", "Ойын туралы болатын"] : ["Об игре и приключениях", "О космическом полёте"]),
    ],
    correct: 0,
  };
  return { title, simple, steps, pecs, quiz };
}

function localTodoFallback(task, level, lang) {
  if (lang === "kk") {
    if (level === 1) return { steps: ["Басталу", `${task} бойынша бір оңай әрекет`, "Аяқталды, мақтау!"] };
    if (level === 2) return { steps: ["Орынға отыру", `${task} — 1-ші қадам`, "Керек заттарды жинау", `${task} — 2-ші қадам`, "Аяқтау және мақтау"] };
    return { steps: ["Орынға отырып, тыныштық", "Тапсырманы ашу", "Бірінші оңай қадам", "1 минуттық демалыс", "Екінші қадам", "Үшінші қадам", "Аяқтау: «Дайын!»"] };
  }
  if (level === 1) return { steps: ["Начать", `Сделать один лёгкий шаг по: ${task}`, "Завершить и похвалить себя"] };
  if (level === 2) return { steps: ["Садиться на место", `${task} — шаг 1`, "Подготовить нужные вещи", `${task} — шаг 2`, "Завершить и похвалить себя"] };
  return { steps: ["Устроиться и выдохнуть", `Открыть задачу: ${task}`, "Первый лёгкий шаг", "Отдых 1 минуту", "Второй шаг", "Третий шаг", "Финал: «Готово! Молодец!»"] };
}

module.exports = { localAdapterFallback, localTodoFallback };
