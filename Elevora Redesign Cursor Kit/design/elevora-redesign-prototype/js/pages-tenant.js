/* Tenant workspace: operate + people core + system */
(function () {
  const { ic, av, chip, status, card, pill, delta, pageHead, tabs, table, person, track, barChart, gauge, line, miniBars, stairs, empty, people, P, state } = E;
  const isAdmin = () => state.role === 'admin';

  /* interactive bar chart tooltip */
  E.bindBars = (id, data, keys, title) => {
    const root = document.getElementById(id);
    if (!root) return;
    const plot = root.querySelector('.plot');
    let tip = document.createElement('div');
    tip.className = 'tooltip'; tip.style.display = 'none'; plot.appendChild(tip);
    const show = (i) => {
      root.querySelectorAll('.barcol').forEach((c, j) => {
        c.classList.toggle('on', j === i);
        c.querySelectorAll('.seg-b').forEach((s, k) => { s.className = 'seg-b ' + (j === i ? keys[k].cls : 'hatch-idle'); });
      });
      const col = root.querySelectorAll('.barcol')[i];
      const d = data[i];
      tip.innerHTML = `<div class="t">${title(d)}</div>${keys.map((k) => `<div class="r"><span><i style="display:inline-block;width:7px;height:7px;border-radius:2px;margin-inline-end:6px" class="${k.cls}"></i>${k.l}</span><b>${k.f ? k.f(d[k.k]) : d[k.k]}</b></div>`).join('')}`;
      tip.style.display = 'block';
      const pr = plot.getBoundingClientRect(), cr = col.getBoundingClientRect();
      let left = cr.left - pr.left + cr.width + 8;
      if (left + 150 > pr.width) left = cr.left - pr.left - 158;
      tip.style.left = left + 'px'; tip.style.top = '6px';
    };
    root.querySelectorAll('.barcol').forEach((c, i) => { c.addEventListener('mouseenter', () => show(i)); c.addEventListener('click', () => show(i)); });
    const on = [...root.querySelectorAll('.barcol')].findIndex((c) => c.classList.contains('on'));
    if (on >= 0) show(on);
  };

  const week = [
    { l: 'Sun', d: 'Sun, 11 Oct', on: 41, late: 4, ot: 3 },
    { l: 'Mon', d: 'Mon, 12 Oct', on: 43, late: 3, ot: 5 },
    { l: 'Tue', d: 'Tue, 13 Oct', on: 39, late: 6, ot: 4 },
    { l: 'Wed', d: 'Wed, 14 Oct', on: 44, late: 2, ot: 6 },
    { l: 'Thu', d: 'Thu, 15 Oct', on: 40, late: 5, ot: 2 },
    { l: 'Fri', d: 'Fri, 16 Oct', on: 33, late: 5, ot: 0 },
    { l: 'Sat', d: 'Sat, 17 Oct', on: 12, late: 1, ot: 0 },
  ];
  const weekKeys = [{ k: 'on', l: 'On time', cls: 'hatch' }, { k: 'late', l: 'Late', cls: 'hatch-yellow' }, { k: 'ot', l: 'Overtime', cls: 'hatch-warn' }];

  /* ---------------- Dashboard ---------------- */
  E.reg('/app', () => {
    if (state.role === 'platform') return E.platformOverview();
    if (state.role === 'employee') { location.hash = '/app/clock'; return ''; }
    const checklist = [['Brand the workspace', 1], ['Branches and sites', 1], ['Job roles', 1], ['Skills catalog', 1], ['Add employees', 1], ['Presence and work zones', 1], ['Shift patterns', 0], ['Review leave policies', 0], ['Alert rules', 0]];
    const done = checklist.filter((c) => c[1]).length;
    const recent = [
      ['Omar Haddad', 'Clocked in · Mobile', '07:58', 'On time'],
      ['Youssef Nabil', 'Clocked in · Marina Depot', '08:41', 'Late'],
      ['Ahmed Tarek', 'Annual leave approved', '08:20', 'Approved'],
      ['Rami Aziz', 'Left work zone · 14 min', '09:47', 'Review'],
      ['Mariam Saeed', 'Missed clock-out yesterday', '00:05', 'Missed'],
      ['Layla Hamdan', 'Task submitted · Q3 report', '10:12', 'Submitted'],
      ['Karim Adel', 'Break ended', '11:30', 'On shift'],
    ];
    return `
    ${pageHead('Good morning, Lina', 'Friday, 16 October · live workforce first, then goals and leave.', `<a class="btn" href="#/app/map">${ic('map-pinned')}Open live map</a><a class="btn btn-ink" href="#/app/leave">${ic('palmtree')}Review leave · 4</a>`)}
    <div class="grid with-rail">
      <div class="grid g-12">
        <section class="card c-12"><div class="grid split-hero" style="grid-template-columns:1fr 210px;gap:22px">
          <div>
            <div class="card-head" style="margin-bottom:6px">
              <div><div class="big-xl">38 <span class="muted" style="font-size:20px;font-weight:500">/ 52</span></div><div class="card-sub">Clocked in now · live presence</div></div>
              <div class="card-actions">${pill('This week')}<span class="icon-sq on">${ic('chart-column')}</span><span class="icon-sq">${ic('chart-spline')}</span></div>
            </div>
            <div class="legend" style="justify-content:flex-end;margin-bottom:6px">${weekKeys.map((k) => `<span><i class="${k.cls}"></i>${k.l}</span>`).join('')}</div>
            ${barChart(week, { max: 60, min: 0, keys: weekKeys, active: 3, id: 'wk' })}
          </div>
          <div class="kpi-col">
            <div><div class="lbl">Live on map</div><div class="big">31</div>${delta('+4', 'field staff since 9am')}</div>
            <div><div class="lbl">Unread alerts</div><div class="big">26</div><div class="delta down">${ic('alert-triangle')}<b>3 missed clock-outs</b></div></div>
            <div><div class="lbl">Attendance rate</div><div class="big">94.2%</div>${delta('+1.8%')}</div>
          </div>
        </div></section>

        ${card({ cls: 'c-6', title: 'Seat usage', sub: 'Ops plan · renews 01 Nov', actions: `<a class="icon-sq" href="#/app/billing" aria-label="Edit seats">${ic('pencil')}</a>`, body: `${track(86.7, 'hatch')}<div class="row between mt-1 small"><b class="num">52 seats used</b><span class="muted num">60</span></div>` })}
        <section class="card c-6 tip-card"><h3 class="card-title" style="max-width:75%">Finish setting up your workspace</h3><p class="small muted" style="margin:6px 0 12px;max-width:68%">${done} of ${checklist.length} done. Shift patterns unlock late and overtime tracking.</p><a class="link" href="#/app/shifts">Set up shifts ${ic('chevron-right', 'flip-rtl')}</a>${stairs()}</section>

        ${card({ cls: 'c-4', title: 'Leave mix', sub: 'This month · 63 days', actions: pill('October'), body: `
          <div class="big">63 <span class="muted" style="font-size:16px;font-weight:500">days</span></div>
          <div class="segbar mt-2"><span class="hatch-warn" style="flex:28"></span><span class="hatch-yellow" style="flex:14"></span><span class="hatch-soft" style="flex:8"></span><span class="hatch" style="flex:22"></span><span class="hatch" style="flex:10;filter:saturate(1.4) brightness(.85)"></span><span class="hatch-idle" style="flex:18"></span></div>
          <div class="legend-list mt-2">${[['Annual', 28, 'hatch-warn'], ['Sick', 14, 'hatch-yellow'], ['Emergency', 8, 'hatch-soft'], ['Work from home', 22, 'hatch'], ['Compensatory', 10, 'hatch'], ['Other', 18, 'hatch-idle']].map(([l, v, c]) => `<div class="li"><span><i class="${c}"></i>${l}</span><b class="num">${v}%</b></div>`).join('')}</div>` })}
        ${card({ cls: 'c-4', title: 'Attendance health', sub: 'Last 30 days', actions: pill('30d'), body: `<div class="mid">1,412 <span class="muted small">sessions</span></div>${delta('+6.2%')}${gauge(78, '78%', 'on-time clock-ins')}<p class="xs muted" style="margin:6px 0 0">Based on clock-ins against shift windows over the past 30 days.</p>` })}
        ${card({ cls: 'c-4', title: 'KPI attention', sub: '13 active definitions', actions: `<a class="btn btn-sm" href="#/app/kpis">${ic('plus')}Add KPI</a>`, body: `
          <div class="xs muted mb-2">This period</div>
          ${[['Jobs completed', 412, 480, 'hatch', 'list-checks'], ['On-time arrivals', 91, 95, 'hatch', 'clock'], ['Customer visits', 168, 260, 'hatch-warn', 'map-pin'], ['Revenue linked', 64, 120, 'hatch-warn', 'banknote']].map(([l, v, t, c, i]) => `
            <div class="row" style="gap:10px;margin-bottom:12px"><div class="ico-tile">${ic(i)}</div><div style="flex:1;min-width:0"><div class="row between small"><b>${l}</b><span class="num"><b>${v}</b><span class="muted">/${t}</span></span></div>${track((v / t) * 100, c, 'sm')}<div class="xs muted mt-1">${Math.round((v / t) * 100)}% of target</div></div></div>`).join('')}` })}
      </div>

      <div class="stack" style="gap:var(--gap)">
        ${card({ title: 'Workspace', sub: 'Quick actions', actions: `<a class="btn btn-sm" href="#/app/settings">${ic('palette')}Brand</a>`, body: `
          <div class="accent-card"><div class="row between xs" style="position:relative;z-index:1"><b>Ops plan</b><b>NILE LOGISTICS</b></div><div style="height:46px"></div><div class="row between" style="position:relative;z-index:1"><div><div class="xs" style="opacity:.75">Seats</div><b class="num">52 / 60</b></div><div style="text-align:end"><div class="xs" style="opacity:.75">Renews</div><b class="num">01/11</b></div></div></div>
          <div class="qa-grid mt-2">${[['user-plus', 'Add', '/app/employees'], ['megaphone', 'Announce', '/app/notifications'], ['check-check', 'Approve', '/app/leave'], ['file-down', 'Export', '/app/attendance/hours'], ['ellipsis', 'More', '/app/settings']].map(([i, l, h]) => `<a class="qa" href="#${h}"><span class="sq">${ic(i)}</span>${l}</a>`).join('')}</div>
          <div class="row between mt-3 mb-2"><b class="small">Clocked in now</b><a class="muted" href="#/app/team">${ic('ellipsis-vertical')}</a></div>
          <div class="people-row">${people.filter((p) => p.pres !== 'off').slice(0, 5).map((p) => `<div class="p">${av(p.name, '', p.pres)}<span>${p.name.split(' ')[0]}</span></div>`).join('')}</div>` })}
        ${card({ title: 'Live activity', actions: pill('Today'), body: `<div class="row between xs muted" style="padding-bottom:4px"><span>Event</span><span>Time</span></div><div class="list">${recent.map(([n, s, tm, st]) => `<div class="li">${av(n, 'sq')}<div class="meta"><b>${n}</b><span>${s}</span></div><div class="end"><b>${tm}</b><span class="status-text ${E.statusTone(st)}">${st}</span></div></div>`).join('')}</div>` })}
      </div>
    </div>`;
  }, () => E.bindBars('wk', week, weekKeys, (d) => d.d));

  /* ---------------- Clock ---------------- */
  E.reg('/app/clock', () => {
    const inNow = E._clockedIn ?? true;
    const onBreak = E._onBreak ?? false;
    return `
    ${pageHead('Clock', 'One tap. The server records the time.', `<a class="btn" href="#/app/attendance">${ic('history')}My history</a>`)}
    <div class="grid g-12">
      <section class="card c-7" style="padding:28px">
        <div class="row between wrap"><div><div class="xs muted">Today · Friday 16 Oct</div><div class="mid">Shift 08:00 – 17:00</div></div>
          <div class="row wrap">${chip('Mobile · clock in anywhere', 'info')}${chip(inNow ? (onBreak ? 'On break' : 'On shift') : 'Off shift', inNow ? (onBreak ? 'yellow' : 'ok') : '', true)}</div></div>
        <div class="clock-ring mt-4">
          <svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="110" fill="none" stroke="var(--surface-3)" stroke-width="10"/><circle cx="120" cy="120" r="110" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 110}" stroke-dashoffset="${2 * Math.PI * 110 * (1 - (inNow ? 0.46 : 0))}"/></svg>
          <div class="inner"><button class="clock-btn ${inNow ? 'out' : 'hatch'}" id="clockBtn">${ic(inNow ? 'log-out' : 'fingerprint')}<span>${inNow ? 'Clock out' : 'Clock in'}</span><span class="xs" style="font-weight:500;opacity:.7">${inNow ? '4h 08m worked' : 'Tap to start'}</span></button></div>
        </div>
        <div class="row mt-4" style="justify-content:center;gap:8px">
          <button class="btn" id="breakBtn" ${inNow ? '' : 'disabled style="opacity:.5"'}>${ic(onBreak ? 'play' : 'coffee')}${onBreak ? 'End break' : 'Start break'}</button>
          <span class="chip">${ic('cloud-off')} 2 events waiting to sync</span>
        </div>
        <div class="hr mt-4"></div><div class="row between small"><b>Today</b><span class="muted xs">Server time · Asia/Dubai</span></div>
        <div class="timeline mt-2">${(inNow ? [['07:58', 'Clocked in · inside Downtown HQ zone', ''], ['09:12', 'Location update · Al Wasl', ''], ['10:40', 'Location update · Jumeirah', '']] : [['—', 'Not clocked in yet', 'warn']]).map(([a, b, c]) => `<div class="te ${c}"><b class="num">${a}</b><p>${b}</p></div>`).join('')}</div>
        ${onBreak ? `<div class="notice accent mt-3">${ic('info')}<span>While on break you can leave your work zone until the break ends · 30 min policy.</span></div>` : ''}
      </section>
      <div class="c-5 stack" style="gap:var(--gap)">
        ${card({ title: 'Today', sub: 'Shift window and flags', body: `
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
            ${[['Clocked in', '07:58', 'On time', 'ok'], ['Expected out', '17:00', 'In 4h 52m', ''], ['Break', '0 / 30m', 'Not started', ''], ['Overtime', '—', 'Prompt at 17:00', '']].map(([l, v, s, t]) => `<div style="background:var(--surface-2);border-radius:12px;padding:12px"><div class="xs muted">${l}</div><div class="mid" style="font-size:18px">${v}</div><div class="xs status-text ${t}">${s}</div></div>`).join('')}
          </div>
          <div class="mt-3"><div class="sess"><span class="hatch" style="left:0;width:46%"></span><span class="hatch-idle" style="left:46%;width:54%"></span></div><div class="sess-scale"><span>08:00</span><span>12:00</span><span>17:00</span></div></div>` })}
        ${card({ title: 'Overtime prompt', sub: 'Shown at end of shift · 10 min grace', body: `<div class="notice">${ic('clock-alert')}<div style="flex:1"><b>Your shift ended at 17:00</b><div class="xs muted">Stay on overtime or clock out now.</div></div></div><div class="row mt-2"><button class="btn" style="flex:1">Clock out</button><button class="btn btn-ink" style="flex:1">Stay · overtime</button></div>` })}
        ${card({ title: 'This week', actions: `<a class="link" href="#/app/attendance">History ${ic('chevron-right', 'flip-rtl')}</a>`, body: `<div class="row between"><div><div class="big">36.4h</div><div class="xs muted">of 45h scheduled</div></div>${miniBars([8.1, 8.6, 7.9, 8.4, 3.4], 'hatch', 48)}</div>` })}
      </div>
    </div>`;
  }, () => {
    document.getElementById('clockBtn')?.addEventListener('click', () => { E._clockedIn = !(E._clockedIn ?? true); E._onBreak = false; E.render(); });
    document.getElementById('breakBtn')?.addEventListener('click', () => { E._onBreak = !(E._onBreak ?? false); E.render(); });
  });

  /* ---------------- Attendance ---------------- */
  E.reg('/app/attendance', () => {
    const days = ['Sat 10', 'Sun 11', 'Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16'];
    const list = isAdmin() ? people.slice(0, 8) : [P('Omar')];
    const sessions = (i) => (i % 3 === 0 ? [[0, 42], [48, 100]] : i % 3 === 1 ? [[4, 96]] : [[12, 60], [64, 88]]);
    return `
    ${pageHead(isAdmin() ? 'Attendance' : 'History', isAdmin() ? 'Who worked, session by session.' : 'Your sessions, day by day.', isAdmin() ? `<a class="btn" href="#/app/attendance/hours">${ic('sheet')}Hours report</a>` : '')}
    <div class="card mb-3" style="padding:12px"><div class="row between wrap"><div class="daystrip">${days.map((d, i) => `<div class="d ${i === 6 ? 'on' : ''}"><span>${d.split(' ')[0]}</span><b>${d.split(' ')[1]}</b></div>`).join('')}</div><div class="row">${pill('October 2026')}<button class="icon-sq">${ic('chevron-left', 'flip-rtl')}</button><button class="icon-sq">${ic('chevron-right', 'flip-rtl')}</button></div></div></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">
      ${list.map((p, i) => card({ body: `
        <div class="row between"><div class="cell-person">${av(p.name, '', p.pres)}<div><b>${p.name}</b><span>${p.title} · ${p.branch}</span></div></div>${status(i % 4 === 2 ? 'Late' : i % 5 === 4 ? 'Missed clock-out' : 'On time')}</div>
        <div class="mt-2"><div class="sess">${sessions(i).map(([a, b]) => `<span class="hatch" style="inset-inline-start:${a}%;width:${b - a}%"></span>`).join('')}</div><div class="sess-scale"><span>06:00</span><span>12:00</span><span>18:00</span></div></div>
        <div class="list mt-1">${sessions(i).map(([a, b], j) => `<div class="li" style="padding:7px 0"><div class="ico-tile" style="width:26px;height:26px">${ic(j ? 'rotate-cw' : 'log-in')}</div><div class="meta"><b class="num">${String(6 + Math.round(a * 0.12)).padStart(2, '0')}:${j ? '30' : '58'} – ${String(6 + Math.round(b * 0.12)).padStart(2, '0')}:${j ? '05' : '12'}</b><span>Session ${j + 1} · ${p.mode}</span></div>${isAdmin() ? `<button class="btn btn-sm" data-drawer="correct" data-arg="${p.name}">${ic('pencil')}Correct</button>` : ''}</div>`).join('')}</div>` })).join('')}
    </div>`;
  });
  E.drawers.correct = (name) => `
    <div class="drawer-head"><div><h3 class="card-title">Correct session</h3><div class="card-sub">${name} · Fri 16 Oct</div></div><button class="icon-btn" data-act="close">${ic('x')}</button></div>
    <div class="drawer-body stack" style="gap:14px"><div class="field"><label>Clock-out time</label><input class="input" type="time" value="17:05"></div><div class="field"><label>Note</label><textarea class="textarea" placeholder="Reason for the correction">Forgot to clock out after site visit.</textarea></div><div class="notice">${ic('shield-check')}<span class="small">Corrections are logged in the audit trail.</span></div></div>
    <div class="drawer-foot"><button class="btn" data-act="close">Cancel</button><button class="btn btn-ink" data-act="close">Save correction</button></div>`;

  E.reg('/app/attendance/hours', () => {
    const rows = people.slice(0, 9).map((p, i) => ({ p, day: `${String(14 - (i % 3)).padStart(2, '0')} Oct`, sh: 8 + (i % 2), ot: [0, 1.5, 0.5, 2, 0, 0.75][i % 6], }));
    rows.forEach((r) => (r.tot = r.sh + r.ot));
    const sum = (k) => rows.reduce((a, r) => a + r[k], 0).toFixed(2);
    return `
    ${pageHead('Hours report', 'Shift, overtime and total hours per employee per day.', `<div class="seg">${['This month', 'Last month', 'Custom'].map((l, i) => `<button class="${i ? '' : 'on'}">${l}</button>`).join('')}</div><button class="btn btn-ink">${ic('download')}Export CSV</button>`, `<a href="#/app/attendance">Attendance</a>${ic('chevron-right', 'flip-rtl')}Hours report`)}
    <div class="grid g-12 mb-3">
      ${[['Shift hours', '2,184.0', '+3.1%'], ['Overtime hours', '146.5', '-8.4%'], ['Total work hours', '2,330.5', '+2.4%'], ['Avg per person', '44.8h', '+0.6h']].map(([l, v, d]) => card({ cls: 'c-3 c-md-6', body: `<div class="small muted">${l}</div><div class="big mt-1">${v}</div>${delta(d)}` })).join('')}
    </div>
    <section class="card flush">${table([
      { l: 'Employee', r: (r) => person(r.p.name, r.p.branch) },
      { l: 'Date', r: (r) => `<span class="num">${r.day}</span>` },
      { l: 'Shift hours', num: 1, r: (r) => r.sh.toFixed(2) },
      { l: 'Overtime', num: 1, r: (r) => (r.ot ? `<span class="chip warn">${r.ot.toFixed(2)}</span>` : '<span class="muted">0.00</span>') },
      { l: 'Total', num: 1, r: (r) => `<b>${r.tot.toFixed(2)}</b>` },
    ], rows, { foot: ['Total · 9 rows', '', sum('sh'), sum('ot'), sum('tot')] })}</section>`;
  });

  /* ---------------- Team today ---------------- */
  E.reg('/app/team', () => {
    const groups = [['Clocked in', people.filter((p) => p.pres === 'on'), 'ok'], ['Late', people.filter((p) => p.pres === 'late'), 'warn'], ['Clocked out', [P('Mariam')], ''], ['On leave', [P('Ahmed')], 'info']];
    return `
    ${pageHead('Team today', isAdmin() ? 'Everyone in Nile Logistics · Friday 16 Oct' : 'Your direct reports today', `<div class="seg" data-local>${['All', 'Downtown HQ', 'Marina Depot', 'Business Bay'].map((l, i) => `<button class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>`)}
    <div class="grid g-12 mb-3">${groups.map(([l, arr, t]) => card({ cls: 'c-3 c-md-6', body: `<div class="row between"><span class="small muted">${l}</span>${chip(arr.length, t)}</div><div class="big mt-1">${arr.length}</div><div class="av-stack mt-2">${arr.slice(0, 5).map((p) => av(p.name, 'sm')).join('')}</div>` })).join('')}</div>
    <section class="card flush">${table([
      { l: 'Person', r: (p) => person(p.name, p.title, p.pres) },
      { l: 'Branch', k: 'branch' },
      { l: 'Presence', r: (p) => `<span class="small">${p.mode}</span>` },
      { l: 'Clock in', r: (p) => `<span class="num">${p.in}</span>` },
      { l: 'Status', r: (p) => status(p.status === 'On leave' ? 'On leave' : p.pres === 'late' ? 'Late' : p.pres === 'on' ? 'Clocked in' : 'Missed clock-out') },
      { l: '', r: (p) => `<a class="icon-sq" href="#/app/analytics/employees/${p.id}" aria-label="Analytics">${ic('chart-line')}</a>` },
    ], people)}</section>`;
  });

  /* ---------------- Live map ---------------- */
  const coords = [[25.2048, 55.2708], [25.1772, 55.2344], [25.0805, 55.1403], [25.2301, 55.2955], [25.1162, 55.1950], [25.1857, 55.2620], [25.0700, 55.1650], [25.1580, 55.2280], [25.2200, 55.2500], [25.1050, 55.1770], [25.2410, 55.3190], [25.1430, 55.2100]];
  E.reg('/app/map/*', (mode = 'live') => `
    ${pageHead('Live map', mode === 'history' ? 'Saved locations drawn as trails.' : 'Realtime · WebSocket connected', `<button class="btn" data-drawer="mapStyle">${ic('palette')}Appearance</button><div class="seg"><a href="#/app/map" class="${mode !== 'history' ? 'on' : ''}" style="padding:6px 12px;border-radius:7px;font-size:12px;font-weight:600">Live</a><a href="#/app/map/history" class="${mode === 'history' ? 'on' : ''}" style="padding:6px 12px;border-radius:7px;font-size:12px;font-weight:600">History</a></div>`)}
    <div class="grid with-rail">
      <div class="map"><div id="lmap" style="height:100%"></div>
        <div class="map-overlay" style="top:12px;inset-inline-start:12px;right:auto"><div class="card" style="padding:8px;display:flex;gap:6px;align-items:center;box-shadow:var(--shadow-md)"><div class="input-ico" style="width:200px">${ic('search')}<input class="input" style="height:32px" placeholder="Filter people"></div><span class="chip ok"><span class="d"></span>31 on shift</span><span class="chip"><span class="d"></span>6 last seen</span></div></div>
        <div class="map-overlay" style="bottom:14px;inset-inline-start:12px"><button class="btn btn-ink" data-drawer="zone">${ic('circle-dashed')}Draw work zone</button></div>
      </div>
      ${card({ title: mode === 'history' ? 'Trail' : 'People', sub: mode === 'history' ? 'Omar Haddad · today' : 'Sorted by last update', body: mode === 'history' ? `<div class="timeline">${[['07:58', 'Clocked in · Downtown HQ'], ['09:12', 'Customer site · Al Wasl'], ['10:40', 'Customer site · Jumeirah'], ['12:05', 'Break started'], ['12:35', 'Break ended'], ['13:20', 'Marina Depot']].map(([t, s]) => `<div class="te"><b class="num">${t}</b><p>${s}</p></div>`).join('')}</div>` : `<div class="list">${people.filter((p) => p.mode === 'Mobile' || p.pres !== 'off').slice(0, 8).map((p, i) => `<div class="li">${av(p.name, 'sq', p.pres)}<div class="meta"><b>${p.name}</b><span>${p.title} · ${p.mode}</span></div><div class="end"><span class="status-text ${p.pres === 'off' ? '' : 'ok'}">${p.pres === 'off' ? 'Last seen' : 'On shift'}</span><span class="xs muted" style="display:block">${i * 7 + 2}s ago</span></div></div>`).join('')}</div>` })}
    </div>`, (mode = 'live') => {
    if (!window.L) return;
    const m = L.map('lmap', { zoomControl: true, attributionControl: true }).setView([25.16, 55.23], 12);
    const dark = state.theme === 'dark';
    L.tileLayer(`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(m);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (mode === 'history') {
      const trail = [[25.2048, 55.2708], [25.215, 55.255], [25.205, 55.235], [25.19, 55.22], [25.15, 55.19], [25.1, 55.16], [25.08, 55.14]];
      L.polyline(trail, { color: accent, weight: 4, dashArray: '2 8', lineCap: 'round' }).addTo(m);
      trail.forEach((c, i) => L.circleMarker(c, { radius: i === trail.length - 1 ? 8 : 5, color: accent, fillColor: i === trail.length - 1 ? accent : '#fff', fillOpacity: 1, weight: 3 }).addTo(m));
    } else {
      people.forEach((p, i) => {
        const icon = L.divIcon({ className: '', html: `<div class="mk ${p.pres === 'off' ? 'off' : 'on'}">${E.initials(p.name)}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
        L.marker(coords[i], { icon }).addTo(m).bindPopup(`<b>${p.name}</b><br>${p.title}`);
      });
      L.circle([25.2048, 55.2708], { radius: 900, color: accent, weight: 2, fillColor: accent, fillOpacity: 0.12, dashArray: '6 6' }).addTo(m);
    }
  });
  E.drawers.mapStyle = () => `
    <div class="drawer-head"><div><h3 class="card-title">Map appearance</h3><div class="card-sub">Saved for Nile Logistics</div></div><button class="icon-btn" data-act="close">${ic('x')}</button></div>
    <div class="drawer-body stack" style="gap:18px">
      <div class="field"><label>Theme preset</label><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px">${['Clean', 'Night', 'Satellite'].map((l, i) => `<div class="card" style="padding:8px;${i === 0 ? 'outline:2px solid var(--text)' : ''}"><div style="height:54px;border-radius:8px;background:${['#EEF0EC', '#1A1C1E', '#4E5E3A'][i]}"></div><div class="xs strong mt-1">${l}</div></div>`).join('')}</div></div>
      <div class="field"><label>Marker style</label><div class="seg" data-local><button class="on">Initials</button><button>Avatar</button><button>Dot</button></div></div>
      <div class="field"><label>Colors</label>${[['On shift', 'var(--accent)'], ['Last seen', '#9A9A95'], ['History trail', 'var(--warn)']].map(([l, c]) => `<div class="row between" style="padding:6px 0"><span class="small">${l}</span><span class="swatch" style="background:${c}"></span></div>`).join('')}</div>
      <div class="row between"><span class="small strong">Show initials on markers</span><span class="switch on"></span></div>
    </div><div class="drawer-foot"><button class="btn" data-act="close">Cancel</button><button class="btn btn-ink" data-act="close">Save appearance</button></div>`;
  E.drawers.zone = () => `
    <div class="drawer-head"><div><h3 class="card-title">Work zone</h3><div class="card-sub">Fixed-zone employees must clock in inside it</div></div><button class="icon-btn" data-act="close">${ic('x')}</button></div>
    <div class="drawer-body stack" style="gap:14px"><div class="field"><label>Employee</label><select class="select"><option>Lina Farouk · Fixed zone</option><option>Karim Adel · Fixed zone</option></select></div><div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label>Center lat</label><input class="input" value="25.2048"></div><div class="field"><label>Center lng</label><input class="input" value="55.2708"></div></div><div class="field"><label>Radius · 900 m</label><input type="range" class="slider" style="--p:45%" value="45"></div><div class="notice">${ic('info')}<span class="small">Mobile employees, like drivers, have no zone.</span></div></div>
    <div class="drawer-foot"><button class="btn" data-act="close">Cancel</button><button class="btn btn-ink" data-act="close">Save zone</button></div>`;

  /* ---------------- Alerts ---------------- */
  E.reg('/app/notifications/*', (tab = '') => {
    const items = [
      ['alarm-clock-off', 'Missed clock-out', 'Mariam Saeed did not clock out on Thu 15 Oct.', 'Attendance', 'High', '2m', 1],
      ['map-pin-off', 'Left work zone', 'Rami Aziz left Downtown HQ zone for 14 min.', 'Presence', 'High', '18m', 1],
      ['palmtree', 'Leave request', 'Youssef Nabil requested 2 days annual leave.', 'Leave', 'Normal', '42m', 1],
      ['activity', 'Anomaly', 'GPS updates 40% below expected for Dina Mostafa.', 'Analytics', 'Normal', '1h', 0],
      ['megaphone', 'Announcement', 'Office closed Thursday for National Day.', 'Announcement', 'Low', '3h', 0],
      ['target', 'KPI result', 'New result on On-time arrivals for September.', 'KPIs', 'Low', '5h', 0],
      ['briefcase-business', 'Interview today', 'Senior Technician · round 2 at 14:00.', 'Hiring', 'Normal', '6h', 0],
    ];
    const adminTabs = [['', 'Inbox', 6], ['event', 'Event alerts'], ['custom', 'Custom rules'], ['announce', 'Announcements']];
    let body = '';
    if (!tab) {
      body = `<div class="toolbar"><div class="seg" data-local>${['All', 'Attendance', 'Presence', 'Leave', 'Hiring', 'KPIs'].map((l, i) => `<button class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>${pill('Any urgency')}<span class="row small" style="gap:8px"><span class="switch"></span>Unread only</span><div class="top-spacer"></div><button class="btn">${ic('check-check')}Mark all read</button></div>
      <section class="card" style="padding:6px 18px"><div class="list">${items.map(([i, t, s, c, u, tm, unread]) => `<div class="li" style="padding:14px 0"><div class="ico-tile ${u === 'High' ? 'warn' : ''}">${ic(i)}</div><div class="meta"><b>${unread ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-inline-end:6px"></span>' : ''}${t}</b><span style="white-space:normal">${s}</span></div><div class="row hide-sm">${chip(c)}${u === 'High' ? chip('High', 'warn') : ''}</div><div class="end" style="min-width:60px"><span class="xs muted">${tm} ago</span>${unread ? `<button class="btn btn-sm btn-ghost" style="margin-top:2px">Mark read</button>` : ''}</div></div>`).join('')}</div></section>`;
    } else if (tab === 'event') {
      body = `<div class="grid g-12">${[['Attendance', ['Missed clock-out', 'Late clock-in', 'Early clock-out', 'Overtime started']], ['Presence', ['Left work zone', 'GPS signal lost', 'Offline queue stuck']], ['Leave', ['New request', 'Request decided', 'Balance low']], ['Hiring', ['Stage stuck 7+ days', 'Hire date approaching', 'Offer accepted']]].map(([c, rules]) => card({ cls: 'c-6', title: c, sub: `${rules.length} built-in rules`, body: rules.map((r, i) => `<div class="row between" style="padding:9px 0;border-top:${i ? '1px solid var(--line)' : '0'}"><span class="small">${r}</span><span class="switch ${i % 3 !== 2 ? 'on' : ''}"></span></div>`).join('') })).join('')}</div>`;
    } else if (tab === 'custom') {
      body = `<div class="toolbar"><div class="top-spacer"></div><button class="btn btn-ink">${ic('plus')}New rule</button></div><section class="card flush">${table([{ l: 'Rule', r: (r) => `<b>${r[0]}</b>` }, { l: 'When', r: (r) => `<span class="small muted">${r[1]}</span>` }, { l: 'Notify', r: (r) => r[2] }, { l: 'Status', r: (r) => status(r[3]) }, { l: '', r: () => `<div class="row"><button class="icon-sq">${ic('pencil')}</button><button class="icon-sq">${ic('trash-2')}</button></div>` }], [['Driver idle 30+ min', 'Mobile · no movement 30 min on shift', 'Field managers', 'Active'], ['Late 3 times in a week', 'Late clock-in count ≥ 3 / 7d', 'HR + manager', 'Active'], ['Overtime over 10h', 'Weekly overtime > 10h', 'Compensation role', 'Paused']])}</section>`;
    } else {
      body = `<div class="grid g-12">${card({ cls: 'c-5', title: 'New announcement', body: `<div class="stack" style="gap:12px"><div class="field"><label>Title</label><input class="input" placeholder="Office closed Thursday"></div><div class="field"><label>Message</label><textarea class="textarea" placeholder="Write to everyone in Nile Logistics"></textarea></div><div class="field"><label>Audience</label><select class="select"><option>Everyone</option><option>Downtown HQ</option></select></div><button class="btn btn-ink">${ic('send')}Send announcement</button></div>` })}${card({ cls: 'c-7', title: 'Sent', body: `<div class="list">${[['Office closed Thursday for National Day', 'Everyone · 3h ago', '48 read'], ['New safety checklist for drivers', 'Marina Depot · 2d ago', '12 read'], ['Q3 KPI results published', 'Everyone · 5d ago', '51 read']].map(([t, s, r]) => `<div class="li"><div class="ico-tile ink">${ic('megaphone')}</div><div class="meta"><b>${t}</b><span>${s}</span></div><span class="chip">${r}</span></div>`).join('')}</div>` })}</div>`;
    }
    return `${pageHead('Alerts', 'Missed clock-outs, anomalies and announcements.', '')}${isAdmin() ? tabs(adminTabs, tab, '/app/notifications') : ''}${body}`;
  });

  /* ---------------- Employees ---------------- */
  E.reg('/app/employees', () => `
    ${pageHead('Employees', '52 people · 3 branches', `<a class="btn" href="#/app/settings/org">${ic('network')}Org setup</a><button class="btn" data-drawer="import">${ic('upload')}Import CSV</button><button class="btn">${ic('download')}Export</button><button class="btn btn-ink" data-drawer="addEmp">${ic('user-plus')}Add employee</button>`)}
    <div class="toolbar"><div class="input-ico">${ic('search')}<input class="input" placeholder="Search name, email or phone"></div>${pill('All branches')}${pill('Any role')}${pill('Status: Active')}<div class="seg" data-local><button class="on">All</button><button>Fixed zone</button><button>Mobile</button></div></div>
    <section class="card flush">${table([
      { l: 'Employee', r: (p) => person(p.name, p.email) },
      { l: 'Title', r: (p) => `<span class="small">${p.title}</span>` },
      { l: 'Branch', k: 'branch' },
      { l: 'Manager', r: (p) => `<span class="small muted">${p.mgr}</span>` },
      { l: 'Access', r: (p) => (p.access === 'Admin' ? chip('Admin', 'ink') : chip('Employee')) + (p.sys ? ' ' + p.sys.map((s) => chip(s, 'ok')).join(' ') : '') },
      { l: 'Presence', r: (p) => `<span class="row small" style="gap:6px">${ic(p.mode === 'Mobile' ? 'car' : 'map-pin')} ${p.mode}</span>` },
      { l: 'Status', r: (p) => status(p.status) },
      { l: '', r: (p) => `<button class="btn btn-sm" data-drawer="emp" data-arg="${p.id}">Open</button>` },
    ], people)}</section>`);
  E.drawers.emp = (id) => {
    const p = people.find((x) => x.id == id) || people[0];
    return `<div class="drawer-head"><div class="row">${av(p.name, 'lg')}<div><h3 class="card-title">${p.name}</h3><div class="card-sub">${p.title} · ${p.branch}</div></div></div><button class="icon-btn" data-act="close">${ic('x')}</button></div>
    <div class="drawer-body">
      <div class="tabs" style="margin-bottom:16px">${['Profile', 'Documents', 'Skills', 'Training', 'Assessments', 'Sign-in'].map((t, i) => `<button class="tab ${i === 0 ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">${[['Email', p.email], ['Phone', p.phone], ['Manager', p.mgr], ['Access', p.access], ['Presence mode', p.mode], ['Job role', p.role]].map(([l, v]) => `<div><div class="xs muted">${l}</div><div class="small strong" style="word-break:break-all">${v}</div></div>`).join('')}</div>
      <div class="hr"></div><div class="small strong mb-2">System module roles</div><div class="row wrap">${['kpis', 'leaves', 'hiring', 'compensation', 'tasks'].map((r) => `<span class="chip ${p.sys && p.sys.includes(r) ? 'ok' : ''}">${p.sys && p.sys.includes(r) ? ic('check') : ''}${r}</span>`).join('')}</div>
      <div class="hr"></div><div class="small strong mb-2">HR file</div>
      <div class="list">${[['Passport', 'Expires 2029', 'ok'], ['Residency', 'Expires in 41 days', 'warn'], ['Driving license', 'Uploaded', 'ok'], ['Contract', 'Signed 2024', 'ok']].map(([d, s, t]) => `<div class="li"><div class="ico-tile">${ic('file-text')}</div><div class="meta"><b>${d}</b><span class="status-text ${t}">${s}</span></div><button class="icon-sq">${ic('download')}</button></div>`).join('')}</div>
    </div>
    <div class="drawer-foot"><a class="btn" href="#/app/analytics/employees/${p.id}" data-act="close">${ic('chart-line')}Analytics</a><button class="btn btn-ink">Edit profile</button></div>`;
  };
  E.drawers.addEmp = () => `<div class="drawer-head"><div><h3 class="card-title">Add employee</h3><div class="card-sub">A temporary password is shown once after create</div></div><button class="icon-btn" data-act="close">${ic('x')}</button></div>
    <div class="drawer-body stack" style="gap:14px">${['Full name', 'Email', 'Phone', 'Title'].map((l) => `<div class="field"><label>${l}</label><input class="input"></div>`).join('')}
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label>Branch</label><select class="select"><option>Downtown HQ</option></select></div><div class="field"><label>Manager</label><select class="select"><option>Lina Farouk</option></select></div></div>
    <div class="field"><label>Presence mode</label><div class="seg" data-local><button class="on">${ic('map-pin')}Fixed zone</button><button>${ic('car')}Mobile</button></div></div>
    <div class="field"><label>Access</label><div class="seg" data-local><button class="on">Employee</button><button>Admin</button></div></div></div>
    <div class="drawer-foot"><button class="btn" data-act="close">Cancel</button><button class="btn btn-ink">Create employee</button></div>`;
  E.drawers.import = () => `<div class="drawer-head"><div><h3 class="card-title">Import CSV</h3><div class="card-sub">Review incomplete rows before commit</div></div><button class="icon-btn" data-act="close">${ic('x')}</button></div>
    <div class="drawer-body stack" style="gap:14px"><div class="steps">${['Upload', 'Review', 'Commit'].map((s, i) => `<div class="st ${i === 0 ? 'done' : i === 1 ? 'cur' : ''}"><div class="bar"></div><span>${s}</span></div>`).join('')}</div>
    <div style="border:1.5px dashed var(--line-strong);border-radius:14px;padding:26px;text-align:center"><div class="ico-tile lg" style="margin:0 auto 8px">${ic('file-up')}</div><b class="small">Drop a CSV or paste rows</b><div class="xs muted mt-1">employees.csv · 24 rows detected</div></div>
    <div class="notice warn">${ic('alert-triangle')}<span class="small"><b>3 rows incomplete</b> · missing branch or email</span></div><a class="link">${ic('download')}Download template</a></div>
    <div class="drawer-foot"><button class="btn" data-act="close">Cancel</button><button class="btn btn-ink">Commit 21 rows</button></div>`;

  E.reg('/app/settings/org', () => `
    ${pageHead('Org setup', 'Job roles, branches and sites used by the roster.', `<button class="btn btn-ink">${ic('plus')}Add branch</button>`, `<a href="#/app/settings">Settings</a>${ic('chevron-right', 'flip-rtl')}Org setup`)}
    <div class="grid g-12">
      ${card({ cls: 'c-7', title: 'Branches and sites', sub: '3 branches · 7 sites', body: `<div class="list">${[['Downtown HQ', 'Sheikh Zayed Rd · 3 sites', 21], ['Marina Depot', 'Dubai Marina · 2 sites', 18], ['Business Bay', 'Bay Square · 2 sites', 13]].map(([n, s, c]) => `<div class="li"><div class="ico-tile ink">${ic('building-2')}</div><div class="meta"><b>${n}</b><span>${s}</span></div><span class="chip">${c} people</span><button class="icon-sq">${ic('pencil')}</button></div>`).join('')}</div>` })}
      ${card({ cls: 'c-5', title: 'Job roles', sub: '8 roles', actions: `<button class="btn btn-sm">${ic('plus')}Add</button>`, body: `<div class="row wrap">${['Technician', 'Driver', 'Manager', 'Supervisor', 'HR', 'Sales', 'Finance', 'Support'].map((r) => chip(r)).join('')}</div>` })}
    </div>`);

  /* ---------------- Shifts ---------------- */
  E.reg('/app/shifts', () => `
    ${pageHead('Shifts', 'Patterns, upcoming instances, breaks and left-zone incidents.', `<button class="btn btn-ink">${ic('calendar-plus')}Set pattern</button>`)}
    <div class="grid g-12">
      ${card({ cls: 'c-8', title: 'Upcoming instances', sub: 'Next 7 days', actions: pill('All employees'), body: table([
        { l: 'Employee', r: (r) => person(r[0], r[1]) }, { l: 'Date', r: (r) => `<span class="num">${r[2]}</span>` }, { l: 'Window', r: (r) => `<span class="num">${r[3]}</span>` }, { l: 'Flags', r: (r) => r[4].map((f) => chip(f, E.statusTone(f) || 'warn')).join(' ') || '<span class="muted xs">—</span>' },
      ], [['Omar Haddad', 'Weekly · Sun–Thu', 'Sat 17 Oct', '08:00 – 17:00', []], ['Youssef Nabil', 'Daily', 'Sat 17 Oct', '07:00 – 15:00', ['Late in']], ['Karim Adel', 'Weekly · Sun–Thu', 'Sun 18 Oct', '07:30 – 16:30', []], ['Rami Aziz', 'Monthly · 1, 15', 'Sun 18 Oct', '09:00 – 18:00', ['Late out', 'Deduction']], ['Layla Hamdan', 'Weekly · Sun–Thu', 'Sun 18 Oct', '08:00 – 17:00', []]]) })}
      <div class="c-4 stack" style="gap:var(--gap)">
        ${card({ title: 'Break policy', body: `<div class="field"><label>Duration</label><div class="row"><input class="input num" value="30" style="width:90px"><span class="small muted">minutes</span></div></div><div class="field mt-2"><label>Window</label><div class="seg" data-local><button class="on">Fixed 12:00</button><button>Employee chooses</button></div></div>` })}
        ${card({ title: 'Active patterns', sub: '24 employees covered', body: `<div class="legend-list">${[['Weekly · Sun–Thu', 17, 'hatch'], ['Daily', 5, 'hatch-yellow'], ['Monthly', 2, 'hatch-warn']].map(([l, v, c]) => `<div class="li"><span><i class="${c}"></i>${l}</span><b class="num">${v}</b></div>`).join('')}</div><div class="segbar mt-2"><span class="hatch" style="flex:17"></span><span class="hatch-yellow" style="flex:5"></span><span class="hatch-warn" style="flex:2"></span></div>` })}
      </div>
      ${card({ cls: 'c-12', title: 'Left-zone incidents', sub: 'Approve as emergency or mark a day deduction', body: `<div class="list">${[['Rami Aziz', 'Left Downtown HQ · 14 min · 09:47', 'Today'], ['Lina Farouk', 'Left Downtown HQ · 32 min · 13:10', 'Yesterday']].map(([n, s, d]) => `<div class="li">${av(n)}<div class="meta"><b>${n}</b><span>${s}</span></div><span class="xs muted hide-sm">${d}</span><button class="btn btn-sm">${ic('siren')}Approve emergency</button><button class="btn btn-sm btn-danger">Mark deduction</button></div>`).join('')}</div>` })}
    </div>`);

  /* ---------------- Settings ---------------- */
  E.reg('/app/settings', () => `
    ${pageHead('Settings', 'Workspace, branding and map appearance.')}
    <div class="grid g-12">
      ${card({ cls: 'c-7', title: 'Branding', sub: 'Applied across the workspace and mobile app', body: `
        <div class="row" style="gap:16px;align-items:flex-start"><div class="ico-tile lg" style="width:72px;height:72px;border-radius:18px;border-style:dashed">${ic('image-up')}</div><div class="stack" style="flex:1;gap:12px"><div class="field"><label>Display name</label><input class="input" value="Nile Logistics"></div></div></div>
        <div class="field mt-3"><label>Color preset</label><div class="row" style="gap:10px">${[['lime', '#9ACD32'], ['teal', '#23A7C7'], ['emerald', '#10B981'], ['violet', '#8B7CF6']].map(([k, c]) => `<button class="swatch ${state.accent === k ? 'on' : ''}" data-accent-set="${k}" style="background:${c}" aria-label="${k}"></button>`).join('')}</div></div>
        <div class="mt-3 row"><button class="btn btn-ink">Save branding</button></div>` })}
      <div class="c-5 stack" style="gap:var(--gap)">
        <a class="card row" href="#/app/settings/org"><div class="ico-tile">${ic('network')}</div><div style="flex:1"><b>Org setup</b><div class="xs muted">Job roles, branches, sites</div></div>${ic('chevron-right', 'flip-rtl')}</a>
        <a class="card row" href="#/app/map"><div class="ico-tile">${ic('map')}</div><div style="flex:1"><b>Live map appearance</b><div class="xs muted">Edited on the map page</div></div>${ic('chevron-right', 'flip-rtl')}</a>
        <a class="card row" href="#/app/billing"><div class="ico-tile">${ic('credit-card')}</div><div style="flex:1"><b>Billing</b><div class="xs muted">Ops plan · 52 / 60 seats</div></div>${ic('chevron-right', 'flip-rtl')}</a>
        <a class="card row" href="#/app/leave/policies"><div class="ico-tile">${ic('palmtree')}</div><div style="flex:1"><b>Leave policies</b><div class="xs muted">8 leave types</div></div>${ic('chevron-right', 'flip-rtl')}</a>
      </div>
    </div>`);

  /* ---------------- Billing ---------------- */
  E.reg('/app/billing', () => `
    ${pageHead('Billing', 'Plan, seats and renewal.', `<button class="btn">${ic('external-link')}Billing portal</button>`)}
    <div class="grid g-12">
      <section class="card c-5"><div class="accent-card" style="padding:20px"><div class="row between" style="position:relative;z-index:1"><b>Current plan</b>${chip('Active', 'ink')}</div><div class="big-xl mt-3" style="position:relative;z-index:1">Ops</div><div class="small" style="opacity:.8;position:relative;z-index:1">Field ops + People ops + Analytics</div><div class="row between mt-4" style="position:relative;z-index:1"><div><div class="xs" style="opacity:.75">Seats</div><b class="num">52 / 60</b></div><div><div class="xs" style="opacity:.75">Renews</div><b class="num">01 Nov 2026</b></div><div><div class="xs" style="opacity:.75">Monthly</div><b class="num">$540</b></div></div></div>
        <div class="mt-3 field"><label>Seats · 60</label><input type="range" class="slider" min="10" max="200" value="60" style="--p:26%"></div>
        <div class="row mt-3"><button class="btn btn-ink" style="flex:1">Update seats</button><button class="btn btn-danger">Cancel at period end</button></div></section>
      <div class="c-7 grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${[['Field', '$6', ['Live map', 'Team today', 'Clock']], ['Scale', '$14', ['Everything in Ops', 'Integrations', 'Priority support']], ['Enterprise', 'Custom', ['SSO (planned)', 'Dedicated success', 'Custom limits']]].map(([n, p, f], i) => `<div class="card stack" style="gap:8px"><div class="row between"><b>${n}</b>${i === 1 ? chip('Recommended', 'ok') : ''}</div><div class="mid">${p}<span class="xs muted"> /seat/mo</span></div><ul style="padding:0;margin:0;list-style:none" class="small stack">${f.map((x) => `<li class="row" style="gap:6px">${ic('check', 'muted')}${x}</li>`).join('')}</ul><button class="btn ${i === 1 ? 'btn-ink' : ''} mt-1">${i === 2 ? 'Talk to sales' : 'Switch plan'}</button></div>`).join('')}</div>
      ${card({ cls: 'c-12', title: 'Invoices', body: table([{ l: 'Date', k: 0 }, { l: 'Description', k: 1 }, { l: 'Amount', num: 1, k: 2 }, { l: 'Status', r: (r) => status(r[3]) }, { l: '', r: () => `<button class="icon-sq">${ic('download')}</button>` }], [['01 Oct 2026', 'Ops · 52 seats', '$468.00', 'Paid'], ['01 Sep 2026', 'Ops · 48 seats', '$432.00', 'Paid'], ['01 Aug 2026', 'Trial → Ops', '$0.00', 'Paid']]) })}
    </div>`);

  /* ---------------- Health ---------------- */
  E.reg('/app/health', () => `
    ${pageHead('Health', state.role === 'platform' ? 'Platform-wide operational metrics.' : 'Operational metrics for Nile Logistics.', pill('Last 24h'))}
    <div class="grid g-12 mb-3">${[['Missed clock-outs', '3', 'alarm-clock-off', 'warn', [2, 4, 1, 3, 5, 2, 3]], ['Sync failures', '1', 'refresh-cw-off', 'danger', [0, 1, 0, 2, 1, 0, 1]], ['Notification issues', '0', 'bell-off', '', [1, 0, 0, 1, 0, 0, 0]], ['Uptime', '99.98%', 'activity', 'accent', [9, 9, 9, 10, 9, 10, 10]]].map(([l, v, i, t, s]) => card({ cls: 'c-3 c-md-6', body: `<div class="row between"><div class="ico-tile ${t}">${ic(i)}</div>${miniBars(s, t === 'danger' ? 'hatch-danger' : t === 'warn' ? 'hatch-warn' : 'hatch', 30)}</div><div class="big mt-2">${v}</div><div class="small muted">${l}</div>` })).join('')}</div>
    ${card({ title: 'Recent events', body: `<div class="timeline">${[['Sync failure · HubSpot CRM', 'Rate limited · retried 3x · 09:41', 'danger'], ['Missed clock-out · Mariam Saeed', 'Auto-closed at 00:05', 'warn'], ['Offline queue drained · 14 events', 'Omar Haddad device · 08:02', ''], ['Push delivery restored', 'APNs latency normal · 07:30', '']].map(([t, s, c]) => `<div class="te ${c}"><b>${t}</b><p>${s}</p></div>`).join('')}</div>` })}`);

  /* ---------------- Profile ---------------- */
  E.reg('/app/profile', () => {
    const u = E.USERS[state.role];
    return `${pageHead('Profile', 'Your account and language.')}
    <div class="grid g-12">${card({ cls: 'c-7', body: `<div class="row" style="gap:18px">${av(u.name, 'xl')}<div><div class="mid">${u.name}</div><div class="small muted">${{ admin: 'Tenant admin', employee: 'Field Technician', platform: 'Platform super admin' }[state.role]} · ${u.mail}</div><div class="row mt-2"><button class="btn btn-sm">${ic('crop')}Upload and crop</button><button class="btn btn-sm btn-ghost">Remove</button></div></div></div>
      <div class="hr"></div><div class="grid" style="grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label>Name</label><input class="input" value="${u.name}"></div><div class="field"><label>Email</label><input class="input" value="${u.mail}" disabled style="opacity:.6"></div></div><div class="mt-3"><button class="btn btn-ink">Save changes</button></div>` })}
      ${card({ cls: 'c-5', title: 'Preferences', body: `<div class="field"><label>Language</label><div class="seg"><button class="${state.dir === 'ltr' ? 'on' : ''}" data-act="${state.dir === 'rtl' ? 'dir' : ''}">English</button><button class="${state.dir === 'rtl' ? 'on' : ''}" data-act="${state.dir === 'ltr' ? 'dir' : ''}">العربية</button></div></div><div class="field mt-3"><label>Theme</label><div class="seg"><button data-theme-set="light" class="${state.theme === 'light' ? 'on' : ''}">${ic('sun')}Light</button><button data-theme-set="dark" class="${state.theme === 'dark' ? 'on' : ''}">${ic('moon')}Dark</button></div></div>` })}</div>`;
  });
})();
