(() => {
  'use strict';

  const ICON = {
    grade: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 12 12 21 3 12z"/><path d="M12 8v5M12 16v.01"/></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v9M12 18v.01"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="m7.5 12.3 3 3 6-6" stroke="#fff"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7h12v9H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    task: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 3h6v3H9zM8.5 11h7M8.5 14.5h7M8.5 18h4"/></svg>',
    event: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>',
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- Grades & alerts ---------------- */
  const alerts = [
    { type: 'grade', severe: true,  farm: '31232 Farm name', value: '-0.512', unit: '°C', cause: 'Freezing point', pickup: '14 Apr' },
    { type: 'alert',               farm: '31232 Farm name', value: '500',    unit: '',   cause: 'Thermoduric',    pickup: '14 Apr' },
    { type: 'grade',               farm: '31232 Farm name', value: '-0.412', unit: '°C', cause: 'Thermoduric',    pickup: '14 Apr' },
    { type: 'grade', severe: true,  farm: '31232 Farm name', value: '-0.412', unit: '°C', cause: 'Thermoduric',    pickup: '14 Apr' },
    { type: 'alert',               farm: '31232 Farm name', value: '1200',   unit: '',   cause: 'Milk cooling system', pickup: '14 Apr' },
  ];

  const alertsBody = document.getElementById('alerts-body');
  alertsBody.innerHTML = alerts.map((a) => {
    const cls = a.type === 'grade' && a.severe ? 'is-severe' : a.type === 'grade' ? 'is-grade' : 'is-alert';
    const icon = a.severe ? ICON.grade : ICON.alert;
    const label = a.type === 'grade' ? 'Grade' : 'Alert';
    return `<tr class="${cls}">
      <td><span class="status">${icon}${label}</span></td>
      <td>${esc(a.farm)}</td>
      <td><b>${esc(a.value)}</b>${a.unit ? ` <span class="unit">${a.unit}</span>` : ''} <a href="#" class="link">${esc(a.cause)}</a></td>
      <td class="r">${esc(a.pickup)}</td>
    </tr>`;
  }).join('');

  document.getElementById('clear-alerts').addEventListener('click', () => {
    alertsBody.innerHTML = '';
    document.querySelector('.alerts .table-wrap').hidden = true;
    document.getElementById('alerts-empty').hidden = false;
  });

  /* ---------------- Farms ---------------- */
  const detail = {
    rows: [
      ['10 May', 2312, 2195, 312, 'Excellence'],
      ['9 May', 2134, 3211, 323, 'Excellence'],
      ['7 May', 2421, 3721, 234, 'Excellence'],
    ],
    stats: [
      { label: 'Season to date', unit: 'kgMS', value: '70,304', delta: '2.8%', dir: 'up' },
      { label: 'Month to date', unit: 'kgMS', value: '2,420', delta: '1.8%', dir: 'down' },
      { label: 'SCC', unit: 'Avg', value: '131', delta: '2.1%', dir: 'down' },
      { label: 'Milk solids', unit: 'kgMS', value: '2,420', delta: '2.8%', dir: 'down' },
    ],
    tracking: [
      { title: 'Production per kg of liveweight', now: '87.1', avg: '96.42', unit: '%kgMS/kgLWT', delta: '7%', dir: 'up' },
      { title: 'Homegrown feed per hectare', now: '11.2', avg: '9.35', unit: 'tDM/ha', delta: '11%', dir: 'down' },
      { title: 'On-farm activity emissions', now: '734', avg: '812', unit: 'kgCO2/tFPCM', delta: '7%', dir: 'up' },
    ],
  };

  const farms = [
    { name: '90210 Owl Farm', status: 'ok', label: 'Grade free month', tanker: '9.20am 23 May', open: true },
    { name: '90210 Owl Farm', status: 'ok', label: 'Grade free', tanker: '9.20am 23 May', bold: true },
    { name: '90210 Owl Farm', status: 'grade', label: 'Grade', tanker: '9.20am 23 May', bold: true },
    { name: '90210 Owl Farm', status: 'inactive', label: 'This farm is not currently supplying', bold: true },
  ];

  const delta = (d, dir) => `<span class="delta ${dir}">${dir === 'up' ? ICON.up : ICON.down}${d}</span>`;

  const farmBody = () => `
    <div class="table-wrap">
      <table class="tbl farm-tbl">
        <thead><tr><th>Date</th><th>Litres</th><th>kgMS</th><th>SCC</th><th>Quality</th></tr></thead>
        <tbody>${detail.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="stats">
      ${detail.stats.map((s) => `
        <div class="stat">
          <div class="stat-label">${s.label} <small>${s.unit}</small></div>
          <div class="stat-value">${s.value} ${delta(s.delta, s.dir)}</div>
        </div>`).join('')}
    </div>
    <div class="tracking">
      <h4>Tracking</h4>
      <div class="tracking-grid">
        ${detail.tracking.map((t) => `
          <div class="track">
            <div class="track-title">${t.title}</div>
            <div class="track-sub"><span>This year</span><span>3 season average</span></div>
            <div class="track-vals">
              <span class="big">${t.now}</span>
              <span class="avg"><b>${t.avg}</b><small>${t.unit}</small></span>
              ${delta(t.delta, t.dir)}
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="coop">
      <h4>The Co-operative Difference <span>Due: 31 May 2026</span></h4>
      <div class="coop-grid">
        <div><div class="coop-label"><b>Te Putake</b> On farm excellence</div><div>86%</div></div>
        <div><div class="coop-label"><b>Te Puku</b> Days quality excellence</div><div>7 days</div></div>
        <div><div class="coop-label"><b>Te Tahi</b> Milk quality excellence</div><div><span class="counter"><span>0</span><span>7</span></span> Actions</div></div>
      </div>
    </div>`;

  const farmsEl = document.getElementById('farms');
  farmsEl.innerHTML = farms.map((f, i) => {
    const statusIcon = f.status === 'ok' ? ICON.check : ICON.grade;
    const id = `farm-${i}`;
    return `
    <article class="farm farm-${f.status}${f.open ? ' open' : ''}${f.bold ? ' bold' : ''}">
      <header class="farm-head">
        <h3>${esc(f.name)}</h3>
        <span class="farm-status">${statusIcon}${esc(f.label)}</span>
        ${f.tanker ? `<span class="tanker">${ICON.truck}<b>Tanker due:</b> ${esc(f.tanker)}</span>` : '<span class="tanker"></span>'}
        <button class="toggle" aria-expanded="${!!f.open}" aria-controls="${id}" aria-label="Toggle ${esc(f.name)} details">${ICON.chevron}</button>
      </header>
      <div class="farm-body" id="${id}"${f.open ? '' : ' hidden'}>${f.status === 'inactive' ? '<p class="empty">No production data for this farm.</p>' : farmBody()}</div>
    </article>`;
  }).join('');

  farmsEl.addEventListener('click', (e) => {
    const head = e.target.closest('.farm-head');
    if (!head || e.target.closest('a')) return;
    const farm = head.parentElement;
    const btn = head.querySelector('.toggle');
    const body = farm.querySelector('.farm-body');
    const open = !farm.classList.contains('open');
    farm.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    body.hidden = !open;
  });

  /* ---------------- Share price sparkline ---------------- */
  const pts = [22, 24, 21, 30, 52, 44, 50, 46, 58, 62, 78, 82, 70, 58, 50, 54, 40, 36, 42, 30, 28, 34, 22, 26, 18, 22, 16, 20, 12, 16, 10, 14, 18, 16, 22, 26, 28, 30, 54, 50, 34, 30, 40];
  const spark = document.getElementById('spark');
  const W = 360, H = 120, pad = 6, max = 90;
  const xy = pts.map((v, i) => [pad + (i * (W - pad * 2)) / (pts.length - 1), H - pad - (v / max) * (H - pad * 2)]);
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  spark.innerHTML = `
    <defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--green-500)" stop-opacity=".55"/>
      <stop offset="1" stop-color="var(--green-500)" stop-opacity=".04"/>
    </linearGradient></defs>
    <path d="${line} L${W - pad},${H} L${pad},${H} Z" fill="url(#sparkFill)" stroke="none"/>
    <path d="${line}" fill="none" stroke="var(--green-600)" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;

  /* ---------------- Timeline ---------------- */
  const hygiene = (m) => ({ kind: 'task', title: 'Hygiene check due', body: `Please complete for the end of ${m}. Upload evidence though the assessment checklist`, date: '24 May 2026', cta: 'Start here' });
  const fdr = (m) => ({ kind: 'task', title: 'Monthly FDR numbers', body: `Please complete for the end of ${m}`, date: '24 May 2026', cta: 'Start here' });

  const timeline = [
    { month: 'March', items: [hygiene('March'), fdr('March')] },
    { month: 'April', items: [
      { kind: 'event', title: 'Benchmarking for Better Farming - Farmers session', body: 'Monday 15 April 6:00 PM, in store, Ashburton Farm Source and online.', date: '15 April 2026', cta: 'RSVP now' },
      hygiene('April'), fdr('March'),
    ] },
    { month: 'May', items: [
      { kind: 'task', title: 'Farm Dairy Records are open', body: 'Farm Dairy records are open for you complete and submit. Open from 1st May to 30th June.', date: '24 May 2026', cta: 'Start here' },
      { kind: 'event', rsvpd: true, title: 'Managing Milk Price Risk Workshop', body: 'Monday 15 May 6:00 PM<br>Farm Source store and online<br>165 Street Rd, Suburb, Ashburton', date: '15 May 2026', cta: "RSVP 'd" },
      { kind: 'event', title: 'Christchurch Interim Results Farmer Roadshow Meeting', body: 'Tuesday 24 May, 8.00am<br>Riccarton Park Events Centre<br>165 Racecourse Rd, Broomfield, Christchurch', date: '24 May 2026', cta: 'RSVP now' },
      hygiene('May'), fdr('March'),
    ] },
    { month: 'June', items: [
      { kind: 'task', title: 'Terms of supply', body: 'Requirements released', date: '31 Feb 2026' },
      hygiene('June'), fdr('June.'),
    ] },
  ];

  document.getElementById('timeline').innerHTML = timeline.map((g) => `
    <section class="tl-month">
      <h3>${g.month}</h3>
      <ul class="tl-list">
        ${g.items.map((it) => `
          <li class="tl-item${it.rsvpd ? ' rsvpd' : ''}">
            <div class="tl-title">${it.kind === 'event' ? ICON.event : ICON.task}<span>${esc(it.title)}</span></div>
            <p>${it.body.replace(/\.$/, '.')}</p>
            <div class="tl-foot">
              <span>${it.date}</span>
              ${it.cta ? `<a href="#" class="tl-cta">${esc(it.cta)}${ICON.right}</a>` : ''}
            </div>
          </li>`).join('')}
      </ul>
    </section>`).join('');
})();
