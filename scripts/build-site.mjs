// Builds the site for GitHub Pages into _site/.
// GitHub Pages can't read Netlify's _redirects file, so this turns each rule into a real page:
//   200 rules -> a copy of the target page at the short address (keeps the address, so pages
//                that read their own address and Facebook preview cards keep working)
//   301/302   -> a small page that forwards visitors, keeping ?utm_ tracking and #anchors
// Edit _redirects as usual; this runs automatically on every push to main.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_site');
const skip = new Set(['.git', '.github', 'scripts', '_site', 'node_modules', '_redirects', '.gitignore', '.gitattributes']);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const name of fs.readdirSync(root)) {
  if (!skip.has(name)) fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
}

const fileFor = (from) => (from === '/' ? 'index.html' : from.replace(/^\//, '') + (from.endsWith('.html') ? '' : '.html'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const stub = (to) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Redirecting…</title>
<link rel="canonical" href="${esc(to)}">
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url=${esc(to)}">
</head>
<body><p>Taking you there… <a href="${esc(to)}">Continue</a></p></body>
</html>
`;

let made = 0, problems = 0;
for (const raw of fs.readFileSync(path.join(root, '_redirects'), 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const [from, to, codeRaw = '301'] = line.split(/\s+/);
  const code = codeRaw.replace('!', '');
  const target = decodeURIComponent(to.split(/[?#]/)[0]).replace(/^\//, '');
  if (!fs.existsSync(path.join(root, target))) {
    console.warn(`WARNING: ${from} points to ${to}, which doesn't exist. Skipped.`);
    problems++;
    continue;
  }
  const file = fileFor(from);
  if (code === '200') {
    if (file !== target) fs.copyFileSync(path.join(root, target), path.join(out, file));
  } else {
    fs.writeFileSync(path.join(out, file), stub(to));
  }
  made++;
}
console.log(`Built ${made} short links into _site/${problems ? ` (${problems} skipped)` : ''}.`);
