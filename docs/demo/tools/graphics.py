"""Generate editable 1920x1080 vector explainers; no AI-generated imagery."""
from pathlib import Path
from html import escape
out=Path(__file__).resolve().parents[1]/'graphics'
def render(name,title,subtitle,boxes,arrows,footer):
 s=['<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">','<rect width="1920" height="1080" fill="#100d18"/>','<defs><marker id="a" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0 0 L12 6 L0 12" fill="#53e8cb"/></marker></defs>']
 def text(x,y,t,size=32,col='#fff3c5'):s.append(f'<text x="{x}" y="{y}" font-family="Arial,sans-serif" font-size="{size}" fill="{col}">{escape(t)}</text>')
 text(90,105,title,64,'#fdf071');text(90,170,subtitle,28)
 for x,y,w,h,heading,lines in boxes:
  s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" fill="#272138" stroke="#53e8cb" stroke-width="3"/>');text(x+24,y+50,heading,34,'#53e8cb')
  for i,line in enumerate(lines):text(x+24,y+98+i*42,line,27)
 for x,y,xx,yy in arrows:s.append(f'<path d="M{x} {y} L{xx} {yy}" stroke="#53e8cb" stroke-width="4" marker-end="url(#a)"/>')
 for i,line in enumerate(footer):text(90,950+i*42,line,28,'#c3b5d4')
 s.append('</svg>');(out/name).write_text('\n'.join(s))
render('01-meta-to-play.svg','META DIRECTS THE CHARACTER','Private live pipeline · server-held credentials · distinct consented actions',[
 (90,250,470,220,'Muse Spark 1.3',['Consented photo → object + role','Dialogue + bounded game tuning','Private Node Meta adapter']),
 (680,250,510,220,'Validated GamePlan',['Schema + bounds + safe defaults','gameplan.js → browser arcade','Fallback keeps play available']),
 (1310,250,510,220,'Stage Machine',['Allowlisted StageRecipe data','Atmosphere / set / props / fx','Seeded local composition']),
 (90,590,470,220,'SAM 3.1 · separate opt-in',['Photo + identified noun phrase','Mask geometry → browser cutout','Failure retains photo sprite']),
 (680,590,510,220,'Canvas arcade',['WRECK / BEAM / DODGE','Photo or cutout used in play','Original DaemonV12 soundtrack']),
 (1310,590,510,220,'Chaos Report',['Actual score + played worlds','Local Canvas PNG export','Native share or download'])],[(565,350,665,350),(1195,350,1295,350),(1565,475,1195,610),(565,700,665,700),(1195,700,1295,700)],['Public Pages demo uses offline JSON fixtures; no public live inference endpoint.','Sources: meta_adapter.js · sam_adapter.js · gameplan.js · stage_machine.js · game.js'])
render('02-remix-without-inference.svg','SAME CHARACTER. NEW WORLD.','Stage Machine is deterministic local code · remixes make zero model calls',[
 (90,270,490,470,'Validated GamePlan',['Object + whimsical role','Derived tags and plan seed','Remix index','No new photo upload']),
 (710,270,500,470,'StageRecipe',['Choose compatible modules','Atmosphere → set → props → fx','Haunted House / Cursed Diner','Night Farm / Alien Drive-Through','Volcano / Industrial Meltdown']),
 (1340,270,490,470,'Canvas assembly',['Existing painted modules','1.4 s normal-motion assembly','Same mechanics + hitboxes','Local Chaos Report'])],[(585,505,695,505),(1215,505,1325,505)],['Not a new generated minigame; six existing environment sets across three games.','Sources: stage_machine.js composeStage / validateRecipe · game.js drawAssembly / remixStage'])
