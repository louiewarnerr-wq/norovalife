function generateRandomEvent(){
const roll=Math.random();
if(roll<0.25){
state.stats.money+=200;
addFeed(`Age ${state.age}: You earned $200.`);
}else if(roll<0.5){
state.stats.crime+=10;
addFeed(`Age ${state.age}: You committed a minor crime.`);
}else if(roll<0.75){
state.stats.intelligence+=2;
addFeed(`Age ${state.age}: You studied hard.`);
}else{
addFeed(`Age ${state.age}: Nothing special happened.`);
}}