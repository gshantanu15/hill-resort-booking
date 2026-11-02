import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Fontshare allows site self-hosting, but not distributing font binaries in this public repository.
const fonts = [
  {
    file: "sentient-light.woff2",
    weight: "300",
    sha256: "4704f72d0b3884706b94f12e5a108aa147d15f9f6457341c8a5d05049f40ebb7",
  },
  {
    file: "sentient-regular.woff2",
    weight: "400",
    sha256: "f08e7da6181ee421ea564df6c727bc84bfe6fe656b9e613efbd8a2161fd26b14",
  },
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const pending = [];
for (const font of fonts) {
  const existing = await readFile(`public/fonts/${font.file}`).catch(
    () => null,
  );
  if (!existing || hash(existing) !== font.sha256) pending.push(font);
}
if (pending.length) {
  const response = await fetch(
    "https://api.fontshare.com/v2/css?f[]=sentient@300,400&display=swap",
    { signal: AbortSignal.timeout(30000) },
  );
  if (!response.ok)
    throw new Error("Cannot fetch official Sentient stylesheet.");
  const css = await response.text();
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(
    (match) => match[1],
  );
  await mkdir("public/fonts", { recursive: true });
  for (const font of pending) {
    const face = faces.find((text) =>
      new RegExp(`font-weight:\\s*${font.weight}\\s*;`).test(text),
    );
    const source = face?.match(/url\(['"]?([^)'"\s]+\.woff2)['"]?\)/)?.[1];
    const url = source ? new URL(source, "https://api.fontshare.com") : null;
    if (
      !url ||
      url.protocol !== "https:" ||
      url.hostname !== "cdn.fontshare.com"
    )
      throw new Error("Unexpected official font source.");
    const download = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!download.ok)
      throw new Error("Cannot download official Sentient font.");
    const bytes = Buffer.from(await download.arrayBuffer());
    if (hash(bytes) !== font.sha256)
      throw new Error(
        "Official font changed; review and approve the new version before updating its checksum.",
      );
    await writeFile(`public/fonts/${font.file}`, bytes);
    console.log(`Fetched and verified ${font.file}.`);
  }
}
console.log("Approved Sentient fonts verified.");
