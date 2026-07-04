// ═══════════════════════════════════════════════════════════════
//  HAWTHORNE'S DIGITAL ESTATE v2 — Enhanced Game Engine
//  + Audio Engine · Particles · Screen Shake · XP System
//  + Achievements · Chang Encounters · Pierce Hologram
//  + Minimap · Floating Damage · Status Effects · Event Log
// ═══════════════════════════════════════════════════════════════
'use strict';

// ─────────────────────────────────────────────────────────────
//  WEB AUDIO ENGINE  (chiptune sounds, no external files)
// ─────────────────────────────────────────────────────────────
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function resumeAudio() { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }

function playTone(freq, type='square', dur=0.12, vol=0.18, delay=0) {
  try {
    const ac = getAudio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    gain.gain.setValueAtTime(vol, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + dur + 0.01);
  } catch(e) {}
}

const SFX = {
  move()    { playTone(220,'square',0.06,0.10); },
  hit()     { playTone(80,'sawtooth',0.15,0.20); playTone(60,'square',0.1,0.15,0.05); },
  heal()    { playTone(523,'sine',0.1,0.15); playTone(659,'sine',0.1,0.12,0.1); playTone(784,'sine',0.15,0.10,0.2); },
  victory() { [523,659,784,1047].forEach((f,i)=>playTone(f,'square',0.15,0.15,i*0.1)); },
  defeat()  { [440,330,220,110].forEach((f,i)=>playTone(f,'sawtooth',0.2,0.20,i*0.12)); },
  ability() { playTone(880,'square',0.08,0.18); playTone(1100,'square',0.08,0.15,0.08); playTone(1320,'square',0.12,0.12,0.16); },
  item()    { playTone(660,'sine',0.08,0.12); playTone(880,'sine',0.1,0.10,0.08); },
  dialogue(){ playTone(440,'square',0.04,0.08); },
  levelup() { [262,330,392,523,659,784,1047].forEach((f,i)=>playTone(f,'square',0.18,0.18,i*0.07)); },
  achieve() { [523,784,1047].forEach((f,i)=>playTone(f,'sine',0.18,0.15,i*0.1)); },
  error()   { playTone(150,'sawtooth',0.1,0.20); },
  tape()    { playTone(330,'square',0.06,0.12); playTone(440,'square',0.06,0.10,0.07); playTone(550,'square',0.12,0.08,0.14); },
  chang()   { playTone(180,'sawtooth',0.04,0.15); playTone(240,'sawtooth',0.04,0.12,0.05); },
  ending()  { [262,294,330,392,440,523].forEach((f,i)=>playTone(f,'sine',0.4,0.15,i*0.15)); },
};

// ─────────────────────────────────────────────────────────────
//  PARTICLE SYSTEM
// ─────────────────────────────────────────────────────────────
const particles = [];
const pCanvas = () => document.getElementById('particle-canvas');
const pCtx    = () => pCanvas()?.getContext('2d');

function spawnParticles(x, y, color, count=12, spread=40) {
  for (let i=0; i<count; i++) {
    const angle = Math.random()*Math.PI*2;
    const speed = 1+Math.random()*3;
    particles.push({
      x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 1,
      color, life:1, decay:0.03+Math.random()*0.04,
      size:2+Math.random()*3
    });
  }
}

function spawnStarBurst(x, y) {
  const colors = ['#ffd700','#ff2d78','#00f5ff','#39ff14','#ffe600'];
  colors.forEach(c=>spawnParticles(x,y,c,5,30));
}

function updateParticles() {
  const c = pCtx(); if (!c) return;
  const cv = pCanvas();
  c.clearRect(0,0,cv.width,cv.height);
  for (let i=particles.length-1; i>=0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.1; // gravity
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i,1); continue; }
    c.globalAlpha = p.life;
    c.fillStyle = p.color;
    c.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.size), Math.ceil(p.size));
  }
  c.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────
//  SCREEN EFFECTS
// ─────────────────────────────────────────────────────────────
function screenShake(intensity='normal') {
  const gc = document.getElementById('game-container');
  gc.classList.remove('shake');
  void gc.offsetWidth; // reflow
  gc.classList.add('shake');
  setTimeout(()=>gc.classList.remove('shake'), 400);
}

function hurtFlash() {
  const gc = document.getElementById('game-container');
  gc.classList.add('hurt-flash');
  setTimeout(()=>gc.classList.remove('hurt-flash'), 350);
}

function fadeTransition(cb) {
  const ov = document.getElementById('transition-overlay');
  ov.classList.add('fade-in');
  setTimeout(()=>{
    if (cb) cb();
    setTimeout(()=>ov.classList.remove('fade-in'), 250);
  }, 250);
}

// ─────────────────────────────────────────────────────────────
//  FLOATING DAMAGE NUMBERS
// ─────────────────────────────────────────────────────────────
function spawnDmgFloat(text, x, y, color='#ff3c3c') {
  const el = document.createElement('div');
  el.className = 'dmg-float';
  el.textContent = text;
  el.style.cssText = `left:${x}px;top:${y}px;color:${color};text-shadow:0 0 8px ${color};`;
  document.getElementById('game-container').appendChild(el);
  setTimeout(()=>el.remove(), 1200);
}

// ─────────────────────────────────────────────────────────────
//  CHARACTER SPRITE DATA  (16×16 pixel maps)
// ─────────────────────────────────────────────────────────────
const CHAR_DATA = {
  jeff: {
    name:'Jeff Winger', title:'The Lawyer', color:'#1e3a6e',
    stats:{hp:100,sp:80,charisma:9,intelligence:7,agility:5,endurance:6,luck:6},
    ability:{name:'Objection!',desc:'Freeze enemy 1 turn, deliver monologue. +35 dmg.'},
    passive:{name:'Leadership Aura',desc:'Allies deal +5% damage. Jeff gains +CHA in dialogue checks.'},
    spCost:18,
    colors:{'0':'N','1':'#ffd5b0','2':'#2c1810','3':'#1e3a6e','4':'#f0e8ff','5':'#a0784a','6':'#ffd700','7':'#d4af37'},
    pixels:[
      '0000033333300000','0000332222330000','0003322112233000',
      '0033211111123300','0032111111112300','0031141111413100',
      '0031111661113100','0033111111133000','0003311111330000',
      '0033344443330000','0033344443330000','0033344343330000',
      '0003344333300000','0000333333000000','0000333333000000','0000355535000000'
    ]
  },
  britta: {
    name:'Britta Perry', title:'The Activist', color:'#7c0000',
    stats:{hp:85,sp:90,charisma:6,intelligence:8,agility:6,endurance:7,luck:3},
    ability:{name:"Britta'd!",desc:'Random effect: heal all / damage all / confusion. Pure chaos.'},
    passive:{name:'Self-Righteous Shield',desc:'–20% damage from authority enemies.'},
    spCost:12,
    colors:{'0':'N','1':'#ffd5b0','2':'#c0392b','3':'#2e4d1a','4':'#4a2800','5':'#ffffff','6':'#ffaa00','7':'#888888'},
    pixels:[
      '0000022222200000','0002222222222000','0022211112222000',
      '0022111111122000','0021114111113000','0021111111113000',
      '0022111151133000','0003311111330000','0003333333330000',
      '0003355335330000','0003355335330000','0003355335330000',
      '0000353353500000','0000333333000000','0000377773000000','0000355535000000'
    ]
  },
  abed: {
    name:'Abed Nadir', title:'The Savant', color:'#4a1a7a',
    stats:{hp:80,sp:100,charisma:5,intelligence:10,agility:7,endurance:5,luck:7},
    ability:{name:'Trope Vision',desc:'Identify enemy weakness instantly. +50% crit chance next hit.'},
    passive:{name:'Fourth Wall Awareness',desc:'Reveals hidden items and secret dialogue options.'},
    spCost:15,
    colors:{'0':'N','1':'#c88040','2':'#1a1a1a','3':'#4a1a7a','4':'#2a5a9a','5':'#ffffff','6':'#f0e8ff','7':'#888888'},
    pixels:[
      '0000022222200000','0002222222222000','0022211112222000',
      '0022111111122000','0021111111113000','0021171171113000',
      '0022111111133000','0003322111330000','0003344443330000',
      '0003344443330000','0004444444440000','0004455554440000',
      '0000445544000000','0000444444000000','0000444444000000','0000377773000000'
    ]
  },
  troy: {
    name:'Troy Barnes', title:'The Goofball', color:'#1e6b1e',
    stats:{hp:95,sp:85,charisma:7,intelligence:5,agility:10,endurance:8,luck:8},
    ability:{name:'Troy & Abed!',desc:'Duo attack (massive dmg + stun if Abed in party).'},
    passive:{name:'Literal Thinking',desc:'Immune to confusion and illusion effects.'},
    spCost:20,
    colors:{'0':'N','1':'#c88040','2':'#2c1810','3':'#1e6b1e','4':'#ffffff','5':'#ffd700','6':'#888888','7':'#ff6600'},
    pixels:[
      '0000022222200000','0002211122222000','0022211112222000',
      '0022111111122000','0021115111113000','0021111111113000',
      '0022111111133000','0003322111330000','0003333333330000',
      '0003344443330000','0003344443330000','0003344443330000',
      '0000344343000000','0000333333000000','0000333333000000','0000366663000000'
    ]
  },
  shirley: {
    name:'Shirley Bennett', title:'The Mom', color:'#8b6914',
    stats:{hp:110,sp:75,charisma:8,intelligence:6,agility:4,endurance:10,luck:7},
    ability:{name:"Mother's Wrath",desc:'AoE attack. +100% damage vs disrespectful enemies.'},
    passive:{name:'Sweet & Savory',desc:'Healing items 50% more effective.'},
    spCost:22,
    colors:{'0':'N','1':'#c88040','2':'#1a0a00','3':'#8b6914','4':'#ff9900','5':'#ffffff','6':'#d4af37','7':'#888888'},
    pixels:[
      '0000022222200000','0002222222222000','0022211112222200',
      '0022111111112300','0021111111113300','0021171171113000',
      '0022111111133000','0003322111330000','0003366663330000',
      '0003366663330000','0003366663330000','0003366663330000',
      '0000366363000000','0000333333000000','0000333333000000','0000377773000000'
    ]
  },
  annie: {
    name:'Annie Edison', title:'The Overachiever', color:'#d35400',
    stats:{hp:75,sp:95,charisma:7,intelligence:10,agility:6,endurance:5,luck:9},
    ability:{name:'Research Binge',desc:'Double XP next 3 encounters, restore 20 HP.'},
    passive:{name:'Spotless',desc:'Immune to poison, burn, and all status effects.'},
    spCost:16,
    colors:{'0':'N','1':'#ffd5b0','2':'#2c1810','3':'#d35400','4':'#ff6600','5':'#ffffff','6':'#1e3a6e','7':'#ffd700'},
    pixels:[
      '0000022222200000','0002222222222000','0022211112222000',
      '0022111111122000','0021111111113000','0021141141113000',
      '0022115111133000','0003322111330000','0003334443330000',
      '0003334443330000','0006666666660000','0006677776660000',
      '0000676776000000','0000666666000000','0000666666000000','0000355535000000'
    ]
  },
  pierce: {
    name:'Pierce Hawthorne', title:'The Eccentric', color:'#555555',
    stats:{hp:'???',sp:'???',charisma:'?',intelligence:'?',agility:'?',endurance:'?',luck:'?'},
    ability:{name:'Hawthorne Legacy',desc:'Massive damage to all. 50% chance allies also hit.'},
    passive:{name:'Old Money Aura',desc:'Random dialogue each turn. Unpredictable chaos.'},
    spCost:0,
    colors:{'0':'N','1':'#ffd5b0','2':'#d4d4d4','3':'#555555','4':'#888888','5':'#ffd700','6':'#ffffff','7':'#1a1a2e'},
    pixels:[
      '0000022222200000','0002222222222000','0022211112222000',
      '0022111111122000','0021111111113000','0021121121113000',
      '0022111111133000','0003322111330000','0003335553330000',
      '0003335553330000','0003335553330000','0003335553330000',
      '0000335353000000','0000333333000000','0000333333000000','0000355535000000'
    ]
  },
  gilbert: {
    name:'Gilbert Hawthorne', title:'The Executor', color:'#2a1a00',
    stats:{hp:120,sp:60,charisma:8,intelligence:9,agility:5,endurance:7,luck:4},
    ability:{name:'Cryptic Guidance',desc:'Gives a hint that may or may not be a lie.'},
    passive:{name:'Hidden Agenda',desc:'Trust score affects all outcomes.'},
    spCost:0,
    colors:{'0':'N','1':'#c88040','2':'#1a1a1a','3':'#2a1a00','4':'#555544','5':'#ffd700','6':'#ffffff','7':'#888888'},
    pixels:[
      '0000022222200000','0002222222222000','0022211112222000',
      '0022111111122000','0021111111113000','0021121121113000',
      '0022111111133000','0003322111330000','0003344443330000',
      '0004444444440000','0004444444440000','0004455554440000',
      '0000445544000000','0000444444000000','0000444444000000','0000355535000000'
    ]
  }
};

