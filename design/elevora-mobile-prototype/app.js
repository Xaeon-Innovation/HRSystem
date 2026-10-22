/* Elevora Field — mobile prototype (vanilla JS) */
const S = { theme: 'light', dir: 'ltr', accent: 'lime', role: 'employee', online: true, clock: 'off', view: 'board', screen: 'today', leaveLen: 0, taskSeg: 0, mapMode: 0 };

const I = (n, c = '') => `<i data-lucide="${n}" class="${c}"></i>`;
const AVC = ['#F9D9A6', '#CDE7B0', '#C9DDF6', '#F4C7C3', '#DCCFF3', '#F3E3A1', '#BFE3DA', '#F2CFE3'];
const av = (name, cls = '', pres = '') => { const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2); const c = AVC[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVC.length]; return `<div class="av ${cls}" style="background:${c}">${ini}${pres ? `<span class="pres ${pres === 'on' ? '' : pres}"></span>` : ''}</div>`; };
const chip = (t, tone = '', ic = '') => `<span class="chip ${tone}">${ic ? I(ic) : ''}${t}</span>`;
const track = (pct, tone = 'hatch', cls = '') => `<div class="track ${cls}"><i class="${tone}" style="width:${pct}%"></i></div>`;
const sw = on => `<span class="sw ${on ? 'on' : ''}"></span>`;
const go = id => `data-go="${id}"`;

/* translations (Arabic) for chrome + key headings */
const AR = { 'Today': 'اليوم', 'Map': 'الخريطة', 'Shifts': 'الورديات', 'Tasks': 'المهام', 'Leave': 'الإجازات', 'Clock in': 'تسجيل الحضور', 'Clock out': 'تسجيل الانصراف', 'Start break': 'بدء الاستراحة', 'End break': 'إنهاء الاستراحة', 'Good morning, Omar': 'صباح الخير، عمر', 'Request leave': 'طلب إجازة', 'My tasks': 'مهامي', 'History': 'السجل', 'Alerts': 'التنبيهات', 'Sign in': 'تسجيل الدخول', 'Continue': 'متابعة', 'Up next': 'التالي', 'Today\'s shift': 'وردية اليوم', 'Balances': 'الأرصدة', 'Requests': 'الطلبات', 'Profile': 'الملف الشخصي', 'Sync center': 'مركز المزامنة', 'Offline maps': 'الخرائط دون اتصال', 'Team today': 'الفريق اليوم', 'Approvals': 'الموافقات', 'This week': 'هذا الأسبوع', 'Submit request': 'إرسال الطلب', 'New request': 'طلب جديد', 'Submit for review': 'إرسال للمراجعة' };
const t = s => S.dir === 'rtl' && AR[s] ? AR[s] : s;

/* ---------- map art (vector, works offline) ---------- */
function mapSVG(o = {}) {
  const { zone = true, you = 'in', trail = false, team = false, sel = false, labels = true, cx = 205, cy = 330, r = 92 } = o;
  let blocks = '';
  const cols = [0, 70, 140, 230, 300, 360], rows = [0, 80, 170, 260, 370, 460, 560, 650];
  for (let i = 0; i < cols.length - 1; i++) for (let j = 0; j < rows.length - 1; j++) {
    const x = cols[i] + 10, y = rows[j] + 10, w = cols[i + 1] - cols[i] - 20, h = rows[j + 1] - rows[j] - 20;
    if ((i === 1 && j === 2)) blocks += `<rect class="m-park" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>`;
    else if ((i + j) % 3 === 0) { blocks += `<rect class="m-block" x="${x}" y="${y}" width="${w / 2 - 4}" height="${h}" rx="6"/><rect class="m-block" x="${x + w / 2 + 4}" y="${y}" width="${w / 2 - 4}" height="${h}" rx="6"/>`; }
    else blocks += `<rect class="m-block" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`;
  }
  const roads = [
    'M0 80 H390', 'M0 170 H390', 'M0 260 H390', 'M0 370 H390', 'M0 460 H390', 'M0 560 H390',
    'M70 0 V720', 'M140 0 V720', 'M230 0 V720', 'M300 0 V720', 'M360 0 V720'];
  const major = 'M-10 520 C 90 470, 160 420, 230 370 S 340 250, 400 200';
  const water = `<path class="m-water" d="M-10 600 C 60 585, 110 640, 150 690 L 150 760 L -10 760 Z"/><path class="m-water" d="M300 620 C 330 600, 370 610, 400 590 L400 760 L 280 760 Z"/>`;
  let s = `<svg viewBox="0 0 390 720" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect class="m-land" width="390" height="720"/>${blocks}${water}
  ${roads.map(d => `<path class="m-casing" stroke-width="12" d="${d}"/>`).join('')}
  ${roads.map(d => `<path class="m-road" stroke-width="9" d="${d}"/>`).join('')}
  <path class="m-casing" stroke-width="22" d="${major}"/><path class="m-major" stroke-width="18" d="${major}"/>`;
  if (labels) s += `<text class="m-label" x="152" y="222">MARINA PARK</text><text class="m-label" x="246" y="300" transform="rotate(-28 246 300)">SHEIKH ZAYED RD</text><text class="m-label" x="20" y="660">DUBAI MARINA</text>`;
  if (sel) s += `<rect class="m-sel" x="40" y="140" width="310" height="380" rx="18"/>`;
  if (zone) s += `<circle class="m-zone" cx="${cx}" cy="${cy}" r="${r}"/>`;
  if (trail) s += `<path class="m-trail-solid" d="M60 620 L70 520 L140 470 L140 370 L230 370 L${cx} ${cy}"/><circle cx="60" cy="620" r="6" fill="var(--surface)" stroke="var(--accent-strong)" stroke-width="3"/>`;
  if (team) {
    const ppl = [[120, 210, 'OK', 'on'], [262, 420, 'SA', 'on'], [318, 150, 'LM', 'late'], [88, 400, 'YH', 'on'], [200, 540, 'RN', 'off'], [250, 260, 'FA', 'on']];
    s += ppl.map(([x, y, n, st]) => `<g><circle cx="${x}" cy="${y}" r="19" fill="var(--surface)"/><circle cx="${x}" cy="${y}" r="15.5" fill="${st === 'on' ? 'var(--accent)' : st === 'late' ? 'var(--warn)' : 'var(--faint)'}"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${st === 'off' ? '#fff' : '#17210a'}" font-family="General Sans, sans-serif">${n}</text></g>`).join('');
  }
  if (you) {
    const [x, y] = you === 'out' ? [cx + 150, cy - 175] : [cx + 14, cy + 8];
    s += `<circle cx="${x}" cy="${y}" r="30" fill="var(--info)" fill-opacity=".14"/><circle cx="${x}" cy="${y}" r="10" fill="var(--info)" stroke="#fff" stroke-width="3.5"/>`;
  }
  if (zone) s += `<g transform="translate(${cx - 30} ${cy - r - 14})"><rect width="60" height="22" rx="11" fill="var(--ink)"/><text x="30" y="15" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--ink-text)" font-family="General Sans, sans-serif">Marina Hub</text></g>`;
  return s + '</svg>';
}
const miniMap = (o = {}, h = 150, tag = 'Offline map') => `<div class="mini-map" style="height:${h}px"><div class="map">${mapSVG(o)}</div>${tag ? `<span class="offline-tag">${I('download')}${tag}</span>` : ''}</div>`;

