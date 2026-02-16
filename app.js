/* NorovaLife Engine (BitLife-like UI, different vibe)
   - No fetch: data loaded via data/*.js (Vercel-proof)
   - Event lifecycle: event resolves after 1 choice (no spam)
   - Relationships: parents + friends + actions
   - Scalable event format: requirements, flags, risk, addRelationship
*/

const SAVE_KEY = "norovalife_save_v100";

const $ = (id) => document.getElementById(id);
const clamp = (n,min,max) => Math.max(min, Math.min(max, n));
const rnd = () => Math.random();
const pick = (arr) => arr[Math.floor(rnd()*arr.length)];

let db = window.NOROVA_DATA;
let countries = window.NOROVA_COUNTRIES;

let state = null;

function currencySymbol(){
  return state.country === "United Kingdom" ? "£" : "$";
}
function fmtMoney(n){
  const v = Math.round(Number(n||0));
  return currencySymbol() + v.toLocaleString();
}

/* ---------- State ---------- */
function defaultState(){
  return {
    name: "",
    country: "United Kingdom",
    trait: "charming",
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
    flags: {},
    lastEventId: null
  };
}

function save(msg){
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  if($("saveHint")) $("saveHint").textContent = msg || `Saved • ${new Date().toLocaleString()}`;
}
function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}
function resetAll(){
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

/* ---------- Relationships ---------- */
function makePerson(type){
  const id = (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()+rnd()));
  const names = ["Alex","Jamie","Taylor","Jordan","Sam","Avery","Morgan","Riley","Casey","Harper","Kai","Zara","Amir","Mila","Noah"];
  return {
    id,
    type,
    name: type === "mother" ? "Mother" : type === "father" ? "Father" : pick(names),
    closeness: 60,
    trust: 60,
    respect: 60
  };
}

function ensureParents(){
  const hasMom = state.relationships.some(r=>r.type==="mother");
  const hasDad = state.relationships.some(r=>r.type==="father");
  if(!hasMom) state.relationships.push(makePerson("mother"));
  if(!hasDad) state.relationships.push(makePerson("father"));
}

function addFriend(){
  state.relationships.push(makePerson("friend"));
  toast("You made a new friend.");
  renderRelationships();
  save();
}

function relAction(person, action){
  if(action === "time"){
    person.closeness = clamp(person.closeness+5,0,100);
    person.trust = clamp(person.trust+3,0,100);
    state.stats.happiness = clamp(state.stats.happiness+2,0,100);
  } else if(action === "argue"){
    person.closeness = clamp(person.closeness-6,0,100);
    person.trust = clamp(person.trust-4,0,100);
    state.stats.happiness = clamp(state.stats.happiness-2,0,100);
    state.stats.karma = clamp(state.stats.karma-1,0,100);
  } else if(action === "gift"){
    const cost = 40 + Math.floor(rnd()*140);
    if(state.stats.money < cost){
      toast("You can’t afford a gift.");
      return;
    }
    state.stats.money -= cost;
    person.closeness = clamp(person.closeness+4,0,100);
    person.respect = clamp(person.respect+3,0,100);
    state.stats.happiness = clamp(state.stats.happiness+1,0,100);
  }
  renderAll();
  save();
}