const CHAR_KEYS = ['jeff','britta','abed','troy','shirley','annie','pierce'];

// ─────────────────────────────────────────────────────────────
//  ENEMY DATA
// ─────────────────────────────────────────────────────────────
const ENEMIES = {
  corrupted_ancestor:{
    name:'Corrupted Ancestor',maxHp:60,hp:60,atk:12,xpReward:30,
    desc:'A ghost of the Hawthorne bloodline. It judges your worthiness.',
    color:'#7c00ff',weakness:'charisma',weaknessStat:9,
    pixels:[
      '0000066006600000','0000660660660000','0006066006606000',
      '0060000000006000','0600000000000600','6003300000330060',
      '6003300000330060','6000000660000060','6000006666000060',
      '0600000000000600','0060000000006000','0006600666006000',
      '0000666666000000','0000660660000000','0000660660000000','0000000000000000'
    ],
    colors:{'0':'N','6':'#9933ff','3':'#ff2d78'}
  },
  corporate_golem:{
    name:'Corporate Golem',maxHp:80,hp:80,atk:15,xpReward:40,
    desc:'A living suit of armor. It represents the greed of a thousand quarterly earnings calls.',
    color:'#888888',weakness:'intelligence',weaknessStat:8,
    pixels:[
      '0000077777700000','0007777777770000','0077744447770000',
      '0077744447770000','0074444444470000','0074455554470000',
      '0077444444770000','0077744447770000','0007774447700000',
      '0077777777770000','0077744447770000','0077744447770000',
      '0007700007700000','0007700007700000','0007777777700000','0000000000000000'
    ],
    colors:{'0':'N','7':'#aaaaaa','4':'#888888','5':'#ffd700'}
  },
  guilt_ghost:{
    name:'Manifestation of Guilt',maxHp:50,hp:50,atk:18,xpReward:35,
    desc:'Looks like someone you\'ve wronged. Hits harder the more you\'ve hurt people.',
    color:'#ff2d78',weakness:'endurance',weaknessStat:7,
    pixels:[
      '0000044444400000','0004444444440000','0044411114440000',
      '0044111111440000','0041111111140000','0041181181140000',
      '0044111111440000','0004444444400000','0004444444400000',
      '0000444444000000','0000440440000000','0000444444000000',
      '0000404440000000','0000040400000000','0000000000000000','0000000000000000'
    ],
    colors:{'0':'N','4':'#ff2d78','1':'#ffd5b0','8':'#1a1a1a'}
  },
  oedipal_boss:{
    name:"Pierce's Oedipal Complex",maxHp:180,hp:180,atk:28,xpReward:100,
    desc:'A giant, floating Hawthorne Wipes container. The unresolved daddy issues made manifest.',
    color:'#ffd700',weakness:'luck',weaknessStat:6,
    pixels:[
      '0005555555555000','0555666666665550','5556666666666655',
      '5566677776666655','5566677776666655','5566688886666655',
      '5566688886666655','5566677776666655','5566666666666655',
      '5556666666666655','5556666111666655','0555611116665550',
      '0005566666550000','0000555555500000','0000055555000000','0000000000000000'
    ],
    colors:{'0':'N','5':'#ffd700','6':'#f0e8ff','7':'#4a1a7a','8':'#ff2d78','1':'#1a0010'}
  },
  network_execs:{
    name:'The Network Executives',maxHp:130,hp:130,atk:22,xpReward:80,
    desc:'They want to cancel everything. Including you. Including the show.',
    color:'#333333',weakness:'charisma',weaknessStat:9,
    pixels:[
      '0007777777770000','0077777777777000','0077744447770000',
      '0777444444477700','0774444444447700','0774411114447700',
      '0774411114447700','0774411114447700','0774444444447700',
      '0774466664447700','0777444444477700','0077744447777000',
      '0077777777770000','0007777777770000','0000777777000000','0000000000000000'
    ],
    colors:{'0':'N','7':'#333333','4':'#555555','1':'#ffd5b0','6':'#ff2d78'}
  }
};

// ─────────────────────────────────────────────────────────────
//  ROOM DATA
// ─────────────────────────────────────────────────────────────
const ROOMS = {
  foyer:{
    id:'foyer',name:'THE FOYER',emoji:'🏛️',
    desc:"Grand entrance of Hawthorne Manor. Gilbert's hologram flickers.",
    bg:'#0a0018',accent:'#7c00ff',floorColor:'#1a0030',
    exits:{east:'hall_of_portraits',south:'vault_of_greed',west:'study_room_save'},
    enemies:[],items:[],npc:'gilbert_intro',
  },
  hall_of_portraits:{
    id:'hall_of_portraits',name:'HALL OF PORTRAITS',emoji:'🖼️',
    desc:'Stern Hawthorne ancestors glare from frames. Their eyes follow you.',
    bg:'#100008',accent:'#ff2d78',floorColor:'#200010',
    exits:{west:'foyer',east:'memory_dungeon',north:'vault_of_greed'},
    enemies:['corrupted_ancestor','corrupted_ancestor'],
    items:['margarets_brooch'],npc:null,
  },
  vault_of_greed:{
    id:'vault_of_greed',name:'VAULT OF GREED',emoji:'💰',
    desc:'Piles of gold. Each item you take increases your Greed meter.',
    bg:'#180800',accent:'#ffd700',floorColor:'#1a0800',
    exits:{north:'foyer',east:'boardroom',south:'memory_dungeon'},
    enemies:['corporate_golem'],
    items:['hawthorne_bucks','golden_wipe','cornelius_key'],npc:null,
  },
  memory_dungeon:{
    id:'memory_dungeon',name:'MEMORY DUNGEON',emoji:'🌀',
    desc:'Echoes of your worst moments. The dungeon knows your deepest fear.',
    bg:'#001018',accent:'#00f5ff',floorColor:'#001020',
    exits:{west:'hall_of_portraits',north:'vault_of_greed',east:'boardroom'},
    enemies:['guilt_ghost','guilt_ghost'],
    items:['tape_d_and_d','tape_paintball'],npc:null,
  },
  study_room_save:{
    id:'study_room_save',name:'STUDY ROOM TABLE',emoji:'📚',
    desc:'Safe haven. Your friends sit arguing about nothing important. It feels like home.',
    bg:'#080020',accent:'#39ff14',floorColor:'#0a0025',
    exits:{east:'foyer'},
    enemies:[],items:['energy_drink','study_notes'],npc:'group_chat',
    isSafeRoom:true,
  },
  boardroom:{
    id:'boardroom',name:'BOARDROOM OF ABSURDITY',emoji:'🏦',
    desc:'A giant conference table. The final gatekeepers wait here.',
    bg:'#0a0a00',accent:'#ffe600',floorColor:'#0f0f00',
    exits:{west:'vault_of_greed',south:'memory_dungeon',north:'sanctum'},
    enemies:['network_execs','corporate_golem'],
    items:['tape_blanket_fort','gilbert_manifest'],npc:'gilbert_antagonist',
  },
  sanctum:{
    id:'sanctum',name:'SANCTUM OF THE HEIR',emoji:'👑',
    desc:'The heart of the manor. The Inheritance Code glows on the altar.',
    bg:'#1a0a00',accent:'#ffd700',floorColor:'#140800',
    exits:{},
    enemies:['oedipal_boss'],
    items:['inheritance_code','tape_dreamatorium'],npc:'cornelius_ghost',
    isFinal:true,
  }
};

// Map layout for minimap (row, col)
const MAP_LAYOUT = [
  ['','','vault_of_greed','',''],
  ['study_room_save','foyer','hall_of_portraits','memory_dungeon','boardroom'],
  ['','','','','sanctum'],
];

const ITEMS = {
  energy_drink:  {id:'energy_drink',  name:'Energy Drink', icon:'🧪',desc:'Restores 30 HP',effect:{hp:30}},
  study_notes:   {id:'study_notes',   name:'Study Notes',  icon:'📝',desc:'Restores 25 SP',effect:{sp:25}},
  margarets_brooch:{id:'margarets_brooch',name:"Margaret's Brooch",icon:'💎',desc:'+charisma aura',effect:{temp_stat:'charisma',temp_val:2}},
  hawthorne_bucks: {id:'hawthorne_bucks', name:'Hawthorne Bucks', icon:'💰',desc:'+20 gold, +5 Greed',effect:{greed:5,gold:20}},
  golden_wipe:   {id:'golden_wipe',   name:'Golden Wipe',  icon:'✨',desc:'Heals 60 HP fully',effect:{hp:60}},
  cornelius_key: {id:'cornelius_key', name:"Cornelius's Key",icon:'🗝️',desc:'Opens the Sanctum.',effect:{unlock:'sanctum'}},
  tape_d_and_d:  {id:'tape_d_and_d',  name:'Tape: D&D Episode',icon:'📼',desc:'Flashback tape.',isTape:true},
  tape_paintball:{id:'tape_paintball',name:'Tape: Paintball',icon:'📼',desc:'Flashback tape.',isTape:true},
  tape_blanket_fort:{id:'tape_blanket_fort',name:'Tape: Blanket Fort',icon:'📼',desc:'Flashback tape.',isTape:true},
  tape_dreamatorium:{id:'tape_dreamatorium',name:'Tape: Dreamatorium',icon:'📼',desc:'The rarest tape.',isTape:true},
  gilbert_manifest:{id:'gilbert_manifest',name:"Gilbert's Manifesto",icon:'📜',desc:'Reveals his true plan.',effect:{trust_gilbert:-30}},
  inheritance_code:{id:'inheritance_code',name:'Inheritance Code',icon:'👑',desc:'The phrase that unlocks everything.',effect:{}}
};

// ─────────────────────────────────────────────────────────────
//  DIALOGUES
// ─────────────────────────────────────────────────────────────
const DIALOGUES = {
  gilbert_intro:[
    {speaker:'GILBERT',text:"Welcome, heirs and... hangers-on. You stand in Hawthorne Manor."},
    {speaker:'GILBERT',text:"Your goal: reach the Sanctum at the heart of this maze and find the Inheritance Code."},
    {speaker:'GILBERT',text:"My father was paranoid and vindictive. He filled this place with traps and moral dilemmas designed to expose your true nature."},
    {speaker:'ABED',   text:"Procedural generation. The game learns our patterns and adjusts to exploit our specific psychological weaknesses."},
    {speaker:'JEFF',   text:"So it's basically therapy. But with monsters."},
    {speaker:'GILBERT',text:"Precisely. Trust me, and you may survive. Now — begin."},
  ],
  group_chat:[
    {speaker:'JEFF',   text:"Can we just acknowledge how insane this is? We are literally inside a video game."},
    {speaker:'BRITTA', text:"This is a perfect metaphor for capitalist inheritance systems. The game is the oppressor."},
    {speaker:'TROY',   text:"Does anyone else feel like pixels? I feel like pixels. Do pixels feel things?"},
    {speaker:'ABED',   text:"This is the safe room. Narrative convention dictates nothing bad can happen here. Probably."},
    {speaker:'SHIRLEY',text:"I packed snacks. Even in the digital realm, someone has to be responsible."},
    {speaker:'ANNIE',  text:"I've mapped three rooms already. We need a more strategic approach."},
    {speaker:'PIERCE', text:"In my day, video games had one button and you liked it."},
  ],
  gilbert_antagonist:[
    {speaker:'GILBERT',text:"You've made it this far. I'm genuinely impressed. Not enough to stop, but — impressed."},
    {speaker:'GILBERT',text:"Here's the thing: the Inheritance Code doesn't exist. My father designed this to destroy his heir, not reward them."},
    {speaker:'GILBERT',text:"Sign the estate over to me now. It's the only rational choice."},
    {options:true,question:'What do you do?',choices:[
      {text:'Trust Gilbert — he might actually be right.',key:'trust_gilbert'},
      {text:'"Nice try, Gilbert." Keep going.',key:'defy_gilbert'},
      {text:'Ask Abed what the narrative trope is here.',key:'ask_abed'},
    ]}
  ],
  cornelius_ghost:[
    {speaker:'CORNELIUS',text:"So... you made it. I genuinely didn't think anyone would."},
    {speaker:'CORNELIUS',text:"I built this manor to find the one person worthy of the Hawthorne name."},
    {speaker:'CORNELIUS',text:"Someone ruthless. Clever. Willing to sacrifice what matters for what's profitable."},
    {speaker:'CORNELIUS',text:"But you... you kept your companions. You didn't destroy them to get here."},
    {speaker:'CORNELIUS',text:"I don't know whether that makes you worthy — or just a fool who got lucky."},
    {speaker:'CORNELIUS',text:"The choice is yours now. What kind of heir will you be?"},
  ],
  pierce_hologram_lines:[
    "In my day, we inherited things WITHOUT the lasers!",
    "Has anyone seen my hoverchair? It's a hoverchair.",
    "I invented this! The whole game! Ask anyone.",
    "Are you my son? You're not my son.",
    "I'm not racist. I have a Black friend. His name is... Gary.",
  ],
  chang_lines:[
    "CHANG! CHANG! CHA— oh, wrong universe.",
    "I took something. I'm not saying what.",
    "The security guard sees EVERYTHING.",
    "Vote for Chang! For something!",
  ],
};

