/* App shell, navigation, router */
(function () {
  const { state, ic, av } = E;
  E.routes = {};
  E.after = {};
  E.reg = (path, fn, after) => { E.routes[path] = fn; if (after) E.after[path] = after; };

  const AR = {
    Operate: 'التشغيل', People: 'الموظفون', Perform: 'الأداء', System: 'النظام', Platform: 'المنصة', Me: 'أنا', Workspace: 'مساحة العمل',
    Dashboard: 'لوحة التحكم', 'Team today': 'الفريق اليوم', 'Live map': 'الخريطة المباشرة', Clock: 'الحضور', Attendance: 'سجل الحضور', 'Day view': 'عرض اليوم', 'Hours report': 'تقرير الساعات', Alerts: 'التنبيهات',
    Employees: 'الموظفون', 'Org setup': 'إعداد المؤسسة', Shifts: 'الورديات', Leave: 'الإجازات', Requests: 'الطلبات', Balances: 'الأرصدة', Calendar: 'التقويم', Policies: 'السياسات', Reports: 'التقارير', Hiring: 'التوظيف', Tasks: 'المهام',
    KPIs: 'مؤشرات الأداء', Analytics: 'التحليلات', Overview: 'نظرة عامة', Compensation: 'التعويضات', Integrations: 'التكاملات', Settings: 'الإعدادات', Billing: 'الفوترة', Health: 'الحالة', Profile: 'الملف الشخصي',
    History: 'السجل', 'My KPIs': 'مؤشراتي', 'My analytics': 'تحليلاتي', 'My leave': 'إجازاتي', 'My tasks': 'مهامي',
    Tenants: 'المستأجرون', Subscriptions: 'الاشتراكات', Leads: 'العملاء المحتملون', Plans: 'الخطط', Features: 'الميزات', Payments: 'المدفوعات', Audits: 'التدقيق',
    'Help center': 'مركز المساعدة', 'Collapse sidebar': 'طي القائمة', 'Quick search': 'بحث سريع',
  };
  const t = (s) => (state.dir === 'rtl' && AR[s]) || s;
  E.t = t;

  const NAV = {
    admin: [
      ['Operate', [
        ['Dashboard', 'layout-grid', '/app'],
        ['Team today', 'users', '/app/team'],
        ['Live map', 'map-pinned', '/app/map'],
        ['Clock', 'timer', '/app/clock'],
        ['Attendance', 'calendar-check-2', '/app/attendance', [['Day view', '/app/attendance'], ['Hours report', '/app/attendance/hours']]],
        ['Alerts', 'bell', '/app/notifications', null, 6],
      ]],
      ['People', [
        ['Employees', 'contact-round', '/app/employees'],
        ['Shifts', 'calendar-range', '/app/shifts'],
        ['Leave', 'palmtree', '/app/leave', [['Requests', '/app/leave', 4], ['Balances', '/app/leave/balances'], ['Calendar', '/app/leave/calendar'], ['Policies', '/app/leave/policies'], ['Reports', '/app/leave/reports']]],
        ['Hiring', 'briefcase-business', '/app/hiring'],
        ['Tasks', 'list-checks', '/app/tasks'],
      ]],
      ['Perform', [
        ['KPIs', 'target', '/app/kpis'],
        ['Analytics', 'chart-no-axes-combined', '/app/analytics', [['Overview', '/app/analytics'], ['Alerts', '/app/analytics/alerts', 3]]],
        ['Compensation', 'wallet', '/app/compensation'],
      ]],
      ['System', [
        ['Integrations', 'blocks', '/app/integrations'],
        ['Settings', 'settings-2', '/app/settings'],
        ['Billing', 'credit-card', '/app/billing'],
        ['Health', 'activity', '/app/health'],
      ]],
    ],
    employee: [
      ['Me', [
        ['Clock', 'timer', '/app/clock'],
        ['History', 'history', '/app/attendance'],
        ['Alerts', 'bell', '/app/notifications', null, 2],
      ]],
      ['Workspace', [
        ['My leave', 'palmtree', '/app/leave'],
        ['My tasks', 'list-checks', '/app/tasks', null, 3],
        ['My KPIs', 'target', '/app/kpis'],
        ['My analytics', 'chart-no-axes-combined', '/app/analytics/me'],
        ['Team today', 'users', '/app/team'],
      ]],
    ],
    platform: [
      ['Platform', [
        ['Overview', 'layout-grid', '/app'],
        ['Tenants', 'building-2', '/app/tenants'],
        ['Subscriptions', 'repeat', '/app/subscriptions'],
        ['Leads', 'magnet', '/app/leads', null, 5],
        ['Plans', 'layers', '/app/plans'],
        ['Features', 'toggle-right', '/app/features'],
        ['Payments', 'receipt', '/app/payments'],
        ['Audits', 'scroll-text', '/app/audits'],
        ['Health', 'activity', '/app/health'],
      ]],
    ],
  };

  const USERS = {
    admin: { name: 'Lina Farouk', mail: 'lina.f@nilelogistics.com', tenant: 'Nile Logistics' },
    employee: { name: 'Omar Haddad', mail: 'omar.h@nilelogistics.com', tenant: 'Nile Logistics' },
    platform: { name: 'Abdelrahman Elasrag', mail: 'admin@xaeons.com', tenant: 'Xaeon platform' },
  };
  E.USERS = USERS;

  const isActive = (href, path) => (href === '/app' ? path === '/app' : path === href || path.startsWith(href + '/'));

  function sidebar(path) {
    const groups = NAV[state.role];
    const u = USERS[state.role];
    let html = `<div class="brand">
      <div class="brand-mark"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 19V5h12M5 12h9M5 19h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div><div class="brand-name">ELEVORA</div><div class="brand-tenant">${u.tenant}</div></div></div>`;
    groups.forEach(([label, items], gi) => {
      html += `<div class="nav-group"><div class="nav-label">${t(label)}</div>`;
      items.forEach(([l, icon, href, sub, count]) => {
        const act = sub ? sub.some(([, h]) => path === h) || isActive(href, path) : isActive(href, path);
        const open = sub && (act || state.openGroups[l]);
        html += `<a class="nav-item ${act && !sub ? 'active' : ''} ${act && sub ? 'active' : ''} ${open ? 'open' : ''}" href="#${href}" data-group="${sub ? l : ''}">${ic(icon)}<span>${t(l)}</span>${count ? `<span class="count">${count}</span>` : ''}${sub ? ic('chevron-down', 'chev') : ''}</a>`;
        if (sub && open) {
          html += `<div class="nav-sub">${sub.map(([sl, sh, c]) => `<a href="#${sh}" class="${path === sh ? 'active' : ''}">${t(sl)}${c ? `<span class="count">${c}</span>` : ''}</a>`).join('')}</div>`;
        }
      });
      html += `</div>`;
      if (gi < groups.length - 1 && state.role !== 'admin') html += `<div class="nav-sep"></div>`;
    });
    html += `<div class="nav-sep"></div><a class="nav-item" href="#/app/profile">${ic('circle-user-round')}<span>${t('Profile')}</span></a><a class="nav-item" href="#/gallery">${ic('life-buoy')}<span>${t('Help center')}</span></a>`;

    const up = {
      admin: ['zap', 'Upgrade to Scale', 'Unlock Integrations: CMS Goals, HubSpot and custom REST.', 'Upgrade plan', '#/app/billing'],
      employee: ['cloud-off', '2 events queued', 'Clock events sync when you are back online.', 'Sync now', '#/app/clock'],
      platform: ['flask-conical', 'Lab workspace', 'Preview any plan with every module unlocked.', 'Enter lab', '#/app/features'],
    }[state.role];
    html += `<div class="upsell mt-3"><button class="x" aria-label="Dismiss">${ic('x')}</button><div class="upsell-icon">${ic(up[0])}</div><h4>${up[1]}</h4><p>${up[2]}</p><a class="btn btn-ink" style="width:100%" href="${up[4]}">${up[3]}</a></div>
      <div class="collapse-btn">${ic('chevrons-left', 'flip-rtl')}<span>${t('Collapse sidebar')}</span></div>`;
    return html;
  }

  function topbar() {
    const u = USERS[state.role];
    const cta = { admin: `<button class="btn btn-ink hide-sm" data-act="quick">${ic('plus')}Quick add</button>`, platform: `<a class="btn btn-ink hide-sm" href="#/app/tenants">${ic('plus')}Provision tenant</a>`, employee: '' }[state.role];
    return `<div class="topbar">
      <button class="icon-btn menu-btn" data-act="menu" aria-label="Menu">${ic('menu')}</button>
      <label class="search">${ic('search')}<input placeholder="${t('Quick search')}" aria-label="Search"/><kbd>⌘K</kbd></label>
      <div class="top-spacer"></div>
      <div class="seg hide-sm" role="group" aria-label="Theme">
        <button data-theme-set="light" class="${state.theme === 'light' ? 'on' : ''}" aria-label="Light">${ic('sun')}</button>
        <button data-theme-set="dark" class="${state.theme === 'dark' ? 'on' : ''}" aria-label="Dark">${ic('moon')}</button>
      </div>
      <button class="icon-btn hide-sm" data-act="dir" aria-label="Language" style="font-weight:700;font-size:12px">${state.dir === 'rtl' ? 'EN' : 'ع'}</button>
      <a class="icon-btn" href="#/app/notifications" aria-label="Alerts">${ic('bell')}<span class="dot"></span></a>
      <a class="icon-btn hide-sm" href="#/app/settings" aria-label="Settings">${ic('settings')}</a>
      <div style="position:relative">
        <div class="user-chip" data-act="role">${av(u.name, 'sm')}<div class="who"><b>${u.name}</b><span>${u.mail}</span></div>${ic('chevrons-up-down', 'muted')}</div>
        <div class="pop" id="rolePop">
          <div class="ph">View as</div>
          ${[['admin', 'shield-check', 'Tenant admin', 'Nile Logistics'], ['employee', 'user-round', 'Employee', 'Omar Haddad'], ['platform', 'server-cog', 'Platform super admin', 'Xaeon']].map(([k, i, l, s]) => `<div class="pi ${state.role === k ? 'on' : ''}" data-role="${k}">${ic(i)}<div><div>${l}</div><div class="xs muted">${s}</div></div></div>`).join('')}
          <div class="hr" style="margin:6px 0"></div>
          <a class="pi" href="#/app/profile">${ic('circle-user-round')}Profile</a>
          <a class="pi" href="#/">${ic('log-out')}Sign out</a>
        </div>
      </div>
      ${cta}
    </div>`;
  }

  function protoBar(path) {
    const pub = !path.startsWith('/app');
    const sw = [['lime', '#9ACD32'], ['teal', '#23A7C7'], ['emerald', '#10B981'], ['violet', '#8B7CF6']];
    return `<div class="proto-bar" aria-label="Prototype controls">
      <button class="${pub ? 'on' : ''}" data-go="/">${ic('globe')}<span class="lbl-sm">Site</span></button>
      <button class="${!pub ? 'on' : ''}" data-go="/app">${ic('app-window')}<span class="lbl-sm">App</span></button>
      <button data-go="/gallery">${ic('layout-list')}<span class="lbl-sm">All pages</span></button>
      <span class="sep"></span>
      <button data-act="theme">${ic(state.theme === 'dark' ? 'sun' : 'moon')}<span class="lbl-sm">${state.theme === 'dark' ? 'Light' : 'Dark'}</span></button>
      <span class="sep"></span>
      ${sw.map(([k, c]) => `<button data-accent-set="${k}" title="${k}" aria-label="Accent ${k}" style="padding:7px"><span style="display:block;width:14px;height:14px;border-radius:5px;background:${c};${state.accent === k ? 'box-shadow:0 0 0 2px currentColor' : ''}"></span></button>`).join('')}
    </div>`;
  }

  function applyRoot() {
    const h = document.documentElement;
    h.dataset.theme = state.theme;
    if (state.accent === 'lime') delete h.dataset.accent; else h.dataset.accent = state.accent;
    h.dir = state.dir;
    h.lang = state.dir === 'rtl' ? 'ar' : 'en';
  }

  function match(path) {
    if (E.routes[path]) return [path, []];
    const keys = Object.keys(E.routes).filter((k) => k.includes(':'));
    for (const k of keys) {
      const kp = k.split('/'), pp = path.split('/');
      if (kp.length !== pp.length) continue;
      const params = [];
      if (kp.every((s, i) => (s.startsWith(':') ? (params.push(pp[i]), true) : s === pp[i]))) return [k, params];
    }
    // tab routes: /app/hiring/pipeline -> /app/hiring with param
    const parts = path.split('/');
    while (parts.length > 2) {
      const tail = parts.pop();
      const base = parts.join('/');
      if (E.routes[base + '/*']) return [base + '/*', [tail]];
    }
    if (E.routes[path + '/*']) return [path + '/*', []];
    return [null, []];
  }

  function render() {
    applyRoot();
    let path = location.hash.replace(/^#/, '') || '/';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    const [key, params] = match(path);
    const root = document.getElementById('root');
    const view = key ? E.routes[key](...params) : `<div class="card">${E.empty('file-question', 'Page not found', path, '<a class="btn" href="#/app">Back to dashboard</a>')}</div>`;
    const isApp = path.startsWith('/app') || path === '/gallery';
    if (isApp) {
      root.innerHTML = `<div class="app"><aside class="sidebar" id="sidebar">${sidebar(path)}</aside><div class="main">${topbar()}<div class="main-inner" id="mainInner">${view}</div></div></div>${protoBar(path)}<div class="scrim" id="scrim"></div><aside class="drawer" id="drawer" aria-hidden="true"></aside>`;
    } else {
      root.innerHTML = view + protoBar(path) + `<div class="scrim" id="scrim"></div><aside class="drawer" id="drawer"></aside>`;
    }
    if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
    if (key && E.after[key]) E.after[key](...params);
    const mi = document.getElementById('mainInner');
    if (mi && E._lastPath !== path) mi.scrollTop = 0;
    if (E._lastPath !== path) window.scrollTo(0, 0);
    E._lastPath = path;
  }
  E.render = render;

  E.drawer = (html) => {
    const d = document.getElementById('drawer'), s = document.getElementById('scrim');
    d.innerHTML = html; d.classList.add('on'); s.classList.add('on'); d.setAttribute('aria-hidden', 'false');
    if (window.lucide) lucide.createIcons();
  };
  E.closeDrawer = () => {
    document.getElementById('drawer')?.classList.remove('on');
    document.getElementById('scrim')?.classList.remove('on');
    document.getElementById('sidebar')?.classList.remove('on');
  };

  document.addEventListener('click', (e) => {
    const el = (s) => e.target.closest(s);
    let x;
    if ((x = el('[data-theme-set]'))) { state.theme = x.dataset.themeSet; render(); return; }
    if ((x = el('[data-accent-set]'))) { state.accent = x.dataset.accentSet; render(); return; }
    if ((x = el('[data-go]'))) { location.hash = x.dataset.go; return; }
    if ((x = el('[data-role]'))) { state.role = x.dataset.role; location.hash = state.role === 'employee' ? '/app/clock' : '/app'; render(); return; }
    if ((x = el('[data-act]'))) {
      const a = x.dataset.act;
      if (a === 'theme') { state.theme = state.theme === 'dark' ? 'light' : 'dark'; render(); }
      if (a === 'dir') { state.dir = state.dir === 'rtl' ? 'ltr' : 'rtl'; render(); }
      if (a === 'role') document.getElementById('rolePop').classList.toggle('on');
      if (a === 'menu') { document.getElementById('sidebar').classList.add('on'); document.getElementById('scrim').classList.add('on'); }
      if (a === 'close') E.closeDrawer();
      if (a === 'quick') E.drawer(E.quickAdd());
      return;
    }
    if (el('#scrim')) { E.closeDrawer(); return; }
    if ((x = el('.nav-item[data-group]')) && x.dataset.group) { state.openGroups[x.dataset.group] = true; }
    if ((x = el('.switch'))) { x.classList.toggle('on'); return; }
    if ((x = el('.upsell .x'))) { x.closest('.upsell').remove(); return; }
    if ((x = el('[data-drawer]'))) { const fn = E.drawers[x.dataset.drawer]; if (fn) E.drawer(fn(x.dataset.arg)); return; }
    if ((x = el('.seg[data-local] button'))) { x.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('on')); x.classList.add('on'); return; }
    if (!el('.user-chip') && !el('#rolePop')) document.getElementById('rolePop')?.classList.remove('on');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') E.closeDrawer(); });
  window.addEventListener('hashchange', render);
  E.drawers = {};

  E.quickAdd = () => `
    <div class="drawer-head"><div><h3 class="card-title">Quick add</h3><div class="card-sub">Create anything in Nile Logistics</div></div><button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div>
    <div class="drawer-body"><div class="grid" style="grid-template-columns:1fr 1fr">
      ${[['user-plus', 'Employee', '/app/employees'], ['palmtree', 'Leave request', '/app/leave'], ['list-plus', 'Task', '/app/tasks'], ['briefcase-business', 'Job opening', '/app/hiring/jobs'], ['target', 'KPI metric', '/app/kpis/metrics'], ['megaphone', 'Announcement', '/app/notifications'], ['calendar-plus', 'Shift pattern', '/app/shifts'], ['bell-plus', 'Alert rule', '/app/notifications/custom']].map(([i, l, h]) => `<a class="card" style="padding:14px" href="#${h}" data-act="close"><div class="ico-tile mb-2">${ic(i)}</div><b class="small">${l}</b></a>`).join('')}
    </div></div>`;
})();
