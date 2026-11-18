/* Reset 66 — a 66-day habit challenge. All data stays on the device (localStorage). */
(() => {
  "use strict";

  const LEN = 66;
  const KEY = "reset66.state.v1";
  const MAX_HABITS = 5;

  const PHASES = [
    { n: 1, name: "Break", from: 1, to: 22, color: "var(--p1)", hint: "Breaking old patterns. This is the hardest part — just show up." },
    { n: 2, name: "Build", from: 23, to: 44, color: "var(--p2)", hint: "The routine is forming. Keep the chain going, even on bad days." },
    { n: 3, name: "Become", from: 45, to: 66, color: "var(--p3)", hint: "It's becoming who you are. Finish strong." },
  ];

  const QUOTES = [
    "Small steps every day beat big steps once in a while.",
    "You don't have to be great to start. You have to start to be great.",
    "Discipline is remembering what you want.",
    "Missing once is an accident. Missing twice is a new habit.",
    "Make it easy. Make it daily. Make it yours.",
    "The best time to start was yesterday. The next best time is today.",
    "Motivation gets you going. Habit keeps you going.",
    "Progress, not perfection.",
    "One day or day one. You decide.",
    "You are what you repeatedly do.",
    "Be stubborn about the goal, flexible about the method.",
    "Don't break the chain.",
    "Every check is a vote for the person you want to become.",
    "Hard choices, easy life. Easy choices, hard life.",
  ];

  const SUGGESTIONS = [
    ["🏃", "Exercise 30 min"], ["📚", "Read 10 pages"], ["🧘", "Meditate"],
    ["💧", "Drink 2L water"], ["🚫", "No sugar"], ["📵", "No social media"],
    ["🛏️", "Sleep before 23:00"], ["✍️", "Journal"], ["🚶", "10k steps"],
    ["🥗", "Eat healthy"], ["🚭", "No smoking"], ["🍺", "No alcohol"],
    ["🌅", "Wake up early"], ["🧊", "Cold shower"],
  ];

  // ---------- Date helpers (local time, keyed as YYYY-MM-DD) ----------
  const pad = (n) => String(n).padStart(2, "0");
  const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
  const diffDays = (a, b) => {
    const [y1, m1, d1] = a.split("-").map(Number);
    const [y2, m2, d2] = b.split("-").map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  };
  const todayKey = () => toKey(new Date());
  const fmtDate = (k) => fromKey(k).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  // ---------- State ----------
  const blank = () => ({ challenge: null, log: {}, history: [] });
  let state = load();
  let tab = "today";

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s === "object") return Object.assign(blank(), s);
    } catch (_) { /* ignore */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { toast("Could not save"); }
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------- Challenge logic ----------
  const C = () => state.challenge;
  const dayNumber = (k = todayKey()) => diffDays(C().startDate, k) + 1; // 1-based
  const keyForDay = (n) => addDays(C().startDate, n - 1);
  const phaseFor = (n) => PHASES.find((p) => n >= p.from && n <= p.to) || PHASES[PHASES.length - 1];
  const entry = (k) => state.log[k] || { done: [], note: "" };
  const doneCount = (k) => {
    const ids = new Set(C().habits.map((h) => h.id));
    return entry(k).done.filter((id) => ids.has(id)).length;
  };
  const isPerfect = (k) => C().habits.length > 0 && doneCount(k) === C().habits.length;

  function toggle(k, habitId) {
    const e = { ...entry(k), done: [...entry(k).done] };
    const i = e.done.indexOf(habitId);
    if (i >= 0) e.done.splice(i, 1); else e.done.push(habitId);
    state.log[k] = e;
    save();
    return i < 0;
  }

  function stats() {
    const today = Math.min(dayNumber(), LEN);
    const elapsed = Math.max(0, today);
    let best = 0, run = 0, perfect = 0, checks = 0;
    for (let n = 1; n <= elapsed; n++) {
      const k = keyForDay(n);
      checks += doneCount(k);
      if (isPerfect(k)) { perfect++; run++; best = Math.max(best, run); } else run = 0;
    }
    // Current streak: count back from today; today doesn't break it if not done yet.
    let cur = 0;
    let n = elapsed;
    if (n >= 1 && !isPerfect(keyForDay(n))) n--;
    while (n >= 1 && isPerfect(keyForDay(n))) { cur++; n--; }
    const possible = elapsed * C().habits.length;
    return { cur, best, perfect, pct: possible ? Math.round((checks / possible) * 100) : 0, elapsed };
  }

  function habitPct(h, elapsed) {
    if (!elapsed) return 0;
    let c = 0;
    for (let n = 1; n <= elapsed; n++) if (entry(keyForDay(n)).done.includes(h.id)) c++;
    return Math.round((c / elapsed) * 100);
  }

  // ---------- Rendering ----------
  const view = $("#view");
  const tabbar = $("#tabbar");

  function render() {
    if (!C()) { tabbar.classList.add("hidden"); return renderOnboarding(); }
    tabbar.classList.remove("hidden");
    tabbar.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    if (dayNumber() < 1) return renderNotStarted();
    if (tab === "today") return dayNumber() > LEN ? renderFinished() : renderToday();
    if (tab === "journey") return renderJourney();
    if (tab === "settings") return renderSettings();
  }

  function ringSVG(day) {
    const r = 96, c = 2 * Math.PI * r;
    const p = Math.min(day, LEN) / LEN;
    return `
      <svg width="220" height="220" viewBox="0 0 220 220">
        <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffb26b"/><stop offset="100%" stop-color="#ff5e5e"/>
        </linearGradient></defs>
        <circle class="track" cx="110" cy="110" r="${r}" fill="none" stroke-width="14"/>
        <circle class="bar" cx="110" cy="110" r="${r}" fill="none" stroke-width="14" stroke-linecap="round"
          stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/>
      </svg>`;
  }

  function renderToday() {
    const k = todayKey();
    const n = dayNumber();
    const ph = phaseFor(n);
    const s = stats();
    const quote = QUOTES[(n - 1) % QUOTES.length];
    view.innerHTML = `
      <div class="hero">
        <div class="ring">${ringSVG(n)}
          <div class="center">
            <div class="day-label">Day</div>
            <div class="day-num">${n}</div>
            <div class="day-of">of ${LEN}</div>
          </div>
        </div>
        <div class="phase-pill"><span class="dot" style="background:${ph.color}"></span>Phase ${ph.n} · ${ph.name} · ${LEN - n} days left</div>
        <p class="quote">“${esc(quote)}”</p>
      </div>

      <div class="stats">
        <div class="stat"><div class="v">🔥 ${s.cur}</div><div class="k">Streak</div></div>
        <div class="stat"><div class="v">${s.best}</div><div class="k">Best</div></div>
        <div class="stat"><div class="v">${s.pct}%</div><div class="k">Done</div></div>
      </div>

      <h2>Today <span class="small">· ${fmtDate(k)}</span></h2>
      ${isPerfect(k) ? `<div class="perfect">✨ Perfect day — all habits done!</div>` : ""}
      <div id="habits">${habitButtons(k)}</div>

      <button class="btn secondary" id="note-btn">${entry(k).note ? "📝 Edit today's note" : "📝 Add a note for today"}</button>
    `;
    bindHabitButtons(view, k, renderToday);
    $("#note-btn").onclick = () => openDay(k);
  }

  function habitButtons(k) {
    const done = entry(k).done;
    return C().habits.map((h) => `
      <button class="habit ${done.includes(h.id) ? "done" : ""}" data-h="${h.id}">
        <span class="emoji">${esc(h.emoji || "•")}</span>
        <span class="name">${esc(h.name)}</span>
        <span class="check">✓</span>
      </button>`).join("");
  }

  function bindHabitButtons(root, k, rerender) {
    root.querySelectorAll("[data-h]").forEach((b) => {
      b.onclick = () => {
        const wasPerfect = isPerfect(k);
        const nowOn = toggle(k, b.dataset.h);
        if (navigator.vibrate) navigator.vibrate(nowOn ? 12 : 6);
        if (!wasPerfect && isPerfect(k)) confetti();
        rerender();
      };
    });
  }

  function renderJourney() {
    const s = stats();
    const today = dayNumber();
    const blocks = PHASES.map((p) => {
      const cells = [];
      for (let n = p.from; n <= p.to; n++) {
        const k = keyForDay(n);
        const total = C().habits.length || 1;
        const ratio = doneCount(k) / total;
        let cls = "cell";
        if (n > today) cls += " future";
        else if (ratio >= 1) cls += " l3";
        else if (ratio >= 0.5) cls += " l2";
        else if (ratio > 0) cls += " l1";
        else if (n < today) cls += " missed";
        if (n === today) cls += " today";
        cells.push(`<button class="${cls}" data-day="${n}" ${n > today ? "disabled" : ""}>${n}</button>`);
      }
      const ok = Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i)
        .filter((n) => n <= today && isPerfect(keyForDay(n))).length;
      return `
        <div class="card phase-block">
          <div class="phase-head">
            <b><span style="color:${p.color}">●</span> Phase ${p.n} · ${p.name}</b>
            <span class="small">Day ${p.from}–${p.to} · ${ok}/22 perfect</span>
          </div>
          <div class="grid">${cells.join("")}</div>
        </div>`;
    }).join("");

    view.innerHTML = `
      <h1>Your Journey</h1>
      <p class="sub">Started ${fmtDate(C().startDate)} · ends ${fmtDate(keyForDay(LEN))}</p>
      <div class="stats">
        <div class="stat"><div class="v">${s.perfect}</div><div class="k">Perfect days</div></div>
        <div class="stat"><div class="v">🔥 ${s.cur}</div><div class="k">Streak</div></div>
        <div class="stat"><div class="v">${s.best}</div><div class="k">Best streak</div></div>
      </div>
      ${blocks}
      <div class="legend">
        <span><i style="background:var(--accent)"></i>All done</span>
        <span><i style="background:rgba(255,140,66,.55)"></i>Half+</span>
        <span><i style="background:rgba(255,140,66,.25)"></i>Some</span>
        <span><i style="background:rgba(255,107,107,.25)"></i>Missed</span>
      </div>
      <h2>Per habit</h2>
      <div class="card">
        ${C().habits.map((h) => {
          const p = habitPct(h, s.elapsed);
          return `<div class="habit-row"><span class="emoji">${esc(h.emoji)}</span>
            <div style="flex:1"><div class="small" style="color:var(--text);margin-bottom:4px">${esc(h.name)}</div>
            <div class="bar"><div style="width:${p}%"></div></div></div>
            <span class="pct">${p}%</span></div>`;
        }).join("")}
      </div>
      ${state.history.length ? `<h2>Past challenges</h2><div class="card">${state.history.slice().reverse().map((h) => `
        <div class="list-item"><div><b>${esc(h.habits.join(", "))}</b><div class="small">${fmtDate(h.startDate)} · ${h.perfect} perfect days</div></div><span>${h.pct}%</span></div>`).join("")}</div>` : ""}
    `;
    view.querySelectorAll("[data-day]").forEach((b) => (b.onclick = () => openDay(keyForDay(+b.dataset.day))));
  }

  function openDay(k) {
    const n = dayNumber(k);
    const draw = () => {
      openSheet(`
        <h2 style="margin-top:0">Day ${n} <span class="small">· ${fmtDate(k)}</span></h2>
        <div id="sheet-habits">${habitButtons(k)}</div>
        <h2>Note</h2>
        <textarea class="input" id="note" placeholder="How did it go? What helped, what was hard?">${esc(entry(k).note || "")}</textarea>
        <div style="height:12px"></div>
        <button class="btn" id="done-btn">Done</button>
      `);
      bindHabitButtons($("#sheet-panel"), k, () => { saveNote(); draw(); });
      $("#done-btn").onclick = () => { saveNote(); closeSheet(); };
    };
    const saveNote = () => {
      const t = $("#note");
      if (!t) return;
      state.log[k] = { ...entry(k), note: t.value.trim() };
      save();
    };
    onSheetClose = () => { saveNote(); render(); };
    draw();
  }

  function renderSettings() {
    view.innerHTML = `
      <h1>Settings</h1>
      <p class="sub">Day ${Math.min(dayNumber(), LEN)} of ${LEN}</p>

      <h2>Habits</h2>
      <div class="card" id="habit-edit">
        ${C().habits.map((h) => `
          <div class="field" data-id="${h.id}">
            <input class="input emoji-in" value="${esc(h.emoji)}" maxlength="4" data-k="emoji" />
            <input class="input" value="${esc(h.name)}" maxlength="40" data-k="name" />
            <button class="icon-btn" data-del="${h.id}" aria-label="Remove">✕</button>
          </div>`).join("")}
        ${C().habits.length < MAX_HABITS ? `<button class="btn secondary" id="add-habit">+ Add habit</button>` : ""}
      </div>

      <h2>Start date</h2>
      <div class="card">
        <input type="date" class="input" id="start" value="${C().startDate}" style="width:100%" />
        <p class="small" style="margin:8px 0 0">Changing this shifts which day is "Day 1". Your checks stay on their calendar dates.</p>
      </div>

      <h2>Backup</h2>
      <div class="card">
        <button class="btn secondary" id="export">⬇︎ Export data</button>
        <button class="btn secondary" id="import">⬆︎ Import data</button>
        <input type="file" id="file" accept="application/json,.json" hidden />
        <p class="small" style="margin:8px 0 0">Data is stored only on this device. Export now and then so you never lose your progress.</p>
      </div>

      <h2>Challenge</h2>
      <div class="card">
        <button class="btn danger" id="restart">↺ Restart 66 days</button>
      </div>
      <p class="small" style="text-align:center">Reset 66 · made for you</p>
    `;

    view.querySelectorAll("#habit-edit .field").forEach((row) => {
      row.querySelectorAll("input").forEach((inp) => {
        inp.onchange = () => {
          const h = C().habits.find((x) => x.id === row.dataset.id);
          const v = inp.value.trim();
          if (inp.dataset.k === "name" && !v) { inp.value = h.name; return; }
          h[inp.dataset.k] = v || "•";
          save();
          toast("Saved");
        };
      });
    });
    view.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      if (C().habits.length <= 1) return toast("Keep at least one habit");
      const h = C().habits.find((x) => x.id === b.dataset.del);
      if (!confirm(`Remove "${h.name}"?`)) return;
      C().habits = C().habits.filter((x) => x.id !== h.id);
      save(); renderSettings();
    }));
    const add = $("#add-habit");
    if (add) add.onclick = () => {
      C().habits.push({ id: uid(), emoji: "⭐️", name: "New habit" });
      save(); renderSettings();
      const inputs = view.querySelectorAll('#habit-edit input[data-k="name"]');
      const last = inputs[inputs.length - 1];
      last.focus(); last.select();
    };
    $("#start").onchange = (e) => {
      if (!e.target.value) return;
      C().startDate = e.target.value; save(); toast("Start date updated");
    };
    $("#export").onclick = exportData;
    $("#import").onclick = () => $("#file").click();
    $("#file").onchange = importData;
    $("#restart").onclick = () => {
      if (!confirm("Start a new 66-day challenge? Your current one is saved to history.")) return;
      archive();
      state.challenge = null;
      save(); render();
    };
  }

  function archive() {
    if (!C()) return;
    const s = stats();
    state.history.push({ startDate: C().startDate, habits: C().habits.map((h) => `${h.emoji} ${h.name}`), perfect: s.perfect, pct: s.pct, best: s.best });
  }

  function renderNotStarted() {
    const d = -dayNumber() + 1;
    view.innerHTML = `
      <div class="welcome">
        <div class="big">${d}</div>
        <h1>day${d === 1 ? "" : "s"} to go</h1>
        <p class="sub">Your challenge starts ${fmtDate(C().startDate)}.</p>
        <div class="card" style="text-align:left">${C().habits.map((h) => `<div class="list-item"><span>${esc(h.emoji)} ${esc(h.name)}</span></div>`).join("")}</div>
      </div>`;
  }

  function renderFinished() {
    const s = stats();
    view.innerHTML = `
      <div class="welcome">
        <div class="big">66</div>
        <h1>You did it.</h1>
        <p class="sub">66 days of showing up. That's not a challenge anymore — that's who you are.</p>
        <div class="stats">
          <div class="stat"><div class="v">${s.perfect}</div><div class="k">Perfect days</div></div>
          <div class="stat"><div class="v">${s.best}</div><div class="k">Best streak</div></div>
          <div class="stat"><div class="v">${s.pct}%</div><div class="k">Done</div></div>
        </div>
        <button class="btn" id="again">Start a new 66 days</button>
        <button class="btn secondary" id="see">See my journey</button>
      </div>`;
    $("#again").onclick = () => { archive(); state.challenge = null; save(); render(); };
    $("#see").onclick = () => { tab = "journey"; render(); };
    confetti();
  }

  // ---------- Onboarding ----------
  let draft = null;
  function renderOnboarding(step = draft ? draft.step : 0) {
    if (!draft) draft = { step: 0, habits: [], start: todayKey() };
    draft.step = step;
    if (step === 0) {
      view.innerHTML = `
        <div class="welcome">
          <div class="big">66</div>
          <h1>Reset your life in 66 days</h1>
          <p class="sub">Research suggests it takes about 66 days for a new behaviour to become automatic.</p>
          <div class="steps">
            ${PHASES.map((p) => `<div class="s"><div class="n" style="background:${p.color}">${p.n}</div>
              <div><b>${p.name}</b> <span class="small">· day ${p.from}–${p.to}</span><div class="small">${p.hint}</div></div></div>`).join("")}
          </div>
          <button class="btn" id="next">Let's start</button>
          ${state.history.length ? "" : `<button class="btn secondary" id="imp">Restore from backup</button><input type="file" id="file" accept="application/json,.json" hidden />`}
        </div>`;
      $("#next").onclick = () => renderOnboarding(1);
      const imp = $("#imp");
      if (imp) { imp.onclick = () => $("#file").click(); $("#file").onchange = importData; }
      return;
    }
    if (step === 1) {
      view.innerHTML = `
        <h1>Choose your habits</h1>
        <p class="sub">Pick 1–${MAX_HABITS}. Fewer is better — focus wins.</p>
        <div id="list">${draft.habits.map((h, i) => `
          <div class="field">
            <input class="input emoji-in" value="${esc(h.emoji)}" maxlength="4" data-i="${i}" data-k="emoji" />
            <input class="input" value="${esc(h.name)}" maxlength="40" data-i="${i}" data-k="name" placeholder="Habit name" />
            <button class="icon-btn" data-rm="${i}">✕</button>
          </div>`).join("")}</div>
        ${draft.habits.length < MAX_HABITS ? `
          <div class="field">
            <input class="input emoji-in" id="new-emoji" value="⭐️" maxlength="4" />
            <input class="input" id="new-name" maxlength="40" placeholder="Type your own habit…" />
            <button class="icon-btn" id="add" style="color:var(--accent)">＋</button>
          </div>
          <p class="small">Or tap a suggestion:</p>
          <div class="chips">${SUGGESTIONS.filter(([, n]) => !draft.habits.some((h) => h.name === n))
            .map(([e, n]) => `<button class="chip" data-e="${e}" data-n="${esc(n)}">${e} ${esc(n)}</button>`).join("")}</div>` : ""}
        <button class="btn" id="next" ${draft.habits.length ? "" : "disabled"}>Continue</button>
        <button class="btn secondary" id="back">Back</button>`;
      const addHabit = (emoji, name) => {
        name = name.trim();
        if (!name || draft.habits.length >= MAX_HABITS) return;
        draft.habits.push({ id: uid(), emoji: emoji.trim() || "⭐️", name });
        renderOnboarding(1);
      };
      view.querySelectorAll("[data-i]").forEach((inp) => (inp.oninput = () => { draft.habits[+inp.dataset.i][inp.dataset.k] = inp.value; }));
      view.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { draft.habits.splice(+b.dataset.rm, 1); renderOnboarding(1); }));
      view.querySelectorAll(".chip").forEach((b) => (b.onclick = () => addHabit(b.dataset.e, b.dataset.n)));
      const add = $("#add");
      if (add) {
        add.onclick = () => addHabit($("#new-emoji").value, $("#new-name").value);
        $("#new-name").onkeydown = (e) => { if (e.key === "Enter") add.click(); };
      }
      $("#next").onclick = () => {
        draft.habits = draft.habits.filter((h) => h.name.trim());
        if (draft.habits.length) renderOnboarding(2);
      };
      $("#back").onclick = () => renderOnboarding(0);
      return;
    }
    if (step === 2) {
      view.innerHTML = `
        <h1>When do you start?</h1>
        <p class="sub">Day 1 can be today, or pick a date. You can backfill earlier days later.</p>
        <div class="card">
          <input type="date" class="input" id="start" value="${draft.start}" style="width:100%" />
        </div>
        <div class="card">
          ${draft.habits.map((h) => `<div class="list-item"><span>${esc(h.emoji)} ${esc(h.name)}</span></div>`).join("")}
        </div>
        <button class="btn" id="go">Begin day 1 🚀</button>
        <button class="btn secondary" id="back">Back</button>`;
      $("#start").onchange = (e) => { if (e.target.value) draft.start = e.target.value; };
      $("#back").onclick = () => renderOnboarding(1);
      $("#go").onclick = () => {
        state.challenge = {
          startDate: draft.start,
          habits: draft.habits.map((h) => ({ id: h.id, emoji: h.emoji.trim() || "⭐️", name: h.name.trim() })),
        };
        draft = null;
        tab = "today";
        save(); render();
      };
    }
  }

  // ---------- Backup ----------
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const file = new File([blob], `reset66-backup-${todayKey()}.json`, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Reset 66 backup" }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importData(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    f.text().then((txt) => {
      const s = JSON.parse(txt);
      if (!s || typeof s !== "object" || !("log" in s)) throw new Error("bad file");
      if (!confirm("Replace all current data with this backup?")) return;
      state = Object.assign(blank(), s);
      save(); tab = "today"; draft = null; render(); toast("Backup restored");
    }).catch(() => toast("That file isn't a valid backup"));
  }

  // ---------- UI bits ----------
  let onSheetClose = null;
  function openSheet(html) {
    $("#sheet-panel").innerHTML = html;
    $("#sheet").classList.remove("hidden");
  }
  function closeSheet() {
    $("#sheet").classList.add("hidden");
    const cb = onSheetClose; onSheetClose = null;
    if (cb) cb();
  }
  $("#sheet").addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closeSheet(); });

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function confetti() {
    const box = $("#confetti");
    const colors = ["#ff8c42", "#ffb26b", "#4ade80", "#ff6b6b", "#f3f4fa", "#7c83ff"];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.4 + Math.random() * 1.6 + "s";
      p.style.animationDelay = Math.random() * 0.3 + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
      setTimeout(() => p.remove(), 3500);
    }
  }

  tabbar.querySelectorAll("button").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));

  // Re-render when the app comes back to the foreground (the day may have changed).
  let lastDay = todayKey();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && todayKey() !== lastDay) { lastDay = todayKey(); render(); }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  render();
})();
