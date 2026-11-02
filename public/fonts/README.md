# Font assets

- Hanken Grotesk 400: project authors, SIL Open Font License 1.1. Copyright and complete license are in Hanken-Grotesk-OFL.txt. Source: https://fonts.google.com/specimen/Hanken+Grotesk .
- Sentient 300/400: Indian Type Foundry, ITF Free Font License. Complete license from the official Fontshare download is in Sentient-FFL.txt. Source: https://www.fontshare.com/fonts/sentient .

Sentient permits self-hosting on this site; its binaries are excluded from the public repository. `npm ci` fetches the approved files from Fontshare through `scripts/fetch-fonts.mjs`, validates their SHA-256 hashes, and saves ignored local files for Next.js to serve. `npm run build` also verifies them. Do not redistribute those font binaries or use them as selectable fonts in a third-party design tool.

Hanken remains under its OFL, and Sentient remains under its FFL; the application's code license does not replace either. Next.js serves these local fonts without requiring runtime font-CDN requests.
