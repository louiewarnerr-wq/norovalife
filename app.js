const STORAGE_KEY = "norovalife_save_v02";
const SETTINGS_KEY = "norovalife_settings_v02";

let db = { events: [], traits: [] };
let state = null;
let settings = { haptics: true, hardMode: false };

const $ = (id) => document.getElementById(id);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function showFatal(msg){
  alert(msg);
  const sub = $("subline");
  if(sub) sub.textContent = "ERROR: " + msg;
}

function vib(){
  try{
    if (settings.haptics && "vibrate" in navigator) navigator.vibrate(20);
  }catch{}
}

function randomName(){
  const names = ["Alex","Jamie","Taylor","Jordan","Sam","Avery","Morgan","Riley","Casey","Harper"];
  return names[Math.floor(Math.random()*names.length)];
}

function createPerson(type, ageOffset = 0){
  return {
    id: crypto.randomUUID(),
    name: randomName(),
    type: type, // mother, father, friend, partner, child
    age: Math.max(0, state.age + ageOffset),
    closeness: 60,
    trust: 60,
    respect: 60
  };
}

function defaultState(){
  return {
    name: "",
    country: "UK",
    trait: "charming",
    age: 0,
    alive: true,

    stats: {
      health: 80,
      mentalHealth: 80,
      happiness: 80,
      intelligence: 50,
      looks: 50,
      fitness: 50,
      discipline: 50,
      confidence: 50,
      money: 0,
      reputation: 50,
      karma: 50,
      stress: 20
    },

    relationships: [],

    flags: {},

    lastEventId: null
  };
}

function saveSettings(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(raw) settings = { ...settings, ...JSON.parse(raw) };
  }catch{}
  if($("toggleHaptics")) $("toggleHaptics").checked = !!settings.haptics;
  if($("toggleHardMode")) $("toggleHardMode").checked = !!settings.hardMode;
}

function saveGame(){
  if(!state) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if($("saveHint")) $("saveHint").textContent = `Saved • ${new Date().toLocaleString()}`;
}
function loadGame(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}
function resetGame(){
  localStorage.removeItem(STORAGE_KEY);
  state = null;
  showSetup();
}

function showSetup(){
  $("setupCard")?.classList.remove("hidden");
  $("gameCard")?.classList.add("hidden");
  if($("subline")) $("subline").textContent = "Life sim • v0.2";
}
function showGame(){
  $("setupCard")?.classList.add("hidden");
  $("gameCard")?.classList.remove("hidden");
  renderProfile();
  renderStats();
  if($("saveHint")) $("saveHint").textContent = "Autosaves after each year.";
}

function renderProfile(){
  if(!$("whoLine") || !$("metaLine")) return;
  $("whoLine").textContent = `${state.name} • Age ${state.age}`;
  const traitName = (db.traits.find(t=>t.id===state.trait)?.name) || state.trait;
  $("metaLine").textContent = `${state.country} • Trait: ${traitName}`;
}

function statBarPct(key){
  const s = state.stats[key];
  if(key === "money") return clamp(Math.round((s/5000)*100), 0, 100);
  return clamp(s, 0, 100);
}

