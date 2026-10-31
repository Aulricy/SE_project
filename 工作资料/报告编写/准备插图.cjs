const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/xuson/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..');
const out=path.join(__dirname,'插图');fs.mkdirSync(out,{recursive:true});
const u=path.join(root,'工作资料/UML矢量图'),ui=path.join(root,'工作资料/UI源文件/可编辑SVG');
const tasks=[
 ['类图_实体',path.join(u,'类图.svg'),[1,76,805,950]],
 ['类图_服务',path.join(u,'类图.svg'),[817,59,734,1183]],
 ['发布活动_上',path.join(u,'活动图_商品发布与审核.svg'),[0,0,1332,803]],
 ['发布活动_下',path.join(u,'活动图_商品发布与审核.svg'),[0,799,1332,631]],
 ['交易活动_上',path.join(u,'活动图_预约与交易.svg'),[0,0,1216,778]],
 ['交易活动_下',path.join(u,'活动图_预约与交易.svg'),[0,775,1216,595]],
 ['预约时序_上',path.join(u,'时序图_买家预约商品.svg'),[0,0,964,1008]],
 ['预约时序_下',path.join(u,'时序图_买家预约商品.svg'),[0,1008,964,792]],
];
for(const id of ['01','07','15','23','38','49','52','60']){
 const f=fs.readdirSync(ui).find(n=>n.startsWith(id+'_')&&n.endsWith('.svg'));
 tasks.push(['界面_'+id,path.join(ui,f),[110,90,1220,860]]);
}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {const page=await browser.newPage({deviceScaleFactor:2});await page.route(/^https?:\/\//,r=>r.abort());
 for(const [name,src,[x,y,w,h]] of tasks){
  let svg=fs.readFileSync(src,'utf8').replace(/<svg\b[^>]*>/,m=>m.replace(/\bwidth="[^"]*"/,'width="'+w+'"').replace(/\bheight="[^"]*"/,'height="'+h+'"').replace(/\bviewBox="[^"]*"/,'viewBox="'+[x,y,w,h].join(' ')+'"').replace(/\bstyle="[^"]*"/,'style="background:#fff"'));
  const html=path.join(out,name+'.html');fs.writeFileSync(html,'<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:white;font-family:"Microsoft YaHei",sans-serif}svg{display:block}</style>'+svg);
  await page.setViewportSize({width:w,height:h});await page.goto(pathToFileURL(html).href);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,name+'.png')});
 }
 console.log(JSON.stringify({figures:tasks.length,folder:out}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
