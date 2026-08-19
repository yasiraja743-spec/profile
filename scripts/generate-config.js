// scripts/generate-config.js
// Runs once during Vercel's build step (see vercel.json -> buildCommand).
// Reads env vars set in Vercel Project Settings and writes them into
// a plain static file, js/config.js, that the browser loads.
//
// NOTE: this is still a static file shipped to the browser — anyone
// can view its contents. This script just moves the key from "typed
// into vercel.com" to "typed into env vars"; it does not hide it.

const fs = require('fs');
const path = require('path');

const XKIRO_API_KEY = process.env.XKIRO_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const content = `// AUTO-GENERATED at build time from Vercel Environment Variables.
// Do not edit by hand — it gets overwritten on every deploy.
window.__ENV__ = {
  XKIRO_API_KEY: ${JSON.stringify(XKIRO_API_KEY)},
  OPENROUTER_API_KEY: ${JSON.stringify(OPENROUTER_API_KEY)},
  GROQ_API_KEY: ${JSON.stringify(GROQ_API_KEY)}
};
`;

const outPath = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(outPath, content, 'utf8');
console.log('js/config.js generated from environment variables.');
