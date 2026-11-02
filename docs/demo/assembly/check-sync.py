"""Coarse decoded-waveform correlation at 8kHz; no sample-accuracy claim."""
import array,json,subprocess,math
from pathlib import Path
B=Path(__file__).resolve().parent;root=B.parents[2]
def pcm(file,seek,length):
 a=array.array('f');a.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-ss',str(seek),'-t',str(length),'-ac','1','-ar','8000','-f','f32le','-']));return a
ref=pcm(root/'public/audio/main-theme-loop.ogg',1.96,1)
out=pcm(B/'PROOF_REEL.mp4',0,1.1)
scores=[]
for lag in range(-400,401,4):
 pairs=[(ref[i],out[i+lag]) for i in range(800,7200,4) if 0<=i+lag<len(out)]
 score=sum(a*b for a,b in pairs)/math.sqrt(sum(a*a for a,b in pairs)*sum(b*b for a,b in pairs))
 scores.append((score,lag))
score,lag=max(scores);assert score>.9 and abs(lag/8000)<1/30,(score,lag)
r={'analysis_rate_hz':8000,'search_resolution_seconds':.0005,'decoded_reference_source_start':1.96,'correlation':score,'measured_audio_delay_seconds':lag/8000,'picture_contact_seconds':.3,'reference_accent_seconds':2.26,'estimated_encoded_accent_reel_seconds':.3+lag/8000,'result':'Within one 30fps frame; coarse correlation, NOT sample-accurate synchronization'}
(B/'sync-qa.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
