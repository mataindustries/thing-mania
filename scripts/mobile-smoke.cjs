// Run with PLAYWRIGHT_MODULE pointing to an installed playwright module.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'), http=require('node:http'), path=require('node:path');
(async()=>{
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.ogg':'audio/ogg','.m4a':'audio/mp4'};
 const server=http.createServer((req,res)=>{
  const file=path.join(process.cwd(),'dist',req.url==='/'?'index.html':req.url);
  if(!file.startsWith(path.join(process.cwd(),'dist/'))||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[],api=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/'))api.push(r.url());});
 await page.goto(process.env.RELEASE_URL||`http://127.0.0.1:${server.address().port}`);
 await page.locator('[data-fixture="toy_car"]').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('FIXTURE'));
 fs.mkdirSync('docs/screenshots',{recursive:true});
 await page.screenshot({path:'docs/screenshots/mobile-menu.png',fullPage:true});
 await page.locator('#primaryBtn').click();
 for(let i=0;i<3;i++){
  await page.waitForFunction(()=>!document.querySelector('#modal').hidden && document.querySelector('#modal').dataset.kind==='round');
  await page.waitForTimeout(700);
  if(i===0){
   await page.locator('#remixBtn').click();
   await page.waitForFunction(()=>!document.querySelector('#modal').hidden);
   await page.waitForTimeout(700);
  }
  await page.locator('#primaryBtn').click();
  await page.waitForTimeout(1500);
  await page.locator('#game').screenshot({path:`docs/screenshots/game-${i+1}.png`});
  await page.waitForFunction(()=>!document.querySelector('#modal').hidden && document.querySelector('#modal').dataset.kind==='result');
  await page.waitForTimeout(700);
  await page.locator('#primaryBtn').click();
 }
 await page.waitForFunction(()=>!document.querySelector('#shareBtn').hidden);
 await page.waitForFunction(()=>document.querySelector('#musicToggle').dataset.state==='playing');
 await page.locator('#modal').screenshot({path:'docs/screenshots/chaos-report.png'});
 await page.locator('#shareBtn').click();
 await page.locator('#musicToggle').click();
 await page.locator('#musicToggle').click();
 await page.waitForFunction(()=>document.querySelector('#musicToggle').dataset.state==='playing');
 if(api.length||errors.length)throw new Error(JSON.stringify({api,errors}));
 console.log('PASS mobile 390x844: fixture, first visit, three rounds, Chaos Report, share click, soundtrack decode/play/toggle; zero API requests and page errors.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
