#!/usr/bin/env python3
"""One preview render from existing footage only. Never invokes capture tools."""
import csv,hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]; BASE=Path(__file__).resolve().parent
SOURCES=['1-wreck-haunted_house.mp4','2-wreck-cursed_diner.mp4','2-beam-night_farm.mp4','1-beam-alien_drive_through.mp4','1-dodge-volcano.mp4','2-dodge-industrial_meltdown.mp4']
# source input, inclusive in frame, exclusive out frame, purpose
SELECTS=[(0,71,223,'WRECK launch, impact freeze, full ghost aftermath and result'),(1,0,223,'Cursed Diner assembly, launch, aftermath and result'),(2,71,213,'Night Farm saucer catches and victory'),(3,0,213,'Alien Drive-Through assembly, catches and alien reaction'),(4,240,406,'Volcano hazards, survival and victory'),(5,0,439,'Industrial Meltdown assembly, dodge survival and result'),(5,439,503,'Actual Chaos Report reveal'),(5,502,503,'Editorial end card over held final source frame')]
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def tc(n):return f'{n//108000:02}:{n//1800%60:02}:{n//30%60:02}:{n%30:02}'
manifest=json.loads((ROOT/'docs/demo/manifests/capture.json').read_text());lookup={Path(c['file']).name:c for c in manifest['clips']}
for name in SOURCES:assert sha(ROOT/'docs/demo/captures'/name)==lookup[name]['sha256'],name
ost=ROOT/'public/audio/main-theme-loop.ogg'; approved=json.loads((ROOT/'public/audio/manifest.json').read_text());assert sha(ost)==next(f['sha256'] for f in approved['files'] if f['file'].endswith('main-theme-loop.ogg'))
filters=['[5:v]split=3[industrial][report][end]'];labels=[];rows=[];cursor=0
for i,(source,a,b,purpose) in enumerate(SELECTS):
 inp={5:'industrial'}.get(source,f'{source}:v') if i<6 else ('report' if i==6 else 'end')
 graph=f'[{inp}]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS'
 n=b-a
 if i==7:
  n=180;graph+=",tpad=stop_mode=clone:stop_duration=6,trim=end_frame=180,drawbox=x=0:y=0:w=iw:h=ih:color=0x100d18:t=fill"
  for y,size,col,text in [(290,100,'0xfdf071','THING//MANIA'),(440,58,'0x53e8cb','PLAY NOW'),(550,62,'white','https://thing-mania.pages.dev/'),(700,32,'white','Public arcade: OFFLINE / Live AI: private demo'),(800,27,'white','Meta Muse Spark 1.3 + SAM 3.1 / Original DaemonV12 OST')]:
   escaped=text.replace(':',r'\:');graph+=f",drawtext=fontfile={FONT}:text='{escaped}':fontsize={size}:fontcolor={col}:x=(w-tw)/2:y={y}"
 graph+=f'[v{i}]';filters.append(graph);labels.append(f'[v{i}]')
 rows.append([i+1,f'../captures/{SOURCES[source]}',a,b,tc(a),tc(b),cursor,cursor+n,tc(cursor),tc(cursor+n),n,30,purpose,'Actual offline fixture / automated fixed-step capture; end card editorial' if i==7 else 'Actual offline fixture / automated fixed-step capture',lookup[SOURCES[source]]['sha256']]);cursor+=n
filters.append(''.join(labels)+f'concat=n=8:v=1:a=0,drawbox=x=650:y=140:w=1200:h=80:color=0x100d18:t=fill,drawtext=fontfile={FONT}:text=OFFLINE FIXTURE GAMEPLAY / LOCAL CAPTURE:fontsize=24:fontcolor=0xc3b5d4:x=670:y=167,format=yuv420p[v]')
duration=cursor/30;endstart=(cursor-180)/30
# Original main loop only. Start source 1.96 so source 2.26 accent lands at reel 0.30.
second=endstart-34.24
filters+=['[6:a]asplit=3[a0][a1][a2]', '[a0]atrim=start=1.96:end=36.2,asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st=34.225:d=0.015[m0]',f'[a1]atrim=start=0:end={second:.9f},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={second-.015:.9f}:d=0.015[m1]','[a2]atrim=start=30.2:end=36.2,asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st=4.8:d=1.2[m2]',f'[m0][m1][m2]concat=n=3:v=0:a=1,volume=0.5,alimiter=limit=0.89:level=false,aresample=48000,apad,atrim=duration={duration:.9f}[a]']
with (BASE/'highlight-selects.csv').open('w') as f:
 w=csv.writer(f,lineterminator='\n');w.writerow(['event','source','source_in_frame','source_out_frame_exclusive','source_in_tc','source_out_tc','reel_in_frame','reel_out_frame','reel_in_tc','reel_out_tc','frames','fps','purpose','provenance','source_sha256']);w.writerows(rows)
(BASE/'render-filter.txt').write_text(';\n'.join(filters)+'\n')
plan={'frames':cursor,'duration':duration,'fps':30,'master':[1920,1080],'music':'public/audio/main-theme-loop.ogg','music_sha256':sha(ost),'music_segments':[[1.96,36.2,0,34.24],[0,second,34.24,endstart],[30.2,36.2,endstart,duration]],'render_source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()};(BASE/'render-plan.json').write_text(json.dumps(plan,indent=2)+'\n')
if '--plan-only' in sys.argv:print(json.dumps(plan));sys.exit()
out=BASE/'PROOF_REEL.mp4';guard=BASE/'RENDER_STARTED'
if out.exists() or guard.exists():raise SystemExit('Refusing a second full render; inspect existing output and use targeted fixes only.')
guard.write_text('Single full preview render started. Do not remove to retry blindly.\n')
cmd=['ffmpeg','-hide_banner','-loglevel','warning','-n','-filter_complex_threads','1']
for name in SOURCES:cmd+=['-i',str(ROOT/'docs/demo/captures'/name)]
cmd+=['-i',str(ost),'-filter_complex_script',str(BASE/'render-filter.txt'),'-map','[v]','-map','[a]','-r','30','-c:v','libx264','-preset','veryfast','-crf','20','-threads','2','-c:a','aac','-b:a','192k','-movflags','+faststart','-t',f'{duration:.9f}',str(out)]
subprocess.run(cmd,check=True);print('Rendered once:',out)
