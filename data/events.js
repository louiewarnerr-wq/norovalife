window.NOROVA_DATA = {
  traits: [
    { id:"charming", name:"Charming", boostTags:["social","romance"] },
    { id:"genius", name:"Genius", boostTags:["school","career"] },
    { id:"rebellious", name:"Rebellious", boostTags:["crime","chaos"] },
    { id:"athletic", name:"Athletic", boostTags:["health","sports"] }
  ],

  // Event format:
  // { id, ageMin, ageMax, title, text, tags, weight, requirements?, choices:[{label,effects,flags,addRelationship?}] }
  events: [
    {
      id:"birth",
      ageMin:0, ageMax:0,
      title:"Birth",
      text:"You were born in {country}.",
      tags:["life"],
      weight:100,
      choices:[
        { label:"Hello world", effects:{ happiness:+1 } }
      ]
    },

    {
      id:"first_steps",
      ageMin:1, ageMax:2,
      title:"First steps",
      text:"You take your first steps and wobble like a tiny legend.",
      tags:["life"],
      weight:20,
      choices:[
        { label:"Keep walking", effects:{ health:+1, happiness:+1 } }
      ]
    },

    {
      id:"school_friend",
      ageMin:6, ageMax:12,
      title:"A new friend",
      text:"Someone in class asks if you want to be friends.",
      tags:["social","school"],
      weight:16,
      choices:[
        { label:"Sure!", effects:{ happiness:+2 }, addRelationship:{ type:"friend" } },
        { label:"Ignore them", effects:{ karma:-1, happiness:-1 } }
      ]
    },

    {
      id:"exam",
      ageMin:12, ageMax:17,
      title:"Big exam",
      text:"You have a big exam coming up. What do you do?",
      tags:["school"],
      weight:16,
      choices:[
        { label:"Study hard", effects:{ intelligence:+3, happiness:-1 } },
        { label:"Wing it", effects:{ intelligence:+1 } },
        { label:"Skip it", effects:{ happiness:+1, karma:-2 } }
      ]
    },

    {
      id:"job_offer",
      ageMin:16, ageMax:40,
      title:"Job opportunity",
      text:"You see a job opportunity and consider applying.",
      tags:["career"],
      weight:10,
      choices:[
        { label:"Apply", effects:{ happiness:+1 } },
        { label:"Not now", effects:{ happiness:0 } }
      ]
    },

    {
      id:"argument_parent",
      ageMin:10, ageMax:25,
      title:"Family argument",
      text:"You get into an argument at home.",
      tags:["family"],
      weight:12,
      choices:[
        { label:"Apologize", effects:{ karma:+1, happiness:+1 } },
        { label:"Double down", effects:{ karma:-2, happiness:-1 } }
      ]
    },

    {
      id:"random_luck",
      ageMin:18, ageMax:60,
      title:"Random luck",
      text:"You find some money on the ground.",
      tags:["money"],
      weight:8,
      choices:[
        { label:"Keep it", effects:{ money:+120, karma:-1 } },
        { label:"Hand it in", effects:{ karma:+2 } }
      ]
    }
  ]
};
