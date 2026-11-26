(() => {
  'use strict';

  /* ================= Constants ================= */
  const KEY = 'mortuary-caselog-v1';

  const STATUSES = [
    { id: 'received', label: 'Received' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'released', label: 'Released' },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));

  const WORK_ITEMS = [
    { id: 'id_verified', label: 'Identity verified' },
    { id: 'effects_logged', label: 'Personal effects logged' },
    { id: 'washed', label: 'Washed & disinfected' },
    { id: 'features_set', label: 'Features set' },
    { id: 'arterial', label: 'Arterial embalming' },
    { id: 'cavity', label: 'Cavity treatment' },
    { id: 'restoration', label: 'Restorative work' },
    { id: 'hair', label: 'Hair' },
    { id: 'cosmetics', label: 'Cosmetics' },
    { id: 'dressed', label: 'Dressed' },
    { id: 'casketed', label: 'Casketed / coffined' },
    { id: 'viewing', label: 'Viewing prepared' },
  ];
  const WORK_LABEL = Object.fromEntries(WORK_ITEMS.map((w) => [w.id, w.label]));

  const CHEM_TYPES = ['Arterial', 'Cavity', 'Pre-injection', 'Co-injection', 'Humectant', 'Dye', 'Disinfectant', 'Other'];

  const DEFAULT_CATALOG = [
    { id: 'c1', name: 'Arterial fluid — index 25', type: 'Arterial', index: 25 },
    { id: 'c2', name: 'Arterial fluid — index 18', type: 'Arterial', index: 18 },
    { id: 'c3', name: 'Arterial fluid — index 30 (firm)', type: 'Arterial', index: 30 },
    { id: 'c4', name: 'Cavity fluid — index 30', type: 'Cavity', index: 30 },
    { id: 'c5', name: 'Pre-injection conditioner', type: 'Pre-injection', index: null },
    { id: 'c6', name: 'Co-injection additive', type: 'Co-injection', index: null },
    { id: 'c7', name: 'Humectant', type: 'Humectant', index: null },
    { id: 'c8', name: 'Tissue dye', type: 'Dye', index: null },
    { id: 'c9', name: 'Surface disinfectant', type: 'Disinfectant', index: null },
  ];

  const ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>',
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 18H4v-7h16v7h-3M7 14h10v7H7z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  };

  /* ================= Helpers ================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const DAY = 864e5;

  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const fmtNum = (n, d = 0) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
  const fullName = (d) => [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Unnamed';
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');
  const ageOf = (dob, dod) => {
    if (!dob) return null;
    const a = new Date(dob), b = dod ? new Date(dod) : new Date();
    let age = b.getFullYear() - a.getFullYear();
    if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) age--;
    return age >= 0 ? age : null;
  };
  const totalMl = (job) => job.chemicals.reduce((s, c) => s + (Number(c.volumeMl) || 0), 0);
  const pill = (status) => `<span class="pill ${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span>`;

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ================= Store ================= */
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.jobs)) return { catalog: DEFAULT_CATALOG, ...s };
      }
    } catch (e) { /* storage unavailable */ }
    return { jobs: demoJobs(), catalog: DEFAULT_CATALOG.slice(), demo: true };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save — browser storage is unavailable'); }
  }
  const getJob = (id) => state.jobs.find((j) => j.id === id);
  function nextCaseNo() {
    const yr = new Date().getFullYear();
    const nums = state.jobs.map((j) => (j.caseNo || '').match(new RegExp(`^${yr}-(\\d+)$`))).filter(Boolean).map((m) => +m[1]);
    return `${yr}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
  }

  /* ================= Demo data (fictional) ================= */
  function demoJobs() {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const first = ['Margaret', 'Arthur', 'Dorothy', 'Harold', 'Joan', 'Kenneth', 'Eileen', 'Ronald', 'Patricia', 'Stanley', 'Irene', 'Leonard', 'Brenda', 'Walter', 'Sylvia', 'Frank', 'Maureen', 'Douglas', 'Valerie', 'Gordon'];
    const last = ['Ashworth', 'Bramley', 'Cole', 'Dunmore', 'Ellison', 'Fairley', 'Garnett', 'Holloway', 'Ingram', 'Jessop', 'Kirkby', 'Lindqvist', 'Marsh', 'Northcott', 'Oakes', 'Pemberton', 'Quayle', 'Rowntree'];
    const causes = ['Natural causes', 'Cardiac arrest', 'Pneumonia', 'Stroke', 'Cancer', 'Heart failure', 'COPD', 'Dementia'];
    const places = ['Home', 'Hospital', 'Care home', 'Hospice'];
    const embalmers = ['J. Whitfield', 'R. Okafor', 'S. Lindsay'];
    const fds = ['Hartley & Sons', 'Greenway Funeral Care', 'St. Clement Funerals'];
    const now = Date.now();
    const jobs = [];
    const N = 34;
    for (let i = 0; i < N; i++) {
      const daysAgo = Math.floor((1 - i / N) * 82 + rnd() * 3);
      const received = new Date(now - daysAgo * DAY - rnd() * 8 * 36e5);
      const dod = new Date(received - (0.3 + rnd() * 2) * DAY);
      const age = 58 + Math.floor(rnd() * 38);
      const dob = new Date(dod.getFullYear() - age, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27));
      let status = 'released';
      if (daysAgo < 2) status = rnd() < 0.6 ? 'received' : 'in_progress';
      else if (daysAgo < 5) status = rnd() < 0.5 ? 'in_progress' : 'completed';
      else if (daysAgo < 10) status = rnd() < 0.4 ? 'completed' : 'released';
      const done = status !== 'received';
      const embalmed = done && rnd() > 0.15;
      const work = {};
      WORK_ITEMS.forEach((w) => { work[w.id] = false; });
      work.id_verified = true;
      work.effects_logged = true;
      if (done) {
        work.washed = true; work.features_set = true;
        if (embalmed) { work.arterial = true; work.cavity = rnd() > 0.1; }
        if (status !== 'in_progress') {
          work.hair = true; work.cosmetics = true; work.dressed = true;
          work.casketed = rnd() > 0.2; work.viewing = rnd() > 0.4; work.restoration = rnd() > 0.8;
        }
      }
      const chems = [];
      if (embalmed) {
        const art = pick([DEFAULT_CATALOG[0], DEFAULT_CATALOG[0], DEFAULT_CATALOG[1], DEFAULT_CATALOG[2]]);
        if (rnd() > 0.5) chems.push({ product: DEFAULT_CATALOG[4].name, type: 'Pre-injection', index: '', volumeMl: 470 });
        chems.push({ product: art.name, type: 'Arterial', index: art.index, volumeMl: 470 * (2 + Math.floor(rnd() * 3)) });
        if (rnd() > 0.4) chems.push({ product: DEFAULT_CATALOG[5].name, type: 'Co-injection', index: '', volumeMl: 470 });
        if (rnd() > 0.6) chems.push({ product: DEFAULT_CATALOG[7].name, type: 'Dye', index: '', volumeMl: 30 });
        if (work.cavity) chems.push({ product: DEFAULT_CATALOG[3].name, type: 'Cavity', index: 30, volumeMl: 470 * (1 + Math.floor(rnd() * 2)) });
      }
      if (done) chems.push({ product: DEFAULT_CATALOG[8].name, type: 'Disinfectant', index: '', volumeMl: 250 });
      const completedAt = ['completed', 'released'].includes(status) ? new Date(+received + (6 + rnd() * 40) * 36e5).toISOString() : '';
      jobs.push({
        id: uid() + i,
        demo: true,
        caseNo: `${received.getFullYear()}-${String(i + 101).padStart(4, '0')}`,
        status,
        receivedAt: received.toISOString(),
        completedAt,
        embalmer: pick(embalmers),
        funeralDirector: pick(fds),
        decedent: {
          firstName: pick(first), lastName: pick(last),
          dob: dob.toISOString().slice(0, 10), dod: dod.toISOString().slice(0, 10),
          sex: rnd() > 0.5 ? 'Female' : 'Male',
          weightKg: 50 + Math.floor(rnd() * 45), heightCm: 150 + Math.floor(rnd() * 38),
          causeOfDeath: pick(causes), placeOfDeath: pick(places),
          nextOfKin: `${pick(first)} ${pick(last)}`, nokPhone: '', religion: '',
          condition: rnd() > 0.7 ? 'Mild oedema in lower limbs.' : '',
        },
        embalming: embalmed ? { arterialSite: pick(['Right common carotid', 'Right common carotid', 'Right femoral']), drainageSite: pick(['Right internal jugular', 'Right internal jugular', 'Right femoral']), method: pick(['Restricted cervical', 'Single-point']) } : { arterialSite: '', drainageSite: '', method: '' },
        chemicals: chems,
        work,
        notes: '',
        createdAt: received.toISOString(),
        updatedAt: (completedAt || received.toISOString()),
      });
    }
    return jobs;
  }

  /* ================= Router ================= */
  const routes = [
    [/^#\/dashboard$/, viewDashboard, 'dashboard'],
    [/^#\/jobs$/, viewJobs, 'jobs'],
    [/^#\/jobs\/new$/, () => viewForm(null), 'jobs'],
    [/^#\/jobs\/([\w-]+)\/edit$/, (id) => viewForm(id), 'jobs'],
    [/^#\/jobs\/([\w-]+)$/, viewDetail, 'jobs'],
    [/^#\/chemicals$/, viewChemicals, 'chemicals'],
    [/^#\/settings$/, viewSettings, 'settings'],
  ];
  function route() {
    const hash = location.hash || '#/dashboard';
    for (const [re, fn, nav] of routes) {
      const m = hash.match(re);
      if (m) {
        $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
        fn(...m.slice(1));
        window.scrollTo(0, 0);
        return;
      }
    }
    location.hash = '#/dashboard';
  }
  window.addEventListener('hashchange', route);
  const app = $('#app');
  const render = (html) => { app.innerHTML = html; };

  /* ================= Dashboard ================= */
  function viewDashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const jobs = state.jobs;
    const thisMonth = jobs.filter((j) => new Date(j.receivedAt) >= monthStart);
    const lastMonth = jobs.filter((j) => { const d = new Date(j.receivedAt); return d >= lastMonthStart && d < monthStart; });
    const open = jobs.filter((j) => j.status === 'received' || j.status === 'in_progress');
    const completedMonth = jobs.filter((j) => j.completedAt && new Date(j.completedAt) >= monthStart);
    const recentDone = jobs.filter((j) => j.completedAt && now - new Date(j.completedAt) < 30 * DAY);
    const avgHrs = recentDone.length ? recentDone.reduce((s, j) => s + (new Date(j.completedAt) - new Date(j.receivedAt)), 0) / recentDone.length / 36e5 : null;
    const mlMonth = thisMonth.reduce((s, j) => s + totalMl(j), 0);
    const delta = thisMonth.length - lastMonth.length;

    // Weekly intake (last 12 weeks, weeks start Monday)
    const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
    const thisWeek = startOfWeek(now);
    const weeks = Array.from({ length: 12 }, (_, i) => ({ start: new Date(+thisWeek - (11 - i) * 7 * DAY), count: 0 }));
    jobs.forEach((j) => {
      const w = startOfWeek(j.receivedAt);
      const idx = Math.round((w - weeks[0].start) / (7 * DAY));
      if (idx >= 0 && idx < 12) weeks[idx].count++;
    });

    // Status counts
    const counts = Object.fromEntries(STATUSES.map((s) => [s.id, 0]));
    jobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
    const maxCount = Math.max(1, ...Object.values(counts));

    // Chemical usage (last 30 days)
    const usage = {};
    jobs.filter((j) => now - new Date(j.receivedAt) < 30 * DAY).forEach((j) => j.chemicals.forEach((c) => {
      if (!c.product) return;
      usage[c.product] = (usage[c.product] || 0) + (Number(c.volumeMl) || 0);
    }));
    const topChems = Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxChem = Math.max(1, ...topChems.map((c) => c[1]));

    // Work completion rate for open cases
    const openSorted = open.slice().sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
    const recent = jobs.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);

    render(`
      <div class="page-head">
        <div>
          <h1>Dashboard</h1>
          <p class="muted">${esc(now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
        </div>
        ${state.demo ? '<p class="muted">Showing fictional demo data · <a href="#/settings">clear it</a></p>' : ''}
      </div>

      <section class="kpis" aria-label="Key figures">
        <div class="card kpi">
          <div class="kpi-label">Open cases</div>
          <div class="kpi-value">${open.length}</div>
          <div class="kpi-sub">${counts.received} awaiting · ${counts.in_progress} in progress</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label">Received this month</div>
          <div class="kpi-value">${thisMonth.length}</div>
          <div class="kpi-sub">${delta === 0 ? 'Same as' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs`} last month (${lastMonth.length})</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label">Avg. turnaround</div>
          <div class="kpi-value">${avgHrs == null ? '—' : `${fmtNum(avgHrs, 0)}<small style="font-size:16px;font-weight:500"> hrs</small>`}</div>
          <div class="kpi-sub">Received → completed, last 30 days</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label">Chemicals used this month</div>
          <div class="kpi-value">${fmtNum(mlMonth / 1000, 1)}<small style="font-size:16px;font-weight:500"> L</small></div>
          <div class="kpi-sub">${completedMonth.length} cases completed this month</div>
        </div>
      </section>

      <section class="dash-grid">
        <div class="card">
          <div class="card-head"><h2>Cases received per week</h2><span class="muted" style="font-size:13px">Last 12 weeks</span></div>
          <div class="chart">${weeklyChart(weeks)}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>By status</h2><a href="#/jobs">All jobs</a></div>
          <ul class="status-list">
            ${STATUSES.map((s) => `
              <li>
                <div style="flex:1">
                  ${pill(s.id)}
                  <div class="meter"><span style="width:${(counts[s.id] / maxCount) * 100}%"></span></div>
                </div>
                <span class="count">${counts[s.id]}</span>
              </li>`).join('')}
          </ul>
        </div>
      </section>

      <section class="dash-grid">
        <div class="card">
          <div class="card-head"><h2>Open cases</h2><span class="muted" style="font-size:13px">Oldest first</span></div>
          ${openSorted.length ? `
          <div class="table-wrap"><table>
            <thead><tr><th>Decedent</th><th class="hide-sm">Received</th><th>Progress</th><th>Status</th></tr></thead>
            <tbody>
              ${openSorted.map((j) => {
                const doneCount = WORK_ITEMS.filter((w) => j.work[w.id]).length;
                return `<tr class="clickable" data-href="#/jobs/${esc(j.id)}">
                  <td><a class="primary" href="#/jobs/${esc(j.id)}">${esc(fullName(j.decedent))}</a><div class="sub">${esc(j.caseNo)} · ${esc(j.funeralDirector || '—')}</div></td>
                  <td class="hide-sm num">${esc(fmtDateTime(j.receivedAt))}</td>
                  <td style="min-width:110px"><span class="num" style="font-size:12px">${doneCount}/${WORK_ITEMS.length} tasks</span><div class="meter"><span style="width:${(doneCount / WORK_ITEMS.length) * 100}%"></span></div></td>
                  <td>${pill(j.status)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>` : '<div class="empty">No open cases.</div>'}
        </div>
        <div class="card">
          <div class="card-head"><h2>Chemical usage</h2><span class="muted" style="font-size:13px">Last 30 days</span></div>
          ${topChems.length ? `<ul class="hbars">
            ${topChems.map(([name, ml]) => `
              <li><div class="row"><span>${esc(name)}</span><span>${fmtNum(ml / 1000, 2)} L</span></div>
              <div class="meter"><span style="width:${(ml / maxChem) * 100}%"></span></div></li>`).join('')}
          </ul>` : '<div class="empty">No chemicals recorded in the last 30 days.</div>'}
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Recently updated</h2><a href="#/jobs">View all</a></div>
        ${jobsTable(recent)}
      </section>
    `);
  }

  function weeklyChart(weeks) {
    const W = 640, H = 220, padL = 28, padB = 26, padT = 10;
    const max = Math.max(4, ...weeks.map((w) => w.count));
    const step = Math.ceil(max / 4);
    const top = step * 4;
    const bw = (W - padL) / weeks.length;
    const y = (v) => padT + (H - padT - padB) * (1 - v / top);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of cases received per week">`;
    for (let v = 0; v <= top; v += step) {
      s += `<line class="grid" x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`;
      s += `<text class="axis" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    weeks.forEach((w, i) => {
      const x = padL + i * bw + bw * 0.2;
      const h = y(0) - y(w.count);
      s += `<rect class="bar" x="${x}" y="${y(w.count)}" width="${bw * 0.6}" height="${Math.max(h, 0)}" rx="3"><title>Week of ${esc(fmtDate(w.start))}: ${w.count} case${w.count === 1 ? '' : 's'}</title></rect>`;
      if (i % 2 === 1 || weeks.length <= 6) {
        s += `<text class="axis" x="${x + bw * 0.3}" y="${H - 8}" text-anchor="middle">${esc(w.start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}</text>`;
      }
    });
    return s + '</svg>';
  }

  /* ================= Jobs list ================= */
  function jobsTable(list) {
    if (!list.length) return '<div class="empty">No jobs match.</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Case</th><th>Decedent</th><th class="hide-sm">Received</th><th class="hide-sm">Embalmer</th><th class="hide-sm">Chemicals</th><th>Status</th></tr></thead>
      <tbody>
        ${list.map((j) => `<tr class="clickable" data-href="#/jobs/${esc(j.id)}">
          <td class="num">${esc(j.caseNo)}</td>
          <td><a class="primary" href="#/jobs/${esc(j.id)}">${esc(fullName(j.decedent))}</a><div class="sub">${esc([ageOf(j.decedent.dob, j.decedent.dod) != null ? `${ageOf(j.decedent.dob, j.decedent.dod)} yrs` : '', j.decedent.sex].filter(Boolean).join(' · ') || '—')}</div></td>
          <td class="hide-sm num">${esc(fmtDate(j.receivedAt))}</td>
          <td class="hide-sm">${esc(j.embalmer || '—')}</td>
          <td class="hide-sm num">${j.chemicals.length ? `${fmtNum(totalMl(j) / 1000, 2)} L` : '—'}</td>
          <td>${pill(j.status)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  const listState = { q: '', status: '', sort: 'newest' };
  function viewJobs() {
    render(`
      <div class="page-head">
        <div><h1>Jobs</h1><p class="muted">${state.jobs.length} case${state.jobs.length === 1 ? '' : 's'} on record</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn" id="export-csv">Export CSV</button>
          <a class="btn btn-primary" href="#/jobs/new">${ICON.plus}New job</a>
        </div>
      </div>
      <section class="card">
        <div class="filters">
          <input type="search" id="q" placeholder="Search name, case number, embalmer, funeral director…" value="${esc(listState.q)}" aria-label="Search jobs">
          <select id="f-status" aria-label="Filter by status">
            <option value="">All statuses</option>
            ${STATUSES.map((s) => `<option value="${s.id}" ${listState.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <select id="f-sort" aria-label="Sort">
            <option value="newest" ${listState.sort === 'newest' ? 'selected' : ''}>Newest first</option>
            <option value="oldest" ${listState.sort === 'oldest' ? 'selected' : ''}>Oldest first</option>
            <option value="name" ${listState.sort === 'name' ? 'selected' : ''}>Surname A–Z</option>
          </select>
        </div>
        <div id="job-results"></div>
      </section>
    `);
    const update = () => { $('#job-results').innerHTML = jobsTable(filteredJobs()); };
    $('#q').addEventListener('input', (e) => { listState.q = e.target.value; update(); });
    $('#f-status').addEventListener('change', (e) => { listState.status = e.target.value; update(); });
    $('#f-sort').addEventListener('change', (e) => { listState.sort = e.target.value; update(); });
    $('#export-csv').addEventListener('click', () => exportCsv(filteredJobs()));
    update();
  }
  function filteredJobs() {
    const q = listState.q.trim().toLowerCase();
    let list = state.jobs.filter((j) => {
      if (listState.status && j.status !== listState.status) return false;
      if (!q) return true;
      return [fullName(j.decedent), j.caseNo, j.embalmer, j.funeralDirector, j.decedent.nextOfKin].join(' ').toLowerCase().includes(q);
    });
    const by = {
      newest: (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt),
      oldest: (a, b) => new Date(a.receivedAt) - new Date(b.receivedAt),
      name: (a, b) => (a.decedent.lastName || '').localeCompare(b.decedent.lastName || ''),
    };
    return list.sort(by[listState.sort]);
  }

  /* ================= Job detail ================= */
  function viewDetail(id) {
    const j = getJob(id);
    if (!j) return render('<div class="card empty">Job not found. <a href="#/jobs">Back to jobs</a></div>');
    const d = j.decedent;
    const age = ageOf(d.dob, d.dod);
    const field = (label, val, cls = '') => `<div class="${cls}"><dt>${esc(label)}</dt><dd>${val ? esc(val) : '<span class="muted">—</span>'}</dd></div>`;
    render(`
      <div class="page-head">
        <div>
          <a href="#/jobs" class="muted no-print" style="display:inline-flex;align-items:center;gap:4px;text-decoration:none;font-size:13px">${ICON.back}Jobs</a>
          <h1 style="margin-top:6px">${esc(fullName(d))}</h1>
          <p class="muted">Case ${esc(j.caseNo)} · Received ${esc(fmtDateTime(j.receivedAt))}</p>
        </div>
        <div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" onclick="window.print()">${ICON.print}Print</button>
          <a class="btn btn-primary" href="#/jobs/${esc(j.id)}/edit">${ICON.edit}Edit</a>
        </div>
      </div>
      <div class="detail-grid">
        <div class="stack">
          <section class="card">
            <div class="card-head"><h2>Decedent</h2></div>
            <dl class="dl card-pad">
              ${field('Full name', fullName(d))}
              ${field('Sex', d.sex)}
              ${field('Date of birth', d.dob && fmtDate(d.dob))}
              ${field('Date of death', d.dod && fmtDate(d.dod))}
              ${field('Age', age != null ? `${age} years` : '')}
              ${field('Height / weight', [d.heightCm && `${d.heightCm} cm`, d.weightKg && `${d.weightKg} kg`].filter(Boolean).join(' · '))}
              ${field('Cause of death', d.causeOfDeath)}
              ${field('Place of death', d.placeOfDeath)}
              ${field('Next of kin', d.nextOfKin)}
              ${field('NOK phone', d.nokPhone)}
              ${field('Religious / cultural requirements', d.religion, 'full')}
              ${field('Condition on arrival', d.condition, 'full')}
            </dl>
          </section>
          <section class="card">
            <div class="card-head"><h2>Chemicals used</h2><span class="muted num">${fmtNum(totalMl(j) / 1000, 2)} L total</span></div>
            ${j.chemicals.length ? `<div class="table-wrap"><table>
              <thead><tr><th>Product</th><th>Type</th><th>Index</th><th style="text-align:right">Volume</th></tr></thead>
              <tbody>${j.chemicals.map((c) => `<tr><td>${esc(c.product)}</td><td>${esc(c.type)}</td><td class="num">${esc(c.index || '—')}</td><td class="num" style="text-align:right">${fmtNum(c.volumeMl)} ml</td></tr>`).join('')}</tbody>
            </table></div>` : '<div class="empty">No chemicals recorded.</div>'}
            ${(j.embalming.method || j.embalming.arterialSite || j.embalming.drainageSite) ? `
            <dl class="dl card-pad" style="border-top:1px solid var(--line)">
              ${field('Injection method', j.embalming.method)}
              ${field('Arterial injection site', j.embalming.arterialSite)}
              ${field('Drainage site', j.embalming.drainageSite)}
            </dl>` : ''}
          </section>
          <section class="card">
            <div class="card-head"><h2>Work completed</h2><span class="muted num">${WORK_ITEMS.filter((w) => j.work[w.id]).length} of ${WORK_ITEMS.length}</span></div>
            <div class="card-pad">
              <ul class="work-done">
                ${WORK_ITEMS.map((w) => `<li class="${j.work[w.id] ? '' : 'no'}">${j.work[w.id] ? ICON.check : ICON.x}${esc(w.label)}</li>`).join('')}
              </ul>
            </div>
          </section>
          ${j.notes ? `<section class="card"><div class="card-head"><h2>Notes</h2></div><div class="card-pad notes">${esc(j.notes)}</div></section>` : ''}
        </div>
        <div class="stack">
          <section class="card card-pad">
            <h3 style="margin-bottom:10px">Status</h3>
            <div class="status-select no-print">
              <select id="quick-status" aria-label="Change status">
                ${STATUSES.map((s) => `<option value="${s.id}" ${j.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
              </select>
            </div>
            <div style="margin-top:8px">${pill(j.status)}</div>
          </section>
          <section class="card card-pad">
            <dl class="dl" style="grid-template-columns:1fr">
              ${field('Embalmer / technician', j.embalmer)}
              ${field('Funeral director', j.funeralDirector)}
              ${field('Received', fmtDateTime(j.receivedAt))}
              ${field('Completed', j.completedAt && fmtDateTime(j.completedAt))}
              ${field('Last updated', fmtDateTime(j.updatedAt))}
            </dl>
          </section>
          <button class="btn btn-danger no-print" id="delete-job" style="width:100%">${ICON.trash}Delete job</button>
        </div>
      </div>
    `);
    $('#quick-status').addEventListener('change', (e) => {
      j.status = e.target.value;
      if ((j.status === 'completed' || j.status === 'released') && !j.completedAt) j.completedAt = new Date().toISOString();
      if (j.status === 'received' || j.status === 'in_progress') j.completedAt = '';
      j.updatedAt = new Date().toISOString();
      save();
      viewDetail(id);
      toast(`Status set to ${STATUS_LABEL[j.status]}`);
    });
    $('#delete-job').addEventListener('click', () => {
      if (!confirm(`Delete case ${j.caseNo} (${fullName(d)})? This cannot be undone.`)) return;
      state.jobs = state.jobs.filter((x) => x.id !== id);
      save();
      toast('Job deleted');
      location.hash = '#/jobs';
    });
  }

  /* ================= Job form ================= */
  function blankJob() {
    return {
      id: '', caseNo: nextCaseNo(), status: 'received',
      receivedAt: new Date().toISOString(), completedAt: '',
      embalmer: '', funeralDirector: '',
      decedent: { firstName: '', lastName: '', dob: '', dod: '', sex: '', weightKg: '', heightCm: '', causeOfDeath: '', placeOfDeath: '', nextOfKin: '', nokPhone: '', religion: '', condition: '' },
      embalming: { method: '', arterialSite: '', drainageSite: '' },
      chemicals: [],
      work: Object.fromEntries(WORK_ITEMS.map((w) => [w.id, false])),
      notes: '',
    };
  }

  function chemRow(c = {}) {
    return `<tr class="chem-row">
      <td><input name="product" list="catalog-list" value="${esc(c.product)}" placeholder="Product name" aria-label="Product"></td>
      <td><select name="type" aria-label="Type">${CHEM_TYPES.map((t) => `<option ${c.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
      <td><input name="index" type="number" min="0" step="1" value="${esc(c.index)}" placeholder="—" aria-label="Index"></td>
      <td><input name="volumeMl" type="number" min="0" step="1" value="${esc(c.volumeMl)}" placeholder="ml" aria-label="Volume in ml"></td>
      <td><button type="button" class="btn btn-icon btn-sm remove-chem" aria-label="Remove chemical">${ICON.trash}</button></td>
    </tr>`;
  }

  function viewForm(id) {
    const existing = id ? getJob(id) : null;
    if (id && !existing) return render('<div class="card empty">Job not found. <a href="#/jobs">Back to jobs</a></div>');
    const j = existing ? JSON.parse(JSON.stringify(existing)) : blankJob();
    const d = j.decedent;
    const embalmers = [...new Set(state.jobs.map((x) => x.embalmer).filter(Boolean))];
    const fds = [...new Set(state.jobs.map((x) => x.funeralDirector).filter(Boolean))];
    const inp = (name, label, val, attrs = '') => `<div><label for="${name}">${label}</label><input id="${name}" name="${name}" value="${esc(val)}" ${attrs}></div>`;

    render(`
      <div class="page-head">
        <div>
          <h1>${existing ? `Edit case ${esc(j.caseNo)}` : 'New job'}</h1>
          <p class="muted">${existing ? esc(fullName(d)) : 'Record a new case. Fields marked * are required.'}</p>
        </div>
      </div>
      <form id="job-form" novalidate>
        <datalist id="catalog-list">${state.catalog.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
        <datalist id="embalmer-list">${embalmers.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>
        <datalist id="fd-list">${fds.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>

        <section class="card form-section">
          <div class="card-head"><h2>Case</h2></div>
          <div class="card-pad grid g4">
            ${inp('caseNo', '<span class="req">Case number</span>', j.caseNo, 'required')}
            <div><label for="status">Status</label><select id="status" name="status">${STATUSES.map((s) => `<option value="${s.id}" ${j.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div>
            ${inp('receivedAt', '<span class="req">Received</span>', toLocalInput(j.receivedAt), 'type="datetime-local" required')}
            ${inp('completedAt', 'Completed', toLocalInput(j.completedAt), 'type="datetime-local"')}
            <div class="span-2">${inp('embalmer', 'Embalmer / technician', j.embalmer, 'list="embalmer-list" autocomplete="off"')}</div>
            <div class="span-2">${inp('funeralDirector', 'Funeral director', j.funeralDirector, 'list="fd-list" autocomplete="off"')}</div>
          </div>
        </section>

        <section class="card form-section">
          <div class="card-head"><h2>Decedent details</h2></div>
          <div class="card-pad grid g4">
            <div class="span-2">${inp('d.firstName', '<span class="req">First name(s)</span>', d.firstName, 'required autocomplete="off"')}</div>
            <div class="span-2">${inp('d.lastName', '<span class="req">Surname</span>', d.lastName, 'required autocomplete="off"')}</div>
            ${inp('d.dob', 'Date of birth', d.dob, 'type="date"')}
            ${inp('d.dod', 'Date of death', d.dod, 'type="date"')}
            <div><label for="d.sex">Sex</label><select id="d.sex" name="d.sex">${['', 'Female', 'Male', 'Other / not stated'].map((s) => `<option value="${s}" ${d.sex === s ? 'selected' : ''}>${s || '—'}</option>`).join('')}</select></div>
            <div><label>Age</label><input id="age-out" value="" readonly tabindex="-1" placeholder="From dates"></div>
            ${inp('d.heightCm', 'Height (cm)', d.heightCm, 'type="number" min="0"')}
            ${inp('d.weightKg', 'Weight (kg)', d.weightKg, 'type="number" min="0"')}
            <div class="span-2">${inp('d.causeOfDeath', 'Cause of death', d.causeOfDeath)}</div>
            <div class="span-2">${inp('d.placeOfDeath', 'Place of death', d.placeOfDeath)}</div>
            ${inp('d.nextOfKin', 'Next of kin', d.nextOfKin)}
            ${inp('d.nokPhone', 'NOK phone', d.nokPhone, 'type="tel"')}
            <div class="span-all">${inp('d.religion', 'Religious / cultural requirements', d.religion)}</div>
            <div class="span-all"><label for="d.condition">Condition on arrival</label><textarea id="d.condition" name="d.condition" placeholder="Discolouration, oedema, trauma, medical devices, etc.">${esc(d.condition)}</textarea></div>
          </div>
        </section>

        <section class="card form-section">
          <div class="card-head"><h2>Chemicals</h2><span class="muted num" id="chem-total"></span></div>
          <div class="table-wrap">
            <table class="chem-table">
              <thead><tr><th>Product</th><th style="width:160px">Type</th><th style="width:90px">Index</th><th style="width:120px">Volume (ml)</th><th></th></tr></thead>
              <tbody id="chem-rows">${j.chemicals.map(chemRow).join('')}</tbody>
            </table>
          </div>
          <div class="chem-foot">
            <button type="button" class="btn btn-sm" id="add-chem">${ICON.plus}Add chemical</button>
            <span class="hint">Pick from your <a href="#/chemicals">chemical list</a> to fill type and index automatically.</span>
          </div>
          <div class="card-pad grid g3" style="border-top:1px solid var(--line)">
            ${inp('e.method', 'Injection method', j.embalming.method, 'list="method-list"')}
            ${inp('e.arterialSite', 'Arterial injection site', j.embalming.arterialSite, 'list="artery-list"')}
            ${inp('e.drainageSite', 'Drainage site', j.embalming.drainageSite, 'list="vein-list"')}
            <datalist id="method-list"><option value="Single-point"><option value="Split injection"><option value="Restricted cervical"><option value="Six-point"></datalist>
            <datalist id="artery-list"><option value="Right common carotid"><option value="Left common carotid"><option value="Right femoral"><option value="Left femoral"><option value="Axillary"></datalist>
            <datalist id="vein-list"><option value="Right internal jugular"><option value="Left internal jugular"><option value="Right femoral"><option value="Left femoral"></datalist>
          </div>
        </section>

        <section class="card form-section">
          <div class="card-head"><h2>Work completed</h2><button type="button" class="btn btn-sm" id="check-all">Mark all</button></div>
          <div class="card-pad checks">
            ${WORK_ITEMS.map((w) => `<label class="check"><input type="checkbox" name="w.${w.id}" ${j.work[w.id] ? 'checked' : ''}>${esc(w.label)}</label>`).join('')}
          </div>
          <div class="card-pad" style="border-top:1px solid var(--line)">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" rows="4" placeholder="Additional work, observations, family requests…">${esc(j.notes)}</textarea>
          </div>
        </section>

        <div class="form-actions">
          <a class="btn" href="${existing ? `#/jobs/${esc(j.id)}` : '#/jobs'}">Cancel</a>
          <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Create job'}</button>
        </div>
      </form>
    `);

    const form = $('#job-form');
    const rows = $('#chem-rows');
    const updateAge = () => {
      const a = ageOf(form['d.dob'].value, form['d.dod'].value);
      $('#age-out').value = a != null ? `${a} years` : '';
    };
    const updateTotal = () => {
      const t = $$('input[name="volumeMl"]', rows).reduce((s, i) => s + (Number(i.value) || 0), 0);
      $('#chem-total').textContent = t ? `${fmtNum(t / 1000, 2)} L total` : '';
    };
    updateAge(); updateTotal();
    form['d.dob'].addEventListener('change', updateAge);
    form['d.dod'].addEventListener('change', updateAge);

    $('#add-chem').addEventListener('click', () => {
      rows.insertAdjacentHTML('beforeend', chemRow({ type: 'Arterial' }));
      $$('input[name="product"]', rows).pop().focus();
    });
    rows.addEventListener('click', (e) => {
      const b = e.target.closest('.remove-chem');
      if (b) { b.closest('tr').remove(); updateTotal(); }
    });
    rows.addEventListener('input', (e) => {
      if (e.target.name === 'volumeMl') updateTotal();
      if (e.target.name === 'product') {
        const cat = state.catalog.find((c) => c.name === e.target.value);
        if (cat) {
          const tr = e.target.closest('tr');
          tr.querySelector('[name="type"]').value = cat.type;
          tr.querySelector('[name="index"]').value = cat.index ?? '';
          tr.querySelector('[name="volumeMl"]').focus();
        }
      }
    });
    $('#check-all').addEventListener('click', () => {
      const boxes = $$('.checks input', form);
      const all = boxes.every((b) => b.checked);
      boxes.forEach((b) => { b.checked = !all; });
    });
    form.status.addEventListener('change', () => {
      if (['completed', 'released'].includes(form.status.value) && !form.completedAt.value) form.completedAt.value = toLocalInput(new Date().toISOString());
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const missing = $$('[required]', form).filter((i) => !i.value.trim());
      if (missing.length) {
        missing[0].focus();
        missing.forEach((i) => i.setAttribute('aria-invalid', 'true'));
        toast('Please fill in the required fields');
        return;
      }
      const v = (n) => form[n].value.trim();
      const out = existing || { id: uid(), createdAt: new Date().toISOString() };
      Object.assign(out, {
        caseNo: v('caseNo'),
        status: v('status'),
        receivedAt: fromLocalInput(v('receivedAt')),
        completedAt: fromLocalInput(v('completedAt')),
        embalmer: v('embalmer'),
        funeralDirector: v('funeralDirector'),
        decedent: {
          firstName: v('d.firstName'), lastName: v('d.lastName'), dob: v('d.dob'), dod: v('d.dod'), sex: v('d.sex'),
          heightCm: v('d.heightCm'), weightKg: v('d.weightKg'), causeOfDeath: v('d.causeOfDeath'), placeOfDeath: v('d.placeOfDeath'),
          nextOfKin: v('d.nextOfKin'), nokPhone: v('d.nokPhone'), religion: v('d.religion'), condition: v('d.condition'),
        },
        embalming: { method: v('e.method'), arterialSite: v('e.arterialSite'), drainageSite: v('e.drainageSite') },
        chemicals: $$('tr.chem-row', rows).map((tr) => ({
          product: tr.querySelector('[name="product"]').value.trim(),
          type: tr.querySelector('[name="type"]').value,
          index: tr.querySelector('[name="index"]').value,
          volumeMl: Number(tr.querySelector('[name="volumeMl"]').value) || 0,
        })).filter((c) => c.product || c.volumeMl),
        work: Object.fromEntries(WORK_ITEMS.map((w) => [w.id, form[`w.${w.id}`].checked])),
        notes: form.notes.value.trim(),
        updatedAt: new Date().toISOString(),
      });
      if (!existing) state.jobs.push(out);
      save();
      toast(existing ? 'Changes saved' : 'Job created');
      location.hash = `#/jobs/${out.id}`;
    });
    form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));
  }

  /* ================= Chemicals catalog ================= */
  function viewChemicals() {
    const usage = {};
    state.jobs.forEach((j) => j.chemicals.forEach((c) => {
      const u = (usage[c.product] = usage[c.product] || { ml: 0, jobs: 0 });
      u.ml += Number(c.volumeMl) || 0; u.jobs++;
    }));
    render(`
      <div class="page-head">
        <div><h1>Chemicals</h1><p class="muted">Products you use. These appear as suggestions when recording a job.</p></div>
      </div>
      <section class="card form-section">
        <div class="card-head"><h2>Add product</h2></div>
        <form id="chem-form" class="card-pad grid g4" style="align-items:end">
          <div class="span-2"><label for="cn" class="req">Product name</label><input id="cn" name="name" required></div>
          <div><label for="ct">Type</label><select id="ct" name="type">${CHEM_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end">
            <div style="flex:1"><label for="ci">Index</label><input id="ci" name="index" type="number" min="0"></div>
            <button class="btn btn-primary" type="submit">${ICON.plus}Add</button>
          </div>
        </form>
      </section>
      <section class="card">
        <div class="table-wrap"><table>
          <thead><tr><th>Product</th><th>Type</th><th>Index</th><th class="hide-sm" style="text-align:right">Used on</th><th class="hide-sm" style="text-align:right">Total used</th><th></th></tr></thead>
          <tbody>
            ${state.catalog.length ? state.catalog.map((c) => `<tr>
              <td>${esc(c.name)}</td><td>${esc(c.type)}</td><td class="num">${esc(c.index ?? '—')}</td>
              <td class="hide-sm num" style="text-align:right">${usage[c.name]?.jobs || 0} jobs</td>
              <td class="hide-sm num" style="text-align:right">${fmtNum((usage[c.name]?.ml || 0) / 1000, 2)} L</td>
              <td style="width:40px"><button class="btn btn-icon btn-sm" data-del="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">${ICON.trash}</button></td>
            </tr>`).join('') : '<tr><td colspan="6" class="empty">No products yet.</td></tr>'}
          </tbody>
        </table></div>
      </section>
    `);
    $('#chem-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const name = f.name.value.trim();
      if (!name) { f.name.focus(); return; }
      state.catalog = [...state.catalog, { id: uid(), name, type: f.type.value, index: f.index.value ? Number(f.index.value) : null }];
      save(); toast('Product added'); viewChemicals();
    });
    app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      state.catalog = state.catalog.filter((c) => c.id !== b.dataset.del);
      save(); viewChemicals();
    }));
  }

  /* ================= Data / settings ================= */
  function viewSettings() {
    render(`
      <div class="page-head"><div><h1>Data</h1><p class="muted">Records are stored only in this browser on this device.</p></div></div>
      <div class="stack" style="max-width:720px">
        <section class="card card-pad">
          <h2>Back up &amp; restore</h2>
          <p class="muted" style="margin:6px 0 14px">Download a backup regularly. Clearing browser data will erase records that haven't been backed up.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" id="backup">Download backup (JSON)</button>
            <label class="btn" style="margin:0">Restore from backup<input type="file" id="restore" accept="application/json,.json" hidden></label>
            <button class="btn" id="csv-all">Export all jobs (CSV)</button>
          </div>
        </section>
        <section class="card card-pad">
          <h2>${state.demo ? 'Demo data' : 'Reset'}</h2>
          <p class="muted" style="margin:6px 0 14px">${state.demo ? 'The app started with fictional sample cases so you can see the dashboard. Clearing removes only those sample cases — anything you have recorded stays.' : 'Permanently delete every job in this browser.'}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-danger" id="clear">${state.demo ? 'Clear demo data' : 'Delete all jobs'}</button>
            ${state.demo ? '' : '<button class="btn" id="load-demo">Load demo data</button>'}
          </div>
        </section>
      </div>
    `);
    $('#backup').addEventListener('click', () => {
      download(`caselog-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2), 'application/json');
    });
    $('#csv-all').addEventListener('click', () => exportCsv(state.jobs));
    $('#restore').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.jobs)) throw new Error('bad');
        if (!confirm(`Replace current records with ${data.jobs.length} jobs from this backup?`)) return;
        state = { jobs: data.jobs, catalog: Array.isArray(data.catalog) ? data.catalog : DEFAULT_CATALOG.slice(), demo: false };
        save(); toast('Backup restored'); viewSettings();
      } catch (err) { toast('That file is not a valid backup'); }
    });
    $('#clear').addEventListener('click', () => {
      if (state.demo) {
        state = { jobs: state.jobs.filter((j) => !j.demo), catalog: state.catalog, demo: false };
        save(); toast('Demo data cleared'); viewSettings();
        return;
      }
      if (!confirm('Delete ALL jobs? Download a backup first if you need one.')) return;
      state = { jobs: [], catalog: state.catalog, demo: false };
      save(); toast('All jobs cleared'); viewSettings();
    });
    $('#load-demo')?.addEventListener('click', () => {
      if (state.jobs.length && !confirm('This will replace your current jobs with demo data.')) return;
      state = { jobs: demoJobs(), catalog: state.catalog, demo: true };
      save(); toast('Demo data loaded'); viewSettings();
    });
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportCsv(list) {
    const cols = [
      ['Case', (j) => j.caseNo], ['Status', (j) => STATUS_LABEL[j.status]], ['Received', (j) => j.receivedAt], ['Completed', (j) => j.completedAt],
      ['First name', (j) => j.decedent.firstName], ['Surname', (j) => j.decedent.lastName], ['DOB', (j) => j.decedent.dob], ['DOD', (j) => j.decedent.dod],
      ['Sex', (j) => j.decedent.sex], ['Cause of death', (j) => j.decedent.causeOfDeath], ['Embalmer', (j) => j.embalmer], ['Funeral director', (j) => j.funeralDirector],
      ['Chemicals', (j) => j.chemicals.map((c) => `${c.product} ${c.volumeMl}ml`).join('; ')], ['Total ml', (j) => totalMl(j)],
      ['Work completed', (j) => WORK_ITEMS.filter((w) => j.work[w.id]).map((w) => WORK_LABEL[w.id]).join('; ')], ['Notes', (j) => j.notes],
    ];
    const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.map((c) => c[0]).join(','), ...list.map((j) => cols.map((c) => cell(c[1](j))).join(','))].join('\n');
    download(`caselog-jobs-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
  }

  /* ================= Global events ================= */
  app.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a, button')) location.hash = tr.dataset.href;
  });

  if (state.demo) save();
  route();
})();
