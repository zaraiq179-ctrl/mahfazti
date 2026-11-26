// Downloads the Google Fonts used by www/index.html so the Android app works offline.
import fs from "node:fs";
const html = fs.readFileSync("www/index.html", "utf8");
const m = html.match(/<link id="gfonts" href="([^"]+)"[^>]*>/);
if (!m) { console.log("no gfonts link"); process.exit(0); }
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
try {
let css = await (await fetch(m[1].replace(/&amp;/g, "&"), { headers: { "User-Agent": UA } })).text();
fs.mkdirSync("www/fonts", { recursive: true });
const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(x => x[1]))];
let i = 0;
for (const u of urls) {
  const name = `f${i++}.woff2`;
  fs.writeFileSync(`www/fonts/${name}`, Buffer.from(await (await fetch(u)).arrayBuffer()));
  css = css.split(u).join(name);
}
fs.writeFileSync("www/fonts/fonts.css", css);
fs.writeFileSync("www/index.html", html.replace(m[0], '<link rel="stylesheet" href="fonts/fonts.css">'));
console.log(`bundled ${urls.length} font files`);
} catch (e) { console.log("font bundling skipped:", e.message); }
