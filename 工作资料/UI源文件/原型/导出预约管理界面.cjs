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
 const url=pathToFileURL(sourceFolder+'预约管理原型.html').href;
 const check=(name,value)=>{if(!value)throw Error(name);checks.push({name,passed:true});};
 const reset=()=>page.evaluate(()=>window.__booking.reset());
 const record=id=>page.evaluate(id=>window.__booking.get(id),id);
 const linked=id=>page.evaluate(id=>window.__booking.product(window.__booking.get(id)),id);
 const show=id=>page.evaluate(id=>window.__booking.showDetail(id),id);
 const open=(id,kind)=>page.evaluate(([id,kind])=>window.__booking.openAction(id,kind),[id,kind]);
 async function capture(name){await page.evaluate(()=>{document.querySelector('#toast').hidden=true;document.activeElement?.blur();});await page.evaluate(()=>document.fonts.ready);const model=await modelFromPage(page);fs.writeFileSync(vectorFolder+''+name+'.svg',svgFromModel(model));await page.screenshot({path:folder+name+'.png'});frames.push({name,model});console.log(name);}
 async function submit(){await page.locator('#confirmAction').click();await page.waitForFunction(()=>!window.__booking.state.busy);}
 async function request(id,kind,reason='',requestKey='check-'+Math.random()){return page.evaluate(({id,kind,reason,requestKey})=>{const r=window.__booking.get(id),p=window.__booking.product(r);return {id,kind,reason,requestKey,expectedVersion:r.version,expectedStatus:r.status,expectedProductVersion:p.version};},{id,kind,reason,requestKey});}
 const apply=req=>page.evaluate(req=>window.__booking.applyAction(req),req);
 await page.goto(url);await capture('23_我的预约_买入记录');
 check('买入页仅本人买入记录并分页',await page.locator('tbody tr').count()===5&&await page.locator('[data-tab=bought]').innerText().then(t=>t.includes('6')));
 check('买入页无卖家确认或拒绝入口',await page.locator('[data-action=confirm],[data-action=reject]').count()===0);
 await page.locator('#next').click();check('预约记录可翻页',await page.locator('tbody tr').count()===1);
 await page.locator('#bookingKeyword').fill('教材');await page.locator('[data-filter-status=PENDING_CONFIRMATION]').click();check('名称与预约状态组合筛选',await page.locator('tbody tr').count()===2);
 await page.locator('[data-detail=b1]').click();await page.locator('#backList').click();check('详情返回保留筛选条件',await page.locator('#bookingKeyword').inputValue()==='教材'&&await page.locator('.state-tab.selected').getAttribute('data-filter-status')==='PENDING_CONFIRMATION');
 await page.locator('#bookingKeyword').fill('不存在的商品');await page.locator('#bookingFilter button[type=submit]').click();await capture('33_预约记录无结果');check('无结果时保留查询条件',await page.locator('.zero-record').isVisible()&&await page.locator('#bookingKeyword').inputValue()==='不存在的商品');
 await reset();await page.locator('[data-tab=sold]').click();await capture('24_我的预约_卖出记录');
 check('卖出待确认可确认或拒绝',await page.locator('[data-action=confirm][data-id=s1]').count()===1&&await page.locator('[data-action=reject][data-id=s1]').count()===1);
 check('卖出列表无完成交易入口',await page.locator('[data-action=complete]').count()===0);
 await show('b2');await capture('25_已确认预约详情');check('相关买家仍可查看原文联系方式和交付说明',await page.locator('.record-description').innerText().then(t=>t.includes('demo_contact')&&t.includes('交付说明')));
 await show('s2');check('卖家不能代替买家完成',await page.locator('[data-action=complete]').count()===0&&!(await apply(await request('s2','complete'))).ok);
 await show('b1');check('待确认买家不可完成交易',await page.locator('[data-action=complete]').count()===0&&!(await apply(await request('b1','complete'))).ok);
 await show('s1');await open('s1','confirm');await capture('26_卖家确认预约');await submit();
 check('卖家确认同时更新商品和预约', (await record('s1')).status==='CONFIRMED'&&(await linked('s1')).status==='CONFIRMED'&&(await linked('s1')).activeReservationId==='s1');
 check('确认后保留预约价格并记录确认时间',(await record('s1')).reservedPrice===35&&!!(await record('s1')).confirmedAt);
 await reset();await show('b1');await open('b1','cancel');await submit();await capture('28_取消原因必填提示');check('空取消原因拒绝且原状态不变',await page.locator('#reasonError').isVisible()&&(await record('b1')).status==='PENDING_CONFIRMATION');
 await page.locator('#cancelReason').fill('临时安排有变化，暂时无法到场。');check('填写原因后必填错误及时清除',!(await page.locator('#reasonError').isVisible()));await capture('27_买家取消预约');await submit();await capture('31_已取消预约详情');
 const cancelled=await record('b1');check('买家取消保留人原因时间和历史价格',cancelled.status==='CANCELLED'&&cancelled.cancelActor==='chen_demo'&&cancelled.cancelReason==='临时安排有变化，暂时无法到场。'&&!!cancelled.cancelledAt&&cancelled.reservedPrice===45);
 check('普通取消释放商品恢复已发布',(await linked('b1')).status==='PUBLISHED'&&(await linked('b1')).activeReservationId===null);
 check('已取消记录不提供后续确认取消或完成',await page.locator('[data-action]').count()===0&&!(await apply(await request('b1','complete'))).ok);
 await reset();await show('s1');await open('s1','reject');await page.locator('#cancelReason').fill('本周无法安排面交。');await capture('35_卖家拒绝预约');await submit();
 check('卖家拒绝也按取消处理并保留原因',(await record('s1')).status==='CANCELLED'&&(await record('s1')).cancelActor==='chen_demo'&&(await record('s1')).cancelReason==='本周无法安排面交。'&&(await linked('s1')).status==='PUBLISHED');
 for(const id of ['b2','s2']){await reset();await show(id);await open(id,'cancel');await page.locator('#cancelReason').fill('双方改期未能达成一致。');await submit();check((id==='b2'?'买家':'卖家')+'可填写原因取消已确认预约',(await record(id)).status==='CANCELLED'&&(await linked(id)).status==='PUBLISHED');}
 await reset();await show('b2');await open('b2','complete');await capture('29_买家完成交易确认');await submit();await capture('30_交易已完成详情');
 const completed=await record('b2');check('只有买家完成并同时更新商品预约',completed.status==='COMPLETED'&&(await linked('b2')).status==='COMPLETED'&&!!completed.completedAt);
 check('完成后不提供取消入口且请求不能取消',await page.locator('[data-action]').count()===0&&!(await apply(await request('b2','cancel','改主意'))).ok);
 await reset();const firstRequest=await request('b2','complete','','same-complete');const first=await apply(firstRequest),replay=await apply(firstRequest);const afterReplay=await record('b2');check('相同完成请求重试不改写首次完成时间',first.ok&&replay.ok&&replay.replay&&afterReplay.completedAt===first.record.completedAt&&afterReplay.version===2&&(await linked('b2')).version===2);
 const changed=await apply({...firstRequest,kind:'cancel',reason:'变化'});check('同一请求标识不能复用为新操作',!changed.ok&&changed.code==='KEY_CONFLICT');
 check('新请求重复完成被拒绝且完成时间不变',!(await apply(await request('b2','complete','','another-key'))).ok&&(await record('b2')).completedAt===afterReplay.completedAt);
 await reset();await show('s1');await open('s1','confirm');await page.evaluate(()=>{document.querySelector('#confirmAction').click();document.querySelector('#confirmAction').click();});await page.waitForFunction(()=>!window.__booking.state.busy);check('连续点击只产生一次确认',await page.evaluate(()=>window.__booking.get('s1').version===2&&window.__booking.state.requests.size===1));
 await reset();await show('b1');await open('b1','cancel');await page.locator('#cancelReason').fill('旧页面上的取消原因');await page.evaluate(()=>window.__booking.simulateOtherAction('b1','confirm'));await submit();await capture('34_旧页面操作失效');
 check('旧取消不能跨过已发生的卖家确认',(await record('b1')).status==='CONFIRMED'&&(await linked('b1')).status==='CONFIRMED'&&await page.locator('#actionError').isVisible());
 check('状态冲突保留原因并要求手动刷新',await page.locator('#cancelReason').inputValue()==='旧页面上的取消原因'&&await page.locator('#refreshRecord').isVisible()&&await page.locator('#confirmAction').isDisabled());
 await page.locator('#refreshRecord').click();await page.locator('[data-action=cancel]').click();await page.locator('#cancelReason').fill('刷新后双方决定取消');await submit();check('刷新后可针对已确认状态重新取消',(await record('b1')).status==='CANCELLED');
 await reset();await show('s1');await open('s1','confirm');await page.evaluate(()=>window.__booking.simulateOtherAction('s1','cancel'));await submit();check('旧确认不能恢复已取消预约',(await record('s1')).status==='CANCELLED'&&(await linked('s1')).status==='PUBLISHED'&&await page.locator('#actionError').isVisible());
 await reset();await show('b2');await open('b2','complete');await page.evaluate(()=>window.__booking.simulateOtherAction('b2','block'));await submit();check('管理员屏蔽后旧完成请求不覆盖结果',(await linked('b2')).status==='BLOCKED'&&(await record('b2')).status==='CANCELLED'&&!(await record('b2')).completedAt);
 await page.locator('#refreshRecord').click();check('屏蔽导致取消显示管理员原因并无恢复按钮',await page.locator('.reason-panel.blocked').innerText().then(t=>t.includes('管理员屏蔽')&&t.includes('admin_demo'))&&await page.locator('[data-action]').count()===0);
 await reset();await show('b5');await capture('32_管理员屏蔽导致取消');
 check('屏蔽取消不恢复商品发布',(await linked('b5')).status==='BLOCKED'&&(await record('b5')).cancelType==='BLOCKING');
 await page.evaluate(()=>{window.__booking.product(window.__booking.get('b3')).price=99;});check('商品当前价格变化不改写历史预约价格',(await record('b3')).reservedPrice===35);
 await page.evaluate(()=>{const p=window.__booking.product(window.__booking.get('b3'));p.status='RESERVED';p.activeReservationId='new-booking';p.version++;});const oldCancel=await apply(await request('b3','cancel','旧记录'));check('旧取消记录不能释放后来创建的新预约',!oldCancel.ok&&(await linked('b3')).activeReservationId==='new-booking');
 await page.goto(url+'?user=unrelated_demo&record=b1');check('无关账号看不到私人预约',await page.locator('tbody tr').count()===0&&await page.locator('.zero-record').isVisible());check('无关账号不能直接查看或操作他人记录',!(await show('b1'))&&!(await apply(await request('b1','cancel','越权'))).ok);
 await page.goto(pathToFileURL(sourceFolder+'商品浏览原型.html').href+'?view=detail&product=p2');await page.locator('#reserve').click();await page.locator('#confirmReserve').click();await page.waitForFunction(()=>!!window.__prototype.state.booking);await page.locator('#viewBooking').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/预约管理原型.html'));check('浏览页预约成功后进入本次预约详情',await page.locator('.record-product h2').innerText()==='8G 电子阅读器'&&await page.evaluate(()=>window.__booking.get(window.__booking.state.currentId).reservedPrice===220&&window.__booking.get(window.__booking.state.currentId).status==='PENDING_CONFIRMATION'));
 await page.goto(pathToFileURL(sourceFolder+'商品管理原型.html').href);await page.evaluate(()=>window.__goods.showDetail('g4'));await page.locator('[data-booking]').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/预约管理原型.html'));check('我的商品可直达对应卖出预约',await page.evaluate(()=>window.__booking.state.currentId==='s1')&&await page.locator('[data-action=confirm]').count()===1);
 await page.goto(url+'?guest=1');await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/登录注册原型.html'));check('未登录进入预约管理要求先登录',await page.locator('#authForm').isVisible());
 check('页面无脚本异常',errors.length===0);
 frames.sort((a,b)=>a.name.localeCompare(b.name));fs.writeFileSync(sourceFolder+'预约管理界面图层数据.json',JSON.stringify(frames));fs.writeFileSync(sourceFolder+'预约管理界面.drawio','<mxfile host="app.diagrams.net" agent="local-ui-prototype" version="26.0.0" type="device">'+frames.map((f,i)=>drawioPage(f.name,f.model,i+1)).join('')+'</mxfile>');fs.writeFileSync(sourceFolder+'预约管理交互检查结果.json',JSON.stringify({scope:'离线界面与内存中的状态演示；不等同于后端认证、并发事务或持久化验证',checks,pageErrors:errors},null,2));
 const overview=frames=>'<div class="grid">'+frames.map(f=>'<figure><figcaption>'+f.name.replace('_',' · ')+'</figcaption><img src="../../../UI界面/'+f.name+'.png"></figure>').join('')+'</div>';
 const head=title=>'<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:25px;background:#eaf0f7;color:#26354c;font:16px Microsoft YaHei}h1{font-size:23px;margin:0 0 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;border-radius:8px;padding:12px}figcaption{font-size:15px;margin:0 0 9px}img{display:block;width:100%;border:1px solid #e7ebf2;box-sizing:border-box}</style><h1>'+title+'</h1>';
 fs.writeFileSync(sourceFolder+'预约管理总览.html',head('二手集市 · 我的预约界面与操作')+overview(frames));await page.setViewportSize({width:1240,height:590});await page.goto(pathToFileURL(sourceFolder+'预约管理总览.html').href);await page.screenshot({path:previewFolder+'预约管理界面总览.png',fullPage:true});
 fs.writeFileSync(sourceFolder+'预约管理主要界面.html',head('二手集市 · 我买入的与我卖出的')+overview(frames.filter(f=>f.name.startsWith('23_')||f.name.startsWith('24_'))));await page.goto(pathToFileURL(sourceFolder+'预约管理主要界面.html').href);await page.screenshot({path:previewFolder+'预约管理主要界面.png',fullPage:true});console.log(JSON.stringify({screens:frames.length,checks:checks.length,allPassed:true,pageErrors:errors}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
