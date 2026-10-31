const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/xuson/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const projectPaths=require('node:path');
const sourceFolder=__dirname.replace(/\\/g,'/')+'/';
const folder=projectPaths.resolve(__dirname,'../../../UI界面').replace(/\\/g,'/')+'/';
const vectorFolder=projectPaths.resolve(__dirname,'../可编辑SVG').replace(/\\/g,'/')+'/';
const previewFolder=projectPaths.resolve(__dirname,'../../界面预览').replace(/\\/g,'/')+'/';
function xml(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function rgbHex(c){const m=String(c).match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/);return m?'#'+m.slice(1,4).map(x=>Math.round(+x).toString(16).padStart(2,'0')).join(''):'#182338';}
function svgFromModel(model){
 const parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1080" viewBox="0 0 1440 1080"><rect width="1440" height="1080" fill="#f5f7fb"/>'];
 for(const o of model){
  if(o.kind==='rect')parts.push('<rect x="'+o.x+'" y="'+o.y+'" width="'+o.w+'" height="'+o.h+'" rx="'+o.radius+'" fill="'+xml(o.fill)+'" fill-opacity="'+o.alpha+'" stroke="'+xml(o.stroke)+'" stroke-width="'+o.strokeWidth+'"/>');
  else if(o.kind==='svg')parts.push('<g transform="translate('+o.x+' '+o.y+')" color="'+xml(o.color)+'">'+o.svg+'</g>');
  else if(o.kind==='text')parts.push('<text x="'+o.x+'" y="'+o.baseline+'" font-family="'+xml(o.fontFamily)+'" font-size="'+o.fontSize+'" font-weight="'+o.weight+'" fill="'+xml(o.color)+'"'+(o.w>0?' textLength="'+o.w+'" lengthAdjust="spacingAndGlyphs"':'')+' xml:space="preserve">'+xml(o.text)+'</text>');
 }
 parts.push('</svg>');return parts.join('');
}
function drawioPage(name,model,index){
 const cells=['<mxCell id="0"/><mxCell id="1" parent="0"/>'];let id=2;
 for(const o of model){
  let style='',value='',x=o.x,y=o.y,w=o.w,h=o.h;
  if(o.kind==='rect'){
   style='rounded='+(o.radius>0?'1':'0')+';arcSize='+Math.min(50,Math.round(o.radius/Math.max(1,Math.min(w,h))*100))+';whiteSpace=wrap;html=0;fillColor='+(o.fill==='none'?'none':rgbHex(o.fill))+';strokeColor='+(o.stroke==='none'?'none':rgbHex(o.stroke))+';strokeWidth='+o.strokeWidth+';opacity='+Math.round(o.alpha*100)+';';
  }else if(o.kind==='text'){
   value=o.text;style='text;html=0;align=left;verticalAlign=top;whiteSpace=nowrap;overflow=visible;spacing=0;fontFamily=Microsoft YaHei;fontSize='+o.fontSize+';fontColor='+rgbHex(o.color)+';fontStyle='+(+o.weight>=600?'1':'0')+';fillColor=none;strokeColor=none;';
   h=Math.max(h,o.fontSize*1.45);w=Math.max(w,10);
  }else{
   const image='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><g color="'+o.color+'">'+o.svg+'</g></svg>';
   style='shape=image;imageAspect=0;aspect=fixed;image=data:image/svg+xml,'+encodeURIComponent(image)+';fillColor=none;strokeColor=none;';
  }
  if(w<=0||h<=0)continue;
  cells.push('<mxCell id="'+id+++'" value="'+xml(value)+'" style="'+xml(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 }
 return '<diagram id="screen-'+index+'" name="'+xml(name)+'"><mxGraphModel dx="1440" dy="1080" grid="1" gridSize="8" guides="1" tooltips="1" connect="0" arrows="0" fold="0" page="1" pageScale="1" pageWidth="1440" pageHeight="1080" math="0" shadow="0" background="#f5f7fb"><root>'+cells.join('')+'</root></mxGraphModel></diagram>';
}
async function modelFromPage(page){
 return page.evaluate(()=>{
  const output=[],W=1440,H=1080;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  function paint(c){const m=String(c).match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?\)/);if(!m)return {fill:'none',alpha:0};return {fill:'rgb('+m[1]+','+m[2]+','+m[3]+')',alpha:m[4]===undefined?1:+m[4]};}
  function rect(o){if(o.w>0&&o.h>0&&o.y<H&&o.x<W&&o.x+o.w>0&&o.y+o.h>0)output.push(o);}
  function text(text,r,c,baseline){
   if(!text||!text.trim()||r.y>=H)return;
   output.push({kind:'text',text,x:r.x,y:r.y,w:r.width,h:r.height,baseline:baseline,fontSize:parseFloat(c.fontSize),fontFamily:c.fontFamily,weight:c.fontWeight,color:c.color});
  }
  function textNode(n,c){
   if(!n.nodeValue||!n.nodeValue.trim())return;
   ctx.font=c.fontStyle+' '+c.fontWeight+' '+c.fontSize+' '+c.fontFamily;
   const ascent=ctx.measureText('国Hg').fontBoundingBoxAscent||parseFloat(c.fontSize)*.94;
   const lines=[];let line=null;
   for(let i=0;i<n.nodeValue.length;i++){
    const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const b=r.getBoundingClientRect();
    if(!b.width||!b.height)continue;
    if(!line||Math.abs(line.y-b.y)>.6){line={x:b.x,y:b.y,right:b.right,height:b.height,text:''};lines.push(line);}
    line.text+=n.nodeValue[i];line.right=Math.max(line.right,b.right);
   }
   for(const l of lines)text(l.text,{x:l.x,y:l.y,width:l.right-l.x,height:l.height},c,l.y+ascent);
  }
  function walk(el){
   if(el.nodeType===3){const parent=el.parentElement;if(parent)textNode(el,getComputedStyle(parent));return;}
   if(el.nodeType!==1||['SCRIPT','STYLE','LINK','META','TITLE','HEAD'].includes(el.tagName))return;
   const c=getComputedStyle(el),r=el.getBoundingClientRect();
   if(c.display==='none'||c.visibility==='hidden'||el.hidden||r.width===0||r.height===0)return;
   if(el instanceof SVGElement){
    const clone=el.cloneNode(true);clone.setAttribute('width',r.width);clone.setAttribute('height',r.height);clone.setAttribute('style','color:'+c.color+';width:'+r.width+'px;height:'+r.height+'px');
    output.push({kind:'svg',x:r.x,y:r.y,w:r.width,h:r.height,color:c.color,svg:clone.outerHTML});return;
   }
   const bg=paint(c.backgroundColor);
   const sides=['Top','Right','Bottom','Left'].map(side=>({side,width:parseFloat(c['border'+side+'Width'])||0,color:c['border'+side+'Color']}));
   const full=sides.every(b=>b.width===sides[0].width&&b.color===sides[0].color)&&sides[0].width>0;
   if(bg.alpha>0||full)rect({kind:'rect',x:r.x,y:r.y,w:r.width,h:r.height,radius:parseFloat(c.borderTopLeftRadius)||0,fill:bg.alpha?bg.fill:'none',alpha:bg.alpha||1,stroke:full?sides[0].color:'none',strokeWidth:full?sides[0].width:0});
   if(!full)for(const b of sides){if(!b.width)continue;const horizontal=b.side==='Top'||b.side==='Bottom';rect({kind:'rect',x:b.side==='Right'?r.right-b.width:r.x,y:b.side==='Bottom'?r.bottom-b.width:r.y,w:horizontal?r.width:b.width,h:horizontal?b.width:r.height,radius:0,fill:b.color,alpha:1,stroke:'none',strokeWidth:0});}
   if(el.classList.contains('nav-item')&&el.classList.contains('active'))rect({kind:'rect',x:r.x,y:r.bottom-3,w:r.width,h:3,radius:2,fill:'rgb(37,99,235)',alpha:1,stroke:'none',strokeWidth:0});
   if(el.classList.contains('section-title'))rect({kind:'rect',x:r.x,y:r.y+(r.height-17)/2,w:3,h:17,radius:2,fill:'rgb(37,99,235)',alpha:1,stroke:'none',strokeWidth:0});
   if(el.tagName==='INPUT'){
    const placeholder=!el.value,tc=placeholder?getComputedStyle(el,'::placeholder'):c;
    ctx.font=c.fontStyle+' '+c.fontWeight+' '+c.fontSize+' '+c.fontFamily;
    const metrics=ctx.measureText('国Hg'),ascent=metrics.fontBoundingBoxAscent||parseFloat(c.fontSize),descent=metrics.fontBoundingBoxDescent||3;
    const val=el.type==='password'&&el.value?'•'.repeat(el.value.length):(el.value||el.placeholder);
    text(val,{x:r.x+parseFloat(c.paddingLeft)+1,y:r.y,width:ctx.measureText(val).width,height:r.height},Object.assign({fontFamily:c.fontFamily,fontSize:c.fontSize,fontWeight:c.fontWeight,color:tc.color}),r.y+r.height/2+(ascent-descent)/2);
    return;
   }
   for(const n of el.childNodes)walk(n);
  }
  walk(document.body);return output;
 });
}

