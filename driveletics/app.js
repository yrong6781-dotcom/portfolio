/* Driveletics · driver coach H5 prototype */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const phone = $('#phone');
  const RING = 314.16;

  const state = {
    screen: 'uber',
    page: 'home',
    score: 84,
    simTimer: null,
    snoozed: false,
    online: false,
    moving: true,
    todayPts: 73,
    totalPts: 888,
    daily: 65,
    rec: { active: false, paused: false, total: 0, left: 0, zone: 'sus', timer: null, name: 'Recovery 2' },
    schedule: [
      { t: 'drive', name: 'Drive Session 1', time: '8:00 AM-8:52 AM', min: 52, st: 'done' },
      { t: 'rec', name: 'Recovery 1', time: '8:52 AM-9:04 AM', min: 12, st: 'done' },
      { t: 'drive', name: 'Drive Session 2', time: '9:04 AM-9:52 AM', min: 48, st: 'now', prog: 32 },
      { t: 'rec', name: 'Recovery 2', time: '9:52 AM-10:07 AM', min: 15, st: 'todo' },
      { t: 'drive', name: 'Drive Session 3', time: '10:07 AM-10:52 AM', min: 45, st: 'todo' },
      { t: 'rec', name: 'Recovery 3', time: '10:52 AM-11:10 AM', min: 18, st: 'todo' },
    ],
  };

  const zoneOf = (s) => (s > 65 ? 'opt' : s > 45 ? 'sus' : 'risk');
  const ZONE = {
    opt: { state: 'Optimal Performance', badge: 'HIGH', msg: 'Your status is good, continue accepting rides', label: 'Optimal', rw: 'Optimal<br />Zone' },
    sus: { state: 'Sustainable', badge: 'MID', msg: 'Stamina is dropping — keep a steady pace', label: 'Sustainable', rw: 'Sustainable<br />Zone' },
    risk: { state: 'Fatigue Risk', badge: 'LOW', msg: 'New requests paused — take a 20-min break', label: 'Fatigue Risk', rw: 'Fatigue Risk<br />Zone' },
  };

  /* ---------- helpers ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function fit() {
    const small = window.innerWidth <= 520;
    if (small) {
      const m = Math.min(window.innerWidth / 393, window.innerHeight / 852);
      phone.style.setProperty('--m', m);
      document.documentElement.style.setProperty('--s', 1);
    } else {
      const s = Math.min(1, (window.innerHeight - 48) / 852);
      document.documentElement.style.setProperty('--s', s);
    }
  }
  window.addEventListener('resize', fit);
  fit();

  /* ---------- navigation ---------- */
  function go(screen) {
    state.screen = screen;
    $$('.screen').forEach((el) => el.classList.toggle('is-active', el.dataset.screen === screen));
    phone.classList.toggle('dark-bar', screen === 'splash');
  }

  function openPage(page) {
    state.page = page;
    $$('.tab-page').forEach((el) => el.classList.toggle('is-active', el.dataset.page === page));
    const tab = page === 'schedule' ? 'plan' : page;
    $$('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const back = $('.back');
    back.dataset.action = page === 'schedule' ? 'back-plan' : 'back-uber';
    back.querySelector('span').textContent = page === 'schedule' ? 'Driving Plan' : 'Back to Uber';
    $('#appScroll').scrollTop = 0;
  }

  $('#coachEntry').addEventListener('click', () => {
    go('splash');
    const bar = $('#spBar');
    const chip = $('#spChip');
    bar.style.transition = 'none';
    bar.style.width = '0';
    chip.textContent = 'Calibrating fatigue monitor…';
    requestAnimationFrame(() => {
      bar.style.transition = 'width 1.9s cubic-bezier(.4,0,.2,1)';
      bar.style.width = '100%';
    });
    setTimeout(() => (chip.textContent = 'DMS + CAN connected'), 1100);
    setTimeout(() => go('app'), 2100);
  });

  $('#goBtn').addEventListener('click', () => {
    state.online = !state.online;
    $('#goBtn').classList.toggle('online', state.online);
    renderUber();
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'back-uber') go('uber');
    if (act === 'back-plan') openPage('plan');
    if (act === 'open-schedule') openPage('schedule');
  });

  $$('#tabbar button').forEach((b) => b.addEventListener('click', () => openPage(b.dataset.tab)));

  /* ---------- rendering ---------- */
  function renderScore() {
    const s = Math.round(state.score);
    const z = zoneOf(s);
    const Z = ZONE[z];
    phone.dataset.zone = z;
    $('#staminaCard').dataset.zone = z;
    $('#stScore').textContent = s;
    $('#stState').textContent = Z.state;
    $('#stBadge').textContent = Z.badge;
    $('#stMsgText').textContent = Z.msg;
    $('#stRing').style.strokeDashoffset = RING * (1 - s / 100);
    $('#bPerclos').textContent = `${Math.round(6 + (84 - s) * 0.35)}%`;
    const seg = state.schedule.find((x) => x.t === 'drive' && x.st === 'now');
    $('#bDrive').textContent = seg ? `${seg.prog || 0} min` : '0 min';
    $('#stDispatch').textContent = state.rec.active ? 'Paused · resting' : z === 'risk' ? 'Paused by Coach' : z === 'sus' ? 'Short trips only' : 'Active';
    $('#bCan').textContent = `${z === 'risk' ? 3 : z === 'sus' ? 1 : 0} 次`;

    const nw = $('#nextWin');
    nw.dataset.zone = state.rec.active ? 'opt' : z;
    const snooze = $('#snoozeBtn');
    if (state.rec.active) {
      $('#nwText').textContent = `${state.rec.name} in progress · ${mmss(state.rec.left)}`;
      snooze.textContent = 'Open';
      snooze.disabled = false;
    } else if (z === 'opt') {
      $('#nwText').textContent = state.snoozed ? 'Snoozed · in 25m' : 'Scheduled in 15m';
      snooze.textContent = 'Snooze';
      snooze.disabled = state.snoozed;
    } else {
      $('#nwText').textContent = z === 'sus' ? 'Recommended · 15 min' : 'Required · 20 min';
      snooze.textContent = state.moving ? 'When parked' : 'Start';
      snooze.disabled = state.moving;
    }

    const cur = state.schedule[2];
    if (cur.st === 'now' && state.simTimer) cur.prog = Math.max(cur.prog, Math.min(48, Math.round(32 + (84 - Math.min(84, s)) / 3)));
    renderPlan();

    $('#demoScore').textContent = s;
    const dz = $('#demoZone');
    dz.textContent = Z.label;
    dz.className = `z-${z}`;

    renderPark();
    renderUber();
    const coach = $('#coachEntry');
    coach.style.filter = z === 'opt' ? '' : z === 'sus' ? 'drop-shadow(0 0 10px #f5a524)' : 'drop-shadow(0 0 12px #e5484d)';
  }

  function renderPlan() {
    const it = state.schedule.find((x) => x.st === 'now') || state.schedule.find((x) => x.st === 'todo');
    const card = $('.current');
    if (!it) { card.hidden = true; return; }
    card.hidden = false;
    const prog = it.st === 'now' ? it.prog || 0 : 0;
    $('.cur-play').src = it.t === 'drive' ? 'assets/play-green.svg' : 'assets/cup.svg';
    $('.cur-head strong').textContent = it.name;
    $('.cur-head span').textContent = it.time;
    $('.cur-min b').textContent = it.min;
    $('#curBar').style.width = `${(prog / it.min) * 100}%`;
    $('#curProg').textContent =
      it.st === 'now' ? `${it.t === 'rec' ? 'Resting' : 'In progress'} ${prog}/${it.min} min` : 'Up next';
    const done = state.schedule.filter((x) => x.st === 'done').slice(-2);
    $$('.current + .duo .mini').forEach((el, i) => {
      const d = done[i];
      el.style.visibility = d ? '' : 'hidden';
      if (!d) return;
      el.querySelector('p').textContent = d.name.toUpperCase();
      el.querySelector('strong').textContent = `${d.min} mins`;
      el.querySelector('span').textContent = d.time;
    });
    const rows = $$('#strategyList li');
    const idx = state.schedule[3].st === 'now' ? 2 : state.schedule[2].st === 'now' ? (state.schedule[2].prog < 34 ? 0 : 1) : -1;
    rows.forEach((li, i) => li.classList.toggle('on', i === idx));
  }

  function renderSchedule() {
    const icon = (t) =>
      t === 'drive'
        ? '<span class="ic"><img src="assets/play-purple.svg" alt="" /></span>'
        : '<span class="ic"><img src="assets/cup-bg.svg" alt="" /><img src="assets/cup.svg" alt="" /></span>';
    $('#schedList').innerHTML = state.schedule
      .map((it) => {
        const st =
          it.st === 'done'
            ? '<p class="st"><img src="assets/status-done.svg" alt="" />Completed</p>'
            : it.st === 'todo'
            ? '<p class="st"><img src="assets/status-todo.svg" alt="" />Upcoming</p>'
            : '';
        const now =
          it.st === 'now'
            ? `<div class="bar"><i style="width:${((it.prog || 0) / it.min) * 100}%"></i></div><p class="prog">${
                it.t === 'rec' ? 'Resting' : 'In progress'
              } ${it.prog || 0}/${it.min} min</p>`
            : '';
        return `<div class="sitem ${it.st}">${icon(it.t)}<strong>${it.name}</strong><span>${it.time}</span><p class="min"><b>${it.min}</b><i>min</i></p>${st}${now}</div>`;
      })
      .join('');
  }

  function renderPoints() {
    $('#ptsToday').textContent = state.todayPts;
    $('#ptsRing').style.strokeDashoffset = RING * (1 - Math.min(100, state.todayPts) / 100);
    $('#ptsTotal').textContent = state.totalPts;
    $('#dailyBar').style.width = `${Math.min(100, state.daily)}%`;
    $('#dailyCap').textContent = `${Math.min(100, state.daily)} / 100 points`;
  }

  function renderChart() {
    const vals = [90, 91, 92, 93, 94, 96, 94];
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const W = 322, x0 = 8, step = (W - 16) / 6;
    const y = (v) => 18 + (98 - v) * 4.2;
    const pts = vals.map((v, i) => [x0 + i * step, y(v)]);
    const line = pts.map((p) => p.join(',')).join(' ');
    const area = `M${pts[0][0]},137 L${pts.map((p) => p.join(',')).join(' L')} L${pts[6][0]},137 Z`;
    const col = (v) => (v > 65 ? '#4ad2b4' : v > 45 ? '#f5a524' : '#e5484d');
    $('#chart').innerHTML = `
      <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4ad2b4" stop-opacity=".45"/><stop offset="1" stop-color="#4ad2b4" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#ga)"/>
      <polyline points="${line}" fill="none" stroke="#4ad2b4" stroke-width="2"/>
      ${pts.map(([cx, cy], i) => `<circle cx="${cx}" cy="${cy}" r="4" fill="${col(vals[i])}" stroke="#fff" stroke-width="1.5"/><text x="${cx}" y="${cy - 9}">${vals[i]}</text>`).join('')}
      ${pts.map(([cx], i) => `<text class="day" x="${cx}" y="160">${days[i]}</text>`).join('')}`;
  }

  /* ---------- passive state: Uber home + parked card (no popups while driving) ---------- */
  function renderUber() {
    const z = zoneOf(state.score);
    const paused = state.rec.active || z === 'risk';
    $('#uberState').textContent = !state.online
      ? 'You’re offline'
      : paused ? 'You’re online · Requests paused by Coach'
      : z === 'sus' ? 'You’re online · Short trips only' : 'You’re online · Finding trips';
  }

  function renderPark() {
    const z = zoneOf(state.score);
    const card = $('#parkCard');
    const show = !state.moving && !state.rec.active && z !== 'opt';
    card.hidden = !show;
    if (!show) return;
    const risk = z === 'risk';
    $('#pcKicker').textContent = risk ? 'PARKED · FATIGUE RISK' : 'PARKED · SUSTAINABLE';
    $('#pcTitle').textContent = risk ? 'Good time for a 20-min rest' : 'Take your 15-min recovery here';
    $('#pcSub').textContent = risk ? 'Requests stay paused until you’ve rested.' : 'Short-trip mode stays on until then.';
  }
  $('#pcGo').addEventListener('click', () => {
    const z = zoneOf(state.score);
    startRecovery(z === 'risk' ? 20 : 15, z);
  });

  function setMoving(m) {
    state.moving = m;
    $$('[data-moving]').forEach((b) => b.classList.toggle('on', b.dataset.moving === (m ? '1' : '0')));
    if (!m) stopSim();
    renderScore();
  }
  $$('[data-moving]').forEach((b) => b.addEventListener('click', () => setMoving(b.dataset.moving === '1')));

  $('#stWhy').addEventListener('click', (e) => {
    const b = $('#stBasis');
    b.hidden = !b.hidden;
    e.currentTarget.setAttribute('aria-expanded', String(!b.hidden));
  });

  $('#snoozeBtn').addEventListener('click', () => {
    const z = zoneOf(state.score);
    if (state.rec.active) return openPage('recovery');
    if (z === 'opt') {
      state.snoozed = true;
      toast('Recovery window moved 10 min later');
      renderScore();
    } else startRecovery(z === 'sus' ? 15 : 20, z);
  });

  /* ---------- recovery ---------- */
  function renderRecovery() {
    const r = state.rec;
    const win = $('#recWin');
    win.classList.toggle('idle', !r.active);
    if (r.active) {
      $('#rwZone').innerHTML = ZONE[r.zone].rw;
      $('#rwTime').textContent = mmss(r.left);
      $('#rwBar').style.width = `${(1 - r.left / r.total) * 100}%`;
      $('#rwActive').textContent = r.paused ? 'PAUSED' : 'ACTIVE';
      $('#rwActive').classList.toggle('paused', r.paused);
      $('#rwToggle').textContent = r.paused ? 'Resume' : 'Pause';
      $('#rwEnd').textContent = 'Finish';
      $('#rwEnd').hidden = false;
      $('.rw-time span').textContent = 'MIN REMAINING';
    } else {
      const next = state.schedule.find((s) => s.t === 'rec' && s.st === 'todo');
      $('#rwZone').innerHTML = next ? `Next · ${next.name}` : 'All recoveries<br />done';
      $('#rwTime').textContent = next ? mmss(next.min * 60) : '0:00';
      $('#rwBar').style.width = '0%';
      $('#rwActive').textContent = 'SCHEDULED';
      $('#rwActive').classList.add('paused');
      $('#rwToggle').textContent = 'Start now';
      $('#rwEnd').hidden = true;
      $('.rw-time span').textContent = next ? next.time.split('-')[0] : '';
    }
  }

  function startRecovery(min, zone) {
    const r = state.rec;
    if (r.active) return openPage('recovery');
    const next = state.schedule.find((s) => s.t === 'rec' && s.st === 'todo');
    r.name = next ? next.name : 'Recovery';
    Object.assign(r, { active: true, paused: false, total: min * 60, left: min * 60, zone });
    if (next) { next.st = 'now'; next.prog = 0; next.min = min; }
    const cur = state.schedule.find((s) => s.t === 'drive' && s.st === 'now');
    if (cur) cur.st = 'done';
    setMoving(false);
    clearInterval(r.timer);
    r.timer = setInterval(tickRecovery, 1000);
    openPage('recovery');
    renderRecovery();
    renderSchedule();
    renderScore();
    toast(zone === 'risk' ? 'Rest started · new requests paused' : 'Recovery started · requests auto-paused');
  }

  function tickRecovery() {
    const r = state.rec;
    if (!r.active || r.paused) return;
    r.left = Math.max(0, r.left - 1);
    if (state.score < 80) state.score = Math.min(80, state.score + 0.6);
    const it = state.schedule.find((s) => s.st === 'now' && s.t === 'rec');
    if (it) it.prog = Math.floor((r.total - r.left) / 60);
    renderRecovery();
    renderScore();
    if (r.left === 0) finishRecovery();
  }

  function finishRecovery() {
    const r = state.rec;
    clearInterval(r.timer);
    r.active = false;
    const it = state.schedule.find((s) => s.st === 'now' && s.t === 'rec');
    if (it) it.st = 'done';
    const nextDrive = state.schedule.find((s) => s.t === 'drive' && s.st === 'todo');
    if (nextDrive) { nextDrive.st = 'now'; nextDrive.prog = 0; }
    state.score = Math.max(state.score, 78);
    state.todayPts += 15;
    state.totalPts += 15;
    state.daily += 15;
    state.snoozed = false;
    const li = document.createElement('li');
    li.className = 'new';
    li.innerHTML = `<b>${r.name} Completed</b><span>Just now</span><em>+15 pts</em>`;
    $('#rewardList').prepend(li);
    renderAll();
    toast(`${r.name} completed · +15 pts`);
  }

  $('#rwToggle').addEventListener('click', () => {
    const r = state.rec;
    if (!r.active) {
      const z = zoneOf(state.score);
      return startRecovery(z === 'risk' ? 20 : 15, z === 'opt' ? 'opt' : z);
    }
    r.paused = !r.paused;
    renderRecovery();
  });
  $('#rwEnd').addEventListener('click', finishRecovery);

  $$('.strat').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.strat').forEach((x) => x.classList.toggle('is-on', x === b));
    })
  );
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-stop]');
    if (s) toast(`Route to ${s.dataset.stop} sent to Uber navigation`);
  });
  $('#redeemBtn').addEventListener('click', () => toast('Redeem opens Uber Rewards (demo)'));

  /* ---------- demo simulation ---------- */
  function stopSim() {
    clearInterval(state.simTimer);
    state.simTimer = null;
    const b = $('#simPlay');
    b.textContent = '▶ 模拟连续驾驶';
    b.classList.remove('is-on');
  }
  function startSim() {
    if (state.rec.active) {
      toast('Recovery in progress — finish it first');
      return;
    }
    const b = $('#simPlay');
    b.textContent = '❚❚ 暂停模拟';
    b.classList.add('is-on');
    if (!state.online) $('#goBtn').click();
    if (!state.moving) setMoving(true);
    state.simTimer = setInterval(() => {
      state.score = Math.max(20, state.score - 1);
      renderScore();
      if (state.score <= 20) stopSim();
    }, 380);
  }
  $('#simPlay').addEventListener('click', () => (state.simTimer ? stopSim() : startSim()));
  $$('[data-jump]').forEach((b) =>
    b.addEventListener('click', () => {
      if (state.rec.active) finishRecovery();
      stopSim();
      state.score = Number(b.dataset.jump);
      if (state.screen !== 'app') go('app');
      openPage('home');
      renderScore();
      closeDemoSheet();
    })
  );
  $('#simReset').addEventListener('click', () => window.location.reload());

  const demo = $('#demo');
  const closeDemoSheet = () => {
    demo.classList.remove('open');
    $('#demoToggle').setAttribute('aria-expanded', 'false');
  };
  $('#demoToggle').addEventListener('click', () => {
    const open = demo.classList.toggle('open');
    $('#demoToggle').setAttribute('aria-expanded', String(open));
  });

  function renderAll() {
    renderScore();
    renderSchedule();
    renderPoints();
    renderRecovery();
  }
  renderChart();
  renderAll();
})();
