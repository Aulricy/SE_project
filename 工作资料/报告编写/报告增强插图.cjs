const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/xuson/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'插图'),uml=path.join(root,'工作资料/UML矢量图'),ui=path.join(root,'工作资料/UI源文件/可编辑SVG');
function read(name){return fs.readFileSync(path.join(uml,name),'utf8')}
function inner(svg){return svg.replace(/^[\s\S]*?<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'')}
function nav(svg,boxes){const marks=boxes.map(([x,y,w,h,label])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2563eb" fill-opacity=".035" stroke="#2563eb" stroke-width="10"/><rect x="${x+12}" y="${y+12}" width="145" height="150" rx="12" fill="white" fill-opacity=".95"/><text x="${x+84}" y="${y+128}" font-family="Microsoft YaHei" font-size="120" font-weight="700" text-anchor="middle" fill="#1d4ed8">${label}</text>`).join('');return svg.replace(/<\/svg>\s*$/,marks+'</svg>')}
const tasks=[
 ['导航_类图',nav(read('类图.svg'),[[7,83,792,936,'A'],[823,65,722,1171,'B'],[412,1269,992,317,'C']]),1559,2261],
 ['导航_发布审核',nav(read('活动图_商品发布与审核.svg'),[[4,4,1323,795,'A'],[4,803,1323,623,'B']]),1332,1670],
 ['导航_预约交易',nav(read('活动图_预约与交易.svg'),[[4,4,1207,770,'A'],[4,778,1207,588,'B']]),1216,1674]
];
const sx=read('时序图_买家预约商品.svg');
const names=[[48.5,'买家'],[212.5,'Web 界面'],[395.5,'预约服务'],[610.5,'用户与权限服务'],[711.724,'日志服务'],[903.724,'数据库']];
const band='<rect width="964" height="60" fill="#f8fafc"/>'+names.map(([x,n])=>`<text x="${x}" y="32" font-family="Microsoft YaHei" font-size="15" font-weight="700" text-anchor="middle">${n}</text><line x1="${x}" y1="43" x2="${x}" y2="60" stroke="#94a3b8" stroke-dasharray="4 4"/>`).join('');
tasks.push(['预约时序_下_含参与者',`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="964" height="852" viewBox="0 0 964 852">${band}<svg x="0" y="60" width="964" height="792" viewBox="0 1008 964 792">${inner(sx)}</svg></svg>`,964,852]);
for(const [id,name,box] of [['28','异常_取消原因',[465,250,510,580]],['44','异常_恢复草稿',[465,340,510,400]]]){
 const f=fs.readdirSync(ui).find(f=>f.startsWith(id+'_')&&f.endsWith('.svg'));let s=fs.readFileSync(path.join(ui,f),'utf8');const [x,y,w,h]=box;
 s=s.replace(/<svg\b[^>]*>/,m=>m.replace(/\bwidth="[^"]*"/,'width="'+w+'"').replace(/\bheight="[^"]*"/,'height="'+h+'"').replace(/\bviewBox="[^"]*"/,'viewBox="'+box.join(' ')+'"'));
 tasks.push([name,s,w,h]);
}
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{const p=await b.newPage({deviceScaleFactor:2});await p.route(/^https?:\/\//,r=>r.abort());for(const [name,svg,w,h] of tasks){const file=path.join(out,name+'.html');fs.writeFileSync(file,'<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:white;font-family:"Microsoft YaHei",sans-serif}svg{display:block}</style>'+svg);fs.writeFileSync(path.join(out,name+'.svg'),svg);await p.setViewportSize({width:w,height:h});await p.goto(pathToFileURL(file).href);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.png')});}console.log(JSON.stringify({figures:tasks.length,folder:out}));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
