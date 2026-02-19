/* NorovaLife v3 — BitLife-like engine (Norova vibe)
   - Feed-first
   - Age = yearly tick
   - Events resolve once
   - Relationships + mini parents bars
   - School ages 5–17
   - Jobs (16+ part time, 18+ full) + salary yearly
   - Name must be confirmed (type or 🎲)
*/

const SAVE_KEY = "norovalife_v3_save";

const $ = (id) => document.getElementById(id);
const clamp = (n,min,max) => Math.max(min, Math.min(max, n));
const rnd = () => Math.random();
const pick = (arr) => arr[Math.floor(rnd()*arr.length)];
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

let db = window.NOROVA_DATA;
let countries = window.NOROVA_COUNTRIES;

let state = null;

/* ---------- Name helpers (same banks as earlier) ---------- */
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
  uk:{ female:["Olivia","Amelia","Isla","Ava","Emily","Sophia","Grace","Ella","Freya","Mia","Chloe","Lily"],
       male:["Oliver","George","Noah","Arthur","Leo","Harry","Jack","Charlie","Theodore","Oscar","Jacob","Freddie"],
       neutral:["Alex","Jamie","Taylor","Morgan","Riley","Casey","Avery","Jordan","Quinn","Parker"],
       last:["Smith","Jones","Taylor","Brown","Williams","Wilson","Davies","Evans","Thomas","Roberts","Walker","Wright"] },
  usa:{ female:["Emma","Olivia","Ava","Sophia","Isabella","Mia","Charlotte","Amelia","Harper","Evelyn","Abigail","Luna"],
       male:["Liam","Noah","Oliver","Elijah","James","William","Benjamin","Lucas","Henry","Theodore","Jack","Levi"],
       neutral:["Alex","Jordan","Taylor","Casey","Riley","Avery","Quinn","Parker","Cameron","Reese"],
       last:["Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Garcia","Rodriguez","Wilson","Martinez","Anderson"] },
  ireland:{ female:["Aoife","Niamh","Saoirse","Ciara","Orla","Maeve","Aisling","Roisin","Siobhan","Clodagh","Eimear","Grainne"],
       male:["Conor","Sean","Cian","Oisin","Finn","Ronan","Darragh","Eoghan","Cathal","Tadhg","Liam","Fionn"],
       neutral:["Casey","Morgan","Riley","Jamie","Quinn"],
       last:["Murphy","Kelly","O'Sullivan","Walsh","O'Brien","Byrne","Ryan","O'Connor","Doyle","McCarthy","Gallagher"] },
  nigeria:{ female:["Chioma","Zainab","Amina","Temilade","Adaeze","Sade","Funke","Halima","Ifeoma","Bolanle","Hauwa","Ngozi"],
       male:["Chinedu","Emeka","Ibrahim","Tunde","Babatunde","Ahmed","Uche","Oluwaseun","Kelechi","Sani","Abdul","Kunle"],
       neutral:["Alex","Taylor","Sam","Jordan"],
       last:["Okafor","Balogun","Adeyemi","Ibrahim","Abubakar","Okoye","Ogunleye","Mohammed","Nwankwo","Yakubu","Adebayo","Eze"] },
  japan:{ female:["Yui","Aoi","Hina","Sakura","Rin","Mio","Akari","Nanami","Hana","Haruka","Mei","Yuna"],
       male:["Haruto","Yuto","Sota","Ren","Yuki","Kaito","Daiki","Ryota","Takumi","Riku","Sho","Hinata"],
       neutral:["Haru","Ren","Sora","Yuki"],
       last:["Sato","Suzuki","Takahashi","Tanaka","Watanabe","Ito","Yamamoto","Nakamura","Kobayashi","Kato","Yoshida","Yamada"] },
  india:{ female:["Aanya","Anaya","Isha","Diya","Saanvi","Priya","Kavya","Meera","Riya","Anjali","Aditi","Nisha"],
       male:["Arjun","Aarav","Vihaan","Aditya","Rohan","Rahul","Karan","Ishaan","Kabir","Siddharth","Vivek","Neel"],
       neutral:["Kiran","Ari","Devan","Ravi"],
       last:["Sharma","Verma","Patel","Gupta","Singh","Kumar","Reddy","Nair","Iyer","Mehta","Chopra","Jain"] },
  arab:{ female:["Fatima","Aisha","Layla","Mariam","Noor","Sara","Yasmin","Zahra","Hana","Rania","Amira","Salma"],
       male:["Mohammed","Ahmed","Omar","Ali","Hassan","Yusuf","Ibrahim","Khalid","Amir","Nabil","Karim","Saeed"],
       neutral:["Noor","Rayan","Salam","Ari"],
       last:["Al-Farsi","Al-Harbi","Al-Mansoori","Al-Qahtani","Haddad","Nasser","Salem","Rahman","Hussein","Abdullah","Mahmoud"] }
};
function generateFullName(country, gender){
  const key = cultureKeyFromCountry(country);
  const bank = NAME_BANK[key] || NAME_BANK.uk;
  const pool = gender==="female" ? bank.female : gender==="male" ? bank.male : bank.neutral;
  return `${pick(pool)} ${pick(bank.last)}`;
}

