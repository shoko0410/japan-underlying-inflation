/**
 * Build-time data fetcher for the Japan underlying-inflation site.
 *
 * Almost everything comes from one Bank of Japan spreadsheet — see lib/boj.mjs for what
 * is in it and why the base-year columns are read the way they are. That file needs no
 * key and no reconstruction, which is the main way this site differs from its US
 * sibling: the Dallas Fed publishes only a rolling 13 months of its price-change
 * distribution, so that one has to be rebuilt from BEA source data, while the BOJ
 * publishes its distribution measures outright and back to 2001.
 *
 * The one thing the BOJ workbook does NOT carry is the headline index — every series in
 * it has something excluded, and all of them are staff estimates with institutional
 * factors stripped out. The official 総合 and コア come from the Statistics Bureau via
 * e-Stat, which wants a free application ID. Without one the site simply builds without
 * those two lines; --strict refuses to, so a scheduled run cannot quietly drop them.
 *
 * Pass --fresh to ignore the cache.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWorkbook, WORKBOOK_URL, SOURCE_PAGE } from '../lib/boj.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'data', '.cache');
const FRESH = process.argv.includes('--fresh');
const STRICT = process.argv.includes('--strict');

/**
 * Cabinet Office business-cycle reference dates (景気基準日付), shaded peak+1 through
 * trough to match the convention FRED's recession indicators use.
 *
 * Hardcoded rather than fetched: there are four of them inside this site's window, the
 * Cabinet Office announces a turning point years after it happens — the 2018-10 peak was
 * not settled until well after the fact — and FRED's mirror of the series (JPNRECDM)
 * stopped updating in 2022. A short table that is obviously stale beats a fetch that
 * looks live and is not. Same caveat as the US site: the right-hand edge of the chart
 * can never show a recession, because none has been dated yet.
 */
const RECESSIONS = [
  { peak: '2000-11', trough: '2002-01' }, // 第14循環 (starts before this site's window)
  { peak: '2008-02', trough: '2009-03' }, // 第15循環
  { peak: '2012-03', trough: '2012-11' }, // 第16循環
  { peak: '2018-10', trough: '2020-05' }, // 第17循環
];

const log = (...a) => console.log(...a);
const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);

// ---------------------------------------------------------------- utilities