// ─────────────────────────────────────────────────────────────
//  ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────
const ACHIEVEMENTS = {
  first_blood:{id:'first_blood',name:'First Blood',icon:'⚔️',desc:'Win your first combat.'},
  tape_collector:{id:'tape_collector',name:'Tape Collector',icon:'📼',desc:'Collect 2 tapes.'},
  all_tapes:{id:'all_tapes',name:'The Meta-Archivist',icon:'🎬',desc:'Collect all 4 tapes.'},
  full_party:{id:'full_party',name:'Study Group Complete',icon:'👥',desc:'Recruit all companions.'},
  defy_gilbert:{id:'defy_gilbert',name:"Don't Trust Gilbert",icon:'🚫',desc:'Refuse Gilbert\'s deal.'},
  greedy_ending:{id:'greedy_ending',name:'Hollow Victory',icon:'💰',desc:'Take the greedy ending.'},
  selfless_ending:{id:'selfless_ending',name:'The Good Ending™',icon:'🤝',desc:'Split it equally.'},
  chaos_ending:{id:'chaos_ending',name:'Gilbertian Order',icon:'🎭',desc:'Give it to Gilbert.'},
  secret_ending:{id:'secret_ending',name:'The Only Ending',icon:'🌀',desc:'Find the Abed ending.'},
  survivor:{id:'survivor',name:'Barely Alive',icon:'💀',desc:'Survive with HP ≤ 5.'},
  level_up_3:{id:'level_up_3',name:'Greendale Graduate',icon:'🎓',desc:'Reach level 3.'},
};

// ─────────────────────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────────────────────
let G = {
  player:null, level:1, xp:0, xpToNext:50,
  currentRoom:'foyer', visitedRooms:new Set(['foyer']),
  inventory:['energy_drink','study_notes'],
  tapes:[], gold:0, playtime:0,
  hp:100, maxHp:100, sp:80, maxSp:80,
  greedLevel:0, friendshipLevel:50, chaosLevel:0, gilbertTrust:50,
  roomsCleared:{}, flags:{}, achievements:new Set(),
  statusEffects:[], // [{type,turns}]
  activeEnemy:null, inCombat:false,
  phase:'explore', // explore|combat|dialogue|skillcheck|menu
  personalTestDone:false, finalChoiceMade:false, ending:null,
  eventLog:[], recruitedCompanions:new Set(),
  researchBingeActive:false, researchBingeTurns:0,
  startTime:Date.now(),
};

// ─────────────────────────────────────────────────────────────
//  SPRITE RENDERER
// ─────────────────────────────────────────────────────────────
function drawSpriteToCtx(cx,charKey,x,y,scale=2,alpha=1) {
  const C = CHAR_DATA[charKey]; if (!C) return;
  const prevAlpha = cx.globalAlpha;
  cx.globalAlpha = alpha;
  C.pixels.forEach((row,ry)=>{
    for (let px=0; px<row.length; px++) {
      const c = C.colors[row[px]];
      if (!c||c==='N') continue;
      cx.fillStyle=c;
      cx.fillRect(x+px*scale, y+ry*scale, scale, scale);
    }
  });
  cx.globalAlpha = prevAlpha;
}

function drawEnemySprite(cx,enemyKey,x,y,scale=3,alpha=1) {
  const E = ENEMIES[enemyKey]; if (!E) return;
  const prevAlpha = cx.globalAlpha;
  cx.globalAlpha = alpha;
  E.pixels.forEach((row,ry)=>{
    for (let px=0; px<row.length; px++) {
      const c = E.colors[row[px]];
      if (!c||c==='N') continue;
      cx.fillStyle=c;
      cx.fillRect(x+px*scale, y+ry*scale, scale, scale);
    }
  });
  cx.globalAlpha = prevAlpha;
}

// ─────────────────────────────────────────────────────────────
//  CANVAS ROOM RENDERER
// ─────────────────────────────────────────────────────────────
const gameCanvas = () => document.getElementById('game-canvas');
const gameCtx    = () => gameCanvas()?.getContext('2d');

function renderRoom(room) {
  const cv = gameCanvas(); if (!cv) return;
  const cx = cv.getContext('2d');
  const W=cv.width, H=cv.height, t=Date.now()/1000;
  cx.clearRect(0,0,W,H);

  // Sky gradient
  const grad = cx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,room.bg); grad.addColorStop(1,'#000');
  cx.fillStyle=grad; cx.fillRect(0,0,W,H);

  // Subtle grid floor
  cx.strokeStyle=room.accent+'20';
  cx.lineWidth=1;
  for (let ty=H-100;ty<H;ty+=14) for (let tx=0;tx<W;tx+=14) cx.strokeRect(tx,ty,14,14);

  // Wall line
  cx.fillStyle=room.accent+'40';
  cx.fillRect(0,H-102,W,3);

  // Room-specific decor
  drawRoomDecor(cx,room,W,H,t);

  // Exit indicators
  cx.font='bold 11px monospace'; cx.textAlign='center'; cx.textBaseline='middle';
  const exits = room.exits;
  if (exits.north){ cx.fillStyle='#ffffff50'; cx.fillText(`▲ ${ROOMS[exits.north]?.name||''}`,W/2,18); }
  if (exits.south){ cx.fillStyle='#ffffff50'; cx.fillText('▼',W/2,H-8); }
  if (exits.east) { cx.save(); cx.translate(W-12,H/2-20); cx.fillStyle='#ffffff50'; cx.fillText('▶',0,0); cx.restore(); }
  if (exits.west) { cx.save(); cx.translate(12,H/2-20); cx.fillStyle='#ffffff50'; cx.fillText('◀',0,0); cx.restore(); }

  // Player sprite (bob animation)
  if (G.player) {
    const bob = Math.sin(t*3)*2;
    const px=W/2-16, py=H-135+bob;
    // Shadow
    cx.fillStyle='#00000050';
    cx.beginPath(); cx.ellipse(W/2,H-100,14,5,0,0,Math.PI*2); cx.fill();
    drawSpriteToCtx(cx,G.player,px,py,2);

    // Player name label
    cx.fillStyle='#ffffff60';
    cx.font='bold 8px "Press Start 2P", monospace';
    cx.textAlign='center';
    cx.fillText(CHAR_DATA[G.player].name.split(' ')[0].toUpperCase(),W/2,H-138+bob);
  }

  // Enemy / NPC markers
  if (room.enemies.length>0 && !G.roomsCleared[room.id]) {
    const ex=W-80, ey=H-180;
    const pulse=0.7+Math.sin(t*4)*0.3;
    cx.fillStyle=`rgba(255,60,60,${pulse})`;
    cx.font='26px monospace'; cx.textAlign='center';
    cx.fillText('👾',ex,ey);
    cx.font='bold 7px "Press Start 2P",monospace'; cx.fillStyle='#ff3c3c';
    cx.fillText('⚠ ENEMY',ex,ey+16);
  }
  if (room.npc && room.npc!=='group_chat') {
    cx.fillStyle='#00f5ff'; cx.font='22px monospace';
    cx.textAlign='center'; cx.fillText('💬',70,H-195);
  }

  // Items sparkle
  const uncollected=(room.items||[]).filter(id=>!G.flags['collected_'+id]);
  uncollected.forEach((id,i)=>{
    const item=ITEMS[id]; if (!item) return;
    const ix=100+i*65, iy=H-178+Math.sin(t*2+i)*5;
    cx.font='18px monospace'; cx.textAlign='center';
    cx.globalAlpha=0.8+Math.sin(t*3+i)*0.2;
    cx.fillText(item.icon,ix,iy);
    cx.globalAlpha=1;
  });
}

function drawRoomDecor(cx,room,W,H,t) {
  cx.save();
  switch(room.id) {
    case 'foyer':
      // Pillars
      [[60,H-165],[W-60,H-165]].forEach(([px,py])=>{
        cx.fillStyle=room.accent+'50'; cx.fillRect(px-10,py,20,80);
        cx.fillStyle=room.accent+'30'; cx.fillRect(px-14,py-8,28,10);
      });
      // Gilbert hologram
      cx.globalAlpha=0.5+Math.sin(t*3)*0.35;
      drawSpriteToCtx(cx,'gilbert',W/2-16,H-190,2,1);
      cx.globalAlpha=1;
      // Hologram scanlines
      cx.fillStyle='#00f5ff20';
      for (let sy=H-190;sy<H-155;sy+=4) cx.fillRect(W/2-18,sy,36,2);
      break;

    case 'hall_of_portraits':
      for (let i=0;i<3;i++) {
        const px=50+i*130,py=H-250;
        cx.strokeStyle='#ffd700'; cx.lineWidth=3;
        cx.strokeRect(px,py,80,90);
        cx.fillStyle=room.accent+'30'; cx.fillRect(px+2,py+2,76,86);
        // Evil eyes
        const eyePulse=0.6+Math.sin(t*2+i)*0.4;
        cx.fillStyle=`rgba(255,45,120,${eyePulse})`;
        cx.fillRect(px+18,py+28,12,9); cx.fillRect(px+48,py+28,12,9);
        // Pupils track toward player
        cx.fillStyle='#1a0010';
        cx.fillRect(px+21+Math.round(Math.sin(t*0.5)*3),py+30,6,5);
        cx.fillRect(px+51+Math.round(Math.sin(t*0.5)*3),py+30,6,5);
      }
      break;

    case 'vault_of_greed':
      // Gold pile
      for (let ci=0;ci<18;ci++) {
        const gx=30+ci*24, gy=H-95+Math.sin(t*1.5+ci)*3;
        cx.fillStyle=ci%3===0?'#ffd700':ci%3===1?'#d4af37':'#ffaa00';
        cx.beginPath(); cx.arc(gx,gy,7,0,Math.PI*2); cx.fill();
      }
      // Chest
      cx.fillStyle='#8b4513'; cx.fillRect(W/2-24,H-145,48,35);
      cx.fillStyle='#ffd700'; cx.fillRect(W/2-24,H-145,48,6);
      cx.fillRect(W/2-7,H-133,14,14);
      // Glint
      cx.fillStyle=`rgba(255,215,0,${0.3+Math.sin(t*4)*0.2})`;
      cx.beginPath(); cx.arc(W/2,H-130,40,0,Math.PI*2); cx.fill();
      break;

    case 'memory_dungeon':
      // Swirling memory orbs
      for (let ri=0;ri<10;ri++) {
        const angle=(ri/10)*Math.PI*2+t*0.8;
        const rx=W/2+Math.cos(angle)*90, ry=H/2-30+Math.sin(angle)*50;
        cx.fillStyle=room.accent+`${Math.round((0.4+Math.sin(t+ri)*0.3)*255).toString(16).padStart(2,'0')}`;
        cx.beginPath(); cx.arc(rx,ry,5+Math.sin(t*2+ri)*2,0,Math.PI*2); cx.fill();
      }
      // Mirror effect
      cx.fillStyle='#001830'; cx.fillRect(W/2-60,H-240,120,130);
      cx.strokeStyle='#00f5ff60'; cx.lineWidth=2; cx.strokeRect(W/2-60,H-240,120,130);
      if (G.player) drawSpriteToCtx(cx,G.player,W/2-8,H-230,2,0.4);
      break;

    case 'study_room_save':
      // Study table
      cx.fillStyle='#5a3500'; cx.fillRect(W/2-120,H-165,240,16);
      cx.fillStyle='#7a4800'; cx.fillRect(W/2-115,H-149,230,10);
      // Chairs
      for (let i=0;i<5;i++) {
        cx.fillStyle='#2a2040'; cx.fillRect(W/2-100+i*50,H-178,30,14);
      }
      // Green safe-room aura
      const safeGrad=cx.createRadialGradient(W/2,H-130,10,W/2,H-130,200);
      safeGrad.addColorStop(0,`rgba(57,255,20,${0.06+Math.sin(t*2)*0.03})`);
      safeGrad.addColorStop(1,'transparent');
      cx.fillStyle=safeGrad; cx.fillRect(0,0,W,H);
      // Text at table
      cx.fillStyle='#39ff1450'; cx.font='bold 7px "Press Start 2P",monospace';
      cx.textAlign='center'; cx.fillText('⟳ SAVE POINT',W/2,H-172);
      break;

    case 'boardroom':
      // Giant table
      cx.fillStyle='#1a1a00'; cx.fillRect(W/2-170,H-205,340,22);
      cx.fillStyle='#3a3a00'; cx.fillRect(W/2-165,H-183,330,10);
      // Boss ominous glow
      const bossAlpha=0.15+Math.sin(t*2)*0.08;
      cx.fillStyle=`rgba(255,215,0,${bossAlpha})`;
      cx.beginPath(); cx.arc(W/2,H-220,70,0,Math.PI*2); cx.fill();
      break;

    case 'sanctum':
      // Altar glow
      const altGrad=cx.createRadialGradient(W/2,H/2-10,20,W/2,H/2-10,160);
      altGrad.addColorStop(0,`rgba(255,215,0,${0.25+Math.sin(t*2)*0.1})`);
      altGrad.addColorStop(1,'transparent');
      cx.fillStyle=altGrad; cx.fillRect(0,0,W,H);
      // Altar
      cx.fillStyle='#2a1000'; cx.fillRect(W/2-35,H-195,70,60);
      cx.fillStyle='#ffd700'; cx.fillRect(W/2-30,H-205,60,14);
      // Crown emoji
      cx.font='28px monospace'; cx.textAlign='center';
      cx.globalAlpha=0.7+Math.sin(t*3)*0.25;
      cx.fillText('👑',W/2,H-220);
      cx.globalAlpha=1;
      // Floating code text
      const codeAlpha=0.3+Math.sin(t)*0.2;
      cx.fillStyle=`rgba(255,215,0,${codeAlpha})`;
      cx.font='bold 7px "Press Start 2P",monospace'; cx.textAlign='center';
      cx.fillText('INHERITANCE CODE',W/2,H-240);
      break;
  }
  cx.restore();
}

