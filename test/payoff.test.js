const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {createDefaultGamePlan}=require('../gameplan');

// Run the actual browser game logic offline, with a lightweight DOM/Canvas host.
// Instrument only this test copy; production exposes no debug or spending hooks.
function arcade(reduced=false,music=null){
  let now=1000;
  const images=[],labels=[],elements=new Map();
  const context=new Proxy({
    measureText:s=>({width:String(s).length*12}),
    createLinearGradient:()=>({addColorStop(){}}),
    createRadialGradient:()=>({addColorStop(){}}),
    drawImage:(...args)=>images.push(args),
    fillText:s=>labels.push(s)
  },{get:(o,k)=>o[k]||(()=>{})});
  function element(id){
    if(!elements.has(id))elements.set(id,{
      hidden:false,disabled:false,dataset:{},textContent:'',innerHTML:'',checked:true,
      width:420,height:640,handlers:{},getContext:()=>context,
      addEventListener(type,fn){this.handlers[type]=fn;},
      getAnimations:()=>[],animate(){},scrollIntoView(){},click(){},
      getBoundingClientRect:()=>({left:0,top:0,width:420,height:640}),
      setPointerCapture(){},toBlob:fn=>fn({}),
      classList:{add(){},remove(){}}
    });return elements.get(id);
  }
  const sandbox={console,performance:{now:()=>now},URLSearchParams,Math,
    document:{querySelector:element,querySelectorAll:()=>[],createElement:id=>element('new-'+id)},
    window:{GamePlan:{createDefaultGamePlan},ThingMusic:music?{createMusicController:()=>music}:undefined,
      matchMedia:()=>({matches:reduced}),addEventListener(){}},
    location:{search:'?seed=7821'},requestAnimationFrame(){},
    fetch:async()=>({json:async()=>({})}),
    navigator:{canShare:()=>false},File:class {},
    URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout(){},
  };
  const source=fs.readFileSync(require.resolve('../game.js'),'utf8').replace(
    '  applyPlanToStages(activePlan);\n  resetPhysics();',
    '  globalThis.qa={applyPlanToStages,state,update,draw,wreckImpact,endRound,startRound,beginSession,setModal,tryBeam,shareIncident,drawWreck,drawUfo,drawLava};\n  applyPlanToStages(activePlan);\n  resetPhysics();');
  vm.runInNewContext(source,sandbox);
  return {...sandbox.qa,element,images,labels,advance(seconds){for(let t=0;t<seconds;t+=.01){now+=10;sandbox.qa.update(.01);}}};
}

test('wreck contact locks input/timer and commits exactly one result after 2.6 seconds',()=>{
  const a=arcade();a.beginSession();a.startRound();a.advance(.2);
  a.state.remaining=.01;a.state.elapsed=8.99;
  a.wreckImpact();const score=a.state.score,remaining=a.state.remaining;
  assert.equal(a.state.scene,'aftermath');assert.equal(a.element('#modal').hidden,true);
  for(let i=0;i<20;i++){a.wreckImpact();a.tryBeam();a.element('#primaryBtn').handlers.click();}
  assert.equal(a.state.score,score);assert.equal(a.state.ufo.hits,0);
  a.advance(.11);assert.equal(a.state.wreck.damage,0,'hit-stop freezes demolition');
  a.advance(1.85);assert.equal(a.state.scene,'aftermath');
  assert.equal(a.state.remaining,remaining);assert.equal(a.element('#modal').hidden,true);
  a.advance(.7);assert.equal(a.state.scene,'result');assert.equal(a.state.won[0],true);
  const final=a.state.score;a.endRound(true);a.wreckImpact();a.advance(1);
  assert.equal(a.state.score,final);
});

test('actual game transitions select menu/main music and duck the smash and major victories',()=>{
  const mixes=[],ducks=[];
  const a=arcade(false,{setMix:value=>mixes.push(value),duck:duration=>ducks.push(duration)});
  assert.equal(mixes.at(-1),'menu');
  a.beginSession();assert.equal(mixes.at(-1),'menu');
  a.startRound();assert.equal(mixes.at(-1),'main');a.advance(.2);
  a.wreckImpact();assert.ok(ducks.at(-1)>=2.6);a.advance(2.7);
  assert.equal(mixes.at(-1),'menu');assert.equal(ducks.at(-1),.65);
  a.state.round=1;a.startRound();a.advance(.2);a.state.ufo.hits=1;a.state.ufo.phase=0;
  a.tryBeam();a.advance(1.5);assert.equal(mixes.at(-1),'menu');
  assert.ok(ducks.some(duration=>duration>=.7&&duration<1));
  a.state.round=2;a.startRound();a.advance(.2);a.state.elapsed=10;a.update(.01);
  assert.ok(ducks.at(-1)>1);a.advance(1.1);assert.equal(mixes.at(-1),'menu');
  a.setModal('summary');assert.equal(mixes.at(-1),'menu');
  a.element('#demo').handlers.click();assert.equal(mixes.at(-1),'menu');
});

