/* NorovaLife Core Engine - Stable Build */

const STORAGE_KEY = "norovalife_save_v1";

let db = { events: [], traits: [] };
let state = null;

const $ = (id) => document.getElementById(id);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const rand = () => Math.random();

function defaultState() {
  return {
    name: "",
    country: "United Kingdom",
    age: 0,
    alive: true,
    stats: {
      health: 80,
      happiness: 80,
      intelligence: 50,
      looks: 50,
      money: 0,
      karma: 50
    },
    relationships: [],
    lastEventId: null
  };
}

/* ---------------- SAVE ---------------- */

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

/* ---------------- DATA LOAD ---------------- */

async function loadDB() {
  const res = await fetch("/events.json");
  if (!res.ok) throw new Error("events.json not found");
  db = await res.json();
}

/* ---------------- RENDER ---------------- */

function renderProfile() {
  $("whoLine").textContent = `${state.name} • Age ${state.age}`;
  $("metaLine").textContent = `${state.country}`;
  $("moneyLine").textContent = "£" + state.stats.money;
}

function renderStats() {
  const stats = [
    ["health", "Health"],
    ["happiness", "Happiness"],
    ["intelligence", "Smarts"],
    ["looks", "Looks"],
    ["money", "Money"],
    ["karma", "Karma"]
  ];

  $("statsGrid").innerHTML = stats.map(([k, label]) => {
    const val = state.stats[k];
    const pct = k === "money" ? clamp(val / 5000 * 100, 0, 100) : val;
    return `
      <div class="statRow">
        <div class="statName">${label}</div>
        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        <div class="statVal">${k === "money" ? "£"+val : val}</div>
      </div>
    `;
  }).join("");
}

/* ---------------- RELATIONSHIPS ---------------- */

function createParent(type) {
  return {
    id: crypto.randomUUID(),
    name: type === "mother" ? "Mother" : "Father",
    type,
    closeness: 60,
    trust: 60,
    respect: 60
  };
}

function renderRelationships() {
  const c = $("relationshipsList");
  if (!c) return;

  if (!state.relationships.length) {
    c.innerHTML = "<div class='muted'>No relationships.</div>";
    return;
  }

  c.innerHTML = state.relationships.map(r => `
    <div class="relCard">
      <b>${r.name}</b>
      <div>Closeness: ${r.closeness}</div>
      <div>Trust: ${r.trust}</div>
      <button data-id="${r.id}" class="relBtn">Spend Time</button>
    </div>
  `).join("");

  c.querySelectorAll(".relBtn").forEach(btn => {
    btn.onclick = () => {
      const p = state.relationships.find(x => x.id === btn.dataset.id);
      p.closeness = clamp(p.closeness + 5, 0, 100);
      p.trust = clamp(p.trust + 3, 0, 100);
      state.stats.happiness = clamp(state.stats.happiness + 2, 0, 100);
      renderRelationships();
      renderStats();
      saveGame();
    };
  });
}

/* ---------------- EVENTS ---------------- */

function pickEvent() {
  const available = db.events.filter(e =>
    state.age >= e.ageMin &&
    state.age <= e.ageMax &&
    e.id !== state.lastEventId
  );

  return available[Math.floor(Math.random() * available.length)];
}

function applyEffects(effects) {
  for (const key in effects) {
    if (key === "money") {
      state.stats.money += effects[key];
      continue;
    }
    state.stats[key] = clamp(state.stats[key] + effects[key], 0, 100);
  }
}

function showEvent(ev) {
  state.lastEventId = ev.id;

  $("eventTitle").textContent = ev.title;
  $("eventText").textContent = ev.text.replace("{country}", state.country);

  const wrap = $("choices");

  wrap.innerHTML = ev.choices.map((c, i) =>
    `<button class="choiceBtn" data-i="${i}">${c.label}</button>`
  ).join("");

  wrap.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      wrap.querySelectorAll("button").forEach(b => b.disabled = true);

      const choice = ev.choices[btn.dataset.i];
      applyEffects(choice.effects);

      renderProfile();
      renderStats();

      wrap.innerHTML = `
        <button class="choiceBtn" id="continueBtn">Continue</button>
      `;

      $("continueBtn").onclick = () => {
        $("eventTitle").textContent = "Life";
        $("eventText").textContent = "Press Age to continue.";
        wrap.innerHTML = "";
      };

      saveGame();
    };
  });
}

/* ---------------- AGE UP ---------------- */

function ageUp() {
  if (!state.alive) return;

  state.age += 1;
  state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);

  const ev = pickEvent();
  showEvent(ev);

  renderProfile();
  renderStats();
  renderRelationships();
  saveGame();
}

/* ---------------- INIT ---------------- */

async function init() {
  await loadDB();

  const existing = loadGame();

  if (existing) {
    state = existing;
  } else {
    state = defaultState();
    state.relationships.push(createParent("mother"));
    state.relationships.push(createParent("father"));
  }

  renderProfile();
  renderStats();
  renderRelationships();

  $("btnAge").onclick = ageUp;
}

init();
