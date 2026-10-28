/* THING//MANIA v0.3 — Meta Global AI Developer Hackathon.
 * Fresh hackathon code with Meta Muse Spark 1.3 GamePlan integration.
 * All three microgames (WRECK IT, BEAM IT, RUN FOR IT) preserved.
 * Runs with local mock adapter, zero API spending, and 100% offline fallback.
 */
(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const c = canvas.getContext('2d');
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
    photoBase64:null, dragging:false, pointer:null,
    wreck:{angle:-0.85,omega:0,launched:false,hit:false,damage:0},
    ufo:{hits:0,misses:0,beam:0,beamGood:false,phase:0,abduct:0,winCountdown:0},
    lava:{x:210,targetX:210,rocks:[],spawn:0,hearts:2,invuln:0,dodge:0}
  };

  let audio = null;
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
    if (shareBtn) shareBtn.hidden = kind !== 'summary';
    const lines = activePlan.announcer_lines;
    if(kind==='menu'){
      stamp.textContent='✹ OFFICIAL NONSENSE MACHINE ✹';
      title.innerHTML='YOUR STUFF.<br><em>OUR PROBLEM.</em>';
      body.textContent=lines?.intro || 'Three different universes. Three absurd microgames. One object gets absolutely no peace.';
      badges.hidden=false; primary.innerHTML='START THE NONSENSE <span>➜</span>';
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
      stamp.textContent='✹ ARCADE INCIDENT REPORT ✹';
      const won=state.won.filter(Boolean).length;
      title.innerHTML=won===3?'CERTIFIED<br><em>MENACE.</em>':won===0?'YOU TRIED.<br><em>BARELY.</em>':'CHAOS<br><em>COMPLETE.</em>';
      body.textContent=lines?.summary || `${won}/3 worlds conquered. ${state.score} points of extremely questionable achievement. Your thing deserves a vacation.`;
      badges.hidden=false;
      badges.innerHTML=state.won.map((v,i)=>`<span>${v?'✓':'✕'} ${['WRECK','BEAM','LAVA'][i]}</span>`).join('');
      primary.innerHTML='ANOTHER DISASTER? <span>↻</span>';
      sub.textContent='PASS THE PHONE · CHALLENGE A FRIEND';
    }
  }


  // A private, local 9:16 result card. Nothing uploaded or sent to a server.
  async function shareIncident() {
    const result = document.createElement('canvas');
    result.width = 720; result.height = 1280;
    const g = result.getContext('2d');
    const W = result.width;
    g.fillStyle = '#171322'; g.fillRect(0, 0, W, result.height);
    // Scanline-free bold party-poster design: strong enough for a screenshot.
    g.fillStyle = '#312444';
    for (let i=0; i<13; i++) {
      const y=50+i*91;
      g.fillRect(28+(i%3)*12, y, 660-(i%3)*25, 2);
    }
    g.fillStyle = '#fdf071'; g.fillRect(28, 26, 664, 94);
    g.fillStyle = '#171322';
    g.font = '1000 52px system-ui,Arial'; g.textAlign = 'center';
    g.fillText('THING//MANIA', W/2, 91);
    g.fillStyle = '#fff3c5'; g.font = '900 27px monospace';
    g.fillText('OFFICIAL INCIDENT REPORT', W/2, 178);
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
    g.fillStyle = '#fff3c5'; g.fillRect(96, 294, 528, 530);
    g.fillStyle = '#2b2140'; g.fillRect(110, 308, 500, 502);
    const source = state.photo;
    if (source && (source.naturalWidth || source.width)) {
      const w=source.naturalWidth || source.width, h=source.naturalHeight || source.height;
      const fit=Math.min(470/w, 470/h);
      g.save();
      g.shadowColor='#ffe78c'; g.shadowBlur=30;
      g.drawImage(source, W/2-(w*fit)/2, 558-(h*fit)/2, w*fit, h*fit);
      g.restore();
    } else {
      g.fillStyle='#fdf071';g.font='1000 220px system-ui';g.fillText('?!',W/2,615);
    }
    g.fillStyle = '#fdf071'; g.fillRect(48, 856, 624, 114);
    g.fillStyle = '#171322';g.font='1000 68px system-ui,Arial';
    g.fillText(String(state.score).padStart(4,'0')+' PTS',W/2,933);
    const modes=['WRECK','BEAM','ESCAPE'];
    for (let i=0;i<3;i++) {
      const x=50+i*215;
      g.fillStyle=state.won[i]?'#53e8cb':'#ff5d86';
      g.fillRect(x,988,190,69);
      g.fillStyle='#171322';g.font='900 27px monospace';
      g.fillText((state.won[i]?'✓ ':'✕ ')+modes[i],x+95,1035);
    }
    fitLine(role,1130,28,652,'#fff3c5');
    g.fillStyle='#ff87a9';g.font='900 24px monospace';
    g.fillText('ONE PHOTO · THREE GAMES · ALL CHAOS',W/2,1192);
    g.fillStyle='#978fa8';g.font='700 19px monospace';
    g.fillText('Made with Meta Muse Spark 1.3'+(state.cutout?' + SAM 3.1':''), W/2,1235);
    const blob = await new Promise(resolve => result.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'thingmania-incident.png', {type:'image/png'});
    try {
      if (navigator.canShare?.({files:[file]}) && navigator.share) {
        await navigator.share({files:[file],title:'THING//MANIA Incident Report',
          text:'My household object survived the THING//MANIA arcade.'});
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=href; a.download='thingmania-incident.png'; a.click();
    setTimeout(()=>URL.revokeObjectURL(href),3000);
  }
  if (shareBtn) shareBtn.addEventListener('click', () => {
    shareIncident().catch(() => setStatus('INCIDENT CARD: SAVE FAILED / TRY AGAIN'));
  });

  function beginSession(){
    state.round=0;state.score=0;state.won=[null,null,null];
    const urlSeed=new URLSearchParams(location.search).get('seed');
    state.seed=urlSeed!==null?((Number(urlSeed)>>>0)||7821):((Math.random()*0xffffffff)>>>0);
    state.particles=[];state.texts=[];state.shake=0;resetPhysics();
    state.scene='between';setModal('round');setStatus(`ROUND 1 READY / ${activePlan.selected_object?.label?.toUpperCase() || 'MOCK READY'}`);
  }

  function startRound(){
    resetPhysics();state.particles=[];state.texts=[];state.remaining=stages[state.round].seconds;
    state.elapsed=0;state.scene='playing';state.shake=0;state.flash=0;state.dragging=false;
    modal.hidden=true;setStatus(`ROUND ${state.round+1} / ${stages[state.round].name} / LIVE`);
    tone(500,.09,'square',.06,1.3);setTimeoutSafeSound();
  }

  function setTimeoutSafeSound(){tone(740,.06,'triangle',.03,.8);}

  function endRound(win){
    if(state.scene!=='playing')return;
    state.won[state.round]=Boolean(win);state.scene='result';state.dragging=false;
    state.score+=win?250+Math.ceil(state.remaining)*12:0;
    setModal('result');setStatus(`ROUND ${state.round+1} ${win?'CLEARED':'FAILED'} · ${state.score} POINTS`);
    if(win){tone(540,.18,'triangle',.075,1.9);burst(210,260,'#fdf071',28,215);}else tone(170,.45,'sawtooth',.045,.40);
  }

  primary.addEventListener('click',()=>{
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();}catch(e){}
    if(state.scene==='menu'||state.scene==='summary'){beginSession();return;}
    if(state.scene==='between'){startRound();return;}
    if(state.scene==='result'){
      if(state.round===2){state.scene='summary';setModal('summary');setStatus('SESSION COMPLETE / PLAY AGAIN');}
      else{state.round++;state.scene='between';setModal('round');setStatus(`ROUND ${state.round+1} READY`);}
    }
  });

  document.querySelector('#demo').addEventListener('click',()=>{
    state.scene='menu';state.round=0;state.score=0;state.won=[null,null,null];
    resetPhysics();setModal('menu');setStatus('READY / NO AI REQUESTS');
  });

  document.querySelector('#photo').addEventListener('change',e=>{
    const file=e.target.files?.[0];if(!file)return;
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
      if (!userConsent.checked) {
        alert('User consent is required before transmitting or processing photo data.');
        return;
      }
      if (!state.photoBase64) return;
      analyzeBtn.disabled = true;
      setStatus('DIRECTOR: ANALYZING PHOTO WITH META MUSE SPARK...');
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
            cutoutStatus.textContent = `READY: CUT OUT ${data.plan.selected_object.label.toUpperCase()} · OPTIONAL SAM 3.1`;
            cutoutStatus.dataset.state = 'ready';
          }
        } else {
          activateFallback(data.fallback_plan || data.plan || null);
        }
      } catch (err) {
        console.warn('Backend unavailable, falling back to local offline GamePlan:', err);
        activateFallback();
      } finally {
        analyzeBtn.disabled = false;
        fetchBudgetStatus();
      }
    });
  }


  // Explicit second opt-in: Muse understands the object; SAM isolates it.
  async function makeSamSticker() {
    if (!state.originalPhoto || !activePlan?.selected_object?.label) return;
    if (!userConsent.checked) { alert('Approve photo transmission first.'); return; }
    cutoutBtn.disabled = true;
    cutoutStatus.textContent = 'SAM 3.1: CUTTING OUT YOUR CHARACTER...';
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
      state.photo = sprite;
      state.cutout = true;
      cutoutStatus.textContent = `STICKER UNLOCKED: ${data.concept.toUpperCase()} · SAM 3.1 ${data.cached ? 'CACHED' : 'LIVE'}`;
      cutoutStatus.dataset.state = 'ready';
      setStatus('SAM 3.1: BACKGROUND REMOVED / PLAY YOUR CHARACTER');
      document.querySelector('.arcade-shell')?.scrollIntoView({
        behavior: 'smooth', block: 'start'
      });
    } catch (err) {
      cutoutStatus.textContent = `CUTOUT UNAVAILABLE (${String(err.message || 'ERROR').slice(0, 38)}) · GAME STILL WORKS`;
      cutoutStatus.dataset.state = 'error';
      if (!apiAttempted) cutoutBtn.disabled = false;
    } finally { fetchBudgetStatus(); }
  }
  if (cutoutBtn) cutoutBtn.addEventListener('click', makeSamSticker);

  // Handle Fixture Buttons
  chipButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
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
    state.playTime+=dt;
    state.shake=Math.max(0,state.shake-dt*24);state.flash=Math.max(0,state.flash-dt*2.4);
    for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.angle+=p.spin*dt;p.life-=dt;}
    state.particles=state.particles.filter(p=>p.life>0).slice(-180);
    for(const t of state.texts){t.y-=56*dt;t.x+=t.vx*dt;t.life-=dt;}state.texts=state.texts.filter(t=>t.life>0);
    if(state.scene!=='playing')return;
    state.elapsed+=dt;state.remaining=Math.max(0,stages[state.round].seconds-state.elapsed);
    if(state.round===0){
      const w=state.wreck;
      if(w.launched&&!w.hit){
        w.omega+=-12.2*Math.sin(w.angle)*dt;
        w.omega*=Math.pow(.992,dt*60);
        w.angle+=w.omega*dt;
        if(w.angle>.32){wreckImpact();}
        else if(w.angle < -1.15 && state.elapsed>3.0){w.launched=false;w.omega=0;}
      }
      if(w.hit){w.damage=Math.min(1,w.damage+dt*1.12);if(w.damage>=1&&state.scene==='playing')endRound(true);}
    }else if(state.round===1){
      const speedMult = activePlan.round_modifiers?.round2_beam?.ufo_speed_mult || 1.0;
      state.ufo.phase+=dt*1.93*speedMult;
      state.ufo.beam=Math.max(0,state.ufo.beam-dt);
      state.ufo.abduct=Math.max(0,state.ufo.abduct-dt);
      if(state.ufo.winCountdown>0){state.ufo.winCountdown=Math.max(0,state.ufo.winCountdown-dt);if(state.ufo.winCountdown===0)endRound(true);}
    }else{
      const l=state.lava;l.x=lerp(l.x,l.targetX,Math.min(1,dt*13));l.spawn+=dt;
      l.invuln=Math.max(0,l.invuln-dt);
      const spawnInterval = activePlan.round_modifiers?.round3_lava?.spawn_interval || 0.73;
      const minSpd = activePlan.round_modifiers?.round3_lava?.rock_speed_min || 245;
      const maxSpd = activePlan.round_modifiers?.round3_lava?.rock_speed_max || 315;
      if(l.spawn>spawnInterval){l.spawn=0;
        const lane=Math.floor(random()*3),xx=[92,210,328][lane];
        l.rocks.push({x:xx,y:-40,r:rnd(23,34),spin:rnd(-4,4),a:rnd(0,TAU),speed:rnd(minSpd,maxSpd)});
      }
      for(const rock of l.rocks){rock.y+=rock.speed*dt;rock.a+=rock.spin*dt;
        if(rock.y>490&&rock.y<554&&Math.abs(rock.x-l.x)<rock.r+27&&l.invuln<=0){
          l.hearts--;l.invuln=1.35;state.shake=12;state.flash=.23;burst(l.x,512,'#ff624f',24,220);shout('OW!',l.x,457,'#fff1b0',35);noise(.24,.12);tone(100,.27,'sawtooth',.07,.38);
          if(l.hearts<=0){endRound(false);break;}
        }
      }
      l.rocks=l.rocks.filter(r=>r.y<690);
    }
    if(state.remaining<=0 && !(state.round===1&&state.ufo.winCountdown>0)){endRound(state.round===2);}
  }
  function wreckImpact(){
    const w=state.wreck;w.hit=true;w.omega=0;state.shake=19;state.flash=.24;state.score+=175;
    burst(317,293,'#fcdb77',40,235);
    const signature=signatureBurst(306,262,34);
    shout(signature.word,260,190,signature.secondary,31);
    tone(81,.39,'sawtooth',.11,.3);noise(.45,.21);
  }
  function path(points,color,stroke='#191426',width=3){c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke();}}
  function rect(x,y,w,h,fill,stroke='#171222',line=3,r=0){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=line;c.strokeStyle=stroke;c.stroke();}}
  function circ(x,y,r,fill,stroke='#171222',line=3){c.beginPath();c.arc(x,y,Math.max(0.1,r),0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=line;c.strokeStyle=stroke;c.stroke();}}
  function txt(s,x,y,size=20,color='#fff3bd',align='center',stroke='#191329',weight=1000){c.save();c.font=`${weight} ${size}px system-ui,Arial`;c.textAlign=align;c.textBaseline='middle';if(stroke){c.strokeStyle=stroke;c.lineWidth=size<13?2:5;c.lineJoin='round';c.strokeText(s,x,y);}c.fillStyle=color;c.fillText(s,x,y);c.restore();}
  function star(x,y,n=7,r=18,color='#ffef8c'){const v=[];for(let i=0;i<n*2;i++){const a=(i*Math.PI/n)-Math.PI/2,rr=i%2?r*.46:r;v.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}path(v,color);}
  function drawThing(x,y,size=74,rot=0,glow=false){
    c.save();c.translate(x,y);c.rotate(rot);
    if (state.cutout && state.photo) {
      const im = state.photo;
      const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      const fit = Math.min(size * 1.15 / w, size * 1.15 / h);
      c.shadowColor = '#fff0b0';
      c.shadowBlur = glow ? 20 : 9;
      c.shadowOffsetY = 3;
      c.drawImage(im, -w * fit / 2, -h * fit / 2, w * fit, h * fit);
      c.restore();
      return;
    }
    if(glow)c.shadowColor='#fff08a',c.shadowBlur=21;
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
    const g=c.createLinearGradient(0,0,0,640);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,420,640);
    c.save();c.globalAlpha=.10;
    for(let x=10;x<420;x+=22)for(let y=35;y<620;y+=22){circ(x+((y%44)?4:0),y,1.6,detail,null);}
    c.restore();
  }
  function titleBanner(label,sub,accent){
    rect(11,12,398,53,'#1d1834','#0b0a18',3,6);
    rect(14,15,9,47,accent,null,0,2);
    txt(label,34,35,26,'#fff2c7','left');txt(sub,394,52,10,accent,'right',null,900);
  }
  function timerBar(){
    const s=stages[state.round],p=clamp(state.remaining/s.seconds,0,1);
    rect(17,73,386,23,'#151322','#0c0b13',2,3);rect(21,77,378*p,15,p<.25?'#fb567d':'#fbed78',null,0,2);
    txt(`${state.remaining.toFixed(1)}s`,210,84,11,'#111225','center',null,1000);
    txt(`SCORE ${state.score.toString().padStart(4,'0')}`,18,111,13,'#fff4bb','left','#1c1930');
    txt(`0${state.round+1}/03`,401,111,13,'#fff4bb','right','#1c1930');
  }
  function spookyHouse(){
    const progress=state.wreck.damage;
    c.save();c.translate(progress*9,progress*29);c.rotate(progress*.12);
    path([[0,490],[70,479],[146,499],[232,482],[420,499],[420,640],[0,640]],'#2c3852',null);
    for(const p of [[53,481],[133,495],[400,487]]){rect(p[0]-8,p[1]-23,23,31,'#9e9ab0','#272138',2,12);txt('RIP',p[0]+4,p[1]-9,7,'#353049','center',null);}
    const panels=[{x:257,y:296,w:119,h:147,a:-progress*.22,off:-progress*16},{x:247,y:262,w:145,h:40,a:progress*.32,off:-progress*26}];
    for(const p of panels){c.save();c.translate(p.x+p.w/2,p.y+p.h/2+p.off);c.rotate(p.a);rect(-p.w/2,-p.h/2,p.w,p.h,p.y<280?'#623858':'#362c52','#101023',5,4);c.restore();}
    c.save();c.translate(316-progress*30,284-progress*22);c.rotate(progress*.27);
    path([[-88,8],[0,-80],[89,8]],'#513149','#0c1123',7);
    path([[-60,-10],[-60,-54],[-35,-54],[-35,-28]],'#8a4561','#201529',4);
    path([[40,-30],[40,-61],[69,-61],[69,-4]],'#8a4561','#201529',4);
    c.restore();
    for(const x of [272,339]){rect(x-progress*15,321-progress*25,22,37,'#fff076','#19152c',4,3);path([[x+11-progress*15,321-progress*25],[x+11-progress*15,356-progress*25]],'#19152c',null);}
    rect(295-progress*19,380-progress*25,40,63,'#e46a85','#181329',5,18);
    txt('NO REFUNDS',309,472-progress*9,10,'#f8cf85','center');
    c.restore();
    if(state.wreck.hit){
      const p=clamp(progress,0,1);
      for(let i=0;i<5;i++){const gx=310+Math.sin(i*2.7)*92*p,gy=313-135*p+Math.cos(i*4)*61*p;
        ghost(gx,gy,22+i%2*5,state.playTime*2+i);
      }
    }
  }
  function ghost(x,y,s,t){
    c.save();c.translate(x,y+Math.sin(t)*4);c.rotate(Math.sin(t*.65)*.1);
    c.beginPath();c.moveTo(-s*.72,s*.62);c.lineTo(-s*.75,-s*.09);c.bezierCurveTo(-s*.8,-s*.94,s*.76,-s*.93,s*.75,-s*.08);
    c.lineTo(s*.74,s*.61);c.lineTo(s*.40,s*.4);c.lineTo(s*.11,s*.66);c.lineTo(-s*.24,s*.42);c.closePath();c.fillStyle='#d7fff1';c.lineWidth=3;c.strokeStyle='#2a2352';c.fill();c.stroke();
    circ(-s*.25,-s*.17,s*.09,'#241c50',null);circ(s*.23,-s*.15,s*.09,'#241c50',null);circ(0,s*.18,s*.11,'#f66c9a',null);c.restore();
  }
  function drawWreck(){
    drawBackground('#292049','#754057','#d3a5e1');
    circ(334,174,48,'#f5e0a1',null);circ(343,160,42,'#292049',null);
    for(const x of [49,106,223]){c.save();c.translate(x,198+Math.sin(state.playTime*2+x)*8);txt('⌁',0,0,33,'#17152c');c.restore();}
    spookyHouse();
    const w=state.wreck,pivot=pt(210,139),length=190;
    const bx=pivot.x+Math.sin(w.angle)*length,by=pivot.y+Math.cos(w.angle)*length;
    c.strokeStyle='#ded2cf';c.lineWidth=6;c.beginPath();c.moveTo(pivot.x,pivot.y);c.lineTo(bx,by);c.stroke();
    for(let t=0;t<1;t+=.15){const x=lerp(pivot.x,bx,t),y=lerp(pivot.y,by,t);circ(x,y,2.8,'#5a5878',null);}
    circ(pivot.x,pivot.y,12,'#f5c369','#171326',4);
    const wreckScale = activePlan.round_modifiers?.round1_wreck?.wreck_scale || 1.0;
    const thingSize = 89 * wreckScale;
    if(!w.hit)drawThing(bx,by,thingSize,w.angle*.3,true);
    else drawThing(345,320,thingSize,.6,true);
    if(!w.launched&&!w.hit){
      c.save();c.setLineDash([6,8]);c.beginPath();c.arc(210,139,190,Math.PI*.18,Math.PI*.82);c.strokeStyle='#ffef9b';c.lineWidth=2;c.stroke();c.restore();
      txt(state.dragging?'RELEASE!':'PULL LEFT, THEN LET GO!',210,541,20,'#fff0ab');
    }else if(w.hit){txt('GHOSTS: FREED',210,552,23,'#9bffe2');}
    else txt('HERE COMES TROUBLE...',210,552,15,'#fff0ab');
  }
  function saucer(x,y,scale=1){
    c.save();c.translate(x,y);c.scale(scale,scale);
    c.fillStyle='#b5b3e4';c.strokeStyle='#161729';c.lineWidth=4;c.beginPath();c.ellipse(0,10,84,21,0,0,TAU);c.fill();c.stroke();
    c.beginPath();c.ellipse(0,-1,46,32,0,Math.PI,TAU);c.fillStyle='#8bf6eb';c.fill();c.stroke();
    c.beginPath();c.ellipse(0,13,82,11,0,0,TAU);c.fillStyle='#ff85a3';c.fill();c.stroke();
    for(const px of [-55,-27,0,27,55])circ(px,17,5,'#f6f198',null);
    c.restore();
  }
  function drawUfo(){
    drawBackground('#10152f','#363b71','#82f8dc');
    for(let i=0;i<27;i++){const x=(i*83+35)%420,y=(i*47+163)%420;star(x,y,i%2?4:5,3+i%3,'#faf1ba');}
    circ(64,193,28,'#d36dc4',null);circ(58,183,8,'#8c57b6',null);circ(70,200,7,'#8c57b6',null);
    path([[0,495],[60,473],[110,492],[176,480],[250,493],[310,475],[420,498],[420,640],[0,640]],'#554466',null);
    rect(0,505,420,113,'#242941',null,0);for(let x=15;x<420;x+=72)rect(x,552,33,6,'#fcce72',null,0,3);
    const u=state.ufo;const tx=targetX();
    if(u.beam>0){
      c.save();c.globalAlpha=.38+u.beam*.65;
      path([[201,230],[219,230],[295,506],[122,506]],u.beamGood?'#78ffcf':'#ff6993',null);c.restore();
      for(let i=0;i<6;i++)star(160+(i*26),410-Math.sin(state.playTime*11+i)*80,5,7,'#fff3b3');
    }else{
      c.save();c.setLineDash([7,10]);c.strokeStyle='#fcf1b6';c.lineWidth=2;c.beginPath();c.moveTo(210,244);c.lineTo(210,516);c.stroke();c.restore();
      path([[165,487],[210,502],[255,487]],'#69fce0',null);
    }
    saucer(210,204,1);
    const dy=448;
    const planDecoys = activePlan.round_modifiers?.round2_beam?.decoys || ['COW?', 'NOT IT'];
    const decoys=[{x:210+151*Math.sin(u.phase+2.04),col:'#ffa5c6',t:planDecoys[0] || 'COW?'},{x:210+151*Math.sin(u.phase+4.1),col:'#ffe483',t:planDecoys[1] || 'NOT IT'}];
    for(const d of decoys){c.save();c.translate(d.x,dy+45);c.rotate(Math.sin(state.playTime*3+d.x)*.1);rect(-27,-21,54,42,d.col,'#171329',4,9);circ(-11,-4,5,'#171329',null);circ(13,-4,5,'#171329',null);txt(d.t,0,37,9,'#fff3bd');c.restore();}
    if(u.abduct<=0)drawThing(tx,dy+27,70,Math.sin(state.playTime*2)*.13,true);
    else{const lift=(.38-u.abduct)*310;drawThing(210,dy+27-lift,70-lift*.055,Math.sin(state.playTime*12)*.3,true);}
    const targetCatches = activePlan.round_modifiers?.round2_beam?.target_catches || 2;
    txt(`CAPTURED ${u.hits}/${targetCatches}`,210,140,25,'#a9ffe3');
    txt(`MISFIRES ${u.misses}`,210,580,12,'#f7cbd6');
    txt('TAP ANYWHERE WHEN ALIGNED!',210,615,13,'#fff2b2');
  }
  function volcano(){
    drawBackground('#fa9664','#ff4a66','#fff2a5');
    circ(74,163,55,'#ffe6a3',null);circ(68,157,49,'#fff5ba',null);
    path([[0,408],[104,247],[223,419]],'#a25065','#251832',5);
    path([[192,395],[311,236],[420,399]],'#8a385e','#251832',5);
    path([[272,284],[310,235],[347,287],[336,294],[294,296]],'#ffd17f','#481b36',3);
    path([[0,548],[118,458],[202,550]],'#5b3359','#2d2244',3);
    for(let i=0;i<15;i++){const px=(i*53+18)%420,py=260+(i*79)%265;
      circ(px,py+Math.sin(state.playTime*3+i)*9,3+i%4,i%2?'#ffd46d':'#e44168',null);
    }
    path([[0,524],[75,530],[150,513],[220,525],[315,505],[420,521],[420,640],[0,640]],'#ff802e','#68263d',6);
    for(let i=0;i<11;i++){const xx=(i*49+state.playTime*52)%480-20,yy=568+Math.sin(i*3+state.playTime*3)*25;path([[xx,yy],[xx+19,yy-8],[xx+35,yy],[xx+16,yy+11]],'#ffe46b',null);}
    txt('!!! ACTIVE VOLCANO !!!',210,442,18,'#fff3a5');
  }
  function rock(r){
    c.save();c.translate(r.x,r.y);c.rotate(r.a);
    path([[-r.r,-r.r*.14],[-r.r*.62,-r.r*.86],[r.r*.2,-r.r],[r.r*.94,-r.r*.2],[r.r*.8,r.r*.7],[-r.r*.4,r.r]],'#26233c','#0c1122',4);
    path([[-r.r*.52,-r.r*.39],[r.r*.16,-r.r*.6],[r.r*.43,-r.r*.07],[-r.r*.08,r.r*.48]],'#ff8d58','#582743',2);
    circ(-r.r*.12,-r.r*.1,3,'#ffe399',null);c.restore();
  }
  function drawLava(){
    volcano();
    const l=state.lava;
    for(const x of [92,210,328]){c.save();c.setLineDash([5,14]);c.strokeStyle='rgba(255,244,186,.30)';c.lineWidth=2;c.beginPath();c.moveTo(x,149);c.lineTo(x,536);c.stroke();c.restore();}
    for(const r of l.rocks)rock(r);
    c.save();if(l.invuln>0&&Math.floor(state.playTime*12)%2===0)c.globalAlpha=.36;
    c.translate(l.x,0);
    path([[-55,544],[55,544],[39,559],[-45,559]],'#69eee0','#202238',4);
    drawThing(0,510,65,Math.sin(state.playTime*10)*.07,true);
    c.restore();
    const maxHearts = activePlan.round_modifiers?.round3_lava?.hearts || 2;
    for(let i=0;i<maxHearts;i++)txt(i<l.hearts?'♥':'♡',330+i*25,138,25,i<l.hearts?'#fff3aa':'#ab5972');
    txt('SWIPE LEFT / RIGHT TO SURVIVE',210,612,14,'#fff3b8');
    txt('OH NO IT IS VERY HOT',210,585,12,'#fff4bd');
  }
  function drawIntroBackdrop(){
    drawBackground('#24203e','#853954','#f1b972');
    for(let i=0;i<18;i++){const x=(i*83+23)%420,y=(i*47+82)%640;star(x,y,6,13+i%3*5,i%2?'#ff7c9d':'#fae78d');}
    c.save();c.translate(216,318);c.rotate(Math.sin(state.playTime*2)*.035);
    rect(-129,-111,258,221,'#fff1c1','#191229',7,9);
    txt('YOUR THING GOES HERE',0,-84,14,'#292039','center',null);
    drawThing(0,0,138,Math.sin(state.playTime*2)*.16);
    txt('NO REFUNDS',0,90,17,'#ef476f','center',null);
    c.restore();
    txt('THREE BAD IDEAS / ONE PHOTO',210,581,18,'#fff4b7');
  }
  function draw(){
    c.save();c.clearRect(0,0,WIDTH,HEIGHT);
    if(state.shake>0)c.translate(rnd(-state.shake,state.shake),rnd(-state.shake,state.shake));
    if(state.scene==='menu'||state.scene==='summary')drawIntroBackdrop();
    else{
      if(state.round===0)drawWreck();else if(state.round===1)drawUfo();else drawLava();
      titleBanner(stages[state.round].name,stages[state.round].theme,stages[state.round].color);
      timerBar();
    }
    for(const p of state.particles){c.save();c.globalAlpha=clamp(p.life/p.max,0,1);c.translate(p.x,p.y);c.rotate(p.angle);
      if(p.shape==='seed'){
        c.beginPath();c.ellipse(0,0,p.r*.28,p.r*.63,.4,0,TAU);c.fillStyle=p.color;c.fill();
      }else if(p.shape==='splash'){
        c.beginPath();c.ellipse(0,0,p.r*.35,p.r*.7,0,0,TAU);c.fillStyle=p.color;c.fill();
      }else if(p.shape==='spark'){
        c.fillStyle=p.color;c.fillRect(-p.r*.15,-p.r*.8,p.r*.3,p.r*1.6);
      }else if(p.shape==='fluff'){
        circ(0,0,p.r*.6,p.color,null);
      }else rect(-p.r/2,-p.r/2,p.r,p.r,p.color,null,0,1);
      c.restore();}
    for(const t of state.texts){c.save();c.globalAlpha=clamp(t.life/t.max,0,1);c.translate(t.x,t.y);c.rotate(Math.sin(t.life*7)*.04);txt(t.str,0,0,t.size,t.color);c.restore();}
    if(state.flash>0){c.fillStyle=`rgba(255,240,177,${state.flash*.48})`;c.fillRect(0,0,420,640);}
    c.restore();
  }
  function frame(now){
    const dt=state.last?Math.min(.042,(now-state.last)/1000):.016;state.last=now;
    update(dt);draw();requestAnimationFrame(frame);
  }
  applyPlanToStages(activePlan);
  resetPhysics();setModal('menu');fetchBudgetStatus();requestAnimationFrame(frame);
})();
