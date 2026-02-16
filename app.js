/* NorovaLife Engine (BitLife-like UI, different vibe)
   - No fetch: data loaded via data/*.js (Vercel-proof)
   - Event lifecycle: event resolves after 1 choice (no spam)
   - Relationships: parents + friends + actions
   - Scalable event format: requirements, flags, risk, addRelationship
   - Added: gender + name auto-gen + parents share player last name
   - Added: LIFE FEED (BitLife-style long log)
*/

const SAVE_KEY = "norovalife_save_v102";

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

/* ---------- Name helpers ---------- */
function splitName(full){
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if(parts.length <= 1) return { first: parts[0] || "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function cultureKeyFromCountry(country){
  const c = (country||"").toLowerCase();
  if(c.includes("united kingdom") || c === "uk" || c.includes("england") || c.includes("scotland") || c.includes("wales")) return "uk";
  if(c.includes("united states") || c.includes("usa")) return "usa";
  if(c.includes("ireland")) return "ireland";
  if(c.includes("nigeria")) return "nigeria";
  if(c.includes("japan")) return "japan";
  if(c.includes("india")) return "india";
  if(c.includes("united arab emirates") || c.includes("saudi") || c.includes("qatar") || c.includes("kuwait") || c.includes("jordan") || c.includes("lebanon")) return "arab";
  return "uk";
}

const NAME_BANK = {
  uk: {
    female:["Olivia","Amelia","Isla","Ava","Emily","Sophia","Grace","Ella","Freya","Mia","Chloe","Lily"],
    male:["Oliver","George","Noah","Arthur","Leo","Harry","Jack","Charlie","Theodore","Oscar","Jacob","Freddie"],
    neutral:["Alex","Jamie","Taylor","Morgan","Riley","Casey","Avery","Jordan","Quinn","Parker"],
    last:["Smith","Jones","Taylor","Brown","Williams","Wilson","Davies","Evans","Thomas","Roberts","Walker","Wright"]
  },
  usa: {
    female:["Emma","Olivia","Ava","Sophia","Isabella","Mia","Charlotte","Amelia","Harper","Evelyn","Abigail","Luna"],
    male:["Liam","Noah","Oliver","Elijah","James","William","Benjamin","Lucas","Henry","Theodore","Jack","Levi"],
    neutral:["Alex","Jordan","Taylor","Casey","Riley","Avery","Quinn","Parker","Cameron","Reese"],
    last:["Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Garcia","Rodriguez","Wilson","Martinez","Anderson"]
  },
  ireland: {
    female:["Aoife","Niamh","Saoirse","Ciara","Orla","Maeve","Aisling","Roisin","Siobhan","Clodagh","Eimear","Grainne"],
    male:["Conor","Sean","Cian","Oisin","Finn","Ronan","Darragh","Eoghan","Cathal","Tadhg","Liam","Fionn"],
    neutral:["Casey","Morgan","Riley","Jamie","Quinn"],
    last:["Murphy","Kelly","O'Sullivan","Walsh","O'Brien","Byrne","Ryan","O'Connor","Doyle","McCarthy","Gallagher"]
  },
  nigeria: {
    female:["Chioma","Zainab","Amina","Temilade","Adaeze","Sade","Funke","Halima","Ifeoma","Bolanle","Hauwa","Ngozi"],
    male:["Chinedu","Emeka","Ibrahim","Tunde","Babatunde","Ahmed","Uche","Oluwaseun","Kelechi","Sani","Abdul","Kunle"],
    neutral:["Alex","Taylor","Sam","Jordan"],
    last:["Okafor","Balogun","Adeyemi","Ibrahim","Abubakar","Okoye","Ogunleye","Mohammed","Nwankwo","Yakubu","Adebayo","Eze"]
  },
  japan: {
    female:["Yui","Aoi","Hina","Sakura","Rin","Mio","Akari","Nanami","Hana","Haruka","Mei","Yuna"],
    male:["Haruto","Yuto","Sota","Ren","Yuki","Kaito","Daiki","Ryota","Takumi","Riku","Sho","Hinata"],
    neutral:["Haru","Ren","Sora","Yuki"],
    last:["Sato","Suzuki","Takahashi","Tanaka","Watanabe","Ito","Yamamoto","Nakamura","Kobayashi","Kato","Yoshida","Yamada"]
  },
  india: {
    female:["Aanya","Anaya","Isha","Diya","Saanvi","Priya","Kavya","Meera","Riya","Anjali","Aditi","Nisha"],
    male:["Arjun","Aarav","Vihaan","Aditya","Rohan","Rahul","Karan","Ishaan","Kabir","Siddharth","Vivek","Neel"],
    neutral:["Kiran","Ari","Devan","Ravi"],
    last:["Sharma","Verma","Patel","Gupta","Singh","Kumar","Reddy","Nair","Iyer","Mehta","Chopra","Jain"]
  },
  arab: {
    female:["Fatima","Aisha","Layla","Mariam","Noor","Sara","Yasmin","Zahra","Hana","Rania","Amira","Salma"],
    male:["Mohammed","Ahmed","Omar","Ali","Hassan","Yusuf","Ibrahim","Khalid","Amir","Nabil","Karim","Saeed"],
    neutral:["Noor","Rayan","Salam","Ari"],
    last:["Al-Farsi","Al-Harbi","Al-Mansoori","Al-Qahtani","Haddad","Nasser","Salem","Rahman","Hussein","Abdullah","Mahmoud"]
  }
};

function generateFullName(country, gender){
  const key = cultureKeyFromCountry(country);
  const bank = NAME_BANK[key] || NAME_BANK.uk;

  const firstPool =
    gender === "female" ? bank.female :
    gender === "male" ? bank.male :
    bank.neutral;

  const first = pick(firstPool);
  const last = pick(bank.last);
  return `${first} ${last}`;
}

/* ---------- State ---------- */
function defaultState(){
  return {
    name: "",
    lastName: "",
    gender: "female",

    country: "United Kingdom",
    trait: "charming",
    age: 0,
    alive: true,

    // ✅ Life feed
    feed: [],

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

/* ---------- Life Feed ---------- */
function addToFeed(title, text){
  state.feed ||= [];
  state.feed.unshift({
    age: state.age,
    title: String(title || "Life"),
    text: String(text || ""),
    t: Date.now()
  });
  renderFeed();
}

function renderFeed(){
  const el = $("lifeFeed");
  if(!el) return;

  const items = state.feed || [];
  if(items.length === 0){
    el.innerHTML = `
      <div class="feedItem">
        <div class="muted tiny">Your life story will appear here.</div>
      </div>
    `;
    return;
  }

  el.innerHTML = items.slice(0, 80).map(it => `
    <div class="feedItem">
      <div class="feedTop">
        <div>${it.title}</div>
        <div class="feedAge">Age ${it.age}</div>
      </div>
      <div class="feedText">${it.text}</div>
    </div>
  `).join("");
}

/* ---------- Relationships ---------- */
function makePerson(type, forcedLastName){
  const id = (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()+rnd()));
  const country = state?.country || "United Kingdom";

  let gender = "nonbinary";
  if(type === "mother") gender = "female";
  if(type === "father") gender = "male";

  const full = generateFullName(country, gender);
  const parts = splitName(full);

  const last = (forcedLastName || state?.lastName || parts.last || "Smith").trim();
  const name = `${parts.first} ${last}`.trim();

  return { id, type, name, closeness: 60, trust: 60, respect: 60 };
}

function ensureParents(){
  const hasMom = state.relationships.some(r=>r.type==="mother");
  const hasDad = state.relationships.some(r=>r.type==="father");
  if(!hasMom) state.relationships.push(makePerson("mother", state.lastName));
  if(!hasDad) state.relationships.push(makePerson("father", state.lastName));
}

function fixParentNamesAndSurnames(){
  const last = (state.lastName || "").trim();
  if(!last) return;

  state.relationships.forEach(r=>{
    if(r.type !== "mother" && r.type !== "father") return;

    const parts = splitName(r.name);
    const looksPlaceholder = (r.name === "Mother" || r.name === "Father");
    const wrongLast = parts.last && parts.last !== last;

    if(looksPlaceholder || wrongLast || !parts.last){
      let first = parts.first;
      if(looksPlaceholder || !first || first.toLowerCase() === "mother" || first.toLowerCase() === "father"){
        first = splitName(generateFullName(state.country, r.type==="mother" ? "female" : "male")).first;
      }
      r.name = `${first} ${last}`.trim();
    }
  });
}

function addFriend(){
  state.relationships.push(makePerson("friend", null));
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
  const traitName = db.traits.find(t=>t.id===state.trait)?.name || state.trait;
  const fullName = `${state.name} ${state.lastName}`.trim();

  $("whoLine").textContent = `${fullName || "—"} • Age ${state.age}`;
  $("metaLine").textContent = `${state.country} • ${state.gender} • Trait: ${traitName}`;
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

function renderAll(){
  renderProfile();
  renderStats();
  renderRelationships();
  renderMiniRelationships();
  renderFeed(); // ✅ IMPORTANT
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

  const pool = db.events
    .filter(e => age >= e.ageMin && age <= e.ageMax)
    .filter(meetsRequirements)
    .filter(e => e.id !== state.lastEventId);

  if(pool.length === 0){
    return {
      id: "filler_" + age,
      title: "Another year passes",
      text: "Nothing major happened this year.",
      choices: [{ label: "Continue", effects: {} }]
    };
  }

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

  const renderedText = (ev.text || "")
    .replaceAll("{country}", state.country)
    .replaceAll("{name}", `${state.name} ${state.lastName}`.trim() || state.name);

  $("eventTitle").textContent = ev.title || "Event";
  $("eventText").textContent = renderedText;

  const wrap = $("choices");
  wrap.innerHTML = (ev.choices || []).map((c,i)=>`
    <button class="choice" data-i="${i}">${c.label}</button>
  `).join("");

  wrap.querySelectorAll("button").forEach(btn=>{
    btn.onclick = ()=>{
      wrap.querySelectorAll("button").forEach(b=>b.disabled=true);

      const choice = ev.choices[Number(btn.dataset.i)];
      applyEffects(choice.effects);
      applyFlags(choice.flags);
      applyRisk(choice.risk);

      // ✅ FEED: log event + choice
      addToFeed(ev.title, renderedText);
      addToFeed("You chose:", choice.label);

      if(choice.addRelationship?.type === "friend"){
        state.relationships.push(makePerson("friend", null));
        toast("New relationship added.");
      }

      renderAll();

      wrap.innerHTML = `<button class="choice" id="btnContinue">Continue</button>`;
      $("btnContinue").onclick = ()=>{
        $("eventTitle").textContent = "Life";
        $("eventText").textContent = "Press Age to continue.";
        wrap.innerHTML = "";
      };

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

  // ✅ FEED: log age
  addToFeed("Age up", `You are now ${state.age}.`);

  state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);
  if(state.age > 35) state.stats.health = clamp(state.stats.health - 1, 0, 100);

  if(state.age >= 6 && state.age <= 14 && rnd() < 0.22){
    if(!state.relationships.some(r=>r.type==="friend")){
      state.relationships.push(makePerson("friend", null));
      toast("You made a new friend.");
      addToFeed("New friend", "You made a new friend at school.");
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
    addToFeed("Activity", "You studied.");
  }
  if(kind==="workout"){
    state.stats.health = clamp(state.stats.health + 2, 0, 100);
    state.stats.looks = clamp(state.stats.looks + 1, 0, 100);
    toast("You worked out.");
    addToFeed("Activity", "You worked out.");
  }
  if(kind==="work"){
    const pay = 70 + Math.floor(rnd()*140);
    state.stats.money += pay;
    state.stats.happiness = clamp(state.stats.happiness - 1, 0, 100);
    toast(`You earned ${fmtMoney(pay)}.`);
    addToFeed("Activity", `You worked and earned ${fmtMoney(pay)}.`);
  }
  if(kind==="chaos"){
    const roll = rnd();
    if(roll < 0.5){
      state.stats.happiness = clamp(state.stats.happiness + 3, 0, 100);
      state.stats.karma = clamp(state.stats.karma - 2, 0, 100);
      toast("You chose chaos. It was… entertaining.");
      addToFeed("Activity", "You chose chaos. It was… entertaining.");
    }else{
      state.stats.health = clamp(state.stats.health - 3, 0, 100);
      state.stats.money = Math.round(state.stats.money - 120);
      toast("Chaos bit you back.");
      addToFeed("Activity", "Chaos bit you back.");
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

/* ---------- Init ---------- */
function wireUI(){
  document.querySelectorAll(".navBtn").forEach(btn=>{
    btn.onclick = ()=> show(btn.dataset.view);
  });

  $("btnReset").onclick = resetAll;

  $("countryInput").onchange = () => {
    const g = $("genderInput")?.value || "female";
    $("nameInput").value = generateFullName($("countryInput").value, g);
  };

  $("genderInput").onchange = () => {
    $("nameInput").value = generateFullName($("countryInput").value, $("genderInput").value);
  };

  $("btnRandomName").onclick = () => {
    $("nameInput").value = generateFullName($("countryInput").value, $("genderInput")?.value || "female");
  };

  $("btnDemo").onclick = ()=>{
    $("countryInput").value = pick(countries);
    $("genderInput").value = pick(["female","male","nonbinary"]);
    $("nameInput").value = generateFullName($("countryInput").value, $("genderInput").value);
    toast("Demo filled.");
  };

  $("btnStart").onclick = ()=>{
    const full = $("nameInput").value.trim();
    if(!full) return alert("You must choose a name (or press 🎲).");

    state = defaultState();
    state.country = $("countryInput").value;
    state.gender = $("genderInput")?.value || "female";
    state.trait = $("traitRow").dataset.selected || "charming";

    const parts = splitName(full);
    if(!parts.first) return alert("You must choose a name (or press 🎲).");

    if(!parts.last){
      const auto = splitName(generateFullName(state.country, state.gender));
      state.name = parts.first;
      state.lastName = auto.last || "Smith";
    }else{
      state.name = parts.first;
      state.lastName = parts.last;
    }

    state.relationships.push(makePerson("mother", state.lastName));
    state.relationships.push(makePerson("father", state.lastName));

    // ✅ FEED seed
    state.feed ||= [];
    addToFeed("New life", `You started a new life in ${state.country}.`);

    save("Saved • new life");
    show("viewLife");
    renderAll();

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
  if(!db || !db.events || !countries){
    alert("Data files missing. Ensure /data/events.js and /data/countries.js exist.");
    return;
  }

  renderTraitPicker();
  renderCountryPicker();
  wireUI();

  if($("genderInput")) $("genderInput").value = "female";
  if($("nameInput")) $("nameInput").value = generateFullName($("countryInput").value, $("genderInput")?.value || "female");

  const existing = load();
  if(existing){
    state = existing;

    state.stats ||= {};
    state.relationships ||= [];
    state.flags ||= {};
    state.feed ||= []; // ✅ migrate feed
    if(!state.gender) state.gender = "female";
    if(state.lastName === undefined) state.lastName = "";

    // older saves might have full name in state.name
    if(state.name && !state.lastName && state.name.includes(" ")){
      const parts = splitName(state.name);
      state.name = parts.first;
      state.lastName = parts.last;
    }

    ensureParents();
    fixParentNamesAndSurnames();

    show("viewLife");
    renderAll();
    $("eventTitle").textContent = "Welcome back";
    $("eventText").textContent = "Press Age to continue.";
    $("choices").innerHTML = "";

    // show placeholder if empty
    renderFeed();
    save("Migrated save");
  }else{
    state = defaultState();
    show("viewSetup");
  }
})();
