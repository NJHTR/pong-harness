import { readFileSync } from "node:fs";

const docs = new URL("../docs/seekwd-design/", import.meta.url);
const matrix = readFileSync(new URL("30-delivery-roadmap-and-progress-matrix.md", docs), "utf8");
const ledger = readFileSync(new URL("34-requirement-evidence-ledger.md", docs), "utf8");
const requirementId = "[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+(?:\\.[0-9]+)?";
const matrixIds = [...matrix.matchAll(new RegExp(`^\\| (${requirementId}) \\|`, "gm"))].map((match) => match[1]);
const ledgerIds = [...ledger.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
const known = new Set(matrixIds);
const seen = new Set();
const errors = [];

if (known.size !== matrixIds.length) errors.push("Delivery matrix contains duplicate requirement IDs");
for (const id of ledgerIds) {
  if (!known.has(id)) errors.push(`${id}: not found in delivery matrix`);
  if (seen.has(id)) errors.push(`${id}: duplicated in evidence ledger`);
  seen.add(id);
}

if (ledgerIds.length === 0) errors.push("Evidence ledger contains no requirement rows");
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Requirement ledger: ${seen.size}/${known.size} IDs traced; remaining IDs are unreviewed.`);
}
