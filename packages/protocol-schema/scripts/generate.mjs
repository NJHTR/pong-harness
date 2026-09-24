import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const base = new URL("../", import.meta.url);
const source = JSON.parse(await readFile(new URL("host-wire.schema.json", base), "utf8"));
const output = new URL("src/host-wire.generated.ts", base);
const content = await compile(source, "HostWire", {
  bannerComment: "/* Generated from host-wire.schema.json. Do not edit. */",
  unreachableDefinitions: true,
});

if (process.argv.includes("--check")) {
  const existing = await readFile(output, "utf8").catch(() => "");
  if (existing !== content) {
    console.error(`${fileURLToPath(output)} is stale; run pnpm --filter @seekwd/protocol-schema generate`);
    process.exitCode = 1;
  }
} else {
  await writeFile(output, content);
}