// ─────────────────────────────────────────────────────────────
//  COMBAT RENDERER
// ─────────────────────────────────────────────────────────────
let combatAnimT=0;
function renderCombat() {
  const cv=document.getElementById('combat-enemy-canvas');
  if (!cv||!G.activeEnemy) return;
  const cx=cv.getContext('2d');
  cx.clearRect(0,0,cv.width,cv.height);
  cx.fillStyle='#0a0020'; cx.fillRect(0,0,cv.width,cv.height);

  const bob=Math.sin(combatAnimT*0.06)*4;
  combatAnimT++;

  // Hurt flash overlay
  if (G.flags.enemyHurt) {
    drawEnemySprite(cx,G.activeEnemy.key,4,4+bob,3);
    cx.fillStyle='#ff000060'; cx.fillRect(0,0,cv.width,cv.height);
    if (combatAnimT%6===0) G.flags.enemyHurt=false;
  } else {
    drawEnemySprite(cx,G.activeEnemy.key,4,4+bob,3);
  }

  // Enemy aura glow
  const gc=cx.createRadialGradient(cv.width/2,cv.height-10,5,cv.width/2,cv.height-10,50);
  gc.addColorStop(0,G.activeEnemy.color+'40'); gc.addColorStop(1,'transparent');
  cx.fillStyle=gc; cx.fillRect(0,0,cv.width,cv.height);
}

// ─────────────────────────────────────────────────────────────
//  MINIMAP
// ─────────────────────────────────────────────────────────────
function updateMinimap() {
  const mm=document.getElementById('minimap'); if (!mm) return;
  mm.innerHTML='';
  MAP_LAYOUT.forEach((row)=>{
    const rowEl=document.createElement('div');
    rowEl.className='mm-row';
    row.forEach(roomId=>{
      const cell=document.createElement('div');
      if (!roomId) {
        cell.className='mm-cell empty';
      } else {
        cell.className='mm-cell'+(G.visitedRooms.has(roomId)?' visited':'')+(roomId===G.currentRoom?' current':'');
        cell.textContent=G.visitedRooms.has(roomId)?(roomId===G.currentRoom?'◆':'·'):'';
        cell.title=G.visitedRooms.has(roomId)?ROOMS[roomId]?.name:'???';
      }
      rowEl.appendChild(cell);
    });
    mm.appendChild(rowEl);
  });
  mm.classList.add('visible');
}

// ─────────────────────────────────────────────────────────────
//  HUD UPDATE
// ─────────────────────────────────────────────────────────────
const EMOTIONS = ['😐','😤','😰','😊','😎','😢','🤔'];
function updateHUD() {
  if (!G.player) return;
  const C=CHAR_DATA[G.player];

  document.getElementById('hud-name').textContent=C.name.split(' ')[0].toUpperCase();
  document.getElementById('hud-level').textContent='LV '+G.level;

  // Emotion based on HP %
  const hpPct=G.hp/G.maxHp;
  const emo=hpPct>0.8?'😎':hpPct>0.5?'😊':hpPct>0.3?'😤':hpPct>0.1?'😰':'💀';
  document.getElementById('hud-emotion').textContent=emo;

  // Bars
  document.getElementById('hp-bar').style.width=(G.hp/G.maxHp*100)+'%';
  document.getElementById('hp-bar').className='bar hp'+(hpPct<=0.25?' low':'');
  document.getElementById('hp-num').textContent=G.hp+'/'+G.maxHp;
  document.getElementById('sp-bar').style.width=(G.sp/G.maxSp*100)+'%';
  document.getElementById('xp-bar').style.width=(G.xp/G.xpToNext*100)+'%';
  document.getElementById('gilbert-bar').style.width=G.gilbertTrust+'%';
  document.getElementById('tape-count').textContent=G.tapes.length;
  document.getElementById('room-name-display').textContent=ROOMS[G.currentRoom]?.name||'';

  // Algorithm meters
  document.getElementById('algo-greed').style.width=G.greedLevel+'%';
  document.getElementById('algo-friend').style.width=G.friendshipLevel+'%';
  document.getElementById('algo-chaos').style.width=G.chaosLevel+'%';

  // Portrait
  const hpc=document.getElementById('hud-portrait');
  const hctx=hpc.getContext('2d');
  hctx.fillStyle='#1a0030'; hctx.fillRect(0,0,44,44);
  drawSpriteToCtx(hctx,G.player,6,6,2);

  // Low HP warning glow
  if (hpPct<=0.25) {
    hpc.style.boxShadow='0 0 10px #ff3c3c';
  } else {
    hpc.style.boxShadow='none';
  }

  // Survivor achievement
  if (G.hp>0&&G.hp<=5) unlockAchievement('survivor');
  if (G.hp<=0.25*G.maxHp) hurtFlash();

  updateStatusEffectsDisplay();
  updateMinimap();
}

function updateStatusEffectsDisplay() {
  const el=document.getElementById('status-effects'); if (!el) return;
  el.innerHTML='';
  G.statusEffects.forEach(eff=>{
    const b=document.createElement('div');
    b.className='status-badge '+eff.type;
    const icons={stunned:'💫 STUNNED',burning:'🔥 BURN',buffed:'⬆ BUFFED',poisoned:'☠ POISON'};
    b.textContent=(icons[eff.type]||eff.type)+' ('+eff.turns+')';
    el.appendChild(b);
  });
}

// ─────────────────────────────────────────────────────────────
//  UI HELPERS
// ─────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const sc=document.getElementById('screen-'+id);
  sc.classList.add('active');
}

let toastTimer=null;
function showToast(msg,dur=2600) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),dur);
}

function showXpGain(amount) {
  const el=document.getElementById('xp-popup');
  el.textContent='+'+amount+' XP';
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  SFX.achieve();
}

function showLevelUp() {
  const el=document.getElementById('levelup-banner');
  el.textContent='⚡ LEVEL UP! LV '+G.level;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  SFX.levelup();
  spawnStarBurst(240,180);
}

// ─────────────────────────────────────────────────────────────
//  ACHIEVEMENT SYSTEM
// ─────────────────────────────────────────────────────────────
function unlockAchievement(id) {
  if (G.achievements.has(id)) return;
  const ach=ACHIEVEMENTS[id]; if (!ach) return;
  G.achievements.add(id);
  const banner=document.getElementById('achievement-banner');
  document.getElementById('achievement-icon').textContent=ach.icon;
  document.getElementById('achievement-name').textContent=ach.name;
  banner.classList.add('show');
  SFX.achieve();
  setTimeout(()=>banner.classList.remove('show'),3500);
  addToLog(`🏆 Achievement: ${ach.name}`);
}

// ─────────────────────────────────────────────────────────────
//  EVENT LOG
// ─────────────────────────────────────────────────────────────
function addToLog(msg) {
  G.eventLog.unshift(msg);
  if (G.eventLog.length>50) G.eventLog.pop();
}

// ─────────────────────────────────────────────────────────────
//  XP & LEVELLING
// ─────────────────────────────────────────────────────────────
function gainXp(amount) {
  const actual=G.researchBingeActive?amount*2:amount;
  G.xp+=actual;
  showXpGain(actual);
  addToLog(`+${actual} XP`);
  while (G.xp>=G.xpToNext) {
    G.xp-=G.xpToNext;
    G.level++;
    G.xpToNext=Math.floor(G.xpToNext*1.5);
    G.maxHp=Math.min(200,G.maxHp+10);
    G.hp=Math.min(G.maxHp,G.hp+20);
    G.maxSp=Math.min(200,G.maxSp+8);
    showLevelUp();
    if (G.level>=3) unlockAchievement('level_up_3');
  }
  updateHUD();
}

// ─────────────────────────────────────────────────────────────
//  CHANG RANDOM ENCOUNTER
// ─────────────────────────────────────────────────────────────
function maybeSpawnChang() {
  if (Math.random()>0.12) return; // 12% chance per room
  const el=document.getElementById('chang-glitch');
  el.style.left=(20+Math.random()*380)+'px';
  el.style.top=(70+Math.random()*250)+'px';
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  SFX.chang();
  // Maybe steal an item
  if (Math.random()>0.5 && G.inventory.length>1) {
    const stolen=G.inventory.splice(Math.floor(Math.random()*G.inventory.length),1)[0];
    const item=ITEMS[stolen];
    setTimeout(()=>{
      showToast(`😱 Chang stole your ${item?.name||stolen}! Classic.`);
      G.chaosLevel=Math.min(100,G.chaosLevel+5);
      updateHUD();
    },800);
  } else {
    const line=DIALOGUES.chang_lines[Math.floor(Math.random()*DIALOGUES.chang_lines.length)];
    setTimeout(()=>showToast('💬 Chang: "'+line+'"'),600);
  }
}

// ─────────────────────────────────────────────────────────────
//  PIERCE HOLOGRAM
// ─────────────────────────────────────────────────────────────
function maybePierceHologram() {
  if (G.player==='pierce'||Math.random()>0.15) return;
  const hc=document.getElementById('pierce-holo-canvas');
  const hctx=hc.getContext('2d');
  hctx.fillStyle='#0a2a2a'; hctx.fillRect(0,0,32,32);
  drawSpriteToCtx(hctx,'pierce',0,0,2);
  const hl=document.getElementById('pierce-hologram');
  hl.classList.remove('show');
  void hl.offsetWidth;
  hl.classList.add('show');
  const line=DIALOGUES.pierce_hologram_lines[Math.floor(Math.random()*DIALOGUES.pierce_hologram_lines.length)];
  setTimeout(()=>showToast('👻 Pierce Hologram: "'+line+'"'),500);
}

// ─────────────────────────────────────────────────────────────
//  CHARACTER SELECT
// ─────────────────────────────────────────────────────────────
function buildCharacterSelect() {
  const grid=document.getElementById('char-grid');
  grid.innerHTML='';
  CHAR_KEYS.forEach(key=>{
    const C=CHAR_DATA[key];
    const card=document.createElement('div');
    card.className='char-card'; card.dataset.key=key;

    const cc=document.createElement('canvas');
    cc.width=32; cc.height=32; card.appendChild(cc);
    const cctx=cc.getContext('2d');
    cctx.fillStyle='#1a0030'; cctx.fillRect(0,0,32,32);
    drawSpriteToCtx(cctx,key,0,0,2);

    const nm=document.createElement('div');
    nm.className='char-card-name';
    nm.textContent=C.name.split(' ')[0];
    card.appendChild(nm);

    card.addEventListener('click',()=>{ SFX.dialogue(); selectChar(key); });
    grid.appendChild(card);
  });
}

function selectChar(key) {
  document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));
  document.querySelector(`.char-card[data-key="${key}"]`).classList.add('selected');
  const C=CHAR_DATA[key];
  document.getElementById('char-detail-name').textContent=C.name;
  document.getElementById('char-detail-title').textContent=C.title;

  const pc=document.getElementById('portrait-canvas');
  const pctx=pc.getContext('2d');
  pctx.fillStyle='#1a0030'; pctx.fillRect(0,0,96,96);
  drawSpriteToCtx(pctx,key,16,16,4);
  spawnParticles(120,70,C.color,8,20);

  const statsEl=document.getElementById('char-detail-stats');
  statsEl.innerHTML='';
  const labels={hp:'HP',sp:'SP',charisma:'CHA',intelligence:'INT',agility:'AGI',endurance:'END',luck:'LCK'};
  Object.entries(labels).forEach(([k,label])=>{
    const val=C.stats[k];
    const b=document.createElement('div');
    const cls=typeof val==='number'?val>=9?'high':val<=5?'low':'':'';
    b.className='stat-badge '+(cls||'');
    b.textContent=label+':'+(typeof val==='number'?val:'?');
    statsEl.appendChild(b);
  });
  document.getElementById('char-detail-ability').innerHTML=`<span>✨ ${C.ability.name}:</span> ${C.ability.desc}`;
  document.getElementById('char-detail-passive').innerHTML=`<span>⚡ ${C.passive.name}:</span> ${C.passive.desc}`;
  document.getElementById('btn-select-char').disabled=false;
  document.getElementById('btn-select-char').dataset.key=key;
}

