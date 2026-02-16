function ageUp(){
state.age++;
state.stats.health-=1;
state.stats.happiness-=1;
if(state.stats.crime>70&&Math.random()<0.3){
addFeed(`Age ${state.age}: You were arrested.`);
state.stats.reputation-=10;
}
generateRandomEvent();
updateUI();
}
function addFeed(text){state.feed.unshift(text);}