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

   if(el.tagName==='IMG'){
    output.push({kind:'svg',x:r.x,y:r.y,w:r.width,h:r.height,color:c.color,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="'+r.width+'" height="'+r.height+'" viewBox="0 0 '+r.width+' '+r.height+'"><image href="'+el.src+'" width="'+r.width+'" height="'+r.height+'" preserveAspectRatio="xMidYMid slice"/></svg>'});return;
   }
   if(el.tagName==='SELECT'){
    ctx.font=c.fontStyle+' '+c.fontWeight+' '+c.fontSize+' '+c.fontFamily;
    const m=ctx.measureText('国Hg'),ascent=m.fontBoundingBoxAscent||parseFloat(c.fontSize),descent=m.fontBoundingBoxDescent||3,val=el.selectedOptions[0]?.textContent||'';
    text(val,{x:r.x+parseFloat(c.paddingLeft)+1,y:r.y,width:ctx.measureText(val).width,height:r.height},c,r.y+r.height/2+(ascent-descent)/2);return;
   }
   if(el.tagName==='TEXTAREA'){
    const mirror=document.createElement('div');mirror.style.cssText='position:fixed;pointer-events:none;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:border-box;';
    for(const key of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderLeftWidth','borderRightWidth','borderBottomWidth'])mirror.style[key]=c[key];
    mirror.style.borderStyle='solid';mirror.style.borderColor='transparent';mirror.style.left=r.x+'px';mirror.style.top=r.y+'px';mirror.style.width=r.width+'px';mirror.style.height=r.height+'px';mirror.style.color=el.value?c.color:getComputedStyle(el,'::placeholder').color;
    const n=document.createTextNode(el.value||el.placeholder);mirror.appendChild(n);document.body.appendChild(mirror);textNode(n,getComputedStyle(mirror));mirror.remove();return;
   }
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
const frames=[],checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2});
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);await page.route('http://**',r=>r.abort());await page.route('https://**',r=>r.abort());
 const url=pathToFileURL(sourceFolder+'商品管理原型.html').href;
 function check(name,condition){if(!condition)throw Error(name);checks.push({name,passed:true});}
 async function capture(name){await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>{document.querySelector('#toast').hidden=true;document.activeElement?.blur();});const model=await modelFromPage(page);fs.writeFileSync(vectorFolder+''+name+'.svg',svgFromModel(model));await page.screenshot({path:folder+name+'.png'});frames.push({name,model});console.log(name);}
 const reset=()=>page.evaluate(()=>window.__goods.reset());
 const status=id=>page.evaluate(id=>window.__goods.get(id).status,id);
 await page.goto(url);await capture('13_我的商品');
 check('本人商品列表分页及状态筛选完整',await page.locator('tbody tr').count()===6&&await page.locator('[data-status]').count()===9);
 await page.locator('#next').click();check('第二页展示剩余商品',await page.locator('tbody tr').count()===3);
 await page.locator('#goodsName').fill('教材');await page.locator('[data-status=DRAFT]').click();check('名称与状态可组合筛选',await page.locator('tbody tr').count()===2);
 await page.locator('#goodsName').fill('不存在的商品');await page.locator('#filterForm button[type=submit]').click();await capture('21_我的商品无结果');check('筛选无结果时保留输入',await page.locator('#goodsName').inputValue()==='不存在的商品');
 await reset();await page.locator('#newProduct').click();await capture('14_发布商品');
 check('编辑仅包含单图及固定分类',await page.locator('#category option').count()===6&&await page.locator('#imageInput').getAttribute('multiple')===null&&await page.locator('input[type=number]').count()===0);
 await page.locator('#name').fill('暂未填写完整');await page.locator('#saveDraft').click();
 let created=await page.evaluate(()=>window.__goods.state.products.find(p=>p.name==='暂未填写完整'));
 check('允许保存缺分类价格描述及图片的草稿',created.status==='DRAFT'&&!created.category&&!created.price&&!created.description&&!created.image);
 await page.locator('[data-edit="'+created.id+'"]').click();check('可重新打开不完整草稿继续编辑',await page.locator('#name').inputValue()==='暂未填写完整');
 await page.evaluate(()=>{window.__goods.state.dirty=false;window.__goods.showEditor();});await page.locator('#description').fill('已填写描述，其他信息稍后补充。');await page.locator('#submitReview').click();await capture('16_提交审核校验');
 check('提交缺必填项逐项提示并保留描述',await page.locator('#nameError').isVisible()&&await page.locator('#categoryError').isVisible()&&await page.locator('#priceError').isVisible()&&await page.locator('#description').inputValue()==='已填写描述，其他信息稍后补充。');
 await page.locator('#name').fill('新教材');await page.locator('#category').selectOption('图书');for(const price of ['0','-1','1.234']){await page.locator('#price').fill(price);await page.locator('#submitReview').click();check('拒绝非法价格 '+price,await page.locator('#priceError').isVisible()&&await page.locator('#name').inputValue()==='新教材');}
 await page.locator('#price').fill('45.50');
 const fixtures=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=16;c.height=16;const ctx=c.getContext('2d');return ['#5277b4','#68877b'].map(color=>{ctx.fillStyle=color;ctx.fillRect(0,0,16,16);return c.toDataURL('image/png').split(',')[1];});});
 await page.locator('#imageInput').setInputFiles({name:'first.png',mimeType:'image/png',buffer:Buffer.from(fixtures[0],'base64')});await page.waitForFunction(()=>!!window.__goods.state.form.image);const first=await page.locator('#imagePreview img').getAttribute('src');
 await page.locator('#imageInput').setInputFiles({name:'second.png',mimeType:'image/png',buffer:Buffer.from(fixtures[1],'base64')});await page.waitForFunction(src=>window.__goods.state.form.image!==src,first);
 check('替换图片后仍只有一张',await page.locator('#imagePreview img').count()===1&&await page.locator('#imagePreview img').getAttribute('src')!==first);
 await page.locator('#imageInput').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});check('非图片被拒绝且保留现有图片',await page.locator('#imageError').isVisible()&&await page.locator('#imagePreview img').count()===1);
 await page.locator('#removeImage').click();await page.locator('#submitReview').click();await capture('17_商品待审核');
 created=await page.evaluate(()=>window.__goods.get(window.__goods.state.currentId));check('没有图片也可提交且只能进入待审核',created.status==='PENDING_REVIEW'&&!created.image&&!created.art);
 check('待审核页没有直接编辑入口',await page.locator('[data-edit]').count()===0&&await page.locator('[data-op=withdraw]').count()===1);
 await page.locator('[data-op=withdraw]').click();await page.locator('#confirmAction').click();check('撤回审核恢复草稿',await status(created.id)==='DRAFT');
 await reset();await page.evaluate(()=>window.__goods.showEditor('g1'));await capture('15_编辑商品草稿');
 await page.locator('#name').fill('本次尚未保存');await page.locator('#cancelEdit').click();check('未保存修改离开前有提示',await page.locator('#keepEditing').isVisible());await page.locator('#keepEditing').click();check('继续编辑保留填写内容',await page.locator('#name').inputValue()==='本次尚未保存');
 await page.evaluate(()=>window.__goods.bumpVersion('g1'));await page.locator('#saveDraft').click();check('过期草稿请求不覆盖新版本并保留输入',await page.locator('#saveError').isVisible()&&await page.locator('#name').inputValue()==='本次尚未保存'&&await page.evaluate(()=>window.__goods.get('g1').name==='数据库系统教材'));
 await reset();await page.evaluate(()=>window.__goods.showEditor('g9'));await capture('18_驳回后修改草稿');check('驳回原因在编辑页可见',await page.locator('.banner.warning').innerText().then(t=>t.includes('请补充成色')));
 await reset();await page.evaluate(()=>window.__goods.showDetail('g4'));await capture('19_有预约商品只读');check('有预约商品不提供编辑下架退回入口',await page.locator('[data-edit],[data-op]').count()===0&&await page.locator('[data-booking]').count()===1);
 const refused=await page.evaluate(()=>['g4','g5','g6','g8'].map(id=>window.__goods.showEditor(id)));check('已预约已确认已完成已屏蔽商品禁止编辑',refused.every(x=>x===false));
 await page.evaluate(()=>window.__goods.showDetail('g8'));await capture('20_已屏蔽商品只读');check('屏蔽显示原因且无卖家恢复入口',await page.locator('.banner').innerText().then(t=>t.includes('屏蔽原因'))&&await page.locator('[data-op],[data-edit]').count()===0);
 await reset();await page.evaluate(()=>window.__goods.askAction('g3','takeDown'));await capture('22_商品下架确认');await page.locator('#confirmAction').click();check('已发布商品下架进入已下架',await status('g3')==='OFF_SHELF');
 await page.evaluate(()=>window.__goods.askAction('g3','returnDraft'));await page.locator('#confirmAction').click();check('下架商品先退回草稿才能编辑',await status('g3')==='DRAFT'&&await page.locator('#editorForm').isVisible());await page.locator('#submitReview').click();check('下架商品重新发布仍需审核',await status('g3')==='PENDING_REVIEW');
 await reset();await page.evaluate(()=>window.__goods.askAction('g3','returnDraft'));await page.locator('#confirmAction').click();check('已发布商品退回草稿后才能编辑',await status('g3')==='DRAFT'&&await page.locator('#editorForm').isVisible());
 await reset();await page.evaluate(()=>window.__goods.askAction('g2','withdraw'));await page.evaluate(()=>window.__goods.setStatus('g2','PUBLISHED'));await page.locator('#confirmAction').click();check('过期撤回请求不覆盖已完成审核',await status('g2')==='PUBLISHED'&&await page.locator('#actionError').isVisible());
 await reset();await page.evaluate(()=>window.__goods.askAction('g3','takeDown'));await page.evaluate(()=>window.__goods.setStatus('g3','RESERVED'));await page.locator('#confirmAction').click();check('新增有效预约后旧下架请求被拒绝',await status('g3')==='RESERVED'&&await page.locator('#actionError').isVisible());
 await reset();await page.goto(url+'?user=another_demo');check('其他账号看不到演示卖家的私有商品',await page.locator('tbody tr').count()===0&&await page.locator('.empty-owned').isVisible());check('其他账号不能打开原卖家草稿',await page.evaluate(()=>window.__goods.showEditor('g1'))===false);
 await page.goto(pathToFileURL(sourceFolder+'商品浏览原型.html').href);await page.locator('#ownedGoods').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/商品管理原型.html'));check('商品大厅导航已接入我的商品',await page.locator('.page-heading h1').innerText()==='我的商品');
 await page.locator('#hallNav').click();await page.locator('#publishGoods').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/商品管理原型.html'));check('商品大厅发布入口直达新建表单',await page.locator('#editorForm').isVisible());
 check('页面无脚本异常',errors.length===0);
 frames.sort((a,b)=>a.name.localeCompare(b.name));fs.writeFileSync(sourceFolder+'商品管理界面图层数据.json',JSON.stringify(frames));fs.writeFileSync(sourceFolder+'商品管理界面.drawio','<mxfile host="app.diagrams.net" agent="local-ui-prototype" version="26.0.0" type="device">'+frames.map((f,i)=>drawioPage(f.name,f.model,i+1)).join('')+'</mxfile>');fs.writeFileSync(sourceFolder+'商品管理交互检查结果.json',JSON.stringify({scope:'本地界面流程；不等同于后端授权、并发事务和持久化验证',checks,pageErrors:errors},null,2));
 const overview='<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:25px;background:#eaf0f7;color:#26354c;font:16px Microsoft YaHei}h1{font-size:23px;margin:0 0 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;border-radius:8px;padding:12px}figcaption{font-size:15px;margin:0 0 9px}img{display:block;width:100%;border:1px solid #e7ebf2;box-sizing:border-box}</style><h1>二手集市 · 我的商品与发布编辑界面</h1><div class="grid">'+frames.map(f=>'<figure><figcaption>'+f.name.replace('_',' · ')+'</figcaption><img src="../../../UI界面/'+f.name+'.png"></figure>').join('')+'</div>';
 fs.writeFileSync(sourceFolder+'商品管理总览.html',overview);await page.setViewportSize({width:1240,height:1700});await page.goto(pathToFileURL(sourceFolder+'商品管理总览.html').href);await page.screenshot({path:previewFolder+'商品管理界面总览.png',fullPage:true});const primary=overview.replace(/<h1>.*?<\/h1>/,'<h1>二手集市 · 我的商品与编辑页</h1>').replace(/<figure>[\s\S]*?<\/figure>/g,chunk=>(chunk.includes('13_')||chunk.includes('15_'))?chunk:'');
 fs.writeFileSync(sourceFolder+'商品管理主要界面.html',primary);await page.setViewportSize({width:1240,height:590});await page.goto(pathToFileURL(sourceFolder+'商品管理主要界面.html').href);await page.screenshot({path:previewFolder+'商品管理主要界面.png',fullPage:true});
 console.log(JSON.stringify({screens:frames.length,checks:checks.length,allPassed:true,pageErrors:errors}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
