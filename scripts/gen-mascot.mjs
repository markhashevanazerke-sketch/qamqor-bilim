// Генерация маскота платформы «Qamqor Bilim» через Alem AI Plus (text-to-image)
// Использование: node scripts/gen-mascot.mjs
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

const SIZE = "1024x1024";
const OUT_DIR = path.join(import.meta.dirname, "..", "public", "images");

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
  throw new Error("Нет ключа Alem image: задайте ALEM_IMAGE_KEY");
}

const PROMPT =
  "Cute mascot character for a children's inclusive learning app, no text, no letters. " +
  "A small fluffy baby falcon chick, round soft body, cream and soft sage-green feathers, tiny gentle gray beak, " +
  "big friendly dark eyes with warm highlights, blushing pink cheeks, happy soft smile, small wings hugging a little " +
  "rounded pastel microphone close to its chest. Soft pastel watercolor combined with flat vector style, " +
  "gentle cream background with a soft sky-blue circular glow behind the character, rounded friendly shapes, " +
  "cozy reassuring picture-book atmosphere, centered composition, full body visible.";

const key = loadKey();
mkdirSync(OUT_DIR, { recursive: true });
const outJpg = path.join(OUT_DIR, "mascot.jpg");
const tmpPng = path.join(OUT_DIR, "mascot.tmp.png");
console.log(`→ mascot (${SIZE}) ...`);
const res = await fetch("https://llm.alem.ai/v1/images/generations", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "text-to-image", prompt: PROMPT, size: SIZE })
});
if (!res.ok) {
  const body = await res.text().catch(() => "");
  throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
}
const data = await res.json();
const item = data.data && data.data[0];
if (item && item.b64_json) {
  writeFileSync(tmpPng, Buffer.from(item.b64_json, "base64"));
} else if (item && item.url) {
  const img = await (await fetch(item.url)).arrayBuffer();
  writeFileSync(tmpPng, Buffer.from(img));
} else {
  throw new Error(`Пустой ответ: ${JSON.stringify(data).slice(0, 200)}`);
}
try {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmpPng, "-q:v", 3, outJpg]);
  unlinkSync(tmpPng);
} catch {
  renameSync(tmpPng, outJpg.replace(".jpg", ".png"));
  console.warn("⚠ ffmpeg не найден — маскот сохранён как PNG");
}
console.log(`✓ ${outJpg}`);
