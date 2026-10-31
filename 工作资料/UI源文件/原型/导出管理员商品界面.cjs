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

   if(el.classList.contains('timeline-row')){
    rect({kind:'rect',x:r.x+4,y:r.y+6,w:7,h:7,radius:3.5,fill:el.classList.contains('current')?'rgb(37,99,235)':'rgb(197,210,231)',alpha:1,stroke:'none',strokeWidth:0});
    if(el.nextElementSibling?.classList.contains('timeline-row'))rect({kind:'rect',x:r.x+7,y:r.y+18,w:1,h:r.height-18,radius:0,fill:'rgb(231,237,246)',alpha:1,stroke:'none',strokeWidth:0});
   }
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
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.route('http://**',r=>r.abort());await page.route('https://**',r=>r.abort());
 const url=pathToFileURL(sourceFolder+'管理员商品管理原型.html').href;
 const check=(name,value)=>{if(!value)throw Error(name);checks.push({name,passed:true});};
 const reset=()=>page.evaluate(()=>window.__admin.reset()),get=id=>page.evaluate(id=>window.__admin.get(id),id),records=id=>page.evaluate(id=>window.__admin.records(id),id),show=id=>page.evaluate(id=>window.__admin.showDetail(id),id),open=(id,kind)=>page.evaluate(([id,kind])=>window.__admin.openAction(id,kind),[id,kind]);
 async function capture(name){await page.evaluate(()=>{document.querySelector('#toast').hidden=true;document.activeElement?.blur();});await page.evaluate(()=>document.fonts.ready);const model=await modelFromPage(page);fs.writeFileSync(vectorFolder+''+name+'.svg',svgFromModel(model));await page.screenshot({path:folder+name+'.png'});frames.push({name,model});console.log(name);}
 async function submit(){await page.locator('#confirmAction').click();await page.waitForFunction(()=>!window.__admin.state.busy);}
 async function request(id,kind,reason='',requestKey='check-'+Math.random()){return page.evaluate(({id,kind,reason,requestKey})=>{const p=window.__admin.get(id),r=window.__admin.records(id).find(r=>r.id===p.activeReservationId);return {id,kind,reason,requestKey,expectedVersion:p.version,expectedStatus:p.status,expectedReservationId:p.activeReservationId||null,expectedReservationVersion:r?r.version:null};},{id,kind,reason,requestKey});}
 const apply=req=>page.evaluate(req=>window.__admin.applyAction(req),req);
 await page.goto(url);await capture('36_管理员待审核商品');check('默认只列出三件待审核商品',await page.locator('tbody tr').count()===3&&await page.locator('tbody .badge.PENDING_REVIEW').count()===3);
 await page.locator('#adminKeyword').fill('教材');await page.locator('#adminFilter button[type=submit]').click();check('待审核列表支持名称筛选',await page.locator('tbody tr').count()===1);await page.locator('[data-detail=a2]').click();await page.locator('#backList').click();check('详情返回保留列表查询条件',await page.locator('#adminKeyword').inputValue()==='教材');
 await page.locator('#allNav').click();await capture('37_管理员全部商品');check('全平台商品按八种状态筛选',await page.locator('[data-filter-status]').count()===9&&await page.locator('tbody tr').count()===6);await page.locator('#next').click();check('全部商品可分页查看',await page.locator('tbody tr').count()===5);
 await page.locator('[data-filter-status=BLOCKED]').click();await page.locator('#adminKeyword').fill('收纳');await page.locator('#adminFilter button[type=submit]').click();check('商品名称与屏蔽状态可组合筛选',await page.locator('tbody tr').count()===1&&await page.locator('[data-detail=a7]').count()===1);
 await page.locator('#adminKeyword').fill('不存在的商品');await page.locator('#adminFilter button[type=submit]').click();await capture('47_管理员查询无结果');check('无结果时保留筛选条件',await page.locator('.admin-empty').isVisible()&&await page.locator('#adminKeyword').inputValue()==='不存在的商品');
 await reset();await show('a1');await capture('38_管理员商品审核详情');check('管理员详情只读展示卖家描述而不提供编辑',await page.locator('.admin-description').innerText().then(t=>t.includes('demo_contact'))&&await page.locator('#app input,#app textarea').count()===0&&await page.locator('[data-action=approve],[data-action=reject]').count()===2);
 await open('a1','approve');await capture('39_审核通过确认');await submit();let p=await get('a1');check('审核通过更新为已发布并记录发布时间',p.status==='PUBLISHED'&&!!p.publishedAt&&p.version===2&&p.lastAction.actor==='admin_demo');
 check('通过后不能重复审核或直接编辑',await page.locator('[data-action=approve],[data-action=reject]').count()===0&&!(await open('a1','approve')));
 await reset();await show('a2');await open('a2','reject');await submit();await capture('41_驳回原因必填提示');check('空驳回原因不改变待审核状态',await page.locator('#reasonError').isVisible()&&(await get('a2')).status==='PENDING_REVIEW');
 await page.locator('#moderationReason').fill('请补充教材成色及使用情况后重新提交。');check('填写原因后及时消除必填错误',!(await page.locator('#reasonError').isVisible()));await capture('40_管理员驳回商品');await submit();p=await get('a2');check('驳回退回草稿并保留具体原因',p.status==='DRAFT'&&p.latestRejectReason==='请补充教材成色及使用情况后重新提交。'&&p.lastAction.kind==='reject'&&p.lastAction.actor==='admin_demo');
 check('驳回不更改卖家原有描述',(await get('a2')).description.includes('demo_contact'));
 await reset();await page.evaluate(()=>window.__admin.setMode('all'));await show('a5');await open('a5','block');await submit();check('屏蔽原因必填且不提前取消预约',await page.locator('#reasonError').isVisible()&&(await get('a5')).status==='RESERVED'&&(await records('a5'))[0].status==='PENDING_CONFIRMATION');await page.locator('#moderationReason').fill('商品描述包含违规内容，需修正后重新提交。');await capture('42_屏蔽并取消有效预约');
 check('屏蔽确认框说明关联预约将被取消',await page.locator('.linked-warning').innerText().then(t=>t.includes('AR5')&&t.includes('待卖家确认')&&t.includes('取消')));await submit();await capture('43_商品已屏蔽处理结果');p=await get('a5');let r=(await records('a5'))[0];
 check('屏蔽同时取消待确认预约且商品不恢复发布',p.status==='BLOCKED'&&p.activeReservationId===null&&r.status==='CANCELLED'&&r.cancelType==='BLOCKING');
 check('关联取消保留管理员原因价格人和时间',r.cancelActor==='admin_demo'&&r.cancelReason.includes('商品描述包含违规内容')&&r.reservedPrice===60&&!!r.cancelledAt&&p.latestBlockReason==='商品描述包含违规内容，需修正后重新提交。');
 check('屏蔽后只提供恢复草稿入口',await page.locator('[data-action=restore]').count()===1&&await page.locator('[data-action=block],[data-action=approve]').count()===0);
 await open('a5','restore');await capture('44_恢复屏蔽商品确认');await submit();await capture('45_恢复后仍为草稿');p=await get('a5');r=(await records('a5'))[0];check('恢复只到草稿而不直接发布',p.status==='DRAFT'&&!!p.restoredAt&&p.activeReservationId===null&&await page.locator('[data-action=approve]').count()===0);
 check('恢复不重建或恢复已经取消的预约',r.status==='CANCELLED'&&r.cancelType==='BLOCKING'&&r.version===2&&r.cancelReason.includes('商品描述包含违规内容'));
 check('草稿不能通过重复恢复或直接审核上架',!(await open('a5','restore'))&&!(await open('a5','approve'))&&(await get('a5')).status==='DRAFT');
 await reset();const confirmedBefore=(await records('a6'))[0].confirmedAt;const blockConfirmed=await apply(await request('a6','block','违规内容'));check('屏蔽已确认商品也取消有效预约',blockConfirmed.ok&&(await get('a6')).status==='BLOCKED'&&(await records('a6'))[0].status==='CANCELLED'&&(await records('a6'))[0].confirmedAt===confirmedBefore);
 await reset();for(const id of ['a4','a9','a10']){const result=await apply(await request(id,'block','违规商品'));check('屏蔽无预约的'+({a4:'已发布',a9:'草稿',a10:'已下架'})[id]+'商品不创建预约',result.ok&&(await get(id)).status==='BLOCKED'&&(await records(id)).length===0);}
 await reset();await page.evaluate(()=>window.__admin.setMode('all'));await show('a8');await capture('46_已完成商品只读');const completedBefore=JSON.stringify({p:await get('a8'),r:await records('a8')});check('已完成商品没有屏蔽恢复或审核入口',await page.locator('[data-action]').count()===0);check('已完成历史不被屏蔽或恢复请求改写',!(await apply(await request('a8','block','违规'))).ok&&!(await apply(await request('a8','restore'))).ok&&JSON.stringify({p:await get('a8'),r:await records('a8')})===completedBefore);
 await reset();await show('a2');await open('a2','reject');await page.locator('#moderationReason').fill('审核中发现描述不完整。');await page.evaluate(()=>window.__admin.simulateOther('a2','withdraw'));await submit();await capture('48_管理员旧页面操作失效');check('卖家撤回后旧驳回请求不能覆盖新状态',(await get('a2')).status==='DRAFT'&&(await get('a2')).latestRejectReason===''&&await page.locator('#actionError').isVisible());
 check('状态冲突保留原因并要求先刷新',await page.locator('#moderationReason').inputValue()==='审核中发现描述不完整。'&&await page.locator('#confirmAction').isDisabled()&&await page.locator('#refreshProduct').isVisible());await page.locator('#refreshProduct').click();check('刷新显示最新草稿状态并移除审核入口',await page.locator('.page-heading .badge.DRAFT').isVisible()&&await page.locator('[data-action=approve],[data-action=reject]').count()===0);
 await reset();await open('a1','approve');await page.evaluate(()=>window.__admin.simulateOther('a1','withdraw'));await submit();check('卖家撤回后旧通过请求不能发布草稿',(await get('a1')).status==='DRAFT'&&!(await get('a1')).publishedAt);
 await reset();await page.evaluate(()=>window.__admin.setMode('all'));await show('a6');await open('a6','block');await page.locator('#moderationReason').fill('稍后发现的违规');await page.evaluate(()=>window.__admin.simulateOther('a6','complete'));await submit();check('买家已完成后旧屏蔽请求不能改写历史',(await get('a6')).status==='COMPLETED'&&(await records('a6'))[0].status==='COMPLETED'&&(await records('a6'))[0].completedAt!==null&&(await get('a6')).latestBlockReason==='');
 await reset();await page.evaluate(()=>window.__admin.setMode('all'));await show('a5');await open('a5','block');await page.locator('#moderationReason').fill('违规内容');await page.evaluate(()=>window.__admin.simulateOther('a5','confirm'));await submit();check('预约状态变化时旧屏蔽请求失败且不取消新状态',(await get('a5')).status==='CONFIRMED'&&(await records('a5'))[0].status==='CONFIRMED'&&await page.locator('#actionError').isVisible());await page.locator('#refreshProduct').click();await open('a5','block');await page.locator('#moderationReason').fill('刷新后重新检查，确认存在违规');await submit();check('刷新后可针对已确认状态重新屏蔽',(await get('a5')).status==='BLOCKED'&&(await records('a5'))[0].status==='CANCELLED');
 await reset();await page.evaluate(()=>window.__admin.setMode('all'));await show('a5');await open('a5','block');await page.locator('#moderationReason').fill('保留该屏蔽原因');const beforeFailure=JSON.stringify({p:await get('a5'),r:await records('a5')});await page.evaluate(()=>window.__admin.simulateFailure());await submit();check('模拟处理失败时商品和预约均不变',JSON.stringify({p:await get('a5'),r:await records('a5')})===beforeFailure&&await page.evaluate(()=>window.__admin.state.operations.length===0));check('临时失败保留原因并允许手动重试',await page.locator('#moderationReason').inputValue()==='保留该屏蔽原因'&&!(await page.locator('#confirmAction').isDisabled()));await submit();check('失败后重新提交同时更新两条记录',(await get('a5')).status==='BLOCKED'&&(await records('a5'))[0].status==='CANCELLED');
 await reset();const firstRequest=await request('a1','approve','','same-review');const first=await apply(firstRequest),replay=await apply(firstRequest);check('相同通过请求重试不重复发布或记处理记录',first.ok&&replay.ok&&replay.replay&&(await get('a1')).version===2&&(await get('a1')).publishedAt===first.product.publishedAt&&await page.evaluate(()=>window.__admin.state.operations.length===1));const conflict=await apply({...firstRequest,kind:'reject',reason:'换操作'});check('同一请求标识不得改成其他审核操作',!conflict.ok&&conflict.code==='KEY_CONFLICT');
 await reset();await show('a1');await open('a1','approve');await page.evaluate(()=>{document.querySelector('#confirmAction').click();document.querySelector('#confirmAction').click();});await page.waitForFunction(()=>!window.__admin.state.busy);check('连续点击只处理一次审核',(await get('a1')).version===2&&await page.evaluate(()=>window.__admin.state.operations.length===1));
 await reset();await page.evaluate(()=>{window.__admin.get('a1').price=1.234;});const invalid=await apply(await request('a1','approve'));check('无效商品价格不能通过审核',!invalid.ok&&invalid.code==='INVALID_PRODUCT'&&(await get('a1')).status==='PENDING_REVIEW');
 await page.goto(url+'?user=chen_demo');check('普通账号进入管理页明确拒绝',await page.locator('.denied-card').isVisible()&&await page.locator('tbody tr').count()===0);check('普通账号直接触发审核也不能改变商品',!(await apply(await request('a1','approve'))).ok&&(await get('a1')).status==='PENDING_REVIEW');
 await page.goto(url+'?user=reviewer_demo');check('经授权的其他管理员也可审核商品',(await apply(await request('a1','approve'))).ok);
 await page.goto(pathToFileURL(sourceFolder+'登录注册原型.html').href);await page.locator('#username').fill('admin_demo');await page.locator('#password').fill('Demo123!');await page.locator('button[type=submit]').click();await page.waitForFunction(()=>!window.__auth.state.busy);await page.locator('#enterAdmin').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/管理员商品管理原型.html'));check('管理员登录后可进入商品审核界面',await page.locator('.page-heading h1').innerText()==='商品审核');
 await page.goto(url+'?guest=1');await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/登录注册原型.html'));check('游客访问管理页先进入登录',await page.locator('#authForm').isVisible());check('页面无脚本异常',errors.length===0);
 frames.sort((a,b)=>a.name.localeCompare(b.name));fs.writeFileSync(sourceFolder+'管理员商品界面图层数据.json',JSON.stringify(frames));fs.writeFileSync(sourceFolder+'管理员商品界面.drawio','<mxfile host="app.diagrams.net" agent="local-ui-prototype" version="26.0.0" type="device">'+frames.map((f,i)=>drawioPage(f.name,f.model,i+1)).join('')+'</mxfile>');fs.writeFileSync(sourceFolder+'管理员商品交互检查结果.json',JSON.stringify({scope:'离线界面与内存状态演示；不等同于真实服务端权限、并发事务、日志或持久化验证',checks,pageErrors:errors},null,2));
 const head=title=>'<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:25px;background:#eaf0f7;color:#26354c;font:16px Microsoft YaHei}h1{font-size:23px;margin:0 0 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;border-radius:8px;padding:12px}figcaption{font-size:15px;margin:0 0 9px}img{display:block;width:100%;border:1px solid #e7ebf2;box-sizing:border-box}</style><h1>'+title+'</h1>',overview=frames=>'<div class="grid">'+frames.map(f=>'<figure><figcaption>'+f.name.replace('_',' · ')+'</figcaption><img src="../../../UI界面/'+f.name+'.png"></figure>').join('')+'</div>';
 fs.writeFileSync(sourceFolder+'管理员商品总览.html',head('二手集市 · 管理员商品审核、屏蔽与恢复')+overview(frames));await page.setViewportSize({width:1240,height:590});await page.goto(pathToFileURL(sourceFolder+'管理员商品总览.html').href);await page.screenshot({path:previewFolder+'管理员商品界面总览.png',fullPage:true});
 fs.writeFileSync(sourceFolder+'管理员商品主要界面.html',head('二手集市 · 商品审核列表与审核详情')+overview(frames.filter(f=>f.name.startsWith('36_')||f.name.startsWith('38_'))));await page.goto(pathToFileURL(sourceFolder+'管理员商品主要界面.html').href);await page.screenshot({path:previewFolder+'管理员商品主要界面.png',fullPage:true});console.log(JSON.stringify({screens:frames.length,checks:checks.length,allPassed:true,pageErrors:errors}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
