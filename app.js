const STORAGE_KEY = "norovalife_save_v02";
const SETTINGS_KEY = "norovalife_settings_v02";

let db = { events: [], traits: [] };
let state = null;
let settings = { haptics: true, hardMode: false };

const $ = (id) => document.getElementById(id);

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function rndInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function vib(){
  try{
    if (settings.haptics && "vibrate" in navigator) navigator.vibrate(20);
  }catch{}
}

function defaultState(){
  return {
    name: "",
    country: "UK",
    trait: "charming",
    age: 0,
    alive: true,
    stats: { health: 80, happiness: 80, smarts: 50, looks: 50, money: 0, karma: 50 },
    lastEventId: null
  };
}

function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(raw) settings = { ...settings, ...JSON.parse(raw) };
  }catch{}
  $("toggleHaptics").checked = !!settings.haptics;
  $("toggleHardMode").checked = !!settings.hardMode;
}
function saveSettings(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function saveGame(){
  if(!state) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $("saveHint").textContent = `Saved • ${new Date().toLocaleString()}`;
}
function loadGame(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}
function resetGame(){
  localStorage.removeItem(STORAGE_KEY);
  state = null;
  showSetup();
}

function showSetup(){
  $("setupCard").classList.remove("hidden");
  $("gameCard").classList.add("hidden");
  $("subline").textContent = "Life simulator (starter)";
}
function showGame(){
  $("setupCard").classList.add("hidden");
  $("gameCard").classList.remove("hidden");
  renderProfile();
  renderStats();
  $("saveHint").textContent = "Autosaves after each year.";
}

function renderProfile(){
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
  const stats = [
    ["health","Health"],
    ["happiness","Happiness"],
    ["smarts","Smarts"],
    ["looks","Looks"],
    ["money","Money"],
    ["karma","Karma"],
  ];

  $("statsGrid").innerHTML = stats.map(([k,label])=>{
    const val = state.stats[k];
    const pct = statBarPct(k);
    return `
      <div class="stat">
        <div class="statTop"><span>${label}</span><span>${k==="money" ? "$"+val : val}</span></div>
        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");
}

function formatText(t){
  return t.replaceAll("{country}", state.country).replaceAll("{name}", state.name);
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
  // each matching tag boosts weight a bit
  return 1 + hits * 0.35;
}

function hardModeMultiplier(ev){
  // Hard mode doesn’t change event selection, only effects slightly later
  return settings.hardMode ? 1.15 : 1.0;
}

function pickEvent(){
  const age = state.age;
  const candidates = db.events
    .filter(ev => age >= ev.ageMin && age <= ev.ageMax)
    .filter(meetsRequirements)
    .filter(ev => ev.id !== state.lastEventId); // avoid immediate repeats

  // fallback
  const list = candidates.length ? candidates : db.events;

  // weighted pick
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
  const mult = hardModeMultiplier();
  for(const [k,v] of Object.entries(effects)){
    if(!(k in state.stats)) continue;
    if(k === "money"){
      state.stats.money = Math.round(state.stats.money + v);
    }else{
      // make hard mode harsher by scaling negatives a bit
      const val = (v < 0) ? Math.round(v * mult) : v;
      state.stats[k] = clamp(state.stats[k] + val, 0, 100);
    }
  }
}

function checkDeath(){
  if(state.stats.health <= 0){
    state.alive = false;
    $("eventTitle").textContent = "You died";
    $("eventText").textContent = "Your health reached 0. Your story ends here.";
    $("choices").innerHTML = `
      <button class="choiceBtn" id="btnRestart">Start a new life</button>
    `;
    $("btnRestart").onclick = () => resetGame();
    return true;
  }
  return false;
}

function showEvent(ev){
  state.lastEventId = ev.id;
  $("eventTitle").textContent = ev.title;
  $("eventText").textContent = formatText(ev.text);

  $("choices").innerHTML = ev.choices.map((c, idx)=>(
    `<button class="choiceBtn" data-idx="${idx}">${c.label}</button>`
  )).join("");

  [...$("choices").querySelectorAll("button")].forEach(btn=>{
    btn.addEventListener("click", ()=>{
      vib();
      const idx = Number(btn.dataset.idx);
      const choice = ev.choices[idx];
      applyEffects(choice.effects);
      renderProfile();
      renderStats();
      if(!checkDeath()){
        // small “after choice” message
        $("eventText").textContent = formatText(ev.text) + " (Choice made.)";
        // autosave after resolving
        saveGame();
      }
    });
  });
}

function ageUp(){
  if(!state?.alive) return;
  state.age += 1;

  // small passive drift
  state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);
  if(state.age > 35) state.stats.health = clamp(state.stats.health - 1, 0, 100);

  const ev = pickEvent();
  showEvent(ev);

  renderProfile();
  renderStats();

  // autosave each year too
  saveGame();
}

function buildTraitPicker(){
  const row = $("traitRow");
  row.innerHTML = "";
  db.traits.forEach(tr=>{
    const el = document.createElement("button");
    el.className = "pill";
    el.textContent = tr.name;
    el.onclick = ()=>{
      [...row.querySelectorAll(".pill")].forEach(p=>p.classList.remove("active"));
      el.classList.add("active");
      $("traitRow").dataset.selected = tr.id;
    };
    row.appendChild(el);
  });
  // default active
  const first = row.querySelector(".pill");
  if(first){
    first.classList.add("active");
    row.dataset.selected = db.traits[0].id;
  }
}

async function loadDB(){
  const res = await fetch("events.json", { cache: "no-store" });
  db = await res.json();
}

function wireUI(){
  $("year").textContent = new Date().getFullYear();

  $("btnAge").onclick = ageUp;

  $("btnSave").onclick = saveGame;
  $("btnReset").onclick = resetGame;

  $("btnSettings").onclick = ()=> $("settingsModal").classList.remove("hidden");
  $("btnCloseSettings").onclick = ()=> $("settingsModal").classList.add("hidden");
  $("settingsModal").addEventListener("click", (e)=>{
    if(e.target === $("settingsModal")) $("settingsModal").classList.add("hidden");
  });

  $("toggleHaptics").onchange = (e)=>{ settings.haptics = e.target.checked; saveSettings(); };
  $("toggleHardMode").onchange = (e)=>{ settings.hardMode = e.target.checked; saveSettings(); };

  $("btnDemo").onclick = ()=>{
    $("nameInput").value = ["Nova","Noah","Ava","Mila","Kai"][rndInt(0,4)];
    $("countryInput").value = ["UK","USA","Canada","Nigeria","Japan"][rndInt(0,4)];
  };

  $("btnStart").onclick = ()=>{
    const name = $("nameInput").value.trim();
    if(!name){
      alert("Add a name first.");
      return;
    }
    state = defaultState();
    state.name = name;
    state.country = $("countryInput").value;
    state.trait = $("traitRow").dataset.selected || db.traits[0]?.id || "charming";

    showGame();
    // show birth event immediately
    const born = db.events.find(e=>e.ageMin===0 && e.ageMax===0) || pickEvent();
    showEvent(born);
    saveGame();
  };
}

(async function init(){
  loadSettings();
  await loadDB();
  buildTraitPicker();
  wireUI();

  const existing = loadGame();
  if(existing){
    state = existing;
    showGame();
    renderProfile();
    renderStats();
    $("eventTitle").textContent = "Welcome back";
    $("eventText").textContent = "Press AGE to continue your life.";
    $("choices").innerHTML = "";
  }else{
    showSetup();
  }
})();