function renderRelationships(){
  const list = $("relationshipsList");
  if(!list) return;

  if(!state.relationships.length){
    list.innerHTML = `<div class="muted">No relationships.</div>`;
    return;
  }

  const bar = (v)=>`<div class="bar"><div class="fill" style="width:${clamp(v,0,100)}%"></div></div>`;

  list.innerHTML = state.relationships.map(r=>`
    <div class="relCard">
      <div class="relTop">
        <div class="relName">${r.name}</div>
        <div class="relType">${r.type}</div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="muted tiny">Closeness</div>
          ${bar(r.closeness)}
          <div class="statVal">${r.closeness}</div>
        </div>
        <div class="stat">
          <div class="muted tiny">Trust</div>
          ${bar(r.trust)}
          <div class="statVal">${r.trust}</div>
        </div>
        <div class="stat">
          <div class="muted tiny">Respect</div>
          ${bar(r.respect)}
          <div class="statVal">${r.respect}</div>
        </div>
      </div>

      <div class="relBtns">
        <button class="btn small" data-act="time" data-id="${r.id}">Spend time</button>
        <button class="btn small" data-act="argue" data-id="${r.id}">Argue</button>
        <button class="btn small" data-act="gift" data-id="${r.id}">Gift</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll("button[data-id]").forEach(btn=>{
    btn.onclick = ()=>{
      const p = state.relationships.find(x=>x.id === btn.dataset.id);
      if(!p) return;
      relAction(p, btn.dataset.act);
    };
  });
}

/* ---------- UI / Nav ---------- */
function show(viewId){
  ["viewSetup","viewLife","viewRelationships","viewActivities"].forEach(id=>{
    $(id).classList.toggle("hidden", id !== viewId);
  });
  document.querySelectorAll(".navBtn").forEach(b=>{
    b.classList.toggle("active", b.dataset.view === viewId);
  });
}

let toastTimer = null;
function toast(msg){
  let el = document.getElementById("norovaToast");
  if(!el){
    el = document.createElement("div");
    el.id = "norovaToast";
    document.body.appendChild(el);
  }
  el.style.cssText = `
    position:fixed; left:50%; bottom:92px; transform:translateX(-50%);
    background:rgba(0,0,0,.75); color:#fff; padding:10px 12px;
    border-radius:14px; font-weight:900; z-index:999; max-width:min(520px,90vw);
    text-align:center;
  `;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.remove(), 1600);
}

/* ---------- Rendering ---------- */
function renderProfile(){
  $("whoLine").textContent = `${state.name} • Age ${state.age}`;
  const traitName = db.traits.find(t=>t.id===state.trait)?.name || state.trait;
  $("metaLine").textContent = `${state.country} • Trait: ${traitName}`;
  $("moneyLine").textContent = fmtMoney(state.stats.money);
}

function statPct(key){
  const v = Number(state.stats[key] || 0);
  if(key === "money") return clamp(Math.round((v/5000)*100), 0, 100);
  return clamp(v, 0, 100);
}

function renderStats(){
  const rows = [
    ["health","Health"],
    ["happiness","Happiness"],
    ["intelligence","Smarts"],
    ["looks","Looks"],
    ["money","Money"],
    ["karma","Karma"]
  ];

  $("statsGrid").innerHTML = rows.map(([k,label])=>{
    const val = state.stats[k] ?? 0;
    const shown = k==="money" ? fmtMoney(val) : String(val);
    return `
      <div class="stat">
        <div class="statName">${label}</div>
        <div class="bar"><div class="fill" style="width:${statPct(k)}%"></div></div>
        <div class="statVal">${shown}</div>
      </div>
    `;
  }).join("");
}

function renderAll(){
  renderProfile();
  renderStats();
  renderRelationships();
  renderMiniRelationships();   // ← ADD IT HERE
}

/* ---------- Event Engine ---------- */
function meetsRequirements(ev){
  const req = ev.requirements || {};
  if(req.flag && !state.flags[req.flag]) return false;
  if(req.minStat){
    for(const [k,v] of Object.entries(req.minStat)){
      if((state.stats[k] ?? 0) < v) return false;
    }
  }
  return true;
}

function traitBoost(ev){
  const tr = db.traits.find(t=>t.id===state.trait);
  if(!tr) return 1;
  const tags = ev.tags || [];
  const boost = tr.boostTags || [];
  const hits = tags.filter(t=>boost.includes(t)).length;
  return 1 + hits*0.35;
}

function pickEvent(){
  const age = state.age;

  // ONLY pick events that match current age
  const pool = db.events
    .filter(e => age >= e.ageMin && age <= e.ageMax)
    .filter(meetsRequirements)
    .filter(e => e.id !== state.lastEventId);

  // If nothing matches, show a neutral filler event instead of falling back to ALL events
  if(pool.length === 0){
    return {
      id: "filler_" + age,
      title: "Another year passes",
      text: "Nothing major happened this year.",
      choices: [{ label: "Continue", effects: {} }]
    };
  }

  // Weighted pick
  let total = 0;
  const weighted = pool.map(e=>{
    const base = (typeof e.weight === "number") ? e.weight : 10;
    const w = base * traitBoost(e);
    total += w;
    return { e, w };
  });

  let r = rnd() * total;
  for(const it of weighted){
    r -= it.w;
    if(r <= 0) return it.e;
  }
  return weighted[weighted.length - 1].e;
}

function applyEffects(effects){
  if(!effects) return;
  for(const [k,v] of Object.entries(effects)){
    if(k === "money"){
      state.stats.money = Math.round((state.stats.money||0) + Number(v||0));
      continue;
    }
    state.stats[k] = clamp((state.stats[k]||0) + Number(v||0), 0, 100);
  }
}

function applyFlags(flags){
  if(!flags) return;
  for(const [k,v] of Object.entries(flags)){
    state.flags[k] = v;
  }
}

function applyRisk(risk){
  if(!risk) return;
  const chance = Number(risk.chance||0);
  if(rnd() < chance){
    if(risk.failText) toast(risk.failText);
    applyEffects(risk.onFail || {});
  }
}

function showEvent(ev){
  state.lastEventId = ev.id;

  $("eventTitle").textContent = ev.title || "Event";
  $("eventText").textContent = (ev.text || "")
    .replaceAll("{country}", state.country)
    .replaceAll("{name}", state.name);

  const wrap = $("choices");
  wrap.innerHTML = (ev.choices || []).map((c,i)=>`
    <button class="choice" data-i="${i}">${c.label}</button>
  `).join("");

  // Each event can only be resolved once
  wrap.querySelectorAll("button").forEach(btn=>{
    btn.onclick = ()=>{
      // lock
      wrap.querySelectorAll("button").forEach(b=>b.disabled=true);

      const choice = ev.choices[Number(btn.dataset.i)];
      applyEffects(choice.effects);
      applyFlags(choice.flags);
      applyRisk(choice.risk);

      // optional: relationship spawn
      if(choice.addRelationship?.type === "friend"){
        state.relationships.push(makePerson("friend"));
        toast("New relationship added.");
      }

      renderAll();

      // resolve event -> replace with continue
      wrap.innerHTML = `<button class="choice" id="btnContinue">Continue</button>`;
      $("btnContinue").onclick = ()=>{
        $("eventTitle").textContent = "Life";
        $("eventText").textContent = "Press Age to continue.";
        wrap.innerHTML = "";
      };

      // death check
      if(state.stats.health <= 0){
        state.alive = false;
        $("eventTitle").textContent = "You died";
        $("eventText").textContent = "Your health reached 0. Game over.";
        wrap.innerHTML = `<button class="choice" id="btnNewLife">Start a new life</button>`;
        $("btnNewLife").onclick = resetAll;
      }

      save();
    };
  });
}

/* ---------- Gameplay ---------- */
function ageUp(){
  if(!state.alive) return;

  state.age += 1;

  // passive drift (makes choices matter)
  state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);
  if(state.age > 35) state.stats.health = clamp(state.stats.health - 1, 0, 100);

  // chance to auto-create a friend at school ages
  if(state.age >= 6 && state.age <= 14 && rnd() < 0.22){
    if(!state.relationships.some(r=>r.type==="friend")){
      state.relationships.push(makePerson("friend"));
      toast("You made a new friend.");
    }
  }

  const ev = pickEvent();
  showEvent(ev);
  renderAll();
  save();
}

function doActivity(kind){
  if(!state.alive) return;

  if(kind==="study"){
    state.stats.intelligence = clamp(state.stats.intelligence + 2, 0, 100);
    state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);
    toast("You studied.");
  }
  if(kind==="workout"){
    state.stats.health = clamp(state.stats.health + 2, 0, 100);
    state.stats.looks = clamp(state.stats.looks + 1, 0, 100);
    toast("You worked out.");
  }
  if(kind==="work"){
    const pay = 70 + Math.floor(rnd()*140);
    state.stats.money += pay;
    state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);
    toast(`You earned ${fmtMoney(pay)}.`);
  }
  if(kind==="chaos"){
    // dark humor / chaos
    const roll = rnd();
    if(roll < 0.5){
      state.stats.happiness = clamp(state.stats.happiness + 3, 0, 100);
      state.stats.karma = clamp(state.stats.karma - 2, 0, 100);
      toast("You chose chaos. It was… entertaining.");
    }else{
      state.stats.health = clamp(state.stats.health - 3, 0, 100);
      state.stats.money = Math.round(state.stats.money - 120);
      toast("Chaos bit you back.");
    }
  }

  renderAll();
  save();
}

/* ---------- Setup ---------- */
function renderTraitPicker(){
  const row = $("traitRow");
  row.innerHTML = "";
  db.traits.forEach((t, i)=>{
    const b = document.createElement("button");
    b.className = "pill" + (i===0 ? " active" : "");
    b.textContent = t.name;
    b.onclick = ()=>{
      row.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      row.dataset.selected = t.id;
    };
    row.appendChild(b);
  });
  row.dataset.selected = db.traits[0]?.id || "charming";
}

function renderCountryPicker(){
  const sel = $("countryInput");
  sel.innerHTML = countries.map(c=>`<option value="${c}">${c}</option>`).join("");
  sel.value = "United Kingdom";
}

function renderMiniRelationships(){
  const el = $("miniRel");
  if(!el) return;

  const parents = (state.relationships||[]).filter(r => r.type === "mother" || r.type === "father");
  if(parents.length === 0){
    el.innerHTML = "";
    return;
  }

  const bar = (v)=>`<div class="bar"><div class="fill" style="width:${clamp(v,0,100)}%"></div></div>`;

  el.innerHTML = `
    <div class="miniRelTitle">Parents</div>
    ${parents.map(p=>`
      <div class="stat">
        <div class="statName">${p.name}</div>
        ${bar(p.closeness)}
        <div class="statVal">${p.closeness}</div>
      </div>
    `).join("")}
  `;
}

/* ---------- Init ---------- */
function wireUI(){
  document.querySelectorAll(".navBtn").forEach(btn=>{
    btn.onclick = ()=> show(btn.dataset.view);
  });

  $("btnReset").onclick = resetAll;

  $("btnDemo").onclick = ()=>{
    $("nameInput").value = pick(["Nova","Noah","Ava","Mila","Kai","Zara","Amir"]);
    $("countryInput").value = pick(countries);
    toast("Demo filled.");
  };

  $("btnStart").onclick = ()=>{
    const name = $("nameInput").value.trim();
    if(!name) return alert("Add a name first.");

    state = defaultState();
    state.name = name;
    state.country = $("countryInput").value;
    state.trait = $("traitRow").dataset.selected || "charming";
    ensureParents();

    save("Saved • new life");
    show("viewLife");
    renderAll();

    // Birth event
    const born = db.events.find(e=>e.ageMin===0 && e.ageMax===0) || pickEvent();
    showEvent(born);
  };

  $("btnAge").onclick = ()=>{
    show("viewLife");
    ageUp();
  };

  $("btnFindFriend").onclick = addFriend;

  $("actStudy").onclick = ()=> doActivity("study");
  $("actWorkout").onclick = ()=> doActivity("workout");
  $("actWork").onclick = ()=> doActivity("work");
  $("actChaos").onclick = ()=> doActivity("chaos");
}

(function init(){
  // sanity check
  if(!db || !db.events || !countries){
    alert("Data files missing. Ensure /data/events.js and /data/countries.js exist.");
    return;
  }

  renderTraitPicker();
  renderCountryPicker();
  wireUI();

  const existing = load();
  if(existing){
    state = existing;

    // migrate minimal
    state.stats ||= {};
    state.relationships ||= [];
    state.flags ||= {};
    ensureParents();

    show("viewLife");
    renderAll();
    $("eventTitle").textContent = "Welcome back";
    $("eventText").textContent = "Press Age to continue.";
    $("choices").innerHTML = "";
  }else{
    state = defaultState();
    show("viewSetup");
  }
})();