// ─────────────────────────────────────────────────────────────
//  GAME INIT
// ─────────────────────────────────────────────────────────────
function startNewGame(charKey) {
  resumeAudio();
  const C=CHAR_DATA[charKey];
  const isPierce=charKey==='pierce';

  G={
    player:charKey, level:1, xp:0, xpToNext:50,
    currentRoom:'foyer', visitedRooms:new Set(['foyer']),
    inventory:['energy_drink','study_notes'],
    tapes:[], gold:0, playtime:0,
    hp:isPierce?Math.floor(Math.random()*80)+40:C.stats.hp,
    maxHp:isPierce?Math.floor(Math.random()*80)+40:C.stats.hp,
    sp:isPierce?Math.floor(Math.random()*60)+40:C.stats.sp,
    maxSp:isPierce?Math.floor(Math.random()*60)+40:C.stats.sp,
    greedLevel:0, friendshipLevel:50, chaosLevel:0, gilbertTrust:50,
    roomsCleared:{}, flags:{}, achievements:new Set(),
    statusEffects:[],
    activeEnemy:null, inCombat:false,
    phase:'explore',
    personalTestDone:false, finalChoiceMade:false, ending:null,
    eventLog:[], recruitedCompanions:new Set(),
    researchBingeActive:false, researchBingeTurns:0,
    startTime:Date.now(),
  };

  fadeTransition(()=>{
    showScreen('game');
    updateHUD();
    startRenderLoop();
    setupGameControls();
    setupPlaytimeTimer();
    setTimeout(()=>startDialogue(DIALOGUES.gilbert_intro),800);
  });
}

// ─────────────────────────────────────────────────────────────
//  RENDER LOOP
// ─────────────────────────────────────────────────────────────
let renderLoopId=null;
function startRenderLoop() {
  if (renderLoopId) cancelAnimationFrame(renderLoopId);
  function loop() {
    if (G.phase==='explore'||G.phase==='dialogue') {
      const room=ROOMS[G.currentRoom];
      if (room) renderRoom(room);
    }
    if (G.phase==='combat'||G.inCombat) renderCombat();
    updateParticles();
    renderLoopId=requestAnimationFrame(loop);
  }
  loop();
}

function setupPlaytimeTimer() {
  setInterval(()=>{
    if (G.phase!=='menu') {
      G.playtime=Math.floor((Date.now()-G.startTime)/1000);
    }
    // Pierce hologram random event
    if (Math.random()>0.998) maybePierceHologram();
  },1000);
}

// ─────────────────────────────────────────────────────────────
//  DIALOGUE ENGINE
// ─────────────────────────────────────────────────────────────
let dlgIndex=0, dlgLines=[], dlgCb=null, dlgTimer=null;

function startDialogue(lines,callback) {
  if (!lines||lines.length===0){if(callback)callback();return;}
  G.phase='dialogue';
  dlgLines=lines; dlgIndex=0; dlgCb=callback||null;
  document.getElementById('dialogue-box').classList.remove('hidden');
  showDialogueLine(dlgLines[0]);
}

function showDialogueLine(line) {
  const speakerEl=document.getElementById('dialogue-speaker');
  const textEl=document.getElementById('dialogue-text');
  const optionsEl=document.getElementById('dialogue-options');
  const contEl=document.getElementById('dialogue-continue');
  const dc=document.getElementById('dialogue-portrait');
  const dctx=dc.getContext('2d');

  optionsEl.innerHTML='';
  dctx.fillStyle='#1a0030'; dctx.fillRect(0,0,56,56);

  if (line.options) {
    speakerEl.textContent='';
    textEl.textContent=line.question;
    contEl.style.display='none';
    line.choices.forEach(ch=>{
      const btn=document.createElement('button');
      btn.className='dialogue-option';
      btn.textContent=ch.text;
      btn.addEventListener('click',()=>{SFX.dialogue();handleDialogueChoice(ch.key);});
      optionsEl.appendChild(btn);
    });
    const icons={GILBERT:'🧛',CORNELIUS:'👴',ABED:'🎬',JEFF:'⚖️',BRITTA:'✊',TROY:'😄',SHIRLEY:'🙏',ANNIE:'📚',PIERCE:'🎩'};
    dctx.font='28px monospace'; dctx.textAlign='center';
    dctx.fillText(icons['GILBERT']||'?',28,38);
    return;
  }

  contEl.style.display='block';
  speakerEl.textContent=line.speaker||'';

  // Portrait
  const spk=(line.speaker||'').toUpperCase();
  const charKey=spk.toLowerCase().split(' ')[0];
  if (CHAR_DATA[charKey]) {
    drawSpriteToCtx(dctx,charKey,12,12,2);
  } else {
    const icons={GILBERT:'🧛',CORNELIUS:'👴',ABED:'🎬',JEFF:'⚖️',BRITTA:'✊',TROY:'😄',SHIRLEY:'🙏',ANNIE:'📚',PIERCE:'🎩'};
    dctx.font='24px monospace'; dctx.textAlign='center';
    dctx.fillText(icons[spk]||'👤',28,36);
  }

  // Typewriter effect
  if (dlgTimer) clearInterval(dlgTimer);
  textEl.textContent='';
  let ci=0;
  const full=line.text;
  dlgTimer=setInterval(()=>{
    if (ci<full.length){
      textEl.textContent+=full[ci++];
      if (ci%3===0) SFX.dialogue();
    } else clearInterval(dlgTimer);
  },22);
}

function advanceDialogue() {
  if (G.phase!=='dialogue') return;
  const line=dlgLines[dlgIndex];
  if (line&&!line.options) {
    const textEl=document.getElementById('dialogue-text');
    if (textEl.textContent.length<(line.text||'').length) {
      if(dlgTimer)clearInterval(dlgTimer);
      textEl.textContent=line.text; return;
    }
  }
  dlgIndex++;
  if (dlgIndex>=dlgLines.length){endDialogue();return;}
  showDialogueLine(dlgLines[dlgIndex]);
}

function handleDialogueChoice(key) {
  endDialogue();
  switch(key) {
    case 'trust_gilbert':
      G.gilbertTrust=Math.min(100,G.gilbertTrust+20); G.greedLevel=Math.min(100,G.greedLevel+15);
      showToast('Gilbert smiles. Something feels wrong...'); addToLog('Trusted Gilbert');
      break;
    case 'defy_gilbert':
      G.gilbertTrust=Math.max(0,G.gilbertTrust-30); G.friendshipLevel=Math.min(100,G.friendshipLevel+10);
      showToast('💪 Defied Gilbert! Friendship +10'); unlockAchievement('defy_gilbert');
      addToLog('Defied Gilbert'); SFX.ability();
      break;
    case 'ask_abed':
      showToast('🎬 Abed: "Classic false guide trope. Ignore him completely."');
      G.flags.asked_abed_gilbert=true; G.gilbertTrust=Math.max(0,G.gilbertTrust-20);
      addToLog('Consulted Abed');
      break;
  }
  updateHUD();
}

function endDialogue() {
  if(dlgTimer)clearInterval(dlgTimer);
  document.getElementById('dialogue-box').classList.add('hidden');
  document.getElementById('dialogue-options').innerHTML='';
  G.phase='explore';
  if(dlgCb){dlgCb();dlgCb=null;}
}

// ─────────────────────────────────────────────────────────────
//  ROOM NAVIGATION
// ─────────────────────────────────────────────────────────────
function moveToRoom(roomId) {
  if (!ROOMS[roomId]) return;
  if (roomId==='sanctum'&&!G.flags.cornelius_key&&!G.inventory.includes('cornelius_key')) {
    showToast("🗝️ The Sanctum is sealed. Find Cornelius's Key first.");
    SFX.error(); return;
  }
  SFX.move();
  fadeTransition(()=>{
    G.currentRoom=roomId;
    G.visitedRooms.add(roomId);
    updateHUD();
    // Random events on room entry
    maybeSpawnChang();
    maybePierceHologram();
    setTimeout(()=>triggerRoomEvents(ROOMS[roomId]),300);
  });
}

function triggerRoomEvents(room) {
  if (room.isSafeRoom) {
    const healed=Math.min(25,G.maxHp-G.hp);
    G.hp=Math.min(G.maxHp,G.hp+25);
    G.sp=Math.min(G.maxSp,G.sp+25);
    updateHUD(); SFX.heal();
    showToast('📚 Study Room! +25 HP, +25 SP restored.');
    spawnParticles(240,180,'#39ff14',16,60);
    startDialogue(DIALOGUES.group_chat);
    return;
  }
  if (room.npc&&!G.flags['npc_met_'+room.npc]) {
    G.flags['npc_met_'+room.npc]=true;
    const lines=DIALOGUES[room.npc];
    if (lines){startDialogue(lines,()=>checkRoomForCombat(room));return;}
  }
  checkRoomForCombat(room);
}

function checkRoomForCombat(room) {
  if (room.enemies.length>0&&!G.roomsCleared[room.id]) {
    setTimeout(()=>startCombat(room.enemies[0]),500);
  } else {
    checkRoomItems(room);
  }
}

function checkRoomItems(room) {
  const tapes=(room.items||[]).filter(id=>ITEMS[id]?.isTape&&!G.tapes.includes(id)&&!G.flags['collected_'+id]);
  tapes.forEach(id=>{
    G.tapes.push(id); G.flags['collected_'+id]=true;
    showToast('📼 Tape found: '+ITEMS[id].name+'!');
    SFX.tape(); spawnStarBurst(240,150); updateHUD();
    addToLog('Tape: '+ITEMS[id].name);
    if(G.tapes.length>=2)unlockAchievement('tape_collector');
    if(G.tapes.length>=4)unlockAchievement('all_tapes');
  });
  if (room.isFinal&&!G.roomsCleared[room.id]) setTimeout(()=>startFinalSequence(),600);
}

// ─────────────────────────────────────────────────────────────
//  COMBAT SYSTEM
// ─────────────────────────────────────────────────────────────
function startCombat(enemyKey) {
  const E=JSON.parse(JSON.stringify(ENEMIES[enemyKey]));
  G.activeEnemy={...E,key:enemyKey};
  G.inCombat=true; G.phase='combat';
  combatAnimT=0;

  document.getElementById('combat-panel').classList.remove('hidden');
  document.getElementById('enemy-name').textContent=E.name;
  document.getElementById('enemy-weakness').textContent=`⚡ Weak vs: ${E.weakness?.toUpperCase()||'???'}`;
  document.getElementById('enemy-desc').textContent=E.desc;
  updateEnemyHpBar();
  setTurnIndicator('player');
  logCombat(`⚔️ ${E.name} appeared!`,'');
  addToLog('Combat: '+E.name);
  SFX.hit();
}

function updateEnemyHpBar() {
  if (!G.activeEnemy) return;
  const pct=G.activeEnemy.hp/G.activeEnemy.maxHp*100;
  document.getElementById('enemy-hp-bar').style.width=pct+'%';
}

function setTurnIndicator(who) {
  const el=document.getElementById('turn-indicator');
  if (who==='player') { el.textContent='YOUR TURN ▶'; el.className='turn-indicator player-turn'; }
  else { el.textContent='◀ ENEMY TURN'; el.className='turn-indicator enemy-turn'; }
}

function logCombat(msg,cls='') {
  const log=document.getElementById('combat-log');
  log.innerHTML=`<span class="${cls}">${msg}</span>`;
}

function disableCombatBtns(disabled) {
  ['cbtn-attack','cbtn-ability','cbtn-item','cbtn-flee'].forEach(id=>{
    const b=document.getElementById(id); if(b) b.disabled=disabled;
  });
}

function playerAttack() {
  if (!G.inCombat||G.phase==='skillcheck') return;
  disableCombatBtns(true);
  SFX.hit();
  if (G.player==='jeff') { triggerDialogueWheel(); return; }
  if (G.player==='britta') { triggerSlotMachine(); return; }
  if (G.player==='troy') { triggerRhythmGame(); return; }
  // Others: direct attack
  const stat=CHAR_DATA[G.player].stats;
  const base=12+Math.floor(Math.random()*10);
  const bonus=G.activeEnemy.weakness==='charisma'?(stat.charisma||5)*1.5:
              G.activeEnemy.weakness==='intelligence'?(stat.intelligence||5)*1.2:
              G.activeEnemy.weakness==='endurance'?(stat.endurance||5)*1.1:0;
  dealDamageToEnemy(Math.floor(base+bonus));
}

