from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse,parse_qs
import json,hashlib,xml.etree.ElementTree as E,datetime
BASE=Path(__file__).resolve().parent
SOURCES=BASE.parent/'UI源文件'/'原型'
FILES={p.name:p for p in SOURCES.glob('*.drawio')}
RESULT=BASE/'核验事件.jsonl'
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def send(self,data,typ='application/json; charset=utf-8'):
  if isinstance(data,(dict,list)):data=json.dumps(data,ensure_ascii=False).encode('utf-8')
  if isinstance(data,str):data=data.encode('utf-8')
  self.send_response(200);self.send_header('Content-Type',typ);self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
 def do_GET(self):
  u=urlparse(self.path)
  if u.path=='/':return self.send((BASE/'编辑核验.html').read_bytes(),'text/html; charset=utf-8')
  if u.path=='/files':return self.send([{'name':n,'pages':len(E.parse(p).getroot().findall('diagram'))} for n,p in FILES.items()])
  if u.path=='/source':
   n=parse_qs(u.query).get('name',[''])[0]
   if n in FILES:return self.send(FILES[n].read_text(encoding='utf-8-sig'),'application/xml; charset=utf-8')
  self.send_error(404)
 def do_POST(self):
  if self.path!='/event':return self.send_error(404)
  length=int(self.headers.get('Content-Length',0))
  if not 0<length<12000000:return self.send_error(413)
  d=json.loads(self.rfile.read(length));n=d.get('file');event=d.get('event')
  if n not in FILES or event not in ['load','save','autosave','export','init']:return self.send_error(400)
  d['recordedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
  if event in ['save','autosave'] and d.get('xml'):
   saved=BASE/'编辑保存副本';saved.mkdir(exist_ok=True)
   target=saved/(Path(n).stem+'_'+event+'.drawio');target.write_text(d['xml'],encoding='utf-8')
   d['savedFile']=str(target.relative_to(BASE));d['xmlSha256']=hashlib.sha256(d['xml'].encode()).hexdigest();d.pop('xml')
  if event=='export' and d.get('format')=='json':
   data=d.get('data');data=json.loads(data) if isinstance(data,str) else data
   path=BASE/(Path(n).stem+'_编辑器导出.json');path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
   d['pageCount']=len(data.get('pages',[]));d['version']=data.get('version');d['pages']=[{'name':p.get('name'),'cells':len(p.get('cells',[]))} for p in data.get('pages',[])];d.pop('data',None)
  with RESULT.open('a',encoding='utf-8') as f:f.write(json.dumps(d,ensure_ascii=False)+'\n')
  return self.send({'ok':True,'event':event,'pageCount':d.get('pageCount')})
print('UI verification editor at http://127.0.0.1:8766',flush=True)
ThreadingHTTPServer(('127.0.0.1',8766),Handler).serve_forever()
