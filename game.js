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
    {name: 'RUN FOR IT!', theme: 'VOLCANO VACATION', hint:'SLIDE LEFT/RIGHT. DODGE HOT ROCKS.', seconds: 10, color:'#ffcd63'}
  ];

  const state = {
    scene:'menu', round:0, remaining:9, elapsed:0, score:0, won:[null,null,null], seed:7821,
    particles:[], texts:[], shake:0, flash:0, freeze:0, playTime:0, last:0,
    photo:null, originalPhoto:null, cutout:false, photoLabel:'MYSTERY THING',
    aftermath:null, materialize:0, photoRevision:0, busy:false,
    photoBase64:null, dragging:false, pointer:null,
    wreck:{angle:-0.85,omega:0,launched:false,hit:false,damage:0},
    ufo:{hits:0,misses:0,beam:0,beamGood:false,phase:0,abduct:0,winCountdown:0},
    lava:{x:210,targetX:210,rocks:[],spawn:0,hearts:2,invuln:0,dodge:0}
  };

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let audio = null;
  let audioUnlocked = false;
  let modalReadyAt = 0;
  const TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const random=()=>{state.seed=(Math.imul(1664525,state.seed)+1013904223)>>>0;return state.seed/4294967296;};
  const rnd=(a,b)=>a+random()*(b-a);
  const pt=(x,y)=>({x,y});

  function applyPlanToStages(plan) {
    if (!plan || !plan.round_modifiers) return;
    activePlan = plan;
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
      if(audio.state==='suspended') audio.resume();
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
    modal.hidden=false;badges.hidden=true;
    modal.dataset.kind=kind; modalReadyAt=performance.now()+350;
    document.querySelector('#reportPortrait').hidden=kind!=='summary';
    document.querySelector('#reportScore').hidden=kind!=='summary';
    document.querySelector('.ticket').getAnimations?.().forEach(a=>a.cancel());
    if (!reducedMotion) document.querySelector('.ticket').animate?.([{opacity:0,transform:'translateY(20px) rotate(2deg) scale(.95)'},{opacity:1,transform:'rotate(-1.5deg)'}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)'});
    if (shareBtn) shareBtn.hidden = kind !== 'summary';
    const lines = activePlan.announcer_lines;
    if(kind==='menu'){
      stamp.textContent='✹ OFFICIAL NONSENSE MACHINE ✹';
      title.innerHTML='YOUR STUFF.<br><em>OUR PROBLEM.</em>';
      body.textContent=lines?.intro || 'Three different universes. Three absurd microgames. One object gets absolutely no peace.';
      badges.hidden=false; primary.innerHTML='UNLEASH THE CHAOS <span>➜</span>';
      sub.textContent='ONE PHOTO · THREE GAMES · ALL CHAOS';
    }else if(kind==='round'){
      const s=stages[state.round];
      stamp.textContent=`ROUND 0${state.round+1} / 03  ·  ${s.theme}`;
      const rKey = `round${state.round+1}`;
      title.innerHTML=state.round===0?'WRECK<br><em>THE HOUSE!</em>':state.round===1?'ALIENS<br><em>WANT YOUR STUFF!</em>':'THE FLOOR<br><em>IS LAVA!</em>';
      body.textContent=lines?.[rKey]?.intro || (state.round===0?'Your thing is now a wrecking ball. Pull it left, release, and demolish the haunted house.':state.round===1?'The UFO is hungry. Wait until your thing passes directly under its beam, then tap to abduct it twice.':'Your thing is on vacation in a volcano. Drag left or right to dodge falling lava rocks. Survive the timer.');
      primary.innerHTML='I WAS BORN READY <span>➜</span>';
      sub.textContent=s.hint;
    }else if(kind==='result'){
      const success=state.won[state.round];
      const rKey = `round${state.round+1}`;
      stamp.textContent=success?'★ UNNECESSARILY IMPRESSIVE ★':'✕ COSMICALLY EMBARRASSING ✕';
      title.innerHTML=success?'YOU DID<br><em>THE THING!</em>':'ABSOLUTE<br><em>DISASTER.</em>';
      const customResult = lines?.[rKey]?.[success ? 'win' : 'lose'];
      body.textContent=customResult || (state.round===0?(success?'Property value reduced to zero. Ghosts now legally homeless.':'The haunted house survives. Its mortgage does not.'):
        state.round===1?(success?'The aliens have adopted your thing. Nobody asked you.':'The UFO went home hungry and filed a complaint.'):
        (success?'You escaped the volcano. Your insurance has not.':'Your thing has become locally sourced magma.'));
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
      badges.innerHTML=state.won.map((v,i)=>`<span>${v?'✓':'✕'} ${['WRECK','BEAM','LAVA'][i]}</span>`).join('');
      primary.innerHTML='ANOTHER DISASTER? <span>↻</span>';
      sub.textContent=`THREAT CLASS: ${chaosRating()}`;
    }
  }


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
    const modes=['WRECK','BEAM','LAVA'];
    for (let i=0;i<3;i++) {
      const x=50+i*215;
      g.fillStyle='#05040a';g.fillRect(x+6,994,190,69);
      g.fillStyle=state.won[i]?'#53e8cb':'#ff5d86';
      g.fillRect(x,988,190,69);
      g.fillStyle='#171322';g.font='900 27px monospace';
      g.fillText((state.won[i]?'✓ ':'✕ ')+modes[i],x+95,1035);
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
    g.fillText('ONE PHOTO · THREE GAMES · ALL CHAOS',W/2,1192);
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
    state.round=0;state.score=0;state.won=[null,null,null];
    const urlSeed=new URLSearchParams(location.search).get('seed');
    state.seed=urlSeed!==null?((Number(urlSeed)>>>0)||7821):((Math.random()*0xffffffff)>>>0);
    state.particles=[];state.texts=[];state.shake=0;resetPhysics();
    state.scene='between';setModal('round');setStatus(`ROUND 1 READY / ${activePlan.selected_object?.label?.toUpperCase() || 'MOCK READY'}`);
  }

  function startRound(){
    if(!reducedMotion)modal.animate?.([{opacity:1},{opacity:0}],{duration:180});
    resetPhysics();state.particles=[];state.texts=[];state.remaining=stages[state.round].seconds;
    state.aftermath=null;state.freeze=0;state.elapsed=0;state.scene=reducedMotion?'playing':'entering';state.transition=.18;state.shake=0;state.flash=0;state.dragging=false;
    modal.hidden=reducedMotion;setStatus(`ROUND ${state.round+1} / ${stages[state.round].name} / LIVE`);
    tone(500,.09,'square',.06,1.3);setTimeoutSafeSound();
  }

  function setTimeoutSafeSound(){tone(740,.06,'triangle',.03,.8);}

  function celebrate(win, duration){
    if(state.scene!=='playing')return;
    state.scene='aftermath';state.dragging=false;
    state.aftermath={time:0,duration,win,called:false};
    setStatus(win?'CHAOS CONFIRMED / ENJOY THE AFTERMATH':'SPECIMEN NEEDS A MOMENT');
    if(state.round===2&&win){burst(state.lava.x,470,'#53e8cb',38,210);tone(660,.5,'triangle',.07,2);}
  }
  function endRound(win){
    if(state.scene!=='playing'&&state.scene!=='aftermath')return;
    state.won[state.round]=Boolean(win);state.scene='result';state.dragging=false;
    state.score+=win?250+Math.ceil(state.remaining)*12:0;
    setModal('result');setStatus(`ROUND ${state.round+1} ${win?'CLEARED':'FAILED'} · ${state.score} POINTS`);
    if(win){tone(540,.18,'triangle',.075,1.9);burst(210,260,'#fdf071',28,215);}else tone(170,.45,'sawtooth',.045,.40);
  }

  primary.addEventListener('click',()=>{
    if(performance.now()<modalReadyAt || state.busy || state.scene==='materializing')return;
    audioUnlocked=true;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();}catch(e){}
    if(state.scene==='menu'||state.scene==='summary'){beginSession();return;}
    if(state.scene==='between'){startRound();return;}
    if(state.scene==='result'){
      if(state.round===2){state.scene='summary';setModal('summary');setStatus('SESSION COMPLETE / PLAY AGAIN');}
      else{state.round++;state.scene='between';setModal('round');setStatus(`ROUND ${state.round+1} READY`);}
    }
  });

  document.querySelector('#demo').addEventListener('click',()=>{
    if(state.busy)return;
    state.aftermath=null;state.materialize=0;state.freeze=0;
    state.scene='menu';state.round=0;state.score=0;state.won=[null,null,null];
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
    shout(signature.word,260,190,signature.secondary,31);debris(305,322);
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
  function wreckBackdrop(){
    return layer('wreckBg',420,640,()=>{
      const g=c.createLinearGradient(0,100,0,500);g.addColorStop(0,'#1b1536');g.addColorStop(.5,'#432a5c');g.addColorStop(.85,'#8c4567');g.addColorStop(1,'#b65a6e');
      c.fillStyle=g;c.fillRect(0,0,420,640);
      let s=31;const r=()=>(s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296;
      for(let i=0;i<60;i++){c.globalAlpha=.2+r()*.6;circ(r()*420,100+r()*280,.6+r()*1.3,'#fff1c4',null);}
      c.globalAlpha=1;
      glowAt(338,214,175,'255,226,160',.5);
      circ(338,214,74,'#fbe8b4',null);
      c.save();c.beginPath();ell(338,214,74,74);c.clip();circ(372,236,72,'#f0d397',null);c.restore();
      for(const[x,y,rr]of[[310,186,13],[356,244,15],[352,178,7],[318,250,8],[378,202,6],[300,222,5]]){circ(x,y,rr,'#e5c486',null);circ(x-1.5,y-1.5,rr*.72,'#f3daa4',null);}
      c.lineWidth=3;c.strokeStyle='#e7c584';c.beginPath();ell(338,214,74,74);c.stroke();
      cutPoly([[0,420],[38,398],[92,410],[140,386],[196,404],[250,394],[316,408],[372,392],[420,402],[420,520],[0,520]],'#3a2552',null,0,0);
      deadTree(42,404,64,'#2a1a40');deadTree(150,390,48,'#2a1a40');deadTree(396,398,58,'#2a1a40');
      cutPoly([[214,402],[214,382],[226,370],[238,382],[238,402]],'#2a1a40',null,0,0);
      stroke([[226,370],[226,356]],'#2a1a40',2);stroke([[221,361],[231,361]],'#2a1a40',2);
      circ(226,388,2.5,'#ffd976',null);
      cutPoly([[0,452],[60,436],[130,450],[205,434],[280,446],[350,436],[420,444],[420,560],[0,560]],'#2c1d44',null,0,0);
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
  function cloud(w){
    return layer('cloud'+w,w+24,w*.55+24,()=>{
      const lobes=[[.2,.62,.19],[.4,.45,.25],[.62,.5,.22],[.82,.64,.16],[.52,.72,.24]];
      c.translate(10,8);
      const each=fn=>{for(const[l,m,r]of lobes){c.beginPath();ell(l*w,m*w*.5,r*w,r*w*.78);fn();}};
      c.save();c.translate(3,5);c.fillStyle='rgba(16,8,30,.3)';each(()=>c.fill());c.restore();
      c.strokeStyle=INK;c.lineWidth=5;each(()=>c.stroke());
      c.fillStyle='#5a3d7a';each(()=>c.fill());
      c.fillStyle='#76579a';for(const[l,m,r]of lobes){c.beginPath();ell(l*w-r*w*.18,m*w*.5-r*w*.3,r*w*.55,r*w*.34);c.fill();}
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
      stroke([[-s*.08,-s*.24],[-s*.08,-s*.32],[s*.12,-s*.32],[s*.12,-s*.24]],INK,2.5);
      cut(()=>c.roundRect(-s*.26,-s*.24,s*.56,s*.4,s*.06),'#c9765f',INK,2.5,3);
      c.fillStyle='#fdf071';c.fillRect(-s*.2,-s*.14,s*.14,s*.1);c.fillStyle='#7ff2d4';c.fillRect(s*.06,-s*.06,s*.16,s*.1);
      c.restore();
    }else if(face==='posh'){
      circ(-s*.24,-s*.2,s*.07,INK,null);circ(s*.24,-s*.2,s*.07,INK,null);
      c.beginPath();ell(s*.24,-s*.2,s*.15,s*.15);c.strokeStyle='#e6a92e';c.lineWidth=2.5;c.stroke();
      stroke([[s*.38,-s*.14],[s*.48,s*.2]],'#e6a92e',1.5);
      c.beginPath();c.moveTo(0,s*.08);c.bezierCurveTo(-s*.12,s*.0,-s*.3,s*.2,-s*.36,s*.04);c.moveTo(0,s*.08);c.bezierCurveTo(s*.12,s*.0,s*.3,s*.2,s*.36,s*.04);c.strokeStyle=INK;c.lineWidth=3;c.stroke();
      c.save();c.translate(0,-s*.8-o.tip*s*.35);c.rotate(-o.tip*.25);
      cut(()=>c.roundRect(-s*.5,s*.06,s*1,s*.13,s*.05),'#211a33',INK,2,0);
      cut(()=>c.roundRect(-s*.3,-s*.48,s*.6,s*.56,s*.04),'#211a33',INK,2,0);
      c.fillStyle='#ff5d86';c.fillRect(-s*.3,-s*.06,s*.6,s*.1);
      c.restore();
    }else if(face==='dizzy'){
      for(const e of[-1,1]){c.beginPath();for(let i=0;i<=16;i++){const a=i*.75+t*8*e,r=i/16*s*.13;c.lineTo(e*s*.24+Math.cos(a)*r,-s*.22+Math.sin(a)*r);}c.stroke();}
      c.beginPath();c.arc(0,s*.12,s*.14,.15,Math.PI-.15);c.stroke();
      c.beginPath();ell(s*.06,s*.3,s*.07,s*.1);c.fillStyle='#ff6f98';c.fill();c.stroke();
    }else{
      c.beginPath();c.arc(-s*.24,-s*.16,s*.09,Math.PI*1.1,Math.PI*1.9);c.moveTo(s*.33,-s*.2);c.arc(s*.24,-s*.16,s*.09,Math.PI*1.1,Math.PI*1.9);c.stroke();
      c.beginPath();c.arc(0,s*.08,s*.16,.2,Math.PI-.2);c.stroke();
    }
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
  function ghostParade(t){
    for(const g of GHOSTS){
      const u=t-g.t0;if(u<0)continue;
      const k=reducedMotion?clamp(u/.2,0,1):ease.back(u/.24),q=g.path(u);
      if(q.y<-40||q.x<-40||q.x>460)continue;
      if(g.face==='grump'||(g.face==='dizzy'&&u>.9))groundShadow(q.x,470,g.s*.7,.3);
      if(g.trail&&!reducedMotion)for(let e=2;e>0;e--){const p=g.path(Math.max(0,u-e*.05));c.save();c.globalAlpha=.16*(3-e);ghost(p.x,p.y,g.s,t,{...g,...p,k});c.restore();}
      if(g.twins){const a=u*8;for(const side of(Math.sin(a)>0?[-1,1]:[1,-1]))ghost(q.x+side*19*Math.cos(a),q.y+side*8*Math.sin(a),g.s*(1+side*.12*Math.sin(a)),t+side,{face:'happy',tint:side>0?'#fff0f6':'#e6fff4',k,flip:side>0});}
      else ghost(q.x,q.y,g.s,t+g.t0*9,{...g,...q,k});
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
  function drawWreck(){
    const w=state.wreck,pt=state.playTime,ball=ballPose(),t=ball.t;
    c.drawImage(wreckBackdrop(),0,0);
    for(const[w0,y,sp,x0]of[[150,150,6,40],[110,236,10,260],[90,188,15,520]]){const x=((x0-pt*sp)%640+640)%640-160;c.drawImage(cloud(w0),x,y);}
    for(let i=0;i<3;i++){const flee=w.hit?t:0;const bx=70+i*70+Math.sin(pt*.7+i*2)*50+flee*220*(i%2?1:-1),by=170+Math.sin(pt*1.3+i)*16-flee*120-i*8;bat(bx,by,.8+i*.15,Math.sin(pt*14+i*2));}
    c.drawImage(wreckGround(),0,0);
    const fog=layer('fog',520,70,()=>{for(let i=0;i<14;i++){c.fillStyle='rgba(226,200,240,.09)';c.beginPath();ell(20+i*37,35+Math.sin(i*1.9)*10,48,16);c.fill();}});
    const f1=-(pt*8%520);c.drawImage(fog,f1,420);c.drawImage(fog,f1+520,420);
    spookyHouse(ball);
    if(w.hit){impactFx(t);dustPuffs(t-.04);saleSign(t);ghostParade(t);}
    const f2=-(pt*14%520);c.drawImage(fog,f2,452);c.drawImage(fog,f2+520,452);
    c.drawImage(wreckFront(),0,0);
    wreckRig(ball);
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
        const line=`${label.length>22?label.slice(0,21)+'…':label}: GHOST EVICTOR`;
        txt(line,0,13,Math.min(15,330/(line.length*.65)),'#9bffe2');
        c.restore();
      }
    }
    else txt('HERE COMES TROUBLE...',210,552,15,'#fff0ab');
  }

  // ── 02 BEAM IT · a farm at night, a hungry saucer ────────────────────
  function beamBackdrop(){
    return layer('beamBg',420,640,()=>{
      const g=c.createLinearGradient(0,90,0,500);g.addColorStop(0,'#0d0b26');g.addColorStop(.6,'#272052');g.addColorStop(1,'#5b3a78');
      c.fillStyle=g;c.fillRect(0,0,420,640);
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
  function drawUfo(){
    const u=state.ufo,pt=state.playTime,tx=targetX();
    const windowPx=activePlan.round_modifiers?.round2_beam?.beam_window_px||68;
    const required=activePlan.round_modifiers?.round2_beam?.target_catches||2;
    const at=state.aftermath&&state.round===1?state.aftermath.time:0;
    const zip=reducedMotion?0:ease.in((at-.22)/.36),present=1-clamp(zip*2.5,0,1);
    c.drawImage(beamBackdrop(),0,0);
    for(let i=0;i<10;i++){const x=(i*97+40)%410,y=118+(i*53)%260;twinkle(x,y,(3+i%3)*(.6+.4*Math.sin(pt*1.6+i*1.3)),'#fff3c5',i);}
    const ss=(pt/6)%1;if(ss<.12&&!reducedMotion){const k=ss/.12;c.save();c.globalAlpha=1-k;stroke([[400-k*300,118+k*90],[430-k*300,108+k*90]],'#fff3c5',2.5);c.restore();}
    const o1=-(pt*4%420),o2=-(pt*9%420),far=beamFar(),farm=beamFarm();
    c.drawImage(far,o1,0);c.drawImage(far,o1+420,0);
    c.drawImage(farm,o2,0);c.drawImage(farm,o2+420,0);
    windmill(372+o2,428,pt);windmill(372+o2+420,428,pt);
    c.drawImage(beamRoad(),0,0);
    const aligned=Math.abs(tx-210)<windowPx&&state.scene==='playing'&&u.winCountdown<=0;
    c.save();c.globalAlpha=(aligned?.48:.18)*present;c.fillStyle='#7ff2d4';c.beginPath();ell(210,504,windowPx,9);c.fill();c.restore();
    c.save();c.globalAlpha=present;c.setLineDash([6,6]);c.lineDashOffset=-pt*12;c.strokeStyle=aligned?'#e4fff7':'rgba(127,242,212,.6)';c.lineWidth=2;c.beginPath();ell(210,504,windowPx,9);c.stroke();c.setLineDash([]);
    for(const s of[-1,1])cutPoly([[210+s*windowPx-5,522],[210+s*windowPx,514],[210+s*windowPx+5,522]],aligned?'#c9fff0':'#7ff2d4',INK,1.5,0);
    c.restore();
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
    for(const d of decoys)critter(d.x,dy+45,d.col,d.t,pt);
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
    const targetCatches = activePlan.round_modifiers?.round2_beam?.target_catches || 2;
    txt(`CAPTURED ${u.hits}/${targetCatches}`,210,140,25,'#a9ffe3');
    if(state.scene==='aftermath'||(cargo&&at>0)){const k=reducedMotion?1:ease.back(at/.25);c.save();c.translate(210,346);c.scale(k,k);txt('ADOPTED BY SPACE WEIRDOS.',0,0,20,'#a9ffe3');c.restore();}
    txt(`MISFIRES ${u.misses}`,210,580,12,'#f7cbd6');
    txt('TAP ANYWHERE WHEN ALIGNED!',210,615,13,'#fff2b2');
  }

  // ── 03 RUN FOR IT · a volcano with opinions ─────────────────────────
  const RIVULETS=[[[196,240],[180,284],[194,330],[166,372],[170,420],[150,470]],[[222,242],[238,292],[222,340],[250,384],[244,430],[266,492]],[[208,242],[203,276],[216,304],[210,330]]];
  function lavaBackdrop(){
    return layer('lavaBg',420,640,()=>{
      const g=c.createLinearGradient(0,100,0,520);g.addColorStop(0,'#ffcf8a');g.addColorStop(.45,'#ff9670');g.addColorStop(1,'#ff4f6a');
      c.fillStyle=g;c.fillRect(0,0,420,640);
      glowAt(74,170,125,'255,240,180',.6);
      for(let i=3;i>0;i--){c.globalAlpha=.12;circ(74,170,56+i*12,'#fff5ba',null);}c.globalAlpha=1;
      circ(74,170,52,'#fff5ba','#ffd98a',3);
      cutPoly([[0,360],[40,318],[78,340],[124,298],[170,336],[250,322],[300,290],[352,330],[392,306],[420,322],[420,520],[0,520]],'#e08494',null,0,0);
      const hz=c.createLinearGradient(0,300,0,380);hz.addColorStop(0,'rgba(255,200,150,0)');hz.addColorStop(1,'rgba(255,200,150,.45)');c.fillStyle=hz;c.fillRect(0,300,420,80);
      cutPoly([[-10,440],[56,352],[104,384],[150,348],[204,446]],'#a74c6e',INK,3,4);
      cutPoly([[226,446],[300,362],[338,390],[384,342],[430,376],[430,452]],'#a74c6e',INK,3,4);
      cutPoly([[22,500],[176,236],[244,236],[398,500]],'#6b2d52',INK,4,6);
      cutPoly([[214,238],[244,236],[398,500],[268,500]],'#5a2446',null,0,0);
      stroke([[176,238],[22,500]],'#8c3f68',3);
      cut(()=>ell(210,236,35,9),'#ffcd63',INK,3,0);circ(210,238,18,'rgba(255,241,168,.7)',null);
      const hz2=c.createLinearGradient(0,380,0,520);hz2.addColorStop(0,'rgba(255,170,120,0)');hz2.addColorStop(1,'rgba(255,170,120,.5)');c.fillStyle=hz2;c.fillRect(0,380,420,140);
    });
  }
  function volcano(){
    const pt=state.playTime;
    c.drawImage(lavaBackdrop(),0,0);
    for(let i=0;i<8;i++){const ph=(pt*.22+i/8)%1,x=210+ph*70+Math.sin(ph*6+i)*10,y=226-ph*150,r=9+ph*30;c.save();c.globalAlpha=(1-ph)*.7;cut(()=>ell(x,y,r,r*.85),i%2?'#8a5276':'#77456b',INK,2,0);circ(x-r*.3,y-r*.3,r*.32,'rgba(255,200,160,.35)',null);c.restore();}
    glowAt(210,236,70,'255,205,99',.55+.15*Math.sin(pt*2));
    for(const r of RIVULETS){curve(r,'#68263d',10);curve(r,'#ff6a3a',7);curve(r,'#ffb347',3.5);c.save();c.setLineDash([9,21,4,14]);c.lineDashOffset=-pt*30;curve(r,'#fff1a8',2.2);c.restore();}
    const er=(pt/2.6)%1;if(er<.5)for(let j=0;j<3;j++){const k=er/.5;circ(210+(j-1)*58*k,232-130*k+230*k*k-j*6,4+j,'#ffcd63',INK,2);}
    for(let i=0;i<10;i++){const ph=(pt*.18+i*.13)%1,px=(i*53+18)%420+Math.sin(pt*2+i)*8,py=500-ph*330;c.save();c.globalAlpha=Math.sin(ph*Math.PI)*.9;circ(px,py,2+i%3,i%2?'#ffd46d':'#ff6f6f',null);c.restore();}
    c.save();c.strokeStyle='rgba(255,241,181,.16)';c.lineWidth=2;
    for(let i=0;i<6;i++){const x=40+i*68;c.beginPath();for(let j=0;j<5;j++){const xx=x+Math.sin(pt*3+j+i)*5,yy=470-j*24;if(j)c.lineTo(xx,yy);else c.moveTo(xx,yy);}c.stroke();}
    c.restore();
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
  function drawLava(){
    volcano();
    const l=state.lava,pt=state.playTime;
    for(const x of [92,210,328]){c.save();c.setLineDash([5,14]);c.strokeStyle='rgba(255,244,186,.2)';c.lineWidth=2;c.beginPath();c.moveTo(x,149);c.lineTo(x,536);c.stroke();c.restore();}
    lavaLake();
    for(const r of l.rocks)rockShadow(r);
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
    if(l.near>0){const k=1-l.near/.5,side=l.nearSide||1;
      c.save();c.globalAlpha=1-k;c.lineCap='round';
      for(let i=0;i<3;i++){const yy=486+i*14,x0=l.x+side*(42+k*26);stroke([[x0,yy],[x0+side*(16+i*6),yy-9]],'#e9fff8',3);}
      c.strokeStyle='#53e8cb';c.lineWidth=3;c.beginPath();ell(l.x,512,40+k*40,(40+k*40)*.85);c.stroke();
      c.translate(l.x-side*30,474-k*10);cut(()=>{c.moveTo(0,-8);c.quadraticCurveTo(6,0,0,5);c.quadraticCurveTo(-6,0,0,-8);},'#8be9ff',INK,1.5,0);
      c.restore();}
    for(const r of l.rocks)rock(r);
    const maxHearts = activePlan.round_modifiers?.round3_lava?.hearts || 2;
    for(let i=0;i<maxHearts;i++){const full=i<l.hearts,b=full?1+.07*Math.sin(pt*6+i)*motion:.9;c.save();c.translate(330+i*25,138);c.scale(b,b);cut(()=>heartPath(10),full?'#ff5d86':'#5a2a44',INK,2.5,2);if(full)circ(-4,-3,2.2,'#ffd0dc',null);c.restore();}
    txt('SWIPE LEFT / RIGHT TO SURVIVE',210,612,14,'#fff3b8');
    txt(state.scene==='aftermath'?'STILL RAW IN THE MIDDLE!':'OH NO IT IS VERY HOT',210,585,12,'#fff4bd');
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
    const inGame=!['materializing','menu','summary'].includes(state.scene);
    c.save();
    if(inGame&&state.round===0&&state.wreck.hit&&!reducedMotion){const t=state.aftermath?.time||0,z=1+.06*Math.pow(1-clamp(t/.45,0,1),2);c.translate(305,322);c.scale(z,z);c.translate(-305,-322);}
    if(state.scene==='materializing')drawPortal();
    else if(!inGame)drawIntroBackdrop();
    else if(state.round===0)drawWreck();else if(state.round===1)drawUfo();else drawLava();
    drawParticles();
    for(const t of state.texts){const k=reducedMotion?1:ease.back((t.max-t.life)/.18);c.save();c.globalAlpha=clamp(t.life/t.max*1.6,0,1);c.translate(t.x,t.y);c.rotate(Math.sin(t.life*7)*.04);c.scale(k,k);txt(t.str,0,0,t.size,t.color);c.restore();}
    c.restore();
    overlays();
    if(inGame){titleBanner(stages[state.round].name,stages[state.round].theme,stages[state.round].color);timerBar();}
    if(state.flash>0&&!reducedMotion){c.fillStyle=`rgba(255,240,177,${Math.min(.22,state.flash*.28)})`;c.fillRect(0,0,420,640);}
    c.restore();
  }
  // Visual-only debris and lava splashes (separate RNG, never touches gameplay).
  function debris(x,y){
    for(const[shape,color,n]of[['brick','#8a4a66',9],['brick','#5b3149',6],['shard','#fff076',8],['shard','#ffe7a8',4]]){
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