/* ---------- shared bits ---------- */
const syncPill = () => S.online ? `<span class="sync">${'<i></i>'}Synced · 2 min ago</span>` : `<span class="sync off"><i></i>Offline · 3 queued</span>`;
const offlineBanner = () => S.online ? '' : `<div class="offline-banner" ${go('sync')}>${I('cloud-off')}<div style="flex:1"><b>You're offline</b><br><span>Clock events and changes are saved on this phone.</span></div>${I('chevron-right', 'flip')}</div>`;
const appHead = (sub = 'Nile Logistics · Marina Hub') => `<div class="ahead"><div ${go('more')}>${av('Omar Khalid', 'round', S.clock === 'off' ? 'off' : 'on')}</div><div class="who"><b>${t('Good morning, Omar')}</b><span>${sub}</span></div><button class="ibtn" ${go('alerts')}>${I('bell')}<span class="ping"></span></button></div>`;
const tabs = active => { const T = [['today', 'house', 'Today'], ['map', 'map', 'Map'], ['shifts', 'calendar-clock', 'Shifts'], ['tasks', 'list-checks', 'Tasks', 3], ['leave', 'tree-palm', 'Leave']]; return `<nav class="tabbar">${T.map(([id, ic, l, n]) => `<button class="${active === id ? 'on' : ''}" ${go(id)}>${I(ic)}${t(l)}${n ? `<span class="dot">${n}</span>` : ''}</button>`).join('')}</nav>`; };
const back = (title, to, end = '') => `<div class="nav-row"><button class="ibtn" ${go(to)}>${I('chevron-left', 'flip')}</button><h1>${title}</h1>${end || '<span style="width:42px"></span>'}</div>`;
const ring = (pct, inner, size = 236) => { const R = 108, C = 2 * Math.PI * R; let ticks = ''; return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 236 236"><circle class="bg" cx="118" cy="118" r="${R}" stroke-width="10"/><circle class="fg" cx="118" cy="118" r="${R}" stroke-width="10" stroke-dasharray="${C * pct} ${C}"/></svg>${inner}</div>`; };

/* ---------- screens ---------- */
const SC = {};
const def = (id, group, title, note, fn, opts = {}) => SC[id] = { id, group, title, note, fn, ...opts };

/* Onboarding */
def('splash', 'Sign in', 'Splash', 'Cold start. Restores the session from secure storage, then goes to quick unlock or sign in.', () => `
  <div class="splash"><div class="logo"><i></i></div><div style="font-size:24px;font-weight:600;letter-spacing:-.02em">Elevora</div><div class="muted" style="font-size:13px">Field workforce, in your pocket</div>
  <div style="position:absolute;bottom:60px;display:flex;gap:6px;align-items:center;font-size:12px" class="muted">${I('shield-check')} Secured by Xaeon</div></div>`, { noTab: true });

def('workspace', 'Sign in', 'Find your workspace', 'Step 1. The tenant slug resolves the API region, branding (logo and color preset) and which sign-in methods exist.', () => `
  <div class="body no-tab">
    <div class="auth-art"><div class="stairs">${[0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1].map((v, i) => `<i class="${v ? (i % 3 ? 'hatch' : 'hatch-yellow') : ''}" style="${v ? '' : 'visibility:hidden'}"></i>`).join('')}</div>
      <div style="position:absolute;top:40px;inset-inline-start:18px"><div class="logo" style="width:46px;height:46px;border-radius:15px"><i style="width:16px;height:16px"></i></div></div></div>
    <h1 style="font-size:28px;font-weight:600;letter-spacing:-.03em;line-height:1.1;margin-top:10px">Clock in, track shifts and<br>manage your day.</h1>
    <p class="muted mt8" style="font-size:13.5px">Enter your company workspace to continue.</p>
    <label class="field"><span>Workspace</span><div class="inp focus">${I('building-2')}<span class="v">nile-logistics</span><span class="muted">.elevora.app</span></div></label>
    <button class="btn ink mt16" ${go('signin')}>${t('Continue')} ${I('arrow-right', 'flip')}</button>
    <button class="btn soft mt8">${I('qr-code')} Scan invite QR</button>
  </div>`, { noTab: true });

def('signin', 'Sign in', 'Sign in', 'Step 2. Email and password against /api/mobile/v1/auth/login. Tenant branding is already applied. SSO buttons stay hidden until the web app ships SSO.', () => `
  <div class="body no-tab">
    ${back('', 'workspace')}
    <div class="row mt8"><div class="tile ink" style="width:46px;height:46px;border-radius:15px">${I('truck')}</div><div><b style="font-size:15px">Nile Logistics</b><div class="muted" style="font-size:12px">nile-logistics.elevora.app</div></div></div>
    <h1 style="font-size:28px;font-weight:600;letter-spacing:-.03em;margin-top:24px">${t('Sign in')}</h1>
    <p class="muted mt8" style="font-size:13.5px">Use the email your admin added you with.</p>
    <label class="field"><span>Email</span><div class="inp">${I('mail')}<span class="v">omar.khalid@nilelogistics.ae</span></div></label>
    <label class="field"><span>Password</span><div class="inp focus">${I('lock')}<span class="v">••••••••••</span>${I('eye')}</div></label>
    <div class="between mt12" style="font-size:12.5px"><span class="row" style="gap:8px">${sw(true)} Keep me signed in</span><a style="font-weight:600">Forgot?</a></div>
    <button class="btn ink mt20" ${go('unlock')}>${t('Sign in')}</button>
    <div class="notice mt12">${I('info')}<div>Your admin sends the first password. You'll be asked to change it after signing in.</div></div>
  </div>`, { noTab: true });

def('unlock', 'Sign in', 'Quick unlock', 'Step 3. Face ID / fingerprint or a 4-digit PIN protects the refresh token on the device. It is also used to re-open the app offline.', () => `
  <div class="body no-tab center">
    <div class="bio">${I('scan-face')}</div>
    <h1 style="font-size:24px;font-weight:600;letter-spacing:-.02em">Turn on Face ID</h1>
    <p class="muted mt8" style="font-size:13.5px;line-height:1.5;padding:0 12px">Open Elevora in one glance, even with no signal. Or set a PIN instead.</p>
    <div class="pin">${[1, 1, 0, 0].map(f => `<i class="${f ? 'f' : ''}"></i>`).join('')}</div>
    <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button>${n}</button>`).join('')}<button class="nb">${I('scan-face')}</button><button>0</button><button class="nb">${I('delete', 'flip')}</button></div>
    <button class="btn ink mt16" ${go('perms')}>Use Face ID</button>
  </div>`, { noTab: true });

def('perms', 'Sign in', 'Permissions', 'Step 4. Explains each permission before the OS prompt. "Always" location is only requested for mobile-presence employees and only during shifts.', () => `
  <div class="body no-tab">
    <div class="dots mt8"><i></i><i class="on"></i><i></i></div>
    <h1 style="font-size:26px;font-weight:600;letter-spacing:-.03em;margin-top:22px;line-height:1.15">A few things so clock-in works anywhere</h1>
    <p class="muted mt8" style="font-size:13px">We only track location while you're on shift.</p>
    <div class="mt16">
      <div class="perm"><div class="tile tint">${I('map-pin')}</div><div class="meta"><b>Location · while on shift</b><span>Checks you're inside your work zone and records your route between visits.</span></div>${chip('Allowed', 'ok', 'check')}</div>
      <div class="perm"><div class="tile">${I('bell-ring')}</div><div class="meta"><b>Notifications</b><span>Shift reminders, overtime prompts, leave decisions and new tasks.</span></div>${sw(true)}</div>
      <div class="perm"><div class="tile">${I('activity')}</div><div class="meta"><b>Motion & fitness</b><span>Saves battery by pausing GPS when you're not moving.</span></div>${sw(false)}</div>
      <div class="perm"><div class="tile">${I('camera')}</div><div class="meta"><b>Camera & files</b><span>Attach sick notes and task deliverables.</span></div>${sw(false)}</div>
    </div>
    <button class="btn ink mt16" ${go('download')}>Continue</button>
  </div>`, { noTab: true });

def('download', 'Sign in', 'Get offline map', 'Step 5. Downloads the vector map pack around the employee\'s work zones (from their shifts). Wi-Fi only by default.', () => `
  <div class="body no-tab">
    <div class="dots mt8"><i></i><i></i><i class="on"></i></div>
    <h1 style="font-size:26px;font-weight:600;letter-spacing:-.03em;margin-top:22px;line-height:1.15">Download your work area</h1>
    <p class="muted mt8" style="font-size:13px">So the map and zone checks work without signal.</p>
    <div class="mt16">${miniMap({ zone: true, you: 'in', sel: true }, 250, 'Dubai Marina')}</div>
    <div class="card mt12"><div class="between"><div><b style="font-size:14px">Dubai Marina + Marina Hub zone</b><div class="muted" style="font-size:12px;margin-top:2px">Zoom 10–17 · 2 work zones</div></div><b class="tab">38 MB</b></div>
    <div class="mt12">${track(64, 'hatch', 'lg')}</div><div class="between mt8 muted tab" style="font-size:12px"><span>Downloading… 24 of 38 MB</span><span>64%</span></div></div>
    <div class="between mt12" style="font-size:13px;padding:0 4px"><span>Wi-Fi only</span>${sw(true)}</div>
    <button class="btn ink mt16" ${go('today')}>Go to app</button>
    <button class="btn soft mt8" ${go('today')}>Skip for now</button>
  </div>`, { noTab: true });

/* Today & clock */
const todayBody = () => {
  const st = S.clock;
  let card;
  if (st === 'off') card = `<div class="card clock-card">
      <div class="between"><span class="chip line">${I('calendar-clock')}08:00 – 17:00</span><span class="chip ok">${I('locate-fixed')}Inside zone · 42 m</span></div>
      ${ring(0.0, `<button class="cbtn in hatch" data-act="clockin">${I('fingerprint')}${t('Clock in')}<small>Marina Hub</small></button>`)}
      <div class="muted" style="font-size:12px">GPS ±8 m · server time 07:58</div>
      <div class="kv"><div><b class="tab">08:00</b><span>Starts</span></div><div><b class="tab">30 min</b><span>Break</span></div><div><b class="tab">9h</b><span>Shift</span></div></div></div>`;
  else if (st === 'on') card = `<div class="card clock-card">
      <div class="between"><span class="chip ok"><span style="width:7px;height:7px;border-radius:50%;background:var(--accent)"></span>On shift</span><span class="chip line">${I('radio')}Tracking · 30 s ago</span></div>
      ${ring(0.46, `<div><div class="muted" style="font-size:12px">Worked today</div><div class="elapsed tab">04:12<span class="muted" style="font-size:22px">:36</span></div><div class="muted" style="font-size:12px">of 8h 30m</div></div>`)}
      <div class="btn-row mt8"><button class="btn line" data-act="break">${I('coffee')}${t('Start break')}</button><button class="btn ink" data-act="clockout">${I('log-out', 'flip')}${t('Clock out')}</button></div>
      <div class="kv"><div><b class="tab">08:02</b><span>Clocked in</span></div><div><b class="tab">17:00</b><span>Expected out</span></div><div><b class="tab">0m</b><span>Overtime</span></div></div></div>`;
  else card = `<div class="card clock-card">
      <div class="between"><span class="chip warn">${I('coffee')}On break</span><span class="chip line tab">12 min left</span></div>
      ${ring(0.6, `<button class="cbtn brk" data-act="endbreak">${I('play')}${t('End break')}<small>18 of 30 min</small></button>`)}
      <div class="notice warn mt8" style="text-align:start">${I('map-pin-off')}<div>You can leave the work zone until your break ends. Zone checks resume at 13:00.</div></div></div>`;
  return `${offlineBanner()}<div class="between"><b style="font-size:13px">Thu, 16 Oct</b>${syncPill()}</div>${st === 'off' ? `<div class="card mt12" style="padding:14px"><div class="row"><div class="tile tint">${I('sun')}</div><div class="meta" style="flex:1"><b style="font-size:14px">${t("Today's shift")} · Marina Hub</b><div class="muted" style="font-size:12px;margin-top:2px">Fixed zone · Sun–Thu pattern</div></div>${I('chevron-right','flip')}</div></div>` : ''}
    <div class="mt12">${card}</div>
    <div class="sec">Quick actions</div>
    <div class="qa"><button ${go('leave-new')}><span class="sq">${I('tree-palm')}</span>${t('Request leave')}</button><button ${go('tasks')}><span class="sq">${I('list-checks')}<span class="n">3</span></span>${t('My tasks')}</button><button ${go('history')}><span class="sq">${I('history')}</span>${t('History')}</button><button ${go('map')}><span class="sq">${I('map')}</span>${t('Map')}</button></div>
    <div class="sec">${t('Up next')} <a ${go('tasks')}>See all</a></div>
    <div class="card"><div class="list">
      <div class="li" ${go('task')}><div class="tile warn">${I('package')}</div><div class="meta"><b>Deliver pallets to JLT Cluster D</b><span>Due 11:30 · Report + photos</span></div>${chip('High', 'warn')}</div>
      <div class="li" ${go('task')}><div class="tile">${I('clipboard-check')}</div><div class="meta"><b>Vehicle check — Van 14</b><span>Due 17:00 · Checklist</span></div>${chip('Open', 'info')}</div>
    </div></div>
    <div class="sec">Today</div>
    <div class="card"><div class="tl">${S.clock === 'off' ? `<div class="ti idle"><b>Shift starts · 08:00</b><span>Reminder sent at 07:45</span></div><div class="ti idle"><b>Break window · 12:30 – 13:00</b><span>Fixed break · 30 min</span></div>` : `<div class="ti"><b>Clocked in · 08:02</b><span>Inside Marina Hub · ±8 m</span></div><div class="ti warn"><b>Left zone · 10:40</b><span>Delivery route · task "Deliver pallets"</span></div><div class="ti"><b>Back in zone · 11:52</b><span>Auto-detected</span></div>`}</div></div>`;
};
def('today', 'Today & clock', 'Today (before shift)', 'Home tab. The clock button is enabled only when the device is inside the work zone (fixed-zone staff) or always (mobile staff). Tap it to try the flow.', () => `<div class="body">${appHead()}${todayBody()}</div>${tabs('today')}`, { pre: () => { S.clock = 'off'; } });
def('verify', 'Today & clock', 'Clock-in check', 'Runs locally first so it works offline: GPS fix, accuracy, geofence, mock-location check. The event is written to the outbox with a UUID, then sent.', () => `
  <div class="body" style="opacity:.35;pointer-events:none">${appHead()}<div class="card" style="height:420px"></div></div>
  <div class="scrim"></div>
  <div class="sheet"><div class="grab"></div>
    <h2>Clocking you in</h2><p class="sub">Checking your location against Marina Hub.</p>
    <div class="mt16">${miniMap({ zone: true, you: 'in', cx: 195, cy: 330, r: 110 }, 170, S.online ? 'Live' : 'Offline map')}</div>
    <div class="list mt12">
      <div class="li"><div class="tile sm tint">${I('check')}</div><div class="meta"><b>Location found</b><span>GPS ±8 m · 25.0782, 55.1403</span></div></div>
      <div class="li"><div class="tile sm tint">${I('check')}</div><div class="meta"><b>Inside Marina Hub</b><span>42 m from center · radius 150 m</span></div></div>
      <div class="li"><div class="tile sm tint">${I('check')}</div><div class="meta"><b>Real location</b><span>No mock location detected</span></div></div>
      <div class="li"><div class="tile sm">${I('loader')}</div><div class="meta"><b>${S.online ? 'Sending to Elevora…' : 'Saved on this phone'}</b><span>${S.online ? 'Server records the official time' : 'Will sync when you are back online'}</span></div></div>
    </div>
    <button class="btn ink mt12" data-act="confirmin">Done</button>
  </div>`, { noTab: true });
def('today-on', 'Today & clock', 'On shift', 'Elapsed ring, break and clock out. Background tracking pings are batched (every 60 s or 50 m moved) and shown as "Tracking · 30 s ago".', () => `<div class="body">${appHead()}${todayBody()}</div>${tabs('today')}`, { pre: () => { S.clock = 'on'; } });
def('today-break', 'Today & clock', 'On break', 'While on break, leaving the zone does not create a left-zone incident (product rule). The break ends manually or when the policy time runs out.', () => `<div class="body">${appHead()}${todayBody()}</div>${tabs('today')}`, { pre: () => { S.clock = 'break'; } });
def('outside', 'Today & clock', 'Outside the zone', 'Blocking state for fixed-zone employees. Mobile-presence employees never see it.', () => `
  <div class="body">${back('Clock in', 'today')}
    <div style="position:relative">${miniMap({ zone: true, you: 'out', cx: 150, cy: 360, r: 80 }, 300, 'Offline map')}</div>
    <div class="notice danger mt12">${I('map-pin-off')}<div><b>You're 320 m outside Marina Hub</b>Move inside the dashed area to clock in. Your shift starts at 08:00.</div></div>
    <div class="card mt12"><div class="list"><div class="li"><div class="tile sm">${I('navigation')}</div><div class="meta"><b>Walk to zone</b><span>About 4 min · 320 m</span></div>${I('chevron-right', 'flip')}</div><div class="li"><div class="tile sm">${I('crosshair')}</div><div class="meta"><b>GPS accuracy ±35 m</b><span>Move to an open area for a better fix</span></div></div></div></div>
    <div class="btn-row mt12"><button class="btn line" ${go('map')}>Open map</button><button class="btn ink" ${go('verify')}>Try again</button></div>
    <p class="muted center mt12" style="font-size:11.5px">Work outside zones? Ask your admin to set you as mobile.</p>
  </div>${tabs('today')}`);
def('overtime', 'Today & clock', 'Overtime prompt', 'Shown by a local notification at shift end, and in-app. Grace countdown comes from the shift policy. Works offline.', () => `
  <div class="body" style="pointer-events:none">${appHead()}${(S.clock = 'on', todayBody())}</div>
  <div class="scrim"></div>
  <div class="sheet"><div class="grab"></div>
    <div class="tile warn" style="width:52px;height:52px;border-radius:17px">${I('timer')}</div>
    <h2 class="mt12">Your shift ended at 17:00</h2><p class="sub">Clock out now, or stay and log overtime. If you don't choose, you'll be clocked out when the grace period ends.</p>
    <div class="card mt16" style="background:var(--surface-2);border:0"><div class="between"><span class="muted" style="font-size:12px">Grace period left</span><b class="mid tab">09:42</b></div><div class="mt8">${track(35, 'hatch-warn', 'xs')}</div></div>
    <div class="btn-row mt16"><button class="btn line">${I('timer-reset')}Log overtime</button><button class="btn ink" ${go('today')}>${t('Clock out')}</button></div>
  </div>`, { noTab: true });
def('offline', 'Today & clock', 'Offline mode', 'No signal. Everything keeps working from the local database; queued events show in the banner and the Sync center.', () => `<div class="body">${appHead()}${todayBody()}</div>${tabs('today')}`, { pre: () => { S.clock = 'on'; S.online = false; } });

/* Map */
def('map', 'Map & offline', 'Map', 'Full-screen vector map (MapLibre) from the downloaded pack. Shows your position, work zone and today\'s trail. Live layer joins when online.', () => `
  <div class="map">${mapSVG({ zone: true, you: 'in', trail: true })}</div>
  <div class="map-float map-top"><div class="search">${I('search')}Search places or tasks</div><button class="ibtn" ${go('offline-maps')}>${I('layers')}</button></div>
  <div class="map-float map-side"><button class="ibtn">${I('locate-fixed')}</button><button class="ibtn">${I('plus')}</button><button class="ibtn">${I('minus')}</button></div>
  <div class="map-card">
    ${S.role === 'manager' ? `<div class="seg on-surface" style="margin-bottom:12px"><button class="on">Me</button><button ${go('map-team')}>My team</button></div>` : ''}
    <div class="row"><div class="tile tint">${I('locate-fixed')}</div><div class="meta" style="flex:1"><b style="font-size:14px">Inside Marina Hub</b><div class="muted" style="font-size:12px;margin-top:2px">42 m from center · ±8 m</div></div>${chip(S.online ? 'Live' : 'Offline', S.online ? 'ok' : 'warn')}</div>
    <div class="hr"></div>
    <div class="grid3 center"><div><b class="tab" style="font-size:15px">14.2 km</b><div class="muted" style="font-size:11px">Today's route</div></div><div><b class="tab" style="font-size:15px">3</b><div class="muted" style="font-size:11px">Stops</div></div><div><b class="tab" style="font-size:15px">38 MB</b><div class="muted" style="font-size:11px">Offline pack</div></div></div>
  </div>${tabs('map')}`, { mapScreen: true });
def('map-team', 'Map & offline', 'Team map (manager)', 'Managers see direct reports: live over WebSocket when online, last known positions from cache when offline.', () => `
  <div class="map">${mapSVG({ zone: true, you: false, team: true })}</div>
  <div class="map-float map-top"><div class="search">${I('search')}Search team</div><button class="ibtn">${I('sliders-horizontal')}</button></div>
  <div class="map-card" style="padding-bottom:6px">
    <div class="seg on-surface" style="margin-bottom:10px"><button ${go('map')}>Me</button><button class="on">My team</button></div>
    <div class="chips" style="margin-bottom:6px">${chip('4 on shift', 'ok')}${chip('1 late', 'warn')}${chip('1 last seen', '')}</div>
    <div class="list">
      <div class="li">${av('Sara Ahmed', 'sm', 'on')}<div class="meta"><b>Sara Ahmed</b><span>JLT Cluster D · 1 min ago</span></div><span class="muted tab" style="font-size:12px">2.1 km</span></div>
      <div class="li">${av('Layla Mansour', 'sm', 'late')}<div class="meta"><b>Layla Mansour</b><span>Late clock-in · 08:21</span></div>${chip('Late', 'warn')}</div>
    </div>
  </div>${tabs('map')}`, { mapScreen: true, pre: () => { S.role = 'manager'; } });
def('offline-maps', 'Map & offline', 'Offline maps', 'Manage map packs. Zones from upcoming shifts auto-download. Packs refresh monthly on Wi-Fi.', () => `
  <div class="body">${back(t('Offline maps'), 'map')}
    <div class="card"><div class="between"><div><div class="muted" style="font-size:12px">Storage used</div><div class="mid tab mt8">62 MB <span class="muted" style="font-size:14px">of 500 MB limit</span></div></div><div class="tile tint">${I('hard-drive')}</div></div>
    <div class="segbar mt12"><i class="hatch" style="width:8%"></i><i class="hatch-yellow" style="width:5%"></i><i class="hatch-idle" style="flex:1"></i></div></div>
    <div class="sec">Your areas</div>
    <div class="card"><div class="list">
      <div class="li"><div class="tile accent">${I('map')}</div><div class="meta"><b>Dubai Marina</b><span>Marina Hub zone · updated 3 days ago</span></div><div class="end"><b class="tab">38 MB</b>${chip('Ready', 'ok')}</div></div>
      <div class="li"><div class="tile">${I('map')}</div><div class="meta"><b>JLT</b><span>Cluster D deliveries</span><div class="mt8" style="width:150px">${track(64, 'hatch', 'xs')}</div></div><div class="end"><b class="tab">24 MB</b><span class="muted">64%</span></div></div>
      <div class="li"><div class="tile">${I('map')}</div><div class="meta"><b>Business Bay</b><span>Shift on Sun 19 Oct</span></div><button class="ibtn" style="width:36px;height:36px;border-radius:11px">${I('download')}</button></div>
    </div></div>
    <div class="menu mt12"><div class="mi">${I('sparkles')}<span>Auto-download shift zones</span>${sw(true)}</div><div class="mi">${I('wifi')}<span>Download on Wi-Fi only</span>${sw(true)}</div></div>
    <button class="btn ink mt16" ${go('map-select')}>${I('square-dashed')}Download another area</button>
  </div>${tabs('map')}`);
def('map-select', 'Map & offline', 'Choose area', 'Drag the frame to pick an area. Size is estimated from the bounding box and zoom range before downloading.', () => `
  <div class="map">${mapSVG({ zone: true, you: 'in', sel: true })}</div>
  <div class="map-float map-top"><button class="ibtn" ${go('offline-maps')}>${I('x')}</button><div class="search" style="justify-content:center;color:var(--text);font-weight:600">Move the map to fit your area</div></div>
  <div class="map-card" style="bottom:24px">
    <div class="between"><div><b style="font-size:15px">New offline area</b><div class="muted" style="font-size:12px;margin-top:2px">≈ 6.4 km² · Dubai Marina North</div></div><b class="mid tab">≈ 31 MB</b></div>
    <div class="field" style="margin-top:12px"><span>Detail</span><div class="seg on-surface"><button>Streets</button><button class="on">Buildings</button><button>Max</button></div></div>
    <button class="btn ink mt12" ${go('offline-maps')}>${I('download')}Download</button>
  </div>`, { mapScreen: true, noTab: true });

/* Shifts */
const daysStrip = (on = 4, dots = [1, 1, 1, 1, 1, 0, 0]) => `<div class="days">${['Sun 12', 'Mon 13', 'Tue 14', 'Wed 15', 'Thu 16', 'Fri 17', 'Sat 18', 'Sun 19', 'Mon 20'].map((d, i) => { const [w, n] = d.split(' '); return `<div class="day ${i === on ? 'on' : ''}">${w}<b>${n}</b><span class="d ${(dots[i % 7]) ? '' : 'no'}"></span></div>`; }).join('')}</div>`;
def('shifts', 'Shifts', 'My shifts', 'Upcoming shift instances from the active pattern, cached for 14 days ahead. Flags (late in, late out, deduction) match the web.', () => `
  <div class="body">
    <div class="title-row"><h1>${t('Shifts')}</h1><button class="ibtn">${I('calendar')}</button></div>
    ${daysStrip()}
    <div class="card mt16" ${go('shift')}>
      <div class="between"><span class="chip ok">Today</span><span class="chip line">${I('map-pin')}Marina Hub</span></div>
      <div class="between mt12"><div><div class="big tab">08:00<span class="muted" style="font-size:20px"> – 17:00</span></div><div class="muted mt8" style="font-size:12px">9 h · break 12:30–13:00 · fixed zone</div></div></div>
      <div class="mt12"><div class="sess"><i class="hatch-idle" style="left:0;width:100%"></i><i class="hatch" style="left:4%;width:42%"></i><i class="hatch-warn" style="left:50%;width:6%"></i></div><div class="sess-scale tab"><span>08</span><span>11</span><span>14</span><span>17</span></div></div>
    </div>
    <div class="sec">${t('This week')}</div>
    <div class="card"><div class="grid3 center"><div><b class="mid tab">36h</b><div class="muted" style="font-size:11px">Scheduled</div></div><div><b class="mid tab">29h</b><div class="muted" style="font-size:11px">Worked</div></div><div><b class="mid tab" style="color:var(--warn-text)">1h 20</b><div class="muted" style="font-size:11px">Overtime</div></div></div></div>
    <div class="sec">Upcoming</div>
    <div class="card"><div class="list">
      ${[['Sun 19', 'Business Bay', '08:00 – 17:00', ''], ['Mon 20', 'Marina Hub', '08:00 – 17:00', ''], ['Tue 21', 'Marina Hub', '10:00 – 19:00', 'Changed']].map(([d, z, w, f]) => `<div class="li" ${go('shift')}><div class="tile"><div style="text-align:center;line-height:1.05"><div style="font-size:9.5px;color:var(--muted)">${d.split(' ')[0]}</div><b style="font-size:14px">${d.split(' ')[1]}</b></div></div><div class="meta"><b class="tab">${w}</b><span>${z}</span></div>${f ? chip(f, 'info') : I('chevron-right', 'flip')}</div>`).join('')}
    </div></div>
    <div class="sec">Recent flags</div>
    <div class="card"><div class="list"><div class="li"><div class="tile warn">${I('alarm-clock')}</div><div class="meta"><b>Late clock-in · Tue 14</b><span>08:21 · 21 min after start</span></div>${chip('Late', 'warn')}</div><div class="li"><div class="tile danger">${I('map-pin-off')}</div><div class="meta"><b>Left zone · Mon 13</b><span>Pending review by manager</span></div>${chip('Review', 'danger')}</div></div></div>
  </div>${tabs('shifts')}`);
def('shift', 'Shifts', 'Shift detail', 'Everything an employee needs for one shift: zone, window, break and overtime policy, plus incidents.', () => `
  <div class="body">${back('Thu, 16 Oct', 'shifts')}
    ${miniMap({ zone: true, you: 'in' }, 180, 'Marina Hub')}
    <div class="card mt12"><div class="grid2">
      <div><div class="muted" style="font-size:11.5px">Window</div><b class="tab" style="font-size:16px">08:00 – 17:00</b></div>
      <div><div class="muted" style="font-size:11.5px">Presence</div><b style="font-size:16px">Fixed zone</b></div>
      <div><div class="muted" style="font-size:11.5px">Break</div><b class="tab" style="font-size:16px">30 min · fixed</b></div>
      <div><div class="muted" style="font-size:11.5px">Overtime grace</div><b class="tab" style="font-size:16px">15 min</b></div></div></div>
    <div class="card mt12"><div class="card-h"><h3>Pattern</h3>${chip('Weekly', 'line')}</div>
      <div class="grid4" style="grid-template-columns:repeat(7,1fr);gap:5px">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => `<div style="height:38px;border-radius:11px;display:grid;place-items:center;font-size:12px;font-weight:600" class="${i < 5 ? 'hatch' : 'hatch-idle'}">${d}</div>`).join('')}</div>
      <p class="muted mt12" style="font-size:12px">Sun–Thu · set by Ahmed Saleh (HR)</p></div>
    <div class="card mt12"><div class="card-h"><h3>Today so far</h3></div><div class="tl"><div class="ti"><b>Clocked in · 08:02</b><span>On time</span></div><div class="ti warn"><b>Left zone · 10:40 – 11:52</b><span>Linked to task · no incident</span></div></div></div>
  </div>${tabs('shifts')}`);

/* Leave */
def('leave', 'Leave', 'Leave', 'Balances from the ledger, then requests with the same statuses as the web (pending, approved, returned…). Cached for offline viewing.', () => `
  <div class="body">
    <div class="title-row"><h1>${t('Leave')}</h1><button class="ibtn" ${go('leave-new')}>${I('plus')}</button></div>
    <div class="card" style="background:var(--ink);color:var(--ink-text);border:0;position:relative;overflow:hidden">
      <div style="position:absolute;inset-inline-end:-40px;top:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
      <div style="font-size:12px;opacity:.7">Annual leave left</div><div class="big tab mt8">14.5 <span style="font-size:16px;opacity:.6">of 21 days</span></div>
      <div class="mt12 track lg" style="background:rgba(255,255,255,.12)"><i class="hatch" style="width:69%"></i></div>
      <div class="between mt8 tab" style="font-size:11.5px;opacity:.7"><span>2 pending</span><span>Resets 1 Jan</span></div></div>
    <div class="grid3 mt12">${[['Sick', '6', '10', 'hatch-yellow'], ['Comp.', '2', '3', 'hatch'], ['WFH', '4', '8', 'hatch-warn']].map(([n, a, b, h]) => `<div class="card" style="padding:12px"><div class="muted" style="font-size:11.5px">${n}</div><b class="mid tab">${a}<span class="muted" style="font-size:12px">/${b}</span></b><div class="mt8">${track(a / b * 100, h, 'xs')}</div></div>`).join('')}</div>
    <button class="btn ink mt12" ${go('leave-new')}>${I('plus')}${t('Request leave')}</button>
    <div class="sec">${t('Requests')}</div>
    <div class="card"><div class="list">
      <div class="li" ${go('leave-detail')}><div class="tile tint">${I('tree-palm')}</div><div class="meta"><b>Annual · 26–30 Oct</b><span>5 days · planned</span></div>${chip('Pending', 'warn')}</div>
      <div class="li" ${go('leave-detail')}><div class="tile">${I('thermometer')}</div><div class="meta"><b>Sick · 2 Oct</b><span>1st half · note attached</span></div>${chip('Approved', 'ok')}</div>
      <div class="li"><div class="tile">${I('house')}</div><div class="meta"><b>Work from home · 24 Sep</b><span>Full day</span></div>${chip('Returned', 'info')}</div>
      <div class="li"><div class="tile">${I('zap')}</div><div class="meta"><b>Emergency · 11 Sep</b><span>4 hours</span></div>${chip('Approved', 'ok')}</div>
    </div></div>
    ${S.role === 'manager' ? `<button class="btn line mt12" ${go('approvals')}>${I('inbox')}Team approvals · 3</button>` : ''}
  </div>${tabs('leave')}`);
const cal = () => { let h = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="h">${d}</div>`).join(''); for (let i = 0; i < 3; i++) h += `<div class="c dim">${28 + i}</div>`; for (let d = 1; d <= 31; d++) { let c = 'c'; if (d >= 26 && d <= 30) c += ' sel' + (d === 26 ? ' s' : '') + (d === 30 ? ' e' : ''); if (d === 16) c += ' today'; if (d === 23) c += ' hol'; h += `<div class="${c}">${d}</div>`; } return `<div class="cal tab">${h}</div>`; };
def('leave-new', 'Leave', 'New leave request', 'Same rules as the web: length (full, halves, hours), planned or emergency, attachment if the type needs it, live balance and conflict check. Offline requests save as "Waiting to send".', () => `
  <div class="body">${back(t('New request'), 'leave')}
    <div class="field" style="margin-top:0"><span>Leave type</span><div class="chips">${['Annual', 'Sick', 'Emergency', 'WFH', 'Unpaid', 'Comp.'].map((x, i) => `<span class="chip ${i === 0 ? 'ink' : 'line'}" style="height:34px;padding:0 13px;font-size:12.5px">${x}</span>`).join('')}</div></div>
    <div class="field"><span>Length</span><div class="seg">${['Full day', '1st half', '2nd half', 'Hours'].map((x, i) => `<button class="${i === S.leaveLen ? 'on' : ''}" data-act="len${i}">${x}</button>`).join('')}</div></div>
    <div class="card mt12"><div class="between" style="margin-bottom:10px"><button class="ibtn ghost" style="width:30px;height:30px">${I('chevron-left', 'flip')}</button><b>October 2026</b><button class="ibtn ghost" style="width:30px;height:30px">${I('chevron-right', 'flip')}</button></div>${cal()}
      <div class="between mt12" style="font-size:12.5px"><span class="muted">Sun 26 → Thu 30 Oct</span><b class="tab">5 working days</b></div></div>
    <div class="notice warn mt12">${I('users')}<div><b>2 teammates are off on 28 Oct</b>Sara and Youssef from Marina Hub. You can still submit.</div></div>
    <div class="card mt12" style="padding:12px 14px"><div class="grid3 center tab"><div><div class="muted" style="font-size:11px">Balance</div><b>14.5</b></div><div><div class="muted" style="font-size:11px">This request</div><b>−5</b></div><div><div class="muted" style="font-size:11px">After</div><b style="color:var(--accent-strong)">9.5</b></div></div></div>
    <div class="field"><span>Note to manager</span><div class="txt">Family trip, handover to Sara…</div></div>
    <div class="field"><span>Attachment · optional</span><div class="inp" style="border-style:dashed">${I('paperclip')}<span class="ph">Add photo or PDF</span></div></div>
    <button class="btn ink mt16" ${go('leave-detail')}>${t('Submit request')}</button>
    ${S.online ? '' : `<p class="muted center mt8" style="font-size:11.5px">You're offline. This will send automatically when you reconnect.</p>`}
  </div>`, { noTab: true });
def('leave-detail', 'Leave', 'Request detail', 'Read-only timeline. Employee can cancel while pending, or edit and resubmit if returned.', () => `
  <div class="body">${back('Annual leave', 'leave')}
    <div class="card"><div class="between">${chip('Pending approval', 'warn', 'hourglass')}<span class="muted tab" style="font-size:12px">#LV-2291</span></div>
      <div class="big tab mt12">26 – 30 Oct</div><div class="muted mt8" style="font-size:13px">5 working days · Full day · Planned</div>
      <div class="hr"></div>
      <div class="grid3 center tab"><div><div class="muted" style="font-size:11px">Reserved</div><b>5</b></div><div><div class="muted" style="font-size:11px">Left after</div><b>9.5</b></div><div><div class="muted" style="font-size:11px">Approver</div><b>Ahmed S.</b></div></div></div>
    <div class="card mt12"><div class="card-h"><h3>Timeline</h3></div><div class="tl">
      <div class="ti"><b>Submitted · Today 09:14</b><span>From Elevora mobile</span></div>
      <div class="ti"><b>5 days reserved from balance</b><span>Pending reserve</span></div>
      <div class="ti idle"><b>Waiting for Ahmed Saleh</b><span>Usually replies within a day</span></div></div></div>
    <div class="card mt12"><div class="card-h"><h3>Note</h3></div><p style="font-size:13px;color:var(--text-2);line-height:1.5">Family trip, handover to Sara for JLT deliveries.</p></div>
    <button class="btn danger-t mt16">Cancel request</button>
  </div>`, { noTab: true });
def('approvals', 'Leave', 'Approvals (manager)', 'Managers and users with the "leaves" module role approve from the phone. Return, reject, approve with a note — same actions as the web drawer.', () => `
  <div class="body">${back(t('Approvals'), 'leave')}
    <div class="seg"><button class="on">Pending · 3</button><button>Decided</button></div>
    ${[['Sara Ahmed', 'Annual · 27–28 Oct', '2 days · balance 11 → 9', true], ['Youssef Hany', 'Sick · Today', '1st half · note attached', false], ['Rana Nabil', 'Emergency · 20 Oct', '4 hours', false]].map(([n, a, b, c]) => `<div class="card mt12"><div class="row">${av(n, 'sm')}<div class="meta" style="flex:1"><b style="font-size:14px">${n}</b><div class="muted" style="font-size:12px">${a}</div></div>${chip('Pending', 'warn')}</div>
      <p class="muted mt12" style="font-size:12px">${b}</p>${c ? `<div class="notice warn mt8" style="padding:9px 12px">${I('users')}<div>Overlaps with Omar Khalid (28 Oct)</div></div>` : ''}
      <div class="btn-row mt12"><button class="btn line sm" style="flex:1">Return</button><button class="btn danger-t sm" style="flex:1">Reject</button><button class="btn ink sm" style="flex:1.3">Approve</button></div></div>`).join('')}
  </div>`, { noTab: true, pre: () => { S.role = 'manager'; } });

/* Tasks */
def('tasks', 'Tasks', 'My tasks', 'Assigned tasks (shared and individual). Status changes and deliverables queue offline and sync with a version check.', () => `
  <div class="body">
    <div class="title-row"><h1>${t('Tasks')}</h1><button class="ibtn">${I('search')}</button></div>
    <div class="seg">${['Open · 3', 'In progress', 'Submitted', 'Done'].map((x, i) => `<button class="${i === S.taskSeg ? 'on' : ''}" data-act="tseg${i}">${x}</button>`).join('')}</div>
    <div class="mt12">
      <div class="task" ${go('task')}><div class="between"><div class="chips">${chip('High', 'warn')}${chip('Open', 'info')}</div><span class="muted tab" style="font-size:11.5px">Due 11:30</span></div><h4>Deliver pallets to JLT Cluster D</h4><p>Report + 3 photos · Individual · batch 3/8 done</p><div class="mt12">${track(37, 'hatch', 'xs')}</div><div class="between mt12"><div class="avs">${av('Ahmed Saleh', 'xs round')}</div><div class="chips">${chip('#delivery', 'line')}</div></div></div>
      <div class="task" ${go('task')}><div class="between"><div class="chips">${chip('Urgent', 'danger')}${chip('Changes requested', 'warn')}</div><span class="muted tab" style="font-size:11.5px">Overdue</span></div><h4>Photo proof — damaged boxes, order 8812</h4><p>Screenshots · reviewer asked for clearer photos</p><div class="between mt12"><div class="avs">${av('Ahmed Saleh', 'xs round')}${av('Omar Khalid', 'xs round')}</div>${chip('#claims', 'line')}</div></div>
      <div class="task" ${go('task')}><div class="between"><div class="chips">${chip('Medium', '')}${chip('Open', 'info')}</div><span class="muted tab" style="font-size:11.5px">Due 17:00</span></div><h4>Vehicle check — Van 14</h4><p>Shared · one activity log · 3 people</p><div class="between mt12"><div class="avs">${av('Sara Ahmed', 'xs round')}${av('Omar Khalid', 'xs round')}${av('Rana Nabil', 'xs round')}</div>${chip('#fleet', 'line')}</div></div>
    </div>
  </div>${tabs('tasks')}`);
def('task', 'Tasks', 'Task detail', 'Start, attach deliverables (camera, file, link) and submit for review. Files upload in the background with resumable retries.', () => `
  <div class="body">${back('Task', 'tasks', `<button class="ibtn">${I('ellipsis')}</button>`)}
    <div class="chips">${chip('High', 'warn')}${chip('In progress', 'warn')}${chip('Review required', 'line')}</div>
    <h1 style="font-size:22px;font-weight:600;letter-spacing:-.02em;margin-top:12px;line-height:1.2">Deliver pallets to JLT Cluster D</h1>
    <div class="row mt12" style="gap:14px;font-size:12.5px" class="muted"><span class="row muted" style="gap:5px">${I('calendar')}Today 11:30</span><span class="row muted" style="gap:5px">${I('user')}Ahmed Saleh</span></div>
    <div class="card mt16"><p style="font-size:13px;line-height:1.55;color:var(--text-2)">Drop 6 pallets at Cluster D loading bay. Get a signature from the site supervisor and take photos of the stacked pallets.</p>
      ${miniMap({ zone: false, you: 'in', trail: true }, 130, 'JLT Cluster D')}</div>
    <div class="sec">Deliverables <a>Report + photos</a></div>
    <div class="card"><div class="list">
      <div class="li"><div class="tile tint">${I('image')}</div><div class="meta"><b>pallets-stacked.jpg</b><span>2.4 MB · uploaded</span></div>${I('check', '')}</div>
      <div class="li"><div class="tile">${I('image')}</div><div class="meta"><b>signature.jpg</b><span>${S.online ? 'Uploading… 68%' : 'Waiting for connection'}</span><div class="mt8" style="width:160px">${track(68, S.online ? 'hatch' : 'hatch-idle', 'xs')}</div></div>${I('loader')}</div>
    </div>
    <div class="grid3 mt12"><button class="btn soft sm" style="width:100%">${I('camera')}Photo</button><button class="btn soft sm" style="width:100%">${I('file')}File</button><button class="btn soft sm" style="width:100%">${I('link')}Link</button></div></div>
    <div class="sec">Activity</div>
    <div class="card"><div class="tl"><div class="ti"><b>You started the task · 09:40</b><span>Status → In progress</span></div><div class="ti idle"><b>Ahmed created the task · Yesterday</b><span>Individual · batch of 8</span></div></div></div>
    <button class="btn ink mt16">${I('send')}${t('Submit for review')}</button>
  </div>`, { noTab: true });

/* Account & sync */
def('history', 'Account & sync', 'History', 'Employee view of Attendance: day strip, sessions, totals. Sessions captured offline carry a badge so admins can see them.', () => `
  <div class="body">${back(t('History'), 'more')}
    ${daysStrip(3)}
    <div class="grid3 mt16">${[['8h 12', 'Worked'], ['0h 40', 'Overtime'], ['30m', 'Break']].map(([a, b]) => `<div class="card center" style="padding:12px"><b class="mid tab">${a}</b><div class="muted" style="font-size:11px">${b}</div></div>`).join('')}</div>
    <div class="card mt12"><div class="card-h"><h3>Wed, 15 Oct</h3>${chip('On time', 'ok')}</div>
      <div class="sess"><i class="hatch" style="left:2%;width:40%"></i><i class="hatch-idle" style="left:42%;width:5%"></i><i class="hatch" style="left:47%;width:42%"></i><i class="hatch-warn" style="left:89%;width:8%"></i></div><div class="sess-scale tab"><span>08</span><span>11</span><span>14</span><span>17</span><span>19</span></div>
      <div class="list mt12">
        <div class="li"><div class="tile sm tint">${I('log-in', 'flip')}</div><div class="meta"><b class="tab">07:58 – 12:31</b><span>Marina Hub</span></div><b class="tab" style="font-size:13px">4h 33</b></div>
        <div class="li"><div class="tile sm tint">${I('log-in', 'flip')}</div><div class="meta"><b class="tab">13:01 – 17:40</b><span>JLT Cluster D</span></div><div class="end"><b class="tab">4h 39</b>${chip('Offline', 'line', 'cloud-off')}</div></div>
      </div></div>
    <div class="card mt12"><div class="card-h"><h3>Tue, 14 Oct</h3>${chip('Late in', 'warn')}</div><div class="sess"><i class="hatch" style="left:10%;width:80%"></i></div><div class="sess-scale tab"><span>08</span><span>11</span><span>14</span><span>17</span><span>19</span></div></div>
  </div>`, { noTab: true });
def('alerts', 'Account & sync', 'Alerts', 'Same inbox as web. Push notifications deep-link here or to the related item.', () => `
  <div class="body">${back(t('Alerts'), 'today', `<button class="ibtn">${I('check-check')}</button>`)}
    <div class="seg"><button class="on">All</button><button>Shifts</button><button>Leave</button><button>Tasks</button></div>
    <div class="card mt12"><div class="list">
      ${[['warn', 'timer', 'Shift ends in 15 min', 'Choose overtime or clock out', '16:45', 1], ['tint', 'check', 'Leave approved', 'Sick · 2 Oct · by Ahmed Saleh', '2h', 1], ['info', 'list-checks', 'New task assigned', 'Vehicle check — Van 14', '3h', 0], ['danger', 'map-pin-off', 'Left zone incident', 'Mon 13 · pending review', 'Mon', 0], ['', 'megaphone', 'Announcement', 'Ramadan hours start next week', 'Sun', 0]].map(([tone, ic, a, b, tm, un]) => `<div class="li"><div class="tile ${tone}">${I(ic)}</div><div class="meta"><b>${a}</b><span>${b}</span></div><div class="end"><span class="muted">${tm}</span>${un ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);margin:6px 0 0 auto"></div>' : ''}</div></div>`).join('')}
    </div></div>
  </div>`, { noTab: true });
def('sync', 'Account & sync', 'Sync center', 'The outbox. Every write is an event with a client UUID (idempotency key). Shows what is queued, what failed, and conflicts the user must resolve.', () => `
  <div class="body">${back(t('Sync center'), 'more')}
    <div class="card"><div class="row"><div class="tile ${S.online ? 'tint' : 'warn'}">${I(S.online ? 'cloud' : 'cloud-off')}</div><div class="meta" style="flex:1"><b style="font-size:15px">${S.online ? 'All synced' : 'Offline · 3 waiting'}</b><div class="muted" style="font-size:12px;margin-top:2px">${S.online ? 'Last sync 2 min ago' : 'Last sync 47 min ago · auto-retries when online'}</div></div></div>
      <button class="btn ink mt12">${I('refresh-cw')}Sync now</button></div>
    <div class="sec">Waiting to send</div>
    <div class="card"><div class="list">
      <div class="li"><div class="tile sm">${I('log-in', 'flip')}</div><div class="meta"><b>Clock in · 13:01</b><span>Captured offline · inside JLT zone</span></div>${chip('Queued', 'warn')}</div>
      <div class="li"><div class="tile sm">${I('route')}</div><div class="meta"><b>148 location points</b><span>13:01 – 13:48 · 42 KB</span></div>${chip('Queued', 'warn')}</div>
      <div class="li"><div class="tile sm">${I('image')}</div><div class="meta"><b>signature.jpg</b><span>Task · Deliver pallets</span></div>${chip('Queued', 'warn')}</div>
    </div></div>
    <div class="sec">Needs your attention</div>
    <div class="card"><div class="row"><div class="tile danger">${I('git-compare')}</div><div class="meta" style="flex:1"><b style="font-size:14px">Task changed on the web</b><div class="muted" style="font-size:12px">"Photo proof — order 8812" was set to Changes requested while you were offline.</div></div></div>
      <div class="btn-row mt12"><button class="btn line sm" style="flex:1">Keep web version</button><button class="btn ink sm" style="flex:1">Re-apply mine</button></div></div>
    <p class="muted center mt16 mono">device d-7f3a · outbox v3 · cursor 1729071234</p>
  </div>`, { noTab: true });
def('more', 'Account & sync', 'Profile & more', 'Opened from the avatar. Holds secondary screens, preferences and sign out. Theme and language match the web settings.', () => `
  <div class="body">
    <div class="title-row"><h1>${t('Profile')}</h1><button class="ibtn" ${go('today')}>${I('x')}</button></div>
    <div class="card"><div class="row">${av('Omar Khalid', '', 'on')}<div class="meta" style="flex:1"><b style="font-size:16px">Omar Khalid</b><div class="muted" style="font-size:12px">Field driver · Marina Hub</div></div>${chip('Mobile', 'line')}</div>
      <div class="hr"></div><div class="grid3 center tab"><div><b>96%</b><div class="muted" style="font-size:11px">On time</div></div><div><b>14.5</b><div class="muted" style="font-size:11px">Leave days</div></div><div><b>82</b><div class="muted" style="font-size:11px">KPI score</div></div></div></div>
    <div class="menu mt12">
      <div class="mi" ${go('history')}>${I('history')}<span>${t('History')}</span>${I('chevron-right', 'flip chev')}</div>
      <div class="mi" ${go('alerts')}>${I('bell')}<span>${t('Alerts')}</span><small>2 new</small>${I('chevron-right', 'flip chev')}</div>
      ${S.role === 'manager' ? `<div class="mi" ${go('team')}>${I('users')}<span>${t('Team today')}</span><small>6</small>${I('chevron-right', 'flip chev')}</div>` : ''}
      <div class="mi" ${go('sync')}>${I('refresh-cw')}<span>${t('Sync center')}</span><small>${S.online ? 'Synced' : '3 queued'}</small>${I('chevron-right', 'flip chev')}</div>
      <div class="mi" ${go('offline-maps')}>${I('map')}<span>${t('Offline maps')}</span><small>62 MB</small>${I('chevron-right', 'flip chev')}</div>
    </div>
    <div class="menu mt12">
      <div class="mi">${I('languages')}<span>Language</span><small>${S.dir === 'rtl' ? 'العربية' : 'English'}</small></div>
      <div class="mi">${I('moon')}<span>Dark mode</span>${sw(S.theme === 'dark')}</div>
      <div class="mi">${I('scan-face')}<span>Face ID unlock</span>${sw(true)}</div>
      <div class="mi">${I('shield')}<span>Location & privacy</span>${I('chevron-right', 'flip chev')}</div>
    </div>
    <button class="btn soft mt12" style="color:var(--danger)">${I('log-out', 'flip')}Sign out</button>
    <p class="muted center mt12" style="font-size:11px">Elevora 1.0.0 (42) · Nile Logistics</p>
  </div>`, { noTab: true });
def('team', 'Account & sync', 'Team today (manager)', 'Team today for managers: same data as the web page, filtered to direct reports.', () => `
  <div class="body">${back(t('Team today'), 'more')}
    <div class="grid2">${[['Clocked in', '4', 'ok'], ['Late', '1', 'warn'], ['On leave', '1', ''], ['Missed out', '0', 'danger']].map(([a, b, c]) => `<div class="card" style="padding:14px"><div class="muted" style="font-size:12px">${a}</div><b class="big tab" style="display:block;margin-top:8px;font-size:28px">${b}</b></div>`).join('')}</div>
    <div class="card mt12"><div class="list">
      ${[['Sara Ahmed', 'In · 07:55 · JLT', 'on', 'On shift', 'ok'], ['Layla Mansour', 'In · 08:21 · Marina Hub', 'late', 'Late', 'warn'], ['Youssef Hany', 'Sick leave', 'off', 'On leave', ''], ['Rana Nabil', 'In · 08:00 · Mobile', 'on', 'On shift', 'ok'], ['Fadi Aziz', 'In · 07:49 · Business Bay', 'on', 'On shift', 'ok']].map(([n, s, p, c, tn]) => `<div class="li">${av(n, 'sm', p)}<div class="meta"><b>${n}</b><span>${s}</span></div>${chip(c, tn)}</div>`).join('')}
    </div></div>
    <button class="btn line mt12" ${go('map-team')}>${I('map')}See on map</button>
  </div>`, { noTab: true, pre: () => { S.role = 'manager'; } });

/* ---------- render ---------- */
const GROUPS = ['Sign in', 'Today & clock', 'Map & offline', 'Shifts', 'Leave', 'Tasks', 'Account & sync'];
const GDESC = { 'Sign in': 'Workspace → sign in → quick unlock → permissions → offline map download.', 'Today & clock': 'The home tab. One-tap clock in with an on-device geofence check that works without signal.', 'Map & offline': 'Vector map packs stored on the phone. Zone, position and route render offline.', 'Shifts': 'Upcoming shift instances, pattern, break and overtime rules.', 'Leave': 'Balances, requests and manager approvals with the same statuses as the web.', 'Tasks': 'Assigned tasks, deliverables with background upload, submit for review.', 'Account & sync': 'History, alerts, the sync outbox and profile.' };

function phoneHTML(id) {
  const sc = SC[id]; const saved = { ...S };
  if (sc.pre) sc.pre();
  const inner = sc.fn();
  const out = `<div class="phone"><div class="screen"><div class="island"></div><div class="sbar ${sc.mapScreen ? 'on-map' : ''}"><span class="tab">9:41</span><span class="ic">${I('signal')}${S.online ? I('wifi') : I('wifi-off')}${I('battery-full')}</span></div>${inner}<div class="home-ind"></div></div></div>`;
  Object.assign(S, { role: saved.role, clock: saved.clock, online: saved.online });
  return out;
}

function renderBoard() {
  const sc = 0.62, W = 390 * sc, H = 844 * sc;
  return `<div class="page"><div class="page-head"><div><div class="brand"><div class="logo"><i></i></div>Elevora Field · mobile app</div><h1>Every screen, from sign in to the day's work</h1><p>${Object.keys(SC).length} screens for iOS and Android. Built on the web redesign tokens. Click any phone to open it in the interactive view.</p></div><div class="legend-pills">${GROUPS.map(g => `<a href="#g-${g.replace(/\W+/g, '')}">${g}</a>`).join('')}</div></div>
  ${GROUPS.map(g => `<section class="flow" id="g-${g.replace(/\W+/g, '')}"><h2>${g}<span>${Object.values(SC).filter(s => s.group === g).length}</span></h2><p>${GDESC[g]}</p><div class="flow-row">${Object.values(SC).filter(s => s.group === g).map(s => `<div class="board-item" data-open="${s.id}"><div style="width:${W}px;height:${H}px"><div class="scaled" style="transform:scale(${sc});width:390px;height:844px">${phoneHTML(s.id)}</div></div><div class="cap">${s.title}<small>${s.note}</small></div></div>`).join('')}</div></section>`).join('')}</div>`;
}

function renderInteractive() {
  const sc = SC[S.screen];
  if (sc.pre) sc.pre();
  const inner = sc.fn();
  return `<div class="page"><div class="stage">
    <aside class="side">${GROUPS.map(g => `<h4>${g}</h4>${Object.values(SC).filter(s => s.group === g).map(s => `<button class="${s.id === S.screen ? 'on' : ''}" data-go="${s.id}">${s.title}</button>`).join('')}`).join('')}</aside>
    <div class="phone-wrap"><div class="phone"><div class="screen"><div class="island"></div><div class="sbar ${sc.mapScreen ? 'on-map' : ''}"><span class="tab">9:41</span><span class="ic">${I('signal')}${S.online ? I('wifi') : I('wifi-off')}${I('battery-full')}</span></div>${inner}<div class="home-ind"></div></div></div></div>
    <aside class="notes"><div class="k">${sc.group}</div><h3>${sc.title}</h3><p class="mt8">${sc.note}</p>
      <div class="k">Try it</div><ul><li>Tap the clock button on Today.</li><li>Use the tab bar and back buttons.</li><li>Toggle Offline, Manager, Arabic and Dark below.</li></ul>
      <div class="k">Route (Expo Router)</div><p><code>${ROUTES[sc.id] || '/'}</code></p></aside>
  </div></div>`;
}
const ROUTES = { splash: 'app/index.tsx', workspace: '(auth)/workspace', signin: '(auth)/sign-in', unlock: '(auth)/unlock', perms: '(onboarding)/permissions', download: '(onboarding)/offline-map', today: '(tabs)/index', verify: '(tabs)/index → ClockSheet', 'today-on': '(tabs)/index', 'today-break': '(tabs)/index', outside: '(tabs)/index → OutsideZone', overtime: 'modal/overtime', offline: '(tabs)/index (offline)', map: '(tabs)/map', 'map-team': '(tabs)/map?view=team', 'offline-maps': 'offline-maps/index', 'map-select': 'offline-maps/new', shifts: '(tabs)/shifts', shift: 'shifts/[id]', leave: '(tabs)/leave', 'leave-new': 'leave/new', 'leave-detail': 'leave/[id]', approvals: 'leave/approvals', tasks: '(tabs)/tasks', task: 'tasks/[id]', history: 'history', alerts: 'alerts', sync: 'sync', more: 'profile', team: 'team' };

function bar() {
  const b = (k, l, ic, on) => `<button data-p="${k}" class="${on ? 'on' : ''}">${I(ic)}${l}</button>`;
  return `<div class="proto-bar"><div class="inner">${b('board', 'All screens', 'layout-grid', S.view === 'board')}${b('interactive', 'Interactive', 'smartphone', S.view === 'interactive')}<span class="sep"></span>${b('theme', S.theme === 'dark' ? 'Dark' : 'Light', S.theme === 'dark' ? 'moon' : 'sun', false)}${b('dir', S.dir === 'rtl' ? 'العربية' : 'English', 'languages', S.dir === 'rtl')}${b('online', S.online ? 'Online' : 'Offline', S.online ? 'wifi' : 'wifi-off', !S.online)}${b('role', S.role === 'manager' ? 'Manager' : 'Employee', 'user-cog', S.role === 'manager')}${b('accent', S.accent === 'lime' ? 'Lime' : 'Teal', 'palette', false)}</div></div>`;
}

function render() {
  const root = document.documentElement;
  root.dataset.theme = S.theme; root.dir = S.dir; root.lang = S.dir === 'rtl' ? 'ar' : 'en';
  if (S.accent === 'teal') root.dataset.accent = 'teal'; else delete root.dataset.accent;
  document.getElementById('app').innerHTML = (S.view === 'board' ? renderBoard() : renderInteractive()) + bar();
  if (window.lucide) lucide.createIcons();
}

document.addEventListener('click', e => {
  const p = e.target.closest('[data-p]');
  if (p) { const k = p.dataset.p; if (k === 'board' || k === 'interactive') S.view = k; if (k === 'theme') S.theme = S.theme === 'dark' ? 'light' : 'dark'; if (k === 'dir') S.dir = S.dir === 'rtl' ? 'ltr' : 'rtl'; if (k === 'online') S.online = !S.online; if (k === 'role') S.role = S.role === 'manager' ? 'employee' : 'manager'; if (k === 'accent') S.accent = S.accent === 'lime' ? 'teal' : 'lime'; return render(); }
  const op = e.target.closest('[data-open]');
  if (op && S.view === 'board') { S.view = 'interactive'; S.screen = op.dataset.open; render(); window.scrollTo(0, 0); return; }
  if (S.view !== 'interactive') return;
  const a = e.target.closest('[data-act]');
  if (a) {
    const k = a.dataset.act;
    if (k === 'clockin') { S.screen = 'verify'; render(); return; }
    if (k === 'confirmin') { S.screen = 'today-on'; render(); return; }
    if (k === 'clockout') { S.screen = 'overtime'; render(); return; }
    if (k === 'break') { S.screen = 'today-break'; render(); return; }
    if (k === 'endbreak') { S.screen = 'today-on'; render(); return; }
    if (k.startsWith('len')) { S.leaveLen = +k.slice(3); render(); return; }
    if (k.startsWith('tseg')) { S.taskSeg = +k.slice(4); render(); return; }
  }
  const g = e.target.closest('[data-go]');
  if (g && SC[g.dataset.go]) {
    let id = g.dataset.go;
    if (id === 'today') id = S.clock === 'on' ? 'today-on' : S.clock === 'break' ? 'today-break' : 'today';
    if (id === 'today' && !S.online) id = 'today';
    S.screen = id; render();
    const b = document.querySelector('.screen .body'); if (b) b.scrollTop = 0;
  }
});
render();
