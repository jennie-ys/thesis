"""Import supplied archives and generate a reviewed, fixed stimulus order (never run at runtime)."""
from pathlib import Path
import zipfile,re,json,random,hashlib,csv,shutil
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
UPLOAD=ROOT.parent/'upload'
CATS=dict(AK='광선각화증',BCC='기저세포암',NV='멜라닌세포성 모반',DF='피부섬유종',VASC='혈관 병변')
rng=random.Random(20261117)
sets={}
# Only regenerate the asset directory owned by this importer.
for folder in [ROOT/'public/static/stimuli',ROOT/'docs/static/stimuli']:
 if folder.exists():shutil.rmtree(folder)
for archive,stage in [('1 study.zip','learning'),('2 baseline test.zip','initial-exam'),('3 AI task.zip','ai-task'),('4 final test.zip','final-exam')]:
 rows=[]
 with zipfile.ZipFile(UPLOAD/archive) as z:
  for n in sorted(z.namelist()):
   if n.startswith('__MACOSX') or not n.lower().endswith('.jpg'):continue
   code=re.search(r'\((AK|BCC|NV|DF|VASC)\)',n).group(1)
   name=Path(n).name; raw=z.read(n)
   folder=Path(n).parent.name
   novelty='new' if folder=='new' or stage=='ai-task' else 'old' if folder.startswith('old_study') else None
   rel=Path('static/stimuli')/stage/code/(novelty or 'cases')/name
   dest=ROOT/'public'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
   with Image.open(dest) as im:im.verify()
   with Image.open(dest) as im:width,height=im.size
   rows.append(dict(id=f'{stage}-{code}-{Path(name).stem}',imageId=Path(name).stem,filename=name,categoryCode=code,correctCategory=CATS[code],novelty=novelty,sourceSubset=folder if novelty else None,url='/'+rel.as_posix(),sha256=hashlib.sha256(raw).hexdigest(),width=width,height=height))
 # User-approved correction: final VASC/old contained three AK images.
 if stage=='final-exam':
  incorrect=[r for r in rows if r['categoryCode']=='VASC' and r['novelty']=='old']
  baseline={r['imageId'] for r in sets['initial-exam']}
  replacements=[r for r in sets['learning'] if r['categoryCode']=='VASC' and r['imageId'] not in baseline]
  assert len(incorrect)==len(replacements)==3
  for r in incorrect:(ROOT/'public'/r['url'].lstrip('/')).unlink()
  rows=[r for r in rows if r not in incorrect]
  for original in replacements:
   r={k:v for k,v in original.items() if k not in ['position','block','category']}
   rel=Path('static/stimuli/final-exam/VASC/old')/r['filename']
   dest=ROOT/'public'/rel;dest.parent.mkdir(parents=True,exist_ok=True)
   shutil.copyfile(ROOT/'public'/original['url'].lstrip('/'),dest)
   r.update(id=f"final-exam-VASC-{r['imageId']}",url='/'+rel.as_posix(),novelty='old',sourceSubset='old_study_456',sourceCorrection='User approved replacing mislabeled AK files with unused VASC learning images')
   rows.append(r)
 if stage in ['learning','ai-task']:
  pools={c:[r for r in rows if r['categoryCode']==c] for c in CATS}
  for p in pools.values():rng.shuffle(p)
  order=[]
  for b in range(6):
   while True:
    codes=list(CATS);rng.shuffle(codes)
    if not order or order[-1]['categoryCode']!=codes[0]:break
   for c in codes:order.append(dict(pools[c][b],block=b+1))
 else:
  while True:
   rng.shuffle(rows)
   if all(a['categoryCode']!=b['categoryCode'] for a,b in zip(rows,rows[1:])):break
  order=rows
 for i,r in enumerate(order):r['position']=i+1
 if stage=='learning':
  # Repeated rounds use this same fixed sequence; its boundary also avoids repeats.
  assert order[0]['categoryCode']!=order[-1]['categoryCode']
 if stage=='ai-task':
  for r in order:r.update(aiCategory=None,aiReason=None,aiCorrect=None)
 sets[stage]=order
(ROOT/'data/stimulus-order.json').write_text(json.dumps({'orderVersion':'stimuli-20261117-v1','seed':20261117,'stages':sets},ensure_ascii=False,indent=2)+'\n')
with (ROOT/'data/stimulus-order.csv').open('w') as f:
 writer=csv.DictWriter(f,fieldnames=['stage','position','block','imageId','categoryCode','correctCategory','novelty','sourceSubset','url']);writer.writeheader()
 for stage,rows in sets.items():
  for r in rows:writer.writerow({'stage':stage,**{k:r.get(k) for k in writer.fieldnames if k!='stage'}})
print({k:len(v) for k,v in sets.items()})