function renderStats(){
  const grid = $("statsGrid");
  if(!grid) return;

  const stats = [
    ["health","Health"],
    ["happiness","Happiness"],
    ["smarts","Smarts"],
    ["looks","Looks"],
    ["money","Money"],
    ["karma","Karma"],
  ];

  grid.innerHTML = stats.map(([k,label])=>{
    const val = state.stats[k];
    const pct = statBarPct(k);
    return `
      <div class="stat">
        <div class="statTop">
          <span>${label}</span>
          <span>${k==="money" ? (state.country==="UK"?"£":"$")+val : val}</span>
        </div>
        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");
}

function formatText(t){
  return (t||"").replaceAll("{country}", state.country).replaceAll("{name}", state.name);
}

function meetsRequirements(ev){
  const req = ev.requirements || {};
  const st = state.stats;
  if(typeof req.minMoney === "number" && st.money < req.minMoney) return false;
  if(typeof req.maxMoney === "number" && st.money > req.maxMoney) return false;
  if(typeof req.minKarma === "number" && st.karma < req.minKarma) return false;
  if(typeof req.maxKarma === "number" && st.karma > req.maxKarma) return false;
  return true;
}

function traitBoostForEvent(ev){
  const tr = db.traits.find(t=>t.id===state.trait);
  if(!tr) return 1;
  const tags = ev.tags || [];
  const boostTags = tr.boostTags || [];
  const hits = tags.filter(tag => boostTags.includes(tag)).length;
  return 1 + hits * 0.35;
}

function pickEvent(){
  const age = state.age;
  const candidates = db.events
    .filter(ev => age >= ev.ageMin && age <= ev.ageMax)
    .filter(meetsRequirements)
    .filter(ev => ev.id !== state.lastEventId);

  const list = candidates.length ? candidates : db.events;
  if(!list.length) return null;

  let total = 0;
  const weighted = list.map(ev=>{
    const base = (typeof ev.weight === "number" ? ev.weight : 10);
    const w = base * traitBoostForEvent(ev);
    total += w;
    return { ev, w };
  });

  let r = Math.random() * total;
  for(const item of weighted){
    r -= item.w;
    if(r <= 0) return item.ev;
  }
  return weighted[weighted.length-1].ev;
}

function applyEffects(effects){
  if(!effects) return;
  const mult = settings.hardMode ? 1.15 : 1.0;
  for(const [k,v] of Object.entries(effects)){
    if(!(k in state.stats)) continue;
    if(k === "money"){
      state.stats.money = Math.round(state.stats.money + v);
    }else{
      const val = (v < 0) ? Math.round(v * mult) : v;
      state.stats[k] = clamp(state.stats[k] + val, 0, 100);
    }
  }
}

function checkDeath(){
  if(state.stats.health <= 0){
    state.alive = false;
    if($("eventTitle")) $("eventTitle").textContent = "You died";
    if($("eventText")) $("eventText").textContent = "Your health reached 0. Your story ends here.";
    if($("choices")){
      $("choices").innerHTML = `<button class="choiceBtn" id="btnRestart">Start a new life</button>`;
      $("btnRestart").onclick = resetGame;
    }
    return true;
  }
  return false;
}

function showEvent(ev){
  if(!ev) return;
  state.lastEventId = ev.id;

  if($("eventTitle")) $("eventTitle").textContent = ev.title || "Event";
  if($("eventText")) $("eventText").textContent = formatText(ev.text || "");
  if($("eventBadge")){
    const tag = (ev.tags && ev.tags[0]) ? ev.tags[0] : "Event";
    $("eventBadge").textContent = tag.toUpperCase();
  }

  const choicesWrap = $("choices");
  if(!choicesWrap) return;

  choicesWrap.innerHTML = (ev.choices || []).map((c, idx)=>(
    `<button class="choiceBtn" data-idx="${idx}">${c.label}</button>`
  )).join("");

  [...choicesWrap.querySelectorAll("button")].forEach(btn=>{
    btn.addEventListener("click", ()=>{
      vib();
      const idx = Number(btn.dataset.idx);
      const choice = ev.choices[idx];
      applyEffects(choice.effects);
      renderProfile();
      renderStats();
      if(!checkDeath()){
        saveGame();
      }
    });
  });
}

function ageUp(){
  if(!state?.alive) return;
  state.age += 1;

  state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);
  if(state.age > 35) state.stats.health = clamp(state.stats.health - 1, 0, 100);

  const ev = pickEvent();
  showEvent(ev);

  renderProfile();
  renderStats();
  saveGame();
}

function buildTraitPicker(){
  const row = $("traitRow");
  if(!row) return;

  row.innerHTML = "";
  db.traits.forEach((tr, i)=>{
    const el = document.createElement("button");
    el.type = "button";
    el.className = "pill" + (i===0 ? " active" : "");
    el.textContent = tr.name;
    el.onclick = ()=>{
      [...row.querySelectorAll(".pill")].forEach(p=>p.classList.remove("active"));
      el.classList.add("active");
      row.dataset.selected = tr.id;
    };
    row.appendChild(el);
  });
  if(db.traits[0]) row.dataset.selected = db.traits[0].id;
}

async function loadDB(){
  const res = await fetch("events.json", { cache: "no-store" });
  if(!res.ok) throw new Error("events.json not found (status " + res.status + ")");
  db = await res.json();
  if(!db.events || !Array.isArray(db.events)) throw new Error("events.json missing 'events' array");
  if(!db.traits || !Array.isArray(db.traits)) db.traits = [];
}

function wireUI(){
  if($("year")) $("year").textContent = new Date().getFullYear();

  $("btnAge").onclick = ageUp;
  $("btnSave").onclick = saveGame;
  $("btnReset").onclick = resetGame;

  $("btnSettings").onclick = ()=> $("settingsModal")?.classList.remove("hidden");
  $("btnCloseSettings").onclick = ()=> $("settingsModal")?.classList.add("hidden");
  $("settingsModal")?.addEventListener("click", (e)=>{
    if(e.target === $("settingsModal")) $("settingsModal").classList.add("hidden");
  });

  $("toggleHaptics").onchange = (e)=>{ settings.haptics = e.target.checked; saveSettings(); };
  $("toggleHardMode").onchange = (e)=>{ settings.hardMode = e.target.checked; saveSettings(); };

  $("btnDemo").onclick = ()=>{
    if($("nameInput")) $("nameInput").value = ["Nova","Noah","Ava","Mila","Kai"][Math.floor(Math.random()*5)];
    if($("countryInput")) $("countryInput").value = ["UK","USA","Canada","Nigeria","Japan"][Math.floor(Math.random()*5)];
  };

  $("btnStart").onclick = ()=>{
    const name = $("nameInput").value.trim();
    if(!name){ alert("Add a name first."); return; }

    state = defaultState();
    // Generate parents
state.relationships.push(createPerson("mother", 25));
state.relationships.push(createPerson("father", 27));
    state.name = name;
    state.country = $("countryInput").value;
    state.trait = $("traitRow").dataset.selected || (db.traits[0]?.id || "charming");

    showGame();

    const born = db.events.find(e=>e.ageMin===0 && e.ageMax===0) || pickEvent();
    showEvent(born);
    saveGame();
  };
}

(async function init(){
  try{
    loadSettings();
    await loadDB();
    buildTraitPicker();
    wireUI();

    const existing = loadGame();
    if(existing){
      state = existing;
      showGame();
      if($("eventTitle")) $("eventTitle").textContent = "Welcome back";
      if($("eventText")) $("eventText").textContent = "Press AGE to continue your life.";
      if($("choices")) $("choices").innerHTML = "";
    }else{
      showSetup();
    }
  }catch(err){
    console.error(err);
    showFatal(String(err.message || err));
  }
})();
