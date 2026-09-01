/* Japan underlying-inflation viewer — hand-rolled SVG so the mark specs (2px lines,
   hairline solid grid, 2px surface rings, selective end labels) are exact. */
(function () {
  'use strict';

  const D = window.JPN_DATA;
  const root = document.documentElement;

  if (!D) {
    document.body.innerHTML =
      '<p style="padding:48px;font-family:system-ui">' +
      ((window.I18N && window.I18N.ko.ui.noData) || 'data.js is missing') + '</p>';
    return;
  }

  /* Language: an explicit ?lang= wins so a link can pin one, then the last choice, then
     Korean. Switching reloads with the URL updated rather than re-rendering in place —
     every string is built once at startup, and a reload gives each language a shareable
     address. */
  const LANGS = ['ko', 'ja'];
  const lang = (() => {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    try {
      const saved = localStorage.getItem('jpn-lang');
      if (LANGS.includes(saved)) return saved;
    } catch { /* private windows throw; fall through */ }
    return 'ko';
  })();
  const T = (window.I18N && window.I18N[lang]) || window.I18N.ko;
  const U = T.ui;

  document.documentElement.lang = T.htmlLang;
  document.title = T.doc.title;
  document.getElementById('meta-desc')?.setAttribute('content', T.doc.desc);
  // Values under T.html are authored in i18n.js, never derived from the data files.
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const v = T.html[el.dataset.i18n];
    if (v != null) el.innerHTML = v;
  }
  for (const el of document.querySelectorAll('[data-aria]')) {
    const v = T.aria[el.dataset.aria];
    if (v != null) el.setAttribute('aria-label', v);
  }

  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
    langBtn.textContent = U.langButton;
    langBtn.setAttribute('aria-label', T.aria.langSwitch);
    langBtn.addEventListener('click', () => {
      try { localStorage.setItem('jpn-lang', next); } catch { /* ignore */ }
      const url = new URL(location.href);
      url.searchParams.set('lang', next);
      location.replace(url);
    });
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  };
  const div = (cls) => {
    const n = document.createElement('div');
    if (cls) n.className = cls;
    return n;
  };
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  const pct = (v, dp) => (v == null ? '—' : v.toFixed(dp == null ? 1 : dp) + '%');
  const monthLabel = (m) => {
    const [y, mo] = m.split('-');
    return T.month(y, mo);
  };

  const val = (key) => D.series[key]?.values ?? null;
  const has = (key) => Array.isArray(D.series[key]?.values);

  /* Colour follows the entity: each series owns a categorical slot, resolved fresh on
     every render so a theme change repaints without reassigning identity. Slots are
     assigned in the documented fixed order and never cycled — hiding a series never
     recolours the survivors. The three distribution measures lead, because they are what
     the Bank itself puts forward as the underlying rate. */
  const YOY_SERIES = [
    { key: 'trimmedMean', varName: '--cat-1' },
    { key: 'weightedMedian', varName: '--cat-2' },
    { key: 'mode', varName: '--cat-3' },
    { key: 'exFresh', varName: '--cat-4' },
    { key: 'exFreshEnergy', varName: '--cat-5' },
    { key: 'exFoodEnergy', varName: '--cat-6' },
    { key: 'headline', varName: '--cat-7' },
    { key: 'coreOfficial', varName: '--cat-8' },
  ].filter((s) => has(s.key))
    .map((s) => ({ ...s, name: U.series[s.key], values: val(s.key) }));

  /* Rising and falling shares only. The gap between them IS the diffusion index, so
     drawing that third line would restate the picture in a different unit (%pt against
     %) on the same axis — it lives in the tiles and the table instead. */
  const BREADTH_SERIES = [
    { key: 'shareRising', varName: '--cat-1' },
    { key: 'shareFalling', varName: '--cat-2' },
  ].filter((s) => has(s.key))
    .map((s) => ({ ...s, name: U.series[s.key], values: val(s.key) }));

  const RANGES = [
    { id: 'all', months: null },
    { id: '20y', months: 240 },
    { id: '10y', months: 120 },
    { id: '5y', months: 60 },
    { id: '3y', months: 36 },
  ].map((r) => ({ ...r, label: U.ranges[r.id] }));

  const state = {
    range: 'all',
    hidden: {
      // The exclusion-based aggregates start hidden: the point of the page is the three
      // measures the Bank reads off the distribution.
      yoy: new Set(['exFreshEnergy', 'exFoodEnergy', 'headline', 'coreOfficial']),
      breadth: new Set(),
    },
    tableOpen: false,
  };

  /* The first month the star series reports — earlier months are an axis with nothing
     on it. */
  const firstIdx = (() => {
    const v = val('trimmedMean') ?? [];
    for (let i = 0; i < v.length; i++) if (v[i] != null) return i;
    return 0;
  })();

  function slice() {
    const end = D.months.length;
    const r = RANGES.find((x) => x.id === state.range);
    const start = r.months == null ? firstIdx : Math.max(firstIdx, end - r.months);
    return { start, end };
  }

  // ------------------------------------------------------------ scales

  function niceDomain(lo, hi) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 2.5);
    const span = hi - lo || 1;
    const steps = [0.25, 0.5, 1, 2, 2.5, 5];
    let step = steps[steps.length - 1];
    for (const s of steps) {
      if (span / s <= 6) { step = s; break; }
    }
    const min = Math.floor(lo / step) * step;
    const max = Math.ceil((hi + span * 0.06) / step) * step;
    const ticks = [];
    for (let v = min; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { min, max, ticks };
  }

  function xTicks(start, end) {
    const years = (end - start) / 12;
    const out = [];
    if (years <= 4) {
      for (let i = start; i < end; i++) {
        const [, mo] = D.months[i].split('-');
        if (mo === '01' || mo === '07') out.push({ i, label: D.months[i].replace('-', '.') });
      }
    } else {
      const step = years <= 12 ? 2 : years <= 26 ? 5 : 10;
      for (let i = start; i < end; i++) {
        const [y, mo] = D.months[i].split('-');
        if (mo === '01' && Number(y) % step === 0) out.push({ i, label: y });
      }
    }
    return out;
  }

  // ------------------------------------------------------------ chart

  function createChart(host, spec) {
    const tip = div('tip');
    tip.setAttribute('role', 'status');
    host.appendChild(tip);

    let geom = null; // kept for the pointer handler between renders

    /* The shared range filter starts where the star series starts, but a chart whose own
       series begin later would otherwise open with empty plot on the left. */
    const ownStart = (() => {
      let first = Infinity;
      for (const ser of spec.series) {
        for (let i = 0; i < ser.values.length; i++) {
          if (ser.values[i] != null) { if (i < first) first = i; break; }
        }
      }
      return Number.isFinite(first) ? first : 0;
    })();

    function render() {
      // The tooltip is positioned from the previous layout. Left showing across a resize
      // it would sit at a stale offset and drag a scrollbar onto the page.
      tip.dataset.show = 'false';
      tip.style.left = '';
      tip.style.top = '';
      delete host.dataset.idx;

      const sel = slice();
      const end = sel.end;
      const start = Math.max(sel.start, Math.min(ownStart, end - 1));
      const n = end - start;
      const hidden = state.hidden[spec.group];
      const shown = hidden ? spec.series.filter((s) => !hidden.has(s.key)) : spec.series;

      // Use the real container width — a floor above it would squish the plot on phones.
      const W = Math.max(host.clientWidth || 640, 240);
      const H = Math.round(Math.max(
        spec.minH, Math.min(W * spec.ratio, spec.maxH, innerHeight * 0.62)));
      const narrow = W < 560;
      const M = { top: 14, right: narrow ? 42 : 62, bottom: 28, left: narrow ? 36 : 46 };
      const iw = W - M.left - M.right;
      const ih = H - M.top - M.bottom;

      const dom = spec.domain ? spec.domain() : (() => {
        let lo = Infinity, hi = -Infinity;
        for (const s of shown) {
          for (let i = start; i < end; i++) {
            const v = s.values[i];
            if (v == null) continue;
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
        }
        if (!Number.isFinite(lo)) { lo = 0; hi = 4; }
        return niceDomain(lo, hi);
      })();

      const X = (i) => M.left + (n <= 1 ? iw / 2 : ((i - start) / (n - 1)) * iw);
      const Y = (v) => M.top + ih * (1 - (v - dom.min) / (dom.max - dom.min));
      geom = { X, Y, start, end, n, M, iw, ih, shown, dom };

      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });

      const ink = {
        grid: cssVar('--gridline'), base: cssVar('--baseline'),
        muted: cssVar('--text-muted'), secondary: cssVar('--text-secondary'),
        primary: cssVar('--text-primary'), surface: cssVar('--surface-1'),
        recession: cssVar('--recession-band'),
      };
      const clampX = (x) => Math.max(M.left, Math.min(M.left + iw, x));

      // --- recession bands, behind everything
      for (const r of D.recessions || []) {
        const a = D.months.indexOf(r.start);
        const b = D.months.indexOf(r.end);
        if (a < 0 || b < 0 || b < start || a >= end) continue;
        const x1 = clampX(X(Math.max(a, start)));
        const x2 = clampX(X(Math.min(b, end - 1)));
        if (x2 - x1 < 0.5) continue;
        svg.appendChild(el('rect', { x: x1, y: M.top, width: x2 - x1, height: ih, fill: ink.recession }));
      }

      // --- gridlines: hairline, solid, recessive
      for (const t of dom.ticks) {
        const y = Y(t);
        svg.appendChild(el('line', {
          x1: M.left, x2: M.left + iw, y1: y, y2: y,
          stroke: t === 0 ? ink.base : ink.grid, 'stroke-width': 1,
        }));
        const lbl = el('text', {
          x: M.left - 9, y: y + 4, 'text-anchor': 'end', fill: ink.muted,
          'font-size': 11.5, 'font-family': 'inherit',
          style: 'font-variant-numeric:tabular-nums',
        });
        lbl.textContent = t + '%';
        svg.appendChild(lbl);
      }

      // --- policy target, behind the data; its label goes on after the marks
      const hasTarget = spec.target != null && spec.target >= dom.min && spec.target <= dom.max;
      if (hasTarget) {
        svg.appendChild(el('line', {
          x1: M.left, x2: M.left + iw, y1: Y(spec.target), y2: Y(spec.target),
          stroke: ink.base, 'stroke-width': 1.5,
        }));
      }

      // --- x axis
      svg.appendChild(el('line', {
        x1: M.left, x2: M.left + iw, y1: M.top + ih, y2: M.top + ih,
        stroke: ink.base, 'stroke-width': 1,
      }));
      let lastX = -Infinity;
      for (const t of xTicks(start, end)) {
        const x = X(t.i);
        if (x - lastX < 46) continue; // drop labels that would collide
        lastX = x;
        const lbl = el('text', {
          x, y: M.top + ih + 17, 'text-anchor': 'middle', fill: ink.muted,
          'font-size': 11.5, 'font-family': 'inherit',
          style: 'font-variant-numeric:tabular-nums',
        });
        lbl.textContent = t.label;
        svg.appendChild(lbl);
      }

      drawLines({ svg, X, Y, start, end, shown, M, ih, ink });

      // --- crosshair layer (hidden until pointer/focus)
      const cross = el('g', { opacity: 0 });
      const crossLine = el('line', { y1: M.top, y2: M.top + ih, stroke: ink.muted, 'stroke-width': 1 });
      cross.appendChild(crossLine);
      const crossDots = el('g');
      cross.appendChild(crossDots);
      svg.appendChild(cross);

      host.querySelectorAll('svg').forEach((s) => s.remove());
      host.insertBefore(svg, tip);

      // The target label sits inside the plot and needs a surface chip behind it, or the
      // data lines run through the text. getBBox needs the node rendered.
      if (hasTarget && spec.targetLabel) {
        const t = el('text', {
          x: M.left + 8, y: Y(spec.target) - 7, fill: ink.secondary,
          'font-size': 11, 'font-family': 'inherit',
        });
        t.textContent = narrow ? U.targetShort : spec.targetLabel;
        svg.appendChild(t);
        const b = t.getBBox();
        svg.insertBefore(el('rect', {
          x: b.x - 4, y: b.y - 1, width: b.width + 8, height: b.height + 2,
          rx: 3, fill: ink.surface, opacity: 0.95,
        }), t);
      }

      Object.assign(geom, { cross, crossLine, crossDots, ink, W, H });
    }

    function showAt(idx) {
      if (!geom) return;
      const { X, Y, M, iw, shown, ink } = geom;
      const i = Math.max(geom.start, Math.min(geom.end - 1, idx));
      const x = X(i);

      geom.cross.setAttribute('opacity', '1');
      geom.crossLine.setAttribute('x1', x);
      geom.crossLine.setAttribute('x2', x);
      geom.crossDots.replaceChildren();

      // Untrusted-data rule: every label goes in via textContent, never innerHTML.
      tip.replaceChildren();
      const dateEl = div('tip-date');
      dateEl.textContent = monthLabel(D.months[i]);
      tip.appendChild(dateEl);

      let any = false;
      for (const s of shown) {
        const v = s.values[i];
        const row = div('tip-row');
        const key = div('tip-key');
        key.style.background = cssVar(s.varName);
        const value = div('tip-val');
        value.textContent = pct(v);
        const name = div('tip-name');
        name.textContent = s.name;
        row.append(key, value, name);
        tip.appendChild(row);
        if (v != null) {
          any = true;
          geom.crossDots.appendChild(el('circle', {
            cx: x, cy: Y(v), r: 4, fill: cssVar(s.varName),
            stroke: ink.surface, 'stroke-width': 2,
          }));
        }
      }
      if (!any) {
        const note = div('tip-missing');
        note.textContent = U.tipNone;
        tip.appendChild(note);
      }

      tip.dataset.show = 'true';
      const tw = tip.offsetWidth || 180;
      const left = x + 16 + tw > M.left + iw + 60 ? x - tw - 16 : x + 16;
      tip.style.left = Math.max(2, left) + 'px';
      tip.style.top = '10px';
      host.dataset.idx = String(i);
    }

    function hide() {
      if (!geom) return;
      geom.cross.setAttribute('opacity', '0');
      tip.dataset.show = 'false';
    }

    function idxFromClientX(clientX) {
      const r = host.getBoundingClientRect();
      const scale = geom.W / r.width;
      const px = (clientX - r.left) * scale;
      const t = (px - geom.M.left) / (geom.iw || 1);
      return geom.start + Math.round(t * (geom.n - 1));
    }

    // The crosshair finds the X — readers aim at a date, not at a 2px line.
    host.addEventListener('pointermove', (e) => geom && showAt(idxFromClientX(e.clientX)));
    host.addEventListener('pointerleave', hide);
    host.addEventListener('focus', () => geom && showAt(Number(host.dataset.idx) || geom.end - 1));
    host.addEventListener('blur', hide);
    host.addEventListener('keydown', (e) => {
      if (!geom) return;
      const cur = Number(host.dataset.idx);
      const i = Number.isFinite(cur) && cur ? cur : geom.end - 1;
      const step = e.shiftKey ? 12 : 1;
      if (e.key === 'ArrowLeft') { showAt(i - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { showAt(i + step); e.preventDefault(); }
      else if (e.key === 'Home') { showAt(geom.start); e.preventDefault(); }
      else if (e.key === 'End') { showAt(geom.end - 1); e.preventDefault(); }
      else if (e.key === 'Escape') hide();
    });

    return { render, hide };
  }

  /* Lines broken across nulls rather than interpolated, end markers, and direct labels
     that step apart when they would collide. */
  function drawLines({ svg, X, Y, start, end, shown, M, ih, ink }) {
    const endPoints = [];
    for (const s of shown) {
      const color = cssVar(s.varName);
      let d = '';
      let pen = false;
      let lastGood = null;
      for (let i = start; i < end; i++) {
        const v = s.values[i];
        if (v == null) { pen = false; continue; }
        d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
        pen = true;
        lastGood = { i, v };
      }
      if (d) {
        svg.appendChild(el('path', {
          d, fill: 'none', stroke: color, 'stroke-width': 2,
          'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        }));
      }
      if (lastGood) endPoints.push({ s, color, ...lastGood });
    }

    const labels = endPoints.map((p) => ({ p, anchorY: Y(p.v), y: Y(p.v), text: p.v.toFixed(1) }));
    labels.sort((a, b) => a.y - b.y);
    const GAP = 15;
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].y - labels[i - 1].y < GAP) labels[i].y = labels[i - 1].y + GAP;
    }
    const overflow = labels.length ? labels[labels.length - 1].y - (M.top + ih) : 0;
    if (overflow > 0) for (const l of labels) l.y -= overflow;
    for (let i = labels.length - 2; i >= 0; i--) {
      if (labels[i + 1].y - labels[i].y < GAP) labels[i].y = labels[i + 1].y - GAP;
    }

    for (const l of labels) {
      const x = X(l.p.i);
      // Leader line only when the label had to leave its point.
      if (Math.abs(l.y - l.anchorY) > 1.5) {
        svg.appendChild(el('path', {
          d: `M${x + 5} ${l.anchorY} L${x + 12} ${l.anchorY} L${x + 16} ${l.y} L${x + 21} ${l.y}`,
          fill: 'none', stroke: l.p.color, 'stroke-width': 1, opacity: 0.55,
        }));
      }
      // 2px surface ring keeps overlapping end dots legible.
      svg.appendChild(el('circle', {
        cx: x, cy: l.anchorY, r: 4.5, fill: l.p.color,
        stroke: ink.surface, 'stroke-width': 2,
      }));
      const t = el('text', {
        x: x + 24, y: l.y + 4, fill: ink.primary, 'font-size': 12, 'font-weight': 600,
        'font-family': 'inherit', style: 'font-variant-numeric:tabular-nums',
      });
      t.textContent = l.text;
      svg.appendChild(t);
    }
  }

  // ------------------------------------------------------------ legend

  function buildLegend(container, series, group, onChange) {
    container.replaceChildren();
    for (const s of series) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(!state.hidden[group].has(s.key)));
      const key = div('legend-key');
      key.style.background = cssVar(s.varName);
      const label = document.createElement('span');
      label.textContent = s.name;
      b.append(key, label);
      b.addEventListener('click', () => {
        const set = state.hidden[group];
        if (set.has(s.key)) set.delete(s.key);
        else if (series.length - set.size > 1) set.add(s.key); // never hide the last one
        buildLegend(container, series, group, onChange);
        onChange();
      });
      container.appendChild(b);
    }
  }

  // ------------------------------------------------------------ header stats

  function lastValue(arr, upTo) {
    for (let i = upTo; i >= 0; i--) if (arr?.[i] != null) return { v: arr[i], i };
    return { v: null, i: -1 };
  }

  function renderStats() {
    const last = D.months.length - 1;
    const hero = val('trimmedMean') ?? [];
    const cur = lastValue(hero, last);
    const prev = cur.i > 0 ? lastValue(hero, cur.i - 1) : { v: null };

    document.getElementById('hero-value').textContent = pct(cur.v);
    const dEl = document.getElementById('hero-delta');
    if (cur.v != null && prev.v != null) {
      const d = cur.v - prev.v;
      dEl.textContent = (d > 0 ? '▲ +' : d < 0 ? '▼ ' : '– ') + d.toFixed(2) + 'p';
      dEl.className = 'delta ' + (d > 0.005 ? 'up' : d < -0.005 ? 'down' : 'flat');
      dEl.title = U.deltaTitle;
    }
    document.getElementById('hero-meta').textContent =
      `${monthLabel(D.months[cur.i])}${U.sep}${U.heroMeta}`;

    const tiles = [
      { k: 'weightedMedian', ...lastValue(val('weightedMedian'), last) },
      { k: 'mode', ...lastValue(val('mode'), last) },
      { k: 'exFresh', ...lastValue(val('exFresh'), last) },
      { k: 'exFoodEnergy', ...lastValue(val('exFoodEnergy'), last) },
      { k: 'shareRising', ...lastValue(val('shareRising'), last) },
      { k: 'diffusion', ...lastValue(val('diffusion'), last) },
    ].filter((t) => t.i >= 0);

    const host = document.getElementById('tiles');
    host.replaceChildren();
    for (const t of tiles) {
      // The third entry overrides the unit: the diffusion index is a spread between two
      // shares, so it is percentage POINTS and printing it as % would misstate it.
      const [label, note, unit] = U.tiles[t.k];
      const c = div('tile');
      const l = div('tile-label'); l.textContent = label;
      const v = div('tile-value');
      v.textContent = t.v == null ? '—' : t.v.toFixed(1) + (unit ?? '%');
      const nEl = div('tile-note');
      nEl.textContent = `${T.monthShort(D.months[t.i])}${U.sep}${note}`;
      c.append(l, v, nEl);
      host.appendChild(c);
    }
  }

  // ------------------------------------------------------------ table view

  function renderTable() {
    const wrap = document.getElementById('table-wrap');
    if (!state.tableOpen) return;
    const { start, end } = slice();
    const C = U.table.cols;
    const cols = [
      'trimmedMean', 'weightedMedian', 'mode', 'exFresh', 'exFreshEnergy', 'exFoodEnergy',
      'headline', 'coreOfficial', 'shareRising', 'shareFalling', 'diffusion',
    ].filter(has).map((k) => ({ h: C[k], get: (i) => val(k)[i] }));

    const table = document.createElement('table');
    const cap = document.createElement('caption');
    cap.textContent = U.table.caption(
      T.monthShort(D.months[start]), T.monthShort(D.months[end - 1]));
    table.appendChild(cap);

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    for (const h of [U.table.month, ...cols.map((c) => c.h)]) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = h;
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = end - 1; i >= start; i--) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.style.textAlign = 'left';
      th.style.fontWeight = '400';
      th.textContent = D.months[i];
      tr.appendChild(th);
      for (const c of cols) {
        const td = document.createElement('td');
        const v = c.get(i);
        td.textContent = v == null ? '—' : v.toFixed(2);
        if (v == null) td.className = 'na';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.replaceChildren(table);
  }

  // ------------------------------------------------------------ wiring

  const charts = [];

  charts.push(createChart(document.getElementById('chart-yoy'), {
    group: 'yoy', series: YOY_SERIES, ratio: 0.32, minH: 260, maxH: 540,
    target: 2, targetLabel: U.target,
  }));

  if (BREADTH_SERIES.length) {
    document.getElementById('card-breadth').hidden = false;
    charts.push(createChart(document.getElementById('chart-breadth'), {
      group: 'breadth', series: BREADTH_SERIES, ratio: 0.28, minH: 240, maxH: 440,
      // A share-of-basket axis is always 0-100; autoscaling would make two range
      // selections silently incomparable.
      domain: () => ({ min: 0, max: 100, ticks: [0, 25, 50, 75, 100] }),
    }));
  }

  function renderAll() {
    for (const c of charts) c.render();
    renderTable();
  }

  const seg = document.getElementById('range-seg');
  for (const r of RANGES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = r.label;
    b.setAttribute('aria-pressed', String(state.range === r.id));
    b.addEventListener('click', () => {
      state.range = r.id;
      seg.querySelectorAll('button').forEach((x, k) =>
        x.setAttribute('aria-pressed', String(RANGES[k].id === r.id)));
      renderAll();
    });
    seg.appendChild(b);
  }

  const rebuildLegends = () => {
    buildLegend(document.getElementById('legend-yoy'), YOY_SERIES, 'yoy', renderAll);
    if (BREADTH_SERIES.length) {
      buildLegend(document.getElementById('legend-breadth'), BREADTH_SERIES, 'breadth', renderAll);
    }
  };
  rebuildLegends();

  const tableBtn = document.getElementById('table-toggle');
  // The inline label is the Korean fallback; set it so a language swap reaches it.
  tableBtn.textContent = U.tableOpen;
  tableBtn.addEventListener('click', () => {
    state.tableOpen = !state.tableOpen;
    document.getElementById('table-wrap').hidden = !state.tableOpen;
    tableBtn.setAttribute('aria-expanded', String(state.tableOpen));
    tableBtn.textContent = state.tableOpen ? U.tableClose : U.tableOpen;
    renderTable();
  });

  const themeBtn = document.getElementById('theme-toggle');
  const savedTheme = (() => {
    try { return localStorage.getItem('jpn-theme'); } catch { return null; }
  })();
  if (savedTheme) root.dataset.theme = savedTheme;
  else root.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const syncThemeBtn = () => {
    const dark = root.dataset.theme === 'dark';
    themeBtn.textContent = dark ? U.themeLight : U.themeDark;
    themeBtn.setAttribute('aria-label', dark ? T.aria.themeToLight : T.aria.themeToDark);
  };
  themeBtn.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('jpn-theme', root.dataset.theme); } catch { /* ignore */ }
    syncThemeBtn();
    rebuildLegends();
    renderAll();
  });
  syncThemeBtn();

  document.getElementById('base-note').append(
    U.baseNote(D.baseSpans.map((s) => `${s.base}${U.baseYear}`).join(', ')));

  document.getElementById('generated-note').textContent = U.generated(
    new Date(D.generatedAt).toLocaleString(T.locale), D.months[firstIdx], D.latestMonth);

  renderStats();
  renderAll();

  let raf = 0;
  const scheduleRender = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(renderAll);
  };

  // Window resize covers both axes — including a height-only drag, which matters because
  // chart height is capped against innerHeight.
  addEventListener('resize', scheduleRender);

  // Container-driven width changes the window event misses: a scrollbar appearing, zoom,
  // or the table view widening the page. Guarded on width so the taller SVG this render
  // produces cannot re-trigger the observer.
  let lastW = 0;
  new ResizeObserver((entries) => {
    const w = entries[0].contentRect.width;
    if (Math.abs(w - lastW) < 0.5) return;
    lastW = w;
    scheduleRender();
  }).observe(document.querySelector('.wrap'));
})();
