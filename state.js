let state=null;
function createState(name,country){
return{
name,country,age:0,
stats:{health:80,happiness:80,intelligence:50,money:0,reputation:50,crime:0},
relationships:[],feed:[]};
}