function playerAbility() {
  if (!G.inCombat||G.phase==='skillcheck') return;
  const cost=CHAR_DATA[G.player].spCost||15;
  if (G.sp<cost) { showToast(`Not enough SP! Need ${cost}.`); SFX.error(); return; }
  G.sp=Math.max(0,G.sp-cost);
  disableCombatBtns(true); SFX.ability();

  const dmg=30+Math.floor(Math.random()*20);
  switch(G.player) {
    case 'jeff':
      G.activeEnemy.stunned=true;
      logCombat(`⚖️ "Objection!" Enemy is stunned by Jeff's monologue!`,'log-buff');
      dealDamageToEnemy(dmg+5);
      break;
    case 'britta':
      triggerSlotMachine(); return;
    case 'abed':
      G.flags.trope_vision=true;
      logCombat(`🎬 Trope Vision! Weakness exposed — +60% damage!`,'log-buff');
      dealDamageToEnemy(Math.floor(dmg*1.6));
      break;
    case 'troy':
      const duo=G.recruitedCompanions.has('abed');
      logCombat(duo?`🎉 Troy & Abed! COMBO!`:`🎉 Troy attacks with full enthusiasm!`,'log-buff');
      dealDamageToEnemy(duo?dmg+30:dmg);
      if(duo){spawnStarBurst(240,150);}
      break;
    case 'shirley':
      const extra=G.activeEnemy.name.includes('Greed')||G.activeEnemy.name.includes('Corrupt')?30:0;
      logCombat(`🙏 "The Wrath of a Mother!" HOLY DAMAGE!`,'log-buff');
      dealDamageToEnemy(dmg+extra);
      break;
    case 'annie':
      G.researchBingeActive=true; G.researchBingeTurns=3;
      G.hp=Math.min(G.maxHp,G.hp+20);
      logCombat(`📚 Research Binge! +20 HP, double XP for 3 encounters!`,'log-heal');
      updateHUD();
      dealDamageToEnemy(dmg);
      break;
    case 'pierce':
      if (Math.random()<0.5) {
        G.hp=Math.max(1,G.hp-25);
        logCombat(`🎩 Hawthorne Legacy backfired! −25 HP to yourself!`,'log-dmg');
        screenShake(); hurtFlash(); updateHUD();
        setTimeout(()=>enemyTurn(),900);
      } else {
        logCombat(`🎩 Hawthorne Legacy CRITS! Massive damage!`,'log-buff');
        dealDamageToEnemy(dmg*2+20);
      }
      return;
    default:
      dealDamageToEnemy(dmg);
  }
  updateHUD();
}

function useItem() {
  if (!G.inCombat) return;
  const usable=G.inventory.find(id=>{const it=ITEMS[id];return it&&(it.effect?.hp||it.effect?.sp);});
  if (!usable) { showToast('No usable healing items!'); SFX.error(); return; }
  const item=ITEMS[usable];
  if (item.effect.hp) { const h=Math.min(G.maxHp-G.hp,item.effect.hp); G.hp+=h; spawnParticles(240,180,'#39ff14',10,40); }
  if (item.effect.sp) G.sp=Math.min(G.maxSp,G.sp+item.effect.sp);
  G.inventory.splice(G.inventory.indexOf(usable),1);
  logCombat(`🧪 Used ${item.name}! Restored ${item.effect.hp||0} HP / ${item.effect.sp||0} SP.`,'log-heal');
  SFX.heal(); updateHUD();
  setTimeout(()=>enemyTurn(),800);
}

function fleeCombat() {
  const agiBonus=G.player==='troy'?0.25:0;
  if (Math.random()<0.45+agiBonus) {
    G.inCombat=false; G.activeEnemy=null; G.phase='explore';
    document.getElementById('combat-panel').classList.add('hidden');
    showToast('🏃 Escaped successfully!'); SFX.move();
    disableCombatBtns(false);
    moveToRoom('foyer');
  } else {
    logCombat('🚫 Escape failed!','log-enemy');
    SFX.error(); enemyTurn();
  }
}

function dealDamageToEnemy(dmg) {
  if (!G.activeEnemy) return;
  G.activeEnemy.hp=Math.max(0,G.activeEnemy.hp-dmg);
  G.flags.enemyHurt=true;
  updateEnemyHpBar();
  SFX.hit();
  spawnDmgFloat('-'+dmg,260,120,'#ff3c3c');
  spawnParticles(260,130,G.activeEnemy.color,8,30);
  logCombat(`💥 Dealt ${dmg} damage! Enemy: ${G.activeEnemy.hp}/${G.activeEnemy.maxHp} HP`,'log-dmg');
  addToLog(`Dealt ${dmg} to ${G.activeEnemy.name}`);

  if (G.activeEnemy.hp<=0) { winCombat(); }
  else { setTurnIndicator('enemy'); setTimeout(()=>enemyTurn(),1100); }
}

function enemyTurn() {
  if (!G.inCombat||!G.activeEnemy) return;
  if (G.activeEnemy.stunned) {
    G.activeEnemy.stunned=false;
    logCombat('😵 Enemy is stunned — skips turn!','log-buff');
    setTurnIndicator('player'); disableCombatBtns(false); return;
  }
  // Tick player status effects
  G.statusEffects=G.statusEffects.filter(e=>{
    e.turns--;
    if (e.type==='burning') { G.hp=Math.max(1,G.hp-8); updateHUD(); }
    return e.turns>0;
  });

  const rawDmg=G.activeEnemy.atk+Math.floor(Math.random()*8)-3;
  const shieldBonus=(G.player==='britta'&&G.activeEnemy.name.includes('Exec'))?0.8:1;
  const actual=Math.max(1,Math.floor(rawDmg*shieldBonus));
  G.hp=Math.max(0,G.hp-actual);
  screenShake(); hurtFlash(); SFX.defeat();
  spawnDmgFloat('-'+actual,160,180,'#ff6600');
  updateHUD();
  logCombat(`🔥 ${G.activeEnemy.name}: ${actual} damage! HP: ${G.hp}/${G.maxHp}`,'log-enemy');
  addToLog(`Took ${actual} from ${G.activeEnemy.name}`);

  if (G.hp<=0) { gameOver(); }
  else { setTurnIndicator('player'); disableCombatBtns(false); }
}

function winCombat() {
  G.inCombat=false;
  const room=ROOMS[G.currentRoom];
  G.roomsCleared[room.id]=true;
  G.friendshipLevel=Math.min(100,G.friendshipLevel+5);
  G.phase='explore';
  disableCombatBtns(false);
  document.getElementById('combat-panel').classList.add('hidden');

  const xp=G.activeEnemy.xpReward;
  SFX.victory(); spawnStarBurst(240,130);
  showToast(`🏆 Victory! +${xp} XP`);
  addToLog(`Defeated ${G.activeEnemy.name}`);
  unlockAchievement('first_blood');

  // Decrement research binge
  if (G.researchBingeActive) {
    G.researchBingeTurns--;
    if (G.researchBingeTurns<=0) G.researchBingeActive=false;
  }

  setTimeout(()=>{
    gainXp(xp);
    // Auto-collect items
    (room.items||[]).filter(id=>!G.flags['collected_'+id]).forEach(id=>{
      const item=ITEMS[id]; if (!item) return;
      if (item.isTape) {
        if (!G.tapes.includes(id)) {
          G.tapes.push(id); G.flags['collected_'+id]=true;
          showToast('📼 Tape: '+item.name); SFX.tape();
          if(G.tapes.length>=2)unlockAchievement('tape_collector');
          if(G.tapes.length>=4)unlockAchievement('all_tapes');
        }
      } else {
        G.inventory.push(id); G.flags['collected_'+id]=true;
        showToast('✨ Got: '+item.name); SFX.item();
        if(id==='cornelius_key')G.flags.cornelius_key=true;
        if(id==='gilbert_manifest'){
          G.gilbertTrust=Math.max(0,G.gilbertTrust-30);
          showToast("📜 Gilbert's Manifesto reveals his true plan!");
        }
      }
    });
    updateHUD();
    if (room.isFinal) setTimeout(()=>startFinalSequence(),1200);
  },1000);
}

function gameOver() {
  G.phase='explore'; G.inCombat=false;
  document.getElementById('combat-panel').classList.add('hidden');
  disableCombatBtns(false);
  G.hp=Math.ceil(G.maxHp*0.15);
  SFX.defeat();
  updateHUD();
  showToast('💀 Defeated! Retreating to Study Room...');
  addToLog('Defeated — retreated to Study Room');
  setTimeout(()=>moveToRoom('study_room_save'),1800);
}

// ─────────────────────────────────────────────────────────────
//  SKILL CHECK MINI-GAMES
// ─────────────────────────────────────────────────────────────
function showSkillCheck(html, afterClose) {
  G.phase='skillcheck';
  const ov=document.getElementById('skill-check-overlay');
  const inn=document.getElementById('skill-check-inner');
  ov.classList.remove('hidden');
  if (typeof html==='string') inn.innerHTML=html;
  else inn.replaceChildren(...(Array.isArray(html)?html:[html]));
  window._scAfterClose=afterClose;
}

function closeSkillCheck() {
  document.getElementById('skill-check-overlay').classList.add('hidden');
  document.getElementById('skill-check-inner').innerHTML='';
  G.phase='combat';
  disableCombatBtns(false);
  if (window._scAfterClose) { window._scAfterClose(); window._scAfterClose=null; }
}

// JEFF — Dialogue Wheel
function triggerDialogueWheel() {
  const opts=[
    {text:'"Objectively, your position is factually indefensible. Here\'s the logical breakdown."',correct:true},
    {text:'"SURRENDER NOW or face SEVERE LEGAL CONSEQUENCES!"',correct:false},
    {text:'"Look — I\'m attractive and you should do what I say. That\'s how this usually works."',correct:false},
  ].sort(()=>Math.random()-0.5);

  const inner=document.getElementById('skill-check-inner');
  showSkillCheck('',null);

  inner.innerHTML='';
  const t=mk('div','sc-title','⚖️ OBJECTION! SKILL CHECK');
  const d=mk('div','sc-desc','Choose Jeff\'s legal argument:');
  const ol=mk('div',''); ol.id='sc-dialogue-options';
  opts.forEach(o=>{
    const b=mk('button','sc-option',o.text);
    b.addEventListener('click',()=>{
      b.classList.add(o.correct?'correct':'wrong');
      SFX.dialogue();
      setTimeout(()=>{
        closeSkillCheck();
        if (o.correct){
          logCombat('⚖️ Perfect argument! +45 damage!','log-buff');
          dealDamageToEnemy(45);
        } else {
          logCombat('❌ Wrong approach! Enemy retaliates with fury!','log-enemy');
          const dmg=(G.activeEnemy?.atk||15)*2;
          G.hp=Math.max(0,G.hp-dmg);
          hurtFlash(); screenShake(); updateHUD();
          spawnDmgFloat('-'+dmg,160,180,'#ff2d78');
          if(G.hp<=0)gameOver();
          else { setTurnIndicator('player'); disableCombatBtns(false); }
        }
      },900);
    });
    ol.appendChild(b);
  });
  inner.appendChild(t); inner.appendChild(d); inner.appendChild(ol);
}

// BRITTA — Slot Machine
function triggerSlotMachine() {
  const emojis=['💎','💣','🌟','💀','🎉','❓','🔥','⚡','🌈','🤦'];
  const inner=document.getElementById('skill-check-inner');
  showSkillCheck('',null);

  inner.innerHTML='';
  inner.appendChild(mk('div','sc-title',"🎰 BRITTA'S SLOT MACHINE"));
  inner.appendChild(mk('div','sc-desc','Pull and pray. This could go anywhere.'));
  const sm=mk('div',''); sm.id='slot-machine';
  const r1=mk('div','slot-reel','?'),r2=mk('div','slot-reel','?'),r3=mk('div','slot-reel','?');
  sm.appendChild(r1); sm.appendChild(r2); sm.appendChild(r3);
  inner.appendChild(sm);
  const pull=mk('button','','PULL THE LEVER'); pull.id='slot-pull';
  pull.addEventListener('click',()=>{
    pull.disabled=true;
    [r1,r2,r3].forEach(r=>r.classList.add('spinning'));
    SFX.hit();
    let spins=0;
    const iv=setInterval(()=>{
      r1.textContent=emojis[Math.floor(Math.random()*emojis.length)];
      r2.textContent=emojis[Math.floor(Math.random()*emojis.length)];
      r3.textContent=emojis[Math.floor(Math.random()*emojis.length)];
      if (++spins>18) {
        clearInterval(iv);
        [r1,r2,r3].forEach(r=>r.classList.remove('spinning'));
        const a=emojis[Math.floor(Math.random()*emojis.length)];
        const b=emojis[Math.floor(Math.random()*emojis.length)];
        const c=emojis[Math.floor(Math.random()*emojis.length)];
        r1.textContent=a; r2.textContent=b; r3.textContent=c;
        setTimeout(()=>{
          closeSkillCheck();
          if (a===b&&b===c) {
            logCombat(`🎊 JACKPOT! ${a}×3 — Britta somehow NAILS IT! 70 dmg!`,'log-buff');
            spawnStarBurst(240,150); SFX.levelup(); dealDamageToEnemy(70);
          } else if ([a,b,c].includes('💀')) {
            G.hp=Math.max(1,G.hp-30); logCombat('💀 Death reel! Self-damage!','log-dmg');
            hurtFlash(); screenShake(); updateHUD(); spawnDmgFloat('-30',160,180,'#ff2d78');
            setTimeout(()=>enemyTurn(),600);
          } else if ([a,b,c].includes('💣')) {
            dealDamageToEnemy(15); G.hp=Math.max(1,G.hp-10);
            logCombat('💣 Mutual explosion! Both take damage!','log-enemy');
            hurtFlash(); updateHUD();
          } else {
            dealDamageToEnemy(20+Math.floor(Math.random()*25));
            logCombat('⚡ Somehow chaotic-helpful!','log-buff');
          }
        },700);
      }
    },90);
  });
  inner.appendChild(pull);
  const res=mk('div','');res.id='sc-result'; inner.appendChild(res);
}

