"""Inspect delivered assets without rendering. Fail closed on missing proof."""
import csv, hashlib,json,subprocess
from pathlib import Path
base=Path(__file__).resolve().parents[1]
m=json.loads((base/'manifests/capture.json').read_text())
assert len(m['clips'])==6
assert {c['world'] for c in m['clips']}=={'haunted_house','cursed_diner','night_farm','alien_drive_through','volcano','industrial_meltdown'}
rows=[]
for c in m['clips']:
 p=base/c['file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==c['sha256']
 probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(p)]));v=probe['streams'][0]
 assert (v['width'],v['height'],v['r_frame_rate'])==(1920,1080,'30/1')
 assert int(v['nb_frames'])==c['frames'];assert len(probe['streams'])==1
 assert c['won'][['wreck','beam','dodge'].index(c['game'])] is True
 assert abs(float(probe['format']['duration'])-c['frames']/30)<.002
 subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],check=True,stdout=subprocess.DEVNULL)
 def tc(frame):return f'{frame//108000:02}:{frame//1800%60:02}:{frame//30%60:02}:{frame%30:02}'
 for mark in c['marks']: rows.append([c['file'],30,c['frames'],f"{c['duration']:.6f}",tc(mark['frame']),mark['event'],'actual offline fixture; fixed-step browser capture',c['sha256']])
 rows.append([c['file'],30,c['frames'],f"{c['duration']:.6f}",tc(c['frames']),'END (exclusive)','actual offline fixture; fixed-step browser capture',c['sha256']])
with (base/'manifests/source-clips.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['source','fps','total_frames','duration_seconds','source_timecode','event','provenance','sha256']);w.writerows(rows)
plan=list(csv.DictReader((base/'manifests/edit-plan.csv').open()));assert sum(int(r['frames_30fps']) for r in plan)==5400
print('PASS: six worlds, six wins, hashes, 1080p CFR30, exact frames/durations, decode integrity, 180-second edit map')