/* ---------- State ---------- */
function defaultState(){
  return {
    firstName:"",
    lastName:"",
    gender:"female",
    country:"United Kingdom",
    trait:"charming",

    age:0,
    alive:true,

    // Stats (BitLife-ish)
    stats:{ health:80, happiness:80, smarts:50, looks:50, money:0, karma:50 },

    // Feed
    feed: [],

    // Systems
    relationships: [],
    school: { enrolled:false, label:null, performance:55, discipline:70 },
    job: null, // { title, salary, performance }

    flags:{},
    lastEventId:null
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

/* ---------- Currency ---------- */
function currencySymbol(){
  return state.country === "United Kingdom" ? "£" : "$";
}
function fmtMoney(n){
  const v = Math.round(Number(n||0));
  return currencySymbol() + v.toLocaleString();
}

/* ---------- Feed + toast ---------- */
let toastTimer=null;
function toast(msg){
  let el = document.getElementById("norovaToast");
  if(!el){
    el=document.createElement("div");
    el.id="norovaToast";
    document.body.appendChild(el);
  }
  el.style.cssText=`
    position:fixed; left:50%; bottom:92px; transform:translateX(-50%);
    background:rgba(0,0,0,.78); color:#fff; padding:10px 12px;
    border-radius:14px; font-weight:900; z-index:999;
    max-width:min(520px,90vw); text-align:center;
  `;
  el.textContent=msg;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.remove(), 1400);
}

function escapeHTML(s){
  return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function addToFeed(title,text){
  state.feed.unshift({ age: state.age, title:String(title||"Life"), text:String(text||""), t:Date.now() });
  renderFeed();
}

function renderFeed(){
  const el=$("lifeFeed");
  if(!el) return;
  if(!state.feed.length){
    el.innerHTML=`<div class="feedItem"><div class="muted tiny">Your life story will appear here.</div></div>`;
    return;
  }
  el.innerHTML = state.feed.slice(0,150).map(it=>`
    <div class="feedItem">
      <div class="feedTop">
        <div>${escapeHTML(it.title)}</div>
        <div class="feedAge">Age ${it.age}</div>
      </div>
      <div class="feedText">${escapeHTML(it.text)}</div>
    </div>
  `).join("");
}

/* ---------- Relationships ---------- */
function makePerson(type, forcedLast){
  const country = state.country || "United Kingdom";
  const g = type==="mother" ? "female" : type==="father" ? "male" : "nonbinary";
  const full = generateFullName(country, g);
  const parts = splitName(full);
  const last = (forcedLast || state.lastName || parts.last || "Smith").trim();
  return { id:uid(), type, name:`${parts.first} ${last}`.trim(), closeness:65, trust:65, respect:65 };
}
function ensureParents(){
  if(!state.relationships.some(r=>r.type==="mother")) state.relationships.push(makePerson("mother", state.lastName));
  if(!state.relationships.some(r=>r.type==="father")) state.relationships.push(makePerson("father", state.lastName));
}
function addFriend(){
  state.relationships.push(makePerson("friend", null));
  toast("New friend added.");
  addToFeed("New friend","You made a new friend.");
  renderRelationships();
  save();
}
function relAction(person, action){
  if(action==="time"){
    person.closeness = clamp(person.closeness+6,0,100);
    person.trust = clamp(person.trust+4,0,100);
    state.stats.happiness = clamp(state.stats.happiness+2,0,100);
    toast("You spent time together.");
    addToFeed("Relationship",`You spent time with ${person.name}.`);
  }
  if(action==="argue"){
    person.closeness = clamp(person.closeness-7,0,100);
    person.trust = clamp(person.trust-5,0,100);
    state.stats.happiness = clamp(state.stats.happiness-2,0,100);
    state.stats.karma = clamp(state.stats.karma-1,0,100);
    toast("Argument.");
    addToFeed("Relationship",`You argued with ${person.name}.`);
  }
  if(action==="gift"){
    const cost=40+Math.floor(rnd()*140);
    if(state.stats.money < cost){ toast("You can’t afford a gift."); return; }
    state.stats.money -= cost;
    person.closeness = clamp(person.closeness+4,0,100);
    person.respect = clamp(person.respect+3,0,100);
    state.stats.happiness = clamp(state.stats.happiness+1,0,100);
    toast("Gift sent.");
    addToFeed("Relationship",`You gave ${person.name} a gift (${fmtMoney(cost)}).`);
  }
  renderAll(); save();
}

function renderRelationships(){
  const list=$("relationshipsList");
  if(!list) return;
  if(!state.relationships.length){ list.innerHTML=`<div class="muted">No relationships.</div>`; return; }

  const bar = (v)=>`<div class="bar"><div class="fill" style="width:${clamp(v,0,100)}%"></div></div>`;

  list.innerHTML = state.relationships.map(r=>`
    <div class="relCard">
      <div class="relTop">
        <div class="relName">${escapeHTML(r.name)}</div>
        <div class="relType">${escapeHTML(r.type)}</div>
      </div>

      <div class="stats">
        <div class="stat"><div class="muted tiny">Closeness</div>${bar(r.closeness)}<div class="statVal">${r.closeness}</div></div>
        <div class="stat"><div class="muted tiny">Trust</div>${bar(r.trust)}<div class="statVal">${r.trust}</div></div>
        <div class="stat"><div class="muted tiny">Respect</div>${bar(r.respect)}<div class="statVal">${r.respect}</div></div>
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
      const p = state.relationships.find(x=>x.id===btn.dataset.id);
      if(p) relAction(p, btn.dataset.act);
    };
  });
}

function renderMiniRelationships(){
  const el=$("miniRel");
  if(!el) return;
  const parents = state.relationships.filter(r=>r.type==="mother" || r.type==="father");
  if(!parents.length){ el.innerHTML=""; return; }

  const bar=(v)=>`<div class="bar"><div class="fill" style="width:${clamp(v,0,100)}%"></div></div>`;
  el.innerHTML = `
    <div class="miniRelTitle">Parents</div>
    ${parents.map(p=>`
      <div class="stat">
        <div class="statName">${escapeHTML(p.name)}</div>
        ${bar(p.closeness)}
        <div class="statVal">${p.closeness}</div>
      </div>
    `).join("")}
  `;
}

/* ---------- School ---------- */
function gradeLabel(age){
  if(age < 5) return null;
  if(age <= 10) return `Primary Year ${age-4}`;
  if(age <= 15) return `Secondary Year ${age-10}`;
  return `Sixth Form Year ${age-15}`;
}
function syncSchool(){
  if(state.age >= 5 && state.age <= 17){
    state.school.enrolled = true;
    state.school.label = gradeLabel(state.age);
  }else{
    state.school.enrolled = false;
    state.school.label = null;
  }
}

/* ---------- Jobs ---------- */
const JOBS = [
  { title:"Fast Food Crew Member", minAge:16, basePay:2800 },
  { title:"Retail Assistant", minAge:16, basePay:3200 },
  { title:"Office Assistant", minAge:18, basePay:5200 },
  { title:"Junior Developer", minAge:18, basePay:7600 },
  { title:"Sales Rep", minAge:18, basePay:6800 }
];

function eligibleJobs(){ return JOBS.filter(j=>state.age>=j.minAge); }

function applySalaryYearly(){
  if(!state.job) return;
  state.stats.money += state.job.salary;
  addToFeed("Salary", `You earned ${fmtMoney(state.job.salary)} as a ${state.job.title}.`);

  // performance drift
  state.job.performance = clamp(state.job.performance + (rnd()<0.55 ? 2 : -2), 0, 100);

  // raise chance
  if(state.job.performance >= 80 && rnd() < 0.16){
    const bump = Math.round(state.job.salary * (0.08 + rnd()*0.10));
    state.job.salary += bump;
    toast("Promotion!");
    addToFeed("Promotion", `You got a raise (+${fmtMoney(bump)}).`);
  }

  // fired chance
  if(state.job.performance <= 18 && rnd() < 0.18){
    addToFeed("Fired", `You were fired from your job as ${state.job.title}.`);
    toast("You were fired.");
    state.job = null;
  }
}

function applyForJob(){
  const options = eligibleJobs();
  if(!options.length){
    toast("Too young to work.");
    addToFeed("Job","You’re too young to get a job.");
    return;
  }
  const j = pick(options);
  state.job = { title:j.title, salary:j.basePay + Math.floor(rnd()*1200), performance:55 };
  toast("Job secured.");
  addToFeed("New job", `You became a ${state.job.title}.`);
  renderCareer();
  renderAll();
  save();
}

/* ---------- Events ---------- */
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

function pickEvent(){
  const age=state.age;
  const pool=(db.events||[])
    .filter(e=>age>=e.ageMin && age<=e.ageMax)
    .filter(meetsRequirements)
    .filter(e=>e.id!==state.lastEventId);

  if(!pool.length){
    return { id:"filler_"+age, title:"A quiet year", text:"Nothing major happened this year.", choices:[{label:"Continue", effects:{}}] };
  }

  let total=0;
  const weighted=pool.map(e=>{ const w=(typeof e.weight==="number")?e.weight:10; total+=w; return {e,w}; });
  let r=rnd()*total;
  for(const it of weighted){ r-=it.w; if(r<=0) return it.e; }
  return weighted[weighted.length-1].e;
}

function applyEffects(effects){
  if(!effects) return;
  for(const [k,v] of Object.entries(effects)){
    if(k==="money"){ state.stats.money = Math.round((state.stats.money||0) + Number(v||0)); continue; }
    if(k==="intelligence"){ state.stats.smarts = clamp((state.stats.smarts||0) + Number(v||0), 0, 100); continue; }
    if(state.stats[k] !== undefined) state.stats[k] = clamp((state.stats[k]||0) + Number(v||0), 0, 100);
  }
}

function showEvent(ev){
  state.lastEventId = ev.id;

  const playerName = `${state.firstName} ${state.lastName}`.trim();
  const renderedText = (ev.text||"")
    .replaceAll("{country}", state.country)
    .replaceAll("{name}", playerName);

  $("eventTitle").textContent = ev.title || "Event";
  $("eventText").textContent = renderedText;

  const wrap=$("choices");
  wrap.innerHTML = (ev.choices||[]).map((c,i)=>`
    <button class="choice" data-i="${i}">${escapeHTML(c.label)}</button>
  `).join("");

  wrap.querySelectorAll("button").forEach(btn=>{
    btn.onclick=()=>{
      wrap.querySelectorAll("button").forEach(b=>b.disabled=true);

      const choice=ev.choices[Number(btn.dataset.i)];
      applyEffects(choice.effects);
      if(choice.flags){
        for(const [k,v] of Object.entries(choice.flags)) state.flags[k]=v;
      }

      // feed + toast (BitLife-ish)
      toast(choice.label);
      addToFeed(ev.title, renderedText);
      addToFeed("You chose:", choice.label);

      if(choice.addRelationship?.type === "friend"){
        state.relationships.push(makePerson("friend", null));
        addToFeed("Relationship","A new friend entered your life.");
      }

      wrap.innerHTML = `<button class="choice" id="btnContinue">Continue</button>`;
      $("btnContinue").onclick=()=>{
        $("eventTitle").textContent="Life";
        $("eventText").textContent="Press Age to continue.";
        wrap.innerHTML="";
      };

      // death check
      if(state.stats.health <= 0){
        state.alive=false;
        $("eventTitle").textContent="You died";
        $("eventText").textContent="Your health reached 0. Game over.";
        wrap.innerHTML = `<button class="choice" id="btnNewLife">Start a new life</button>`;
        $("btnNewLife").onclick = resetAll;
      }

      renderAll(); save();
    };
  });
}

/* ---------- Activities ---------- */
function doActivity(kind){
  if(!state.alive) return;

  if(kind==="study"){
    state.stats.smarts = clamp(state.stats.smarts+2,0,100);
    state.stats.happiness = clamp(state.stats.happiness-1,0,100);
    if(state.school.enrolled) state.school.performance = clamp(state.school.performance+2,0,100);
    toast("You studied.");
    addToFeed("Activity","You studied.");
  }

  if(kind==="workout"){
    state.stats.health = clamp(state.stats.health+2,0,100);
    state.stats.looks = clamp(state.stats.looks+1,0,100);
    toast("You worked out.");
    addToFeed("Activity","You worked out.");
  }

  if(kind==="work"){
    if(state.job){
      const bonus = 80 + Math.floor(rnd()*180);
      state.stats.money += bonus;
      state.job.performance = clamp(state.job.performance+2,0,100);
      toast(`Worked. +${fmtMoney(bonus)}`);
      addToFeed("Work",`You did extra work and earned ${fmtMoney(bonus)}.`);
    }else{
      applyForJob();
    }
  }

  if(kind==="chaos"){
    const roll=rnd();
    if(roll < 0.55){
      state.stats.happiness = clamp(state.stats.happiness+3,0,100);
      state.stats.karma = clamp(state.stats.karma-2,0,100);
      toast("Chaos.");
      addToFeed("Chaos","You caused chaos. It was thrilling.");
    }else{
      state.stats.health = clamp(state.stats.health-3,0,100);
      state.stats.money = Math.round((state.stats.money||0)-120);
      toast("Backfired.");
      addToFeed("Chaos","Chaos backfired.");
    }
  }

  renderAll(); save();
}

/* ---------- Age loop ---------- */
function ageUp(){
  if(!state.alive) return;

  state.age += 1;

  // passive drift
  state.stats.happiness = clamp(state.stats.happiness-1,0,100);
  if(state.age > 35) state.stats.health = clamp(state.stats.health-1,0,100);

  syncSchool();
  applySalaryYearly();

  addToFeed("Age up", `You are now ${state.age}.`);

  // yearly event
  const ev = pickEvent();
  showEvent(ev);

  renderAll(); save();
}

/* ---------- Rendering ---------- */
function renderProfile(){
  const traitName = db.traits.find(t=>t.id===state.trait)?.name || state.trait;
  const fullName = `${state.firstName} ${state.lastName}`.trim();

  $("whoLine").textContent = `${fullName || "—"} • Age ${state.age}`;

  const tags = [];
  tags.push(state.country);
  tags.push(state.gender);
  if(state.school.enrolled && state.school.label) tags.push(state.school.label);
  if(state.job) tags.push(state.job.title);
  tags.push(`Trait: ${traitName}`);

  $("metaLine").textContent = tags.join(" • ");
  $("moneyLine").textContent = fmtMoney(state.stats.money);
}

function statPct(key){
  const v = Number(state.stats[key] || 0);
  if(key==="money") return clamp(Math.round((v/15000)*100),0,100);
  return clamp(v,0,100);
}

function renderStats(){
  const rows = [
    ["health","Health"],
    ["happiness","Happiness"],
    ["smarts","Smarts"],
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

function renderCareer(){
  if(!$("schoolLine") || !$("jobLine")) return;

  if(state.school.enrolled){
    $("schoolLine").textContent = `${state.school.label} • Perf ${state.school.performance} • Disc ${state.school.discipline}`;
  }else{
    $("schoolLine").textContent = "Not enrolled";
  }

  if(state.job){
    $("jobLine").textContent = `${state.job.title} • Salary ${fmtMoney(state.job.salary)} • Perf ${state.job.performance}`;
  }else{
    $("jobLine").textContent = "Unemployed";
  }
}

function renderAll(){
  renderProfile();
  renderStats();
  renderMiniRelationships();
  renderRelationships();
  renderCareer();
  renderFeed();
}

/* ---------- Setup UI ---------- */
function renderTraitPicker(){
  const row=$("traitRow");
  row.innerHTML="";
  db.traits.forEach((t,i)=>{
    const b=document.createElement("button");
    b.className="pill"+(i===0?" active":"");
    b.textContent=t.name;
    b.onclick=()=>{
      row.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      row.dataset.selected=t.id;
    };
    row.appendChild(b);
  });
  row.dataset.selected=db.traits[0]?.id || "charming";
}

function renderCountryPicker(){
  const sel=$("countryInput");
  sel.innerHTML=countries.map(c=>`<option value="${c}">${c}</option>`).join("");
  sel.value="United Kingdom";
}

/* ---------- Navigation ---------- */
function show(viewId){
  ["viewSetup","viewLife","viewRelationships","viewActivities","viewCareer"].forEach(id=>{
    $(id).classList.toggle("hidden", id!==viewId);
  });
  document.querySelectorAll(".navBtn").forEach(b=>{
    b.classList.toggle("active", b.dataset.view===viewId);
  });
}

/* ---------- Wire UI (name must be confirmed) ---------- */
function wireUI(){
  document.querySelectorAll(".navBtn").forEach(btn=>{
    btn.onclick = ()=> show(btn.dataset.view);
  });

  $("btnReset").onclick = resetAll;

  // Name confirmation gate
  let nameConfirmed=false;
  const confirmName=()=>{ nameConfirmed=true; };

  $("nameInput").addEventListener("input", ()=>{
    if($("nameInput").value.trim().length>0) confirmName();
  });

  $("countryInput").onchange = ()=>{
    const g=$("genderInput").value;
    $("nameInput").value=generateFullName($("countryInput").value, g);
    nameConfirmed=false;
  };
  $("genderInput").onchange = ()=>{
    $("nameInput").value=generateFullName($("countryInput").value, $("genderInput").value);
    nameConfirmed=false;
  };

  $("btnRandomName").onclick = ()=>{
    $("nameInput").value=generateFullName($("countryInput").value, $("genderInput").value);
    confirmName();
  };

  $("btnDemo").onclick = ()=>{
    $("countryInput").value=pick(countries);
    $("genderInput").value=pick(["female","male","nonbinary"]);
    $("nameInput").value=generateFullName($("countryInput").value, $("genderInput").value);
    confirmName();
    toast("Demo filled.");
  };

  $("btnStart").onclick = ()=>{
    const full=$("nameInput").value.trim();
    if(!full || !nameConfirmed) return alert("Choose a name: type one or press 🎲 to randomize.");

    state = defaultState();
    state.country = $("countryInput").value;
    state.gender = $("genderInput").value;
    state.trait = $("traitRow").dataset.selected || "charming";

    const parts = splitName(full);
    if(!parts.first) return alert("Choose a name: type one or press 🎲.");

    if(!parts.last){
      const auto = splitName(generateFullName(state.country, state.gender));
      state.firstName = parts.first;
      state.lastName = auto.last || "Smith";
    }else{
      state.firstName = parts.first;
      state.lastName = parts.last;
    }

    // parents share surname
    state.relationships.push(makePerson("mother", state.lastName));
    state.relationships.push(makePerson("father", state.lastName));
    ensureParents();

    syncSchool();

    addToFeed("Birth", `You were born in ${state.country}.`);

    save("Saved • new life");
    show("viewLife");
    renderAll();

    // birth event
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

  // career buttons
  $("btnApplyJob").onclick = applyForJob;
  $("btnStudyHard").onclick = ()=>{
    if(!state.school.enrolled){ toast("Not in school."); return; }
    state.school.performance = clamp(state.school.performance+4,0,100);
    state.stats.smarts = clamp(state.stats.smarts+1,0,100);
    toast("You studied harder.");
    addToFeed("School","You studied harder.");
    renderAll(); save();
  };
  $("btnSkipSchool").onclick = ()=>{
    if(!state.school.enrolled){ toast("Not in school."); return; }
    state.school.discipline = clamp(state.school.discipline-6,0,100);
    state.stats.happiness = clamp(state.stats.happiness+1,0,100);
    state.stats.karma = clamp(state.stats.karma-1,0,100);
    toast("You skipped class.");
    addToFeed("School","You skipped class.");
    renderAll(); save();
  };
  $("btnWorkHard").onclick = ()=>{
    if(!state.job){ toast("No job yet."); return; }
    state.job.performance = clamp(state.job.performance+5,0,100);
    state.stats.happiness = clamp(state.stats.happiness-1,0,100);
    toast("You worked harder.");
    addToFeed("Job","You worked harder.");
    renderAll(); save();
  };
  $("btnQuitJob").onclick = ()=>{
    if(!state.job){ toast("No job to quit."); return; }
    addToFeed("Job",`You quit your job as ${state.job.title}.`);
    toast("You quit.");
    state.job=null;
    renderAll(); save();
  };
}

/* ---------- Init ---------- */
(function init(){
  if(!db || !db.events || !countries){
    alert("Data files missing. Ensure /data/events.js and /data/countries.js exist.");
    return;
  }

  renderTraitPicker();
  renderCountryPicker();
  wireUI();

  // preview name (not confirmed)
  $("genderInput").value="female";
  $("nameInput").value=generateFullName($("countryInput").value, $("genderInput").value);

  // PWA service worker
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("/sw.js").catch(()=>{});
  }

  const existing = load();
  if(existing){
    state = existing;

    // migrate safety
    state.feed ||= [];
    state.relationships ||= [];
    state.school ||= { enrolled:false, label:null, performance:55, discipline:70 };
    state.stats ||= { health:80, happiness:80, smarts:50, looks:50, money:0, karma:50 };

    ensureParents();
    syncSchool();

    show("viewLife");
    renderAll();

    $("eventTitle").textContent="Welcome back";
    $("eventText").textContent="Press Age to continue.";
    $("choices").innerHTML="";
    save("Loaded");
  }else{
    state = defaultState();
    show("viewSetup");
  }
})();