// TROY — Rhythm Game
function triggerRhythmGame() {
  const inner=document.getElementById('skill-check-inner');
  showSkillCheck('',null);
  inner.innerHTML='';
  inner.appendChild(mk('div','sc-title','🎵 RHYTHM CHECK — TAP THE BEAT!'));

  const notesArea=mk('div','');
  notesArea.id='rhythm-bar';
  const zone=mk('div','');zone.id='rhythm-zone';
  notesArea.appendChild(zone);
  inner.appendChild(notesArea);

  const scoreEl=mk('div','');scoreEl.id='rhythm-score'; scoreEl.textContent='Hits: 0/5';
  const comboEl=mk('div','');comboEl.id='rhythm-combo';
  const tapBtn=mk('button','','🥁 TAP!');tapBtn.id='rhythm-tap';

  inner.appendChild(scoreEl); inner.appendChild(comboEl); inner.appendChild(tapBtn);

  let hits=0,total=5,combo=0;
  window._rhythmActive=true;
  const noteColors=['#ff2d78','#00f5ff','#ffd700','#39ff14','#7c00ff'];
  let noteIdx=0;

  const spawnNote=()=>{
    if (noteIdx>=total||!window._rhythmActive) return;
    const note=mk('div','rhythm-note',['◀','▶','▲','▼','●'][Math.floor(Math.random()*5)]);
    note.style.cssText=`right:-30px;background:${noteColors[noteIdx%5]};color:#000;`;
    notesArea.appendChild(note);
    let pos=notesArea.offsetWidth+30;
    const iv=setInterval(()=>{
      pos-=6; note.style.right=(notesArea.offsetWidth-pos)+'px';
      if (pos<-30){clearInterval(iv);note.remove();}
    },30);
    note.dataset.iv=String(iv);
    note.dataset.active='true';
    setTimeout(()=>{note.dataset.active='false';},700);
    noteIdx++;
    if (noteIdx<total) setTimeout(spawnNote,1200+Math.random()*400);
  };
  setTimeout(spawnNote,600);

  tapBtn.addEventListener('click',()=>{
    if (!window._rhythmActive) return;
    const activeNote=notesArea.querySelector('.rhythm-note[data-active="true"]');
    if (activeNote) {
      hits++; combo++;
      const msg=combo>=3?'🔥 COMBO!':combo>=2?'GREAT!':'NICE!';
      comboEl.textContent=msg; comboEl.style.color=noteColors[hits%5];
      scoreEl.textContent=`Hits: ${hits}/${total}`;
      SFX.dialogue(); activeNote.remove();
    } else { combo=0; comboEl.textContent='MISS'; comboEl.style.color='#ff3c3c'; }
  });

  setTimeout(()=>{
    window._rhythmActive=false;
    tapBtn.disabled=true;
    setTimeout(()=>{
      closeSkillCheck();
      if (hits>=4){ spawnStarBurst(240,150); SFX.victory(); logCombat(`🎵 Perfect rhythm! 45 damage!`,'log-buff'); dealDamageToEnemy(45); }
      else if (hits>=2){ logCombat(`🎵 Good rhythm! 22 damage.`,'log-buff'); dealDamageToEnemy(22); }
      else { logCombat(`🎵 Off beat! Troy trips over himself.`,'log-enemy'); SFX.error(); enemyTurn(); }
    },700);
  },total*1300+800);
}

// ─────────────────────────────────────────────────────────────
//  FINAL SEQUENCE
// ─────────────────────────────────────────────────────────────
function startFinalSequence() {
  if (G.finalChoiceMade) return;
  startDialogue(DIALOGUES.cornelius_ghost,()=>showPersonalTest());
}

const PERSONAL_TESTS={
  jeff:  {q:'"Do you actually care about this group — or just about winning?"',pass:'"Yes. I care about them more than I care about being right."',fail:'"I care about winning. Obviously. That\'s the whole point."'},
  britta:{q:'"Apologize for something. Without deflecting, theorizing, or blaming society."',pass:'"I\'m sorry. I was wrong. No explanation needed."',fail:'"I\'m sorry, but the real issue here is systemic capitalism—"'},
  abed:  {q:'"Tell a story that doesn\'t follow any recognizable narrative trope."',pass:'"It\'s just a Tuesday. Nothing means anything. And that\'s okay."',fail:'"Hero\'s journey, subverted — wait, that\'s still a trope."'},
  troy:  {q:'"Make this decision completely alone. Don\'t ask anyone."',pass:'"I choose to share it. Not because anyone told me. Because I want to."',fail:'"What does everyone think I should choose?"'},
  shirley:{q:'"Forgive someone who genuinely doesn\'t deserve it."',pass:'"I forgive you. Not for you. For me."',fail:'"They need to apologize first. And attend church twice."'},
  annie: {q:'"Let someone else lead. Don\'t organize, correct, or fix anything."',pass:'"Okay. I\'ll follow. I actually trust you."',fail:'"Actually if we restructure with a color-coded binder system—"'},
  pierce:{q:'"Let go of your father\'s approval. Right now. Completely."',pass:'"I don\'t need you to be proud of me. I never actually did."',fail:'"If I could just get him to say it once—just once—"'}
};

function showPersonalTest() {
  const test=PERSONAL_TESTS[G.player]||PERSONAL_TESTS.jeff;
  G.phase='skillcheck';
  const ov=document.getElementById('skill-check-overlay');
  const inn=document.getElementById('skill-check-inner');
  ov.classList.remove('hidden');
  inn.innerHTML='';
  SFX.ability();

  const title=mk('div','sc-title','⚡ THE FINAL TEST');
  title.style.color='var(--magenta)'; title.style.textShadow='0 0 16px var(--magenta)';
  const desc=mk('div','sc-desc',test.q);
  desc.style.cssText='margin:10px 0;font-size:16px;line-height:1.6;color:var(--white);';
  const opts=mk('div','');opts.id='sc-dialogue-options';

  const passBtn=mk('button','sc-option','✓ "'+test.pass+'"');
  passBtn.style.cssText='border-color:var(--green);color:var(--green);';
  passBtn.addEventListener('click',()=>resolveFinalTest(true));

  const failBtn=mk('button','sc-option','✗ "'+test.fail+'"');
  failBtn.style.cssText='border-color:var(--red);color:var(--red);';
  failBtn.addEventListener('click',()=>resolveFinalTest(false));

  opts.appendChild(passBtn); opts.appendChild(failBtn);
  inn.appendChild(title); inn.appendChild(desc); inn.appendChild(opts);
}

function resolveFinalTest(passed) {
  document.getElementById('skill-check-overlay').classList.add('hidden');
  G.phase='explore'; G.personalTestDone=true; G.finalChoiceMade=true;
  if (passed){G.friendshipLevel=Math.min(100,G.friendshipLevel+30);SFX.levelup();spawnStarBurst(240,160);}
  else {G.greedLevel=Math.min(100,G.greedLevel+30);SFX.error();}
  setTimeout(()=>showEndingChoice(),800);
}

function showEndingChoice() {
  G.phase='skillcheck';
  const ov=document.getElementById('skill-check-overlay');
  const inn=document.getElementById('skill-check-inner');
  ov.classList.remove('hidden'); inn.innerHTML='';

  inn.appendChild(mk('div','sc-title','👑 THE INHERITANCE'));
  const desc=mk('div','sc-desc','The Inheritance Code unlocks. The Hawthorne fortune is within reach. What do you choose?');
  desc.style.cssText='margin:12px 0;font-size:15px;line-height:1.7;';
  inn.appendChild(desc);

  const opts=mk('div','');opts.id='sc-dialogue-options';
  const choices=[
    {key:'greedy', label:'💰 Take it all for yourself.', style:'border-color:#ffd700;color:#ffd700;'},
    {key:'selfless',label:'🤝 Split it equally with the group.',style:'border-color:var(--green);color:var(--green);'},
    {key:'chaos',  label:'🎭 Give it all to Gilbert.',style:'border-color:var(--magenta);color:var(--magenta);'},
  ];
  if (G.tapes.length>=3) {
    choices.push({key:'secret',label:'📼 [SECRET] Use all the tapes to break the simulation.',style:'border-color:var(--cyan);color:var(--cyan);'});
  }
  choices.forEach(ch=>{
    const b=mk('button','sc-option',ch.label);
    b.style.cssText=ch.style;
    b.addEventListener('click',()=>{SFX.ending();triggerEnding(ch.key);});
    opts.appendChild(b);
  });
  inn.appendChild(opts);
}

// ─────────────────────────────────────────────────────────────
//  ENDINGS
// ─────────────────────────────────────────────────────────────
const ENDINGS={
  greedy:{
    title:'THE GREEDY ENDING\nYou Chose Money Over Everything.',
    text:`You took the inheritance. Every last Hawthorne Buck.\n\nYour character walks out of the Manor alone. Pixelated tears stream down their face as the credits roll.\n\nThe others watch you go. No one follows.\n\nYou're rich. You're successful. You're hollow.\n\nThe study room is empty. It stays empty.\n\n— You Win. (Sort of.) —`,
    color:'#ffd700', ach:'greedy_ending'
  },
  selfless:{
    title:'THE SELFLESS ENDING\nYou Chose Each Other.',
    text:`You split the inheritance equally.\n\nNot much when divided seven ways. Barely enough for a semester.\n\nBut when you walk back into the study room, everyone is there. Arguing. Laughing. Being impossibly, perfectly themselves.\n\nAbed's voice narrates: "This is the good ending. It's also the most predictable. I'm a little disappointed. But only a little."\n\n— Canonical. Wholesome. You love it. —`,
    color:'#39ff14', ach:'selfless_ending'
  },
  chaos:{
    title:'THE CHAOS ENDING\nGilbert Wins. Nobody Minds.',
    text:`You handed everything to Gilbert.\n\nHe becomes CEO of Hawthorne Wipes.\n\nHe immediately ships the group a lifetime supply of wipes and a handwritten thank-you card on company letterhead.\n\nThe study room fills with boxes of toilet paper.\n\nShirley builds a shrine. Troy and Abed narrate a documentary about it.\n\n— Nobody Expected This. Nobody Is Surprised. —`,
    color:'#ff2d78', ach:'chaos_ending'
  },
  secret:{
    title:'THE ABED ENDING\nThis Is The Only Ending That Matters.',
    text:`You collected all the tapes.\n\nAbed's voice fills the darkness:\n\n"This entire simulation — the Manor, the Algorithm, the inheritance — I built it."\n\n"I wanted to understand us. What we'd do under real pressure."\n\n"You found all the tapes. You cared enough to look."\n\nThe screen goes dark.\n\n"This is the only ending that matters."\n\n— Complete. Yours. Real. —`,
    color:'#00f5ff', ach:'secret_ending'
  }
};

function triggerEnding(key) {
  document.getElementById('skill-check-overlay').classList.add('hidden');
  G.ending=key; G.phase='explore';
  cancelAnimationFrame(renderLoopId);
  const e=ENDINGS[key]; if(e.ach)unlockAchievement(e.ach);
  SFX.ending();
  fadeTransition(()=>showEndingScreen(key));
}

function showEndingScreen(key) {
  const E=ENDINGS[key];
  showScreen('ending');
  document.getElementById('ending-title').textContent=E.title;
  document.getElementById('ending-title').style.color=E.color;
  document.getElementById('ending-title').style.textShadow=`0 0 24px ${E.color}`;
  document.getElementById('ending-text').textContent=E.text;

  const ec=document.getElementById('ending-canvas');
  const ectx=ec.getContext('2d');
  ectx.fillStyle='#0a0010'; ectx.fillRect(0,0,ec.width,ec.height);
  const spacing=ec.width/7;
  CHAR_KEYS.forEach((k,i)=>{
    const x=8+i*spacing, y=50;
    if (key==='greedy'&&k===G.player) drawSpriteToCtx(ectx,k,x,y,2,0.25);
    else drawSpriteToCtx(ectx,k,x,y,2);
  });
  // Ending glow
  const grad=ectx.createRadialGradient(ec.width/2,ec.height,10,ec.width/2,ec.height,100);
  grad.addColorStop(0,E.color+'40'); grad.addColorStop(1,'transparent');
  ectx.fillStyle=grad; ectx.fillRect(0,0,ec.width,ec.height);

  const ec2=document.getElementById('ending-content');
  ec2.style.cssText='opacity:0;transform:translateY(16px);transition:all 0.7s ease;';
  setTimeout(()=>{ ec2.style.opacity='1'; ec2.style.transform='translateY(0)'; },100);
}

