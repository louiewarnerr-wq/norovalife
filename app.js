let age = 0;
let health = 80;
let happiness = 80;
let money = 0;

function updateStats() {
  document.getElementById("stats").innerHTML =
    `Age: ${age} <br>
     Health: ${health} <br>
     Happiness: ${happiness} <br>
     Money: $${money}`;
}

function ageUp() {
  age++;
  randomEvent();
  updateStats();
}

function randomEvent() {
  const events = [
    {
      text: "You found $20!",
      effect: () => money += 20
    },
    {
      text: "You caught a cold.",
      effect: () => health -= 10
    },
    {
      text: "You made a new friend!",
      effect: () => happiness += 10
    }
  ];

  let event = events[Math.floor(Math.random() * events.length)];
  event.effect();
  document.getElementById("event").innerText = event.text;
}

updateStats();
