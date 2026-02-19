/* ================================
   NOROVALIFE ENGINE v2
   BitLife-Style Architecture
================================ */

const SAVE_KEY = "norovalife_v200";

const $ = id => document.getElementById(id);
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const rnd = ()=>Math.random();
const pick = arr => arr[Math.floor(rnd()*arr.length)];

let db = window.NOROVA_DATA;
let countries = window.NOROVA_COUNTRIES;
let state = null;

/* =================================
   CORE STATE
================================= */

function defaultState(){
  return {
    firstName:"",
    lastName:"",
    gender:"female",
    country:"United Kingdom",

    age:0,
    alive:true,

    stage:"baby", // baby child teen adult elderly

    stats:{
      health:80,
      happiness:80,
      smarts:50,
      looks:50,
      money:0,
      karma:50
    },

    relationships:[],
    education:null,
    job:null,

    feed:[],
    flags:{},
    lastEvent:null
  };
}

/* =================================
   SAVE SYSTEM
================================= */

function save(){
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}
function load(){
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? JSON.parse(raw) : null;
}
function resetLife(){
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

/* =================================
   LIFE FEED (MAIN SCREEN)
================================= */

function addFeed(title,text){
  state.feed.unshift({
    age:state.age,
    title,
    text,
    time:Date.now()
  });
  renderFeed();
}

function renderFeed(){
  const el = $("lifeFeed");
  if(!el) return;

  if(!state.feed.length){
    el.innerHTML = `
      <div class="feedItem">
        <div class="muted tiny">Your life story will appear here.</div>
      </div>`;
    return;
  }

  el.innerHTML = state.feed.map(entry=>`
    <div class="feedItem">
      <div class="feedTop">
        <div>${entry.title}</div>
        <div class="feedAge">Age ${entry.age}</div>
      </div>
      <div class="feedText">${entry.text}</div>
    </div>
  `).join("");
}

/* =================================
   STAGE SYSTEM
================================= */

function updateLifeStage(){
  if(state.age < 3) state.stage="baby";
  else if(state.age < 13) state.stage="child";
  else if(state.age < 18) state.stage="teen";
  else if(state.age < 60) state.stage="adult";
  else state.stage="elderly";
}

/* =================================
   RELATIONSHIPS
================================= */

function makeParent(type){
  return {
    id:crypto.randomUUID(),
    type,
    name:type==="mother"?"Mother":"Father",
    closeness:70
  };
}

function ensureParents(){
  if(!state.relationships.some(r=>r.type==="mother"))
    state.relationships.push(makeParent("mother"));
  if(!state.relationships.some(r=>r.type==="father"))
    state.relationships.push(makeParent("father"));
}

/* =================================
   AGE SYSTEM (MAIN LOOP)
================================= */

function ageUp(){
  if(!state.alive) return;

  state.age++;
  updateLifeStage();

  // passive stat decay
  state.stats.happiness = clamp(state.stats.happiness-1,0,100);
  if(state.age > 40) state.stats.health = clamp(state.stats.health-1,0,100);

  addFeed("You aged up", `You are now ${state.age} years old.`);

  runYearEvent();
  checkDeath();

  renderAll();
  save();
}

/* =================================
   EVENTS
================================= */

function runYearEvent(){

  const eligible = db.events.filter(e=>{
    return state.age >= e.ageMin &&
           state.age <= e.ageMax &&
           (!e.stage || e.stage===state.stage);
  });

  if(!eligible.length){
    addFeed("A quiet year","Nothing significant happened this year.");
    return;
  }

  const ev = pick(eligible);

  state.lastEvent = ev.id;

  showEvent(ev);
}

function showEvent(ev){

  $("eventTitle").textContent = ev.title;
  $("eventText").textContent = ev.text
    .replace("{name}",`${state.firstName} ${state.lastName}`)
    .replace("{country}",state.country);

  const wrap = $("choices");

  wrap.innerHTML = ev.choices.map((c,i)=>`
    <button class="choice" data-i="${i}">${c.label}</button>
  `).join("");

  wrap.querySelectorAll("button").forEach(btn=>{
    btn.onclick=()=>{
      const choice = ev.choices[btn.dataset.i];

      applyEffects(choice.effects);

      addFeed(ev.title, ev.text);
      addFeed("You chose:", choice.label);

      wrap.innerHTML="";

      renderAll();
      save();
    };
  });
}

function applyEffects(effects){
  if(!effects) return;
  Object.entries(effects).forEach(([k,v])=>{
    if(state.stats[k]!==undefined){
      state.stats[k]=clamp(state.stats[k]+v,0,100);
    }
    if(k==="money"){
      state.stats.money += v;
    }
  });
}

/* =================================
   DEATH SYSTEM
================================= */

function checkDeath(){
  if(state.stats.health <= 0){
    state.alive=false;
    addFeed("You died","Your health reached zero.");
    $("eventTitle").textContent="Game Over";
    $("eventText").textContent="You have died.";
    $("choices").innerHTML=`<button class="choice" onclick="resetLife()">Start New Life</button>`;
  }
}

/* =================================
   RENDER
================================= */

function renderProfile(){
  $("whoLine").textContent =
    `${state.firstName} ${state.lastName} • Age ${state.age}`;

  $("metaLine").textContent =
    `${state.country} • ${state.gender} • ${state.stage}`;

  $("moneyLine").textContent =
    "£" + state.stats.money.toLocaleString();
}

function renderStats(){
  const stats = [
    ["health","Health"],
    ["happiness","Happiness"],
    ["smarts","Smarts"],
    ["looks","Looks"],
    ["karma","Karma"]
  ];

  $("statsGrid").innerHTML =
    stats.map(([key,label])=>`
      <div class="stat">
        <div class="statName">${label}</div>
        <div class="bar">
          <div class="fill" style="width:${state.stats[key]}%"></div>
        </div>
        <div class="statVal">${state.stats[key]}</div>
      </div>
    `).join("");
}

function renderAll(){
  renderProfile();
  renderStats();
  renderFeed();
}

/* =================================
   START LIFE
================================= */

function startLife(){

  const name = $("nameInput").value.trim();
  if(!name) return alert("Choose a name first.");

  state = defaultState();

  const parts = name.split(" ");
  state.firstName = parts[0];
  state.lastName = parts.slice(1).join(" ") || "Smith";

  state.gender = $("genderInput").value;
  state.country = $("countryInput").value;

  ensureParents();

  addFeed("Birth",`You were born in ${state.country}.`);

  show("viewLife");
  renderAll();
  save();
}

/* =================================
   INIT
================================= */

function show(view){
  ["viewSetup","viewLife","viewRelationships","viewActivities"]
  .forEach(v=>$(v).classList.toggle("hidden",v!==view));
}

(function init(){

  if(!db || !countries){
    alert("Missing data files.");
    return;
  }

  $("btnStart").onclick=startLife;
  $("btnAge").onclick=ageUp;
  $("btnReset").onclick=resetLife;

  const existing = load();
  if(existing){
    state=existing;
    show("viewLife");
    renderAll();
  }else{
    state=defaultState();
    show("viewSetup");
  }

})();
