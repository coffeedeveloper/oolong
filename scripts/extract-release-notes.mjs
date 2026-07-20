import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [tag, outputPath] = process.argv.slice(2);

if (!tag || !outputPath) {
  throw new Error(
    "Usage: node scripts/extract-release-notes.mjs <vX.Y.Z> <output-path>"
  );
}

if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  throw new Error(`Invalid release tag: ${tag}`);
}

const releaseNotes = await readFile(
  new URL("../RELEASE.md", import.meta.url),
  "utf8"
);
const heading = `## ${tag}\n`;
const sectionStart = releaseNotes.indexOf(heading);

if (sectionStart === -1) {
  throw new Error(`Release notes not found for ${tag}`);
}

const contentStart = sectionStart + heading.length;
const nextSection = releaseNotes.indexOf("\n## v", contentStart);
const sectionEnd = nextSection === -1 ? releaseNotes.length : nextSection;
const section = releaseNotes
  .slice(contentStart, sectionEnd)
  .trim()
  .replace(/^Published release:[^\n]*\n+/, "");

if (!section) {
  throw new Error(`Release notes not found for ${tag}`);
}

await writeFile(resolve(outputPath), `${section}\n`, "utf8");