test('all rounds progress, final beam capture beats timer expiry, lava survival gets an aftermath',()=>{
  const a=arcade();a.beginSession();a.state.round=1;a.startRound();a.advance(.2);
  a.state.ufo.hits=1;a.state.ufo.phase=0;a.state.remaining=.01;a.state.elapsed=9.99;
  a.tryBeam();const remaining=a.state.remaining;a.advance(.6);
  assert.equal(a.state.scene,'playing');assert.equal(a.state.remaining,remaining);
  a.advance(.8);assert.equal(a.state.scene,'result');assert.equal(a.state.won[1],true);
  a.state.round=2;a.startRound();a.advance(.2);a.state.elapsed=10;a.update(.01);
  assert.equal(a.state.scene,'aftermath');a.advance(1.1);
  assert.equal(a.state.scene,'result');assert.equal(a.state.won[2],true);
});

test('reset clears an in-flight payoff and allows a fresh playable session',()=>{
  const a=arcade();a.beginSession();a.startRound();a.advance(.2);a.wreckImpact();
  a.element('#demo').handlers.click();a.advance(3);
  assert.equal(a.state.scene,'menu');assert.equal(a.state.score,0);assert.equal(a.state.aftermath,null);
  a.beginSession();a.startRound();a.advance(.2);assert.equal(a.state.scene,'playing');
});

test('transparent sprite survives all game renderers, finale portrait, and PNG export',async()=>{
  const a=arcade();const sprite={width:120,height:180};a.state.photo=sprite;a.state.cutout=true;
  for(const draw of [a.drawWreck,a.drawUfo,a.drawLava]){
    a.images.length=0;draw();assert.ok(a.images.some(args=>args[0]===sprite));
  }
  a.state.score=1234;a.state.won=[true,true,true];a.setModal('summary');
  assert.ok(a.images.some(args=>args[0]===sprite));assert.equal(a.element('#reportScore').textContent,'1234 PTS');
  assert.equal(a.element('#ticketStamp').textContent,'✹ ARCADE CHAOS REPORT ✹');
  a.images.length=0;await a.shareIncident();assert.ok(a.images.some(args=>args[0]===sprite));
  assert.equal(a.element('new-canvas').width,720);assert.equal(a.element('new-canvas').height,1280);
  assert.ok(a.labels.includes('ARCADE CHAOS REPORT'));
  a.state.cutout=false;a.drawLava();assert.ok(a.images.some(args=>args[0]===sprite));
});

test('reduced motion omits flash and still completes the celebration',()=>{
  const a=arcade(true);a.beginSession();a.startRound();a.wreckImpact();a.advance(2.7);
  assert.equal(a.state.scene,'result');assert.equal(a.state.won[0],true);
});

test('materialization completes locally without starting games or paid requests',()=>{
  const a=arcade();a.state.scene='materializing';a.state.materialize=0;
  a.advance(1);assert.equal(a.state.scene,'materializing');
  a.advance(.9);assert.equal(a.state.scene,'menu');assert.equal(a.state.score,0);
});

test('touch drag/release, beam taps and lava swipes remain playable',()=>{
  const a=arcade();a.beginSession();a.startRound();a.advance(.3);
  const e=(x,y)=>({clientX:x,clientY:y,pointerId:1,preventDefault(){}});
  const canvas=a.element('#game');
  canvas.handlers.pointerdown(e(70,260));canvas.handlers.pointermove(e(60,270));
  canvas.handlers.pointerup(e(60,270));assert.equal(a.state.wreck.launched,true);
  a.advance(.8);assert.equal(a.state.scene,'aftermath');
  a.state.round=1;a.startRound();a.advance(.2);a.state.ufo.phase=0;
  canvas.handlers.pointerdown(e(210,440));assert.equal(a.state.ufo.hits,1);
  a.state.round=2;a.startRound();a.advance(.2);
  canvas.handlers.pointerdown(e(210,510));canvas.handlers.pointermove(e(330,510));
  a.advance(.1);assert.ok(a.state.lava.x>250);canvas.handlers.pointerup(e(330,510));
  assert.equal(a.state.dragging,false);
});

test('model label and role are assigned as plain text in the report',()=>{
  const a=arcade();const label='<img src=x onerror=alert(1)>';
  const plan=createDefaultGamePlan({label});plan.whimsical_role='<script>bad()</script>';
  a.applyPlanToStages(plan);a.setModal('summary');
  assert.equal(a.element('#ticketTitle').textContent,label);
  assert.equal(a.element('#ticketBody').textContent,plan.whimsical_role);
  assert.ok(!a.element('#ticketTitle').innerHTML.includes(label));
  assert.equal(a.element('#reportPortrait').hidden,false);
});
