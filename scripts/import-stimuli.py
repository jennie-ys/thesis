"""Offline six-category stimulus selection and fixed constrained randomization."""
from pathlib import Path
import zipfile,re,json,random,hashlib,csv,shutil,unicodedata
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];UPLOAD=ROOT.parent/'upload'
CATS=dict(AK='광선각화증',BCC='기저세포암',NV='멜라닌세포성 모반',DF='피부섬유종',VASC='혈관 병변',MEL='흑색종')
SEED=20261117
previous=json.loads((ROOT/'data/stimulus-order.json').read_text())
sets={stage:[{k:v for k,v in r.items() if k not in ['position','block']} for r in rows if r['categoryCode']!='MEL'] for stage,rows in previous['stages'].items()}
for stage in sets:
 folder=ROOT/'public/static/stimuli'/stage/'MEL'
 if folder.exists():shutil.rmtree(folder)
def archive(name):return next(p for p in UPLOAD.glob('*.zip') if unicodedata.normalize('NFC',p.name)==name)
def mel_files(name):
 with zipfile.ZipFile(archive(name)) as z:
  return sorted([(Path(n).name,z.read(n)) for n in z.namelist() if not n.startswith('__MACOSX') and '(MEL)' in n and n.lower().endswith('.jpg')])
def add(stage,filename,raw,novelty,source):
 rel=Path('static/stimuli')/stage/'MEL'/(novelty or 'cases')/filename;dest=ROOT/'public'/rel
 dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
 with Image.open(dest) as im:im.verify()
 with Image.open(dest) as im:w,h=im.size
 row=dict(id=f'{stage}-MEL-{Path(filename).stem}',imageId=Path(filename).stem,filename=filename,categoryCode='MEL',correctCategory=CATS['MEL'],novelty=novelty,sourceSubset=source,url='/'+rel.as_posix(),sha256=hashlib.sha256(raw).hexdigest(),width=w,height=h)
 sets[stage].append(row)
study=mel_files('1학습단계(1).zip');ai=mel_files('2개입단계(2).zip');fresh=mel_files('3시험단계(1).zip')
assert len(study)==6 and len(ai)==6 and len(fresh)==4
for filename,raw in study:add('learning',filename,raw,None,'1학습단계(1).zip')
for filename,raw in study[:3]:add('initial-exam',filename,raw,'old','study-selected-123')
for filename,raw in study[3:]:add('final-exam',filename,raw,'old','study-minus-baseline')
for filename,raw in ai:add('ai-task',filename,raw,'new','2개입단계(2).zip')
selected_new=sorted(random.Random(SEED).sample(fresh,3))
for filename,raw in selected_new:add('final-exam',filename,raw,'new','3시험단계(1).zip')
mapping=json.loads((ROOT/'data/ai-mapping.json').read_text());lookup={t['filename']:t for t in mapping['trials']}
for row in sets['ai-task']:
 m=lookup[row['filename']];assert m['correctCategory']==row['correctCategory']
 row.update(aiCategory=m['aiCategory'],aiReason=m['aiReason'],aiCorrect=m['aiCorrect'],aiMappingSource=mapping['source'])
 assert row['aiCorrect']==(row['correctCategory']==row['aiCategory'])
rng=random.Random(SEED)
for stage,rows in list(sets.items()):
 rows.sort(key=lambda r:(list(CATS).index(r['categoryCode']),r['filename']))
 if stage in ['learning','ai-task']:
  pools={code:[r for r in rows if r['categoryCode']==code] for code in CATS}
  assert all(len(p)==6 for p in pools.values())
  for p in pools.values():rng.shuffle(p)
  while True:
   order=[]
   for block in range(6):
    while True:
     codes=list(CATS);rng.shuffle(codes)
     if not order or order[-1]['categoryCode']!=codes[0]:break
    for code in codes:order.append(dict(pools[code][block],block=block+1))
   if stage!='learning' or order[-1]['categoryCode']!=order[0]['categoryCode']:break
 else:
  while True:
   rng.shuffle(rows)
   if all(a['categoryCode']!=b['categoryCode'] for a,b in zip(rows,rows[1:])):break
  order=rows
 for i,r in enumerate(order):r['position']=i+1
 sets[stage]=order
learned={t['sha256'] for t in sets['learning']};baseline={t['sha256'] for t in sets['initial-exam']};ai_hashes={t['sha256'] for t in sets['ai-task']}
checks=[]
for code in CATS:
 get=lambda stage:[r for r in sets[stage] if r['categoryCode']==code]
 s=get('learning');b=get('initial-exam');a=get('ai-task');f=get('final-exam');old=[t for t in f if t['novelty']=='old'];new=[t for t in f if t['novelty']=='new']
 assert [len(s),len(b),len(a),len(old),len(new)]==[6,3,6,3,3]
 assert all(r['sha256'] in learned for r in b)
 assert all(r['sha256'] not in learned for r in a)
 assert {r['sha256'] for r in old}=={r['sha256'] for r in s if r['sha256'] not in baseline}
 assert all(r['sha256'] not in learned|ai_hashes for r in new)
 checks.append(dict(categoryCode=code,category=CATS[code],study=6,baseline=3,aiTask=6,finalOld=3,finalNew=3,overlapViolations=0,aiCorrect=sum(r['aiCorrect'] for r in a),aiIncorrect=sum(not r['aiCorrect'] for r in a)))
for stage,rows in sets.items():
 assert len({r['sha256'] for r in rows})==len(rows)
 assert all(a['categoryCode']!=b['categoryCode'] for a,b in zip(rows,rows[1:]))
 if stage in ['learning','ai-task']:
  for i in range(0,len(rows),6):assert len({r['categoryCode'] for r in rows[i:i+6]})==6
manifest=dict(orderVersion='stimuli-six-20261117-v1',seed=SEED,stages=sets)
(ROOT/'data/stimulus-order.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with (ROOT/'data/stimulus-order.csv').open('w') as f:
 fields=['stage','position','block','imageId','categoryCode','correctCategory','novelty','sourceSubset','url','aiCategory','aiCorrect','aiReason'];w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for stage,rows in sets.items():
  for r in rows:w.writerow({'stage':stage,**{k:r.get(k) for k in fields if k!='stage'}})
with (ROOT/'data/ai-mapping.csv').open('w') as f:
 fields=['filename','correctCategory','aiCategory','aiCorrect','aiReason'];w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for r in mapping['trials']:w.writerow({k:r[k] for k in fields})
with (ROOT/'data/final-old-images.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['categoryCode','category','filename','finalPosition','studyPosition','baselineUsed'])
 for code in CATS:
  for r in sorted([r for r in sets['final-exam'] if r['categoryCode']==code and r['novelty']=='old'],key=lambda t:t['filename']):
   w.writerow([code,r['correctCategory'],r['filename'],r['position'],next(s['position'] for s in sets['learning'] if s['sha256']==r['sha256']),0])
validation=dict(orderVersion=manifest['orderVersion'],counts={k:len(v) for k,v in sets.items()},categories=checks,melanomaSelection={stage:[r['filename'] for r in rows if r['categoryCode']=='MEL'] for stage,rows in sets.items()},melanomaNewUnused=[name for name,_ in fresh if name not in {name for name,_ in selected_new}],aiMappingSource=mapping['source'],aiAccuracy={'correct':25,'total':36,'rate':25/36})
(ROOT/'data/six-category-validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(validation,ensure_ascii=False))
