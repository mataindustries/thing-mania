/* THING//MANIA v0.3 — Meta Global AI Developer Hackathon.
 * Fresh hackathon code with Meta Muse Spark 1.3 GamePlan integration.
 * All three microgames (WRECK IT, BEAM IT, RUN FOR IT) preserved.
 * Runs with local mock adapter, zero API spending, and 100% offline fallback.
 */
(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  let c = canvas.getContext('2d');
  const modal = document.querySelector('#modal');
  const primary = document.querySelector('#primaryBtn');
  const shareBtn = document.querySelector('#shareBtn');
  const stamp = document.querySelector('#ticketStamp');
  const title = document.querySelector('#ticketTitle');
  const body = document.querySelector('#ticketBody');
  const badges = document.querySelector('#ticketBadges');
  const sub = document.querySelector('#ticketSub');
  const status = document.querySelector('#status');
  const photoNote = document.querySelector('#photoNote');
  const roleBadge = document.querySelector('#roleBadge');
  const userConsent = document.querySelector('#userConsent');
  const analyzeBtn = document.querySelector('#analyzePhotoBtn');
  const cutoutBtn = document.querySelector('#cutoutBtn');
  const cutoutStatus = document.querySelector('#cutoutStatus');
  const budgetStatus = document.querySelector('#budgetStatus');
  const chipButtons = document.querySelectorAll('.chip-btn');
  const remixBtn = document.querySelector('#remixBtn');
  const WIDTH = 420, HEIGHT = 640;

  // Active GamePlan (default baseline, validated by GamePlan schema)
  let activePlan = (typeof window !== 'undefined' && window.GamePlan)
    ? window.GamePlan.createDefaultGamePlan({ label: 'MYSTERY THING' })
    : {
        schema_version: '1.3.0',
        selected_object: { label: 'MYSTERY THING', role: 'Chaotic Arcade Prop' },
        whimsical_role: 'Unsuspecting Everyday Wonder',
        announcer_lines: {
          intro: 'One everyday object. Three ridiculous universes. Zero sense.',
          round1: { intro: 'Your thing is now a wrecking ball. Pull it left, release, and demolish the haunted house.', win: 'Property value reduced to zero. Ghosts now legally homeless.', lose: 'The haunted house survives. Its mortgage does not.' },
          round2: { intro: 'The UFO is hungry. Wait until your thing passes directly under its beam, then tap to abduct it twice.', win: 'The aliens have adopted your thing. Nobody asked you.', lose: 'The UFO went home hungry and filed a complaint.' },
          round3: { intro: 'Your thing is on vacation in a volcano. Drag left or right to dodge falling lava rocks. Survive the timer.', win: 'You escaped the volcano. Your insurance has not.', lose: 'Your thing has become locally sourced magma.' },
          summary: 'Worlds survived. Points of questionable achievement registered. Your thing deserves a vacation.'
        },
        round_modifiers: {
          round1_wreck: { launch_impulse: 2.6, time_limit: 9.0, wreck_scale: 1.0, theme_title: 'THE HAUNTED HOUSE', theme_accent: '#ff6f98' },
          round2_beam: { ufo_speed_mult: 1.0, beam_window_px: 68, target_catches: 2, time_limit: 10.0, theme_title: 'THE UFO INCIDENT', theme_accent: '#7ff2d4', decoys: ['COW?', 'NOT IT'] },
          round3_lava: { rock_speed_min: 245, rock_speed_max: 315, spawn_interval: 0.73, hearts: 2, time_limit: 10.0, theme_title: 'VOLCANO VACATION', theme_accent: '#ffcd63' }
        }
      };

  const stages = [
    {name: 'WRECK IT!', theme: 'THE HAUNTED HOUSE', hint:'DRAG BACK. LET FLY.', seconds: 9, color:'#ff6f98'},
    {name: 'BEAM IT!', theme: 'THE UFO INCIDENT', hint:'TAP WHEN THE THING IS UNDER THE UFO.', seconds: 10, color:'#7ff2d4'},
    {name: 'DODGE IT!', theme: 'VOLCANO VACATION', hint:'SLIDE LEFT/RIGHT. DODGE HOT ROCKS.', seconds: 10, color:'#ffcd63'}
  ];

  const state = {
    scene:'menu', round:0, remaining:9, elapsed:0, score:0, won:[null,null,null], seed:7821,
    particles:[], texts:[], shake:0, flash:0, freeze:0, playTime:0, last:0,
    photo:null, originalPhoto:null, cutout:false, photoLabel:'MYSTERY THING', worlds:[null,null,null],
    aftermath:null, materialize:0, photoRevision:0, busy:false,
    photoBase64:null, dragging:false, pointer:null,
    wreck:{angle:-0.85,omega:0,launched:false,hit:false,damage:0},
    ufo:{hits:0,misses:0,beam:0,beamGood:false,phase:0,abduct:0,winCountdown:0},
    lava:{x:210,targetX:210,rocks:[],spawn:0,hearts:2,invuln:0,dodge:0}
  };

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let audio = null;
  let audioUnlocked = false;
  const music = window.ThingMusic?.createMusicController({
    button: document.querySelector('#musicToggle'),
    status: document.querySelector('#musicStatus')
  });
  let modalReadyAt = 0;
  const TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const random=()=>{state.seed=(Math.imul(1664525,state.seed)+1013904223)>>>0;return state.seed/4294967296;};
  const rnd=(a,b)=>a+random()*(b-a);
  const pt=(x,y)=>({x,y});

  // ── Chaos Stage Machine v2 ───────────────────────────────────────────
  // stage_machine.js turns the validated GamePlan into a recipe (pure data)
  // naming one allowlisted module per slot. Without it, or if a recipe ever
  // fails validation, every round falls back to the original art pass.
  const SM=(typeof window!=='undefined'&&window.StageMachine)||null;
  const classicStage=(game,set,atmosphere,props,fx,title,noun,labels)=>({game,set,atmosphere,props,fx,title,noun,remix:0,seed:0,tags:[],labels,signature:`${set}/${atmosphere}/${props}/${fx}`});
  const CLASSIC_STAGES={
    wreck:classicStage('wreck','haunted_house','haunted_moon','graveyard','fog_bats','THE HAUNTED HOUSE','THE HOUSE',{atmosphere:'HAUNTED MOON',set:'HAUNTED HOUSE',props:'GRAVEYARD',fx:'FOG + BATS'}),
    beam:classicStage('beam','night_farm','starry_night','barn_silo','night_breeze','THE UFO INCIDENT','THE FARM',{atmosphere:'STARRY NIGHT',set:'NIGHT FARM',props:'BARN + SILO',fx:'NIGHT BREEZE'}),
    dodge:classicStage('dodge','volcano','sunset_haze','basalt_ridge','ember_drift','VOLCANO VACATION','THE VOLCANO',{atmosphere:'SUNSET HAZE',set:'VOLCANO',props:'BASALT RIDGE',fx:'EMBER DRIFT'})
  };
  const stageMachine={
    remix:0,pendingRemix:Math.max(0,parseInt(new URLSearchParams(location.search).get('remix'),10)||0),
    recipes:{...CLASSIC_STAGES},assemble:0,resumeKind:null,anim:null,focus:'wreck'
  };
  const DEFAULT_THEMES=['THE HAUNTED HOUSE','THE UFO INCIDENT','VOLCANO VACATION'];
  const GAME_KEYS=['wreck','beam','dodge'];
  // Player-facing copy follows the world on stage. Fixed lines for the
  // original sets live here so the game still reads right without the module;
  // stage_machine.js supplies each set's own lines and rewrites model text
  // that names a sibling world (no volcano talk inside the foundry).
  const CLASSIC_LINES={
    wreck:{heading:['WRECK','THE HOUSE!'],
      intro:'Your thing is now a wrecking ball. Pull it left, release, and demolish the haunted house.',
      win:'Property value reduced to zero. Ghosts now legally homeless.',lose:'The haunted house survives. Its mortgage does not.'},
    beam:{heading:['ALIENS','WANT YOUR STUFF!'],hint:'TAP WHEN THE THING IS UNDER THE UFO.',
      intro:'The UFO is hungry. Wait until your thing passes directly under its beam, then tap to abduct it twice.',
      win:'The aliens have adopted your thing. Nobody asked you.',lose:'The UFO went home hungry and filed a complaint.',cheer:'ADOPTED BY SPACE WEIRDOS.'},
    dodge:{heading:['THE FLOOR','IS LAVA!'],hint:'SLIDE LEFT/RIGHT. DODGE HOT ROCKS.',
      intro:'Your thing is on vacation in a volcano. Drag left or right to dodge falling lava rocks. Survive the timer.',
      win:'You escaped the volcano. Your insurance has not.',lose:'Your thing has become locally sourced magma.',status:'OH NO IT IS VERY HOT',cheer:'STILL RAW IN THE MIDDLE!'}
  };
  function setLines(i){
    const g=GAME_KEYS[i];let own=null;
    try{own=SM?SM.setCopy(stageMachine.recipes[g]):null;}catch(_){own=null;}
    return {...CLASSIC_LINES[g],...(own||{})};
  }
  function fitLine(i,text){
    if(typeof text!=='string'||!text.trim())return null;
    if(!SM)return text;
    try{return SM.fitCopy(stageMachine.recipes[GAME_KEYS[i]],text);}catch(_){return null;}
  }
  const roundLine=(i,key,modelText)=>fitLine(i,modelText)||fitLine(i,setLines(i)[key])||setLines(i)[key];
  function stageTheme(i){const r=stageMachine.recipes[GAME_KEYS[i]];return stages[i].theme===DEFAULT_THEMES[i]?r.title:(fitLine(i,stages[i].theme)||r.title);}
  // The world a remix rebuilds: the round on the ticket, else WRECK IT first.
  const focusGame=()=>state.scene==='between'?GAME_KEYS[state.round]:'wreck';
  function composeStages(){
    for(const game of GAME_KEYS){
      let r=null;
      try{r=SM?SM.composeStage(activePlan,{game,remix:stageMachine.remix}):null;}catch(_){r=null;}
      stageMachine.recipes[game]=r&&SM.validateRecipe(r).ok?r:CLASSIC_STAGES[game];
    }
    canvas.dataset.stage=stageMachine.recipes.wreck.signature;
    canvas.dataset.worlds=GAME_KEYS.map(g=>stageMachine.recipes[g].set).join(',');
  }

  function applyPlanToStages(plan) {
    if (!plan || !plan.round_modifiers) return;
    activePlan = plan;
    // A new object gets its director's cut; ?remix=N reproduces a remix once.
    stageMachine.remix=stageMachine.pendingRemix;stageMachine.pendingRemix=0;stageMachine.assemble=0;
    composeStages();
    const m = plan.round_modifiers;
    stages[0].theme = m.round1_wreck.theme_title || 'THE HAUNTED HOUSE';
    stages[0].color = m.round1_wreck.theme_accent || '#ff6f98';
    stages[0].seconds = m.round1_wreck.time_limit || 9.0;

    stages[1].theme = m.round2_beam.theme_title || 'THE UFO INCIDENT';
    stages[1].color = m.round2_beam.theme_accent || '#7ff2d4';
    stages[1].seconds = m.round2_beam.time_limit || 10.0;

    stages[2].theme = m.round3_lava.theme_title || 'VOLCANO VACATION';
    stages[2].color = m.round3_lava.theme_accent || '#ffcd63';
    stages[2].seconds = m.round3_lava.time_limit || 10.0;

    if (roleBadge) {
      const objLabel = plan.selected_object?.label || state.photoLabel;
      const roleStr = plan.whimsical_role || plan.selected_object?.role || 'CHAOTIC PROP';
      roleBadge.textContent = `PROP: ${objLabel.toUpperCase()} · ROLE: ${roleStr.toUpperCase()}`;
    }

    if (state.scene === 'menu') setModal('menu');
  }

  const resetPhysics=()=>{
    state.wreck={angle:-0.85,omega:0,launched:false,hit:false,damage:0};
    state.ufo={hits:0,misses:0,beam:0,beamGood:false,phase:0,abduct:0,winCountdown:0};
    const initHearts = activePlan.round_modifiers?.round3_lava?.hearts || 2;
    state.lava={x:210,targetX:210,rocks:[],spawn:0,hearts:initHearts,invuln:0,dodge:0};
  };

  function tone(hz=220,duration=.1,type='square',volume=.06,slide=1){
    if (!audioUnlocked) return;
    try{
      audio ||= new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended') audio.resume().catch(()=>{});
      const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;
      o.type=type;o.frequency.setValueAtTime(hz,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,hz*slide),now+duration);
      g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);
      o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+duration+.015);
    }catch(e){ /* sound must never block gameplay */ }
  }

  function noise(duration=.12,volume=.13){
    if (!audioUnlocked) return;
    try{
      audio ||= new (window.AudioContext||window.webkitAudioContext)();
      const now=audio.currentTime,buf=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),data=buf.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*(1-i/data.length);
      const source=audio.createBufferSource(),g=audio.createGain();source.buffer=buf;g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);source.connect(g);g.connect(audio.destination);source.start(now);
    }catch(e){}
  }

  function burst(x,y,color,count=18,power=150){
    for(let i=0;i<count;i++){
      const a=random()*TAU,s=rnd(power*.35,power),life=rnd(.35,.95);
      state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rnd(10,50),r:rnd(2,7),color,life,max:life,angle:random()*TAU,spin:rnd(-8,8)});
    }
  }


  // Distinct physical comedy for common objects. Muse names the prop;
  // deterministic game code handles the fast, reliable visual payoff.
  function propSignature() {
    const label=String(activePlan.selected_object?.label || state.photoLabel).toLowerCase();
    if (/pumpkin|gourd|squash/.test(label))
      return { shape:'seed', color:'#ff9e35', secondary:'#ffe08b', word:'SQUASHED!' };
    if (/sponge|soap|towel/.test(label))
      return { shape:'splash', color:'#79eafb', secondary:'#e4ffff', word:'SOAKED!' };
    if (/car|truck|wheel|metal/.test(label))
      return { shape:'spark', color:'#ffd068', secondary:'#ffffff', word:'CRASH!' };
    if (/bear|plush|stuffed|pillow/.test(label))
      return { shape:'fluff', color:'#ffafd7', secondary:'#ffeff8', word:'FLUFF STORM!' };
    return { shape:'spark', color:'#fdf071', secondary:'#fff1c0', word:'BONK!' };
  }
  function signatureBurst(x,y,count=24) {
    const spec=propSignature();
    for(let i=0;i<count;i++){
      const a=random()*TAU,s=rnd(75,230),life=rnd(.55,1.2);
      state.particles.push({
        x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rnd(20,70),
        r:rnd(5,12),color:i%3?spec.color:spec.secondary,
        life,max:life,angle:random()*TAU,spin:rnd(-10,10),shape:spec.shape
      });
    }
    return spec;
  }
  function shout(str,x,y,color='#fff',size=29){state.texts.push({str,x,y,color,size,life:.9,max:.9,vx:rnd(-12,12)});}
  function setStatus(text){status.textContent=text;}

  function setModal(kind){
    music?.setMix('menu');
    modal.hidden=false;badges.hidden=true;
    modal.dataset.kind=kind; modalReadyAt=performance.now()+350;
    document.querySelector('#reportPortrait').hidden=kind!=='summary';
    document.querySelector('#reportScore').hidden=kind!=='summary';
    document.querySelector('.ticket').getAnimations?.().forEach(a=>a.cancel());
    if (!reducedMotion) document.querySelector('.ticket').animate?.([{opacity:0,transform:'translateY(20px) rotate(2deg) scale(.95)'},{opacity:1,transform:'rotate(-1.5deg)'}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)'});
    if (shareBtn) shareBtn.hidden = kind !== 'summary';
    if (remixBtn) {
      remixBtn.hidden = !(kind==='menu'||kind==='summary'||kind==='round');
      remixBtn.textContent = `🎲 REMIX THE CHAOS · NOW: ${stageMachine.recipes[kind==='round'?GAME_KEYS[state.round]:'wreck'].labels.set}`;
    }
    const lines = activePlan.announcer_lines;
    if(kind==='menu'){
      stamp.textContent='✹ OFFICIAL NONSENSE MACHINE ✹';
      title.innerHTML='YOUR STUFF.<br><em>OUR PROBLEM.</em>';
      body.textContent=lines?.intro || 'Three different universes. Three absurd microgames. One object gets absolutely no peace.';
      badges.hidden=false; primary.innerHTML='UNLEASH THE CHAOS <span>➜</span>';
      badges.innerHTML=worldBadges(i=>`0${i+1} ${GAME_NAMES[i]}`,i=>stageMachine.recipes[GAME_KEYS[i]].labels.set);
      sub.textContent='ONE PHOTO · THREE GAMES · ALL CHAOS';
    }else if(kind==='round'){
      const s=stages[state.round],L=setLines(state.round);
      stamp.textContent=`ROUND 0${state.round+1} / 03  ·  ${stageTheme(state.round)}`;
      const rKey = `round${state.round+1}`;
      title.innerHTML=`${L.heading[0]}<br><em>${L.heading[1]}</em>`;
      body.textContent=roundLine(state.round,'intro',lines?.[rKey]?.intro);
      primary.innerHTML='I WAS BORN READY <span>➜</span>';
      sub.textContent=L.hint||s.hint;
    }else if(kind==='result'){
      const success=state.won[state.round];
      const rKey = `round${state.round+1}`;
      stamp.textContent=success?'★ UNNECESSARILY IMPRESSIVE ★':'✕ COSMICALLY EMBARRASSING ✕';
      title.innerHTML=success?'YOU DID<br><em>THE THING!</em>':'ABSOLUTE<br><em>DISASTER.</em>';
      const outcome = success ? 'win' : 'lose';
      body.textContent=roundLine(state.round,outcome,lines?.[rKey]?.[outcome]);
      primary.innerHTML=state.round===2?'SEE THE DAMAGE <span>➜</span>':'NEXT BAD IDEA <span>➜</span>';
      sub.textContent=`TOTAL SCORE: ${state.score.toString().padStart(4,'0')}`;
    }else if(kind==='summary'){
      stamp.textContent='✹ ARCADE CHAOS REPORT ✹';
      const portrait=document.querySelector('#reportPortrait');
      // Use the exact gameplay image source, preserving SAM transparency.
      paintPortrait(portrait.getContext('2d'));
      document.querySelector('#reportScore').textContent=`${String(state.score).padStart(4,'0')} PTS`;
      title.textContent=activePlan.selected_object?.label || state.photoLabel;
      body.textContent=activePlan.whimsical_role || activePlan.selected_object?.role || 'Everyday Chaos Dynamo';
      badges.hidden=false;
      badges.innerHTML=worldBadges(i=>`${state.won[i]?'✓':'✕'} ${GAME_NAMES[i]}`,worldPlayed);
      primary.innerHTML='ANOTHER DISASTER? <span>↻</span>';
      sub.textContent=`THREAT CLASS: ${chaosRating()}`;
    }
  }


  // Badge rows name each round's world. Labels come from the allowlisted
  // catalog only, never from model text, so they are safe to template.
  const GAME_NAMES=['WRECK','BEAM','DODGE'];
  const worldPlayed=i=>state.worlds[i]||stageMachine.recipes[GAME_KEYS[i]].labels.set;
  const worldBadges=(head,world)=>GAME_KEYS.map((_,i)=>`<span>${head(i)}<small>${world(i)}</small></span>`).join('');

  // Collectible portrait: sunburst, halo and the die-cut sticker character.
  function paintPortrait(pc){
    const main=c;c=pc;
    try{
      c.clearRect(0,0,300,180);
      const badge=[];for(let i=0;i<36;i++){const a=i*Math.PI/18,r=i%2?78:86;badge.push([150+Math.cos(a)*r,96+Math.sin(a)*r*.98]);}
      cutPoly(badge,'#ff5d86',INK,3,5);
      c.save();c.beginPath();ell(150,96,70,69);c.clip();c.fillStyle='#ffe393';c.fillRect(70,20,160,160);
      c.translate(150,96);for(let i=0;i<16;i++){c.rotate(TAU/16);c.fillStyle='rgba(255,180,80,.5)';c.beginPath();c.moveTo(0,0);c.lineTo(-11,-80);c.lineTo(11,-80);c.closePath();c.fill();}
      c.restore();
      c.lineWidth=2.5;c.strokeStyle=INK;c.beginPath();ell(150,96,70,69);c.stroke();
      c.save();c.setLineDash([3,6]);c.strokeStyle='#fff3c5';c.lineWidth=2;c.beginPath();ell(150,96,64,63);c.stroke();c.restore();
      groundShadow(150,160,50,.3);
      drawThing(150,84,150,-.05,false);
      twinkle(46,40,12,'#ff5d86',.2);twinkle(256,46,10,'#53e8cb');twinkle(250,146,8,'#e13668',.4);twinkle(52,144,9,'#ffb12e');
    }finally{c=main;}
  }
  function chaosRating(){return ['DOMESTIC DISTURBANCE','LOCAL MENACE','REGIONAL PROBLEM','EXTINCTION-LEVEL FURNITURE'][state.won.filter(Boolean).length];}

  // A private, local 9:16 result card. Nothing uploaded or sent to a server.
  async function shareIncident() {
    // Bake the high-res die-cut sticker before the poster surface exists.
    const st = state.cutout && state.photo ? sticker(state.photo, 480) : null;
    const result = document.createElement('canvas');
    result.width = 720; result.height = 1280;
    const g = result.getContext('2d');
    const W = result.width;
    g.fillStyle = '#171322'; g.fillRect(0, 0, W, result.height);
    // Bold collectible party poster: halftone paper, inked offsets, a sticker hero.
    g.fillStyle = '#261d3a';
    for (let y=140; y<1280; y+=22) for (let x=(y/22)%2?11:0; x<=720; x+=22) { g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
    g.fillStyle = '#05040a'; g.fillRect(36, 34, 664, 94);
    g.fillStyle = '#fdf071'; g.fillRect(28, 26, 664, 94);
    g.fillStyle = '#171322';
    g.font = '1000 52px system-ui,Arial'; g.textAlign = 'center';
    g.fillText('THING//MANIA', W/2, 91);
    g.fillStyle = '#fff3c5'; g.font = '900 27px monospace';
    g.fillText('ARCADE CHAOS REPORT', W/2, 178);
    const label = (activePlan.selected_object?.label || state.photoLabel).toUpperCase();
    const role = (activePlan.whimsical_role || 'MYSTERY CHAOS PROTAGONIST').toUpperCase();
    function fitLine(value, y, maxFont, width, color) {
      const text = String(value).slice(0, 70);
      let size = maxFont;
      do { g.font = '1000 ' + size + 'px system-ui,Arial'; size -= 2; }
      while (g.measureText(text).width > width && size > 19);
      g.fillStyle=color; g.fillText(text, W/2, y);
    }
    fitLine(label, 249, 47, 640, '#ff87a9');
    g.save(); g.translate(360,558);
    for(let i=0;i<24;i++){g.rotate(TAU/24);g.fillStyle=i%2?'#382b4b':'#45304f';g.beginPath();g.moveTo(0,0);g.lineTo(-28,-252);g.lineTo(28,-252);g.fill();}
    g.strokeStyle='#ff87a9';g.lineWidth=3;g.beginPath();g.ellipse(0,0,260,240,0,0,TAU);g.stroke();
    g.strokeStyle='#53e8cb';g.lineWidth=4;g.setLineDash([3,14]);g.lineCap='round';g.beginPath();g.ellipse(0,0,284,262,0,0,TAU);g.stroke();g.setLineDash([]);
    g.restore();
    const main = c; c = g;
    try {
      twinkle(118,330,22,'#fdf071',.2);twinkle(610,372,17,'#ff87a9');twinkle(96,742,15,'#53e8cb',.5);twinkle(628,700,24,'#fdf071',.1);twinkle(560,300,9,'#fff3c5');
      c.save();c.globalAlpha=.4;c.fillStyle='#05040a';c.beginPath();ell(W/2,800,170,22);c.fill();c.restore();
    } finally { c = main; }
    const source = state.photo;
    if (source && (source.naturalWidth || source.width)) {
      const w=source.naturalWidth || source.width, h=source.naturalHeight || source.height;
      const fit=Math.min(470/w, 470/h);
      g.save(); g.translate(W/2, 558); g.rotate(-.04);
      if (st) { const q=fit/st.k; g.drawImage(st.back, -(w*fit)/2-st.pad*q, -(h*fit)/2-st.pad*q, st.back.width*q, st.back.height*q); }
      else { g.shadowColor='#ffe78c'; g.shadowBlur=30; }
      g.drawImage(source, -(w*fit)/2, -(h*fit)/2, w*fit, h*fit);
      g.restore();
      g.save(); g.translate(574, 768); g.rotate(-.22);
      g.strokeStyle='#ff5d86'; g.lineWidth=5; g.strokeRect(-104,-30,208,60); g.lineWidth=2; g.strokeRect(-96,-22,192,44);
      g.fillStyle='#ff5d86'; g.font='1000 25px system-ui,Arial'; g.fillText('CERTIFIED', 0, -2); g.font='900 13px monospace'; g.fillText('100% REAL CHAOS', 0, 16);
      g.restore();
    } else {
      g.fillStyle='#fdf071';g.font='1000 220px system-ui';g.fillText('?!',W/2,615);
    }
    g.fillStyle = '#05040a'; g.fillRect(56, 864, 624, 114);
    g.fillStyle = '#fdf071'; g.fillRect(48, 856, 624, 114);
    g.fillStyle = '#171322'; for (const x of [48, 672]) { g.beginPath(); g.arc(x, 913, 16, 0, TAU); g.fill(); }
    g.fillStyle = '#171322';g.font='1000 68px system-ui,Arial';
    g.fillText(String(state.score).padStart(4,'0')+' PTS',W/2,933);
    for (let i=0;i<3;i++) {
      const x=50+i*215;
      g.fillStyle='#05040a';g.fillRect(x+6,994,190,69);
      g.fillStyle=state.won[i]?'#53e8cb':'#ff5d86';
      g.fillRect(x,988,190,69);
      g.fillStyle='#171322';g.font='900 27px monospace';
      g.fillText((state.won[i]?'✓ ':'✕ ')+GAME_NAMES[i],x+95,1021);
      const world=worldPlayed(i);let ws=15;
      do{g.font='900 '+ws+'px system-ui,Arial';ws--;}while(g.measureText(world).width>176&&ws>9);
      g.fillText(world,x+95,1046);
    }
    const roleWords=role.split(/\s+/),roleLines=[''];
    g.font='900 25px system-ui,Arial';
    for(const word of roleWords){const i=roleLines.length-1;
      if(g.measureText(roleLines[i]+' '+word).width>620&&roleLines[i])roleLines.push(word);
      else roleLines[i]+=(roleLines[i]?' ':'')+word;
    }
    roleLines.slice(0,2).forEach((line,i)=>fitLine(line,1094+i*30,25,640,'#fff3c5'));
    fitLine(chaosRating(),1150,25,640,'#53e8cb');
    g.fillStyle='#ff87a9';g.font='900 24px monospace';
    g.fillText('ONE PHOTO · THREE WORLDS · ALL CHAOS',W/2,1192);
    g.fillStyle='#978fa8';g.font='700 19px monospace';
    g.fillText('Made with Meta Muse Spark 1.3'+(state.cutout?' + SAM 3.1':''), W/2,1235);
    const blob = await new Promise(resolve => result.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'thingmania-chaos.png', {type:'image/png'});
    try {
      if (navigator.canShare?.({files:[file]}) && navigator.share) {
        await navigator.share({files:[file],title:'THING//MANIA Chaos Report',
          text:'My household object survived the THING//MANIA arcade.'});
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=href; a.download='thingmania-chaos.png'; a.click();
    setTimeout(()=>URL.revokeObjectURL(href),3000);
  }
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    if(shareBtn.disabled)return;shareBtn.disabled=true;
    try{await shareIncident();}catch(_){setStatus('CHAOS REPORT: SAVE FAILED / TRY AGAIN');}
    finally{shareBtn.disabled=false;}
  });

  function beginSession(){
    state.aftermath=null;state.materialize=0;state.freeze=0;
    state.round=0;state.score=0;state.won=[null,null,null];state.worlds=[null,null,null];
    const urlSeed=new URLSearchParams(location.search).get('seed');
    state.seed=urlSeed!==null?((Number(urlSeed)>>>0)||7821):((Math.random()*0xffffffff)>>>0);
    state.particles=[];state.texts=[];state.shake=0;resetPhysics();
    state.scene='between';setModal('round');setStatus(`ROUND 1 READY / ${activePlan.selected_object?.label?.toUpperCase() || 'MOCK READY'}`);
  }

  function startRound(){
    music?.setMix('main');
    if(!reducedMotion)modal.animate?.([{opacity:1},{opacity:0}],{duration:180});
    resetPhysics();state.particles=[];state.texts=[];state.remaining=stages[state.round].seconds;
    state.worlds[state.round]=stageMachine.recipes[GAME_KEYS[state.round]].labels.set;
    state.aftermath=null;state.freeze=0;state.elapsed=0;state.scene=reducedMotion?'playing':'entering';state.transition=.18;state.shake=0;state.flash=0;state.dragging=false;
    modal.hidden=reducedMotion;setStatus(`ROUND ${state.round+1} / ${stages[state.round].name} / LIVE`);
    tone(500,.09,'square',.06,1.3);setTimeoutSafeSound();
  }

  function setTimeoutSafeSound(){tone(740,.06,'triangle',.03,.8);}

  function celebrate(win, duration){
    if(state.scene!=='playing')return;
    state.scene='aftermath';state.dragging=false;
    state.aftermath={time:0,duration,win,called:false};
    if(win)music?.duck(duration+.12);
    setStatus(win?'CHAOS CONFIRMED / ENJOY THE AFTERMATH':'SPECIMEN NEEDS A MOMENT');
    if(state.round===2&&win){burst(state.lava.x,470,'#53e8cb',38,210);tone(660,.5,'triangle',.07,2);}
  }
  function endRound(win){
    if(state.scene!=='playing'&&state.scene!=='aftermath')return;
    state.won[state.round]=Boolean(win);state.scene='result';state.dragging=false;
    state.score+=win?250+Math.ceil(state.remaining)*12:0;
    setModal('result');setStatus(`ROUND ${state.round+1} ${win?'CLEARED':'FAILED'} · ${state.score} POINTS`);
    if(win){music?.duck(.65);tone(540,.18,'triangle',.075,1.9);burst(210,260,'#fdf071',28,215);}else tone(170,.45,'sawtooth',.045,.40);
  }

  // REMIX THE CHAOS: new visual seed, new compatible composition, same plan,
  // same photo/sticker, zero network requests. Never available mid-round.
  const REMIX_SCENES=['menu','between','summary'];
  function canRemix(){return REMIX_SCENES.includes(state.scene)&&!state.busy&&stageMachine.assemble<=0;}
  function remixStage(){
    if(!canRemix())return false;
    stageMachine.remix=(stageMachine.remix+1)%10000;composeStages();
    stageMachine.resumeKind=modal.hidden?null:modal.dataset.kind;
    stageMachine.focus=focusGame();
    stageMachine.assemble=ASSEMBLE_TIME;modal.hidden=true;
    const r=stageMachine.recipes[stageMachine.focus];
    setStatus(`STAGE REMIX #${stageMachine.remix} · ${r.title} · 0 API CALLS`);
    for(let i=0;i<4;i++)setTimeout(()=>tone(300+i*120,.06,'square',.035,1.4),i*230);
    return true;
  }
  if (remixBtn) remixBtn.addEventListener('click',()=>{if(performance.now()>=modalReadyAt)remixStage();});

  primary.addEventListener('click',()=>{
    if(performance.now()<modalReadyAt || state.busy || state.scene==='materializing' || stageMachine.assemble>0)return;
    audioUnlocked=true;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch(e){}
    if(state.scene==='menu'||state.scene==='summary'){beginSession();return;}
    if(state.scene==='between'){startRound();return;}
    if(state.scene==='result'){
      if(state.round===2){state.scene='summary';setModal('summary');setStatus('SESSION COMPLETE / PLAY AGAIN');}
      else{state.round++;state.scene='between';setModal('round');setStatus(`ROUND ${state.round+1} READY`);}
    }
  });

  document.querySelector('#demo').addEventListener('click',()=>{
    if(state.busy)return;
    state.aftermath=null;state.materialize=0;state.freeze=0;stageMachine.assemble=0;
    state.scene='menu';state.round=0;state.score=0;state.won=[null,null,null];state.worlds=[null,null,null];
    resetPhysics();setModal('menu');setStatus('READY / NO AI REQUESTS');
  });

  document.querySelector('#photo').addEventListener('change',e=>{
    const file=e.target.files?.[0];if(!file||state.busy||!['menu','summary'].includes(state.scene))return;
    state.photoRevision++;
    if (analyzeBtn) analyzeBtn.disabled = true;
    if(file.size>12*1024*1024){photoNote.textContent='PHOTO TOO LARGE (MAX 12 MB)';return;}
    if(!file.type.startsWith('image/')){photoNote.textContent='PLEASE CHOOSE AN IMAGE';return;}
    state.cutout = false; state.originalPhoto = null;
    if (cutoutBtn) cutoutBtn.disabled = true;
    if (cutoutStatus) { cutoutStatus.textContent = 'Analyze the new photo first.'; cutoutStatus.dataset.state = ''; }
    const reader = new FileReader();
    reader.onload = () => {
      state.photoBase64 = reader.result;
      if (analyzeBtn) analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);

    const url=URL.createObjectURL(file);const image=new Image();
    image.onload=()=>{
      state.photo=image;
      state.originalPhoto=image;
      state.photoLabel=file.name.replace(/\.[^.]+$/,'').slice(0,23)||'MY THING';
      photoNote.textContent=`USING: ${state.photoLabel.toUpperCase()} · PHOTO READY FOR META ANALYSIS`;
      if (roleBadge) roleBadge.textContent = `PROP: ${state.photoLabel.toUpperCase()} · AWAITING DIRECTOR ANALYSIS`;
      URL.revokeObjectURL(url);
    };
    image.onerror=()=>{photoNote.textContent='IMAGE COULD NOT BE READ';URL.revokeObjectURL(url);};image.src=url;
  });

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      if(state.busy||!['menu','summary'].includes(state.scene))return;
      if (!userConsent.checked) {
        alert('User consent is required before transmitting or processing photo data.');
        return;
      }
      if (!state.photoBase64) return;
      state.busy=true;analyzeBtn.disabled=true;
      analyzeBtn.textContent='SCANNING THE SPECIMEN…';
      setStatus('SCAN THE SPECIMEN / META MUSE SPARK ANALYSIS…');
      try {
        const resp = await fetch('/api/director/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: state.photoBase64,
            userConsent: true,
            clientSeed: state.seed
          })
        });
        const data = await resp.json();
        if (resp.ok && data.plan && !data.meta?.fallback_activated) {
          applyPlanToStages(data.plan);
          setStatus(`DIRECTOR: ${data.plan.selected_object.label.toUpperCase()} LOADED (${data.cached ? 'CACHED' : 'META ANALYZED'})`);
          if (cutoutBtn && state.originalPhoto) cutoutBtn.disabled = false;
          if (cutoutStatus) {
            cutoutStatus.textContent = `SPECIMEN IDENTIFIED: ${data.plan.selected_object.label.toUpperCase()} · ACTIVATE DIMENSION PORTAL (OPTIONAL SAM 3.1)`;
            cutoutStatus.dataset.state = 'ready';
          }
        } else {
          activateFallback(data.fallback_plan || data.plan || null);
        }
      } catch (err) {
        console.warn('Backend unavailable, falling back to local offline GamePlan:', err);
        activateFallback();
      } finally {
        state.busy=false;analyzeBtn.disabled=false;
        analyzeBtn.textContent='SCAN THE SPECIMEN';
        fetchBudgetStatus();
      }
    });
  }


  // Explicit second opt-in: Muse understands the object; SAM isolates it.
  async function makeSamSticker() {
    if (!['menu','summary'].includes(state.scene)||state.busy || !state.originalPhoto || !activePlan?.selected_object?.label) return;
    audioUnlocked=true; tone(220,.15,'triangle',.04,2);
    const revision=state.photoRevision;
    if (!userConsent.checked) { alert('Approve photo transmission first.'); return; }
    state.busy=true;cutoutBtn.disabled=true;analyzeBtn.disabled=true;
    cutoutBtn.textContent='PORTAL OPENING…';
    cutoutStatus.textContent='ACTIVATE DIMENSION PORTAL / META SAM SEGMENTATION…';
    cutoutStatus.dataset.state = '';
    let apiAttempted = false;
    try {
      const image = state.originalPhoto;
      const canvas = document.createElement('canvas');
      const sourceW = image.naturalWidth || image.width;
      const sourceH = image.naturalHeight || image.height;
      const scale = Math.min(1, 1024 / Math.max(sourceW, sourceH));
      canvas.width = Math.max(1, Math.round(sourceW * scale));
      canvas.height = Math.max(1, Math.round(sourceH * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      if (imageBase64.length > 5_000_000) throw new Error('PHOTO_TOO_LARGE');
      apiAttempted = true;
      const resp = await fetch('/api/sticker/cutout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ imageBase64, concept: activePlan.selected_object.label, userConsent: true })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success || !data.path || !data.box) {
        throw new Error(data.error || 'SAM_API_ERROR');
      }
      const b = data.box;
      const w = Math.round(b.right - b.left), h = Math.round(b.bottom - b.top);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1 ||
          w > canvas.width || h > canvas.height || b.left < 0 || b.top < 0 ||
          b.right > canvas.width || b.bottom > canvas.height) throw new Error('INVALID_MASK_BOUNDS');
      const cut = document.createElement('canvas');
      cut.width = w; cut.height = h;
      const cc = cut.getContext('2d');
      cc.drawImage(canvas, -b.left, -b.top);
      cc.globalCompositeOperation = 'destination-in';
      cc.fillStyle = '#fff';
      cc.fill(new Path2D(data.path));
      cc.globalCompositeOperation = 'source-over';
      const sprite = new Image();
      await new Promise((resolve, reject) => {
        sprite.onload = resolve; sprite.onerror = reject;
        sprite.src = cut.toDataURL('image/png');
      });
      if(revision!==state.photoRevision)return;
      state.photo = sprite;
      state.cutout = true;
      cutoutStatus.textContent = `CHARACTER MATERIALIZED: ${data.concept.toUpperCase()} · SAM 3.1 ${data.cached ? 'CACHED' : 'LIVE'}`;
      cutoutStatus.dataset.state = 'ready';
      state.scene='materializing';state.materialize=0;modal.hidden=true;
      music?.duck(1.8);
      state.particles=[];burst(210,320,'#53e8cb',45,160);
      tone(440,.7,'triangle',.06,2);
      setStatus('CHARACTER MATERIALIZED / UNLEASH THE CHAOS');
      document.querySelector('.arcade-shell')?.scrollIntoView({
        behavior: reducedMotion?'auto':'smooth', block: 'start'
      });
    } catch (err) {
      cutoutStatus.textContent = `CUTOUT UNAVAILABLE (${String(err.message || 'ERROR').slice(0, 38)}) · GAME STILL WORKS`;
      cutoutStatus.dataset.state = 'error';
      if (!apiAttempted) cutoutBtn.disabled = false;
    } finally { state.busy=false;analyzeBtn.disabled=false;cutoutBtn.textContent='ACTIVATE DIMENSION PORTAL';fetchBudgetStatus(); }
  }
  if (cutoutBtn) cutoutBtn.addEventListener('click', makeSamSticker);

  // Handle Fixture Buttons
  chipButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      if(state.busy||!['menu','summary'].includes(state.scene))return;
      chipButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const fixtureId = btn.getAttribute('data-fixture');

      if (fixtureId === 'default') {
        const def = (typeof window !== 'undefined' && window.GamePlan)
          ? window.GamePlan.createDefaultGamePlan({ label: state.photoLabel || 'MYSTERY THING' })
          : activePlan;
        applyPlanToStages(def);
        setStatus('DIRECTOR: DEFAULT PLAN RESTORED');
        return;
      }

      setStatus(`DIRECTOR: LOADING FIXTURE [${fixtureId.toUpperCase()}]...`);
      try {
        const resp = await fetch('/api/director/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fixtureId: fixtureId,
            userConsent: true,
            clientSeed: state.seed
          })
        });
        const data = await resp.json();
        if (data.plan) {
          applyPlanToStages(data.plan);
          setStatus(`DIRECTOR: FIXTURE [${data.plan.selected_object.label.toUpperCase()}] ${data.cached ? '(CACHED)' : '(MOCK LOADED)'}`);
          fetchBudgetStatus();
        } else {
          activateFallback(data.fallback_plan || null);
        }
      } catch (err) {
        console.warn('Backend fetch failed, attempting direct fixture fallback:', err);
        // Direct offline fallback for static / file:// execution
        try {
          const directResp = await fetch(`fixtures/${fixtureId}.json`);
          const fixtureJson = await directResp.json();
          const valid = window.GamePlan?.validateGamePlan(fixtureJson);
          if (valid?.valid) {
            applyPlanToStages(valid.sanitized);
            setStatus(`DIRECTOR: FIXTURE [${valid.sanitized.selected_object.label.toUpperCase()}] (OFFLINE)`);
            return;
          }
        } catch (_) {}
        activateFallback();
      }
    });
  });

  async function fetchBudgetStatus() {
    try {
      const resp = await fetch('/api/status');
      const data = await resp.json();
      if (data?.adapter) {
        const a = data.adapter;
        const directorHeader = document.querySelector('#directorHeader');
        if (directorHeader) directorHeader.textContent = a.mock_mode
          ? '✹ META GAME DIRECTOR · MOCK MODE ✹'
          : '✹ META GAME DIRECTOR · LIVE META API ✹';
        if (status.textContent.includes('CHECKING BACKEND')) {
          setStatus(a.mock_mode ? 'DIRECTOR: READY / MOCK MODE' : 'DIRECTOR: READY / LIVE META API');
        }
        if (!a.mock_mode && a.session_calls >= a.max_session_calls && analyzeBtn) {
          analyzeBtn.disabled = true;
          analyzeBtn.textContent = 'SESSION API LIMIT REACHED — RESTART BACKEND TO RETRY';
        }
        const sam = data.sam;
        if (budgetStatus) budgetStatus.textContent = `MUSE EST: ${a.budget_used_usd.toFixed(3)} · MUSE: ${a.session_calls}/${a.max_session_calls} · SAM: ${sam?.attempts ?? 0}/${sam?.max_attempts ?? 1} · SAM EST: ${(sam?.estimated_spend_usd ?? 0).toFixed(4)}`;
        if (sam && sam.attempts >= sam.max_attempts && cutoutBtn && !state.cutout) {
          cutoutBtn.disabled = true;
        }
      }
    } catch (_) {
      if (budgetStatus) budgetStatus.textContent = 'MODE: 100% OFFLINE BROWSER FALLBACK ACTIVE';
    }
  }

  function activateFallback(customPlan) {
    const fallbackPlan = customPlan || (window.GamePlan
      ? window.GamePlan.createDefaultGamePlan({ label: state.photoLabel || 'OFFLINE THING', source: 'offline_client_recovery' })
      : activePlan);
    applyPlanToStages(fallbackPlan);
    setStatus('DIRECTOR: OFFLINE FALLBACK ENGAGED / GAMEPLAY SAFE');
  }

  const pos=e=>{const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*WIDTH/b.width,y:(e.clientY-b.top)*HEIGHT/b.height};};
  function onPress(e){
    if(state.scene!=='playing')return;
    e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=pos(e);state.pointer=p;
    if(state.round===0&&!state.wreck.launched){
      state.dragging=true;
      setWreckAngle(p);
    }else if(state.round===1){tryBeam();}
    else if(state.round===2){state.dragging=true;state.lava.targetX=clamp(p.x,58,362);}
  }
  function setWreckAngle(p){
    let a=Math.atan2(p.x-210,p.y-110);
    state.wreck.angle=clamp(a,-1.23,-.25);
  }
  function onMove(e){if(!state.dragging||state.scene!=='playing')return;e.preventDefault();const p=pos(e);state.pointer=p;if(state.round===0&&!state.wreck.launched)setWreckAngle(p);else if(state.round===2)state.lava.targetX=clamp(p.x,58,362);}
  function onRelease(e){
    if(state.scene!=='playing')return;
    if(state.round===0&&state.dragging&&!state.wreck.launched){
      state.wreck.launched=true;
      const impulse = activePlan.round_modifiers?.round1_wreck?.launch_impulse || 2.6;
      state.wreck.omega=impulse;
      state.dragging=false;tone(135,.29,'sawtooth',.042,2.2);
    }
    else state.dragging=false;
  }
  canvas.addEventListener('pointerdown',onPress);canvas.addEventListener('pointermove',onMove);
  canvas.addEventListener('pointerup',onRelease);canvas.addEventListener('pointercancel',()=>state.dragging=false);
  window.addEventListener('keydown',e=>{
    if(state.scene!=='playing')return;
    if(e.key===' '||e.key==='Enter'){
      e.preventDefault();
      if(state.round===1)tryBeam();
      else if(state.round===0&&!state.wreck.launched){
        state.wreck.launched=true;
        const impulse = activePlan.round_modifiers?.round1_wreck?.launch_impulse || 2.6;
        state.wreck.omega=impulse;
      }
    }
    if(state.round===2){
      if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a'){state.lava.targetX=clamp(state.lava.targetX-96,58,362);e.preventDefault();}
      if(e.key==='ArrowRight'||e.key.toLowerCase()==='d'){state.lava.targetX=clamp(state.lava.targetX+96,58,362);e.preventDefault();}
    }
  });
  const targetX=()=>210+136*Math.sin(state.ufo.phase);
  function tryBeam(){
    if(state.scene!=='playing')return;
    const u=state.ufo;if(u.beam>0||u.winCountdown>0)return;
    u.beam=.43;
    const windowPx = activePlan.round_modifiers?.round2_beam?.beam_window_px || 68;
    const requiredHits = activePlan.round_modifiers?.round2_beam?.target_catches || 2;
    u.beamGood=Math.abs(targetX()-210)<windowPx;
    if(u.beamGood){u.hits++;u.abduct=.38;state.score+=110;state.shake=5;state.flash=.13;shout('SNATCHED!',205,290,'#fff79b',30);burst(210,430,'#8dffe1',26,190);signatureBurst(210,430,14);tone(480,.28,'triangle',.09,2.0);}
    else{u.misses++;state.shake=3;shout('NOPE!',210,290,'#ff8bb2',35);tone(180,.2,'sawtooth',.055,.55);}
    if(u.hits>=requiredHits)u.winCountdown=.72;
  }
  function update(dt){
    if(stageMachine.assemble>0){
      stageMachine.assemble=Math.max(0,stageMachine.assemble-dt);
      if(!REMIX_SCENES.includes(state.scene))stageMachine.assemble=0;
      else if(stageMachine.assemble===0&&stageMachine.resumeKind)setModal(stageMachine.resumeKind);
    }
    if(state.scene==='entering'){state.transition-=dt;if(state.transition<=0){state.scene='playing';modal.hidden=true;}return;}
    if(state.scene==='materializing'){
      state.materialize+=dt;
      if(state.materialize>=1.8){state.scene='menu';setModal('menu');}
    }
    // Hit-stop consumes simulation time before debris, ghosts or the timeline move.
    if(state.freeze>0){state.freeze=Math.max(0,state.freeze-dt);return;}
    state.playTime+=dt*(reducedMotion ? .3 : 1);
    state.shake=Math.max(0,state.shake-dt*24);state.flash=Math.max(0,state.flash-dt*2.4);
    for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.angle+=p.spin*dt;p.life-=dt;}
    state.particles=state.particles.filter(p=>p.life>0).slice(-180);
    for(const t of state.texts){t.y-=56*dt;t.x+=t.vx*dt;t.life-=dt;}state.texts=state.texts.filter(t=>t.life>0);
    if(state.scene==='aftermath'){
      const a=state.aftermath;a.time+=dt;
      if(state.round===0){
        state.wreck.damage=clamp(a.time/.65,0,1);
        if(a.time>.75&&!a.called){a.called=true;tone(620,.35,'triangle',.065,1.5);}
      }else if(state.round===1){state.ufo.beam=Math.max(0,state.ufo.beam-dt);state.ufo.abduct=Math.max(0,state.ufo.abduct-dt);}
      if(a.time>=a.duration)endRound(a.win);
      return;
    }
    if(state.scene!=='playing')return;
    if(!(state.round===1&&state.ufo.winCountdown>0)){state.elapsed+=dt;state.remaining=Math.max(0,stages[state.round].seconds-state.elapsed);}
    if(state.round===0){
      const w=state.wreck;
      if(w.launched&&!w.hit){
        w.omega+=-12.2*Math.sin(w.angle)*dt;
        w.omega*=Math.pow(.992,dt*60);
        w.angle+=w.omega*dt;
        if(w.angle>.32){wreckImpact();}
        else if(w.angle < -1.15 && state.elapsed>3.0){w.launched=false;w.omega=0;}
      }

    }else if(state.round===1){
      const speedMult = activePlan.round_modifiers?.round2_beam?.ufo_speed_mult || 1.0;
      state.ufo.phase+=dt*1.93*speedMult;
      state.ufo.beam=Math.max(0,state.ufo.beam-dt);
      state.ufo.abduct=Math.max(0,state.ufo.abduct-dt);
      if(state.ufo.winCountdown>0){state.ufo.winCountdown=Math.max(0,state.ufo.winCountdown-dt);if(state.ufo.winCountdown===0)celebrate(true,.65);}
    }else{
      const l=state.lava;l.x=lerp(l.x,l.targetX,Math.min(1,dt*13));l.spawn+=dt;
      l.invuln=Math.max(0,l.invuln-dt);l.near=Math.max(0,(l.near||0)-dt);
      const spawnInterval = activePlan.round_modifiers?.round3_lava?.spawn_interval || 0.73;
      const minSpd = activePlan.round_modifiers?.round3_lava?.rock_speed_min || 245;
      const maxSpd = activePlan.round_modifiers?.round3_lava?.rock_speed_max || 315;
      if(l.spawn>spawnInterval){l.spawn=0;
        const lane=Math.floor(random()*3),xx=[92,210,328][lane];
        l.rocks.push({x:xx,y:-40,r:rnd(23,34),spin:rnd(-4,4),a:rnd(0,TAU),speed:rnd(minSpd,maxSpd)});
      }
      for(const rock of l.rocks){rock.y+=rock.speed*dt;rock.a+=rock.spin*dt;
        if(!rock.passed&&rock.y>558){rock.passed=true;
          const distance=Math.abs(rock.x-l.x);
          if(distance>rock.r+27&&distance<rock.r+65&&l.invuln<=0){shout('TOO CLOSE!',l.x,450,'#53e8cb',19);tone(880,.07,'triangle',.025,1.3);l.near=.5;l.nearSide=Math.sign(rock.x-l.x)||1;}
        }
        if(!rock.splashed&&rock.y>592){rock.splashed=true;splash(rock.x,590);}
        if(rock.y>490&&rock.y<554&&Math.abs(rock.x-l.x)<rock.r+27&&l.invuln<=0){
          l.hearts--;l.invuln=1.35;state.shake=12;state.flash=.23;burst(l.x,512,'#ff624f',24,220);shout('OW!',l.x,457,'#fff1b0',35);noise(.24,.12);tone(100,.27,'sawtooth',.07,.38);
          if(l.hearts<=0){endRound(false);break;}
        }
      }
      l.rocks=l.rocks.filter(r=>r.y<690);
    }
    if(state.scene==='playing'&&state.remaining<=0 && !(state.round===1&&state.ufo.winCountdown>0)){if(state.round===2)celebrate(true,1.05);else endRound(false);}
  }
  function wreckImpact(){
    const w=state.wreck;if(state.scene!=='playing'||w.hit)return;
    celebrate(true,2.48);state.freeze=.12;
    w.hit=true;w.omega=0;state.shake=19;state.flash=.85;state.score+=175;
    burst(317,293,'#fcdb77',40,235);
    const signature=signatureBurst(306,262,34);
    shout(signature.word,260,190,signature.secondary,31);debris(305,322,(WRECK_SETS[stageMachine.recipes.wreck.set]||WRECK_SETS.haunted_house).debris);
    tone(81,.39,'sawtooth',.11,.3);noise(.45,.21);
  }
  function path(points,color,stroke='#191426',width=3){c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke();}}
  function rect(x,y,w,h,fill,stroke='#171222',line=3,r=0){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=line;c.strokeStyle=stroke;c.stroke();}}
  function circ(x,y,r,fill,stroke='#171222',line=3){c.beginPath();c.arc(x,y,Math.max(0.1,r),0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=line;c.strokeStyle=stroke;c.stroke();}}
  function txt(s,x,y,size=20,color='#fff3bd',align='center',stroke='#191329',weight=1000){c.save();c.font=`${weight} ${size}px system-ui,Arial`;c.textAlign=align;c.textBaseline='middle';if(stroke){c.strokeStyle=stroke;c.lineWidth=size<13?2:5;c.lineJoin='round';c.strokeText(s,x,y);}c.fillStyle=color;c.fillText(s,x,y);c.restore();}
  function star(x,y,n=7,r=18,color='#ffef8c'){const v=[];for(let i=0;i<n*2;i++){const a=(i*Math.PI/n)-Math.PI/2,rr=i%2?r*.46:r;v.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}path(v,color);}

  // ── Art pass: a surreal miniature toy arcade ──────────────────────────
  // Presentation only. Paper-cutout shapes get an offset contact shadow and
  // an inked edge; static scenery is painted once into cached layers so an
  // ordinary Android phone only blits it; effects use their own RNG so the
  // seeded gameplay sequence (rock lanes, bursts) never shifts.
  const INK='#191426',SHADE='rgba(16,8,30,.36)';
  const motion=reducedMotion?.35:1;
  let vseed=0x5eed;
  const vr=()=>{vseed=(Math.imul(1103515245,vseed)+12345)>>>0;return vseed/4294967296;};
  const vrnd=(a,b)=>a+vr()*(b-a);
  const ease={
    out:t=>1-Math.pow(1-clamp(t,0,1),3),
    in:t=>Math.pow(clamp(t,0,1),3),
    inOut:t=>{t=clamp(t,0,1);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;},
    back:t=>{t=clamp(t,0,1)-1;return 1+2.70158*t*t*t+1.70158*t*t;},
    elastic:t=>{t=clamp(t,0,1);return t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*TAU/3)+1;},
    bounce:t=>{t=clamp(t,0,1);const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;}
  };
  function ell(x,y,rx,ry,r=0){c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),r,0,TAU);}
  function poly(pts){c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();}
  function cut(trace,fill,ink=INK,lw=3,sh=4){
    if(sh){c.save();c.translate(sh*.55,sh);c.beginPath();trace();c.fillStyle=SHADE;c.fill();c.restore();}
    c.beginPath();trace();c.fillStyle=fill;c.fill();
    if(ink){c.lineWidth=lw;c.lineJoin='round';c.lineCap='round';c.strokeStyle=ink;c.stroke();}
  }
  const cutPoly=(pts,fill,ink,lw,sh)=>cut(()=>poly(pts),fill,ink,lw,sh);
  function stroke(pts,color,w=3){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();}
  function curve(pts,color,w=3){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++)c.quadraticCurveTo(pts[i][0],pts[i][1],(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2);const e=pts[pts.length-1];c.lineTo(e[0],e[1]);c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();}
  const layers=new Map();
  function layer(key,w,h,paint){
    let cv=layers.get(key);if(cv)return cv;
    cv=document.createElement('canvas');cv.width=w;cv.height=h;
    const main=c;c=cv.getContext('2d');
    try{paint();}finally{c=main;}
    layers.set(key,cv);return cv;
  }
  function glowAt(x,y,r,rgb,alpha=1,sy=1){
    if(alpha<=0||r<=0)return;
    const sprite=layer('glow'+rgb,96,96,()=>{const g=c.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,`rgba(${rgb},.9)`);g.addColorStop(.35,`rgba(${rgb},.42)`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(0,0,96,96);});
    c.save();c.globalAlpha=clamp(alpha,0,1);c.translate(x,y);c.scale(1,sy);c.drawImage(sprite,-r,-r,r*2,r*2);c.restore();
  }
  function twinkle(x,y,r,color='#fff6c9',rot=0){c.save();c.translate(x,y);c.rotate(rot);c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.3:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fillStyle=color;c.fill();c.restore();}
  function heartPath(s){c.moveTo(0,s*.85);c.bezierCurveTo(-s*1.25,0,-s*.7,-s*1.05,0,-s*.38);c.bezierCurveTo(s*.7,-s*1.05,s*1.25,0,0,s*.85);c.closePath();}
  function groundShadow(x,y,rx,alpha=.35){c.save();c.globalAlpha=alpha;c.fillStyle='#120a1e';c.beginPath();ell(x,y,rx,rx*.2);c.fill();c.restore();}
  function overlays(){
    c.drawImage(layer('vignette',420,640,()=>{const g=c.createRadialGradient(210,330,160,210,330,470);g.addColorStop(0,'rgba(22,10,36,0)');g.addColorStop(1,'rgba(22,10,36,.6)');c.fillStyle=g;c.fillRect(0,0,420,640);}),0,0);
    c.drawImage(layer('grain',420,640,()=>{let s=4242;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;for(let i=0;i<2400;i++){c.fillStyle=r()<.5?'rgba(255,244,214,.06)':'rgba(10,6,20,.08)';c.fillRect(r()*420,r()*640,1+r()*2.5,1);}}),0,0);
  }

  // The SAM cutout becomes a die-cut vinyl sticker: cream rim, inked edge and
  // a soft drop shadow are baked once per sprite; the real sprite is always
  // drawn on top so the uploaded character stays the visual star.
  const stickers=new WeakMap();
  function sticker(im,R=240){
    const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;if(!w||!h)return null;
    let set=stickers.get(im);if(!set){set={};stickers.set(im,set);}
    if(set[R])return set[R];
    const k=R/Math.max(w,h),sw=Math.max(1,Math.round(w*k)),sh=Math.max(1,Math.round(h*k));
    const rim=Math.max(3,Math.round(R*.035)),line=Math.max(2,Math.round(R*.014)),drop=Math.max(2,Math.round(R*.03)),pad=rim+line+drop+2;
    const make=()=>{const v=document.createElement('canvas');v.width=sw+pad*2;v.height=sh+pad*2;return v;};
    const back=make(),tmp=make(),sil=make(),g=back.getContext('2d'),t=tmp.getContext('2d'),s=sil.getContext('2d');
    const stamp=(r,color)=>{t.clearRect(0,0,tmp.width,tmp.height);t.globalCompositeOperation='source-over';
      for(let i=0;i<16;i++){const a=i*TAU/16;t.drawImage(im,pad+Math.cos(a)*r,pad+Math.sin(a)*r,sw,sh);}
      t.globalCompositeOperation='source-in';t.fillStyle=color;t.fillRect(0,0,tmp.width,tmp.height);t.globalCompositeOperation='source-over';};
    stamp(rim+line,INK);g.globalAlpha=.4;g.drawImage(tmp,drop*.6,drop);g.globalAlpha=1;g.drawImage(tmp,0,0);
    stamp(rim,'#fff6dc');g.drawImage(tmp,0,0);
    s.drawImage(im,pad,pad,sw,sh);s.globalCompositeOperation='source-in';s.fillStyle='#8dffe1';s.fillRect(0,0,sil.width,sil.height);
    return set[R]={back,sil,pad,k};
  }
  function drawThing(x,y,size=74,rot=0,glow=false,o={}){
    c.save();c.translate(x,y);
    if(o.along){c.rotate(o.along);c.scale(o.sx||1,o.sy||1);c.rotate(rot-o.along);}else{c.rotate(rot);c.scale(o.sx||1,o.sy||1);}
    if (state.cutout && state.photo) {
      const im = state.photo;
      const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      const fit = Math.min(size * 1.15 / w, size * 1.15 / h),dw=w*fit,dh=h*fit,st=sticker(im);
      if(glow)glowAt(0,0,size*.95,'255,236,160',.5);
      if(st){const q=fit/st.k;c.drawImage(st.back,-dw/2-st.pad*q,-dh/2-st.pad*q,st.back.width*q,st.back.height*q);}
      c.drawImage(im, -dw/2, -dh/2, dw, dh);
      if(st&&o.reveal!==undefined&&o.reveal<1){const q=fit/st.k;c.globalAlpha=1-o.reveal;c.drawImage(st.sil,-dw/2-st.pad*q,-dh/2-st.pad*q,st.sil.width*q,st.sil.height*q);}
      c.restore();
      return;
    }
    if(glow)glowAt(0,0,size*.95,'255,236,160',.45);
    c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(5,8,size*.55,size*.55,0,0,TAU);c.fill();
    path([[-size*.53,-size*.47],[size*.43,-size*.54],[size*.56,-size*.38],[size*.51,size*.46],[-size*.45,size*.55],[-size*.57,size*.35]],'#fff5cb','#181327',5);
    const v=size*.48;
    c.save();c.beginPath();c.roundRect(-v,-v,v*2,v*2,7);c.clip();
    if(state.photo){const im=state.photo;const source=Math.min(im.naturalWidth,im.naturalHeight),sx=(im.naturalWidth-source)/2,sy=(im.naturalHeight-source)/2;c.drawImage(im,sx,sy,source,source,-v,-v,v*2,v*2);}else{
      const gradient=c.createLinearGradient(-v,-v,v,v);gradient.addColorStop(0,'#ffba4d');gradient.addColorStop(1,'#fc597b');c.fillStyle=gradient;c.fillRect(-v,-v,v*2,v*2);
      circ(-v*.28,-v*.2,v*.19,'#fdf6d0',null);circ(v*.27,-v*.2,v*.19,'#fdf6d0',null);
      circ(-v*.26,-v*.15,v*.08,'#111323',null);circ(v*.27,-v*.15,v*.08,'#111323',null);
      c.beginPath();c.arc(0,v*.23,v*.3,.1,Math.PI-.1);c.lineWidth=4;c.strokeStyle='#171322';c.stroke();
      c.fillStyle='#fff3b9';c.font=`900 ${size*.18}px system-ui`;c.textAlign='center';c.fillText('?!',0,v*.78);
    }
    c.restore();c.restore();
  }
  function drawBackground(top,bottom,detail){
    c.drawImage(layer(`bg${top}${bottom}${detail}`,420,640,()=>{
      const g=c.createLinearGradient(0,0,0,640);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,420,640);
      c.globalAlpha=.10;for(let x=10;x<420;x+=22)for(let y=35;y<620;y+=22)circ(x+((y%44)?4:0),y,1.6,detail,null);c.globalAlpha=1;
    }),0,0);
  }
  function titleBanner(label,sub,accent){
    cut(()=>c.roundRect(11,12,398,53,7),'#1d1834',INK,3,4);
    rect(14,15,9,47,accent,null,0,2);
    for(let i=0;i<6;i++)circ(398,20+i*8,1.6,'#3a3157',null);
    txt(label,34,35,26,'#fff2c7','left');txt(sub,390,52,10,accent,'right',null,900);
  }
  function timerBar(){
    const s=stages[state.round],p=clamp(state.remaining/s.seconds,0,1),fill=p<.25?'#fb567d':'#fbed78';
    cut(()=>c.roundRect(17,73,386,23,4),'#151322','#0c0b13',2,3);
    if(p>0){
      rect(21,77,378*p,15,fill,null,0,2);
      c.save();c.beginPath();c.roundRect(21,77,378*p,15,2);c.clip();c.fillStyle='rgba(255,255,255,.22)';
      const off=(state.playTime*24)%18;for(let x=21-18+off;x<21+378*p;x+=18){c.beginPath();poly([[x,92],[x+8,92],[x+17,77],[x+9,77]]);c.fill();}
      c.restore();
    }
    txt(`${state.remaining.toFixed(1)}s`,210,84,11,'#111225','center',null,1000);
    txt(`SCORE ${state.score.toString().padStart(4,'0')}`,18,111,13,'#fff4bb','left','#1c1930');
    txt(`0${state.round+1}/03`,401,111,13,'#fff4bb','right','#1c1930');
  }

  // ── 01 WRECK IT · a haunted paper diorama ───────────────────────────
  function deadTree(x,y,h,col){
    c.strokeStyle=col;c.lineCap='round';
    const br=(x,y,a,len,w,d)=>{if(d>3||len<3)return;const x2=x+Math.sin(a)*len,y2=y-Math.cos(a)*len;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();br(x2,y2,a-.6,len*.68,w*.62,d+1);br(x2,y2,a+.45,len*.6,w*.62,d+1);};
    br(x,y,.06,h*.42,Math.max(2,h*.09),0);
  }
  // Atmosphere palettes: 'haunted_moon' is the original art pass, unchanged.
  const WRECK_SKIES={
    haunted_moon:{key:'wreckBg',sky:['#1b1536','#432a5c','#8c4567','#b65a6e'],star:'#fff1c4',glow:'255,226,160',moon:'#fbe8b4',shade:'#f0d397',crater:['#e5c486','#f3daa4'],rim:'#e7c584',hill:'#3a2552',tree:'#2a1a40',near:'#2c1d44'},
    toxic_moon:{key:'wreckBg:toxic',sky:['#0b1822','#173a3c','#3c6a48','#86a24e'],star:'#e8ffd0',glow:'190,255,150',moon:'#e6ffb4',shade:'#c4ec86',crater:['#a9d26c','#d2f59a'],rim:'#acd66a',hill:'#1d3734',tree:'#112622',near:'#142c29'}
  };
  function wreckBackdrop(pal=WRECK_SKIES.haunted_moon){
    return layer(pal.key,420,640,()=>{
      const g=c.createLinearGradient(0,100,0,500);g.addColorStop(0,pal.sky[0]);g.addColorStop(.5,pal.sky[1]);g.addColorStop(.85,pal.sky[2]);g.addColorStop(1,pal.sky[3]);
      c.fillStyle=g;c.fillRect(0,0,420,640);
      let s=31;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
      for(let i=0;i<60;i++){c.globalAlpha=.2+r()*.6;circ(r()*420,100+r()*280,.6+r()*1.3,pal.star,null);}
      c.globalAlpha=1;
      glowAt(338,214,175,pal.glow,.5);
      circ(338,214,74,pal.moon,null);
      c.save();c.beginPath();ell(338,214,74,74);c.clip();circ(372,236,72,pal.shade,null);c.restore();
      for(const[x,y,rr]of[[310,186,13],[356,244,15],[352,178,7],[318,250,8],[378,202,6],[300,222,5]]){circ(x,y,rr,pal.crater[0],null);circ(x-1.5,y-1.5,rr*.72,pal.crater[1],null);}
      c.lineWidth=3;c.strokeStyle=pal.rim;c.beginPath();ell(338,214,74,74);c.stroke();
      cutPoly([[0,420],[38,398],[92,410],[140,386],[196,404],[250,394],[316,408],[372,392],[420,402],[420,520],[0,520]],pal.hill,null,0,0);
      deadTree(42,404,64,pal.tree);deadTree(150,390,48,pal.tree);deadTree(396,398,58,pal.tree);
      cutPoly([[214,402],[214,382],[226,370],[238,382],[238,402]],pal.tree,null,0,0);
      stroke([[226,370],[226,356]],pal.tree,2);stroke([[221,361],[231,361]],pal.tree,2);
      circ(226,388,2.5,'#ffd976',null);
      cutPoly([[0,452],[60,436],[130,450],[205,434],[280,446],[350,436],[420,444],[420,560],[0,560]],pal.near,null,0,0);
    });
  }
  function wreckGround(){
    return layer('wreckGround',420,640,()=>{
      cutPoly([[0,488],[60,480],[140,488],[230,476],[300,472],[420,470],[420,640],[0,640]],'#241a37',INK,3,0);
      stroke([[0,494],[60,486],[140,494],[230,482],[300,478],[420,476]],'#3a2a52',3);
      cutPoly([[330,476],[362,476],[396,640],[288,640]],'#2f2445',null,0,0);
      for(let i=0;i<7;i++)stroke([[300+i*4,520+i*18],[312+i*5,520+i*18]],'#3a2d52',2);
    });
  }
  function wreckFront(){
    return layer('wreckFront',420,640,()=>{
      for(const[x,y,w,h,a]of[[34,496,26,36,-.08],[96,500,22,28,.07],[170,492,28,40,-.05],[226,500,18,24,.12]]){
        c.save();c.translate(x,y);c.rotate(a);
        cut(()=>{c.moveTo(-w/2,0);c.lineTo(-w/2,-h+w/2);c.arc(0,-h+w/2,w/2,Math.PI,0);c.lineTo(w/2,0);c.closePath();},'#8f88a8',INK,3,4);
        c.fillStyle='#726b8c';c.fillRect(w/2-6,-h+w/2,4,h-w/2-2);
        txt('RIP',-1,-h*.55,Math.max(7,w*.3),'#3b3552','center',null,900);
        c.restore();
      }
      const fence=(x0,x1)=>{stroke([[x0,488],[x1,486]],INK,3);stroke([[x0,500],[x1,498]],INK,3);
        for(let x=x0;x<=x1;x+=13){const tilt=Math.sin(x*1.7)*2;stroke([[x,506],[x+tilt,478]],INK,3);cutPoly([[x+tilt-3,479],[x+tilt,471],[x+tilt+3,479]],INK,null,0,0);}};
      fence(250,322);fence(372,418);
      for(let i=0;i<16;i++){const x=(i*61+17)%420,y=500+(i*37)%22;cutPoly([[x-5,y],[x-2,y-9],[x,y-2],[x+3,y-11],[x+5,y]],'#3d2c56',null,0,0);}
    });
  }
  function cloud(w,fill='#5a3d7a',lite='#76579a'){
    return layer('cloud'+w+(fill==='#5a3d7a'?'':fill),w+24,w*.55+24,()=>{
      const lobes=[[.2,.62,.19],[.4,.45,.25],[.62,.5,.22],[.82,.64,.16],[.52,.72,.24]];
      c.translate(10,8);
      const each=fn=>{for(const[l,m,r]of lobes){c.beginPath();ell(l*w,m*w*.5,r*w,r*w*.78);fn();}};
      c.save();c.translate(3,5);c.fillStyle='rgba(16,8,30,.3)';each(()=>c.fill());c.restore();
      c.strokeStyle=INK;c.lineWidth=5;each(()=>c.stroke());
      c.fillStyle=fill;each(()=>c.fill());
      c.fillStyle=lite;for(const[l,m,r]of lobes){c.beginPath();ell(l*w-r*w*.18,m*w*.5-r*w*.3,r*w*.55,r*w*.34);c.fill();}
    });
  }
  function bat(x,y,s,flap){
    c.save();c.translate(x,y);c.scale(s,s);
    const wy=-6*flap;
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-8,wy-4,-18,wy);c.lineTo(-14,wy+4);c.lineTo(-10,wy+1);c.lineTo(-7,wy+5);c.quadraticCurveTo(-3,3,0,3);
    c.quadraticCurveTo(3,3,7,wy+5);c.lineTo(10,wy+1);c.lineTo(14,wy+4);c.lineTo(18,wy);c.quadraticCurveTo(8,wy-4,0,0);c.closePath();
    c.fillStyle='#160f26';c.fill();
    circ(0,0,3.5,'#160f26',null);circ(-1.2,-.5,.8,'#ffd976',null);circ(1.2,-.5,.8,'#ffd976',null);
    c.restore();
  }
  function houseWindow(x,y,look,fear,flick){
    glowAt(x,y,40,'255,214,110',.32*flick);
    cut(()=>{c.moveTo(x-13,y+19);c.lineTo(x-13,y-8);c.arc(x,y-8,13,Math.PI,0);c.lineTo(x+13,y+19);c.closePath();},'#5b3f74',INK,3,3);
    c.save();c.beginPath();c.moveTo(x-9,y+15);c.lineTo(x-9,y-8);c.arc(x,y-8,9,Math.PI,0);c.lineTo(x+9,y+15);c.closePath();c.clip();
    c.fillStyle=flick>.9?'#ffe98a':'#ffdc6e';c.fillRect(x-10,y-18,20,34);
    c.fillStyle='rgba(255,160,80,.45)';c.fillRect(x-10,y+5,20,12);
    c.fillStyle='#4a2f5f';c.beginPath();ell(x+look.x*.7,y+8,8.5,11);c.fill();
    const er=fear?2.7:1.9;circ(x-3.2+look.x,y+4+look.y,er,'#fffbe8',null);circ(x+3.2+look.x,y+4+look.y,er,'#fffbe8',null);
    c.restore();
    stroke([[x,y-17],[x,y+15]],INK,2);stroke([[x-9,y],[x+9,y]],INK,2);
  }
  // Ghost cast: each one has a face, a temperament and its own escape route.
  function ghost(x,y,s,t,o={}){
    const tint=o.tint||'#dcfff2',k=o.k===undefined?1:o.k;
    c.save();c.translate(x,y);c.rotate(o.rot||0);c.scale((o.flip?-1:1)*k,(o.sy||1)*k);
    const arm=(side,ang)=>{c.save();c.translate(side*s*.66,s*.08);c.rotate(side*ang);cut(()=>ell(side*s*.14,0,s*.2,s*.11),tint,INK,2.5,0);c.restore();};
    const wav=Math.sin(t*6),face=o.face;
    if(face==='panic'){arm(-1,-1.25+.55*Math.sin(t*22));arm(1,-1.25+.55*Math.sin(t*22+2));}
    else if(face==='grump'){arm(-1,-1.1+.35*Math.sin(t*24));arm(1,1.05);}
    else if(face==='posh'){arm(-1,.45);arm(1,-1.35-o.tip*.08);}
    else if(face==='happy'){arm(-1,.4);arm(1,-1+.5*Math.sin(t*10));}
    else if(face==='dizzy'){arm(-1,.9);arm(1,.9);}
    else{arm(-1,.35+.3*wav);arm(1,.35-.3*wav);}
    const body=()=>{c.moveTo(-s*.74,s*.5);c.lineTo(-s*.76,-s*.1);c.bezierCurveTo(-s*.8,-s*1.02,s*.8,-s*1.02,s*.76,-s*.1);c.lineTo(s*.74,s*.5);
      for(let i=0;i<4;i++){const xa=s*.74-s*.37*i,xb=xa-s*.37;c.quadraticCurveTo((xa+xb)/2,s*(.5+.26*Math.sin(t*7+i*1.9)),xb,s*(.52+.04*Math.sin(t*5+i)));}
      c.closePath();};
    cut(body,tint,INK,3,4);
    c.fillStyle='rgba(255,255,255,.5)';c.beginPath();ell(-s*.38,-s*.55,s*.14,s*.08,-.6);c.fill();
    c.fillStyle='rgba(255,128,170,.75)';c.beginPath();ell(-s*.44,0,s*.12,s*.07);ell(s*.44,0,s*.12,s*.07);c.fill();
    c.fillStyle=INK;c.strokeStyle=INK;c.lineWidth=2.2;c.lineCap='round';
    if(face==='boo'){
      c.beginPath();ell(-s*.24,-s*.24,s*.09,s*.14);ell(s*.24,-s*.24,s*.09,s*.14);c.fill();
      c.beginPath();ell(0,s*.16,s*.15,s*.2*(.85+.15*Math.sin(t*14)));c.fillStyle='#4a1838';c.fill();c.stroke();
      c.beginPath();ell(0,s*.26,s*.08,s*.05);c.fillStyle='#ff6f98';c.fill();
    }else if(face==='panic'){
      for(const e of[-1,1]){circ(e*s*.24,-s*.22,s*.15,'#fff',INK,2);circ(e*s*.24+Math.sin(t*30)*s*.04,-s*.22,s*.05,INK,null);}
      c.beginPath();c.moveTo(-s*.2,s*.18);for(let i=1;i<=6;i++)c.lineTo(-s*.2+i*s*.067,s*(.18+(i%2?-.05:.05)));c.stroke();
      c.fillStyle='#8be9ff';for(let i=0;i<2;i++){const ph=(t*2.2+i*.5)%1;c.globalAlpha=1-ph;c.beginPath();ell(s*(.7+ph*.5),-s*(.6+ph*.2)+i*s*.3,s*.07,s*.11,.5);c.fill();}c.globalAlpha=1;
    }else if(face==='grump'){
      c.beginPath();c.moveTo(-s*.42,-s*.44);c.lineTo(-s*.1,-s*.3);c.moveTo(s*.42,-s*.44);c.lineTo(s*.1,-s*.3);c.lineWidth=3;c.stroke();
      c.beginPath();ell(-s*.24,-s*.18,s*.08,s*.06);ell(s*.24,-s*.18,s*.08,s*.06);c.fill();
      c.beginPath();c.arc(0,s*.3,s*.16,Math.PI*1.15,Math.PI*1.85);c.lineWidth=2.5;c.stroke();
      c.save();c.translate(s*1.0,s*.62);c.rotate(Math.sin(t*9)*.12);
      if(o.costume==='kitchen'){
        // storming out with the leftovers: a wire-handled takeout box
        curve([[-s*.16,-s*.3],[s*.02,-s*.52],[s*.2,-s*.3]],INK,2);
        cutPoly([[-s*.3,-s*.3],[s*.34,-s*.3],[s*.24,s*.16],[-s*.2,s*.16]],'#fff6dc',INK,2.5,3);
        c.fillStyle='#e2464e';c.fillRect(-s*.24,-s*.12,s*.52,s*.08);
      }else{
        stroke([[-s*.08,-s*.24],[-s*.08,-s*.32],[s*.12,-s*.32],[s*.12,-s*.24]],INK,2.5);
        cut(()=>c.roundRect(-s*.26,-s*.24,s*.56,s*.4,s*.06),'#c9765f',INK,2.5,3);
        c.fillStyle='#fdf071';c.fillRect(-s*.2,-s*.14,s*.14,s*.1);c.fillStyle='#7ff2d4';c.fillRect(s*.06,-s*.06,s*.16,s*.1);
      }
      c.restore();
    }else if(face==='posh'){
      circ(-s*.24,-s*.2,s*.07,INK,null);circ(s*.24,-s*.2,s*.07,INK,null);
      c.beginPath();ell(s*.24,-s*.2,s*.15,s*.15);c.strokeStyle='#e6a92e';c.lineWidth=2.5;c.stroke();
      stroke([[s*.38,-s*.14],[s*.48,s*.2]],'#e6a92e',1.5);
      c.beginPath();c.moveTo(0,s*.08);c.bezierCurveTo(-s*.12,s*.0,-s*.3,s*.2,-s*.36,s*.04);c.moveTo(0,s*.08);c.bezierCurveTo(s*.12,s*.0,s*.3,s*.2,s*.36,s*.04);c.strokeStyle=INK;c.lineWidth=3;c.stroke();
      c.save();c.translate(0,-s*.8-o.tip*s*.35);c.rotate(-o.tip*.25);
      if(o.costume==='kitchen')chefToque(s,s*.1);
      else{
        cut(()=>c.roundRect(-s*.5,s*.06,s*1,s*.13,s*.05),'#211a33',INK,2,0);
        cut(()=>c.roundRect(-s*.3,-s*.48,s*.6,s*.56,s*.04),'#211a33',INK,2,0);
        c.fillStyle='#ff5d86';c.fillRect(-s*.3,-s*.06,s*.6,s*.1);
      }
      c.restore();
    }else if(face==='dizzy'){
      for(const e of[-1,1]){c.beginPath();for(let i=0;i<=16;i++){const a=i*.75+t*8*e,r=i/16*s*.13;c.lineTo(e*s*.24+Math.cos(a)*r,-s*.22+Math.sin(a)*r);}c.stroke();}
      c.beginPath();c.arc(0,s*.12,s*.14,.15,Math.PI-.15);c.stroke();
      c.beginPath();ell(s*.06,s*.3,s*.07,s*.1);c.fillStyle='#ff6f98';c.fill();c.stroke();
    }else{
      c.beginPath();c.arc(-s*.24,-s*.16,s*.09,Math.PI*1.1,Math.PI*1.9);c.moveTo(s*.33,-s*.2);c.arc(s*.24,-s*.16,s*.09,Math.PI*1.1,Math.PI*1.9);c.stroke();
      c.beginPath();c.arc(0,s*.08,s*.16,.2,Math.PI-.2);c.stroke();
    }
    if(o.costume==='kitchen'&&face!=='posh'){c.save();c.translate(s*.08,-s*.74);c.rotate(.12);chefToque(s*.8,0);c.restore();}
    c.restore();
    if(face==='dizzy'&&o.stars)for(let i=0;i<3;i++){const a=t*5+i*TAU/3;twinkle(x+Math.cos(a)*s*.9,y-s*.95+Math.sin(a)*s*.25,s*.2,i%2?'#fdf071':'#fff6c9',a);}
  }
  const GHOSTS=[
    {t0:.06,face:'dizzy',s:27,tint:'#e6fff4',path:u=>{const land=.99;if(u<land)return{x:312-110*u,y:300-170*u+330*u*u,rot:u*9};const v=u-land;return{x:203,y:450-Math.abs(Math.sin(v*7))*7*Math.exp(-v*3),rot:.18*Math.sin(v*5),stars:true};}},
    {t0:.10,face:'boo',s:31,tint:'#dcfff2',trail:true,path:u=>({x:346-130*u+50*Math.sin(u*6.5),y:300-150*u-50*(1-Math.cos(u*6.5)),rot:.25*Math.sin(u*6.5),sy:1.1})},
    {t0:.18,face:'panic',s:21,tint:'#f1eaff',trail:true,flip:true,path:u=>({x:319-230*u,y:353-40*u+18*Math.sin(u*24)*Math.min(1,u*4),rot:.3*Math.sin(u*24)})},
    {t0:.30,face:'posh',s:28,tint:'#fff6dc',path:u=>({x:373+12*Math.sin(u*2.2)-10*u,y:353-95*u,rot:.08*Math.sin(u*2.2),tip:Math.max(0,Math.sin(u*3.2-1))})},
    {t0:.40,face:'happy',s:17,twins:true,path:u=>({x:346-50*u,y:292-105*u})},
    {t0:.55,face:'grump',s:35,tint:'#d7f3ff',flip:true,path:u=>({x:346-95*u,y:432+5*Math.sin(u*9),rot:.06*Math.sin(u*9)})}
  ];
  // Same cast, same schedule; a costume only re-dresses them for the set.
  const KITCHEN_TINT={dizzy:'#fff3d6',boo:'#e8fbff',panic:'#ffe6ef',posh:'#fff8e8',grump:'#eef8e2'};
  function chefToque(s,y){
    const puffs=[[-s*.2,y-s*.28,s*.19],[0,y-s*.4,s*.23],[s*.2,y-s*.28,s*.19]];
    c.strokeStyle=INK;c.lineWidth=4;for(const[x,yy,r]of puffs){c.beginPath();ell(x,yy,r,r);c.stroke();}
    c.fillStyle='#fffdf4';for(const[x,yy,r]of puffs){c.beginPath();ell(x,yy,r,r);c.fill();}
    stroke([[-s*.06,y-s*.14],[-s*.04,y-s*.34]],'#d9d2c0',1.5);stroke([[s*.1,y-s*.14],[s*.08,y-s*.3]],'#d9d2c0',1.5);
    cut(()=>c.roundRect(-s*.3,y-s*.14,s*.6,s*.18,s*.04),'#fffdf4',INK,2,0);
  }
  function ghostParade(t,costume=null){
    const dress=g=>costume==='kitchen'?{costume,tint:KITCHEN_TINT[g.face]||g.tint}:{};
    for(const g of GHOSTS){
      const u=t-g.t0;if(u<0)continue;
      const k=reducedMotion?clamp(u/.2,0,1):ease.back(u/.24),q=g.path(u);
      if(q.y<-40||q.x<-40||q.x>460)continue;
      if(g.face==='grump'||(g.face==='dizzy'&&u>.9))groundShadow(q.x,470,g.s*.7,.3);
      if(g.trail&&!reducedMotion)for(let e=2;e>0;e--){const p=g.path(Math.max(0,u-e*.05));c.save();c.globalAlpha=.16*(3-e);ghost(p.x,p.y,g.s,t,{...g,...p,k,...dress(g)});c.restore();}
      if(g.twins){const a=u*8;for(const side of(Math.sin(a)>0?[-1,1]:[1,-1]))ghost(q.x+side*19*Math.cos(a),q.y+side*8*Math.sin(a),g.s*(1+side*.12*Math.sin(a)),t+side,{face:'happy',tint:side>0?'#fff0f6':'#e6fff4',k,flip:side>0,costume});}
      else ghost(q.x,q.y,g.s,t+g.t0*9,{...g,...q,k,...dress(g)});
    }
  }
  function ballPose(){
    const w=state.wreck,t=w.hit?(state.aftermath?.time||0):0;
    const a=w.hit?.24+.08*Math.cos(t*11)*Math.exp(-t*3.2):w.angle;
    return {a,t,x:210+Math.sin(a)*190,y:139+Math.cos(a)*190};
  }
  function spookyHouse(ball){
    const w=state.wreck,hit=w.hit,t=ball.t,p=ease.out(w.damage),pt=state.playTime;
    const near=!hit&&w.launched?ease.inOut((w.angle+.4)/.7):0,fear=!hit&&(state.dragging||w.launched);
    const jx=state.dragging&&!reducedMotion?Math.sin(pt*55)*1.1:0;
    const flick=.86+.14*Math.sin(pt*2.3)*Math.sin(pt*3.7);
    const look=x=>{const dx=ball.x-x,dy=ball.y-353,d=Math.hypot(dx,dy)||1;return{x:dx/d*2.4,y:dy/d*2.4};};
    c.save();c.translate(410,472);c.rotate(near*.05*motion);c.translate(-410+jx,-472);
    glowAt(346,482,90,'255,210,120',.32*(1-p)*flick,.3);
    // tower, behind the main roof: the cone pops off, the body keels over
    c.save();if(hit){c.translate(414,330);c.rotate(p*.5);c.translate(-414,-330+p*40);}
    cutPoly([[380,236],[414,236],[414,340],[380,340]],'#33264e',INK,3,4);
    c.fillStyle='#ffdc6e';c.beginPath();c.roundRect(392,250,10,18,5);c.fill();stroke([[397,250],[397,268]],INK,1.5);
    c.restore();
    const flyer=(ox,oy,vx,vy,spin,grow,draw)=>{const x=ox+vx*t,y=oy+vy*t+520*t*t;if(y>720||x>520||x<-100)return;c.save();c.translate(x,y);c.rotate(spin*t);c.scale(1+grow*t,1+grow*t);c.globalAlpha=clamp(1.7-t,0,1);draw();c.restore();};
    const cone=()=>{cutPoly([[-23,40],[23,40],[0,-50]],'#4e2c4c',INK,3,4);stroke([[0,-50],[0,-66]],INK,2.5);cutPoly([[0,-66],[14,-62],[0,-58]],'#ff5d86',INK,1.5,0);
      for(let i=1;i<4;i++)stroke([[-23+i*4.5,40-i*22],[23-i*4.5,40-i*22]],'#6a3a62',2);};
    if(!hit){c.save();c.translate(397,200);cone();c.restore();}
    const chimney=()=>{cutPoly([[-8,-24],[8,-24],[8,30],[-8,30]],'#7a3f5f',INK,3,3);for(let i=0;i<4;i++)stroke([[-8,-14+i*11],[8,-14+i*11]],'#5b2c47',1.5);cut(()=>c.roundRect(-11,-30,22,8,2),'#5b3149',INK,2.5,0);};
    if(!hit){c.save();c.translate(314,276);chimney();c.restore();
      for(let i=0;i<3;i++){const ph=(pt*.35+i/3)%1;c.globalAlpha=(1-ph)*.55;circ(314+Math.sin(ph*5+i)*7+ph*14,240-ph*60,5+ph*9,'#8a6aa8',null);}c.globalAlpha=1;}
    // side face and crooked front wall; the top edge crumbles down as damage lands
    const sideTop=p*62;
    cutPoly([[396,322+sideTop],[414,332+sideTop*.95],[414,466],[398,472]],'#271d40',INK,3,0);
    const top=[];for(let i=0;i<=6;i++){const kk=i/6,jag=(i%2?9:-5)*p*(i>0&&i<6?1:0);top.push([lerp(296,396,kk)+p*8*(1-kk*.5),lerp(318,322,kk)+p*(96-34*kk)+jag]);}
    const wall=[...top,[398,472],[294,472]];
    cutPoly(wall,'#3b2d58',INK,4,0);
    c.save();c.beginPath();poly(wall);c.clip();
    for(let y=330;y<472;y+=11)stroke([[290,y],[400,y+2]],'#33264f',2);
    stroke([[392,320],[396,472]],'#6f5a96',3);
    c.restore();
    // window "eyes" track the ball and widen with dread
    if(!hit){
      c.save();c.translate(319,353);c.rotate(.32);cutPoly([[-26,-19],[-15,-19],[-15,19],[-26,19]],'#2c2147',INK,2.5,2);c.restore();
      houseWindow(319,353,look(319),fear,flick);houseWindow(373,353,look(373),fear,flick);
    }
    // door mouth: gasps open as the ball approaches, then falls flat on impact
    c.fillStyle='#140d22';c.beginPath();c.moveTo(331,472);c.lineTo(331,427);c.arc(346,427,15,Math.PI,0);c.lineTo(361,472);c.closePath();c.fill();
    const doorFall=hit?ease.bounce((t-.08)/.5):0,ajar=hit?0:fear?.28+near*.3:0;
    c.save();c.translate(331,472);c.rotate(-doorFall*Math.PI/2);c.scale(1-ajar,1);
    cut(()=>{c.moveTo(0,0);c.lineTo(0,-45);c.arc(15,-45,15,Math.PI,0);c.lineTo(30,0);c.closePath();},'#e46a85',INK,3,doorFall>.95?0:3);
    stroke([[8,-8],[8,-36]],'#b84a69',2);stroke([[22,-8],[22,-36]],'#b84a69',2);circ(25,-24,2.6,'#fdf071',INK,1.5);
    c.restore();
    if(!hit){cut(()=>c.roundRect(322,400,48,12,3),'#f8cf85',INK,2,2);txt('NO REFUNDS',346,406,7,'#5b2c47','center',null,900);}
    // the roof pops off like a startled hat and lands on the rubble
    let rx=0,ry=0,rr=0;
    if(hit){const u=clamp(t/.95,0,1);rx=18*ease.out(u);if(u<.42){ry=-90*ease.out(u/.42);rr=.28*u/.42;}else{const v=(u-.42)/.58;ry=-90+240*ease.bounce(v);rr=.28+.32*ease.out(v);}}
    c.save();c.translate(346+rx,224+ry);c.rotate(rr);c.translate(-346,-224);
    cutPoly([[346,224],[408,326],[420,330],[360,228]],'#371f3b',INK,3,0);
    cutPoly([[284,322],[408,326],[346,224]],'#4e2c4c',INK,4,5);
    c.save();c.beginPath();poly([[284,322],[408,326],[346,224]]);c.clip();
    for(let i=1;i<6;i++){const y=224+i*17;for(let x=280+(i%2)*9;x<412;x+=18){c.beginPath();c.arc(x,y,9,0,Math.PI);c.strokeStyle='#3d2140';c.lineWidth=2;c.stroke();}}
    stroke([[286,320],[346,226]],'#7a3f66',3);
    c.restore();
    glowAt(346,292,26,'255,214,110',.5*flick);
    circ(346,292,11,'#ffdc6e',INK,3);stroke([[335,292],[357,292]],INK,2);stroke([[346,281],[346,303]],INK,2);
    c.restore();
    if(hit){
      // rubble heap, planks and bricks
      const h=p;
      cutPoly([[276,476],[292,476-30*h],[312,476-50*h],[334,476-42*h],[356,476-62*h],[380,476-46*h],[402,476-38*h],[420,476]],'#4a3866',INK,3,3);
      if(h>.3){c.save();c.translate(318,450);c.rotate(-.5);cut(()=>c.roundRect(-30,-4,60,8,2),'#5b3f74',INK,2.5,2);c.restore();
        c.save();c.translate(388,446);c.rotate(.7);cut(()=>c.roundRect(-24,-4,48,8,2),'#5b3f74',INK,2.5,2);c.restore();}
      for(let i=0;i<9;i++){const bx=288+i*14,by=476-(20+((i*37)%28))*h+8;c.save();c.translate(bx,by);c.rotate((i*1.3)%1-.5);rect(-6,-3.5,12,7,i%3?'#8a4a66':'#6b3755',INK,1.5,1);c.restore();}
      // flying pieces: windows (lights still on), chimney and turret cone
      flyer(319,353,-150,-260,-5,.5,()=>houseWindow(0,0,{x:0,y:0},true,1));
      flyer(373,353,120,-300,4.4,.3,()=>houseWindow(0,0,{x:0,y:0},true,1));
      flyer(314,276,90,-480,7,0,chimney);
      flyer(397,200,160,-360,3.4,0,cone);
    }
    c.restore();
  }
  function dustPuffs(t){
    if(t<=0)return;
    for(let i=0;i<9;i++){
      const u=(t-i*.04)/1.5;if(u<=0||u>=1)continue;
      const x=262+i*19+Math.sin(i*2.1)*8,r=12+30*ease.out(u),y=470-14*u-(i%3)*10;
      c.save();c.globalAlpha=1-u*u;cut(()=>ell(x,y,r,r*.8),i%2?'#cbb4d9':'#b89fcc',INK,2.5,0);circ(x-r*.25,y-r*.3,r*.35,'rgba(255,246,230,.5)',null);c.restore();
    }
  }
  function impactFx(t){
    const x=305,y=322;
    if(t<.3){const k=t/.3;c.save();c.translate(x,y);c.rotate(.2);c.scale(1+.6*ease.out(k),1+.6*ease.out(k));c.globalAlpha=1-k;
      const burstPts=(r1,r2,n)=>{const v=[];for(let i=0;i<n*2;i++){const a=i*Math.PI/n,r=i%2?r2:r1*(i%4?1:.82);v.push([Math.cos(a)*r,Math.sin(a)*r]);}return v;};
      cutPoly(burstPts(74,34,12),'#fff4b0',INK,3,0);cutPoly(burstPts(44,20,10),'#ff6f98',null,0,0);c.restore();}
    if(t<.6){const k=t/.6;c.save();c.globalAlpha=1-k;c.strokeStyle='#fff3c5';c.lineWidth=4*(1-k)+1;c.beginPath();ell(330,472,30+300*ease.out(k),(30+300*ease.out(k))*.12);c.stroke();c.restore();}
    if(t<.25&&!reducedMotion){c.save();c.globalAlpha=1-t/.25;c.strokeStyle='#fff3c5';c.lineWidth=3;c.lineCap='round';
      for(let i=0;i<10;i++){const a=i*TAU/10+.3,r1=86+t*160,r2=r1+26;c.beginPath();c.moveTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1);c.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2);c.stroke();}c.restore();}
  }
  function saleSign(t){
    const u=t-1.0;if(u<=0)return;
    const k=reducedMotion?clamp(u/.2,0,1):ease.back(u/.35);
    c.save();c.translate(262,474);c.rotate(Math.sin(u*9)*.14*Math.exp(-u*2.5)*motion);c.scale(1,k);
    rect(-3,-48,6,48,'#6a3d2f',INK,2,1);
    cut(()=>c.roundRect(-32,-70,64,28,4),'#fff3c5',INK,3,4);
    txt('FOR SALE',0,-56,10,'#e13668','center',null,1000);
    if(u>.55){const s=reducedMotion?1:1+1.2*(1-ease.out((u-.55)/.16));c.save();c.translate(18,-72);c.rotate(-.28);c.scale(s,s);cut(()=>c.roundRect(-22,-9,44,18,3),'#fdf071',INK,2.5,3);txt('AS IS!',0,0,9,INK,'center',null,1000);c.restore();}
    c.restore();
  }
  function wreckRig(ball){
    const w=state.wreck,pivot={x:210,y:139},pt=state.playTime;
    // toy crane boom
    cut(()=>c.roundRect(-14,119,244,14,3),'#fdf071',INK,3,4);
    c.strokeStyle=INK;c.lineWidth=2;c.beginPath();for(let x=-10;x<226;x+=16){c.moveTo(x,121);c.lineTo(x+8,131);c.lineTo(x+16,121);}c.stroke();
    if(!w.launched&&!w.hit){
      c.save();c.setLineDash([6,9]);c.lineDashOffset=-pt*18;c.beginPath();c.arc(210,139,190,Math.PI*.18,Math.PI*.82);c.strokeStyle='#ffef9b';c.lineWidth=2;c.globalAlpha=.75;c.stroke();c.restore();
      for(let i=0;i<3;i++){const ph=(pt*.6+i/3)%1,a=Math.PI*(.78-ph*.55);twinkle(210+Math.cos(a)*190,139+Math.sin(a)*190,3+2*Math.sin(ph*Math.PI),'#fff3b8');}
    }
    if(w.launched&&!w.hit&&Math.abs(w.omega)>1.1&&!reducedMotion){
      const th=Math.PI/2-ball.a,sweep=clamp(Math.abs(w.omega)*.12,0,.5)*Math.sign(w.omega);
      c.save();c.lineCap='round';c.strokeStyle='#fff3c5';
      for(const[dr,wd,al]of[[-34,3,.35],[0,5,.5],[34,3,.35]]){c.globalAlpha=al;c.lineWidth=wd;c.beginPath();c.arc(210,139,190+dr,Math.min(th,th+sweep),Math.max(th,th+sweep));c.stroke();}
      c.restore();
    }
    // chain links from pulley to ball
    const dx=ball.x-pivot.x,dy=ball.y-pivot.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);
    c.save();c.translate(pivot.x,pivot.y);c.rotate(ang);
    for(let d=8,i=0;d<len-24;d+=10,i++){c.beginPath();ell(d,0,6,i%2?3.2:1.6);c.fillStyle='#d9d0e2';c.fill();c.lineWidth=1.5;c.strokeStyle=INK;c.stroke();}
    c.restore();
    cut(()=>c.roundRect(198,128,24,16,4),'#ff5d86',INK,3,3);circ(210,139,4,'#fdf071',INK,2);
    const wreckScale=activePlan.round_modifiers?.round1_wreck?.wreck_scale||1.0,size=89*wreckScale;
    let o={};
    if(w.hit){const e=Math.exp(-ball.t*8)*Math.cos(ball.t*26)*motion;o={sx:1-.24*e,sy:1+.16*e};}
    else if(w.launched){const s=clamp(Math.abs(w.omega)*.035,0,.16)*motion;o={along:-ball.a,sx:1+s,sy:1-s*.7};}
    else if(state.dragging){o={sx:1-.04*Math.sin(pt*18)*motion,sy:1+.04*Math.sin(pt*18)*motion};}
    drawThing(ball.x,ball.y,size,ball.a*.3+(w.hit?.12:0),true,o);
  }
  // The renderer walks the recipe slot by slot; the draw order is exactly the
  // original art pass (sky, fx, ground, fx, set, payoff, fx, props, rig).
  function drawWreck(preview=false){
    const w=state.wreck,pt=state.playTime,ball=ballPose(),t=ball.t;
    const r=stageMachine.recipes.wreck,set=WRECK_SETS[r.set]||WRECK_SETS.haunted_house,fx=WRECK_FX[r.fx]||WRECK_FX.fog_bats;
    slotIn('atmosphere',()=>c.drawImage((WRECK_ATMOS[r.atmosphere]||WRECK_ATMOS.haunted_moon)(),0,0));
    slotIn('fx',()=>fx.back(pt,w,t));
    slotIn('set',()=>c.drawImage(set.ground(),0,0));
    slotIn('fx',()=>fx.mid(pt));
    slotIn('set',()=>set.draw(ball));
    if(w.hit){impactFx(t);dustPuffs(t-.04);set.sign(t);ghostParade(t,set.costume);}
    slotIn('fx',()=>fx.front(pt));
    slotIn('props',()=>(WRECK_PROPS[r.props]||WRECK_PROPS.graveyard)(ball));
    slotIn('props',()=>wreckRig(ball));
    if(preview)return;
    if(!w.launched&&!w.hit){
      txt(state.dragging?'RELEASE!':'PULL LEFT, THEN LET GO!',210,541,20,'#fff0ab');
    }else if(w.hit){
      if(t>.65){
        const k=reducedMotion?1:ease.back((t-.65)/.32);
        c.save();c.translate(210,520);c.rotate(-.02);c.scale(k,k);
        cut(()=>c.roundRect(-188,-45,376,90,10),'#1d1733','#9bffe2',3,6);
        circ(-188,0,9,'#241a37',null);circ(188,0,9,'#241a37',null);
        const word=propSignature().word;
        twinkle(-120,-19,9,'#ff5d86',pt);twinkle(120,-19,9,'#ff5d86',-pt);
        txt(word,0,-19,30,'#fdf071');
        const label=(activePlan.selected_object?.label||state.photoLabel).toUpperCase();
        const line=`${label.length>22?label.slice(0,21)+'…':label}: ${set.verdict}`;
        txt(line,0,13,Math.min(15,330/(line.length*.65)),'#9bffe2');
        c.restore();
      }
    }
    else txt('HERE COMES TROUBLE...',210,552,15,'#fff0ab');
  }

  // ── Stage Machine v1 · hand-painted slot modules ─────────────────────
  // A recipe only names these. None of them reads or writes gameplay state
  // beyond what the original set already looked at (ball pose, drag, hit),
  // and every set keeps the same impact footprint, so the swing, hit angle,
  // timers and score are identical whichever world is on stage.
  function fogLayer(){return layer('fog',520,70,()=>{for(let i=0;i<14;i++){c.fillStyle='rgba(226,200,240,.09)';c.beginPath();ell(20+i*37,35+Math.sin(i*1.9)*10,48,16);c.fill();}});}
  function steamLayer(){return layer('steamFog',520,70,()=>{for(let i=0;i<14;i++){c.fillStyle='rgba(255,244,228,.08)';c.beginPath();ell(20+i*37,35+Math.cos(i*1.7)*10,52,15);c.fill();}});}
  function drift(im,speed,y,pt){const x=-(pt*speed%520);c.drawImage(im,x,y);c.drawImage(im,x+520,y);}

  // ATMOSPHERE ─ sky, light and weather painted once per module
  function cactus(x,y,h,col){
    c.strokeStyle=col;c.lineCap='round';c.lineJoin='round';
    c.lineWidth=h*.26;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-h);c.stroke();
    c.lineWidth=h*.17;c.beginPath();c.moveTo(x,y-h*.42);c.lineTo(x-h*.34,y-h*.42);c.lineTo(x-h*.34,y-h*.76);c.moveTo(x,y-h*.56);c.lineTo(x+h*.3,y-h*.56);c.lineTo(x+h*.3,y-h*.88);c.stroke();
  }
  function greasySunset(){
    return layer('wreckAtm:greasy_sunset',420,640,()=>{
      const g=c.createLinearGradient(0,90,0,470);
      g.addColorStop(0,'#1e2350');g.addColorStop(.32,'#5b3a85');g.addColorStop(.6,'#d8577c');g.addColorStop(.82,'#ff9a5e');g.addColorStop(1,'#ffd27e');
      c.fillStyle=g;c.fillRect(0,0,420,640);
      let s=57;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
      for(let i=0;i<36;i++){c.globalAlpha=.25+r()*.5;circ(r()*420,96+r()*140,.6+r()*1.1,'#fff1c4',null);}
      c.globalAlpha=1;
      // a retro striped sun sinking behind the mesas
      glowAt(150,378,210,'255,196,120',.6);
      c.save();c.beginPath();ell(150,378,98,98);c.clip();
      const sg=c.createLinearGradient(0,280,0,476);sg.addColorStop(0,'#fff6b0');sg.addColorStop(.5,'#ffbf5e');sg.addColorStop(1,'#ff6f7d');
      c.fillStyle=sg;c.fillRect(50,280,200,200);
      c.fillStyle=g;for(let i=0;i<6;i++)c.fillRect(50,336+i*12,200,2+i*1.6);
      c.restore();
      cutPoly([[0,412],[26,412],[40,376],[98,374],[110,402],[178,404],[198,362],[256,360],[268,394],[332,398],[352,380],[400,380],[412,404],[420,404],[420,520],[0,520]],'#7c3b6f',null,0,0);
      for(const[a,b,y]of[[40,98,376],[198,256,362],[352,400,381]])stroke([[a+3,y+1],[b-3,y]],'#a8568c',3);
      // a sagging phone line and three unimpressed crows
      const poles=[[22,446],[150,442],[284,438]],top=y=>y-104;
      for(const[x,y]of poles){stroke([[x,y],[x,y-112]],'#3a1f45',4);stroke([[x-13,top(y)],[x+13,top(y)]],'#3a1f45',3);circ(x-10,top(y)-3,2,'#3a1f45',null);circ(x+10,top(y)-3,2,'#3a1f45',null);}
      c.strokeStyle='#3a1f45';c.lineWidth=1.5;
      for(let i=0;i<poles.length;i++){const[x1,y1]=poles[i],[x2,y2]=poles[i+1]||[470,430];for(const o of[-10,10]){c.beginPath();c.moveTo(x1+o,top(y1)-3);c.quadraticCurveTo((x1+x2)/2,(top(y1)+top(y2))/2+22,x2+o,top(y2)-3);c.stroke();}}
      for(const u of[.32,.44,.7]){const[x1,y1]=poles[0],[x2,y2]=poles[1],cx=(x1+x2)/2,cy=(top(y1)+top(y2))/2+22,bx=(1-u)*(1-u)*(x1+10)+2*u*(1-u)*cx+u*u*(x2+10),by=(1-u)*(1-u)*(top(y1)-3)+2*u*(1-u)*cy+u*u*(top(y2)-3);
        c.fillStyle='#24142e';c.beginPath();ell(bx,by-5,4.5,5.5);c.fill();circ(bx+2,by-11,3.2,'#24142e',null);cutPoly([[bx+5,by-11.5],[bx+9,by-10.5],[bx+5,by-9.5]],'#ffcd63',null,0,0);circ(bx+2.6,by-11.6,.9,'#ffe9a0',null);}
      cutPoly([[0,448],[70,438],[150,448],[230,434],[310,444],[420,436],[420,560],[0,560]],'#4a2756',null,0,0);
      cactus(72,444,34,'#2f1a3e');cactus(232,438,24,'#2f1a3e');
    });
  }
  function eggMoon(){
    return layer('wreckAtm:egg_moon',420,640,()=>{
      const g=c.createLinearGradient(0,90,0,480);g.addColorStop(0,'#071827');g.addColorStop(.5,'#0f3a4c');g.addColorStop(.85,'#226062');g.addColorStop(1,'#3e8270');
      c.fillStyle=g;c.fillRect(0,0,420,640);
      let s=83;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
      for(let i=0;i<70;i++){c.globalAlpha=.2+r()*.6;circ(r()*420,100+r()*260,.6+r()*1.2,'#e9fff6',null);}
      c.globalAlpha=1;
      // tonight's moon is served sunny-side up
      glowAt(316,206,175,'255,244,200',.42);
      const white=()=>{for(let i=0;i<=30;i++){const a=i/30*TAU,rr=60+7*Math.sin(a*3+.5)+4*Math.sin(a*5+2),x=316+Math.cos(a)*rr,y=206+Math.sin(a)*rr*.94;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();};
      c.beginPath();white();c.fillStyle='#fbf6e8';c.fill();
      c.save();c.beginPath();white();c.clip();c.strokeStyle='rgba(196,140,70,.5)';c.lineWidth=9;c.beginPath();white();c.stroke();c.restore();
      c.lineWidth=2.5;c.strokeStyle='#e2d3ae';c.beginPath();white();c.stroke();
      glowAt(326,212,44,'255,200,80',.5);
      circ(326,212,27,'#ffc53d','#e89a1c',3);
      c.fillStyle='#fff0a6';c.beginPath();ell(317,203,9,6,-.5);c.fill();
      // sleepy town on the horizon
      for(const[x,w,h]of[[0,50,70],[46,40,98],[84,30,58],[110,46,112],[152,36,76],[184,50,90],[230,34,64]]){
        c.fillStyle='#14243d';c.fillRect(x,430-h,w,h+40);
        for(let wy=430-h+8;wy<422;wy+=11)for(let wx=x+5;wx<x+w-5;wx+=9)if(r()<.32){c.fillStyle=r()<.8?'rgba(255,217,118,.8)':'rgba(127,242,212,.7)';c.fillRect(wx,wy,3.5,5);}
      }
      stroke([[248,404],[256,370]],'#14243d',3);stroke([[280,404],[272,370]],'#14243d',3);
      cut(()=>c.roundRect(244,340,40,32,4),'#14243d',null,0,0);cutPoly([[240,342],[288,342],[264,322]],'#14243d',null,0,0);
      cutPoly([[0,446],[60,436],[130,448],[205,432],[280,444],[350,434],[420,442],[420,560],[0,560]],'#102a36',null,0,0);
    });
  }
  const WRECK_ATMOS={
    haunted_moon:()=>wreckBackdrop(WRECK_SKIES.haunted_moon),
    toxic_moon:()=>wreckBackdrop(WRECK_SKIES.toxic_moon),
    greasy_sunset:greasySunset,
    egg_moon:eggMoon
  };

  // SET ─ THE CURSED DINER: a crooked roadside railcar diner, same footprint
  // and the same swing as the house, with its own way of falling apart.
  function dinerGround(){
    return layer('wreckSet:diner_ground',420,640,()=>{
      cutPoly([[0,488],[60,480],[140,488],[230,476],[300,472],[420,470],[420,640],[0,640]],'#2b2b3f',INK,3,0);
      stroke([[0,494],[60,486],[140,494],[230,482],[300,478],[420,476]],'#41415c',3);
      c.save();c.beginPath();poly([[262,478],[420,474],[420,506],[250,512]]);c.clip();
      for(let row=0;row<4;row++)for(let col=0;col<17;col++){c.fillStyle=(row+col)%2?'#efe6d2':'#22202f';c.fillRect(246+col*11-row*4,474+row*10,11,10);}
      c.restore();
      stroke([[262,478],[420,474]],INK,2);stroke([[250,512],[420,506]],INK,2.5);
      c.save();c.globalAlpha=.7;for(let i=0;i<4;i++){const x=20+i*64;stroke([[x,604],[x+30,522]],'#e8c547',4);}c.restore();
      for(const pts of[[[40,560],[58,572],[52,590],[70,604]],[[180,530],[196,540],[214,536]],[[300,600],[322,590],[330,612]]])stroke(pts,'#1a1a28',2);
      cut(()=>c.roundRect(102,558,56,16,3),'#4a4a66',INK,2.5,2);
      for(let x=108;x<156;x+=6)stroke([[x,561],[x,571]],'#24243a',2);
    });
  }
  function dinerWindow(x,y,w,h,look,fear,flick,kind){
    glowAt(x+w/2,y+h/2,w*1.1,'255,214,140',.3*flick);
    cut(()=>c.roundRect(x-4,y-4,w+8,h+8,8),'#c9d0dc',INK,3,3);
    c.save();c.beginPath();c.roundRect(x,y,w,h,5);c.clip();
    const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,flick>.9?'#fff3b8':'#ffe49a');g.addColorStop(1,'#ffab6b');c.fillStyle=g;c.fillRect(x,y,w,h);
    const cx=x+w/2;
    stroke([[cx,y],[cx,y+h*.16]],'rgba(70,30,50,.6)',1.5);
    c.fillStyle='rgba(70,30,50,.6)';c.beginPath();poly([[cx-6,y+h*.25],[cx+6,y+h*.25],[cx+3,y+h*.16],[cx-3,y+h*.16]]);c.fill();
    if(kind==='eyes'){
      // a short-order spirit peeking over the counter, toque and all
      const sx=cx+look.x*.8;
      c.fillStyle='rgba(84,40,72,.72)';c.beginPath();ell(sx,y+h*.64,w*.27,h*.3);c.fill();
      c.beginPath();ell(sx-w*.1,y+h*.34,w*.11,h*.09);ell(sx+w*.1,y+h*.34,w*.11,h*.09);ell(sx,y+h*.3,w*.13,h*.1);c.fill();
      const er=fear?2.8:2;circ(sx-4+look.x*.4,y+h*.58+look.y*.6,er,'#fffbe8',null);circ(sx+4+look.x*.4,y+h*.58+look.y*.6,er,'#fffbe8',null);
    }else{
      // a pie under a glass cloche, one slice already missing
      const py=y+h*.66;
      c.fillStyle='rgba(84,40,72,.6)';c.fillRect(cx-1.5,py,3,h*.12);c.beginPath();ell(cx,py,w*.3,2.4);c.fill();
      c.fillStyle='#d98a4a';c.beginPath();c.moveTo(cx,py-1);c.ellipse(cx,py-1,w*.24,5,0,Math.PI*.15,Math.PI*1.75,false);c.closePath();c.fill();
      c.beginPath();c.arc(cx,py-1,w*.3,Math.PI,TAU);c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1.5;c.stroke();
    }
    c.fillStyle='rgba(120,46,62,.62)';c.fillRect(x,y+h*.8,w,h*.2);
    c.fillStyle='rgba(255,255,255,.28)';c.beginPath();poly([[x+w*.12,y+h],[x+w*.36,y+h],[x+w*.86,y],[x+w*.62,y]]);c.fill();
    c.restore();
  }
  function eatSign(pt,dead,flick){
    cutPoly([[330,152],[416,152],[416,206],[330,206],[308,179]],'#2a1f45',INK,4,5);
    const edge=[[333,156],[412,156],[412,202],[333,202],[313,179],[333,156]];let k=0;
    for(let i=0;i<edge.length-1;i++){const[x1,y1]=edge[i],[x2,y2]=edge[i+1],n=Math.max(1,Math.round(Math.hypot(x2-x1,y2-y1)/10));
      for(let j=0;j<n;j++,k++){const on=dead?k%5===0:(k+Math.floor(pt*9*motion))%3!==0;circ(lerp(x1,x2,j/n),lerp(y1,y2,j/n),2.4,on?'#fff2a0':'#6a5a40',INK,1);}}
    glowAt(372,180,58,'255,236,120',dead?.08:.32*flick);
    const aLit=!dead&&Math.sin(pt*13)*Math.sin(pt*2.9)>-.55;
    txt('E',346,181,30,dead?'#8a7a52':'#fdf071');txt('A',372,181,30,aLit?'#fdf071':'#5d4a3c');txt('T',398,181,30,dead?'#8a7a52':'#fdf071');
  }
  function dinerStack(){
    cutPoly([[-7,-26],[7,-26],[7,24],[-7,24]],'#b9c1d1',INK,3,3);
    stroke([[-7,-10],[7,-10]],'#7d869c',2);stroke([[-7,6],[7,6]],'#7d869c',2);
    cutPoly([[-14,-26],[14,-26],[9,-36],[-9,-36]],'#8d95a8',INK,2.5,0);
  }
  function cursedDiner(ball){
    const w=state.wreck,hit=w.hit,t=ball.t,p=ease.out(w.damage),pt=state.playTime;
    const near=!hit&&w.launched?ease.inOut((w.angle+.4)/.7):0,fear=!hit&&(state.dragging||w.launched);
    const jx=state.dragging&&!reducedMotion?Math.sin(pt*55)*1.1:0;
    const flick=.86+.14*Math.sin(pt*2.3)*Math.sin(pt*3.7);
    const look=x=>{const dx=ball.x-x,dy=ball.y-368,d=Math.hypot(dx,dy)||1;return{x:dx/d*2.4,y:dy/d*2.4};};
    const flyer=(ox,oy,vx,vy,spin,grow,draw)=>{const x=ox+vx*t,y=oy+vy*t+520*t*t;if(y>720||x>520||x<-100)return;c.save();c.translate(x,y);c.rotate(spin*t);c.scale(1+grow*t,1+grow*t);c.globalAlpha=clamp(1.7-t,0,1);draw();c.restore();};
    c.save();c.translate(410,472);c.rotate(near*.05*motion);c.translate(-410+jx,-472);
    glowAt(350,486,100,'255,93,134',.3*(1-p)*flick,.28);
    // roadside pylon: an EAT arrow whose A keeps getting possessed
    c.save();if(hit){c.translate(404,472);c.rotate(-p*.36);c.translate(-404,-472);}
    cutPoly([[399,200],[409,200],[410,472],[398,472]],'#9aa3b8',INK,3,4);
    for(let y=218;y<470;y+=22)stroke([[399,y],[409,y]],'#6f7890',2);
    eatSign(pt,hit,flick);
    c.restore();
    if(!hit){c.save();c.translate(300,272);dinerStack();c.restore();
      for(let i=0;i<3;i++){const ph=(pt*.4+i/3)%1;c.globalAlpha=(1-ph)*.5;circ(300+Math.sin(ph*5+i)*7+ph*12,232-ph*60,5+ph*10,'#a59a9a',null);}c.globalAlpha=1;}
    // the long enamel body; its top edge crumbles as damage lands
    const top=[];for(let i=0;i<=6;i++){const kk=i/6,jag=(i%2?9:-5)*p*(i>0&&i<6?1:0);top.push([lerp(284,440,kk)+p*8*(1-kk*.5),lerp(330,328,kk)+p*(100-34*kk)+jag]);}
    const wall=[...top,[440,472],[284,472]];
    cutPoly(wall,'#f4e6c4',INK,4,0);
    c.save();c.beginPath();poly(wall);c.clip();
    c.fillStyle='#2fb3a3';c.fillRect(276,334,170,7);
    c.fillStyle='#e2464e';c.fillRect(276,398,170,11);stroke([[276,398],[446,398]],INK,1.5);stroke([[276,409],[446,409]],INK,1.5);
    for(let x=300;x<440;x+=24)stroke([[x,412],[x,440]],'#e0cfa8',2);
    const sk=c.createLinearGradient(0,442,0,472);sk.addColorStop(0,'#eef2f8');sk.addColorStop(.45,'#aab3c6');sk.addColorStop(1,'#7d869c');
    c.fillStyle=sk;c.fillRect(276,442,170,30);
    for(let x=284;x<444;x+=7){stroke([[x,444],[x,472]],'rgba(70,78,100,.55)',1.5);stroke([[x+2,444],[x+2,472]],'rgba(255,255,255,.5)',1);}
    stroke([[276,442],[446,442]],INK,2);
    const sh=c.createLinearGradient(284,0,308,0);sh.addColorStop(0,'rgba(20,10,30,.3)');sh.addColorStop(1,'rgba(20,10,30,0)');c.fillStyle=sh;c.fillRect(276,326,32,146);
    c.restore();
    if(!hit){
      dinerWindow(290,350,34,40,look(307),fear,flick,'eyes');
      dinerWindow(370,350,28,40,look(384),fear,flick,'pie');
      dinerWindow(410,350,30,40,look(425),fear,flick,'eyes');
      // possessed wall clock above the door, running backwards
      cut(()=>ell(346,374,12,12),'#fff6dc',INK,2.5,2);
      const ha=-pt*2.6*motion,ma=-pt*.4*motion;
      stroke([[346,374],[346+Math.sin(ha)*9,374-Math.cos(ha)*9]],INK,1.8);stroke([[346,374],[346+Math.sin(ma)*6,374-Math.cos(ma)*6]],'#e2464e',2.2);circ(346,374,1.8,INK,null);
    }
    // the door gasps open as the ball comes in, then slams flat
    c.fillStyle='#140d22';c.beginPath();c.roundRect(332,414,28,58,[10,10,0,0]);c.fill();
    const doorFall=hit?ease.bounce((t-.08)/.5):0,ajar=hit?0:fear?.28+near*.3:0;
    c.save();c.translate(332,472);c.rotate(-doorFall*Math.PI/2);c.scale(1-ajar,1);
    cut(()=>c.roundRect(0,-58,28,58,[10,10,2,2]),'#2fb3a3',INK,3,doorFall>.95?0:3);
    circ(14,-41,7,'#ffe49a',INK,2);cut(()=>c.roundRect(4,-15,20,11,2),'#c9d0dc',INK,1.5,0);circ(23,-26,2.4,'#fdf071',INK,1.5);
    if(!hit){c.save();c.translate(14,-27);c.rotate(Math.sin(pt*2)*.08*motion);cut(()=>c.roundRect(-11,-5,22,10,2),'#ff5d86',INK,1.5,0);txt('OPEN',0,0,6.5,'#fff6dc','center',null,1000);c.restore();}
    c.restore();
    // barrel roof + neon script pop off together like a can lid
    let rx=0,ry=0,rr=0;
    if(hit){const u=clamp(t/.95,0,1);rx=18*ease.out(u);if(u<.42){ry=-90*ease.out(u/.42);rr=.28*u/.42;}else{const v=(u-.42)/.58;ry=-90+240*ease.bounce(v);rr=.28+.32*ease.out(v);}}
    c.save();c.translate(360+rx,316+ry);c.rotate(rr);c.translate(-360,-316);
    stroke([[330,297],[414,297]],'#c9d0dc',3);for(const x of[338,372,406])stroke([[x,297],[x,304]],'#c9d0dc',3);
    glowAt(372,278,72,'255,93,134',hit?.12:.42*flick,.5);
    for(let i=0;i<5;i++){const lit=!hit&&(i!==2||Math.sin(pt*17)*Math.sin(pt*3.1)>-.4);txt('DINER'[i],340+i*16,279,23,lit?'#ffe1ea':'#7a3550','center',lit?'#ff5d86':INK);}
    const cap=()=>{c.moveTo(270,336);c.quadraticCurveTo(268,304,300,302);c.lineTo(446,302);c.lineTo(446,336);c.closePath();};
    cut(cap,'#d63e4f',INK,4,5);
    c.save();c.beginPath();cap();c.clip();
    for(let x=306;x<446;x+=13)stroke([[x,305],[x,331]],'#a92c3c',2);
    stroke([[276,320],[300,307],[446,307]],'rgba(255,170,170,.7)',3);
    c.fillStyle='#c9d0dc';c.fillRect(266,330,182,6);stroke([[266,330],[448,330]],INK,1.5);
    c.restore();
    c.restore();
    if(hit){
      const h=p;
      cutPoly([[274,476],[290,476-32*h],[312,476-52*h],[334,476-40*h],[356,476-60*h],[380,476-48*h],[402,476-36*h],[420,476]],'#d9cba8',INK,3,3);
      if(h>.3){c.save();c.translate(318,452);c.rotate(-.42);cut(()=>c.roundRect(-30,-5,60,10,2),'#e2464e',INK,2.5,2);c.restore();
        c.save();c.translate(388,448);c.rotate(.62);cut(()=>c.roundRect(-26,-4,52,8,2),'#c9d0dc',INK,2.5,2);c.restore();}
      // plates and mugs instead of bricks
      for(let i=0;i<8;i++){const bx=290+i*16,by=476-(22+((i*37)%26))*h+8;c.save();c.translate(bx,by);c.rotate((i*1.3)%1-.5);
        if(i%3===2){cut(()=>c.roundRect(-5,-6,10,12,2),'#fff6dc',INK,1.5,1);c.beginPath();c.arc(6,0,3.5,-1.2,1.2);c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();}
        else{cut(()=>ell(0,0,8,3.4),'#fff6dc',INK,1.5,1);c.strokeStyle='#2fb3a3';c.lineWidth=1.2;c.beginPath();ell(0,0,5.5,2);c.stroke();}
        c.restore();}
      flyer(307,370,-150,-260,-5,.5,()=>dinerWindow(-17,-20,34,40,{x:0,y:0},true,1,'eyes'));
      flyer(384,370,120,-300,4.4,.3,()=>dinerWindow(-14,-20,28,40,{x:0,y:0},true,1,'pie'));
      flyer(300,272,90,-480,7,0,dinerStack);
      flyer(346,374,-40,-420,-6,.2,()=>{cut(()=>ell(0,0,12,12),'#fff6dc',INK,2.5,2);stroke([[0,0],[0,-9]],INK,1.8);stroke([[0,0],[6,0]],'#e2464e',2.2);});
    }
    c.restore();
  }
  function closedSign(t){
    const u=t-1.0;if(u<=0)return;
    const k=reducedMotion?clamp(u/.2,0,1):ease.back(u/.35);
    c.save();c.translate(262,474);c.rotate(Math.sin(u*9)*.14*Math.exp(-u*2.5)*motion);c.scale(1,k);
    rect(-3,-48,6,48,'#9aa3b8',INK,2,1);
    cut(()=>c.roundRect(-36,-72,72,30,4),'#e2464e',INK,3,4);
    txt('CLOSED',0,-57,12,'#fff3c5','center',null,1000);
    if(u>.55){const s=reducedMotion?1:1+1.2*(1-ease.out((u-.55)/.16));c.save();c.translate(18,-74);c.rotate(-.28);c.scale(s,s);cut(()=>c.roundRect(-31,-9,62,18,3),'#fdf071',INK,2.5,3);txt("SOUP'S OFF",0,0,8,INK,'center',null,1000);c.restore();}
    c.restore();
  }
  const WRECK_SETS={
    haunted_house:{ground:wreckGround,draw:spookyHouse,sign:saleSign,costume:null,verdict:'GHOST EVICTOR',
      debris:[['brick','#8a4a66',9],['brick','#5b3149',6],['shard','#fff076',8],['shard','#ffe7a8',4]]},
    cursed_diner:{ground:dinerGround,draw:cursedDiner,sign:closedSign,costume:'kitchen',verdict:'KITCHEN EXORCIST',
      debris:[['brick','#e2464e',8],['brick','#f4e6c4',7],['shard','#c9d0dc',8],['shard','#2fb3a3',4]]}
  };

  // PROPS ─ spectators and set dressing. The soup can and the toast react to
  // the swing (look, flinch, leap) but are pure scenery: no hit tests.
  const mood=ball=>({hit:state.wreck.hit,t:ball.t,fear:!state.wreck.hit&&(state.dragging||state.wreck.launched),pt:state.playTime,ball});
  const lookAt=(m,x,y,k)=>{const dx=m.ball.x-x,dy=m.ball.y-y,d=Math.hypot(dx,dy)||1;return{x:dx/d*k,y:dy/d*k};};
  const CAN_W=34,CAN_H=96,CAN_RY=9;
  function canSilhouette(){c.moveTo(-CAN_W,-CAN_H);c.lineTo(-CAN_W,0);c.ellipse(0,0,CAN_W,CAN_RY,0,Math.PI,0,true);c.lineTo(CAN_W,-CAN_H);c.ellipse(0,-CAN_H,CAN_W,CAN_RY,0,0,Math.PI,true);c.closePath();}
  function canBand(a,b){c.moveTo(-CAN_W,a);c.ellipse(0,a,CAN_W,CAN_RY,0,Math.PI,0,true);c.lineTo(CAN_W,b);c.ellipse(0,b,CAN_W,CAN_RY,0,0,Math.PI,false);c.closePath();}
  function soupCanBody(){
    return layer('prop:soupCan',100,140,()=>{
      c.translate(50,126);
      cut(canSilhouette,'#d8394a',INK,3,5);
      c.save();c.beginPath();canSilhouette();c.clip();
      c.beginPath();canBand(-48,-9);c.fillStyle='#f7f0e0';c.fill();
      const metal=c.createLinearGradient(-CAN_W,0,CAN_W,0);
      metal.addColorStop(0,'#5e6476');metal.addColorStop(.26,'#eef2f8');metal.addColorStop(.34,'#ffffff');metal.addColorStop(.56,'#b7bfcd');metal.addColorStop(1,'#565c6e');
      c.fillStyle=metal;c.beginPath();canBand(-CAN_H,-CAN_H+8);c.fill();c.beginPath();canBand(-9,0);c.fill();
      c.lineWidth=1.3;c.strokeStyle='rgba(60,64,84,.8)';
      for(const y of[-CAN_H+4,-CAN_H+8,-9,-4.5]){c.beginPath();c.ellipse(0,y,CAN_W,CAN_RY,0,0,Math.PI,false);c.stroke();}
      c.lineWidth=3.5;c.strokeStyle='#f2c230';c.beginPath();c.ellipse(0,-48,CAN_W,CAN_RY,0,0,Math.PI,false);c.stroke();
      c.save();c.translate(0,-61);c.scale(.94,1);txt('SOUP',0,0,20,'#fff6dc','center',INK);c.restore();
      for(const e of[-1,1]){circ(e*27,-62,3.2,'#f2c230',INK,1);}
      // cylinder shading: dark edges and a crisp specular stripe
      const sh=c.createLinearGradient(-CAN_W,0,CAN_W,0);
      sh.addColorStop(0,'rgba(24,10,34,.5)');sh.addColorStop(.18,'rgba(24,10,34,.06)');sh.addColorStop(.26,'rgba(255,255,255,.42)');sh.addColorStop(.33,'rgba(255,255,255,0)');sh.addColorStop(.72,'rgba(24,10,34,.06)');sh.addColorStop(1,'rgba(24,10,34,.55)');
      c.fillStyle=sh;c.fillRect(-CAN_W-2,-CAN_H-CAN_RY-2,CAN_W*2+4,CAN_H+CAN_RY*2+4);
      c.restore();
      c.lineWidth=3;c.strokeStyle=INK;c.beginPath();canSilhouette();c.stroke();
    });
  }
  function canLid(ry){
    const lid=c.createLinearGradient(-CAN_W,0,CAN_W,0);lid.addColorStop(0,'#9aa1b2');lid.addColorStop(.35,'#f4f6fb');lid.addColorStop(1,'#a3aabb');
    cut(()=>ell(0,0,CAN_W,ry),lid,INK,2.5,0);
    c.lineWidth=1.5;c.strokeStyle='#8d95a8';c.beginPath();ell(0,ry*.06,CAN_W-5,ry*.78);c.stroke();
    c.strokeStyle='#b9c0ce';c.beginPath();ell(0,ry*.1,CAN_W-12,ry*.55);c.stroke();
    c.strokeStyle='#7d869c';c.lineWidth=2;c.beginPath();ell(CAN_W*.3,ry*.15,5.5,Math.max(.5,ry*.27));c.stroke();
  }
  function soupCan(x,y,m){
    const{hit,t,fear,pt}=m;
    const hop=hit?Math.max(0,Math.sin(clamp(t/.55,0,1)*Math.PI))*30*motion:0;
    const sq=hit?.12*Math.exp(-t*6)*Math.cos(t*20)*motion:0;
    const sway=(fear?Math.sin(pt*30)*.035:Math.sin(pt*1.6)*.02)*motion;
    groundShadow(x,y+2,40*(1-hop/90),.35);
    c.save();c.translate(x,y-hop);c.rotate(sway);c.scale(1+sq,1-sq);
    c.drawImage(soupCanBody(),-50,-126);
    // the lid flips open on impact and the alphabet soup panics in print
    const open=hit?ease.back(clamp((t-.05)/.3,0,1)):0;
    if(open>0){cut(()=>ell(0,-CAN_H,CAN_W,CAN_RY),'#c9d0dc',INK,2,0);c.beginPath();ell(0,-CAN_H,CAN_W-3,CAN_RY-1.5);c.fillStyle='#b72d3a';c.fill();c.fillStyle='#e0525c';c.beginPath();ell(-6,-CAN_H-1,CAN_W*.45,CAN_RY*.4);c.fill();}
    const ang=open*1.9;
    c.save();c.translate(0,-CAN_H-CAN_RY);c.translate(0,CAN_RY*Math.cos(ang)-CAN_W*.9*Math.sin(ang));canLid(Math.max(1.5,Math.abs(CAN_RY*Math.cos(ang)+CAN_W*.9*Math.sin(ang))));c.restore();
    if(hit)for(let i=0;i<3;i++){const u=t-.22-i*.13;if(u<=0||u>1.6)continue;c.save();c.globalAlpha=clamp(1.6-u,0,1);txt('OMG'[i],(i-1)*15+Math.sin(u*6+i)*5,-CAN_H-14-u*70,14,'#f7d98a','center',INK);c.restore();}
    // face
    const lk=lookAt(m,x,y-70,2.2),eyeY=-26,er=hit||fear?7.4:6.6;
    for(const e of[-1,1]){circ(e*11,eyeY,er,'#fff',INK,2);circ(e*11+lk.x,eyeY+lk.y,hit?2.2:3,INK,null);circ(e*11+lk.x-1,eyeY+lk.y-1.2,1,'#fff',null);
      const lift=hit?-5:0;stroke(fear?[[e*5,eyeY-12],[e*16,eyeY-8]]:[[e*5,eyeY-9+lift],[e*16,eyeY-11+lift]],INK,2.4);}
    c.fillStyle='rgba(255,128,150,.55)';c.beginPath();ell(-22,-15,5,3);ell(22,-15,5,3);c.fill();
    if(hit){cut(()=>ell(0,-11,6,7.5),'#7a1d2b',INK,2,0);c.fillStyle='#ff7a8a';c.beginPath();ell(0,-7,3.5,2.2);c.fill();}
    else if(fear){c.beginPath();c.moveTo(-7,-12);for(let i=1;i<=6;i++)c.lineTo(-7+i*2.33,-12+(i%2?-2:2));c.strokeStyle=INK;c.lineWidth=2;c.stroke();}
    else{c.beginPath();c.arc(0,-15,6,.25,Math.PI-.25);c.strokeStyle=INK;c.lineWidth=2.2;c.stroke();}
    // noodle arms; the idle one waves a soup spoon like a pennant
    const wave=Math.sin(pt*4)*4*motion;
    const arms=hit?[[[-34,-44],[-54,-60],[-60,-84]],[[34,-44],[54,-60],[60,-84]]]:fear?[[[-34,-44],[-48,-58],[-44,-78+wave]],[[34,-44],[48,-58],[44,-78-wave]]]:[[[-34,-44],[-44,-34],[-40,-20]],[[34,-44],[46,-56],[48+wave,-74]]];
    for(const a of arms){curve(a,INK,6);curve(a,'#f3d27a',3.2);const h=a[2];circ(h[0],h[1],3.6,'#f3d27a',INK,1.5);}
    if(!hit){const h=arms[1][2];c.save();c.translate(h[0],h[1]);c.rotate(.3+wave*.03);stroke([[0,0],[0,-16]],'#c9d0dc',3);cut(()=>ell(0,-21,4.5,6.5),'#e6eaf2',INK,1.5,0);c.restore();}
    c.restore();
  }
  function toastSlice(){c.moveTo(-26,-3);c.lineTo(-26,-36);c.bezierCurveTo(-38,-40,-37,-64,-16,-62);c.bezierCurveTo(-8,-72,8,-72,16,-62);c.bezierCurveTo(37,-64,38,-40,26,-36);c.lineTo(26,-3);c.quadraticCurveTo(26,1,22,1);c.lineTo(-22,1);c.quadraticCurveTo(-26,1,-26,-3);c.closePath();}
  function toastBody(){
    return layer('prop:toast',96,96,()=>{
      c.translate(48,86);
      cut(toastSlice,'#8a4b24',INK,3,4);
      c.save();c.translate(0,-31);c.scale(.8,.8);c.translate(0,31);
      c.beginPath();toastSlice();
      const g=c.createRadialGradient(-6,-38,3,0,-30,40);g.addColorStop(0,'#6e4426');g.addColorStop(.5,'#3e2616');g.addColorStop(1,'#1e130b');
      c.fillStyle=g;c.fill();c.clip();
      for(const[x,y,rx,ry]of[[-15,-12,9,5],[14,-52,8,4],[17,-14,6,4],[-12,-52,5,3]]){c.fillStyle='rgba(190,120,62,.5)';c.beginPath();ell(x,y,rx,ry,.3);c.fill();}
      let s=919;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
      for(let i=0;i<7;i++){const cx=-20+r()*40,cy=-62+r()*58;c.fillStyle='rgba(10,6,4,.6)';c.beginPath();for(let k=0;k<7;k++){const a=k/7*TAU,rr=3+r()*5;k?c.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr):c.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}c.closePath();c.fill();}
      for(let i=0;i<46;i++){c.fillStyle=r()<.5?'rgba(150,94,52,.75)':'rgba(8,5,3,.5)';c.fillRect(-24+r()*48,-68+r()*66,1.5,1.5);}
      c.restore();
      c.strokeStyle='rgba(214,150,92,.85)';c.lineWidth=2.5;c.lineCap='round';
      c.beginPath();c.moveTo(-30,-44);c.bezierCurveTo(-34,-58,-26,-63,-17,-62);c.stroke();
      c.beginPath();c.moveTo(-8,-68);c.quadraticCurveTo(0,-70,8,-68);c.stroke();
    });
  }
  function crumbs(x,y){for(const[dx,dy,rr]of[[-30,0,2.4],[-24,3,1.7],[27,1,2.2],[34,3,1.5],[19,4,1.9],[-16,5,1.4],[42,0,1.2]]){c.fillStyle=rr>1.8?'#a8693a':'#5c3a22';c.beginPath();poly([[x+dx-rr,y+dy],[x+dx,y+dy-rr],[x+dx+rr,y+dy+.4],[x+dx+.3,y+dy+rr]]);c.fill();}}
  function burntToast(x,y,m){
    const{hit,t,fear,pt}=m;
    const k=hit?clamp((t-.04)/.6,0,1):0,pop=Math.sin(k*Math.PI),hop=pop*48*motion;
    const spin=hit&&!reducedMotion?ease.inOut(k)*TAU:0,bob=hit?0:Math.sin(pt*3)*1.5*motion;
    groundShadow(x,y+2,30*(1-pop*.5),.35);crumbs(x,y);
    for(let i=0;i<3;i++){const ph=(pt*.45+i/3)%1;c.globalAlpha=(1-ph)*(hit?.7:.42);circ(x+Math.sin(ph*6+i)*6+ph*8,y-88-ph*46-hop,4+ph*(hit?14:8),'#8f8796',null);}c.globalAlpha=1;
    c.save();c.translate(x,y-16-hop+bob);
    if(spin){c.translate(0,-34);c.rotate(spin);c.translate(0,34);}
    const kick=fear?Math.sin(pt*26)*3*motion:0;
    stroke([[-9,-2],[-10+kick,15]],INK,3);stroke([[9,-2],[10-kick,15]],INK,3);
    cut(()=>ell(-13+kick,16,6,3.2),'#2a1f45',INK,1.5,0);cut(()=>ell(13-kick,16,6,3.2),'#2a1f45',INK,1.5,0);
    const arms=hit?[[[-26,-30],[-38,-46],[-42,-60]],[[26,-30],[38,-46],[42,-60]]]:fear?[[[-26,-30],[-38,-38],[-31,-52]],[[26,-30],[38,-38],[31,-52]]]:[[[-26,-30],[-38,-22],[-27,-13]],[[26,-30],[38,-22],[27,-13]]];
    for(const a of arms){curve(a,INK,3);const e=a[2];circ(e[0],e[1],4.2,'#fff6dc',INK,1.6);}
    c.drawImage(toastBody(),-48,-86);
    const lk=lookAt(m,x,y-56,2),eyeY=-40;
    for(const e of[-1,1]){
      c.beginPath();ell(e*10,eyeY,7,hit?8:fear?7.5:6.2);c.fillStyle='#fff8e8';c.fill();c.lineWidth=2;c.strokeStyle=INK;c.stroke();
      circ(e*10+lk.x,eyeY+lk.y+(hit||fear?0:1.5),hit?2:2.8,INK,null);
      if(!hit&&!fear){c.save();c.beginPath();ell(e*10,eyeY,7,6.2);c.clip();c.fillStyle='#4a2c18';c.fillRect(e*10-8,eyeY-8,16,7.4);c.restore();stroke([[e*10-7,eyeY-.6],[e*10+7,eyeY-.6]],INK,2);}
    }
    const brow=hit?[[-17,-55],[-4,-56]]:fear?[[-17,-48],[-4,-53]]:[[-17,-51],[-4,-47]];
    for(const e of[-1,1])stroke(brow.map(([bx,by])=>[bx*e,by]),'#0e0806',4.2);
    if(hit){cut(()=>ell(0,-22,9,10),'#5a1a20',INK,2,0);c.fillStyle='#fff8e8';c.fillRect(-6,-31,12,3.5);c.fillStyle='#ff7a8a';c.beginPath();ell(0,-16,5,3);c.fill();}
    else if(fear){cut(()=>ell(0,-24,6,5),'#5a1a20',INK,2,0);}
    else{cut(()=>c.roundRect(-9,-29,18,7,3),'#fff8e8',INK,1.6,0);stroke([[-3,-28],[-3,-23]],INK,1.2);stroke([[3,-28],[3,-23]],INK,1.2);}
    c.restore();
    if(hit&&t<.95){const s=reducedMotion?1:ease.back(clamp(t/.2,0,1));c.save();c.translate(x+34,y-112-hop*.5);c.rotate(.18);c.scale(s,s);c.globalAlpha=clamp((.95-t)/.25,0,1);txt('POP!',0,0,17,'#fdf071');c.restore();}
  }
  function squeezeBottle(x,y,rot,body,capCol,label,dizzy){
    c.save();c.translate(x,y);c.rotate(rot);
    cut(()=>c.roundRect(-11,-42,22,42,[8,8,4,4]),body,INK,2.5,3);
    cutPoly([[-8,-41],[8,-41],[2.5,-56],[-2.5,-56]],capCol,INK,2,0);
    c.fillStyle='rgba(255,255,255,.35)';c.fillRect(-7,-36,3.5,30);
    cut(()=>c.roundRect(-9,-26,18,12,2),'#fff6dc',INK,1.5,0);
    if(label==='tomato'){circ(0,-19.5,3.6,'#e23b3b',INK,1);cutPoly([[-2.5,-23],[0,-21.5],[2.5,-23],[0,-24.5]],'#4d8a3a',null,0,0);}
    else txt(label,0,-20,6.5,'#c0392b','center',null,1000);
    if(dizzy)for(const e of[-1,1]){stroke([[e*4-2,-35],[e*4+2,-31]],INK,1.6);stroke([[e*4+2,-35],[e*4-2,-31]],INK,1.6);}
    else{circ(-4,-33,1.7,INK,null);circ(4,-33,1.7,INK,null);}
    c.restore();
  }
  function friesCarton(x,y){
    c.save();c.translate(x,y);
    for(const[dx,h,a]of[[-8,24,-.25],[-3,30,-.08],[2,27,.06],[7,22,.22],[0,20,0]]){c.save();c.rotate(a);cut(()=>c.roundRect(dx-2.2,-h-8,4.4,h,1),'#ffd25a',INK,1.5,0);c.restore();}
    cutPoly([[-13,-18],[13,-18],[10,0],[-10,0]],'#e2464e',INK,2.5,3);
    stroke([[-6,-16],[-5,-2]],'#fff6dc',2);stroke([[6,-16],[5,-2]],'#fff6dc',2);
    c.restore();
    for(const[dx,dy,a]of[[18,-2,.4],[24,1,-.3],[-20,0,1.2]]){c.save();c.translate(x+dx,y+dy);c.rotate(a);cut(()=>c.roundRect(-8,-2,16,4,1),'#ffd25a',INK,1.3,0);c.restore();}
  }
  function trafficCone(x,y){
    cut(()=>c.roundRect(x-18,y-6,36,7,2),'#3b3047',INK,2.5,3);
    cutPoly([[x-12,y-6],[x+12,y-6],[x+3,y-46],[x-3,y-46]],'#ff8a2a',INK,2.5,3);
    c.fillStyle='#fff6dc';c.beginPath();poly([[x-8.6,y-18],[x+8.6,y-18],[x+6.3,y-28],[x-6.3,y-28]]);c.fill();
  }
  function specialsBoard(x,y){
    stroke([[x-17,y],[x-11,y-50]],'#6a3d2f',4);stroke([[x+17,y],[x+11,y-50]],'#6a3d2f',4);
    cut(()=>c.roundRect(x-19,y-54,38,40,3),'#8a5a40',INK,2.5,3);rect(x-15,y-50,30,32,'#24453c',null,0,2);
    txt('TODAY',x,y-44,6.5,'#e8f5e0','center',null,900);txt('SOUP',x,y-34,10,'#fdf071','center',null,1000);txt('(RUN)',x,y-24,6.5,'#ff9aa8','center',null,900);
  }
  function picketFence(x0,x1){stroke([[x0,488],[x1,486]],INK,3);stroke([[x0,500],[x1,498]],INK,3);
    for(let x=x0;x<=x1;x+=13){const tilt=Math.sin(x*1.7)*2;stroke([[x,506],[x+tilt,478]],INK,3);cutPoly([[x+tilt-3,479],[x+tilt,471],[x+tilt+3,479]],INK,null,0,0);}}
  function pumpkin(x,y,r,face){
    const h=r*.78;
    for(const[dx,rw,col]of[[-r*.5,r*.56,'#c9561f'],[r*.5,r*.56,'#c9561f'],[0,r*.62,'#ec7a2c']])cut(()=>ell(x+dx,y-h,rw,h),col,INK,2.5,dx?3:0);
    cutPoly([[x-2.5,y-h*2+3],[x+3,y-h*2+2],[x+6,y-h*2-8],[x+1,y-h*2-9]],'#4d6b2e',INK,2,0);
    if(!face)return;
    c.fillStyle='#ffd45a';c.strokeStyle=INK;c.lineWidth=1.5;
    for(const e of[-1,1]){c.beginPath();poly([[x+e*r*.44,y-h*1.12],[x+e*r*.12,y-h*1.12],[x+e*r*.28,y-h*1.46]]);c.fill();c.stroke();}
    c.beginPath();poly([[x-r*.5,y-h*.74],[x-r*.3,y-h*.56],[x-r*.15,y-h*.72],[x,y-h*.52],[x+r*.15,y-h*.72],[x+r*.3,y-h*.56],[x+r*.5,y-h*.74],[x+r*.3,y-h*.3],[x-r*.3,y-h*.3]]);c.fill();c.stroke();
  }
  const PUMPKINS=[[42,510,22,true],[100,502,15,false],[166,512,27,true],[228,504,13,false]];
  const WRECK_PROPS={
    graveyard:()=>c.drawImage(wreckFront(),0,0),
    pumpkin_patch:()=>{
      c.drawImage(layer('wreckProps:pumpkin_patch',420,640,()=>{
        picketFence(250,322);picketFence(372,418);
        curve([[10,512],[60,500],[120,510],[180,498],[240,508]],'#2f5a3a',3);
        for(const[x,y,r,f]of PUMPKINS)pumpkin(x,y,r,f);
        for(let i=0;i<14;i++){const x=(i*67+29)%420,y=504+(i*41)%20;cutPoly([[x-5,y],[x-2,y-9],[x,y-2],[x+3,y-11],[x+5,y]],'#2f4a38',null,0,0);}
      }),0,0);
      const pt=state.playTime;
      for(const[x,y,r,f]of PUMPKINS)if(f)glowAt(x,y-r*.8,r*1.6,'255,170,60',.32+.14*Math.sin(pt*9+x)*motion);
    },
    condiment_alley:ball=>{
      c.drawImage(layer('wreckProps:condiment_alley',420,640,()=>{
        squeezeBottle(118,504,-.06,'#e23b3b','#fff6dc','tomato',false);
        squeezeBottle(144,506,.34,'#f2c230','#e23b3b','HOT',true);
        friesCarton(240,508);
      }),0,0);
      const m=mood(ball);soupCan(60,500,m);burntToast(194,502,m);
    },
    parking_lot:ball=>{
      c.drawImage(layer('wreckProps:parking_lot',420,640,()=>{
        cut(()=>c.roundRect(20,500,72,11,3),'#b8b2a6',INK,2.5,3);for(const x of[32,56,80])cutPoly([[x-5,501],[x+3,501],[x+7,510],[x-1,510]],'#e8c547',null,0,0);
        trafficCone(112,508);specialsBoard(150,510);
      }),0,0);
      const m=mood(ball);burntToast(56,500,m);soupCan(210,502,m);
    }
  };

  // FX ─ ambient particles and secondary motion
  function wisps(pt){
    for(let i=0;i<7;i++){
      const ph=pt*(.35+i*.04)+i*1.7,x=40+((i*61+pt*(8+i*2))%380),y=396+Math.sin(ph*1.3)*30+(i%3)*24,pulse=.6+.4*Math.sin(pt*4+i*2);
      glowAt(x,y,18+8*pulse,'170,255,190',.55*pulse);
      for(let k=1;k<4;k++){c.globalAlpha=.3/k;circ(x-k*5,y+k*1.6*Math.sin(ph),2.8-k*.5,'#d8ffe0',null);}
      c.globalAlpha=1;circ(x,y,3.2,'#f4fff2',null);
    }
  }
  function flies(pt,x0,y0){
    for(let i=0;i<3;i++){const x=x0+Math.sin(pt*7+i*2.1)*18+Math.sin(pt*2.3+i)*8,y=y0+Math.sin(pt*11+i*1.3)*10,f=Math.abs(Math.sin(pt*40+i));
      c.fillStyle='rgba(235,245,255,.75)';c.beginPath();ell(x-2.5,y-2,2.8,1+1.8*f,.5);ell(x+2.5,y-2,2.8,1+1.8*f,-.5);c.fill();circ(x,y,2,INK,null);}
  }
  function moths(pt,cx,cy,n,rad){
    for(let i=0;i<n;i++){const a=pt*(2.2+i*.3)*(i%2?1:-1)+i*2.1,x=cx+Math.cos(a)*rad*(1+.3*Math.sin(pt*3+i)),y=cy+Math.sin(a*1.3)*rad*.6,f=Math.abs(Math.sin(pt*30+i));
      c.save();c.translate(x,y);c.fillStyle='rgba(255,246,220,.9)';c.beginPath();ell(-3,0,3.6,1.5+3*f,.4);ell(3,0,3.6,1.5+3*f,-.4);c.fill();circ(0,0,1.6,INK,null);c.restore();}
  }
  const WRECK_FX={
    fog_bats:{
      back(pt,w,t){
        for(const[w0,y,sp,x0]of[[150,150,6,40],[110,236,10,260],[90,188,15,520]]){const x=((x0-pt*sp)%640+640)%640-160;c.drawImage(cloud(w0),x,y);}
        for(let i=0;i<3;i++){const flee=w.hit?t:0;const bx=70+i*70+Math.sin(pt*.7+i*2)*50+flee*220*(i%2?1:-1),by=170+Math.sin(pt*1.3+i)*16-flee*120-i*8;bat(bx,by,.8+i*.15,Math.sin(pt*14+i*2));}
      },
      mid(pt){drift(fogLayer(),8,420,pt);},
      front(pt){drift(fogLayer(),14,452,pt);}
    },
    will_o_wisps:{
      back(pt){for(let i=0;i<5;i++){const ph=(pt*.08+i*.2)%1;twinkle(30+i*86,120+((i*53)%90),2+2*Math.sin(pt*3+i)**2,'#e8fff0',ph*TAU);}},
      mid(pt){drift(fogLayer(),5,428,pt);},
      front(pt){wisps(pt);}
    },
    grease_steam:{
      back(pt){for(const[w0,y,sp,x0]of[[130,166,5,80],[100,236,9,330]]){const x=((x0-pt*sp)%640+640)%640-160;c.save();c.globalAlpha=.5;c.drawImage(cloud(w0,'#6a5a6e','#857388'),x,y);c.restore();}},
      mid(pt){drift(steamLayer(),9,424,pt);},
      front(pt){
        for(let i=0;i<5;i++){const ph=(pt*.42+i/5)%1;c.globalAlpha=(1-ph)*.34;circ(130+Math.sin(ph*4+i)*10,556-ph*110,8+ph*22,'#fff6ea',null);}c.globalAlpha=1;
        flies(pt,240,476);
      }
    },
    neon_moths:{
      back(pt){for(let i=0;i<6;i++){const tw=Math.sin(pt*2.4+i*1.9);if(tw>0)twinkle(24+i*44,112+((i*37)%70),2+3*tw,'#e9fff6',i);}},
      mid(pt){glowAt(346,490,120,'255,93,134',(.16+.05*Math.sin(pt*9))*motion+.05,.22);},
      front(pt){moths(pt,372,180,5,46);moths(pt+3,346,402,3,22);}
    }
  };

  // ── ASSEMBLING MAYHEM: the remix snaps each slot in, in order ─────────
  const ASSEMBLE_TIME=reducedMotion?.6:1.4;
  const ASSEMBLE_SLOTS=[['atmosphere',0,.3],['set',.22,.36],['props',.5,.3],['fx',.72,.2]];
  function slotIn(slot,paint){
    const a=stageMachine.anim;if(!a){paint();return;}
    const k=a[slot];if(k<=0)return;if(k>=1){paint();return;}
    c.save();
    if(reducedMotion)c.globalAlpha=k;
    else if(slot==='atmosphere')c.translate(0,-(1-ease.out(k))*560);
    else if(slot==='set')c.translate(0,(1-ease.back(k))*320);
    else if(slot==='props'){const e=ease.back(k);c.translate(210,505);c.scale(e,e);c.translate(-210,-505);}
    else c.globalAlpha=k;
    paint();c.restore();
  }
  function assemblyProgress(){
    const p=1-stageMachine.assemble/ASSEMBLE_TIME,anim={};
    for(const[slot,start,dur]of ASSEMBLE_SLOTS)anim[slot]=clamp((p-start)/dur,0,1);
    return{p,anim};
  }
  // The world on the ticket rebuilds around a resting character: round
  // state is swapped for a fresh copy while painting and always restored.
  function drawAssembly(){
    c.drawImage(layer('blueprint',420,640,()=>{c.fillStyle='#120d20';c.fillRect(0,0,420,640);c.strokeStyle='rgba(83,232,203,.12)';c.lineWidth=1;c.beginPath();for(let x=0;x<=420;x+=21){c.moveTo(x,0);c.lineTo(x,640);}for(let y=0;y<=640;y+=21){c.moveTo(0,y);c.lineTo(420,y);}c.stroke();}),0,0);
    const saved={wreck:state.wreck,ufo:state.ufo,lava:state.lava,aftermath:state.aftermath};
    stageMachine.anim=assemblyProgress().anim;resetPhysics();state.aftermath=null;
    try{
      if(stageMachine.focus==='beam')drawUfo(true);
      else if(stageMachine.focus==='dodge')drawLava(true);
      else drawWreck(true);
    }finally{Object.assign(state,saved);stageMachine.anim=null;}
  }
  function drawAssemblyHud(){
    const{p,anim}=assemblyProgress(),r=stageMachine.recipes[stageMachine.focus]||stageMachine.recipes.wreck;
    const kb=reducedMotion?1:ease.back(clamp(p/.18,0,1));
    c.save();c.translate(210,44);c.rotate(-.02);c.scale(kb,kb);
    cutPoly([[-172,-21],[172,-21],[158,0],[172,21],[-172,21],[-158,0]],'#2a1f45','#fdf071',3,5);
    txt('ASSEMBLING MAYHEM',0,1,22,'#fdf071');c.restore();
    ASSEMBLE_SLOTS.forEach(([slot],i)=>{
      const k=anim[slot],done=k>=1,x=10+i*101,y=574;
      cut(()=>c.roundRect(x,y,98,48,6),done?'#1d1733':'#151022',done?'#53e8cb':'#3a3157',2.5,3);
      txt(slot.toUpperCase(),x+49,y+14,10,done?'#53e8cb':'#6d6290','center',null,1000);
      txt(r.labels[slot],x+49,y+32,Math.min(10,92/(r.labels[slot].length*.62)),done?'#fff3c5':'#4a4166','center',null,900);
      if(k>0&&!done)rect(x+8,y+41,82*k,3,'#fdf071',null,0,1);
    });
    if(p>.84){const k=reducedMotion?1:ease.back((p-.84)/.14);c.save();c.translate(210,250);c.rotate(-.05);c.scale(k,k);
      cut(()=>c.roundRect(-150,-29,300,58,8),'#fdf071',INK,4,6);
      txt(r.title,0,-5,Math.min(24,280/(r.title.length*.66)),INK,'center',null);txt(`REMIX #${r.remix} · SEED ${r.seed.toString(16).toUpperCase().padStart(8,'0')}`,0,17,9,'#5b2c47','center',null,900);
      if(stageMachine.focus==='wreck'){const rest=`+ ${stageMachine.recipes.beam.labels.set} + ${stageMachine.recipes.dodge.labels.set}`;cut(()=>c.roundRect(-138,34,276,22,5),'#2a1f45','#53e8cb',2.5,3);txt(rest,0,45,Math.min(10,250/(rest.length*.62)),'#9bffe2','center',null,1000);}
      c.restore();}
  }

  // ── 02 BEAM IT · a farm at night, a hungry saucer ────────────────────
  function beamBackdrop(aurora=false){
    return layer(aurora?'beamBg:aurora':'beamBg',420,640,()=>{
      const g=c.createLinearGradient(0,90,0,500);
      if(aurora){g.addColorStop(0,'#03141c');g.addColorStop(.6,'#0d3442');g.addColorStop(1,'#2d4a6e');}
      else{g.addColorStop(0,'#0d0b26');g.addColorStop(.6,'#272052');g.addColorStop(1,'#5b3a78');}
      c.fillStyle=g;c.fillRect(0,0,420,640);
      if(aurora)for(let k=0;k<3;k++){
        const band=c.createLinearGradient(0,120+k*46,0,210+k*46);band.addColorStop(0,'rgba(127,242,212,0)');band.addColorStop(.5,k===1?'rgba(255,128,190,.26)':'rgba(127,242,212,.3)');band.addColorStop(1,'rgba(127,242,212,0)');
        c.fillStyle=band;c.beginPath();c.moveTo(0,150+k*46);
        for(let x=0;x<=420;x+=20)c.lineTo(x,130+k*46+Math.sin(x*.018+k*1.7)*22);
        for(let x=420;x>=0;x-=20)c.lineTo(x,200+k*46+Math.sin(x*.024+k)*14);
        c.closePath();c.fill();
      }
      glowAt(330,330,200,'127,242,212',.1);glowAt(80,250,170,'255,93,134',.12);
      let s=77;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
      for(let i=0;i<90;i++){c.globalAlpha=.25+r()*.7;circ(r()*420,100+r()*340,.5+r()*1.2,'#fbf2c8',null);}
      c.globalAlpha=1;
      c.save();c.translate(66,200);c.rotate(-.35);
      c.strokeStyle='#ffd27a';c.lineWidth=5;c.beginPath();c.ellipse(0,0,52,12,0,Math.PI,TAU);c.stroke();
      cut(()=>ell(0,0,30,30),'#d36dc4',INK,3,0);
      c.save();c.beginPath();ell(0,0,30,30);c.clip();c.fillStyle='#b257a6';c.fillRect(-32,-9,64,7);c.fillRect(-32,8,64,5);circ(14,12,28,'rgba(60,20,80,.28)',null);c.restore();
      c.strokeStyle=INK;c.lineWidth=8;c.beginPath();c.ellipse(0,0,52,12,0,0,Math.PI);c.stroke();
      c.strokeStyle='#ffd27a';c.lineWidth=5;c.beginPath();c.ellipse(0,0,52,12,0,0,Math.PI);c.stroke();
      c.restore();
    });
  }
  function beamFar(){
    return layer('beamFar',420,640,()=>{
      cutPoly([[0,430],[40,412],[70,412],[92,392],[150,392],[170,416],[230,420],[262,398],[320,398],[340,418],[420,430],[420,520],[0,520]],'#2a2350',null,0,0);
      for(const[x,y]of[[112,404],[120,404],[290,410]])rect(x,y,4,4,'#ffd976',null,0,1);
    });
  }
  function beamFarm(){
    return layer('beamFarm',420,640,()=>{
      cutPoly([[0,468],[90,458],[200,466],[300,456],[420,468],[420,520],[0,520]],'#3a2d5f',INK,3,0);
      cutPoly([[60,466],[60,428],[92,404],[124,428],[124,466]],'#d9577a',INK,3,4);
      cutPoly([[54,430],[92,398],[130,430],[124,432],[92,406],[60,432]],'#7a3352',INK,2.5,0);
      cut(()=>c.roundRect(80,438,24,28,2),'#7a3352',INK,2.5,0);stroke([[80,438],[104,466]],'#fff3c5',2);stroke([[104,438],[80,466]],'#fff3c5',2);
      circ(92,418,5,'#ffd976',INK,2);
      cut(()=>c.roundRect(134,410,22,56,3),'#b5b3e4',INK,3,4);cut(()=>{c.moveTo(134,412);c.arc(145,412,11,Math.PI,0);c.closePath();},'#8f8cc4',INK,3,0);
      for(let i=0;i<3;i++)stroke([[134,426+i*12],[156,426+i*12]],'#8f8cc4',2);
      for(const[x,s]of[[250,1],[284,.8]]){cut(()=>{c.moveTo(x-18*s,466);c.quadraticCurveTo(x-18*s,446-6*s,x,442-8*s);c.quadraticCurveTo(x+18*s,446-6*s,x+18*s,466);c.closePath();},'#ffcd63',INK,2.5,3);stroke([[x-8*s,456],[x+6*s,452]],'#d9a23f',2);}
      for(let x=0;x<420;x+=21){stroke([[x,478],[x,462]],'#4f3f78',3);}stroke([[0,467],[420,467]],'#4f3f78',2);stroke([[0,474],[420,474]],'#4f3f78',2);
    });
  }
  function beamRoad(){
    return layer('beamRoad',420,640,()=>{
      cutPoly([[0,500],[420,500],[420,640],[0,640]],'#221d3a',INK,3,0);
      stroke([[0,508],[420,508]],'#3a3260',3);
      for(let x=15;x<420;x+=72)rect(x,552,33,6,'#fcce72',null,0,3);
      stroke([[0,598],[420,598]],'#3a3260',2);
    });
  }
  function windmill(x,y,pt){
    if(x<-50||x>470)return;
    cutPoly([[x-9,y+38],[x-4,y],[x+4,y],[x+9,y+38]],'#6a4b84',INK,2.5,3);
    c.save();c.translate(x,y);c.rotate(pt*1.4);
    for(let i=0;i<4;i++){c.rotate(TAU/4);cutPoly([[-3,-4],[3,-4],[5,-28],[-5,-28]],'#fff3c5',INK,2,0);}
    c.restore();circ(x,y,3.5,'#ff5d86',INK,2);
  }
  function alien(x,y,look,mood){
    c.save();c.translate(x,y+Math.sin(state.playTime*3)*1.5);
    stroke([[-6,-12],[-10,-24]],INK,2);stroke([[6,-12],[10,-24]],INK,2);
    circ(-10,-25,3,'#ff85a3',INK,1.5);circ(10,-25,3,'#ff85a3',INK,1.5);
    cut(()=>ell(0,15,13,8),'#f2d65a',INK,2.5,0);
    cut(()=>ell(0,-2,14,15),'#fdf071',INK,2.5,0);
    for(const s of[-1,1]){c.fillStyle=INK;c.beginPath();ell(s*6+look*2,-3,4.4,6,s*-.3);c.fill();circ(s*6+look*2+1,-5,1.4,'#fff',null);}
    c.fillStyle=INK;c.strokeStyle=INK;c.lineWidth=2;c.beginPath();
    if(mood==='miss'){c.moveTo(-4,8);c.lineTo(-1,6);c.lineTo(2,8);c.lineTo(5,6);c.stroke();}
    else if(mood==='happy'){c.arc(0,5,4.5,.15,Math.PI-.15);c.stroke();}
    else{ell(0,7,2,2.4);c.fill();}
    c.restore();
  }
  function saucer(x,y,o){
    const pt=state.playTime;
    c.save();c.translate(x,y);c.rotate(o.tilt||0);c.scale((o.sx||1)*1.1,(o.sy||1)*1.1);
    glowAt(0,30,86,'127,242,212',.3+.12*Math.sin(pt*3),.32);
    stroke([[0,-34],[3,-38],[0,-41]],INK,3);
    const bl=.5+.5*Math.sin(pt*3);glowAt(0,-43,12,'255,93,134',.7*bl);circ(0,-43,4.5,bl>.5?'#ff8fb1':'#c94a72',INK,2);
    c.beginPath();c.ellipse(0,-2,46,36,0,Math.PI,TAU);c.closePath();c.fillStyle='#34397c';c.fill();
    alien(o.cargo?-14:0,-10,o.look||0,o.mood);
    if(o.cargo)drawThing(17,-11,25,Math.sin(pt*4)*.15,false);
    c.beginPath();c.ellipse(0,-2,46,36,0,Math.PI,TAU);c.closePath();c.fillStyle='rgba(139,246,235,.26)';c.fill();c.lineWidth=3.5;c.strokeStyle=INK;c.stroke();
    c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=4;c.lineCap='round';c.beginPath();c.ellipse(0,-2,36,27,0,Math.PI*1.12,Math.PI*1.36);c.stroke();
    cut(()=>ell(0,15,70,15),'#4b3f7a',INK,3.5,5);
    c.fillStyle=o.firing?(o.good?'#c9fff0':'#ffc2d4'):'#191426';c.beginPath();ell(0,26,18,5);c.fill();
    cut(()=>ell(0,6,92,21),'#b5b3e4',INK,3.5,0);
    c.fillStyle='#dcdaf7';c.beginPath();c.ellipse(-6,1,72,10,0,Math.PI,TAU);c.fill();
    cut(()=>ell(0,10,90,8),'#ff85a3',INK,3,0);
    const cols=['#fdf071','#7ff2d4','#fff3c5'];
    for(let i=0;i<9;i++){const a=Math.PI*(.1+.8*i/8),lx=-Math.cos(a)*80,ly=10+Math.sin(a)*7,b=.5+.5*Math.sin(pt*(o.party?11:5)-i*.9);
      if(b>.75)glowAt(lx,ly,12,'253,240,113',(b-.75)*2.4);
      c.globalAlpha=.45+.55*b;circ(lx,ly,4,cols[i%3],INK,1.5);c.globalAlpha=1;}
    c.restore();
  }
  function critter(x,y,col,label,pt){
    const cow=/cow/i.test(label),step=Math.sin(pt*9+x*.05)*motion,look=clamp((210-x)/150,-1,1);
    groundShadow(x,y+25,24,.35);
    c.save();c.translate(x,y);c.rotate(Math.sin(pt*3+x*.02)*.08*motion);
    stroke([[-12,16],[-12+step*4,25]],INK,3);stroke([[12,16],[12-step*4,25]],INK,3);
    if(cow){cutPoly([[-22,-19],[-27,-29],[-16,-21]],'#fff3c5',INK,2,0);cutPoly([[22,-19],[27,-29],[16,-21]],'#fff3c5',INK,2,0);}
    cut(()=>c.roundRect(-27,-21,54,42,10),col,INK,3.5,4);
    if(cow){c.save();c.beginPath();c.roundRect(-27,-21,54,42,10);c.clip();c.fillStyle=INK;c.beginPath();ell(-17,10,9,7);ell(18,-14,7,6);ell(8,14,5,4);c.fill();c.restore();}
    for(const s of[-1,1]){circ(s*11,-6,6,'#fff',INK,2);circ(s*11+look*2,-8.5,2.6,INK,null);}
    c.beginPath();ell(0,8,3,3.6);c.fillStyle=INK;c.fill();
    c.restore();
    txt(label,x,y+37,9,'#fff3bd');
  }
  // The renderer walks the recipe slot by slot (sky, fx, set, props, ground,
  // fx); the saucer, beam, target zone and timing below are shared by every
  // world and never read the recipe.
  function drawUfo(preview=false){
    const u=state.ufo,pt=state.playTime,tx=targetX();
    const windowPx=activePlan.round_modifiers?.round2_beam?.beam_window_px||68;
    const required=activePlan.round_modifiers?.round2_beam?.target_catches||2;
    const at=state.aftermath&&state.round===1?state.aftermath.time:0;
    const zip=reducedMotion?0:ease.in((at-.22)/.36),present=1-clamp(zip*2.5,0,1);
    const r=stageMachine.recipes.beam,set=BEAM_SETS[r.set]||BEAM_SETS.night_farm,fx=BEAM_FX[r.fx]||BEAM_FX.night_breeze;
    slotIn('atmosphere',()=>c.drawImage((BEAM_ATMOS[r.atmosphere]||BEAM_ATMOS.starry_night)(),0,0));
    slotIn('fx',()=>fx.back(pt));
    slotIn('set',()=>set.back(pt));
    slotIn('props',()=>(BEAM_PROPS[r.props]||BEAM_PROPS.barn_silo)(pt,tx));
    slotIn('set',()=>set.front(pt));
    slotIn('fx',()=>fx.front(pt));
    const aligned=Math.abs(tx-210)<windowPx&&state.scene==='playing'&&u.winCountdown<=0;
    if(!preview){
      c.save();c.globalAlpha=(aligned?.48:.18)*present;c.fillStyle='#7ff2d4';c.beginPath();ell(210,504,windowPx,9);c.fill();c.restore();
      c.save();c.globalAlpha=present;c.setLineDash([6,6]);c.lineDashOffset=-pt*12;c.strokeStyle=aligned?'#e4fff7':'rgba(127,242,212,.6)';c.lineWidth=2;c.beginPath();ell(210,504,windowPx,9);c.stroke();c.setLineDash([]);
      for(const s of[-1,1])cutPoly([[210+s*windowPx-5,522],[210+s*windowPx,514],[210+s*windowPx+5,522]],aligned?'#c9fff0':'#7ff2d4',INK,1.5,0);
      c.restore();
    }
    const firing=u.beam>0,good=u.beamGood,f=firing?ease.out((.43-u.beam)/.1)*clamp(u.beam/.12,0,1):0,col=good?'127,255,207':'255,105,147';
    c.save();c.globalAlpha=present;
    const g=c.createLinearGradient(0,236,0,506);g.addColorStop(0,'rgba(127,242,212,.02)');g.addColorStop(1,'rgba(127,242,212,.14)');
    c.fillStyle=g;c.beginPath();poly([[196,236],[224,236],[306,506],[114,506]]);c.fill();
    for(let i=0;i<6;i++){const p=((pt*.7+i/6)%1),yy=500-p*262;c.strokeStyle=good&&firing?'#b2ffe7':'#75bfbf';c.globalAlpha=(.15+p*.3)*present;c.lineWidth=2;c.beginPath();ell(210,yy,75*(1-p)+12,8*(1-p)+2);c.stroke();}
    c.restore();
    if(f>0){
      const wd=.75+.25*f;
      c.save();c.globalAlpha=.55*f;
      const g2=c.createLinearGradient(0,236,0,506);g2.addColorStop(0,`rgba(${col},.2)`);g2.addColorStop(1,`rgba(${col},.9)`);
      c.fillStyle=g2;c.beginPath();poly([[198,236],[222,236],[210+96*wd,506],[210-96*wd,506]]);c.fill();
      c.globalAlpha=.5*f;c.fillStyle='#fff8d6';c.beginPath();poly([[205,236],[215,236],[210+30*wd,506],[210-30*wd,506]]);c.fill();
      c.globalAlpha=f;c.strokeStyle=`rgb(${col})`;c.lineWidth=2.5;
      for(const side of[-1,1]){c.beginPath();for(let y=236;y<=506;y+=18){const k=(y-236)/270,x=210+side*(12+84*wd*k)+Math.sin(y*.2+pt*24)*2*motion;y===236?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}
      glowAt(210,506,90,col,.5*f,.25);
      if(!good)for(let i=0;i<3;i++){const ph=(pt*2+i/3)%1;c.globalAlpha=f*(1-ph)*.7;circ(200+i*10,500-ph*30,5+ph*10,'#5b3359',null);}
      c.restore();
    }
    const orbit=front=>{const n=firing?14:6;for(let i=0;i<n;i++){const ph=(pt*(firing?1.6:.45)+i/n)%1,y=500-ph*262,r=12+80*(y-236)/270,th=pt*(firing?7:2)+i*2.4,d=Math.sin(th);if((d>0)!==front)continue;
      c.globalAlpha=(firing?.25+.75*f:.35)*(.4+.6*ph)*present;circ(210+Math.cos(th)*r*.85,y+d*4,1.4+(d+1)*1.3,firing?(good?'#e4fff7':'#ffc2d4'):'#9ff7e2',null);}c.globalAlpha=1;};
    orbit(false);
    const dy=448,cargo=u.hits>=required&&u.abduct<=0;
    const planDecoys = activePlan.round_modifiers?.round2_beam?.decoys || ['COW?', 'NOT IT'];
    const decoys=[{x:210+151*Math.sin(u.phase+2.04),col:'#ffa5c6',t:planDecoys[0] || 'COW?'},{x:210+151*Math.sin(u.phase+4.1),col:'#ffe483',t:planDecoys[1] || 'NOT IT'}];
    if(!preview)decoys.forEach((d,i)=>set.critter(d.x,dy+45,d.col,d.t,pt,i));
    if(u.abduct>0){
      const k=1-u.abduct/.38,y=lerp(dy+27,238,ease.inOut(k)),sz=70*(1-.72*ease.in(k));
      glowAt(210,y,sz*.9,col,.6);
      drawThing(210,y,sz,Math.sin(pt*12)*.3*(1-k)*motion,true,{sx:1-.18*Math.sin(Math.PI*k)*motion,sy:1+.3*Math.sin(Math.PI*k)*motion});
      for(let j=0;j<2;j++){const ph=(pt*3+j*.5)%1,rr=sz*.7*(1+ph*.6);c.save();c.globalAlpha=.7*(1-ph);c.strokeStyle='#e4fff7';c.lineWidth=2;c.beginPath();ell(210,y+sz*.3,rr,rr*.26);c.stroke();c.restore();}
    }else if(!cargo){
      const hop=Math.abs(Math.sin(pt*7))*6*motion,lean=Math.cos(u.phase)*.18*motion;
      groundShadow(tx,507,26,.4-hop*.02);
      drawThing(tx,dy+27-hop,70,lean+Math.sin(pt*2)*.06,true,{sx:1+(6-hop)*.008,sy:1-(6-hop)*.008});
    }
    orbit(true);
    let ux=210,uy=204+Math.sin(pt*2.2)*4*motion,tilt=clamp((tx-210)/136,-1,1)*.07*motion,sx=1,sy=1;
    if(firing&&!good)tilt+=Math.sin(pt*38)*.09*clamp(u.beam/.43,0,1)*motion;
    if(u.abduct>0){const k=1-u.abduct/.38,gl=Math.sin(Math.PI*clamp((k-.72)/.28,0,1));sx=1+.1*gl*motion;sy=1-.12*gl*motion;}
    if(at>0){const hop=Math.sin(Math.PI*clamp(at/.22,0,1));uy-=hop*16*motion;ux+=300*zip;uy-=240*zip;sx*=1+.5*zip;sy*=1-.3*zip;tilt-=.35*zip;}
    if(zip>0){c.save();c.globalAlpha=.6*(1-zip*.6);for(let i=0;i<4;i++)stroke([[ux-100-i*14,uy+28-i*14],[ux-170-i*26,uy+70-i*8]],'#e4fff7',3);c.restore();}
    if(zip<1)saucer(ux,uy,{tilt,sx,sy,look:clamp((tx-210)/136,-1,1),mood:firing&&!good?'miss':cargo?'happy':'',cargo,firing,good,party:at>0});
    if(at>0&&at<.6){const k=at/.6;c.save();c.globalAlpha=1-k*k;c.translate(ux+12,uy-50-k*50);const s=ease.back(k*2.5)*1.2;c.scale(s,s);cut(()=>heartPath(9),'#ff5d86',INK,2,0);c.restore();}
    if(preview)return;
    const targetCatches = activePlan.round_modifiers?.round2_beam?.target_catches || 2;
    txt(`CAPTURED ${u.hits}/${targetCatches}`,210,140,25,'#a9ffe3');
    if(state.scene==='aftermath'||(cargo&&at>0)){const k=reducedMotion?1:ease.back(at/.25);c.save();c.translate(210,346);c.scale(k,k);txt(setLines(1).cheer,0,0,20,'#a9ffe3');c.restore();}
    txt(`MISFIRES ${u.misses}`,210,580,12,'#f7cbd6');
    txt('TAP ANYWHERE WHEN ALIGNED!',210,615,13,'#fff2b2');
  }

  // ── Stage Machine v2 · BEAM IT slot modules ──────────────────────────
  // NIGHT FARM is the original art split into slots: a low panorama that
  // scrolls under the saucer. ALIEN DRIVE-THROUGH is a parked diorama — the
  // saucer is a customer in the order lane — so its silhouettes are tall and
  // neon: a saucer pylon on the left, an upswept roadside diner on the right.
  function donutPlanet(x,y){
    c.save();c.translate(x,y);c.rotate(-.22);
    glowAt(0,0,84,'255,126,182',.3);
    const ring=()=>{c.beginPath();c.ellipse(0,0,40,31,0,0,TAU);c.ellipse(0,-3,13,8,0,TAU,0,true);};
    c.save();c.translate(2.5,4.5);ring();c.fillStyle=SHADE;c.fill();c.restore();
    ring();c.fillStyle='#e7a663';c.fill();
    c.save();ring();c.clip();
    c.beginPath();for(let i=0;i<=40;i++){const a=i/40*TAU,rr=31+2.5*Math.sin(a*7)+(Math.sin(a*3+1)>.55?5:0);i?c.lineTo(Math.cos(a)*rr,-5+Math.sin(a)*rr*.76):c.moveTo(Math.cos(a)*rr,-5+Math.sin(a)*rr*.76);}c.closePath();
    c.fillStyle='#ff7eb6';c.fill();
    const cols=['#fdf071','#53e8cb','#fff3c5','#6dbaff'];
    for(let i=0;i<16;i++){const a=i*2.4,rr=18+(i*7)%11;c.save();c.translate(Math.cos(a)*rr,-5+Math.sin(a)*rr*.7);c.rotate(a*1.7);c.fillStyle=cols[i%4];c.fillRect(-3,-1.1,6,2.2);c.restore();}
    c.fillStyle='rgba(255,255,255,.35)';c.beginPath();ell(-15,-18,11,3.5,-.35);c.fill();
    c.fillStyle='rgba(60,16,50,.3)';c.beginPath();ell(12,16,38,20,-.2);c.fill();
    c.restore();
    ring();c.lineWidth=3;c.strokeStyle=INK;c.stroke();
    c.restore();
  }
  function beamMesas(col,rim){
    cutPoly([[0,448],[22,448],[34,420],[96,418],[108,448],[150,450],[166,428],[214,426],[226,452],[300,454],[316,432],[372,430],[384,452],[420,452],[420,520],[0,520]],col,null,0,0);
    for(const[a,b,y]of[[34,96,419],[166,214,427],[316,372,431]])stroke([[a+3,y+1],[b-3,y]],rim,2.5);
  }
  function starField(seed,n,y0,h,cols){
    let s=seed;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
    for(let i=0;i<n;i++){c.globalAlpha=.25+r()*.7;circ(r()*420,y0+r()*h,.5+r()*1.2,cols[i%cols.length],null);}
    c.globalAlpha=1;
  }
  // ATMOSPHERE
  function neonNebula(){
    return layer('beamAtm:neon_nebula',420,640,()=>{
      const g=c.createLinearGradient(0,90,0,480);
      g.addColorStop(0,'#0a0626');g.addColorStop(.4,'#241048');g.addColorStop(.75,'#5b1868');g.addColorStop(1,'#b8366f');
      c.fillStyle=g;c.fillRect(0,0,420,640);
      // paper-thin nebula ribbons
      for(const[y0,amp,col,k]of[[150,24,'rgba(255,93,170,.15)',0],[218,16,'rgba(127,242,212,.11)',1.9],[276,12,'rgba(253,240,113,.07)',3.1]]){
        c.fillStyle=col;c.beginPath();c.moveTo(0,y0);
        for(let x=0;x<=420;x+=20)c.lineTo(x,y0+Math.sin(x*.016+k)*amp);
        for(let x=420;x>=0;x-=20)c.lineTo(x,y0+40+Math.sin(x*.021+k*1.3)*amp*.6);
        c.closePath();c.fill();
      }
      glowAt(300,190,150,'255,93,200',.16,.5);glowAt(120,300,160,'127,242,212',.08,.5);
      starField(404,85,100,330,['#fbf2ff','#fbf2ff','#9ff7e2']);
      donutPlanet(62,174);
      beamMesas('#2a1242','#4a2466');
      const hz=c.createLinearGradient(0,400,0,470);hz.addColorStop(0,'rgba(255,93,134,0)');hz.addColorStop(1,'rgba(255,93,134,.26)');c.fillStyle=hz;c.fillRect(0,400,420,70);
    });
  }
  function twinMoons(){
    return layer('beamAtm:twin_moons',420,640,()=>{
      const g=c.createLinearGradient(0,90,0,480);
      g.addColorStop(0,'#06142a');g.addColorStop(.5,'#123c5a');g.addColorStop(.82,'#2f6a72');g.addColorStop(1,'#e8955a');
      c.fillStyle=g;c.fillRect(0,0,420,640);
      starField(606,60,100,250,['#e9fff6','#fff3c5']);
      // a sour-apple moon and its tiny bubblegum sidekick
      glowAt(62,172,110,'214,255,180',.32);
      circ(62,172,32,'#d9f7b4',null);
      c.save();c.beginPath();ell(62,172,32,32);c.clip();circ(82,185,30,'#b8e08e',null);
      for(const[x,y,rr]of[[50,160,7],[73,182,9],[55,190,5],[78,158,4]]){circ(x,y,rr,'#a9d27e',null);circ(x-1,y-1,rr*.7,'#c8eda0',null);}
      c.restore();
      c.lineWidth=2.5;c.strokeStyle='#a9d27e';c.beginPath();ell(62,172,32,32);c.stroke();
      glowAt(146,384,30,'255,180,210',.4);circ(146,384,11,'#ffb8cf','#ff8fb1',2);circ(142,381,3,'#ff9fbe',null);
      c.save();c.lineCap='round';
      const cg=c.createLinearGradient(326,146,398,120);cg.addColorStop(0,'rgba(255,243,197,0)');cg.addColorStop(1,'rgba(255,243,197,.75)');
      c.strokeStyle=cg;c.lineWidth=3;c.beginPath();c.moveTo(326,146);c.lineTo(398,120);c.stroke();c.restore();
      twinkle(399,120,6,'#fff3c5');
      beamMesas('#1a2c42','#2f4a66');
      const hz=c.createLinearGradient(0,400,0,470);hz.addColorStop(0,'rgba(255,170,110,0)');hz.addColorStop(1,'rgba(255,170,110,.3)');c.fillStyle=hz;c.fillRect(0,400,420,70);
    });
  }
  const BEAM_ATMOS={
    starry_night:()=>beamBackdrop(false),
    aurora_night:()=>beamBackdrop(true),
    neon_nebula:neonNebula,
    twin_moons:twinMoons
  };

  // SET ─ THE ALIEN DRIVE-THROUGH
  const roofY=x=>414-(x-258)*.244;
  function dtFar(){
    return layer('beamSet:dt_far',420,640,()=>{
      c.fillStyle='#160d28';c.fillRect(0,452,420,12);stroke([[0,452],[420,452]],'#3a2a5c',2);
      for(let x=8;x<420;x+=34)circ(x,458,1.2,'#ffd976',null);
      for(const x of[150,236]){stroke([[x,452],[x,404]],'#1a1030',3);stroke([[x-9,410],[x+9,410]],'#1a1030',2.5);}
      c.strokeStyle='#1a1030';c.lineWidth=1.2;c.beginPath();c.moveTo(0,418);c.quadraticCurveTo(80,430,150,411);c.quadraticCurveTo(193,424,236,411);c.quadraticCurveTo(310,428,420,414);c.stroke();
    });
  }
  function dtBuilding(){
    return layer('beamSet:dt_building',420,640,()=>{
      // the pylon: a flying-saucer sign, because of course it is
      cut(()=>c.roundRect(38,490,40,12,3),'#6d6488',INK,2.5,3);
      cut(()=>c.roundRect(52,272,12,220,2),'#5b5280',INK,3,4);
      for(let y=356;y<486;y+=20)stroke([[53,y],[63,y]],'#463e68',2);
      cut(()=>{c.moveTo(30,258);c.quadraticCurveTo(30,231,58,229);c.quadraticCurveTo(86,231,86,258);c.closePath();},'#3c9c94',INK,3,0);
      c.fillStyle='rgba(255,255,255,.4)';c.beginPath();ell(45,243,5,9,-.5);c.fill();
      stroke([[58,229],[58,216]],INK,2.5);
      cut(()=>ell(58,262,58,17),'#2a1f45',INK,3.5,5);
      stroke([[8,270],[108,270]],'rgba(255,93,134,.55)',2);
      cut(()=>c.roundRect(8,296,98,26,4),'#1d1733','#53e8cb',3,4);
      txt('DRIVE-THRU',55,309,12,'#c9fff0','center','#14625b');
      cut(()=>c.roundRect(18,328,78,17,3),'#fff3c5',INK,2.5,3);
      txt('OPEN 25 HRS',57,337,8.5,'#e13668','center',null,1000);
      // the diner: violet stucco, checker dado, an upswept wing roof
      const wall=[[266,roofY(266)+12],[432,roofY(432)+12],[432,500],[266,500]];
      cutPoly(wall,'#3b2a66',INK,3.5,0);
      c.save();c.beginPath();poly(wall);c.clip();
      c.fillStyle='#2b1f4c';c.fillRect(266,478,170,22);
      for(let i=0;i<22;i++){const x=266+i*8;c.fillStyle=i%2?'#fff3c5':'#191426';c.fillRect(x,488,8,6);c.fillStyle=i%2?'#191426':'#fff3c5';c.fillRect(x,494,8,6);}
      c.fillStyle='#53e8cb';c.fillRect(266,478,170,4);
      const sh=c.createLinearGradient(266,0,300,0);sh.addColorStop(0,'rgba(20,10,30,.35)');sh.addColorStop(1,'rgba(20,10,30,0)');c.fillStyle=sh;c.fillRect(266,380,34,120);
      c.restore();
      // dining room: two regulars sharing one milkshake
      cut(()=>c.roundRect(352,426,82,46,4),'#c9d0dc',INK,3,0);
      c.save();c.beginPath();c.rect(356,430,78,38);c.clip();
      const sg=c.createLinearGradient(0,430,0,468);sg.addColorStop(0,'#ffe9a8');sg.addColorStop(1,'#ffb36b');c.fillStyle=sg;c.fillRect(356,430,78,38);
      const sil='rgba(84,40,96,.72)';
      for(const x of[374,412]){c.fillStyle=sil;c.beginPath();ell(x,452,8,9);ell(x,468,13,8);c.fill();stroke([[x-3,445],[x-6,436]],sil,2);stroke([[x+3,445],[x+6,436]],sil,2);circ(x-6,435,2.4,sil,null);circ(x+6,435,2.4,sil,null);}
      cutPoly([[386,450],[398,450],[396,462],[388,462]],'#ff85a3',null,0,0);stroke([[389,450],[384,440]],'#fff3c5',1.5);stroke([[395,450],[400,440]],'#fff3c5',1.5);circ(392,448,5,'#fff3c5',null);
      c.fillStyle='rgba(120,46,62,.55)';c.fillRect(356,462,78,6);
      c.fillStyle='rgba(255,255,255,.3)';c.beginPath();poly([[360,468],[372,468],[392,430],[380,430]]);c.fill();
      c.restore();
      // pickup window (the fry cook is painted live on top)
      cut(()=>c.roundRect(280,426,58,50,6),'#c9d0dc',INK,3,3);
      const wg=c.createLinearGradient(0,430,0,472);wg.addColorStop(0,'#fff1b8');wg.addColorStop(1,'#ffb067');c.fillStyle=wg;c.fillRect(284,430,50,42);
      c.fillStyle='rgba(120,60,40,.35)';for(const x of[290,300,318,328])c.fillRect(x,433,6,9);
      for(let i=0;i<6;i++){const x=276+i*11;c.fillStyle=i%2?'#fff3c5':'#ff5d86';c.beginPath();c.moveTo(x,418);c.lineTo(x+11,418);c.lineTo(x+11,428);c.arc(x+5.5,428,5.5,0,Math.PI);c.closePath();c.fill();}
      c.lineWidth=2.5;c.strokeStyle=INK;c.beginPath();c.moveTo(276,418);c.lineTo(342,418);c.lineTo(342,428);for(let i=5;i>=0;i--)c.arc(281.5+i*11,428,5.5,0,Math.PI);c.closePath();c.stroke();
      cut(()=>c.roundRect(274,474,72,7,2),'#9aa3b8',INK,2.5,2);
      // the roof, a vent for the fryer and an atomic starburst
      cut(()=>c.roundRect(338,roofY(344)-24,13,24,2),'#9aa3b8',INK,2.5,3);cut(()=>c.roundRect(334,roofY(344)-28,21,6,2),'#7d869c',INK,2,0);
      cutPoly([[252,roofY(252)],[438,roofY(438)],[438,roofY(438)+14],[258,roofY(258)+14]],'#53e8cb',INK,3.5,5);
      stroke([[258,roofY(258)+9],[436,roofY(436)+9]],'#ff5d86',3);
      stroke([[296,roofY(296)],[296,roofY(296)-24]],INK,3);
      c.save();c.translate(296,roofY(296)-30);
      for(let i=0;i<8;i++){const a=i*TAU/8,len=i%2?10:16;stroke([[0,0],[Math.cos(a)*len,Math.sin(a)*len]],INK,4);stroke([[0,0],[Math.cos(a)*len,Math.sin(a)*len]],'#fdf071',2);circ(Math.cos(a)*len,Math.sin(a)*len,2.6,i%2?'#ff5d86':'#53e8cb',INK,1.2);}
      circ(0,0,4.5,'#fdf071',INK,2);c.restore();
    });
  }
  function dtGround(){
    return layer('beamSet:dt_ground',420,640,()=>{
      cutPoly([[0,500],[420,500],[420,640],[0,640]],'#1c1631',INK,3,0);
      c.fillStyle='#3a3157';c.fillRect(0,500,420,9);stroke([[0,509],[420,509]],INK,2);
      for(let x=0;x<130;x+=26){c.fillStyle='#fdf071';c.fillRect(x,501,13,8);}
      for(let x=24;x<420;x+=70){c.fillStyle='rgba(253,240,113,.5)';c.beginPath();poly([[x,548],[x+14,548],[x+24,555],[x+14,562],[x,562],[x+10,555]]);c.fill();}
      c.save();c.globalAlpha=.2;c.translate(72,594);c.scale(1,.7);txt('DRIVE THRU',0,0,20,'#fff3c5','center',null,1000);c.restore();
      c.fillStyle='rgba(8,4,18,.35)';c.beginPath();ell(330,590,30,6);ell(150,628,22,4);c.fill();
      stroke([[0,604],[420,604]],'#2a2348',2);
    });
  }
  function dtTraffic(pt){
    for(let i=0;i<5;i++){const dir=i%2?-1:1,x=((i*131+pt*(26+i*7)*dir)%520+520)%520-50;
      glowAt(x,457,9,dir>0?'255,240,180':'255,90,90',.55);circ(x,457,1.5,dir>0?'#fff6d0':'#ff6b6b',null);}
  }
  function pylonNeon(pt){
    const lit=Math.sin(pt*13)*Math.sin(pt*3.3)>-.6,buzz=.85+.15*Math.sin(pt*40);
    glowAt(58,262,86,'255,93,170',(lit?.34:.12)*buzz);
    txt("ZORP'S",58,261,19,lit?'#fff2f8':'#7a3550','center',lit?'#ff3f8a':INK);
    const chase=Math.floor(pt*8*motion);
    for(let i=0;i<9;i++){const a=Math.PI*(.12+.76*i/8),on=(i+chase)%3===0;circ(58-Math.cos(a)*50,263+Math.sin(a)*13,2.4,on?'#fdf071':'#6a5a40',INK,1);}
    const bl=Math.sin(pt*4)>0;glowAt(58,214,12,'253,240,113',bl?.8:.2);circ(58,214,3.5,bl?'#fdf071':'#8a7a52',INK,1.5);
    const arrow=.6+.4*Math.sin(pt*6);glowAt(116,309,22,'255,93,134',.5*arrow);
    cutPoly([[106,300],[124,309],[106,318]],arrow>.7?'#ff8fb1':'#ff5d86',INK,2.5,0);
  }
  // The fry cook watches your thing, gasps at a good beam, facepalms at a
  // miss and cheers when the order is complete. Pure reaction; no input.
  function fryCook(pt){
    const u=state.ufo,req=activePlan.round_modifiers?.round2_beam?.target_catches||2;
    const at=state.aftermath&&state.round===1?state.aftermath.time:0;
    const done=u.hits>=req||at>0,mood=done?'cheer':u.beam>0?(u.beamGood?'wow':'oops'):u.abduct>0?'wow':'idle';
    const look=clamp((targetX()-309)/160,-1,1),cheer=mood==='cheer';
    const bob=Math.sin(pt*(cheer?9:2.2))*(cheer?2.5:1)*motion,hx=309+look*2,hy=451+bob;
    c.save();c.beginPath();c.rect(284,430,50,42);c.clip();
    cut(()=>ell(309,477,20,13),'#ff85a3',INK,2.5,0);
    stroke([[303,466],[309,472],[315,466]],'#fff3c5',2.5);
    for(const s of[-1,1]){stroke([[hx+s*5,hy-10],[hx+s*9,hy-16]],INK,2);circ(hx+s*9,hy-17,2.3,'#fdf071',INK,1.2);}
    cut(()=>ell(hx,hy,13,12),'#8ef06a',INK,2.5,0);
    cutPoly([[hx-11,hy-8],[hx+11,hy-8],[hx+8,hy-16],[hx-8,hy-16]],'#fff3c5',INK,1.8,0);c.fillStyle='#ff5d86';c.fillRect(hx-10,hy-11,20,2.4);
    c.fillStyle='rgba(255,128,150,.5)';c.beginPath();ell(hx-8,hy+4,3,2);ell(hx+8,hy+4,3,2);c.fill();
    const ex=hx+look*2.5,ey=hy-1;
    if(cheer){c.beginPath();c.arc(ex,ey+3,5,Math.PI*1.15,Math.PI*1.85);c.strokeStyle=INK;c.lineWidth=2.4;c.stroke();}
    else if(mood==='oops'){stroke([[ex-4,ey-4],[ex+4,ey+4]],INK,2.2);stroke([[ex+4,ey-4],[ex-4,ey+4]],INK,2.2);}
    else{
      const big=mood==='wow'?7.5:6.5;circ(ex,ey,big,'#fff',INK,2);circ(ex+look*2.2,ey+.5,mood==='wow'?2.2:3,INK,null);circ(ex+look*2.2-1,ey-.8,1,'#fff',null);
      if(mood==='idle'){const blink=(pt%3.4)<.13;c.save();c.beginPath();ell(ex,ey,big,big);c.clip();c.fillStyle='#74d457';c.fillRect(ex-big,ey-big,big*2,blink?big*2:big*1.05);c.restore();
        c.beginPath();ell(ex,ey,big,big);c.strokeStyle=INK;c.lineWidth=2;c.stroke();stroke([[ex-big,ey-big+(blink?big*2:big*1.05)],[ex+big,ey-big+(blink?big*2:big*1.05)]],INK,1.8);}
    }
    if(cheer){c.beginPath();c.moveTo(hx-6,hy+5);c.quadraticCurveTo(hx,hy+14,hx+6,hy+5);c.closePath();c.fillStyle='#5a1a20';c.fill();c.strokeStyle=INK;c.lineWidth=1.6;c.stroke();}
    else if(mood==='wow')cut(()=>ell(hx,hy+7,3.2,4.2),'#5a1a20',INK,1.5,0);
    else if(mood==='oops'){c.beginPath();c.moveTo(hx-5,hy+8);for(let i=1;i<=4;i++)c.lineTo(hx-5+i*2.5,hy+8+(i%2?-1.6:1.6));c.strokeStyle=INK;c.lineWidth=1.8;c.stroke();}
    else{const ch=Math.sin(pt*7)*motion;stroke([[hx-4,hy+7+ch*.4],[hx+4,hy+7-ch*.4]],INK,2);
      const gp=(pt%4.5)/4.5;if(gp>.6&&gp<.94)circ(hx+5,hy+8,2+9*((gp-.6)/.34),'rgba(255,133,163,.85)',INK,1.2);}
    c.beginPath();c.arc(hx,hy-1,14.5,Math.PI*1.08,Math.PI*1.92);c.strokeStyle=INK;c.lineWidth=2;c.stroke();
    stroke([[hx-14,hy],[hx-10,hy+8],[hx-5,hy+9]],INK,1.6);circ(hx-5,hy+9,1.6,INK,null);
    const arm=pts=>{curve(pts,INK,5);curve(pts,'#8ef06a',3);const e=pts[pts.length-1];circ(e[0],e[1],3,'#8ef06a',INK,1.5);};
    if(cheer){const w=Math.sin(pt*14)*3*motion;arm([[293,469],[287,452],[289+w,437]]);arm([[325,469],[331,452],[329-w,437]]);}
    else if(mood==='wow'){arm([[293,469],[291,458],[298,451]]);arm([[325,469],[327,458],[320,451]]);}
    else if(mood==='oops')arm([[325,469],[323,456],[ex+2,ey-1]]);
    c.restore();
    c.save();c.globalAlpha=.2;c.fillStyle='#fff';c.beginPath();poly([[288,472],[297,472],[317,430],[308,430]]);c.fill();c.restore();
    if(done){cut(()=>c.roundRect(326,457,16,18,2),'#d9a066',INK,2,2);stroke([[326,461],[342,461]],'#a8743e',1.5);cut(()=>ell(334,468,5,2.4),'#b5b3e4',INK,1.2,0);}
  }
  function snackCritter(x,y,col,label,pt,i){
    const step=Math.sin(pt*9+x*.05)*motion,look=clamp((210-x)/150,-1,1);
    groundShadow(x,y+25,24,.35);
    c.save();c.translate(x,y);c.rotate(Math.sin(pt*3+x*.02)*.08*motion);
    stroke([[-11,15],[-11+step*4,25]],INK,3);stroke([[11,15],[11-step*4,25]],INK,3);
    let ey=-4;
    if(i%2===0){
      // a soda with legs and opinions
      cutPoly([[-21,-20],[21,-20],[16,17],[-16,17]],col,INK,3.5,4);
      c.save();c.beginPath();poly([[-21,-20],[21,-20],[16,17],[-16,17]]);c.clip();c.fillStyle='rgba(255,255,255,.55)';c.fillRect(-25,4,50,6);c.restore();
      cut(()=>c.roundRect(-24,-27,48,8,3),'#fff3c5',INK,2.5,0);
      curve([[5,-27],[8,-40],[18,-46]],INK,5.5);curve([[5,-27],[8,-40],[18,-46]],'#53e8cb',3);
    }else{
      // a clamshell burger box that won't stop talking
      const flap=Math.max(0,Math.sin(pt*6+x*.03))*.38*motion;
      cut(()=>c.roundRect(-25,-6,50,23,5),col,INK,3.5,4);
      c.save();c.translate(-25,-6);c.rotate(-flap);c.translate(25,6);
      cut(()=>ell(0,-9,20,6),'#c96b3a',INK,2,0);c.strokeStyle='#5fbf4a';c.lineWidth=3;c.beginPath();for(let k=0;k<=8;k++){const xx=-20+k*5;k?c.lineTo(xx,-4+(k%2?2:0)):c.moveTo(xx,-4);}c.stroke();
      cut(()=>{c.moveTo(-25,-6);c.quadraticCurveTo(-25,-28,0,-28);c.quadraticCurveTo(25,-28,25,-6);c.closePath();},col,INK,3.5,0);
      for(const[dx,dy]of[[-9,-20],[3,-23],[12,-17]])c.fillRect(dx,dy,3,1.6);
      c.restore();ey=4;
    }
    for(const s of[-1,1]){circ(s*9,ey,5.5,'#fff',INK,2);circ(s*9+look*2,ey-1.5,2.4,INK,null);}
    c.restore();
    txt(label,x,y+37,9,'#fff3bd');
  }
  const BEAM_SETS={
    night_farm:{
      back(pt){const o1=-(pt*4%420),far=beamFar();c.drawImage(far,o1,0);c.drawImage(far,o1+420,0);},
      front(){c.drawImage(beamRoad(),0,0);},
      critter
    },
    alien_drive_through:{
      back(pt){c.drawImage(dtFar(),0,0);dtTraffic(pt);c.drawImage(dtBuilding(),0,0);pylonNeon(pt);fryCook(pt);},
      front(){c.drawImage(dtGround(),0,0);},
      critter:snackCritter
    }
  };

  // PROPS ─ the farm panorama, floating menus or roadside snack ads
  function hoverBoard(key,x,y,w,h,pt,ph,paint){
    const bob=Math.sin(pt*1.6+ph)*4*motion,tilt=Math.sin(pt*1.1+ph)*.03*motion,by=y+h/2+bob;
    glowAt(x,by+12,24,'127,242,212',.3+.12*Math.sin(pt*5+ph));
    c.save();c.globalAlpha=.22;c.fillStyle='#7ff2d4';c.beginPath();poly([[x-9,by],[x+9,by],[x+16,by+24],[x-16,by+24]]);c.fill();c.restore();
    for(const s of[-1,1])cut(()=>ell(x+s*w*.3,by+1,6,3),'#9aa3b8',INK,1.5,0);
    c.save();c.translate(x,y+bob);c.rotate(tilt);
    c.drawImage(layer(key,w+16,h+16,()=>{c.translate(6,6);paint();}),-w/2-6,-h/2-6);
    c.restore();
  }
  function menuItem(y,icon,name,price){
    icon(14,y);txt(name,25,y,7,'#fff3c5','left',null,900);txt(price,85,y,8,'#fdf071','right',null,1000);
  }
  function menuBoardA(){
    cut(()=>c.roundRect(0,0,92,64,5),'#1d1733','#53e8cb',3,4);
    rect(4,4,84,13,'#ff5d86',null,0,2);txt('MENU',46,11,10,'#fff3c5','center',null,1000);
    menuItem(27,(x,y)=>{cutPoly([[x-5,y-1],[x+5,y-1],[x+4,y+5],[x-4,y+5]],'#e2464e',INK,1,0);for(const dx of[-3,0,3])c.fillStyle='#fdf071',c.fillRect(x+dx-1,y-6,2,6);},'COMET FRIES','3¢');
    menuItem(40,(x,y)=>{cutPoly([[x-4,y-5],[x+4,y-5],[x+3,y+5],[x-3,y+5]],'#fff3c5',INK,1,0);circ(x-1,y-1,1.4,INK,null);circ(x+1.5,y+2,1,INK,null);stroke([[x+1,y-5],[x+3,y-9]],'#ff5d86',1.5);},'MOO-SHAKE','5¢');
    menuItem(53,(x,y)=>{circ(x,y,4,'#e7a663',INK,1);c.strokeStyle='#53e8cb';c.lineWidth=1.5;c.beginPath();ell(x,y,7,2,-.3);c.stroke();},'SPACE NUGS','9¢');
  }
  function menuBoardB(){
    cut(()=>c.roundRect(0,0,76,44,5),'#fdf071',INK,3,4);
    txt('TODAY ONLY',38,10,7,'#e13668','center',null,1000);
    txt('ABDUCT-A-',38,23,11,INK,'center',null,1000);txt('MEAL',38,35,11,INK,'center',null,1000);
  }
  function snackBillboard(){
    cut(()=>c.roundRect(0,0,96,62,5),'#fff3c5',INK,3,4);
    // a burger that is also a saucer
    cut(()=>{c.moveTo(6,30);c.quadraticCurveTo(6,12,22,12);c.quadraticCurveTo(38,12,38,30);c.closePath();},'#e7a663',INK,2,0);
    for(const[dx,dy]of[[14,20],[22,17],[29,22],[18,25]])c.fillStyle='#fff3c5',c.fillRect(dx,dy,2.5,1.5);
    cut(()=>ell(22,33,19,4),'#5a2d22',INK,1.5,0);
    c.strokeStyle='#5fbf4a';c.lineWidth=2.5;c.beginPath();for(let k=0;k<=8;k++){const xx=4+k*4.5;k?c.lineTo(xx,37+(k%2?2:0)):c.moveTo(xx,37);}c.stroke();
    cut(()=>ell(22,43,20,5),'#b5b3e4',INK,1.8,0);
    for(let k=0;k<5;k++)circ(8+k*7,44,1.4,k%2?'#fdf071':'#ff5d86',null);
    txt('BILLIONS',68,17,9,INK,'center',null,1000);txt('SERVED',68,29,9,INK,'center',null,1000);
    txt('0 RETURNED',69,47,6.5,'#e13668','center',null,1000);
  }
  function sodaMascot(pt,tx){
    const base=roofY(400),wob=Math.sin(pt*2.4)*.05*motion,look=clamp((tx-400)/200,-1,1);
    c.save();c.translate(400,base);c.rotate(wob);
    cutPoly([[-17,-58],[17,-58],[12,0],[-12,0]],'#ff5d86',INK,3,4);
    c.save();c.beginPath();poly([[-17,-58],[17,-58],[12,0],[-12,0]]);c.clip();c.fillStyle='#fff3c5';for(const y of[-42,-22])c.fillRect(-20,y,40,6);c.restore();
    cut(()=>c.roundRect(-20,-64,40,8,3),'#fff3c5',INK,2.5,0);
    const sw=Math.sin(pt*3)*4*motion;curve([[6,-64],[8,-80],[18+sw,-88]],INK,6);curve([[6,-64],[8,-80],[18+sw,-88]],'#53e8cb',3.5);
    for(const s of[-1,1]){circ(s*7,-34,5.5,'#fff',INK,2);circ(s*7+look*2,-34,2.4,INK,null);}
    c.beginPath();c.arc(0,-24,5,.2,Math.PI-.2);c.strokeStyle=INK;c.lineWidth=2;c.stroke();
    c.restore();
  }
  function trashCan(pt,tx){
    const x=128,peek=.5+.5*Math.sin(pt*1.3),look=clamp((tx-x)/160,-1,1);
    cut(()=>c.roundRect(x-15,468,30,32,3),'#7d869c',INK,2.5,3);
    for(const dx of[-7,0,7])stroke([[x+dx,472],[x+dx,496]],'#5f6880',2);
    c.fillStyle='#14101f';c.beginPath();ell(x,468,15,4);c.fill();
    circ(x-3+look*3,466-peek*2,3.2,'#fff',INK,1.2);circ(x-3+look*4,466-peek*2,1.4,INK,null);
    c.save();c.translate(x+15,467);c.rotate(-.3-peek*.25*motion);cut(()=>c.roundRect(-32,-5,34,6,3),'#9aa3b8',INK,2,0);c.restore();
    cut(()=>c.roundRect(x-12,480,24,9,2),'#fdf071',INK,1.5,0);txt('FEED ME',x,484.5,5.5,INK,'center',null,1000);
  }
  const BEAM_PROPS={
    barn_silo(pt){const o2=-(pt*9%420),farm=beamFarm();c.drawImage(farm,o2,0);c.drawImage(farm,o2+420,0);windmill(372+o2,428,pt);windmill(372+o2+420,428,pt);},
    menu_boards(pt){
      hoverBoard('beamProps:menu_a',364,204,92,64,pt,0,menuBoardA);
      hoverBoard('beamProps:menu_b',374,290,76,44,pt,2.2,menuBoardB);
      c.drawImage(layer('beamProps:order_post',420,640,()=>{
        cut(()=>c.roundRect(118,464,8,36,2),'#5b5280',INK,2.5,3);
        cut(()=>c.roundRect(106,438,32,28,4),'#2a1f45',INK,2.5,3);
        for(let y=446;y<462;y+=4)stroke([[112,y],[124,y]],'#4a4166',1.5);circ(131,447,2.4,'#ff5d86',INK,1);
        cut(()=>c.roundRect(102,424,40,12,2),'#fdf071',INK,2,2);txt('ORDER HERE',122,430,6,INK,'center',null,1000);
      }),0,0);
    },
    snack_ads(pt,tx){
      hoverBoard('beamProps:billboard',366,210,96,62,pt,1,snackBillboard);
      sodaMascot(pt,tx);trashCan(pt,tx);
    }
  };

  // FX ─ starlight, neon buzz or fryer steam
  const BEAM_FX={
    night_breeze:{
      back(pt){
        for(let i=0;i<10;i++){const x=(i*97+40)%410,y=118+(i*53)%260;twinkle(x,y,(3+i%3)*(.6+.4*Math.sin(pt*1.6+i*1.3)),'#fff3c5',i);}
        const ss=(pt/6)%1;if(ss<.12&&!reducedMotion){const k=ss/.12;c.save();c.globalAlpha=1-k;stroke([[400-k*300,118+k*90],[430-k*300,108+k*90]],'#fff3c5',2.5);c.restore();}
      },
      front(){}
    },
    neon_buzz:{
      back(pt){for(let i=0;i<6;i++){const tw=Math.sin(pt*2.1+i*1.7);if(tw>0)twinkle(150+i*41,118+((i*47)%90),2+3*tw,'#ffe1f0',i);}},
      front(pt){
        glowAt(330,506,120,'255,93,134',(.12+.05*Math.sin(pt*9))*motion+.05,.22);
        moths(pt,58,238,3,58);
        if((pt*1.3)%1<.12&&!reducedMotion)for(let k=0;k<3;k++)twinkle(108+k*6,300+k*7,3,'#fff6c9',pt*9+k);
      }
    },
    fryer_steam:{
      back(){},
      front(pt){
        for(let i=0;i<5;i++){const ph=(pt*.32+i/5)%1;c.globalAlpha=(1-ph)*.38;circ(344-ph*26+Math.sin(ph*5+i)*5,roofY(344)-30-ph*96,6+ph*20,'#f3ecf8',null);}
        for(let i=0;i<3;i++){const ph=(pt*.5+i/3)%1;c.globalAlpha=(1-ph)*.3;circ(332+Math.sin(ph*6+i)*4,468-ph*34,3+ph*8,'#fff6ea',null);}
        c.globalAlpha=1;
        glowAt(309,450,44,'255,214,140',.18+.06*Math.sin(pt*3));
      }
    }
  };

  // ── 03 DODGE IT · a volcano with opinions ───────────────────────────
  // Stage Machine v2 splits the original volcano into slots (sky, ridge,
  // cone, embers, sign, lava lake) and adds INDUSTRIAL MELTDOWN, a foundry
  // whose hazards are molten scrap. Lanes, spawns, speeds, radii and hit
  // tests all live in update(); every world only paints them.
  const RIVULETS=[[[196,240],[180,284],[194,330],[166,372],[170,420],[150,470]],[[222,242],[238,292],[222,340],[250,384],[244,430],[266,492]],[[208,242],[203,276],[216,304],[210,330]]];
  function volcanoSky(eclipse){
    return layer(eclipse?'dodgeAtm:eclipse_glow':'dodgeAtm:sunset_haze',420,640,()=>{
      const g=c.createLinearGradient(0,100,0,520);
      if(eclipse){g.addColorStop(0,'#2e0f2e');g.addColorStop(.45,'#8f2c4c');g.addColorStop(1,'#ff5a4a');}
      else{g.addColorStop(0,'#ffcf8a');g.addColorStop(.45,'#ff9670');g.addColorStop(1,'#ff4f6a');}
      c.fillStyle=g;c.fillRect(0,0,420,640);
      if(eclipse){
        let s=12;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
        for(let i=0;i<40;i++){c.globalAlpha=.3+r()*.5;circ(r()*420,100+r()*180,.6+r()*1.1,'#ffe3c8',null);}c.globalAlpha=1;
        glowAt(74,170,150,'255,200,140',.75);
        c.save();c.translate(74,170);for(let i=0;i<18;i++){c.rotate(TAU/18);c.fillStyle='rgba(255,226,170,.28)';c.beginPath();c.moveTo(-4,-50);c.lineTo(0,-78-(i%3)*10);c.lineTo(4,-50);c.closePath();c.fill();}c.restore();
        circ(74,170,52,'#2a0f24','#ffe7a0',4);
        c.fillStyle='rgba(255,231,160,.55)';c.beginPath();ell(58,154,10,5,-.6);c.fill();
      }else{
        glowAt(74,170,125,'255,240,180',.6);
        for(let i=3;i>0;i--){c.globalAlpha=.12;circ(74,170,56+i*12,'#fff5ba',null);}c.globalAlpha=1;
        circ(74,170,52,'#fff5ba','#ffd98a',3);
      }
      cutPoly([[0,360],[40,318],[78,340],[124,298],[170,336],[250,322],[300,290],[352,330],[392,306],[420,322],[420,520],[0,520]],'#e08494',null,0,0);
      const hz=c.createLinearGradient(0,300,0,380);hz.addColorStop(0,'rgba(255,200,150,0)');hz.addColorStop(1,'rgba(255,200,150,.45)');c.fillStyle=hz;c.fillRect(0,300,420,80);
    });
  }
  function basaltRidge(){
    return layer('dodgeProps:basalt_ridge',420,640,()=>{
      cutPoly([[-10,440],[56,352],[104,384],[150,348],[204,446]],'#a74c6e',INK,3,4);
      cutPoly([[226,446],[300,362],[338,390],[384,342],[430,376],[430,452]],'#a74c6e',INK,3,4);
    });
  }
  function volcanoCone(){
    return layer('dodgeSet:volcano',420,640,()=>{
      cutPoly([[22,500],[176,236],[244,236],[398,500]],'#6b2d52',INK,4,6);
      cutPoly([[214,238],[244,236],[398,500],[268,500]],'#5a2446',null,0,0);
      stroke([[176,238],[22,500]],'#8c3f68',3);
      cut(()=>ell(210,236,35,9),'#ffcd63',INK,3,0);circ(210,238,18,'rgba(255,241,168,.7)',null);
      const hz2=c.createLinearGradient(0,380,0,520);hz2.addColorStop(0,'rgba(255,170,120,0)');hz2.addColorStop(1,'rgba(255,170,120,.5)');c.fillStyle=hz2;c.fillRect(0,380,420,140);
    });
  }
  function volcanoBack(pt){
    c.drawImage(volcanoCone(),0,0);
    for(let i=0;i<8;i++){const ph=(pt*.22+i/8)%1,x=210+ph*70+Math.sin(ph*6+i)*10,y=226-ph*150,r=9+ph*30;c.save();c.globalAlpha=(1-ph)*.7;cut(()=>ell(x,y,r,r*.85),i%2?'#8a5276':'#77456b',INK,2,0);circ(x-r*.3,y-r*.3,r*.32,'rgba(255,200,160,.35)',null);c.restore();}
    glowAt(210,236,70,'255,205,99',.55+.15*Math.sin(pt*2));
    for(const r of RIVULETS){curve(r,'#68263d',10);curve(r,'#ff6a3a',7);curve(r,'#ffb347',3.5);c.save();c.setLineDash([9,21,4,14]);c.lineDashOffset=-pt*30;curve(r,'#fff1a8',2.2);c.restore();}
    const er=(pt/2.6)%1;if(er<.5)for(let j=0;j<3;j++){const k=er/.5;circ(210+(j-1)*58*k,232-130*k+230*k*k-j*6,4+j,'#ffcd63',INK,2);}
  }
  function volcanoSign(){
    c.save();c.translate(210,442);
    rect(-74,10,6,26,'#6a3d2f',INK,2,1);rect(68,10,6,26,'#6a3d2f',INK,2,1);
    cut(()=>c.roundRect(-100,-14,200,28,5),'#fdf071',INK,3,4);
    c.save();c.beginPath();c.roundRect(-100,-14,200,28,5);c.clip();c.fillStyle=INK;for(const x0 of[-100,84])for(let i=0;i<3;i++){c.beginPath();poly([[x0+i*8-6,14],[x0+i*8,14],[x0+i*8+8,-14],[x0+i*8+2,-14]]);c.fill();}c.restore();
    txt('!!! ACTIVE VOLCANO !!!',0,1,12,INK,'center',null,1000);
    c.restore();
  }
  function lavaLake(){
    const pt=state.playTime,top=x=>522+Math.sin(x*.035+pt*1.8)*4*motion+Math.sin(x*.09-pt*2.6)*2*motion;
    const g=c.createLinearGradient(0,520,0,640);g.addColorStop(0,'#ff9a3c');g.addColorStop(.5,'#ff6a3a');g.addColorStop(1,'#d8344a');
    c.beginPath();c.moveTo(0,640);for(let x=0;x<=420;x+=15)c.lineTo(x,top(x));c.lineTo(420,640);c.closePath();
    c.fillStyle=g;c.fill();c.lineWidth=4;c.strokeStyle='#68263d';c.stroke();
    c.beginPath();for(let x=0;x<=420;x+=15){const y=top(x)+5;x?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#ffe08b';c.lineWidth=3;c.stroke();
    c.save();
    for(let j=0;j<4;j++){const y0=548+j*22,dir=j%2?-1:1;
      c.setLineDash([46+j*8,26]);c.lineDashOffset=-pt*(22+j*10)*dir;c.strokeStyle=j%2?'#ffd36b':'#ffb04a';c.lineWidth=5-j*.8;c.beginPath();
      for(let x=-10;x<=430;x+=20){const y=y0+Math.sin(x*.045+pt*1.4*dir+j)*4;x===-10?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}
    c.restore();
    for(let i=0;i<4;i++){const x=((i*131+40-pt*(10+i*3))%520+520)%520-50,y=566+(i*23)%46;
      cutPoly([[x,y],[x+20,y-5],[x+34,y+1],[x+28,y+9],[x+6,y+8]],'#8c3243','#68263d',2,0);stroke([[x+8,y+2],[x+16,y+4],[x+24,y+1]],'#ffb35a',1.5);}
    for(let i=0;i<6;i++){const per=1.7+i*.23,ph=(pt/per+i*.37)%1,x=(i*71+37)%390+15,y=560+(i*29)%56;
      if(ph<.72){const r=2+8*ease.out(ph/.72);cut(()=>ell(x,y,r,r*.85),'#ffb34f','#68263d',2,0);circ(x-r*.35,y-r*.35,r*.25,'#fff1b0',null);}
      else{const q=(ph-.72)/.28;c.save();c.globalAlpha=1-q;c.strokeStyle='#ffe08b';c.lineWidth=2;c.beginPath();ell(x,y,10+16*q,(10+16*q)*.3);c.stroke();
        for(let k=0;k<4;k++){const a=-Math.PI*(.15+.7*k/3);circ(x+Math.cos(a)*18*q,y+Math.sin(a)*24*Math.sin(Math.PI*q),2.5,'#ffcd63',null);}c.restore();}
    }
  }
  function rockShadow(r){
    if(r.y>556)return;const k=clamp((r.y+40)/596,0,1);
    c.save();c.globalAlpha=.14+.36*k;c.fillStyle='#3a1230';c.beginPath();ell(r.x,557,r.r*(.35+.85*k),4+3*k);c.fill();c.restore();
  }
  function rock(r){
    const pt=state.playTime,fl=Math.sin(pt*22+r.x)*.5+.5,L=r.r*(2.4+.5*fl*motion);
    glowAt(r.x,r.y,r.r*1.9,'255,130,70',.5);
    const tear=(w,len,col)=>{c.beginPath();c.moveTo(r.x-w,r.y);c.quadraticCurveTo(r.x-w*.8,r.y-len*.55,r.x+Math.sin(pt*14+r.x)*4*motion,r.y-len);c.quadraticCurveTo(r.x+w*.8,r.y-len*.55,r.x+w,r.y);c.arc(r.x,r.y,w,0,Math.PI);c.closePath();c.fillStyle=col;c.fill();};
    tear(r.r*.95,L,'#ff6f4f');tear(r.r*.7,L*.72,'#ffb34f');tear(r.r*.42,L*.45,'#fff1a8');
    for(let j=0;j<3;j++)circ(r.x+Math.sin(pt*3+j+r.x)*5,r.y-L-8-j*15,5+j*3,`rgba(91,51,89,${.5-j*.14})`,null);
    c.save();c.translate(r.x,r.y);c.rotate(r.a);
    const pts=[];for(let i=0;i<8;i++){const a=i*TAU/8,k=.8+.2*Math.sin(i*2.7+r.r);pts.push([Math.cos(a)*r.r*k,Math.sin(a)*r.r*k]);}
    cutPoly(pts,'#2c2440',INK,3.5,0);
    cutPoly([[-r.r*.5,-r.r*.35],[r.r*.1,-r.r*.6],[r.r*.4,-r.r*.1],[-r.r*.1,r.r*.2]],'#43395e',null,0,0);
    c.strokeStyle=fl>.5?'#ffb35a':'#ff8d58';c.lineWidth=2.5;c.lineCap='round';c.beginPath();c.moveTo(-r.r*.55,r.r*.05);c.lineTo(-r.r*.1,r.r*.18);c.lineTo(r.r*.25,-r.r*.25);c.moveTo(-r.r*.1,r.r*.18);c.lineTo(r.r*.1,r.r*.58);c.stroke();
    circ(-r.r*.1,r.r*.18,2.5,'#ffe399',null);
    c.restore();
  }
  // SET ─ INDUSTRIAL MELTDOWN: a steel-blue blast furnace with a white-hot
  // mouth, a gantry and a pouring ladle, pipes, and a conveyor of doomed
  // rubber ducks. Rectilinear and tall where the volcano is one big cone.
  function factorySkyline(col,lit){
    const saw=[[0,476],[0,410]];for(let x=0;x<140;x+=28)saw.push([x+22,388],[x+28,410]);saw.push([140,410],[140,476]);
    cutPoly(saw,col,null,0,0);
    cutPoly([[286,476],[286,404],[340,404],[340,420],[420,420],[420,476]],col,null,0,0);
    cut(()=>{c.moveTo(166,476);c.quadraticCurveTo(184,432,172,394);c.lineTo(222,394);c.quadraticCurveTo(210,432,228,476);c.closePath();},col,null,0,0);
    for(const[x,w,h]of[[44,13,150],[76,9,118],[300,15,186],[344,10,134],[384,12,112]]){c.fillStyle=col;c.fillRect(x,476-h,w,h);c.fillStyle=lit;c.fillRect(x,476-h+8,w,3);c.fillRect(x,476-h+18,w,3);}
    let s=909;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
    for(let i=0;i<26;i++){const wx=r()<.5?8+r()*120:296+r()*116,wy=426+r()*42;c.fillStyle=r()<.75?lit:'rgba(127,242,212,.6)';c.fillRect(wx,wy,3.5,4.5);}
  }
  function stackPlumes(col){
    for(const[x,y]of[[50,320],[307,284],[349,336]])for(let k=0;k<4;k++){c.fillStyle=col;c.beginPath();ell(x+k*15+k*k*3,y-k*16,8+k*6,6+k*4);c.fill();}
  }
  // ATMOSPHERE
  function smogDusk(){
    return layer('dodgeAtm:smog_dusk',420,640,()=>{
      const g=c.createLinearGradient(0,100,0,520);
      g.addColorStop(0,'#2a1830');g.addColorStop(.4,'#5e2a3e');g.addColorStop(.75,'#b5503e');g.addColorStop(1,'#f08a46');
      c.fillStyle=g;c.fillRect(0,0,420,640);
      // a tired red sun, striped by smog
      glowAt(322,262,150,'255,170,100',.5);
      circ(322,262,58,'#ffc983',null);
      c.save();c.beginPath();ell(322,262,58,58);c.clip();c.fillStyle='rgba(181,80,62,.55)';for(let i=0;i<5;i++)c.fillRect(260,234+i*16,130,3+i*1.5);c.restore();
      for(let k=0;k<3;k++){c.fillStyle='rgba(60,24,48,.16)';c.beginPath();c.moveTo(0,190+k*52);for(let x=0;x<=420;x+=30)c.lineTo(x,190+k*52+Math.sin(x*.02+k*2)*9);c.lineTo(420,208+k*52);c.lineTo(0,208+k*52);c.closePath();c.fill();}
      stackPlumes('rgba(70,36,58,.34)');
      factorySkyline('#3d1f36','rgba(255,200,120,.75)');
      const hz=c.createLinearGradient(0,380,0,480);hz.addColorStop(0,'rgba(240,138,70,0)');hz.addColorStop(1,'rgba(240,138,70,.35)');c.fillStyle=hz;c.fillRect(0,380,420,100);
    });
  }
  function nightShift(){
    return layer('dodgeAtm:night_shift',420,640,()=>{
      const g=c.createLinearGradient(0,100,0,520);
      g.addColorStop(0,'#070b1a');g.addColorStop(.45,'#14203e');g.addColorStop(.78,'#2c3a62');g.addColorStop(1,'#8a4e52');
      c.fillStyle=g;c.fillRect(0,0,420,640);
      starField(321,70,100,240,['#e8efff','#fff3c5']);
      // the moon clocked in too
      glowAt(98,250,100,'220,230,255',.3);
      circ(98,250,28,'#e9eefc',null);
      c.save();c.beginPath();ell(98,250,28,28);c.clip();c.fillStyle='rgba(20,32,62,.82)';c.beginPath();ell(116,241,26,29);c.fill();c.restore();
      c.lineWidth=2.5;c.strokeStyle='#c4cde6';c.beginPath();ell(98,250,28,28);c.stroke();
      c.save();c.translate(86,228);c.rotate(-.38);
      cut(()=>{c.moveTo(-15,0);c.quadraticCurveTo(-15,-16,0,-16);c.quadraticCurveTo(15,-16,15,0);c.closePath();},'#fdd835',INK,2.5,3);
      cut(()=>c.roundRect(-21,-2,42,5,2),'#f2c230',INK,2.5,0);stroke([[0,-16],[0,-3]],'#d9a520',2);
      c.restore();
      stackPlumes('rgba(150,160,210,.1)');
      factorySkyline('#141b33','rgba(255,214,120,.8)');
      for(const[x,h]of[[112,118],[258,98]]){stroke([[x,476],[x,476-h]],'#141b33',5);stroke([[x-28,476-h],[x+46,476-h]],'#141b33',5);stroke([[x+30,476-h],[x+30,476-h+30]],'#141b33',2);circ(x+46,476-h,2.2,'#ff5a5a',null);}
      const hz=c.createLinearGradient(0,380,0,480);hz.addColorStop(0,'rgba(255,140,90,0)');hz.addColorStop(1,'rgba(255,140,90,.28)');c.fillStyle=hz;c.fillRect(0,380,420,100);
    });
  }
  function furnacePath(){
    c.moveTo(148,488);c.lineTo(142,404);c.quadraticCurveTo(138,354,180,326);c.lineTo(194,316);c.lineTo(194,222);
    c.lineTo(226,222);c.lineTo(226,316);c.lineTo(240,326);c.quadraticCurveTo(282,354,278,404);c.lineTo(272,488);c.closePath();
  }
  function pipeRun(pts,w){stroke(pts,INK,w+5);stroke(pts,'#4f7f86',w);stroke(pts.map(([x,y])=>[x-w*.22,y-w*.22]),'#79a9ae',2.5);}
  function foundry(){
    return layer('dodgeSet:foundry',420,640,()=>{
      cutPoly([[0,486],[420,486],[420,522],[0,522]],'#2a2a3e',INK,3,0);
      for(let x=12;x<420;x+=40)circ(x,494,1.6,'#4a4a66',null);
      for(const x of[18,402]){cut(()=>c.roundRect(x-9,150,18,340,2),'#4a3f5e',INK,3,4);c.fillStyle='#3a3150';c.fillRect(x-3,154,6,330);}
      pipeRun([[150,398],[48,398],[48,170]],15);
      for(const[x,y,w,h]of[[86,388,7,20],[40,250,16,7],[40,320,16,7]])cut(()=>c.roundRect(x,y,w,h,2),'#3d6369',INK,2,0);
      stroke([[96,388],[96,378]],INK,3);c.strokeStyle='#e2464e';c.lineWidth=3;c.beginPath();ell(96,376,8,3);c.stroke();
      pipeRun([[272,440],[402,440]],13);
      cut(()=>c.roundRect(330,431,7,18,2),'#3d6369',INK,2,0);
      cut(furnacePath,'#56617f',INK,4,6);
      c.save();c.beginPath();furnacePath();c.clip();
      c.fillStyle='#47506b';c.fillRect(226,200,80,300);
      c.fillStyle='rgba(170,185,220,.28)';c.fillRect(150,332,9,156);c.fillRect(197,224,5,92);
      for(const y of[354,422,472,250,288]){c.fillStyle='#3b4259';c.fillRect(130,y,160,7);for(let x=142;x<282;x+=12)circ(x,y+3.5,1.4,'#8d97b3',null);}
      c.restore();
      cut(()=>c.roundRect(186,210,48,14,3),'#3b4259',INK,3,3);
      // the mouth, bricked and white-hot
      cut(()=>{c.moveTo(182,488);c.lineTo(182,452);c.arc(210,452,28,Math.PI,0);c.lineTo(238,488);c.closePath();},'#2a2f42',INK,3.5,0);
      for(let k=0;k<9;k++){const a=Math.PI+k*Math.PI/8;c.save();c.translate(210+Math.cos(a)*25,452+Math.sin(a)*25);c.rotate(a+Math.PI/2);c.fillStyle=k%2?'#6e3a3a':'#8a4a44';c.fillRect(-3.5,-2,7,4);c.restore();}
      c.save();c.beginPath();c.moveTo(188,488);c.lineTo(188,454);c.arc(210,454,22,Math.PI,0);c.lineTo(232,488);c.closePath();c.clip();
      const mg=c.createLinearGradient(0,432,0,488);mg.addColorStop(0,'#ffb347');mg.addColorStop(.5,'#ffe48a');mg.addColorStop(1,'#fffbe0');c.fillStyle=mg;c.fillRect(184,428,52,62);
      c.restore();
      // DAYS WITHOUT A MELTDOWN: 0
      cut(()=>c.roundRect(166,330,88,38,4),'#fdf071',INK,3,4);
      c.save();c.beginPath();c.rect(168,332,84,5);c.clip();c.fillStyle=INK;for(let x=160;x<260;x+=10){c.beginPath();poly([[x,337],[x+5,337],[x+10,332],[x+5,332]]);c.fill();}c.restore();
      txt('DAYS WITHOUT',198,347,7,INK,'center',null,1000);txt('A MELTDOWN',198,358,7,INK,'center',null,1000);
      rect(228,339,20,25,INK,null,0,3);txt('0',238,352,19,'#fdf071','center',null,1000);
      for(const x of[160,260]){cut(()=>ell(x,392,11,11),'#fff3c5',INK,2.5,2);c.strokeStyle='#e2464e';c.lineWidth=3;c.beginPath();c.arc(x,392,7.5,-.6,.4);c.stroke();}
      // the gantry and its trolley
      cut(()=>c.roundRect(-4,150,428,18,2),'#5a4d70',INK,3,4);
      c.strokeStyle='#3a3150';c.lineWidth=2;c.beginPath();for(let x=-4;x<424;x+=20){c.moveTo(x,153);c.lineTo(x+10,165);c.lineTo(x+20,153);}c.stroke();
      c.save();c.beginPath();c.rect(-4,168,428,6);c.clip();c.fillStyle='#fdf071';c.fillRect(-4,168,428,6);c.fillStyle=INK;for(let x=-10;x<430;x+=14){c.beginPath();poly([[x,174],[x+7,174],[x+13,168],[x+6,168]]);c.fill();}c.restore();
      stroke([[-4,174],[424,174]],INK,2);
      cut(()=>c.roundRect(284,172,36,12,3),'#3b4259',INK,2.5,3);circ(290,172,3,'#8d97b3',INK,1.2);circ(314,172,3,'#8d97b3',INK,1.2);
    });
  }
  function ladle(pt){
    const sway=Math.sin(pt*.9)*.03*motion;
    c.save();c.translate(302,186);c.rotate(sway);
    stroke([[-8,0],[-15,46]],INK,2);stroke([[8,0],[15,46]],INK,2);
    c.translate(0,64);c.rotate(-.42);
    cutPoly([[-24,-18],[24,-18],[18,20],[-18,20]],'#3b4259',INK,3,4);
    stroke([[-23,-9],[23,-9]],'#2a2f42',3);stroke([[-20,10],[20,10]],'#2a2f42',3);
    cutPoly([[-24,-18],[-33,-23],[-27,-12]],'#3b4259',INK,2.5,0);
    cut(()=>ell(0,-18,24,6),'#ffd36b',INK,2.5,0);c.fillStyle='#fff6c4';c.beginPath();ell(-3,-18,12,2.6);c.fill();
    for(const s of[-1,1])circ(s*22,0,4,'#8d97b3',INK,1.5);
    c.restore();
  }
  const POUR=[[265,247],[266,300],[268,380],[269,450],[269,516]];
  function foundryBack(pt){
    c.drawImage(foundry(),0,0);
    for(let i=0;i<6;i++){const ph=(pt*.2+i/6)%1,x=210+ph*48+Math.sin(ph*6+i)*8,y=204-ph*118,r=8+ph*24;c.save();c.globalAlpha=(1-ph)*.6;cut(()=>ell(x,y,r,r*.82),i%2?'#5b627c':'#4d5370',INK,2,0);c.restore();}
    glowAt(210,468,66,'255,210,120',.5+.15*Math.sin(pt*3.1)*motion);
    // the mouth spills a tongue of steel across the floor plate
    cut(()=>{c.moveTo(193,486);c.quadraticCurveTo(201,502,188,522);c.lineTo(232,522);c.quadraticCurveTo(219,502,227,486);c.closePath();},'#ffcf5a',INK,2.5,0);
    c.save();c.setLineDash([6,10]);c.lineDashOffset=-pt*24;stroke([[210,488],[210,520]],'#fff8d0',3);c.restore();
    for(const[x,k]of[[160,0],[260,1.7]]){const a=-2.6+2.9*(.5+.5*Math.sin(pt*(1.7+k)+k))+Math.sin(pt*31+k)*.05*motion;stroke([[x,392],[x+Math.cos(a)*8,392+Math.sin(a)*8]],INK,2);circ(x,392,1.8,INK,null);}
    ladle(pt);
    curve(POUR,'#a8452a',10);curve(POUR,'#ff8a3a',7);curve(POUR,'#ffd36b',3.5);
    c.save();c.setLineDash([10,18,4,12]);c.lineDashOffset=-pt*70;curve(POUR,'#fff8d0',2);c.restore();
    glowAt(269,512,30,'255,200,120',.55+.2*Math.sin(pt*9));
    for(let k=0;k<4;k++){const ph=(pt*1.8+k/4)%1;circ(269+(k-1.5)*14*ph,512-Math.sin(ph*Math.PI)*18,1+2.2*(1-ph),'#ffd36b',null);}
  }
  function duck(x,y,dir){
    c.save();c.translate(x,y);c.scale(dir,1);
    cut(()=>ell(0,-6,9,6),'#fdd835',INK,2,0);cut(()=>ell(5,-14,5,5),'#fdd835',INK,2,0);
    cutPoly([[9,-15],[14,-13],[9,-11]],'#ff8a2a',INK,1.2,0);circ(6,-15,1.2,INK,null);
    c.restore();
  }
  function conveyor(pt){
    for(const[x0,x1,dir]of[[-10,150,1],[270,430,-1]]){
      for(const x of[x0+16,x1-16])stroke([[x,500],[x,520]],INK,3);
      cut(()=>c.roundRect(x0,486,x1-x0,14,7),'#2a2f42',INK,3,3);
      c.save();c.setLineDash([10,8]);c.lineDashOffset=-pt*40*dir*motion;stroke([[x0+7,489],[x1-7,489]],'#8d97b3',3);c.restore();
      for(let x=x0+8;x<x1;x+=30){circ(x,494,3.5,'#5a6888',INK,1.2);}
      for(let i=0;i<3;i++){const p=(pt*.09*motion+i/3)%1,x=dir>0?x0+12+p*(x1-x0-24):x1-12-p*(x1-x0-24);duck(x,486,dir);}
    }
  }
  function moltenChannel(){
    const pt=state.playTime;
    const g=c.createLinearGradient(0,520,0,640);g.addColorStop(0,'#fff6c4');g.addColorStop(.35,'#ffd25e');g.addColorStop(.75,'#ff9a3a');g.addColorStop(1,'#e2573a');
    c.fillStyle=g;c.fillRect(0,520,420,120);
    c.save();
    for(let j=0;j<4;j++){const y0=546+j*23,dir=j%2?-1:1;
      c.setLineDash([54+j*8,22]);c.lineDashOffset=-pt*(26+j*10)*dir;c.strokeStyle=j%2?'#fff8d8':'#ffe48a';c.lineWidth=4.5-j*.8;c.beginPath();
      for(let x=-10;x<=430;x+=30){const y=y0+Math.sin(x*.03+pt*dir+j)*2*motion;x===-10?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}
    c.restore();
    // slag crusts drift past
    for(let i=0;i<4;i++){const x=((i*137+30-pt*(8+i*3))%560+560)%560-70,y=568+(i*29)%50;
      cutPoly([[x,y],[x+22,y-6],[x+40,y-1],[x+34,y+8],[x+8,y+8]],'#4a4058','#2a2236',2,0);stroke([[x+9,y+2],[x+19,y+4],[x+29,y]],'#ff9a4a',1.5);}
    for(let i=0;i<5;i++){const per=1.5+i*.27,ph=(pt/per+i*.41)%1,x=(i*83+29)%390+15,y=560+(i*31)%60;
      if(ph<.7){const r=2+7*ease.out(ph/.7);cut(()=>ell(x,y,r,r*.85),'#fff1b0','#c0602a',1.8,0);}
      else{const q=(ph-.7)/.3;c.save();c.globalAlpha=1-q;c.strokeStyle='#fff8d8';c.lineWidth=2;c.beginPath();ell(x,y,9+14*q,(9+14*q)*.3);c.stroke();c.restore();}}
    c.drawImage(layer('dodgeSet:foundry_lip',420,640,()=>{
      cut(()=>c.rect(-4,510,428,13),'#3a3048',INK,3,0);
      c.save();c.beginPath();c.rect(-4,512,428,6);c.clip();c.fillStyle='#fdf071';c.fillRect(-4,512,428,6);c.fillStyle=INK;for(let x=-10;x<430;x+=16){c.beginPath();poly([[x,518],[x+8,518],[x+14,512],[x+6,512]]);c.fill();}c.restore();
      c.fillStyle='rgba(255,230,160,.35)';c.fillRect(0,524,420,3);
    }),0,0);
  }
  // Molten scrap: a cog, a nut or a snapped I-beam, picked from the rock's own
  // radius so no randomness is drawn. The silhouette stays inside r.r.
  function scrap(r){
    const pt=state.playTime,fl=Math.sin(pt*22+r.x)*.5+.5,R=r.r,kind=Math.floor(R*7)%3,L=R*(1.6+.4*fl*motion);
    glowAt(r.x,r.y,R*1.9,'255,170,80',.5);
    const tear=(w,len,col)=>{c.beginPath();c.moveTo(r.x-w,r.y);c.quadraticCurveTo(r.x-w*.7,r.y-len*.5,r.x+Math.sin(pt*12+r.x)*3*motion,r.y-len);c.quadraticCurveTo(r.x+w*.7,r.y-len*.5,r.x+w,r.y);c.closePath();c.fillStyle=col;c.fill();};
    tear(R*.62,L,'#ff8a3a');tear(R*.36,L*.7,'#ffe48a');
    for(let j=0;j<3;j++){const d=(pt*2.2+j/3+r.x*.01)%1;circ(r.x+(j-1)*R*.45,r.y-R-d*26,2.6-j*.4,'#ffd36b','#a8452a',1);}
    c.save();c.translate(r.x,r.y);c.rotate(r.a);
    const hot=fl>.5?'#ffb35a':'#ff8d58';
    if(kind===0){
      c.beginPath();for(let i=0;i<40;i++){const a=(i+.5)/40*TAU,rr=(i%4<2)?R*.95:R*.74;i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();
      c.lineJoin='round';c.lineWidth=8;c.strokeStyle=hot;c.stroke();
      c.fillStyle='#3a3448';c.fill();c.lineWidth=3.5;c.strokeStyle=INK;c.stroke();
      c.strokeStyle=hot;c.lineWidth=2.5;c.beginPath();c.arc(0,0,R*.56,0,TAU);c.stroke();
      circ(0,0,R*.26,'#ffe48a',INK,2.5);
    }else if(kind===1){
      const hex=[];for(let i=0;i<6;i++){const a=i*TAU/6;hex.push([Math.cos(a)*R*.92,Math.sin(a)*R*.92]);}
      c.beginPath();poly(hex);c.lineJoin='round';c.lineWidth=8;c.strokeStyle=hot;c.stroke();
      cutPoly(hex,'#40384f',INK,3.5,0);
      cutPoly([hex[3],hex[4],hex[5],[0,0]],'#524868',null,0,0);
      circ(0,0,R*.42,hot,INK,2.5);circ(0,0,R*.28,'#fff1a8',null);
    }else{
      const w=R*.92,h=R*.72,t=R*.24,beam=[[-w,-h],[w*.82,-h],[w,-h+t*.5],[w*.72,-h+t],[t*.5,-h+t],[t*.5,h-t],[w*.78,h-t],[w*.95,h],[-w,h],[-w,h-t],[-t*.5,h-t],[-t*.5,-h+t],[-w,-h+t]];
      c.beginPath();poly(beam);c.lineJoin='round';c.lineWidth=8;c.strokeStyle=hot;c.stroke();
      cutPoly(beam,'#3b3550',INK,3.5,0);
      stroke([[w*.82,-h],[w,-h+t*.5],[w*.72,-h+t]],hot,3);stroke([[w*.78,h-t],[w*.95,h]],hot,3);
      circ(-w*.6,-h+t*.5,1.8,'#8d97b3',null);circ(-w*.6,h-t*.5,1.8,'#8d97b3',null);
    }
    c.restore();
  }
  const DODGE_SETS={
    volcano:{back:volcanoBack,front:volcanoSign,floor:lavaLake,hazard:rock},
    industrial_meltdown:{back:foundryBack,front:conveyor,floor:moltenChannel,hazard:scrap}
  };
  const DODGE_ATMOS={
    sunset_haze:()=>volcanoSky(false),
    eclipse_glow:()=>volcanoSky(true),
    smog_dusk:smogDusk,
    night_shift:nightShift
  };

  // PROPS ─ a basalt ridge, pipe works or the factory's safety theater
  function gear(x,y,R,teeth,rot,fill){
    c.save();c.translate(x,y);c.rotate(rot);
    const n=teeth*4;c.beginPath();for(let i=0;i<n;i++){const a=(i+.5)/n*TAU,rr=(i%4<2)?R:R*.8;i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();
    c.fillStyle=fill;c.fill();c.lineWidth=3;c.lineJoin='round';c.strokeStyle=INK;c.stroke();
    for(let k=0;k<5;k++){const a=k*TAU/5;circ(Math.cos(a)*R*.5,Math.sin(a)*R*.5,R*.13,'#2e2840',null);}
    circ(0,0,R*.2,'#8d97b3',INK,2);
    c.restore();
  }
  function pipeWorks(){
    return layer('dodgeProps:pipe_works',420,640,()=>{
      cut(()=>c.roundRect(-6,176,30,344,3),'#4f7f86',INK,3,4);
      c.fillStyle='rgba(255,255,255,.22)';c.fillRect(4,180,4,336);
      for(const y of[220,380,470])cut(()=>c.roundRect(-8,y,34,9,2),'#3d6369',INK,2,0);
      stroke([[22,300],[30,300]],INK,5);
      cut(()=>ell(40,300,19,19),'#c9d0dc',INK,3,4);circ(40,300,14,'#fff3c5',INK,1.5);
      c.strokeStyle='#e2464e';c.lineWidth=4;c.beginPath();c.arc(40,300,10,-.7,.5);c.stroke();
      for(let k=0;k<7;k++){const a=Math.PI*.8+k*Math.PI*.23;stroke([[40+Math.cos(a)*12,300+Math.sin(a)*12],[40+Math.cos(a)*9,300+Math.sin(a)*9]],INK,1.2);}
      txt('PSI',40,309,5.5,INK,'center',null,1000);
      c.strokeStyle=INK;c.lineWidth=6;c.beginPath();ell(30,430,11,11);c.stroke();c.strokeStyle='#e2464e';c.lineWidth=3.5;c.stroke();
      for(let k=0;k<3;k++){const a=k*TAU/3;stroke([[30,430],[30+Math.cos(a)*10,430+Math.sin(a)*10]],INK,2.5);}circ(30,430,3,'#8d97b3',INK,1.2);
      cut(()=>c.roundRect(380,456,46,64,3),'#4f7f86',INK,3,4);for(const y of[468,500])cut(()=>c.roundRect(378,y,50,8,2),'#3d6369',INK,2,0);
    });
  }
  function safetyProps(){
    return layer('dodgeProps:safety_theater',420,640,()=>{
      stroke([[31,446],[31,516]],INK,5);stroke([[31,446],[31,516]],'#9aa3b8',3);
      cut(()=>c.roundRect(6,410,52,38,3),'#fdf071',INK,3,4);
      txt('HARD HAT',32,421,7.5,INK,'center',null,1000);txt('AREA',32,432,7.5,INK,'center',null,1000);
      c.save();c.beginPath();c.rect(8,440,48,6);c.clip();c.fillStyle=INK;for(let x=0;x<62;x+=10){c.beginPath();poly([[x,446],[x+5,446],[x+10,440],[x+5,440]]);c.fill();}c.restore();
      c.save();c.translate(42,409);c.rotate(.18);
      cut(()=>{c.moveTo(-11,0);c.quadraticCurveTo(-11,-12,0,-12);c.quadraticCurveTo(11,-12,11,0);c.closePath();},'#ff8a2a',INK,2.2,3);
      cut(()=>c.roundRect(-15,-2,30,4,2),'#e0701c',INK,2,0);c.restore();
      for(const x of[12,50]){cut(()=>c.roundRect(x-10,512,20,5,2),'#3b3047',INK,2,2);cutPoly([[x-7,512],[x+7,512],[x+2,490],[x-2,490]],'#ff8a2a',INK,2,2);c.fillStyle='#fff6dc';c.beginPath();poly([[x-5,503],[x+5,503],[x+3.7,497],[x-3.7,497]]);c.fill();}
      cutPoly([[370,518],[383,468],[409,468],[422,518]],'#fdf071',INK,3,4);
      txt('CAUTION',396,482,6,INK,'center',null,1000);txt('FLOOR IS',396,494,6,INK,'center',null,1000);txt('MOLTEN',396,505,7.5,'#e2464e','center',null,1000);
      cut(()=>c.roundRect(396,388,12,32,4),'#e2464e',INK,2.5,3);cut(()=>c.roundRect(398,382,8,7,2),INK,null,0,0);
      curve([[406,384],[414,390],[412,404]],INK,2);cut(()=>c.roundRect(397,400,10,8,1),'#fff3c5',INK,1.2,0);
    });
  }
  function safetyBanner(pt){
    const sw=Math.sin(pt*1.2)*.025*motion;
    stroke([[126,174],[132,190]],INK,1.5);stroke([[294,174],[288,190]],INK,1.5);
    c.save();c.translate(210,198);c.rotate(sw);
    c.drawImage(layer('dodgeProps:banner',200,34,()=>{
      cut(()=>c.roundRect(4,4,188,22,3),'#fff3c5',INK,2.5,3);
      txt('SAFETY IS OUR #2 PRIORITY',98,15.5,9,'#e2464e','center',null,1000);
    }),-100,-14);
    c.restore();
  }
  const DODGE_PROPS={
    basalt_ridge:{back(){c.drawImage(basaltRidge(),0,0);}},
    pipe_works:{front(pt){
      c.drawImage(pipeWorks(),0,0);
      gear(420,350,44,12,pt*.5*motion,'#6a5c86');gear(396,420,22,8,-pt*.75*motion+.2,'#8a7aa6');
      const a=-.9+.45*Math.sin(pt*2.3)+Math.sin(pt*37)*.06*motion;stroke([[40,300],[40+Math.cos(a)*11,300+Math.sin(a)*11]],INK,2);circ(40,300,2,INK,null);
    }},
    safety_theater:{front(pt){c.drawImage(safetyProps(),0,0);safetyBanner(pt);}}
  };

  // FX ─ embers, a spark shower or venting steam
  const DODGE_FX={
    ember_drift:{mid(pt){
      for(let i=0;i<10;i++){const ph=(pt*.18+i*.13)%1,px=(i*53+18)%420+Math.sin(pt*2+i)*8,py=500-ph*330;c.save();c.globalAlpha=Math.sin(ph*Math.PI)*.9;circ(px,py,2+i%3,i%2?'#ffd46d':'#ff6f6f',null);c.restore();}
      c.save();c.strokeStyle='rgba(255,241,181,.16)';c.lineWidth=2;
      for(let i=0;i<6;i++){const x=40+i*68;c.beginPath();for(let j=0;j<5;j++){const xx=x+Math.sin(pt*3+j+i)*5,yy=470-j*24;if(j)c.lineTo(xx,yy);else c.moveTo(xx,yy);}c.stroke();}
      c.restore();
    }},
    spark_shower:{mid(pt){
      c.save();c.lineCap='round';
      for(let i=0;i<16;i++){const per=.8+(i%4)*.17,ph=(pt/per+i*.137)%1,weld=i%4===0,ox=weld?26:262,oy=weld?282:244,vx=(((i*53)%23)-11)*9+(weld?50:0),vy=-30-((i*29)%40);
        const x=ox+vx*ph,y=oy+vy*ph+300*ph*ph,dy=vy+600*ph;
        c.globalAlpha=1-ph;c.strokeStyle=ph<.35?'#fff8d0':'#ffb347';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x-vx*.035,y-dy*.035);c.stroke();}
      c.restore();
      glowAt(262,244,24,'255,220,140',.45+.3*Math.sin(pt*30)*motion);glowAt(26,282,18,'200,230,255',.35+.35*Math.sin(pt*41)*motion);
    }},
    steam_vents:{mid(pt){
      for(const[vx,vy,k]of[[96,372,0],[333,430,1.3],[210,206,2.1]])for(let i=0;i<4;i++){const ph=(pt*.3+i/4+k)%1;c.globalAlpha=(1-ph)*.34;circ(vx+Math.sin(ph*5+i)*6+ph*16,vy-ph*86,5+ph*20,'#f4eef8',null);}
      c.globalAlpha=1;
    }}
  };

  function drawLava(preview=false){
    const l=state.lava,pt=state.playTime,r=stageMachine.recipes.dodge;
    const set=DODGE_SETS[r.set]||DODGE_SETS.volcano,props=DODGE_PROPS[r.props]||DODGE_PROPS.basalt_ridge,fx=DODGE_FX[r.fx]||DODGE_FX.ember_drift;
    slotIn('atmosphere',()=>c.drawImage((DODGE_ATMOS[r.atmosphere]||DODGE_ATMOS.sunset_haze)(),0,0));
    if(props.back)slotIn('props',()=>props.back(pt));
    slotIn('set',()=>set.back(pt));
    slotIn('fx',()=>fx.mid(pt));
    slotIn('set',()=>set.front(pt));
    if(props.front)slotIn('props',()=>props.front(pt));
    if(!preview)for(const x of [92,210,328]){c.save();c.setLineDash([5,14]);c.strokeStyle='rgba(255,244,186,.2)';c.lineWidth=2;c.beginPath();c.moveTo(x,149);c.lineTo(x,536);c.stroke();c.restore();}
    slotIn('set',()=>set.floor(pt));
    if(!preview)for(const rk of l.rocks)rockShadow(rk);
    const vel=l.targetX-l.x,tilt=clamp(vel*.0035,-.28,.28)*motion,bob=Math.sin(pt*3.2)*2*motion;
    const at=state.scene==='aftermath'&&state.aftermath?state.aftermath.time:0;
    if(Math.abs(vel)>18&&!reducedMotion)for(let i=0;i<3;i++){const ph=(pt*4+i/3)%1,sx=l.x-Math.sign(vel)*(56+ph*20);c.save();c.globalAlpha=1-ph;circ(sx,552-ph*14,3+i,'#ffcd63','#68263d',1.5);c.restore();}
    c.save();c.translate(l.x,552+bob);c.rotate(tilt*.5);
    glowAt(0,0,62,'127,242,212',.35,.35);
    cut(()=>c.roundRect(-56,-8,112,16,8),'#69eee0',INK,3.5,4);
    c.fillStyle='#fdf071';for(const x of[-38,-14,10,34])c.fillRect(x,-4,8,8);
    stroke([[-50,5],[50,5]],'#3fbfb1',2);
    c.restore();
    let jy=0,spin=0,sx=1,sy=1;
    if(at>0){const k=clamp(at/.7,0,1);jy=-70*Math.sin(Math.PI*k)*(reducedMotion?.3:1);spin=reducedMotion?0:TAU*ease.inOut(k);const land=clamp((at-.7)/.3,0,1);if(land>0){const e=Math.sin(Math.PI*land)*.18*motion;sx=1+e;sy=1-e;}}
    c.save();
    if(l.invuln>0)c.globalAlpha=.5+.35*(.5+.5*Math.cos(l.invuln*16));
    glowAt(l.x,512+bob+jy,52,'127,242,212',.45);
    drawThing(l.x,510+bob+jy,65,tilt+Math.sin(pt*10)*.05*motion+spin,false,{sx,sy});
    c.restore();
    if(preview)return;
    if(l.near>0){const k=1-l.near/.5,side=l.nearSide||1;
      c.save();c.globalAlpha=1-k;c.lineCap='round';
      for(let i=0;i<3;i++){const yy=486+i*14,x0=l.x+side*(42+k*26);stroke([[x0,yy],[x0+side*(16+i*6),yy-9]],'#e9fff8',3);}
      c.strokeStyle='#53e8cb';c.lineWidth=3;c.beginPath();ell(l.x,512,40+k*40,(40+k*40)*.85);c.stroke();
      c.translate(l.x-side*30,474-k*10);cut(()=>{c.moveTo(0,-8);c.quadraticCurveTo(6,0,0,5);c.quadraticCurveTo(-6,0,0,-8);},'#8be9ff',INK,1.5,0);
      c.restore();}
    for(const rk of l.rocks)set.hazard(rk);
    const maxHearts = activePlan.round_modifiers?.round3_lava?.hearts || 2;
    for(let i=0;i<maxHearts;i++){const full=i<l.hearts,b=full?1+.07*Math.sin(pt*6+i)*motion:.9;c.save();c.translate(330+i*25,138);c.scale(b,b);cut(()=>heartPath(10),full?'#ff5d86':'#5a2a44',INK,2.5,2);if(full)circ(-4,-3,2.2,'#ffd0dc',null);c.restore();}
    const L=setLines(2);
    txt('SWIPE LEFT / RIGHT TO SURVIVE',210,612,14,'#fff3b8');
    txt(state.scene==='aftermath'?L.cheer:L.status,210,585,12,'#fff4bd');
  }

  // ── Portal: the SAM cutout climbs out of a paper dimension ──────────
  function drawPortal(){
    const t=state.materialize,pt=state.playTime,cx=210,cy=318;
    drawBackground('#17152f','#46365d','#53e8cb');
    const open=reducedMotion?clamp(t/.4,0,1)*(1-clamp((t-1.3)/.4,0,1)):ease.back(t/.5)*(1-ease.in((t-1.15)/.5));
    if(open>0){
      c.save();c.translate(cx,cy);
      c.save();c.rotate(pt*.15*motion);for(let i=0;i<14;i++){c.rotate(TAU/14);c.globalAlpha=.13*open;c.fillStyle=i%2?'#53e8cb':'#fdf071';c.beginPath();c.moveTo(0,0);c.lineTo(-26,-340);c.lineTo(26,-340);c.closePath();c.fill();}c.restore();
      c.globalAlpha=1;
      c.save();c.beginPath();ell(0,0,112*open,142*open);c.clip();
      c.fillStyle='#120c22';c.fillRect(-130,-160,260,320);
      for(let arm=0;arm<3;arm++){c.strokeStyle=['#53e8cb','#ff5d86','#fdf071'][arm];c.lineWidth=7;c.globalAlpha=.7;c.beginPath();for(let k=0;k<=40;k++){const s=k/40,a=arm*TAU/3+s*5.2-pt*3*motion,rad=s*150*open;const x=Math.cos(a)*rad*.8,y=Math.sin(a)*rad;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
      for(let i=0;i<14;i++){const ph=(pt*.8+i/14)%1,a=i*2.39,rr=(1-ph)*140*open;c.globalAlpha=ph;twinkle(Math.cos(a)*rr*.8,Math.sin(a)*rr,2+ph*3,'#fff6c9');}
      c.restore();
      c.globalAlpha=1;
      const rim=(rx,ry,col,rot,n)=>{const v=[];for(let i=0;i<n*2;i++){const a=i*Math.PI/n+rot,k=i%2?1:1.1;v.push([Math.cos(a)*rx*k,Math.sin(a)*ry*k]);}c.lineWidth=3;cutPoly(v,col,INK,3,5);};
      c.save();c.beginPath();ell(0,0,124*open+30,154*open+30);ell(0,0,112*open,142*open);c.clip('evenodd');
      rim(124*open,154*open,'#fdf071',pt*.6*motion,22);rim(116*open,146*open,'#ff5d86',-pt*.8*motion,18);
      c.restore();
      c.lineWidth=3;c.strokeStyle='#53e8cb';c.beginPath();ell(0,0,112*open,142*open);c.stroke();
      c.restore();
    }
    if(t>.3){
      const rise=ease.out((t-.3)/.6),scan=clamp((t-.45)/.6,0,1);
      const size=155*(reducedMotion?clamp((t-.3)/.4,0,1):ease.elastic((t-.3)/1.0));
      const land=clamp((t-1.05)/.3,0,1),e=Math.sin(Math.PI*land)*.14*motion;
      const y=cy+(1-rise)*70,scanY=y-size*.65+size*1.3*scan;
      glowAt(cx,y,size*.9,'127,242,212',.5*(1-land*.6));
      c.save();c.beginPath();c.rect(0,0,420,scanY);c.clip();drawThing(cx,y,size,Math.sin(pt*2)*.05,true,{sx:1+e,sy:1-e});c.restore();
      if(scan<1){
        c.save();c.beginPath();c.rect(0,scanY,420,640-scanY);c.clip();c.globalAlpha=.8;drawThing(cx,y,size,Math.sin(pt*2)*.05,false,{reveal:0});c.restore();
        c.save();c.fillStyle='rgba(228,255,247,.9)';c.fillRect(cx-size*.7,scanY-2,size*1.4,4);c.restore();
        glowAt(cx,scanY,size*.75,'127,242,212',.55,.12);
        for(let i=0;i<4;i++)twinkle(cx-size*.6+((pt*170+i*53)%(size*1.2)),scanY,4,'#fff6c9',pt*4+i);
      }
      if(t>1.05){const k=clamp((t-1.05)/.6,0,1);if(k<1)for(let i=0;i<10;i++){const a=i*TAU/10+.2,r=size*.55+150*ease.out(k);c.save();c.globalAlpha=1-k;twinkle(cx+Math.cos(a)*r,y+Math.sin(a)*r*.85,6+(i%3)*3,['#fdf071','#53e8cb','#ff5d86'][i%3],a);c.restore();}}
    }
    const kb=reducedMotion?clamp(t/.3,0,1):ease.back((t-.15)/.35);
    if(kb>0){c.save();c.translate(210,135);c.scale(kb,kb);c.rotate(-.03);
      cutPoly([[-176,-18],[176,-18],[160,0],[176,18],[-176,18],[-160,0]],'#2a1f45','#53e8cb',3,5);
      txt('CHARACTER MATERIALIZED',0,0,21,'#53e8cb');c.restore();}
    if(t>.9){c.save();c.globalAlpha=clamp((t-.9)/.3,0,1);txt('REALITY HAS LEFT THE CHAT.',210,530+(1-clamp((t-.9)/.3,0,1))*10,16,'#fdf071');c.restore();}
  }
  function drawIntroBackdrop(){
    const pt=state.playTime;
    drawBackground('#24203e','#853954','#f1b972');
    const rays=layer('rays',760,760,()=>{c.translate(380,380);for(let i=0;i<24;i++){c.rotate(TAU/24);c.fillStyle=i%2?'rgba(255,214,110,.07)':'rgba(255,93,134,.07)';c.beginPath();c.moveTo(0,0);c.lineTo(-52,-380);c.lineTo(52,-380);c.closePath();c.fill();}});
    c.save();c.translate(216,318);c.rotate(pt*.05*motion);c.drawImage(rays,-380,-380);c.restore();
    for(let i=0;i<18;i++){const x=(i*83+23)%420,y=(i*47+82)%640;c.save();c.translate(x,y);c.rotate(Math.sin(pt+i)*.2*motion);star(0,0,6,13+i%3*5,i%2?'#ff7c9d':'#fae78d');c.restore();}
    c.save();c.translate(216,318);c.rotate(Math.sin(pt*2)*.035*motion);
    cut(()=>c.roundRect(-129,-111,258,221,9),'#fff1c1',INK,7,8);
    c.save();c.beginPath();c.roundRect(-118,-100,236,199,6);c.clip();c.fillStyle='rgba(255,93,134,.08)';for(let x=-120;x<120;x+=16)for(let y=-100;y<100;y+=16)c.fillRect(x+((y/16)%2?8:0),y,3,3);c.restore();
    txt('YOUR THING GOES HERE',0,-84,14,'#292039','center',null);
    groundShadow(0,64,52,.25);
    drawThing(0,0,138,Math.sin(pt*2)*.16*motion);
    txt('NO REFUNDS',0,90,17,'#ef476f','center',null);
    c.restore();
    txt('THREE BAD IDEAS / ONE PHOTO',210,581,18,'#fff4b7');
  }
  function drawParticles(){
    for(const p of state.particles){c.save();c.globalAlpha=clamp(p.life/p.max,0,1);c.translate(p.x,p.y);c.rotate(p.angle);
      if(p.shape==='seed'){
        c.beginPath();c.ellipse(0,0,p.r*.28,p.r*.63,.4,0,TAU);c.fillStyle=p.color;c.fill();
      }else if(p.shape==='splash'){
        c.beginPath();c.ellipse(0,0,p.r*.35,p.r*.7,0,0,TAU);c.fillStyle=p.color;c.fill();
      }else if(p.shape==='spark'){
        c.fillStyle=p.color;c.fillRect(-p.r*.15,-p.r*.8,p.r*.3,p.r*1.6);
      }else if(p.shape==='fluff'){
        circ(0,0,p.r*.6,p.color,null);
      }else if(p.shape==='brick'){
        rect(-p.r,-p.r*.55,p.r*2,p.r*1.1,p.color,INK,1.5,1);
      }else if(p.shape==='shard'){
        c.beginPath();poly([[-p.r,-p.r*.6],[p.r,-p.r*.2],[-p.r*.2,p.r]]);c.fillStyle=p.color;c.fill();c.strokeStyle=INK;c.lineWidth=1.2;c.stroke();
      }else if(p.shape==='drop'){
        c.beginPath();ell(0,0,p.r*.55,p.r*.85);c.fillStyle=p.color;c.fill();c.strokeStyle='#68263d';c.lineWidth=1.2;c.stroke();
      }else{c.scale(1,Math.cos(p.angle*1.6));rect(-p.r/2,-p.r/2,p.r,p.r*.75,p.color,null,0,1);}
      c.restore();}
  }
  function draw(){
    c.save();c.clearRect(0,0,WIDTH,HEIGHT);
    if(state.shake>0&&!reducedMotion)c.translate(rnd(-state.shake,state.shake),rnd(-state.shake,state.shake));
    const assembling=stageMachine.assemble>0;
    const inGame=!assembling&&!['materializing','menu','summary'].includes(state.scene);
    c.save();
    if(inGame&&state.round===0&&state.wreck.hit&&!reducedMotion){const t=state.aftermath?.time||0,z=1+.06*Math.pow(1-clamp(t/.45,0,1),2);c.translate(305,322);c.scale(z,z);c.translate(-305,-322);}
    if(assembling)drawAssembly();
    else if(state.scene==='materializing')drawPortal();
    else if(!inGame)drawIntroBackdrop();
    else if(state.round===0)drawWreck();else if(state.round===1)drawUfo();else drawLava();
    drawParticles();
    for(const t of state.texts){const k=reducedMotion?1:ease.back((t.max-t.life)/.18);c.save();c.globalAlpha=clamp(t.life/t.max*1.6,0,1);c.translate(t.x,t.y);c.rotate(Math.sin(t.life*7)*.04);c.scale(k,k);txt(t.str,0,0,t.size,t.color);c.restore();}
    c.restore();
    overlays();
    if(assembling)drawAssemblyHud();
    if(inGame){titleBanner(stages[state.round].name,stageTheme(state.round),stages[state.round].color);timerBar();}
    if(state.flash>0&&!reducedMotion){c.fillStyle=`rgba(255,240,177,${Math.min(.22,state.flash*.28)})`;c.fillRect(0,0,420,640);}
    c.restore();
  }
  // Visual-only debris and lava splashes (separate RNG, never touches gameplay).
  function debris(x,y,palette=WRECK_SETS.haunted_house.debris){
    for(const[shape,color,n]of palette){
      for(let i=0;i<n;i++){const a=vrnd(-2.2,.4),s=vrnd(150,380),life=vrnd(.8,1.5);
        state.particles.push({x:x+vrnd(-10,30),y:y+vrnd(-35,35),vx:Math.cos(a)*s+60,vy:Math.sin(a)*s,r:vrnd(3.5,7.5),color,life,max:life,angle:vr()*TAU,spin:vrnd(-10,10),shape});}
    }
  }
  function splash(x,y){
    for(let i=0;i<8;i++){const a=vrnd(-2.6,-.5),s=vrnd(90,220),life=vrnd(.4,.75);
      state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:vrnd(4,8),color:i%2?'#ffcd63':'#ff8a3c',life,max:life,angle:-Math.PI/2+a,spin:0,shape:'drop'});}
  }
  function frame(now){
    const dt=state.last?Math.min(.042,(now-state.last)/1000):.016;state.last=now;
    update(dt);draw();requestAnimationFrame(frame);
  }
  applyPlanToStages(activePlan);
  resetPhysics();setModal('menu');fetchBudgetStatus();requestAnimationFrame(frame);
})();
