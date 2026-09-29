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
    renderHud();
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
    if (m && state.rec.active) { toast('Finish the recovery before driving on'); return; }
    state.moving = m;
    if (m) hud.parkLater = false;
    $$('[data-moving]').forEach((b) => b.classList.toggle('on', b.dataset.moving === (m ? '1' : '0')));
    if (!m) stopSim();
    renderScore();
    // Driver already accepted a rest stop on the HUD: parking there starts recovery mode automatically.
    if (!m && hud.nav && !state.rec.active && zoneOf(state.score) !== 'opt') {
      const z = zoneOf(state.score);
      startRecovery(z === 'risk' ? 20 : 15, z);
    }
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
    if (state.screen !== 'app') go('app');
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
    if (cam.on) { toast('摄像头监测已开启：耐力值由你的闭眼和哈欠决定'); return; }
    if (state.rec.active) {
      toast('Recovery in progress — finish it first');
      return;
    }
    const b = $('#simPlay');
    b.textContent = '❚❚ 暂停模拟';
    b.classList.add('is-on');
    if (!state.online) $('#goBtn').click();
    if (!state.moving) setMoving(true);
    if (!hud.booted) { runBoot(); }
    state.simTimer = setInterval(() => {
      if (hud.boot || hud.seqBusy) return; // let the HUD finish its reveal before draining further
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
      Object.assign(hud, { susAck: false, susLaterAt: null, level: 0, nav: null, recheckAt: 0, parkLater: false, lastPrompt: null, seqZone: null });
      endBoot();
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


  /* ---------- In-car AR-HUD: tiered intervention while driving ---------- */
  const hud = { prompt: null, lastPrompt: null, susAck: false, susLaterAt: null, recheckAt: 0, level: 0, nav: null, parkLater: false, sound: false,
    phase: 'settled', seqZone: 'opt', seqBusy: false, seqTimers: [], boot: null, booted: false, bootTimers: [], explain: false };
  const hudEl = $('#hud');

  function fitHud() {
    const wrap = $('#hudWrap');
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;
    const rot = W < H; // phone overlay in portrait: turn the HUD sideways
    const s = rot ? Math.min(H / 960, W / 540) : Math.min(W / 960, H / 540);
    hudEl.style.setProperty('--hs', s);
    hudEl.style.setProperty('--hr', rot ? '90deg' : '0deg');
  }
  window.addEventListener('resize', fitHud);

  function hudPrompt() {
    const z = zoneOf(state.score);
    if (state.rec.active || hud.boot || hud.phase !== 'settled') return null;
    if (!state.moving) return z !== 'opt' && !hud.parkLater ? 'park' : null;
    if (z === 'sus' && !hud.susAck && (hud.susLaterAt == null || state.score <= hud.susLaterAt - 6)) return 'sus';
    if (z === 'risk' && !hud.nav && Date.now() >= hud.recheckAt) return 'risk';
    return null;
  }

  const VOICE = {
    hello: 'Hi, I am your coach Xiao Qi.',
    sus: 'Your stamina is dropping. Keep a steady pace. Take a fifteen minute break at the store ahead and earn reward points?',
    risk: 'Fatigue risk is high. New ride requests are paused. The nearest rest area is a store, one hundred and fifty meters ahead.',
    risk2: 'Please pull over soon. Fatigue risk is still high.',
    park: 'You are parked. Shall I start recovery mode?',
  };
  const CAPTION = {
    boot: 'Before driving, Xiao Qi checks the driver with the <em>DMS camera and vehicle CAN data</em>.',
    sus: 'At this stage, the HUD turns orange as an early warning. If the driver takes a break now, <em>the system provides a reward</em>.',
    risk: 'At this stage, the HUD turns red as a final alert. Ride requests are paused and Xiao Qi guides the driver to a rest area — <em>the driver still makes the final call</em>.',
    rec: 'After parking, <em>recovery mode</em> starts: light therapy, white noise and a seat micro-massage.',
  };

  let audioCtx;
  function chime(strong) {
    if (!hud.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = strong ? [880, 660, 880] : [660, 880];
      notes.forEach((f, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.value = f; o.type = 'sine';
        const t = audioCtx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + 0.18);
      });
    } catch (e) { /* audio unavailable */ }
  }
  const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Fred|Good News|Jester|Junior|Organ|Superstar|Ralph|Trinoids|Whisper|Zarvox|Grandma|Grandpa|Rocko|Eddy|Flo|Reed|Sandy|Shelley|Kathy/i;
  const PREFER = { en: ['Samantha', 'Ava', 'Allison', 'Google US English', 'Susan', 'Serena', 'Karen', 'Daniel'], zh: ['Tingting', 'Ting-Ting', 'Meijia', 'Mei-Jia', 'Google 普通话', 'Lili', 'Yu-shu'] };
  function pickVoice(lang) {
    const all = ('speechSynthesis' in window && speechSynthesis.getVoices()) || [];
    const zh = lang.startsWith('zh');
    const ok = all.filter((v) => (zh ? /^zh[-_](CN|TW|HK)/i.test(v.lang) : /^en[-_]/i.test(v.lang)) && !NOVELTY.test(v.name));
    for (const name of PREFER[zh ? 'zh' : 'en']) { const v = ok.find((x) => x.name.includes(name)); if (v) return v; }
    return ok[0] || null;
  }
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

  let ttsAudio;
  function say(text, lang) {
    lang = lang || 'en-US';
    return new Promise(async (resolve) => {
      if (!(hud.sound || voice.on) || !text) return resolve();
      if (voice.key) {
        try { await openaiSpeak(text); return resolve(); } catch (e) { voiceNote('OpenAI voice failed — using system voice'); }
      }
      if (!('speechSynthesis' in window)) return resolve();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.lang = v ? v.lang : lang; u.rate = 0.95; u.pitch = 1;
      u.onend = u.onerror = () => resolve();
      setTimeout(() => speechSynthesis.speak(u), 200);
      setTimeout(resolve, 12000);
    });
  }

  // typewriter caption (explain mode only)
  let capTimer, capKey;
  function caption(key) {
    const box = $('#capBox');
    if (!hud.explain || !key) { box.classList.remove('on'); capKey = null; clearInterval(capTimer); return; }
    if (key === capKey) return;
    capKey = key;
    box.classList.add('on');
    const html = CAPTION[key];
    const plain = html.replace(/<[^>]+>/g, '');
    let i = 0;
    clearInterval(capTimer);
    capTimer = setInterval(() => {
      i += 2;
      if (i >= plain.length) { $('#capText').innerHTML = html; clearInterval(capTimer); return; }
      $('#capText').textContent = plain.slice(0, i);
    }, 28);
  }

  const on = (sel, v) => $(sel).classList.toggle('on', !!v);
  function popOrb() { const o = $('#hudOrb'); o.classList.remove('pop'); void o.offsetWidth; o.classList.add('pop'); }
  $('#hudOrb').addEventListener('animationend', (e) => { if (e.animationName === 'orbPop') e.currentTarget.classList.remove('pop'); });

  /* zone sequence (mirrors the video): orb pops → message → "Optimal break in" → rest spots → settle on the driver's choice */
  function playZone(z) {
    hud.seqTimers.forEach(clearTimeout); hud.seqTimers = [];
    hud.seqZone = z;
    if (z === 'opt') { hud.phase = 'settled'; hud.seqBusy = false; return; }
    const steps = [['pop', 0], ['text', 700], ['break', 3700], ['spots', 6300], ['settled', 9300]];
    hud.seqBusy = true;
    steps.forEach(([ph, t]) => hud.seqTimers.push(setTimeout(() => {
      hud.phase = ph;
      if (ph === 'pop') { popOrb(); chime(z === 'risk'); }
      if (ph === 'settled') hud.seqBusy = false;
      renderScore();
    }, t)));
  }

  /* boot / calibration before the first drive (video 0:14–0:33) */
  function runBoot() {
    hud.bootTimers.forEach(clearTimeout); hud.bootTimers = [];
    hud.booted = true;
    const steps = [['dash', 0], ['hello', 1600], ['signals', 3800], ['ok', 7000], ['route', 9400], [null, 11600]];
    steps.forEach(([ph, t]) => hud.bootTimers.push(setTimeout(() => {
      hud.boot = ph;
      if (ph === 'hello') { popOrb(); say(VOICE.hello); }
      if (ph === 'signals') {
        $$('#dmsList li').forEach((li, i) => { li.classList.remove('in'); setTimeout(() => li.classList.add('in'), 150 + i * 220); });
        const target = Math.round(state.score);
        let v = 0; $('#dmsScore').textContent = '0';
        const iv = setInterval(() => { v = Math.min(target, v + 3); $('#dmsScore').textContent = v; if (v >= target) clearInterval(iv); }, 30);
      }
      if (ph === 'signals' && cam.on) toast('DMS camera connected · MediaPipe running on-device');
      if (ph === 'ok') { $('#okLine').innerHTML = state.score >= 90 ? 'Your status is <em>perfect</em> !' : 'Your status is <em>good</em> !'; chime(false); }
      renderScore();
    }, t)));
  }
  function endBoot() { hud.bootTimers.forEach(clearTimeout); hud.bootTimers = []; hud.boot = null; }

  const HUDZ = {
    opt: { pct: 84, state: 'Optimal state', limit: 65, min: '28', eta: '15:36', dist: '0.8', street: 'Right onto Pennsylvania Ave', timer: '240:00 Left' },
    sus: { pct: 55, state: 'Moderate state', limit: 80, min: '15', eta: '17:40', dist: '0.6', street: 'Left onto 10th St NW', timer: '240:00 Left' },
    risk: { pct: 40, state: 'Severe state', limit: 65, min: '10', eta: '17:40', dist: '0.2', street: 'Right onto 7th St NW', timer: '7:00 Left' },
  };
  const ORB = { opt: ['assets/mascot.png', 'qi-green'], sus: ['assets/qi-yellow.png', 'qi-glow'], risk: ['assets/qi-red.png', 'qi-glow'] };
  const keys = '<kbd>▲</kbd>OK<kbd>▼</kbd>Later';

  function renderHud() {
    const s = Math.round(state.score);
    const z = zoneOf(s);
    const Z = HUDZ[z];
    const resting = state.rec.active;
    const moving = state.moving && !resting;

    // a new zone while driving replays the video-style reveal
    if (moving && !hud.boot && z !== hud.seqZone) playZone(z);
    if (!moving) { hud.seqTimers.forEach(clearTimeout); hud.seqTimers = []; hud.seqBusy = false; hud.phase = 'settled'; }

    hudEl.dataset.zone = z;
    hudEl.classList.toggle('moving', moving);
    hudEl.classList.toggle('parked', !moving);
    hudEl.classList.toggle('resting', resting);

    const img = $('#orbImg');
    const [src, cls] = hud.boot ? ORB.opt : ORB[z];
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    img.className = cls;

    // what is on screen
    const ph = hud.phase;
    let view = 'coach';
    if (resting) view = 'rec';
    else if (moving && z !== 'opt') {
      if (ph === 'break') view = 'break';
      else if (ph === 'spots') view = 'spots';
      else if (ph === 'settled' && z === 'risk' && hud.nav) view = 'spots';
      else if (ph === 'settled' && z === 'risk' && hud.level > 0) view = 'break';
    }
    const b = hud.boot;
    hudEl.classList.toggle('off-dash', b === 'signals' || b === 'ok');
    hudEl.classList.toggle('off-route', !!b && b !== 'route');
    hudEl.classList.toggle('off-timer', !!b && b !== 'route');
    hudEl.classList.toggle('off-turn', !b && (view === 'break' || (view === 'spots' && !(z === 'risk' && hud.nav))));
    on('#annoDash', b === 'dash');
    on('#annoRoute', b === 'route');
    on('#hudHello', b === 'hello');
    on('#dmsCard', b === 'signals');
    on('#okCard', b === 'ok');
    on('#hudCoach', b ? b === 'hello' : view === 'coach');
    $('#hudCoach').classList.toggle('notext', b === 'hello' || (moving && ph === 'pop'));
    on('#hudBreak', !b && view === 'break');
    on('#hudSpots', !b && view === 'spots');
    on('#hudRec', view === 'rec');
    $('#dialRest').toggleAttribute('hidden', !(resting || b === 'dash' || b === 'hello'));
    hudEl.classList.toggle('resting', resting || b === 'dash' || b === 'hello');

    $('#hudScore').textContent = s;
    $('#hudPct').textContent = b ? 100 : Z.pct;
    $('#hudState').textContent = view === 'coach' || z !== 'risk' ? Z.state : 'Severe Zone';
    $('#hudLimit').textContent = Z.limit;
    $('#hudMin').textContent = resting || b === 'dash' || b === 'hello' ? '00' : Z.min;
    $('#hudEta').textContent = resting || b === 'dash' || b === 'hello' ? '0:00' : Z.eta;
    $('#hudDist').textContent = z === 'risk' && hud.nav ? '0.1' : Z.dist;
    $('#hudStreet').textContent = z === 'risk' && hud.nav ? 'Right into Store parking' : Z.street;
    $('#hudTimerText').textContent = Z.timer;
    if (resting) $('#hrTime').textContent = mmss(state.rec.left);

    const fatigue = 100 - s;
    $('#coachText').innerHTML =
      z === 'opt' || b
        ? '<div class="fe"><small>FATIGUE ENDURANCE</small><div class="bar"><i></i></div><span>State Good: <b>Sustainable Driving !</b></span></div>'
        : z === 'sus'
        ? `Fatigue <em>${fatigue}</em> - Moderate<br />Keep steady pace !`
        : `Fatigue <em>${fatigue}</em> - Load eased<br />Back to safe zone !`;

    // status pills — what the system already did for the driver
    const pills = [];
    if (!b) {
      if (resting) pills.push('Requests paused · resting');
      else if (z === 'sus') { pills.push('Short trips only'); if (hud.susAck) pills.push('Break planned · Store 150m'); }
      else if (z === 'risk') {
        pills.push('Requests paused');
        if (hud.nav) pills.push('Navigating · Store 150m');
        else if (hud.level > 0) pills.push('Seat vibration');
      }
    }
    $('#hudPills').innerHTML = pills.map((t) => `<span class="pill${/vibration|Navigating/.test(t) ? ' hot' : ''}"><i></i>${t}</span>`).join('');

    // explain mode: grey world + caption
    const capKeyNow = b ? 'boot' : resting ? 'rec' : moving && z !== 'opt' ? z : null;
    hudEl.classList.toggle('grey', hud.explain && !!capKeyNow && capKeyNow !== 'boot');
    caption(capKeyNow);

    // the driver's decision (plan B: the reveal plays on its own, the last step waits for ▲ / ▼)
    const p = hudPrompt();
    hud.prompt = p;
    const pr = $('#hudPrompt');
    pr.hidden = !p;
    pr.classList.toggle('under-break', view === 'break');
    if (p) {
      const q = p === 'sus' ? 'Take a 15-min break at Store 150m? +15 pts'
        : p === 'risk' ? (hud.level > 0 ? 'Pull over at Store 150m?' : 'Navigate to Store 150m for a 20-min rest?')
        : 'Parked · Start recovery mode?';
      pr.innerHTML = q + (voice.on ? (voice.lang === 'zh-CN' ? '<span class="say">说「好的」·「稍后」</span>' : '<span class="say">Say “OK” · “Later”</span>') : keys);
    }
    if (p && p !== hud.lastPrompt) {
      if (p !== 'sus' || hud.susLaterAt != null) chime(p === 'risk' || hud.level > 0);
      if (voice.on) voiceAsk(p);
      else say(p === 'risk' && hud.level > 0 ? VOICE.risk2 : VOICE[p]);
      if (p === 'risk' && hud.level > 0) { hudEl.classList.remove('shake'); void hudEl.offsetWidth; hudEl.classList.add('shake'); }
    }
    if (!p && hud.lastPrompt && voice.on) voiceStop();
    hud.lastPrompt = p;
    $$('[data-wheel]').forEach((btn) => { btn.disabled = !p; btn.classList.toggle('ready', !!p); });

    if (z === 'opt') { hud.susAck = false; hud.susLaterAt = null; hud.level = 0; hud.nav = null; hud.recheckAt = 0; }
  }

  function wheel(action) {
    const p = hud.prompt;
    if (!p) return;
    if (action === 'ok') {
      if (p === 'sus') { hud.susAck = true; toast('HUD · Break planned at Store 150m · +15 pts on completion'); }
      if (p === 'risk') { hud.nav = 'Store 150m'; toast('HUD · Navigating to Store 150m — park there to start resting'); }
      if (p === 'park') { const z = zoneOf(state.score); startRecovery(z === 'risk' ? 20 : 15, z); }
    } else {
      if (p === 'sus') hud.susLaterAt = state.score;
      if (p === 'risk') { hud.level += 1; hud.recheckAt = Date.now() + 8000; toast('HUD · Requests stay paused · re-check in 5 min'); } // demo: 8 s stands in for 5 min
      if (p === 'park') hud.parkLater = true;
    }
    renderScore();
  }
  $$('[data-wheel]').forEach((btn) => btn.addEventListener('click', () => wheel(btn.dataset.wheel)));
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); wheel('ok'); }
    if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowDown') { e.preventDefault(); wheel('later'); }
  });
  setInterval(() => { if (hud.recheckAt && Date.now() >= hud.recheckAt && hud.prompt == null) renderScore(); }, 1000);

  $('#explainBtn').addEventListener('click', (e) => {
    hud.explain = !hud.explain;
    e.currentTarget.setAttribute('aria-pressed', String(hud.explain));
    e.currentTarget.textContent = hud.explain ? '讲解字幕 开' : '讲解字幕 关';
    capKey = null;
    renderScore();
  });
  $('#soundBtn').addEventListener('click', (e) => {
    hud.sound = !hud.sound;
    e.currentTarget.setAttribute('aria-pressed', String(hud.sound));
    e.currentTarget.textContent = hud.sound ? '🔊 语音 开' : '🔇 语音 关';
    if (hud.sound) { chime(false); if (hud.prompt) say(VOICE[hud.prompt]); }
    else if ('speechSynthesis' in window) speechSynthesis.cancel();
  });

  // phone: open the HUD full-screen from Home
  $('#hudEntry').addEventListener('click', () => { $('#hudWrap').classList.add('open'); fitHud(); });
  $('#hudClose').addEventListener('click', () => $('#hudWrap').classList.remove('open'));


  /* ---------- live driver monitoring (MediaPipe, on-device) ---------- */
  const cam = { on: false, mod: null, m: null, last: 0 };
  async function camToggle() {
    const btn = $('#camBtn');
    if (cam.on) {
      cam.on = false; cam.mod && cam.mod.stop();
      btn.setAttribute('aria-pressed', 'false'); btn.textContent = '📷 摄像头监测 关';
      $('#camState').textContent = '摄像头未开启';
      return;
    }
    if (location.protocol === 'file:') { toast('摄像头需要通过 http(s) 打开页面（本地预览或线上地址）'); return; }
    btn.textContent = '📷 加载模型中…';
    try {
      cam.mod = cam.mod || (await import('./monitor.js?v=22'));
      await cam.mod.start($('#camVideo'), onDms);
    } catch (e) {
      btn.textContent = '📷 摄像头监测 关';
      toast(e && e.name === 'NotAllowedError' ? '没有摄像头权限' : '摄像头或模型加载失败');
      return;
    }
    cam.on = true;
    btn.setAttribute('aria-pressed', 'true'); btn.textContent = '📷 摄像头监测 开';
    stopSim();
    if (state.rec.active) finishRecovery();
    if (state.screen !== 'app') go('app');
    if (!state.online) $('#goBtn').click();
    if (!state.moving) setMoving(true);
    if (!hud.booted) runBoot();
    closeDemoSheet();
  }
  $('#camBtn').addEventListener('click', camToggle);

  // camera events → cognitive stamina (demo weights, tuned so a few yawns / eye closures reach yellow, then red)
  const PENALTY = { long: 8, hold: 3, yawn: 12 };
  function onDms(m) {
    cam.m = m;
    const box = $('.cam');
    box.classList.toggle('closed', !!m.closed);
    box.classList.toggle('yawn', !!m.yawning);
    $('#camState').textContent = !m.face ? '未检测到人脸' : m.calibrating ? '校准中：请正常睁眼看前方' : m.closedFor > 800 ? '闭眼中…' : m.yawning ? '张嘴 / 哈欠' : '监测中';
    const now = performance.now();
    if (now - cam.last > 200 && m.face && !m.calibrating) {
      cam.last = now;
      $('#camStats').textContent = `闭眼 ${m.eyes.toFixed(2)}/${m.eyeThr.toFixed(2)} · 张嘴 ${m.jaw.toFixed(2)}/${m.jawThr.toFixed(2)} · PERCLOS ${Math.round(m.perclos * 100)}% · 长闭眼 ${m.longs} · 哈欠 ${m.yawns}` + (cam.log ? ` · ${cam.log}` : '');
    }
    if (!cam.on || !m.event || m.calibrating) return;
    // no penalties while resting, parked, during the boot / a zone reveal, or while Xiao Qi waits for an answer
    const paused = state.rec.active || !state.moving || hud.boot || hud.seqBusy || hud.prompt || voice.prompt;
    const label = { long: '长闭眼', hold: '持续闭眼', yawn: '哈欠' }[m.event];
    if (paused) { cam.log = `${label}（等待回答中，不扣分）`; return; }
    state.score = Math.max(20, state.score - PENALTY[m.event]);
    cam.log = `${label} −${PENALTY[m.event]}`;
    renderScore();
  }
  function basisSentence(zh) {
    const m = cam.m;
    if (cam.on && m && m.face) return zh
      ? `刚才我检测到你有 ${m.longs} 次长时间闭眼、${m.yawns} 次打哈欠，闭眼时间占了百分之 ${Math.round(m.perclos * 100)}。`
      : `In the last minute I saw ${m.longs} long eye closures and ${m.yawns} yawns, and your eyes were closed ${Math.round(m.perclos * 100)} percent of the time.`;
    return zh
      ? '最近十分钟你的眨眼时长和闭眼时间都在增加，而且已经连续开了一段时间没有休息。'
      : 'Your blink duration and eye-closure time rose over the last ten minutes, and you have been driving for a while without a break.';
  }

  /* ---------- voice conversation with Xiao Qi ----------
     default: browser speech (Web Speech API) · optional: OpenAI voice + transcription with the user's own key (kept in this browser only) */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const KEY_STORE = 'dl-openai-key';
  let savedKey = '';
  try { savedKey = localStorage.getItem(KEY_STORE) || ''; } catch (e) { /* storage blocked */ }
  const voice = { on: false, lang: 'en-US', rec: null, prompt: null, key: savedKey, busy: false };
  const QUESTION = {
    sus: ['Your stamina is dropping. Want to take a fifteen minute break at the store ahead? You will earn fifteen points.', '你的耐力值在下降。要不要在前面的便利店休息十五分钟？可以获得十五积分。'],
    risk: ['Fatigue risk is high, so new ride requests are paused. Shall I navigate you to the store, one hundred and fifty meters ahead?', '疲劳风险很高，新订单已经暂停。要我导航去前方一百五十米的便利店吗？'],
    risk2: ['Fatigue risk is still high. Please pull over at the store ahead. Shall I navigate?', '疲劳风险仍然很高，请尽快在前方便利店停车。要导航吗？'],
    park: ['You are parked. Shall I start recovery mode?', '车已经停好了，要开始恢复模式吗？'],
  };
  const REPLY = {
    'sus-ok': ['Great. Your break is planned at the store.', '好的，已为你安排在便利店休息。'],
    'sus-later': ['Alright, I will check in again a bit later.', '好的，我稍后再提醒你。'],
    'risk-ok': ['Okay, navigating to the store now.', '好的，正在导航去便利店。'],
    'risk-later': ['Okay. Ride requests stay paused. I will check again in five minutes.', '好的，订单会保持暂停，五分钟后我再确认一次。'],
    'park-ok': ['Starting recovery mode. Relax.', '开始恢复模式，放松一下。'],
    'park-later': ['Okay.', '好的。'],
    again: ['Sorry, I didn’t catch that. Say OK or later.', '抱歉没听清，请说“好的”或者“稍后”。'],
  };
  const L = () => (voice.lang === 'zh-CN' ? 1 : 0);
  function intentOf(t) {
    t = t.toLowerCase();
    if (/\bwhy\b|what happened|reason|为什么|怎么了|依据/.test(t)) return 'why';
    if (/later|not now|\bno\b|nope|skip|i'?m (fine|ok|okay)|keep driving|continue|稍后|等会|等一下|不用|不要|算了|继续|没事/.test(t)) return 'later';
    if (/\b(ok|okay|yes|yeah|yep|sure|go|navigate|start|confirm|let'?s|please|fine|alright)\b|take me|pull over|7[- ]?eleven|\b711\b|seven[- ]eleven|\bstore\b|\bbreak\b|\brest\b|好|可以|行|确认|导航|开始|休息|嗯|带我去|去便利店/.test(t)) return 'ok';
    return null;
  }

  // HUD line + mic level bars
  function voiceLine(html, on = true) { const el = $('#hudVoice'); el.innerHTML = html; el.classList.toggle('on', on); }
  function voiceNote(t) { $('#voiceNote').textContent = t; }
  const BARS = '<span class="lvl"><i></i><i></i><i></i><i></i><i></i></span>';
  const mic = { stream: null, ctx: null, an: null, buf: null, level: 0, timer: null };
  async function micOn() {
    if (mic.stream) return true;
    try {
      mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) { voiceNote('没有麦克风权限：请在地址栏左侧允许麦克风'); return false; }
    mic.ctx = new (window.AudioContext || window.webkitAudioContext)();
    mic.an = mic.ctx.createAnalyser(); mic.an.fftSize = 1024;
    mic.ctx.createMediaStreamSource(mic.stream).connect(mic.an);
    mic.buf = new Float32Array(mic.an.fftSize);
    mic.timer = setInterval(() => {
      mic.an.getFloatTimeDomainData(mic.buf);
      let sum = 0; for (const x of mic.buf) sum += x * x;
      mic.level = Math.sqrt(sum / mic.buf.length);
      const lv = Math.min(1, mic.level * 12);
      document.documentElement.style.setProperty('--lv', lv.toFixed(2));
    }, 60);
    return true;
  }
  function micOff() { clearInterval(mic.timer); mic.stream && mic.stream.getTracks().forEach((t) => t.stop()); mic.ctx && mic.ctx.close(); Object.assign(mic, { stream: null, ctx: null, an: null, level: 0 }); }

  function voiceStop() { voice.prompt = null; try { voice.rec && voice.rec.abort(); } catch (e) {} voiceLine('', false); }

  async function voiceAsk(p) {
    voice.prompt = p;
    const key = p === 'risk' && hud.level > 0 ? 'risk2' : p;
    voiceLine('<span class="mic" style="background:#88e6cf"></span>' + (L() ? '小奇正在说…' : 'Xiao Qi is speaking…'));
    await say(QUESTION[key][L()], voice.lang);
    if (voice.prompt === p) listen(p);
  }
  function listen(p) { voice.key ? listenOpenAI(p) : listenBrowser(p); }

  // --- browser speech recognition: keeps listening for as long as the question is open
  function listenBrowser(p) {
    if (!SR) { voiceLine('This browser has no speech recognition — use ▲ / ▼, or add an OpenAI key'); return; }
    const rec = new SR();
    voice.rec = rec;
    rec.lang = voice.lang; rec.interimResults = true; rec.maxAlternatives = 3; rec.continuous = true;
    let handled = false;
    voiceLine(`<span class="mic"></span>${L() ? '正在听' : 'Listening'} ${BARS} ${L() ? '请说「好的」或「稍后」' : 'say “OK” or “Later”'}`);
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        voiceLine(`<span class="mic"></span>${BARS}<q>${text}</q>`);
        if (!r.isFinal || handled) continue;
        const intent = Array.from(r).map((a) => intentOf(a.transcript)).find(Boolean) || null;
        handled = true; try { rec.stop(); } catch (err) {}
        handleIntent(p, intent, text);
      }
    };
    rec.onerror = (e) => {
      voiceNote('语音识别：' + ({ 'no-speech': '没听到声音，继续听…', network: '连不上语音服务（Chrome 识别需要访问 Google）', 'not-allowed': '麦克风被拒绝', 'service-not-allowed': '语音服务不可用', 'audio-capture': '没找到麦克风' }[e.error] || e.error));
      if (/not-allowed|audio-capture|network/.test(e.error)) { handled = true; voiceLine('Voice input unavailable — use ▲ / ▼'); }
    };
    rec.onend = () => { if (!handled && voice.prompt === p && voice.on) setTimeout(() => voice.prompt === p && listenBrowser(p), 250); };
    try { rec.start(); voiceNote('语音识别：正在听…'); } catch (e) { /* already running */ }
  }

  // --- OpenAI: record when the driver starts talking, stop after a short pause, transcribe
  async function listenOpenAI(p) {
    if (!(await micOn())) return;
    const rec = new MediaRecorder(mic.stream);
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start(100);
    voiceLine(`<span class="mic"></span>${L() ? '正在听' : 'Listening'} ${BARS} ${L() ? '直接和小奇说话' : 'just talk to Xiao Qi'}`);
    const t0 = performance.now();
    let floor = 0, speaking = false, lastVoice = 0, n = 0;
    await new Promise((done) => {
      const iv = setInterval(() => {
        const now = performance.now(), lv = mic.level;
        if (now - t0 < 500) return;                                   // let Xiao Qi's voice die out
        if (now - t0 < 900) { floor += lv; n++; return; }              // ambient noise
        const thr = Math.min(0.045, Math.max(0.012, (floor / Math.max(1, n)) * 1.8));
        if (lv > thr) { if (!speaking) voiceNote('听到声音…'); speaking = true; lastVoice = now; }
        const stop = voice.prompt !== p || (speaking && now - lastVoice > 750) || (speaking && now - t0 > 9000) || (!speaking && now - t0 > 10000);
        if (stop) { clearInterval(iv); rec.onstop = done; rec.stop(); }
      }, 50);
    });
    if (voice.prompt !== p) return;
    if (!speaking) { voiceNote('没听到说话，继续听…（说话时音量条应该会动）'); listenOpenAI(p); return; }
    voiceLine('<span class="mic" style="background:#88e6cf"></span>' + (L() ? '正在理解…' : 'Understanding…'));
    voiceNote('上传识别中…');
    try {
      const text = await openaiTranscribe(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      voiceLine(`<q>${text}</q>`);
      let intent = intentOf(text);
      if (!intent && text) intent = await openaiIntent(text, p);
      voiceNote(`识别结果：「${text || '（空）'}」→ ${{ ok: '确认', later: '稍后', why: '问原因' }[intent] || '没听懂'}`);
      handleIntent(p, intent, text);
    } catch (e) {
      voiceNote('OpenAI 识别失败：' + (e.message || e));
      listenBrowser(p);
    }
  }

  async function handleIntent(p, intent, text) {
    if (voice.prompt !== p) return;
    if (intent === 'why') {
      voiceLine(`<q>${text}</q> · explaining…`);
      await say(basisSentence(L() === 1), voice.lang);
      if (voice.prompt === p) listen(p);
      return;
    }
    if (!intent || intent === 'other') {
      await say(REPLY.again[L()], voice.lang);
      if (voice.prompt === p) listen(p);
      return;
    }
    voiceLine(`<q>${text}</q> ✓`);
    voice.prompt = null;
    say(REPLY[`${p}-${intent}`][L()], voice.lang);
    wheel(intent);
    setTimeout(() => { if (!voice.prompt) voiceLine('', false); }, 2600);
  }

  // --- OpenAI helpers (called straight from this browser with the user's own key)
  async function oa(path, init) {
    const r = await fetch('https://api.openai.com/v1/' + path, { ...init, headers: { Authorization: 'Bearer ' + voice.key, ...(init.headers || {}) } });
    if (!r.ok) { const t = await r.text(); throw new Error(r.status + ' ' + t.slice(0, 120)); }
    return r;
  }
  async function openaiSpeak(text) {
    const body = (model) => JSON.stringify({ model, voice: 'shimmer', input: text, response_format: 'mp3',
      ...(model.includes('4o') ? { instructions: 'You are Xiao Qi, a warm, calm in-car fatigue coach. Speak clearly at a relaxed pace.' } : {}) });
    let r;
    try { r = await oa('audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body('gpt-4o-mini-tts') }); }
    catch (e) { r = await oa('audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body('tts-1') }); }
    const url = URL.createObjectURL(await r.blob());
    if (ttsAudio) ttsAudio.pause();
    ttsAudio = new Audio(url);
    await new Promise((res) => { ttsAudio.onended = ttsAudio.onerror = res; ttsAudio.play().catch(res); });
    URL.revokeObjectURL(url);
  }
  async function openaiTranscribe(blob) {
    const send = (model) => {
      const fd = new FormData();
      fd.append('file', blob, 'speech.webm');
      fd.append('model', model);
      fd.append('prompt', 'OK, okay, yes, later, no, navigate, why, 好的, 稍后, 导航, 为什么');
      return oa('audio/transcriptions', { method: 'POST', body: fd });
    };
    let r;
    try { r = await send('gpt-4o-mini-transcribe'); } catch (e) { r = await send('whisper-1'); }
    return ((await r.json()).text || '').trim();
  }
  async function openaiIntent(text, p) {
    try {
      const r = await oa('chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0, max_tokens: 3,
        messages: [
          { role: 'system', content: 'Classify the driver reply to an in-car fatigue coach question. Answer with exactly one word: ok (accepts the break / navigation / recovery), later (declines or postpones), why (asks for the reason), other.' },
          { role: 'user', content: `Question: ${QUESTION[p][0]}\nDriver: ${text}` },
        ] }) });
      const w = ((await r.json()).choices[0].message.content || '').toLowerCase();
      return ['ok', 'later', 'why'].find((k) => w.includes(k)) || 'other';
    } catch (e) { return null; }
  }

  $('#voiceBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    voice.on = !voice.on;
    btn.setAttribute('aria-pressed', String(voice.on));
    btn.textContent = voice.on ? '🎙 语音对话 开' : '🎙 语音对话 关';
    if (!voice.on) { voiceStop(); micOff(); voiceNote(''); renderScore(); return; }
    if (location.protocol === 'file:') voiceNote('麦克风需要通过 http(s) 打开页面');
    const okMic = await micOn(); // shows the mic level bar and triggers the permission prompt right away
    if (okMic) voiceNote(voice.key ? '已开启 · OpenAI 语音' : '已开启 · 浏览器语音（说话时音量条会动）');
    if (!voice.key && !SR) voiceNote('这个浏览器不支持语音识别：请用 Chrome，或填入 OpenAI Key');
    hud.lastPrompt = null; // re-ask the pending question by voice
    renderScore();
  });
  $('#langBtn').addEventListener('click', (e) => {
    voice.lang = voice.lang === 'en-US' ? 'zh-CN' : 'en-US';
    e.currentTarget.textContent = voice.lang === 'en-US' ? '语言 EN' : '语言 中文';
    if (voice.on && voice.prompt) { // ask the open question again in the new language
      try { voice.rec && voice.rec.abort(); } catch (err) {}
      voice.prompt = null; hud.lastPrompt = null; renderScore();
    }
  });
  $('#keySave').addEventListener('click', () => {
    voice.key = $('#keyInput').value.trim();
    try { voice.key ? localStorage.setItem(KEY_STORE, voice.key) : localStorage.removeItem(KEY_STORE); } catch (e) {}
    $('#keyInput').value = '';
    $('#keyInput').placeholder = voice.key ? '已保存在本机（留空再点保存可清除）' : 'OpenAI API Key（可选）';
    voiceNote(voice.key ? '已切换为 OpenAI 语音' : '已切换为浏览器语音');
  });
  if (voice.key) $('#keyInput').placeholder = '已保存在本机（留空再点保存可清除）';

  function renderAll() {
    renderScore();
    renderSchedule();
    renderPoints();
    renderRecovery();
  }
  renderChart();
  renderAll();
  fitHud();
})();
