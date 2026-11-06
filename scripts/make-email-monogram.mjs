/*
 * Renders the EMW monogram to PNGs for the emails (most inboxes don't show SVG). Reads the traced
 * paths from components/brand/logo-paths.ts and keeps fill-rule evenodd, so the W's heart stays open.
 *
 *   node scripts/make-email-monogram.mjs
 *
 * Writes public/email/monogram.png (ink, for paper) and public/email/monogram-paper.png (paper, for
 * photos or the night footer), each 240px wide: shown at 120px, so sharp on retina screens.
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";

const src = readFileSync(new URL("../components/brand/logo-paths.ts", import.meta.url), "utf8");
const width = Number(src.match(/width:\s*(\d+)/)[1]);
const height = Number(src.match(/MONOGRAM_HEIGHT\s*=\s*(\d+)/)[1]);
const paths = ["E", "M", "W"].map((k) => src.match(new RegExp(`"${k}":\\s*"([^"]+)"`))[1]);

for (const [file, colour] of [["monogram.png", "#161412"], ["monogram-paper.png", "#faf8f5"]]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="${colour}" fill-rule="evenodd">${paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
  await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 240 }).png().toFile(new URL(`../public/email/${file}`, import.meta.url).pathname);
  console.log(`public/email/${file}`);
}
