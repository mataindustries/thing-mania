#!/usr/bin/env python3
import csv,hashlib,json,re,subprocess
from pathlib import Path
B=Path(__file__).resolve().parent;v=B/'PROOF_REEL.mp4';plan=json.loads((B/'render-plan.json').read_text())
p=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(v)]));video=next(s for s in p['streams'] if s['codec_type']=='video');audio=next(s for s in p['streams'] if s['codec_type']=='audio')
assert video['codec_name']=='h264' and audio['codec_name']=='aac'
assert (video['width'],video['height'],video['r_frame_rate'])==(1920,1080,'30/1')
assert int(video['nb_frames'])==plan['frames'];assert abs(float(video['duration'])-float(audio['duration']))<.04
assert 45<=float(video['duration'])<=60
subprocess.run(['ffmpeg','-v','error','-i',str(v),'-f','null','-'],check=True)
black=subprocess.run(['ffmpeg','-hide_banner','-i',str(v),'-an','-vf','blackdetect=d=0.03:pix_th=0.10:pic_th=0.98','-f','null','-'],capture_output=True,text=True,check=True).stderr
assert 'black_start:' not in black,'Black-frame run detected'
loud=subprocess.run(['ffmpeg','-hide_banner','-i',str(v),'-vn','-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True,check=True).stderr
summary=loud[loud.rfind('Summary:'):];(B/'audio-qa.txt').write_text(summary.rstrip()+'\n')
peak=float(re.findall(r'Peak:\s*([-\d.]+)\s*dBFS',summary)[-1]);assert peak<-.5,peak
rows=list(csv.DictReader((B/'highlight-selects.csv').open()));assert len({r['source'] for r in rows})==6
assert sum(int(r['frames_30fps']) for r in csv.DictReader((B/'final-film-edl.csv').open()))==5400
report={'sha256':hashlib.sha256(v.read_bytes()).hexdigest(),'size_bytes':v.stat().st_size,'probe':p,'checks':{'complete_decode':True,'frames':int(video['nb_frames']),'duration_seconds':float(video['duration']),'av_duration_difference_seconds':abs(float(video['duration'])-float(audio['duration'])),'black_frame_runs':0,'blackdetect_threshold':'98% pixels below 10% luma for >=0.03s','aac_decoded_true_peak_dbfs':peak,'six_existing_world_sources':True,'planned_180s_edl_frames':5400},'limits':'No voice or original gameplay SFX in silent captures. Impact/audio alignment is editorial frame-level, not sample-accurate. Human listening/phone-size preview remains recommended.'}
(B/'QA.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report['checks'],indent=2))