(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking']});
const checks=[],errors=[],frames=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2});
 page.on('pageerror',e=>errors.push(e.message));await page.route('http://**',r=>r.abort());await page.route('https://**',r=>r.abort());
 const url=pathToFileURL(sourceFolder+'登录注册原型.html').href,browse=pathToFileURL(sourceFolder+'商品浏览原型.html').href;
 async function check(name,condition){if(!condition)throw Error(name);checks.push({name,passed:true});}
 async function capture(name){await page.evaluate(()=>document.fonts.ready);const model=await modelFromPage(page);fs.writeFileSync(vectorFolder+''+name+'.svg',svgFromModel(model));await page.screenshot({path:folder+name+'.png'});frames.push({name,model});console.log(name);}
 async function submit(){await page.locator('button[type=submit]').click();await page.waitForFunction(()=>!window.__auth.state.busy);}
 await page.goto(url);await page.evaluate(()=>window.__auth.ready);await capture('07_用户登录');
 await page.locator('#switch').click();await capture('08_用户注册');
 await check('普通注册没有身份选择或手机号',await page.locator('select,input[type=tel]').count()===0);
 await page.locator('#username').fill('new_demo');await page.locator('#password').fill('OnlyInMemory!');await page.locator('#confirm').fill('different');await submit();
 await check('确认密码不一致时提示并保留输入',await page.locator('#confirmError').isVisible()&&await page.locator('#username').inputValue()==='new_demo'&&await page.locator('#password').inputValue()==='OnlyInMemory!');
 await page.locator('#username').fill('chen_demo');await page.locator('#confirm').fill('OnlyInMemory!');await submit();await capture('09_注册用户名重复');
 await check('重复用户名拒绝注册并保留密码',await page.locator('#usernameError').isVisible()&&await page.locator('#password').inputValue()==='OnlyInMemory!');
 await page.locator('#switch').click();await page.locator('#password').fill('incorrect');await submit();await capture('10_登录凭据错误');
 await check('错误凭据不登录并显示统一提示',await page.locator('#formError').isVisible()&&await page.evaluate(()=>window.__auth.state.account===null));
 await page.locator('#password').fill('Demo123!');await submit();
 await check('普通账号正确识别身份',await page.evaluate(()=>window.__auth.state.account.role==='MEMBER'));
 await page.locator('#logout').click();await page.locator('#username').fill('admin_demo');await page.locator('#password').fill('Demo123!');await submit();
 await check('同一入口识别管理员且不开放普通预约入口',await page.evaluate(()=>window.__auth.state.account.role==='ADMIN')&&await page.locator('#enterHall').count()===0);
 await page.locator('#logout').click();await page.locator('#switch').click();await page.locator('#username').fill('new_demo');await page.locator('#password').fill('OnlyInMemory!');await page.locator('#confirm').fill('OnlyInMemory!');await submit();await capture('11_注册成功');
 await check('新账号只能注册为普通用户',await page.evaluate(()=>window.__auth.state.account.username==='new_demo'&&window.__auth.state.account.role==='MEMBER'));
 await page.locator('#logout').click();await page.locator('#username').fill('new_demo');await page.locator('#password').fill('OnlyInMemory!');await submit();await check('本次注册账号可以登录',await page.locator('#enterHall').isVisible());
 await page.goto(browse+'?guest=1&view=detail&product=p2');await capture('12_游客查看商品');
 await check('游客能查看公开描述且预约需登录',await page.locator('.description-text').isVisible()&&await page.locator('#reserve').innerText()==='登录后预约');
 await page.locator('#reserve').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/登录注册原型.html'));await page.locator('#username').fill('chen_demo');await page.locator('#password').fill('Demo123!');await submit();await page.locator('#enterHall').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/商品浏览原型.html'));
 await check('登录后返回原商品并显示当前账号',await page.locator('.detail-info h1').innerText()==='8G 电子阅读器'&&await page.locator('.username').innerText()==='chen_demo'&&await page.locator('#reserve').innerText()==='立即预约');
 await page.goto(url);await submit();await check('必填项缺失时逐项提示',await page.locator('#usernameError').isVisible()&&await page.locator('#passwordError').isVisible());
 await check('页面无脚本异常',errors.length===0);
 const layers=JSON.stringify(frames);await check('导出图层不包含所填演示密码',!layers.includes('OnlyInMemory!')&&!layers.includes('incorrect'));
 fs.writeFileSync(sourceFolder+'用户权限界面图层数据.json',layers);
 fs.writeFileSync(sourceFolder+'用户权限界面.drawio','<mxfile host="app.diagrams.net" agent="local-ui-prototype" version="26.0.0" type="device">'+frames.map((f,i)=>drawioPage(f.name,f.model,i+1)).join('')+'</mxfile>');
 fs.writeFileSync(sourceFolder+'用户权限交互检查结果.json',JSON.stringify({scope:'本地界面交互；不等同于后端认证、授权或持久化验证',checks,pageErrors:errors},null,2));
 const thumbs=frames.map(f=>'<figure><figcaption>'+f.name.replace('_',' · ')+'</figcaption><img src="../../../UI界面/'+f.name+'.png"></figure>').join('');
 const overview='<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:25px;background:#eaf0f7;color:#26354c;font:16px Microsoft YaHei}h1{font-size:23px;margin:0 0 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;border-radius:8px;padding:12px}figcaption{font-size:15px;margin:0 0 9px}img{display:block;width:100%;border:1px solid #e7ebf2;box-sizing:border-box}</style><h1>二手集市 · 用户与权限界面</h1><div class="grid">'+thumbs+'</div>';
 fs.writeFileSync(sourceFolder+'用户权限总览.html',overview);await page.setViewportSize({width:1240,height:1700});await page.goto(pathToFileURL(sourceFolder+'用户权限总览.html').href);await page.screenshot({path:previewFolder+'用户权限界面总览.png',fullPage:true});
 console.log(JSON.stringify({checks:checks.length,allPassed:true,pageErrors:errors}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
