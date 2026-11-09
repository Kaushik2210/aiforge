// Flags entries in content/_freshness.yml older than maxAgeDays.
// Minimal parser on purpose: the file format is flat and fixed.
import fs from "node:fs";

const text = fs.readFileSync("content/_freshness.yml", "utf8");
const maxAge = Number(/maxAgeDays:\s*(\d+)/.exec(text)?.[1] ?? 90);
const today = new Date();
let stale = 0;

for (const block of text.split(/\n\s*- /).slice(1)) {
  const date = /verifiedOn:\s*(\d{4}-\d{2}-\d{2})/.exec(block)?.[1];
  const claim = /claim:\s*"?([^"\n]+)"?/.exec(block)?.[1] ?? "(unnamed)";
  if (!date) continue;
  const ageDays = Math.floor((today - new Date(date)) / 86_400_000);
  if (ageDays > maxAge) {
    stale++;
    console.log(`STALE (${ageDays}d): ${claim}`);
  }
}
console.log(stale === 0 ? "All tracked facts are fresh." : `${stale} stale item(s).`);
process.exit(stale === 0 ? 0 : 1);
