const setup=document.getElementById('setup');
const game=document.getElementById('game');
const profile=document.getElementById('profile');
const stats=document.getElementById('stats');
const feed=document.getElementById('feed');

document.getElementById('startBtn').onclick=()=>{
const name=document.getElementById('nameInput').value||'Unnamed';
const country=document.getElementById('countryInput').value;
state=createState(name,country);
setup.classList.add('hidden');
game.classList.remove('hidden');
updateUI();
};

document.getElementById('ageBtn').onclick=ageUp;

function updateUI(){
profile.innerHTML=`<b>${state.name}</b> | Age ${state.age} | ${state.country}`;
stats.innerHTML=Object.entries(state.stats).map(([k,v])=>`<div>${k}: ${v}</div>`).join('');
feed.innerHTML=state.feed.map(e=>`<div class="feedEntry">${e}</div>`).join('');
}