async function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function withRetry(label, fn, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err.fatal || i === attempts) break;
      const wait = 3000 * i;
      log(`  retry ${i}/${attempts - 1} ${label} in ${wait}ms — ${err.message}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function cached(key, producer, { json = true } = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, json ? `${key}.json` : key);
  if (!FRESH && existsSync(file)) {
    log(`  cache hit  ${key}`);
    return json ? JSON.parse(await readFile(file, 'utf8')) : readFile(file);
  }
  const value = await producer();
  await writeFile(file, json ? JSON.stringify(value) : value);
  log(`  fetched    ${key}`);
  return value;
}

const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
function monthRange(startKey, endKey) {
  const [sy, sm] = startKey.split('-').map(Number);
  const [ey, em] = endKey.split('-').map(Number);
  const out = [];
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? ((m = 1), y++) : m++) {
    out.push(monthKey(y, m));
  }
  return out;
}

/** Shade from the month after the peak through the trough, clipped to the axis. */
function recessionBands(months) {
  const first = months[0];
  const last = months[months.length - 1];
  const next = (m) => {
    const [y, mo] = m.split('-').map(Number);
    return mo === 12 ? monthKey(y + 1, 1) : monthKey(y, mo + 1);
  };
  return RECESSIONS
    .map((r) => ({ start: next(r.peak), end: r.trough }))
    .filter((b) => b.end >= first && b.start <= last)
    .map((b) => ({ start: b.start < first ? first : b.start, end: b.end > last ? last : b.end }));
}

// ---------------------------------------------------------------- e-Stat

/**
 * Official CPI from the Statistics Bureau, for the lines the BOJ workbook cannot supply:
 * the published aggregates, with no institutional-factor adjustment. Those two views of
 * the same concept are the point — in July 2026 the official core reads 1.8% while the
 * Bank's adjusted version reads 2.3%, and the gap is the energy subsidies.
 *
 * The 2025-base table carries year-over-year values linked back to 1971, so unlike the
 * BOJ workbook there is nothing to splice across base years here.
 *
 *   cdTab=3   前年同月比 (the other two are the index itself and month-on-month)
 *   cdArea    00000 = 全国
 *   cdCat01   0001 総合 · 0161 生鮮食品を除く総合 · 0178 生鮮食品及びエネルギーを除く総合
 */
const ESTAT_TABLE = '0004052037'; // 消費者物価指数（2025年基準）
const ESTAT_SERIES = {
  headline: '0001',
  coreOfficial: '0161',
  coreCoreOfficial: '0178',
};

async function fetchEstat(appId) {
  const json = await cached('estat_cpi', () =>
    withRetry('e-Stat CPI', async () => {
      const url = 'https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?' +
        new URLSearchParams({
          appId,
          statsDataId: ESTAT_TABLE,
          cdTab: '3',
          cdArea: '00000',
          cdCat01: Object.values(ESTAT_SERIES).join(','),
          metaGetFlg: 'N',
          cntGetFlg: 'N',
        });
      const res = await fetch(url);
      const j = await res.json();
      const status = j?.GET_STATS_DATA?.RESULT?.STATUS;
      if (status !== 0) {
        const e = new Error(`e-Stat: ${j?.GET_STATS_DATA?.RESULT?.ERROR_MSG ?? 'unknown error'}`);
        e.fatal = status === 100; // a bad appId will never start working
        throw e;
      }
      return j;
    }));

  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? [];
  const byCode = new Map(Object.entries(ESTAT_SERIES).map(([k, c]) => [c, k]));
  const out = {};
  for (const key of Object.keys(ESTAT_SERIES)) out[key] = new Map();
  for (const v of values) {
    // "2026000707" -> 2026-07. The same axis also carries annual and fiscal-year rows,
    // which end in 00 and would otherwise land on a month that does not exist.
    const m = String(v['@time'] ?? '').match(/^(\d{4})\d{4}(\d{2})$/);
    if (!m || m[2] === '00') continue;
    const key = byCode.get(String(v['@cat01'] ?? ''));
    if (!key) continue;
    const num = Number(v.$);
    if (Number.isFinite(num)) out[key].set(`${m[1]}-${m[2]}`, num);
  }
  return out;
}

// ---------------------------------------------------------------- main

async function main() {
  const env = { ...(await loadEnv()), ...process.env };

  log('Bank of Japan — underlying inflation workbook:');
  const buf = await cached('boj_cpirev.xlsx', () =>
    withRetry('BOJ cpirev.xlsx', async () => {
      const res = await fetch(WORKBOOK_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }), { json: false });

  const boj = parseWorkbook(buf);
  if (boj.missing.length) {
    throw new Error(`BOJ workbook is missing: ${boj.missing.join(', ')} — the layout changed`);
  }
  log(`  months        ${boj.months[0]} … ${boj.months[boj.months.length - 1]} (${boj.months.length})`);

  // One continuous axis; the workbook is already monthly and gapless, but rebuild it
  // from the range so a hole in the source would show up as a break rather than a shift.
  const months = monthRange(boj.months[0], boj.months[boj.months.length - 1]);
  const at = new Map(boj.months.map((m, i) => [m, i]));
  const pick = (arr) => months.map((m) => {
    const i = at.get(m);
    return i == null ? null : round2(arr[i]);
  });

  const series = {};
  for (const [key, arr] of Object.entries(boj.series)) {
    series[key] = { values: pick(arr), source: 'BOJ' };
  }

  // Which CPI base each month came from, collapsed into spans for the notes.
  const baseSpans = [];
  {
    const b = boj.bases.trimmedMean;
    let cur = null, start = 0;
    for (let i = 0; i < b.length; i++) {
      if (b[i] !== cur) {
        if (cur != null) baseSpans.push({ base: cur, from: boj.months[start], to: boj.months[i - 1] });
        cur = b[i];
        start = i;
      }
    }
    if (cur != null) baseSpans.push({ base: cur, from: boj.months[start], to: boj.months[b.length - 1] });
  }

  // Official CPI, if a key is available.
  let estatOk = false;
  if (env.ESTAT_APP_ID) {
    try {
      log('');
      log('Statistics Bureau via e-Stat:');
      const got = await fetchEstat(env.ESTAT_APP_ID);
      for (const [key, map] of Object.entries(got)) {
        if (!map.size) continue;
        series[key] = {
          values: months.map((m) => round2(map.get(m) ?? null)),
          source: 'e-Stat',
        };
      }
      estatOk = Object.values(got).some((m) => m.size > 0);
      log(`  official      ${Object.entries(got).map(([k, v]) => `${k}=${v.size}`).join(' · ')}`);
    } catch (err) {
      log(`  ! e-Stat unavailable: ${err.message}`);
    }
  } else {
    log('');
    log('  ! ESTAT_APP_ID is not set — building without the official 総合 / コア lines');
  }

  const payload = {
    generatedAt: null,
    startMonth: months[0],
    latestMonth: months[months.length - 1],
    months,
    series,
    recessions: recessionBands(months),
    baseSpans,
    meta: {
      source: { workbook: WORKBOOK_URL, page: SOURCE_PAGE },
      estat: estatOk,
      note:
        'BOJ 계열은 소비세·무상화 정책·휴대폰 요금 인하·여행 지원·에너지 부담 경감 같은 ' +
        '"특수요인"을 제거한 일본은행 조사통계국 추계치입니다. 뉴스에 나오는 공식 숫자와 다릅니다.',
    },
  };

  const jsonPath = path.join(ROOT, 'data', 'jpn.json');

  if (STRICT) {
    const problems = [];
    // Only a regression counts. Having no e-Stat key at all is a deliberate choice and
    // the site is complete without those two lines; a key that is set and produced
    // nothing is the failure worth stopping a scheduled commit for.
    if (env.ESTAT_APP_ID && !estatOk) {
      problems.push('ESTAT_APP_ID is set but the official CPI lines did not come back');
    }
    if (!payload.recessions.length) problems.push('no recession bands fell inside the axis');
    for (const k of ['trimmedMean', 'weightedMedian', 'mode', 'shareRising', 'shareFalling']) {
      const n = series[k]?.values.filter((v) => v != null).length ?? 0;
      if (n < 200) problems.push(`${k} has only ${n} months`);
    }
    if (existsSync(jsonPath)) {
      try {
        const prev = JSON.parse(await readFile(jsonPath, 'utf8'));
        for (const k of Object.keys(prev.series ?? {})) {
          if (!series[k]) problems.push(`series "${k}" disappeared since the last build`);
        }
        if (months.length < (prev.months?.length ?? 0)) {
          problems.push(`month count shrank: ${prev.months.length} -> ${months.length}`);
        }
      } catch { /* no readable previous build; the checks above still apply */ }
    }
    if (problems.length) {
      throw new Error('--strict: refusing to write a degraded build\n  - ' + problems.join('\n  - '));
    }
  }

  await mkdir(path.join(ROOT, 'data'), { recursive: true });
  await mkdir(path.join(ROOT, 'public'), { recursive: true });

  // Reuse the previous timestamp when nothing but the clock changed, so a scheduled run
  // that finds no new data writes byte-identical files and leaves no commit.
  const withoutStamp = (o) => JSON.stringify({ ...o, generatedAt: null });
  let unchanged = false;
  if (existsSync(jsonPath)) {
    try {
      const prev = JSON.parse(await readFile(jsonPath, 'utf8'));
      if (withoutStamp(prev) === withoutStamp(payload) && prev.generatedAt) {
        payload.generatedAt = prev.generatedAt;
        unchanged = true;
      }
    } catch { /* unreadable previous file — treat as changed */ }
  }
  if (!payload.generatedAt) payload.generatedAt = new Date().toISOString();

  const json = JSON.stringify(payload);
  await writeFile(jsonPath, JSON.stringify(payload, null, 2));
  // A JS assignment rather than a .json fetch, so index.html works from file:// too.
  await writeFile(path.join(ROOT, 'public', 'data.js'), `window.JPN_DATA = ${json};\n`);

  const last = (k) => {
    const v = series[k]?.values;
    if (!v) return 'n/a';
    for (let i = v.length - 1; i >= 0; i--) if (v[i] != null) return v[i] + '%';
    return 'n/a';
  };
  log('');
  log(`months        ${months[0]} … ${months[months.length - 1]}  (${months.length})`);
  log(`series        ${Object.keys(series).join(', ')}`);
  log(`bases         ${baseSpans.map((s) => `${s.base}:${s.from}~${s.to}`).join('  ')}`);
  log(`recessions    ${payload.recessions.length}`);
  log(`latest        刈込平均 ${last('trimmedMean')} · 加重中央値 ${last('weightedMedian')}` +
      ` · 最頻値 ${last('mode')}`);
  log(`              上昇品目 ${last('shareRising')} · 下落品目 ${last('shareFalling')}`);
  log(`changed       ${unchanged ? 'no — output is byte-identical to the previous run' : 'yes'}`);
  log(`written       data/jpn.json, public/data.js (${(json.length / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