// ─────────────────────────────────────────────────────────────
//  MENU SYSTEM
// ─────────────────────────────────────────────────────────────
function openMenu() {
  const mm=document.getElementById('menu-overlay');
  mm.classList.remove('hidden');
  G.phase='menu';
  // Stats row
  document.getElementById('menu-gold').textContent=G.gold;
  document.getElementById('menu-floor').textContent=G.visitedRooms.size;
  const secs=Math.floor(G.playtime);
  const mins=Math.floor(secs/60);
  document.getElementById('menu-time').textContent=`${mins}:${String(secs%60).padStart(2,'0')}`;
  showMenuTab('inventory');
}

function closeMenu() {
  document.getElementById('menu-overlay').classList.add('hidden');
  G.phase='explore';
}

function showMenuTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const content=document.getElementById('menu-content');
  content.innerHTML='';

  if (tab==='inventory') {
    if (G.inventory.length===0) { content.innerHTML='<div class="item-entry">Inventory empty.</div>'; return; }
    G.inventory.forEach(id=>{
      const item=ITEMS[id]; if(!item) return;
      const row=mk('div','item-entry','');
      row.innerHTML=`<span>${item.icon} <strong>${item.name}</strong> — ${item.desc}</span>`;
      if (item.effect?.hp||item.effect?.sp) {
        const btn=mk('button','item-use-btn','USE');
        btn.addEventListener('click',()=>{
          if(item.effect.hp){G.hp=Math.min(G.maxHp,G.hp+item.effect.hp);spawnParticles(240,180,'#39ff14',8,30);}
          if(item.effect.sp){G.sp=Math.min(G.maxSp,G.sp+item.effect.sp);}
          G.inventory.splice(G.inventory.indexOf(id),1);
          showToast('✨ Used '+item.name); SFX.heal(); updateHUD();
          showMenuTab('inventory');
        });
        row.appendChild(btn);
      }
      content.appendChild(row);
    });
  } else if (tab==='party') {
    CHAR_KEYS.forEach(k=>{
      const C=CHAR_DATA[k];
      const isPlayer=k===G.player;
      const row=mk('div','party-entry','');
      row.innerHTML=`<span style="display:flex;gap:8px;align-items:center;">
        <span>${isPlayer?'★ ':''}${C.name}</span>
        <span style="font-family:var(--font-body);font-size:13px;color:var(--gray)">${C.title}</span>
      </span>
      <span style="font-size:5px;color:${isPlayer?'var(--green)':'var(--gray)'}">
        ${isPlayer?'ACTIVE HEIR':'COMPANION'}
      </span>`;
      content.appendChild(row);
    });
  } else if (tab==='tapes') {
    if (G.tapes.length===0) { content.innerHTML='<div class="tape-entry">No tapes collected yet. Search rooms!</div>'; }
    else {
      G.tapes.forEach(id=>{
        const it=ITEMS[id];
        const row=mk('div','tape-entry',`📼 ${it?.name||id}`);
        content.appendChild(row);
      });
    }
    const hint=mk('div','tape-entry','');
    hint.style.cssText='color:var(--gray);font-size:13px;';
    hint.textContent=`${G.tapes.length}/4 collected. Need all 4 for the secret ending.`;
    content.appendChild(hint);
  } else if (tab==='map') {
    MAP_LAYOUT.forEach(rowData=>{
      const rowEl=mk('div',''); rowEl.style.cssText='display:flex;gap:3px;margin-bottom:3px;';
      rowData.forEach(roomId=>{
        const cell=mk('div','');
        if (!roomId) { cell.style.width='60px'; rowEl.appendChild(cell); return; }
        const visited=G.visitedRooms.has(roomId), current=roomId===G.currentRoom;
        const room=ROOMS[roomId];
        cell.style.cssText=`
          width:60px;padding:4px 2px;font-family:var(--font-body);font-size:12px;
          text-align:center;border:1px solid ${current?'var(--magenta)':visited?'var(--purple)':'#2a1050'};
          background:${current?'#4a0090':visited?'#2a0060':'#1a0030'};
          color:${current?'var(--magenta)':visited?'var(--white)':'var(--gray)'};
          cursor:${visited&&!current?'pointer':'default'};
          border-radius:2px;
        `;
        cell.title=visited?room.name:'???';
        cell.innerHTML=visited?`${room.emoji}<br><span style="font-size:9px">${room.name.split(' ').slice(0,2).join(' ')}</span>`:'?';
        if (visited&&!current) cell.addEventListener('click',()=>{closeMenu();moveToRoom(roomId);});
        rowEl.appendChild(cell);
      });
      content.appendChild(rowEl);
    });
  } else if (tab==='log') {
    if (G.eventLog.length===0) { content.innerHTML='<div style="font-family:var(--font-body);font-size:15px;color:var(--gray);padding:8px">No events yet.</div>'; return; }
    G.eventLog.forEach(entry=>{
      const row=mk('div','');
      row.style.cssText='font-family:var(--font-body);font-size:14px;color:var(--white);padding:4px 6px;border-bottom:1px solid #1a0030;';
      row.textContent=entry;
      content.appendChild(row);
    });
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPER: make element
// ─────────────────────────────────────────────────────────────
function mk(tag,cls,text='') {
  const el=document.createElement(tag);
  if (cls) el.className=cls;
  if (text) el.textContent=text;
  return el;
}

// ─────────────────────────────────────────────────────────────
//  INTERACT / QUICK ITEM
// ─────────────────────────────────────────────────────────────
function handleInteract() {
  if (G.phase==='dialogue'){advanceDialogue();return;}
  if (G.phase!=='explore') return;
  const room=ROOMS[G.currentRoom]; if (!room) return;

  if (room.enemies.length>0&&!G.roomsCleared[room.id]){
    startCombat(room.enemies[0]); return;
  }
  const uncollected=(room.items||[]).filter(id=>!G.flags['collected_'+id]&&!ITEMS[id]?.isTape);
  if (uncollected.length>0) {
    const id=uncollected[0], item=ITEMS[id];
    G.inventory.push(id); G.flags['collected_'+id]=true;
    SFX.item(); spawnParticles(240,180,'#ffd700',10,35);
    if (item.effect?.greed){G.greedLevel=Math.min(100,G.greedLevel+item.effect.greed);}
    if (item.effect?.unlock){G.flags[item.effect.unlock]=true;}
    if (item.effect?.trust_gilbert){G.gilbertTrust=Math.max(0,G.gilbertTrust+item.effect.trust_gilbert);}
    showToast('✨ Picked up: '+item.name+'!');
    addToLog('Found: '+item.name);
    updateHUD(); return;
  }
  if (room.npc==='gilbert_antagonist'&&!G.flags.gilbert_dialogue2) {
    G.flags.gilbert_dialogue2=true;
    startDialogue(DIALOGUES.gilbert_antagonist); return;
  }
  showToast('Nothing else here. Move to a new room!');
}

function quickUseItem() {
  if (G.phase==='combat') { useItem(); return; }
  const usable=G.inventory.find(id=>{const it=ITEMS[id];return it&&(it.effect?.hp||it.effect?.sp);});
  if (!usable){showToast('No healing items!');SFX.error();return;}
  const item=ITEMS[usable];
  if(item.effect?.hp){G.hp=Math.min(G.maxHp,G.hp+item.effect.hp);spawnParticles(240,180,'#39ff14',8,30);}
  if(item.effect?.sp)G.sp=Math.min(G.maxSp,G.sp+item.effect.sp);
  G.inventory.splice(G.inventory.indexOf(usable),1);
  showToast('✨ Used '+item.name); SFX.heal(); updateHUD();
}

// ─────────────────────────────────────────────────────────────
//  CONTROLS
// ─────────────────────────────────────────────────────────────
function setupGameControls() {
  document.removeEventListener('keydown',handleKey);
  document.addEventListener('keydown',handleKey);

  // D-Pad
  const dirs={dpad_up:'north',dpad_down:'south',dpad_left:'west',dpad_right:'east'};
  Object.entries(dirs).forEach(([id,dir])=>{
    const el=document.getElementById(id);
    if(el){el.addEventListener('click',()=>{resumeAudio();handleDir(dir);});}
  });

  document.getElementById('abtn-menu').addEventListener('click',()=>{resumeAudio();const mm=document.getElementById('menu-overlay');mm.classList.contains('hidden')?openMenu():closeMenu();});
  document.getElementById('abtn-interact').addEventListener('click',()=>{resumeAudio();handleInteract();});
  document.getElementById('btn-quick-item').addEventListener('click',()=>{resumeAudio();quickUseItem();});

  gameCanvas().addEventListener('click',()=>{resumeAudio();if(G.phase==='dialogue')advanceDialogue();else if(G.phase==='explore')handleInteract();});

  document.getElementById('cbtn-attack').addEventListener('click',()=>{resumeAudio();playerAttack();});
  document.getElementById('cbtn-ability').addEventListener('click',()=>{resumeAudio();playerAbility();});
  document.getElementById('cbtn-item').addEventListener('click',()=>{resumeAudio();useItem();});
  document.getElementById('cbtn-flee').addEventListener('click',()=>{resumeAudio();fleeCombat();});

  document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>showMenuTab(b.dataset.tab)));
  document.getElementById('btn-close-menu').addEventListener('click',closeMenu);
}

function handleKey(e) {
  resumeAudio();
  if (G.phase==='dialogue'||G.phase==='explore') {
    if (e.key==='Enter'||e.key===' '){
      if (G.phase==='dialogue') advanceDialogue();
      else handleInteract();
      e.preventDefault(); return;
    }
    if (G.phase==='explore') {
      const map={ArrowUp:'north',ArrowDown:'south',ArrowLeft:'west',ArrowRight:'east',
                 w:'north',s:'south',a:'west',d:'east'};
      if (map[e.key]){handleDir(map[e.key]);e.preventDefault();}
      if (e.key==='Escape'||e.key==='m'||e.key==='M'){
        const mm=document.getElementById('menu-overlay');
        mm.classList.contains('hidden')?openMenu():closeMenu();
      }
      if (e.key==='q'||e.key==='Q') quickUseItem();
    }
  } else if (G.phase==='menu') {
    if (e.key==='Escape') closeMenu();
  }
}

function handleDir(dir) {
  if (G.phase!=='explore') return;
  const room=ROOMS[G.currentRoom]; if (!room) return;
  const dest=room.exits[dir];
  if (dest) moveToRoom(dest);
  else { showToast('🚫 No exit that direction!'); SFX.error(); }
}

// ─────────────────────────────────────────────────────────────
//  TITLE SCREEN & ABOUT
// ─────────────────────────────────────────────────────────────
function drawTitleSprites() {
  const c=document.getElementById('title-sprites'); if(!c) return;
  const cx=c.getContext('2d');
  cx.clearRect(0,0,c.width,c.height);
  CHAR_KEYS.forEach((k,i)=>drawSpriteToCtx(cx,k,i*64,8,2));
}

function drawAboutSprites() {
  const c=document.getElementById('about-sprites'); if(!c) return;
  const cx=c.getContext('2d');
  cx.clearRect(0,0,c.width,c.height);
  CHAR_KEYS.forEach((k,i)=>drawSpriteToCtx(cx,k,i*48,4,2));
}

function initTitleScreen() {
  drawTitleSprites();
  // Animate title sprites
  let titleT=0;
  setInterval(()=>{
    titleT++;
    const c=document.getElementById('title-sprites'); if(!c) return;
    const cx=c.getContext('2d');
    cx.clearRect(0,0,c.width,c.height);
    CHAR_KEYS.forEach((k,i)=>{
      const bob=Math.sin(titleT*0.08+i*0.7)*4;
      drawSpriteToCtx(cx,k,i*64,8+bob,2);
    });
  },50);

  document.getElementById('btn-new-game').addEventListener('click',()=>{
    resumeAudio(); SFX.dialogue();
    buildCharacterSelect(); showScreen('charselect');
  });
  document.getElementById('btn-about').addEventListener('click',()=>{
    showScreen('about'); setTimeout(drawAboutSprites,100);
  });
  document.getElementById('btn-back-title').addEventListener('click',()=>{showScreen('title');});
  document.getElementById('btn-back-about').addEventListener('click',()=>{showScreen('title');});
  document.getElementById('btn-select-char').addEventListener('click',()=>{
    const key=document.getElementById('btn-select-char').dataset.key;
    if (!key) return;
    SFX.levelup();
    startNewGame(key);
  });
  document.getElementById('btn-play-again').addEventListener('click',()=>{
    fadeTransition(()=>{showScreen('title');drawTitleSprites();});
  });
}

// ─────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  showScreen('title');
  initTitleScreen();
  // Touch support for mobile
  document.querySelectorAll('.dpad-btn,.action-btn,.combat-btn,.menu-btn').forEach(el=>{
    el.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
  });
});
