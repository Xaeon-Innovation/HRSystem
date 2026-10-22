/* Core helpers, state, sample data */
window.E = (function () {
  const state = {
    theme: (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    accent: 'lime',
    dir: 'ltr',
    role: 'admin', // admin | employee | platform
    openGroups: { leave: true },
  };

  const ic = (n, cls = '') => `<i data-lucide="${n}" class="${cls}"></i>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const PALETTE = ['#E9F3D2', '#FBE7D3', '#F7F2C2', '#DCE9FF', '#EDE3FB', '#FCE3E3', '#DDF3EE', '#ECECEA'];
  const PALETTE_DARK = ['#2A3518', '#3A2A1C', '#36331A', '#1C2A40', '#2C2340', '#3A1E1F', '#173430', '#26272A'];
  const initials = (n) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const hash = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
  const av = (name, cls = '', pres) => {
    const i = hash(name) % PALETTE.length;
    const bg = state.theme === 'dark' ? PALETTE_DARK[i] : PALETTE[i];
    const p = pres ? `<span class="pres" style="background:${pres === 'on' ? 'var(--accent)' : pres === 'late' ? 'var(--warn)' : 'var(--faint)'}"></span>` : '';
    return `<span class="av ${cls}" style="background:${bg};color:var(--text)">${initials(name)}${p}</span>`;
  };

  const chip = (label, tone = '', dot = false) => `<span class="chip ${tone}">${dot ? '<span class="d"></span>' : ''}${label}</span>`;
  const statusTone = (s) => {
    s = String(s).toLowerCase();
    if (/(approved|active|on shift|completed|hired|paid|connected|ga|converted|healthy|clocked in|on track|accepted|resolved|succeeded)/.test(s)) return 'ok';
    if (/(pending|submitted|in progress|trial|lab|contacted|on hold|late|qualified|changes|paused|due|syncing|interview|warning|offer)/.test(s)) return 'warn';
    if (/(rejected|failed|missed|suspended|urgent|overdue|expired|cancelled|off track|past due|critical|deleted|withdrawn)/.test(s)) return 'danger';
    if (/(new|open|draft|info|returned|scheduled)/.test(s)) return 'info';
    return '';
  };
  const status = (s, dot = true) => chip(s, statusTone(s), dot);

  const card = ({ title = '', sub = '', actions = '', body = '', cls = '', style = '' }) => `
    <section class="card ${cls}" style="${style}">
      ${title ? `<div class="card-head"><div><h3 class="card-title">${title}</h3>${sub ? `<div class="card-sub">${sub}</div>` : ''}</div>${actions ? `<div class="card-actions">${actions}</div>` : ''}</div>` : ''}
      ${body}
    </section>`;

  const pill = (label) => `<button class="pill-select">${label}${ic('chevron-down')}</button>`;
  const delta = (v, txt = 'from last month') => {
    const up = !String(v).startsWith('-');
    return `<div class="delta ${up ? 'up' : 'down'}">${ic(up ? 'trending-up' : 'trending-down')}<b>${v}</b> ${txt}</div>`;
  };

  const pageHead = (title, sub = '', actions = '', crumbs = '') => `
    <div class="page-head">
      <div>${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
      <div class="row wrap">${actions}</div>
    </div>`;

  const tabs = (items, active, base) => `<div class="tabs" role="tablist">${items.map(([k, l, c]) => `<a class="tab ${k === active ? 'on' : ''}" href="#${base}${k ? '/' + k : ''}" role="tab">${l}${c ? `<span class="count">${c}</span>` : ''}</a>`).join('')}</div>`;

  const table = (cols, rows, opts = {}) => `
    <div class="table-wrap"><table class="t">
      <thead><tr>${cols.map((c) => `<th class="${c.num ? 'num' : ''}">${c.l}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr ${opts.rowAttr ? opts.rowAttr(r) : ''}>${cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.r ? c.r(r) : r[c.k]}</td>`).join('')}</tr>`).join('')}</tbody>
      ${opts.foot ? `<tfoot><tr>${opts.foot.map((f, i) => `<td class="${cols[i] && cols[i].num ? 'num' : ''}">${f}</td>`).join('')}</tr></tfoot>` : ''}
    </table></div>`;

  const person = (name, sub, pres) => `<div class="cell-person">${av(name, 'sm', pres)}<div><b>${name}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>`;

  const track = (pct, cls = 'hatch', size = '') => `<div class="track ${size}"><span class="${cls}" style="width:${pct}%"></span></div>`;

  /* Bar chart with stacked hatched segments (reference hero) */
  const barChart = (data, { max = 30, min = -10, keys = [], active = -1, id = 'bc', fmt = (v) => v } = {}) => {
    const range = max - min;
    const ticks = 5;
    const yl = Array.from({ length: ticks }, (_, i) => Math.round(max - (range / (ticks - 1)) * i));
    const cols = data
      .map((d, i) => {
        const isOn = i === active;
        const segs = keys
          .map((k) => {
            const v = d[k.k] || 0;
            const h = (Math.abs(v) / range) * 100;
            return `<div class="seg-b ${isOn || active < 0 ? k.cls : 'hatch-idle'}" style="height:${h}%"></div>`;
          })
          .join('');
        return `<div class="barcol ${isOn ? 'on' : ''}" data-i="${i}" data-chart="${id}">${segs}<span class="xl">${d.l}</span></div>`;
      })
      .join('');
    return `<div class="barchart" id="${id}"><div class="yaxis">${yl.map((v) => `<span>${fmt(v)}</span>`).join('')}</div>
      <div class="plot"><div class="gridlines">${yl.map(() => '<span></span>').join('')}</div>${cols}</div></div>`;
  };

  /* Semi gauge with segmented hatched arc (reference: financial health) */
  const gauge = (pct, label, sub) => {
    const segs = 14,
      r = 90,
      cx = 110,
      cy = 105,
      gap = 2.2;
    let out = '';
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI + (Math.PI / segs) * i + (gap * Math.PI) / 180 / 2;
      const a1 = Math.PI + (Math.PI / segs) * (i + 1) - (gap * Math.PI) / 180 / 2;
      const ro = r, ri = r - 26;
      const p = (a, rr) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
      const filled = i / segs < pct / 100;
      const op = filled ? 0.55 + 0.45 * (i / segs) : 1;
      out += `<path d="M${p(a0, ro)} A${ro},${ro} 0 0 1 ${p(a1, ro)} L${p(a1, ri)} A${ri},${ri} 0 0 0 ${p(a0, ri)} Z" fill="${filled ? 'url(#hatchG)' : 'var(--bar-idle)'}" opacity="${op}"/>`;
    }
    return `<div class="gauge"><svg viewBox="0 0 220 118">
      <defs><pattern id="hatchG" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="var(--accent)"/><rect width="3" height="7" fill="rgba(255,255,255,.28)"/></pattern></defs>${out}</svg>
      <div class="center"><div class="mid">${label}</div><div class="xs muted">${sub}</div></div></div>`;
  };

  /* Sparkline / area line */
  const line = (vals, { h = 120, w = 520, area = true, color = 'var(--accent)', id = 'ln' + Math.random().toString(36).slice(2, 7) } = {}) => {
    const mx = Math.max(...vals), mn = Math.min(...vals);
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 8 - ((v - mn) / (mx - mn || 1)) * (h - 20)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block">
      <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${area ? `<path d="${d} L${w},${h} L0,${h} Z" fill="url(#${id})"/>` : ''}
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="4" fill="var(--surface)" stroke="${color}" stroke-width="2"/>
    </svg>`;
  };

  const miniBars = (vals, cls = 'hatch', h = 44) => {
    const mx = Math.max(...vals);
    return `<div style="display:flex;align-items:flex-end;gap:3px;height:${h}px">${vals.map((v, i) => `<span class="${i === vals.length - 1 ? cls : 'hatch-idle'}" style="flex:1;border-radius:3px;height:${(v / mx) * 100}%"></span>`).join('')}</div>`;
  };

  const stairs = () => {
    const pat = [0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1];
    return `<div class="stairs">${pat.map((p, i) => `<span class="${p ? (i % 3 ? 'hatch' : 'hatch-soft') : ''}"></span>`).join('')}</div>`;
  };

  const empty = (icon, title, sub, action = '') => `<div class="empty"><div class="ico-tile lg">${ic(icon)}</div><div class="strong" style="color:var(--text)">${title}</div><div class="small mt-1">${sub}</div>${action ? `<div class="mt-2">${action}</div>` : ''}</div>`;

  /* ---------- sample data ---------- */
  const people = [
    { id: 1, name: 'Omar Haddad', title: 'Field Technician', role: 'Technician', branch: 'Downtown HQ', mgr: 'Lina Farouk', mode: 'Mobile', status: 'Active', access: 'Employee', email: 'omar.h@nilelogistics.com', phone: '+971 50 214 7781', pres: 'on', in: '07:58', score: 92 },
    { id: 2, name: 'Lina Farouk', title: 'Operations Manager', role: 'Manager', branch: 'Downtown HQ', mgr: '—', mode: 'Fixed zone', status: 'Active', access: 'Admin', email: 'lina.f@nilelogistics.com', phone: '+971 55 901 2234', pres: 'on', in: '08:03', score: 88 },
    { id: 3, name: 'Youssef Nabil', title: 'Delivery Driver', role: 'Driver', branch: 'Marina Depot', mgr: 'Lina Farouk', mode: 'Mobile', status: 'Active', access: 'Employee', email: 'youssef.n@nilelogistics.com', phone: '+971 52 118 6650', pres: 'late', in: '08:41', score: 74 },
    { id: 4, name: 'Sara Al-Mansouri', title: 'HR Specialist', role: 'HR', branch: 'Downtown HQ', mgr: 'Lina Farouk', mode: 'Fixed zone', status: 'Active', access: 'Employee', email: 'sara.m@nilelogistics.com', phone: '+971 50 774 1209', pres: 'on', in: '07:52', score: 95, sys: ['leaves', 'hiring'] },
    { id: 5, name: 'Karim Adel', title: 'Warehouse Lead', role: 'Supervisor', branch: 'Marina Depot', mgr: 'Lina Farouk', mode: 'Fixed zone', status: 'Active', access: 'Employee', email: 'karim.a@nilelogistics.com', phone: '+971 56 330 9921', pres: 'on', in: '07:30', score: 81 },
    { id: 6, name: 'Mariam Saeed', title: 'Sales Executive', role: 'Sales', branch: 'Business Bay', mgr: 'Hassan Ali', mode: 'Mobile', status: 'Active', access: 'Employee', email: 'mariam.s@nilelogistics.com', phone: '+971 54 662 0187', pres: 'off', in: '—', score: 86 },
    { id: 7, name: 'Ahmed Tarek', title: 'Field Technician', role: 'Technician', branch: 'Marina Depot', mgr: 'Karim Adel', mode: 'Mobile', status: 'On leave', access: 'Employee', email: 'ahmed.t@nilelogistics.com', phone: '+971 50 448 7712', pres: 'off', in: '—', score: 69 },
    { id: 8, name: 'Noura Khalil', title: 'Accountant', role: 'Finance', branch: 'Business Bay', mgr: 'Hassan Ali', mode: 'Fixed zone', status: 'Active', access: 'Employee', email: 'noura.k@nilelogistics.com', phone: '+971 55 210 3381', pres: 'on', in: '08:00', score: 90, sys: ['compensation'] },
    { id: 9, name: 'Hassan Ali', title: 'Commercial Director', role: 'Manager', branch: 'Business Bay', mgr: '—', mode: 'Fixed zone', status: 'Active', access: 'Admin', email: 'hassan.a@nilelogistics.com', phone: '+971 50 101 4420', pres: 'on', in: '08:12', score: 84 },
    { id: 10, name: 'Dina Mostafa', title: 'Delivery Driver', role: 'Driver', branch: 'Marina Depot', mgr: 'Karim Adel', mode: 'Mobile', status: 'Active', access: 'Employee', email: 'dina.m@nilelogistics.com', phone: '+971 52 993 0045', pres: 'on', in: '07:47', score: 78 },
    { id: 11, name: 'Rami Aziz', title: 'Field Technician', role: 'Technician', branch: 'Downtown HQ', mgr: 'Lina Farouk', mode: 'Mobile', status: 'Active', access: 'Employee', email: 'rami.a@nilelogistics.com', phone: '+971 56 712 8803', pres: 'late', in: '09:05', score: 71 },
    { id: 12, name: 'Layla Hamdan', title: 'Customer Support', role: 'Support', branch: 'Business Bay', mgr: 'Hassan Ali', mode: 'Fixed zone', status: 'Active', access: 'Employee', email: 'layla.h@nilelogistics.com', phone: '+971 54 380 1176', pres: 'on', in: '07:59', score: 89 },
  ];
  const P = (n) => people.find((p) => p.name.startsWith(n));

  return { state, ic, esc, av, chip, status, statusTone, card, pill, delta, pageHead, tabs, table, person, track, barChart, gauge, line, miniBars, stairs, empty, people, P, initials };
})();
