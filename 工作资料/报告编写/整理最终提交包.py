import sys
sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path
from datetime import datetime
import hashlib,io,json,re,shutil,zipfile
from pypdf import PdfReader
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'工作资料'/'报告编写'
NAME='实验2_241220054_胥松恒'
STAGE=ROOT/NAME
ARCHIVE=ROOT/(NAME+'.zip')
CHECK=ROOT/'工作资料'/'临时提交包核验'

def sha(p):
 return hashlib.sha256(p.read_bytes()).hexdigest()

def inside(p):
 return p.resolve().is_relative_to(ROOT.resolve())

assert inside(STAGE) and inside(ARCHIVE) and inside(CHECK)
assert not STAGE.exists() and not ARCHIVE.exists() and not CHECK.exists(), 'Output exists; inspect before replacing'
source=[ROOT/'实验报告.pdf']+sorted((ROOT/'UML').glob('*'))+sorted((ROOT/'UI界面').glob('*.png'))
assert len(source)==78
assert len(list((ROOT/'UML').glob('*.puml')))==5
assert len(list((ROOT/'UML').glob('*.png')))==5
assert len(list((ROOT/'UI界面').glob('*.png')))==67
assert sorted(int(re.match(r'(\d+)',p.name).group(1)) for p in (ROOT/'UI界面').glob('*.png'))==list(range(1,68))
files=[]
for src in source:
 rel=src.relative_to(ROOT); dest=STAGE/rel
 dest.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(src,dest)
 assert sha(src)==sha(dest)
 files.append({'path':rel.as_posix(),'bytes':src.stat().st_size,'sha256':sha(src)})
with zipfile.ZipFile(ARCHIVE,'x',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for d in [STAGE,STAGE/'UML',STAGE/'UI界面']:
  z.write(d,d.relative_to(ROOT).as_posix()+'/')
 for item in files:
  z.write(STAGE/item['path'],NAME+'/'+item['path'])
with zipfile.ZipFile(ARCHIVE) as z:
 assert z.testzip() is None
 entries=z.infolist(); actual=[x.filename for x in entries if not x.is_dir()]
 assert len(actual)==78 and len(actual)==len(set(actual))
 assert set(actual)=={NAME+'/'+x['path'] for x in files}
 for entry in entries:
  assert inside(CHECK/entry.filename)
  assert (CHECK/entry.filename).resolve().is_relative_to(CHECK.resolve())
  assert entry.filename.split('/')[0]==NAME
 z.extractall(CHECK)
assert len(list((CHECK/NAME).rglob('*.*')))==78
for item in files:
 assert sha(CHECK/NAME/item['path'])==item['sha256']
report=PdfReader(CHECK/NAME/'实验报告.pdf')
assert len(report.pages)==35
text=''.join(p.extract_text() for p in report.pages)
flat=re.sub(r'\s+','',text)
assert '胥松恒' in flat and '241220054' in flat
assert all('REQ-'+f'{i:03}' in flat or 'REQ'+f'{i:03}' in flat for i in range(1,23))
assert '初稿  |' not in text
assert not any(x in flat for x in ['版本说明','后续提交事项','如何与AI交互','怎么和AI交互'])
images=list((CHECK/NAME).rglob('*.png'))
assert len(images)==72
for image in images:
 with Image.open(image) as im: im.verify()
for src in (CHECK/NAME/'UML').glob('*.puml'):
 text=src.read_text(encoding='utf-8-sig')
 assert '@startuml' in text and '@enduml' in text
review=json.loads((WORK/'报告定稿核验.json').read_text(encoding='utf-8'))
review['visualInspection']='35页页脚均以原尺寸目视复核；封面与第32至35页整页再次查看。全部35页正文像素与上一轮逐页审阅版本完全相同。'
review['allPassed']=True
review['files']={str(p.relative_to(ROOT)): {'sha256':sha(p),'bytes':p.stat().st_size} for p in [ROOT/'实验报告.pdf',ROOT/'工作资料'/'实验报告.docx']}
(WORK/'报告定稿核验.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
result={'checkedAt':datetime.now().astimezone().isoformat(),'reviewer':'Codex','userScope':'完成报告审阅定稿与提交打包，未提交课程平台',
 'allPassed':True,'archive':str(ARCHIVE),'archiveBytes':ARCHIVE.stat().st_size,'archiveSHA256':sha(ARCHIVE),'topLevelFolder':NAME,
 'fileCount':78,'reportPages':35,'UMLSourceFiles':5,'UMLImages':5,'UIImages':67,'verifiedPNGs':72,
 'checks':{'singleTopLevelFolder':True,'exactRequiredStructure':True,'CRC':True,'actualExtraction':True,'all78FilesMatchSHA256':True,'all72PNGsReadable':True,'reportReadable':True,'UISequence01to67':True,'noWorkingFilesPackaged':True},
 'manifest':files,'remaining':['用户上传ZIP至课程平台并确认提交成功']}
(ROOT/'工作资料'/'提交包核验结果.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
current={'checkedAt':result['checkedAt'],'allPassed':True,'pages':35,'reportFinalized':True,'personalStatementsReviewedAgainstConversation':True,'reviewer':'Codex','files':review['files'],
 'visualReview':review['visualInspection'],'finalReportAudit':'报告定稿核验.json','packageAudit':'../提交包核验结果.json','priorContentAudit':'本轮三项优化核验.json','pending':['用户上传ZIP至课程平台并确认提交成功']}
(WORK/'报告核验结果.json').write_text(json.dumps(current,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['manifest','checks']},ensure_ascii=False,indent=2))
