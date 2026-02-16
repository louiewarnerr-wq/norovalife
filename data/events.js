window.NOROVA_DATA = {
  traits: [
    { id:"charming", name:"Charming", boostTags:["social"] },
    { id:"studious", name:"Studious", boostTags:["school","career"] },
    { id:"hustler",  name:"Hustler",  boostTags:["money"] },
    { id:"tough",    name:"Tough",    boostTags:["health"] },
    { id:"devious",  name:"Devious",  boostTags:["crime"] },
    { id:"chaotic",  name:"Chaotic",  boostTags:["random"] },
  ],

  // NOTE: scalable format:
  // requirements: { minStat: {health:40}, flag:"cheatedTest" }
  // risk: { chance:0.25, onFail:{...effects}, failText:"..." }
  events: [
    {
      id:"born",
      ageMin:0, ageMax:0, weight:999,
      tags:["random"],
      title:"You were born",
      text:"A new life begins in {country}.",
      choices:[
        { label:"Begin", effects:{ happiness:+6, health:+2 } }
      ]
    },

    {
      id:"first_friend",
      ageMin:5, ageMax:12, weight:14,
      tags:["social"],
      title:"A potential friend",
      text:"Someone wants to hang out with you at school.",
      choices:[
        { label:"Be friendly", effects:{ happiness:+3, karma:+1 }, addRelationship:{ type:"friend" } },
        { label:"Ignore them", effects:{ happiness:-2, karma:-1 } }
      ]
    },

    {
      id:"exam",
      ageMin:10, ageMax:18, weight:14,
      tags:["school"],
      title:"Big exam",
      text:"You have an important exam coming up.",
      choices:[
        { label:"Study hard", effects:{ intelligence:+3, happiness:-1 } },
        { label:"Wing it", effects:{ intelligence:-2, happiness:+2 } }
      ]
    },

    {
      id:"cheat_test",
      ageMin:12, ageMax:18, weight:10,
      tags:["school","crime"],
      title:"Cheat on a test?",
      text:"You can see the answers. Nobody is looking.",
      choices:[
        {
          label:"Cheat",
          effects:{ intelligence:+1, karma:-4, happiness:+1 },
          flags:{ cheatedTest:true },
          risk:{ chance:0.25, onFail:{ happiness:-3, karma:-2 }, failText:"You got caught and embarrassed." }
        },
        { label:"Don't cheat", effects:{ karma:+2, happiness:-1 } }
      ]
    },

    {
      id:"steal",
      ageMin:14, ageMax:40, weight:10,
      tags:["crime","money"],
      title:"Sticky fingers",
      text:"You see something expensive unattended.",
      choices:[
        {
          label:"Steal it",
          effects:{ money:+250, karma:-5, happiness:+1 },
          risk:{ chance:0.30, onFail:{ money:-400, happiness:-3, karma:-2 }, failText:"Security caught you." }
        },
        { label:"Walk away", effects:{ karma:+2 } }
      ]
    },

    {
      id:"sick_day",
      ageMin:1, ageMax:90, weight:12,
      tags:["health"],
      title:"Sick day",
      text:"You feel ill and exhausted.",
      choices:[
        { label:"Rest", effects:{ health:+3, happiness:+1, money:-20 } },
        { label:"Ignore it", effects:{ health:-4, happiness:-1 } }
      ]
    },

    {
      id:"job_shift",
      ageMin:16, ageMax:65, weight:12,
      tags:["career","money"],
      title:"Extra shift",
      text:"You have a chance to pick up extra work.",
      choices:[
        { label:"Do it", effects:{ money:+180, happiness:-1, karma:+1 } },
        { label:"Skip", effects:{ happiness:+1 } }
      ]
    },

    {
      id:"promotion",
      ageMin:22, ageMax:65, weight:9,
      tags:["career","money"],
      title:"Promotion chance",
      text:"Your manager is watching your performance.",
      choices:[
        { label:"Go all in", effects:{ money:+450, intelligence:+1, happiness:-1 } },
        { label:"Coast", effects:{ happiness:+2, karma:-1 } }
      ]
    },

    {
      id:"old_scandal",
      ageMin:20, ageMax:60, weight:6,
      tags:["random","crime"],
      requirements:{ flag:"cheatedTest" },
      title:"Old scandal resurfaces",
      text:"Something from your past comes back around.",
      choices:[
        { label:"Deny it", effects:{ happiness:-1 } },
        { label:"Own it", effects:{ karma:+1, happiness:+1 } }
      ]
    }
  ]
};
