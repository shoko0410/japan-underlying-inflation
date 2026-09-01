/**
 * The Bank of Japan's underlying-inflation workbook.
 *
 * The Research and Statistics Department publishes one spreadsheet — cpirev.xlsx, about
 * 79 KB — that carries every series this site draws, released at 2pm two business days
 * after the official CPI. No API key, no second source, and nothing to reconstruct:
 * where the Dallas Fed publishes only a rolling 13-month window of its price-change
 * distribution, the BOJ publishes its distribution measures outright and back to 2001.
 *
 * WHAT IS IN IT
 *   - Three measures read off the distribution of item-level price changes:
 *     the trimmed mean, the weighted median, and the mode.
 *   - Three CPI aggregates with items excluded: ex fresh food (what Japan calls "core"),
 *     ex fresh food and energy ("core core"), and ex all food and energy — the last
 *     being the one that matches what the US calls core.
 *   - The share of items rising, the share falling, and the gap between them.
 *
 * All of them are the BOJ staff's own estimates, with "institutional factors" stripped
 * out — consumption-tax changes, free-education policies, the 2021 mobile-phone tariff
 * cut, travel subsidies, and energy-cost relief. That is what makes them comparable
 * across time, and also what makes them differ from the headline number in the news.
 *
 * THE BASE-YEAR COLUMNS
 * Japan rebases its CPI every five years, and the workbook keeps one column per base
 * (2000, 2005, 2010, 2015, 2020, 2025) rather than splicing them. They tile exactly —
 * each base covers its own five years with no overlap and no gap — so reading across
 * them is a matter of taking whichever column has a value for the month. Nothing needs
 * to be chained or rescaled, because these are already year-over-year rates rather than
 * index levels.
 */

import { readSheet, serialToMonth } from './xlsx.mjs';

const BASE = 'https://www.boj.or.jp';
export const WORKBOOK_URL = `${BASE}/en/research/research_data/cpi/cpirev.xlsx`;
export const SOURCE_PAGE = `${BASE}/en/research/research_data/cpi/index.htm`;
const SHEET = 'chart';

/**
 * Japanese header text -> the key this site uses. Matched on a normalised form so a
 * stray space or a full-width variant does not silently drop a series; anything in the
 * workbook that is not listed here is ignored, and anything listed that goes missing is
 * reported by the caller.
 */
export const SERIES = {
  '刈込平均値（前年比、％）': 'trimmedMean',
  '加重中央値（前年比、％）': 'weightedMedian',
  '最頻値（前年比、％）': 'mode',
  '除く生鮮食品、特殊要因（前年比、％）': 'exFresh',
  '除く生鮮食品・エネルギー、特殊要因（前年比、％）': 'exFreshEnergy',
  '除く食料・エネルギー、特殊要因（前年比、％）': 'exFoodEnergy',
  '上昇品目比率（％）': 'shareRising',
  '下落品目比率（％）': 'shareFalling',
  '上昇品目比率－下落品目比率（％ポイント）': 'diffusion',
};

/**
 * Collapse full-width punctuation and spacing so header matching is not brittle, and
 * drop the phonetic guide Excel stores alongside the text. The workbook's headers come
 * back as e.g. "刈込平均値（前年比、％）カコヘイキンチ" — that trailing katakana is
 * furigana, not part of the label, and every real label ends at its closing bracket.
 */
const norm = (s) => {
  const t = String(s)
    .replace(/[（(]/g, '(').replace(/[）)]/g, ')')
    .replace(/[、,]/g, ',').replace(/[・･]/g, '/')
    .replace(/[－ー−-]/g, '-')
    .replace(/\s+/g, '')
    .trim();
  const close = t.lastIndexOf(')');
  return close >= 0 ? t.slice(0, close + 1) : t;
};

const NORMALISED = new Map(Object.entries(SERIES).map(([jp, key]) => [norm(jp), key]));

/** A base label like "25年基準" or "2025base" -> 2025, for newest-first preference. */
function baseYear(label) {
  const s = String(label ?? '');
  let m = s.match(/(\d{4})\s*base/i);
  if (m) return Number(m[1]);
  m = s.match(/(\d{2})年基準/);
  if (m) {
    const yy = Number(m[1]);
    // The workbook runs 2000-2025; two-digit labels are unambiguous within that.
    return yy >= 90 ? 1900 + yy : 2000 + yy;
  }
  return null;
}

const isDateSerial = (v) => typeof v === 'number' && v > 20000 && v < 80000;

/**
 * Parse the workbook into { months, series: { key: number[] }, bases: { key: string[] } }.
 * `bases` records which CPI base each month's value came from, so the site can say so
 * rather than presenting a spliced series as if it were one vintage.
 */
export function parseWorkbook(buf) {
  const rows = readSheet(buf, SHEET);

  // Locate the layout by content, not by fixed row numbers: the workbook has gained and
  // lost title rows before. The Japanese name row is the one that mentions the trimmed
  // mean; the base labels sit directly under it; data starts at the first date.
  const nameRow = rows.findIndex((r) => r.some((c) => typeof c === 'string' && norm(c).includes('刈込平均値')));
  if (nameRow < 0) throw new Error('BOJ workbook: no row naming 刈込平均値 — the layout changed');
  const baseRow = nameRow + 1;
  const firstData = rows.findIndex((r) => isDateSerial(r[0]));
  if (firstData < 0) throw new Error('BOJ workbook: no dated rows found');

  // The sheet carries a quarterly block to the right of the monthly one, under its own
  // 四半期 heading and its own date column. Both use the same series names, so the scan
  // has to stop there or the quarterly columns would be read as extra monthly bases.
  const quarterly = rows[nameRow].findIndex(
    (c) => typeof c === 'string' && norm(c).includes('四半期'));
  const width = quarterly > 0
    ? quarterly
    : Math.max(...rows.slice(nameRow, firstData).map((r) => r.length));
  const columns = [];
  let carried = null;
  for (let c = 1; c < width; c++) {
    const raw = rows[nameRow]?.[c];
    if (typeof raw === 'string' && raw.trim()) carried = raw;
    const key = carried ? NORMALISED.get(norm(carried)) : null;
    const year = baseYear(rows[baseRow]?.[c]);
    if (key && year) columns.push({ c, key, year });
  }
  if (!columns.length) throw new Error('BOJ workbook: no recognised series columns');

  const months = [];
  const series = {};
  const bases = {};
  for (const key of new Set(columns.map((x) => x.key))) {
    series[key] = [];
    bases[key] = [];
  }

  for (let r = firstData; r < rows.length; r++) {
    const d = rows[r]?.[0];
    if (!isDateSerial(d)) continue;
    months.push(serialToMonth(d));
    for (const key of Object.keys(series)) {
      // Newest base wins where two ever overlap; in practice they never do.
      const hit = columns
        .filter((x) => x.key === key)
        .sort((a, b) => b.year - a.year)
        .find((x) => typeof rows[r][x.c] === 'number');
      series[key].push(hit ? Math.round(rows[r][hit.c] * 1000) / 1000 : null);
      bases[key].push(hit ? hit.year : null);
    }
  }

  const found = new Set(columns.map((x) => x.key));
  const missing = Object.values(SERIES).filter((k) => !found.has(k));
  return { months, series, bases, missing };
}
