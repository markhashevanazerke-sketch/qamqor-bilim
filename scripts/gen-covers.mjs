// Генерация обложек книг через Alem AI Plus (text-to-image, Qwen-Image-2512)
// Ключ: переменная ALEM_IMAGE_KEY или ~/.operator/agent/auth.json (alem-image-plus-imagegen)
// Использование: node scripts/gen-covers.mjs
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

const SIZE = "768x1024"; // портрет 3:4 (гэйтвей ограничивает стороны ≤1024)
const OUT_DIR = path.join(import.meta.dirname, "..", "public", "images", "covers");

function loadKey() {
  if (process.env.ALEM_IMAGE_KEY) return process.env.ALEM_IMAGE_KEY;
  const authPath = path.join(homedir(), ".operator", "agent", "auth.json");
  if (existsSync(authPath)) {
    try {
      const auth = JSON.parse(readFileSync(authPath, "utf8"));
      const prov = auth["alem-image-plus-imagegen"];
      if (prov && (prov.apiKey || prov.key)) return prov.apiKey || prov.key;
    } catch {}
  }
  throw new Error("Нет ключа Alem image: задайте ALEM_IMAGE_KEY или выполните configure.mjs из скилла");
}

const COVERS = {
  baikonur:
    "Children's storybook cover illustration, no text, no letters. A small boy with dark hair in a golden Kazakh steppe at sunrise, looking up at a large white rocket with orange fins on a launch pad, soft smoke, first stars in a pale blue sky. Soft pastel watercolor combined with flat vector style, warm cozy mood, sky blue and sage green palette, rounded friendly shapes, clean composition, picture-book quality.",
  dombra:
    "Children's storybook cover illustration, no text, no letters. A warm wooden Kazakh dombra folk instrument resting on a colorful patterned steppe rug, gentle wind blowing wheat and small wildflowers, sunset glow, soft steppe hills in the background. Soft pastel watercolor combined with flat vector style, warm amber and cream palette, rounded shapes, cozy picture-book atmosphere.",
  flamingo:
    "Children's storybook cover illustration, no text, no letters. Cute friendly pink flamingos standing in a shallow pink salt lake at golden hour, one small baby flamingo, soft mirror reflections in the water, green reeds, distant soft mountains. Soft pastel watercolor combined with flat vector style, pink and plum palette, rounded gentle shapes, nature picture-book cover.",
  fox_story:
    "Children's storybook cover illustration, no text, no letters. A brave curious little fox cub sitting on a green steppe hill under a friendly stormy sky with soft glowing lightning and round rain clouds, a small bright rainbow appearing on the side. Soft pastel watercolor combined with flat vector style, sage green and soft blue palette, rounded friendly shapes, gentle reassuring storybook mood."
};

const key = loadKey();
mkdirSync(OUT_DIR, { recursive: true });

for (const [id, prompt] of Object.entries(COVERS)) {
  const outJpg = path.join(OUT_DIR, `${id}.jpg`);
  const tmpPng = path.join(OUT_DIR, `${id}.tmp.png`);
  console.log(`→ ${id} (${SIZE}) ...`);
  const res = await fetch("https://llm.alem.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-to-image", prompt, size: SIZE })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} для ${id}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const item = data.data && data.data[0];
  if (item && item.b64_json) {
    writeFileSync(tmpPng, Buffer.from(item.b64_json, "base64"));
  } else if (item && item.url) {
    const img = await (await fetch(item.url)).arrayBuffer();
    writeFileSync(tmpPng, Buffer.from(img));
  } else {
    throw new Error(`Пустой ответ для ${id}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  // PNG → JPG (для веба в ~8 раз меньше)
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmpPng, "-q:v", "3", outJpg]);
    unlinkSync(tmpPng);
  } catch {
    renameSync(tmpPng, outJpg.replace(".jpg", ".png"));
    console.warn(`⚠ ffmpeg не найден — ${id} сохранён как PNG`);
  }
  console.log(`✓ ${outJpg}`);
}
console.log("Готово: 4 обложки в public/images/covers/");
