"""Copy original owner footage, probe it, hash it. Never transcode or upload."""
import sys, subprocess, json, hashlib, shutil
from pathlib import Path
if len(sys.argv)!=3: raise SystemExit('Usage: python3 docs/demo/tools/import-android.py /path/to/original.mp4 descriptive-name.mp4')
src=Path(sys.argv[1]).resolve();name=sys.argv[2]
if Path(name).name!=name or not name.endswith('.mp4'):raise SystemExit('Choose a plain .mp4 filename')
base=Path(__file__).resolve().parents[1]/'android';dest=base/name
if dest.exists():raise SystemExit('Refusing overwrite')
probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(src)]))
shutil.copy2(src,dest)
meta={'file':name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'provenance':'Owner-supplied Android original; live authenticity and privacy require owner review','probe':probe,'review':{'consent_visible':False,'actual_live_result':False,'private_data_redacted_in_edit':False}}
(base/(name+'.json')).write_text(json.dumps(meta,indent=2)+'\n');print('Copied original; review required:',dest)
