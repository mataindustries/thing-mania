'use strict';
// Local capture instrument only. Repository game sources are never written.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'docs/demo/captures');
const fps=30,events=[],assets={};
for(const f of ['game.js','gameplan.js','stage_machine.js','music.js','index.html','styles.css','fixtures/toy_car.json'])assets[f]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const anchor='  applyPlanToStages(activePlan);\n  resetPhysics();';
const instrument=`  window.captureHarness={step(){update(1/30);draw();},read(){return JSON.parse(JSON.stringify({scene:state.scene,round:state.round,won:state.won,score:state.score,ufo:state.ufo,lava:state.lava,wreck:state.wreck,assemble:stageMachine.assemble,recipes:stageMachine.recipes}));}};\n`;
const shell=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#100d18;color:#fff3c5;font:32px Arial}iframe{position:absolute;left:100px;top:50px;width:390px;height:844px;border:0;transform:scale(1.15);transform-origin:top left}aside{position:absolute;left:670px;top:160px;width:1100px}h1{font-size:80px;color:#fdf071}h2{font-size:44px;color:#53e8cb}p{line-height:1.5}small{font-size:24px;color:#c3b5d4}</style><iframe src="/index.html?seed=7821&remix=REMIX"></iframe><aside><small>ACTUAL OFFLINE FIXTURE GAMEPLAY · LOCAL CAPTURE</small><h1>THING//MANIA</h1><h2 id="world">YOUR STUFF. OUR TERRIBLE IDEAS.</h2><p id="beat">Three games. Six worlds.<br>Seeded remixes. Zero model calls.</p><small>No live inference or SAM cutout in this clip.<br>Original DaemonV12 soundtrack added separately in edit.</small></aside>`;
const allow=new Set(['index.html','styles.css','game.js','gameplan.js','stage_machine.js','music.js','fixtures/toy_car.json']);
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(shell.replace('REMIX',u.searchParams.get('remix')==='1'?'1':'0'));}
 const f=u.pathname.slice(1);if(!allow.has(f)){res.writeHead(404);return res.end();}
 let b=fs.readFileSync(path.join(root,f));
 if(f==='index.html')b=b.toString().replace('<script src="gameplan.js">','<script>window.THING_STATIC_RELEASE=true;</script><script src="gameplan.js">');
 if(f==='game.js'){if(!b.toString().includes(anchor))throw Error('Instrumentation anchor changed');b=b.toString().replace(anchor,instrument+anchor).replaceAll('requestAnimationFrame(frame)', '0 /* capture uses fixed simulation steps */');}
 res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':'text/html');res.end(b);
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});const manifest=process.env.SESSION==='1'&&fs.existsSync(path.join(root,'docs/demo/manifests/capture.json'))?JSON.parse(fs.readFileSync(path.join(root,'docs/demo/manifests/capture.json'))):{sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim(),assets,viewport:[390,844],master:[1920,1080],fps,seed:7821,audio:'SILENT: use approved OST separately; no browser audio recorded',instrumentation:'Local-only read snapshot and update/draw at fixed 1/30 s; no state setters; original pointer and button handlers',clips:[]};
 try{for(let session=Number(process.env.SESSION||0);session<2;session++){
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__captureTime=1000;performance.now=()=>window.__captureTime;});
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return route.abort();return route.continue();});
 await page.goto(`${base}/?remix=${session}`);const game=page.frames().find(f=>f.url().includes('/index.html'));
 await game.waitForFunction(()=>window.captureHarness);
 // Disable music using the real preference control; video is intentionally silent.
 await game.locator('#musicToggle').click();
 await game.locator('summary').click();await game.locator('[data-fixture="toy_car"]').click();await game.waitForFunction(()=>document.querySelector('#status').textContent.includes('FIXTURE'));
 const step=async()=>{await game.evaluate(()=>{window.__captureTime+=1000/30;window.captureHarness.step();});};
 const read=()=>game.evaluate(()=>window.captureHarness.read());
 const idle=async(n)=>{for(let i=0;i<n;i++)await step();};
 const next=async()=>{await idle(24);await game.locator('#primaryBtn').click();};
 if(session===1){await idle(24);await game.locator('#remixBtn').click();await idle(65);}
 await next();
 for(let round=0;round<3;round++){
  await idle(24);await game.locator('#remixBtn').click();
  const initial=await read(),key=['wreck','beam','dodge'][round],world=initial.recipes[key].set;
  await page.locator('#world').evaluate((e,t)=>e.textContent=t,world.replaceAll('_',' ').toUpperCase());
  await page.locator('#beat').evaluate((e,t)=>e.textContent=t,['WRECK IT · IMPACT + GHOST AFTERMATH','BEAM IT · TIMED CATCH + VICTORY','DODGE IT · SURVIVE + CHAOS REPORT'][round]);
  await game.locator('.arcade-shell').evaluate(e=>e.scrollIntoView({block:'start'}));
  const name=`${session+1}-${key}-${world}.mp4`,file=path.join(out,name);
  const reuse=fs.existsSync(file); // Resume without rendering an existing clip again.
  const encoder=reuse?null:spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',file]);
  let encError='';encoder?.stderr.on('data',b=>encError+=b);const done=reuse?Promise.resolve():new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code?reject(Error(encError)):resolve());});
  const marks=[];let last='',count=0,started=false,released=false,resultFrames=0,reported=false;
  for(let frame=0;frame<720;frame++){
   let s=await read();
   if(s.scene!==last){marks.push({frame,time:frame/fps,event:s.scene});last=s.scene;}
   if(frame===65){await game.locator('#primaryBtn').click();started=true;}
   s=await read();
   const box=await game.locator('#game').boundingBox();
   const mouse=async(x,y)=>page.mouse.move(box.x+x/420*box.width,box.y+y/640*box.height);
   if(started&&s.scene==='playing'){
    if(round===0&&!released){await mouse(60,270);await page.mouse.down();await mouse(60,270);await page.mouse.up();released=true;marks.push({frame,time:frame/fps,event:'pointer drag/release'});}
    if(round===1&&s.ufo.beam<=0&&s.ufo.winCountdown<=0&&Math.abs(136*Math.sin(s.ufo.phase))<35){await mouse(210,440);await page.mouse.click(box.x+box.width/2,box.y+box.height*.68);}
    if(round===2){
     const danger=s.lava.rocks.filter(r=>r.y>200&&r.y<555);
     const lanes=[58,210,362];const best=lanes.sort((a,b)=>Math.min(...danger.map(r=>Math.abs(r.x-b)),999)-Math.min(...danger.map(r=>Math.abs(r.x-a)),999))[0];
     await mouse(best,510);if(!released){await page.mouse.down();released=true;}
    }
   }
   if(s.scene==='result'){
    resultFrames++;
    if(resultFrames===1){if(released)await page.mouse.up();if(s.won[round]!==true)throw Error(`Win capture failed: ${world}`);}
    if(round===2&&resultFrames===65&&!reported){await game.locator('#primaryBtn').click();reported=true;await game.locator('#modal').evaluate(e=>e.scrollIntoView({block:'center'}));}
    if(round<2&&resultFrames>=65)break;
   }
   if(reported&&resultFrames>=65){ // summary no longer increments resultFrames
    if(s.scene==='summary')resultFrames++;
    if(resultFrames>=130)break;
   }
   if(!reuse){const jpg=await page.screenshot({type:'jpeg',quality:86});
   if(!encoder.stdin.write(jpg))await new Promise(r=>encoder.stdin.once('drain',r));}count++;await step();
  }
  encoder?.stdin.end();await done;
  const end=await read();if(round===2&&end.scene!=='summary')throw Error('Report missing');
  const probe=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_streams','-show_format','-of','json',file]));
  if(Number(probe.streams[0].nb_frames)!==count)throw Error('Existing capture is incomplete or harness differs: '+name);
  manifest.clips.push({file:`captures/${name}`,world,game:key,session,frames:count,duration:count/fps,marks,won:end.won,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),probe});
  fs.writeFileSync(path.join(root,'docs/demo/manifests/capture.json'),JSON.stringify(manifest,null,2)+'\n');console.log(name,count,'frames',end.won);
  if(round<2)await next();
 }
 if(errors.length)throw Error(errors.join('\n'));await page.close();
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
