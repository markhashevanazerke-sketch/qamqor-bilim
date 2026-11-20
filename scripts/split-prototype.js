/**
 * one-shot: splits the original single-file prototype into public/ assets.
 * Line numbers refer to /home/yernur/Загрузки/qamqor_bilim.html (1-based).
 *
 * Script content map (inside <script> on line 967 .. </script> on line 2892):
 *   968   /**   section 1 comment start
 *   971   const UI_STRINGS
 *   1175  const BOOKS_DATA        (section 2)
 *   1497  const WORD_GLOSSARY     (section 3)
 *   1527  const ADAPTER_PRESETS   (section 4)
 *   1638  const TODO_PRESETS
 *   1683  const SCHEDULE_DATA
 *   1710  const AAC_PICTOGRAMS
 *   1719  ];    end of section 4 data
 *   1721  /**   section 5 comment
 *   1724  const state = {
 *   1758  };    end of state
 *   1760  /**   section 6 comment (SVG illustrations)
 *   1763  function getBookIllustrationSVG
 *   1822  }     end of getBookIllustrationSVG
 *   1824  /**   section 7 comment
 *   2891  });   end of bootstrap
 */
const fs = require("fs");
const path = require("path");

const SRC = "/home/yernur/Загрузки/qamqor_bilim.html";
const OUT = path.join(__dirname, "..", "public");

const lines = fs.readFileSync(SRC, "utf8").split("\n");
const L = (a, b) => lines.slice(a - 1, b).join("\n");

// 1. CSS — точная копия блока <style> (включая вёрстку внутри тега)
const styleMatch = lines.join("\n").match(/<style>([\s\S]*?)<\/style>/);
fs.writeFileSync(path.join(OUT, "css/styles.css"), styleMatch[1]);

// 2. Head (lines 1..266) with <style> block replaced by <link>
let head = lines.slice(0, 266).join("\n");
head = head.replace(/<style>[\s\S]*<\/style>/, '<link rel="stylesheet" href="css/styles.css" />');

// 3. Body markup (lines 267..964, from <body> to just before the data/engine comment)
const body = L(267, 964);

// 4. data.js — sections 1-4 (bilingual data) + section 6 (SVG illustrations)
const data =
  "// =====================================================================\n" +
  "// BILINGUAL DATA: UI strings, books, word glossary, presets, schedule, AAC\n" +
  "// Split from the original single-file prototype (qamqor_bilim.html)\n" +
  "// =====================================================================\n" +
  L(968, 1719) + "\n\n" +
  L(1760, 1822) + "\n";

// 5. app.js — section 5 (state) + sections 7-14 (utilities, logic, renders, bootstrap)
const app =
  "// =====================================================================\n" +
  "// APPLICATION STATE & INTERACTIVE ENGINE\n" +
  "// Split from the original single-file prototype (qamqor_bilim.html)\n" +
  "// AI calls (adapter, todo) go to the local backend: /api/adapter, /api/todo\n" +
  "// =====================================================================\n" +
  L(1721, 1758) + "\n\n" +
  L(1824, 2891) + "\n";

// 6. index.html
const html =
  head + "\n" +
  body + "\n" +
  "  <!-- ===================================================================== -->\n" +
  "  <!-- DATA & INTERACTIVE ENGINE (split from the single-file prototype)     -->\n" +
  "  <!-- ===================================================================== -->\n" +
  '  <script src="js/data.js"></script>\n' +
  '  <script src="js/app.js"></script>\n' +
  "</body>\n" +
  "</html>\n";

fs.writeFileSync(path.join(OUT, "index.html"), html);
fs.writeFileSync(path.join(OUT, "js/data.js"), data);
fs.writeFileSync(path.join(OUT, "js/app.js"), app);
console.log("split OK: index.html, css/styles.css, js/data.js, js/app.js");
