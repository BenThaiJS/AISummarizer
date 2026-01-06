const fs = require('fs-extra');
const path = require('path');

function chunkText(text, maxChars = 3000) {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxChars) {
      if (current) chunks.push(current.trim());
      if (s.length > maxChars) {
        // fallback: split by maxChars
        for (let i = 0; i < s.length; i += maxChars) {
          chunks.push(s.slice(i, i + maxChars).trim());
        }
        current = '';
      } else {
        current = s;
      }
    } else {
      current += s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function cleanTemp(...paths) {
  for (const p of paths) {
    try {
      if (p && (await fs.pathExists(p))) {
        await fs.remove(p);
      }
    } catch (e) {
      // ignore
    }
  }
}

module.exports = { chunkText, cleanTemp };
