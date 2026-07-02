#!/usr/bin/env node
// Monthly job: detect whether each shop's source page has changed since the
// last run. It does NOT parse/overwrite hours automatically — mismatched
// heuristics across dozens of differently-structured sites would risk
// silently publishing wrong hours. Instead it flags shops whose source page
// content changed so a human can verify and update the SHOPS array by hand.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, '..', 'index.html');
const HASHES_PATH = path.join(__dirname, '..', 'data', 'source-hashes.json');
const SUMMARY_PATH = path.join(__dirname, '..', 'data', 'last-check-summary.md');

function loadShops() {
  const html = readFileSync(INDEX_PATH, 'utf8');
  const match = html.match(/const SHOPS = (\[[\s\S]*?\]);/);
  if (!match) throw new Error('SHOPS array not found in index.html');
  return JSON.parse(match[1]);
}

function loadHashes() {
  if (!existsSync(HASHES_PATH)) return {};
  return JSON.parse(readFileSync(HASHES_PATH, 'utf8'));
}

function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const shops = loadShops();
  const prevHashes = loadHashes();
  const nextHashes = { ...prevHashes };
  const changed = [];
  const failed = [];

  for (const shop of shops) {
    if (!shop.source) continue;
    try {
      const res = await fetch(shop.source, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JiroStatusBoardBot/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const hash = createHash('sha256').update(extractText(html)).digest('hex');
      const prev = prevHashes[shop.name];
      if (prev && prev !== hash) changed.push({ name: shop.name, source: shop.source });
      nextHashes[shop.name] = hash;
    } catch (err) {
      failed.push({ name: shop.name, source: shop.source, error: err.message });
    }
    await sleep(1500); // be polite to source sites
  }

  writeFileSync(HASHES_PATH, JSON.stringify(nextHashes, null, 2) + '\n');

  const lines = [];
  lines.push(`# 月次ソースチェック結果 (${new Date().toISOString().slice(0, 10)})`, '');
  if (changed.length) {
    lines.push('## 出典ページの内容が変わった店舗(営業時間の確認を推奨)');
    changed.forEach((c) => lines.push(`- [${c.name}](${c.source})`));
    lines.push('');
  }
  if (failed.length) {
    lines.push('## 取得に失敗した店舗(サイト構造変更・アクセス不可の可能性)');
    failed.forEach((f) => lines.push(`- ${f.name}: ${f.error} (${f.source})`));
    lines.push('');
  }
  if (!changed.length && !failed.length) {
    lines.push('変更・失敗はありませんでした。');
  }
  writeFileSync(SUMMARY_PATH, lines.join('\n') + '\n');

  console.log(`changed=${changed.length} failed=${failed.length}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed.length}\nfailed=${failed.length}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
