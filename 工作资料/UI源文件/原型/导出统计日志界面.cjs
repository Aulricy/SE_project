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
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2,timezoneId:'America/New_York'});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.route('http://**',r=>r.abort());await page.route('https://**',r=>r.abort());
 const url=pathToFileURL(sourceFolder+'统计与日志原型.html').href;
 const check=(name,value)=>{if(!value)throw Error(name);checks.push({name,passed:true});};
 const reset=(view='stats')=>page.evaluate(view=>window.__insights.reset(view),view);
 const calculate=(start,end)=>page.evaluate(q=>window.__insights.calculateStats(q),{start,end});
 const query=(overrides={})=>page.evaluate(overrides=>window.__insights.queryLogs({...window.__insights.state.logsApplied,...overrides}),overrides);
 async function capture(name){await page.evaluate(()=>document.activeElement?.blur());await page.evaluate(()=>document.fonts.ready);const model=await modelFromPage(page);fs.writeFileSync(vectorFolder+''+name+'.svg',svgFromModel(model));await page.screenshot({path:folder+name+'.png'});frames.push({name,model});console.log(name);}
 async function setStats(start,end){await page.locator('#statsStart').fill(start);await page.locator('#statsEnd').fill(end);await page.locator('#statsForm button[type=submit]').click();}
 async function setLogs(fields){const ids={start:'logStart',end:'logEnd',operator:'logOperator',productId:'logProduct',reservationId:'logReservation'};for(const [key,value] of Object.entries(fields)){if(key==='type')await page.locator('#logType').selectOption(value);else await page.locator('#'+ids[key]).fill((key==='start'||key==='end')&&value.length===19&&value.endsWith(':00')?value.slice(0,16):value);}await page.locator('#logsForm button[type=submit]').click();}
 await page.goto(url);await capture('49_管理员交易统计');
 check('默认统计六笔及预约价格390.50元',await page.locator('#completedCount').innerText()==='6'&&await page.locator('#completedAmount').innerText()==='¥390.50');
 check('金额注明不表示实际收款',await page.locator('.metric-note').allTextContents().then(a=>a.some(x=>x.includes('不表示实际收款'))));
 await page.locator('#next').click();check('统计明细分页不改变总计',await page.locator('tbody tr').count()===1&&await page.locator('#completedCount').innerText()==='6'&&await page.locator('#completedAmount').innerText()==='¥390.50');
 let result=await calculate('2026-10-29','2026-10-29');check('单日含起止边界两笔10.50和20.00',result.count===2&&result.totalCents===3050);
 check('按北京时间而非浏览器所在时区归属日期',await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone)==='America/New_York'&&result.records.some(r=>r.completedAt==='2026-10-28T16:00:00.000Z'));
 result=await calculate('2026-10-28','2026-10-28');check('前一天23时59分59秒记录不跨到次日',result.count===1&&result.totalCents===1800);
 result=await calculate('2026-11-01','2026-11-01');check('结束日之后零点记录不会提前计入',result.count===1&&result.totalCents===1200);
 check('重复完成记录不会重复计数或加金额',await page.evaluate(()=>{const api=window.__insights;const rows=[...api.trades,api.trades[0],api.trades[0]];const r=api.calculateStats({start:'2026-10-29',end:'2026-10-31'},rows);return r.count===6&&r.totalCents===39050;}));
 check('非完成状态即使有时间也不计入',await page.evaluate(()=>{const api=window.__insights,rows=api.trades.filter(r=>r.status!=='COMPLETED').map(r=>({...r,completedAt:'2026-10-31T00:00:00Z'}));return api.calculateStats({start:'2026-10-29',end:'2026-10-31'},rows).count===0;}));
 check('统计采用历史预约价格而非商品当前价格',await page.evaluate(()=>{const api=window.__insights,rows=api.trades.map(r=>({...r,currentPriceCents:999999}));return api.calculateStats({start:'2026-10-29',end:'2026-10-31'},rows).totalCents===39050;}));
 await setStats('2026-10-29','2026-10-29');check('页面单日查询显示两笔30.50元',await page.locator('#completedCount').innerText()==='2'&&await page.locator('#completedAmount').innerText()==='¥30.50');
 await setStats('2026-10-31','2026-10-29');await capture('51_统计日期范围错误');check('反向日期保留输入并逐项提示',await page.locator('#statsStart').inputValue()==='2026-10-31'&&await page.locator('#statsEnd').inputValue()==='2026-10-29'&&await page.locator('#statsEndError').isVisible());
 check('无效查询保留上次结果并明确区间',await page.locator('#statsNotice').isVisible()&&await page.locator('#appliedStatsRange').innerText()==='2026-10-29 至 2026-10-29'&&await page.locator('#completedAmount').innerText()==='¥30.50');
 await setStats('2026-10-01','2026-10-02');await capture('50_交易统计无完成记录');check('无完成记录时笔数金额均为零',await page.locator('#completedCount').innerText()==='0'&&await page.locator('#completedAmount').innerText()==='¥0.00'&&await page.locator('.stats-zero').isVisible());
 await page.locator('#statsStart').fill('');await page.locator('#statsForm button[type=submit]').click();check('缺起始日期时保留结束日期并提示',await page.locator('#statsStartError').isVisible()&&await page.locator('#statsEnd').inputValue()==='2026-10-02');
 check('不存在的日历日期不能直接查询',await page.evaluate(()=>{try{window.__insights.calculateStats({start:'2026-02-30',end:'2026-03-01'});return false;}catch(e){return e.message==='INVALID_RANGE';}}));
 await reset('logs');await capture('52_管理员操作日志');check('默认查询当天13条日志并分页',await page.locator('#logResultCount').innerText()==='13'&&await page.locator('tbody tr').count()===5);check('提供与类图一致的12种操作类型',await page.locator('#logType option').count()===13);
 check('列表不提供修改删除或写入入口',await page.locator('.page-heading').innerText().then(t=>t.includes('不可修改或删除'))&&await page.locator('button').allTextContents().then(a=>!a.some(t=>/编辑|删除|保存|新增/.test(t))));
 await page.locator('#next').click();check('日志按时间倒序分页',await page.locator('tbody tr').first().innerText().then(t=>t.includes('2026-10-31 10:20:00')));
 await setLogs({operator:'admin_demo',productId:'a5',reservationId:'ar5',type:'BLOCK_PRODUCT'});await capture('53_操作日志组合查询');check('时间操作人商品预约类型同时满足才匹配',await page.locator('#logResultCount').innerText()==='1'&&await page.locator('[data-log=L008]').count()===1);
 await page.locator('[data-log=L008]').click();await capture('54_日志详情_屏蔽联动');check('屏蔽详情分别显示商品和预约前后状态',await page.locator('.transition-table tbody tr').count()===2&&await page.locator('.transition-table').innerText().then(t=>t.includes('已预约')&&t.includes('已屏蔽')&&t.includes('待卖家确认')&&t.includes('已取消')));check('详情显示处理人原因和时间',await page.locator('.log-meta').innerText().then(t=>t.includes('admin_demo')&&t.includes('10:20:00'))&&await page.locator('.log-reason').innerText().then(t=>t.includes('违规内容')));
 check('日志详情仅有关闭按钮无编辑表单',await page.locator('#modal input,#modal textarea,#modal select').count()===0&&await page.locator('#modal button').allTextContents().then(a=>a.every(t=>/✕|关闭/.test(t))));await page.locator('#doneLog').click();check('关闭详情保留组合筛选',await page.locator('#logOperator').inputValue()==='admin_demo'&&await page.locator('#logProduct').inputValue()==='a5'&&await page.locator('#logResultCount').innerText()==='1');
 check('商品与不相关预约编号组合不会误匹配',(await query({operator:'',productId:'A5',reservationId:'AR6',type:'ALL'})).length===0);
 const byName=await query({operator:'admin_demo',productId:'',reservationId:'',type:'ALL'}),byId=await query({operator:'u001',productId:'',reservationId:'',type:'ALL'});check('操作人用户名或编号精确匹配',byName.length===3&&byId.map(r=>r.id).join()===byName.map(r=>r.id).join());
 const matchedReservation=await query({operator:'',productId:'A5',reservationId:'AR5',type:'ALL'});check('恢复为草稿日志不误显示为恢复旧预约',matchedReservation.length===2&&matchedReservation.every(r=>r.type!=='RESTORE_TO_DRAFT'));
 const midnight=await query({start:'2026-10-31T00:00:00',end:'2026-10-31T00:00:00',operator:'',productId:'',reservationId:'',type:'ALL'});check('日志相同起止秒包含零点边界',midnight.length===1&&midnight[0].id==='L001');
 const finalSecond=await query({start:'2026-10-31T23:59:59',end:'2026-10-31T23:59:59',operator:'',productId:'',reservationId:'',type:'ALL'});check('日志包含结束秒且不包含次日零点',finalSecond.length===1&&finalSecond[0].id==='L013');
 await reset('logs');await setLogs({start:'',end:''});check('时间留空可查询全部示例日志',await page.locator('#logResultCount').innerText()==='15');
 await page.evaluate(()=>window.__insights.showLog('L012'));await capture('55_日志详情_交易完成');check('完成日志显示两对象同时完成',await page.locator('.transition-table').innerText().then(t=>(t.match(/已完成/g)||[]).length===2));await page.locator('#doneLog').click();
 await page.evaluate(()=>window.__insights.showLog('L002'));await capture('58_日志详情_商品审核');check('仅商品操作不伪造预约状态',await page.locator('.transition-table tbody tr').count()===1&&await page.locator('.log-meta').innerText().then(t=>t.includes('不涉及预约')));check('无需原因的操作明确说明',await page.locator('.log-reason').innerText().then(t=>t.includes('无需填写原因')));await page.locator('#doneLog').click();
 await reset('logs');await setLogs({start:'2026-11-01T10:00:00',end:'2026-10-31T23:59:59'});await capture('57_日志时间范围错误');check('日志反向时间保留输入且提示',await page.locator('#logEndError').isVisible()&&await page.locator('#logStart').inputValue()==='2026-11-01T10:00');check('日志无效查询明确保留上次有效结果',await page.locator('#logsNotice').isVisible()&&await page.locator('#logResultCount').innerText()==='13');
 await reset('logs');await setLogs({productId:'NOT-FOUND'});await capture('56_日志查询无结果');check('日志空结果保留筛选条件',await page.locator('.empty-log').isVisible()&&await page.locator('#logProduct').inputValue()==='NOT-FOUND');
 const immutable=await page.evaluate(()=>{const api=window.__insights,before=JSON.stringify(api.logs),row=api.logs[0];let threw=false;try{row.reason='改写';}catch{threw=true;}return {same:before===JSON.stringify(api.logs),frozen:Object.isFrozen(api.logs)&&Object.isFrozen(row),secrets:/passwordHash|Demo123!|OnlyInMemory!/.test(before)};});check('日志源记录只读且无法改写原原因',immutable.same&&immutable.frozen);check('日志示例不含密码或密码哈希',!immutable.secrets);
 await page.goto(url+'?user=chen_demo');check('普通用户不能看到统计或日志内容',await page.locator('.denied-card').isVisible()&&await page.locator('#completedCount,tbody tr').count()===0);check('普通用户直接调用两项查询也被拒绝',await page.evaluate(()=>{let count=0;for(const f of [()=>window.__insights.calculateStats({start:'2026-10-29',end:'2026-10-31'}),()=>window.__insights.queryLogs({start:'',end:'',operator:'',productId:'',reservationId:'',type:'ALL'})])try{f();}catch(e){if(e.message==='FORBIDDEN')count++;}return count===2;}));
 await page.goto(url+'?user=reviewer_demo&view=logs');check('其他已授权演示管理员可查询日志',await page.locator('#logResultCount').innerText()==='13');
 await page.goto(pathToFileURL(sourceFolder+'管理员商品管理原型.html').href);await page.locator('#statsNav').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/统计与日志原型.html'));check('商品管理导航已接入交易统计',await page.locator('.page-heading h1').innerText()==='交易统计');await page.locator('#logsNav').click();check('交易统计与操作日志可直接切换',await page.locator('.page-heading h1').innerText()==='操作日志');await page.locator('#allNav').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/管理员商品管理原型.html'));check('可返回管理员全部商品',await page.locator('.page-heading h1').innerText()==='全部商品');await page.locator('#logsNav').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/统计与日志原型.html'));check('商品管理导航可直达日志查询',await page.locator('.page-heading h1').innerText()==='操作日志');
 await page.goto(url+'?guest=1');await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/登录注册原型.html'));check('游客先进入登录',await page.locator('#authForm').isVisible());check('页面无脚本异常',errors.length===0);
 frames.sort((a,b)=>a.name.localeCompare(b.name));fs.writeFileSync(sourceFolder+'统计日志界面图层数据.json',JSON.stringify(frames));fs.writeFileSync(sourceFolder+'统计日志界面.drawio','<mxfile host="app.diagrams.net" agent="local-ui-prototype" version="26.0.0" type="device">'+frames.map((f,i)=>drawioPage(f.name,f.model,i+1)).join('')+'</mxfile>');fs.writeFileSync(sourceFolder+'统计日志交互检查结果.json',JSON.stringify({scope:'本地虚构数据的界面与查询演示，不等同于真实服务端权限、日志持久化或真实交易统计验证',browserTimezone:'America/New_York',checks,pageErrors:errors},null,2));
 const head=title=>'<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:25px;background:#eaf0f7;color:#26354c;font:16px Microsoft YaHei}h1{font-size:23px;margin:0 0 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;border-radius:8px;padding:12px}figcaption{font-size:15px;margin:0 0 9px}img{display:block;width:100%;border:1px solid #e7ebf2;box-sizing:border-box}</style><h1>'+title+'</h1>',overview=frames=>'<div class="grid">'+frames.map(f=>'<figure><figcaption>'+f.name.replace('_',' · ')+'</figcaption><img src="../../../UI界面/'+f.name+'.png"></figure>').join('')+'</div>';
 fs.writeFileSync(sourceFolder+'统计日志总览.html',head('二手集市 · 管理员交易统计与操作日志')+overview(frames));await page.setViewportSize({width:1240,height:590});await page.goto(pathToFileURL(sourceFolder+'统计日志总览.html').href);await page.screenshot({path:previewFolder+'统计日志界面总览.png',fullPage:true});fs.writeFileSync(sourceFolder+'统计日志主要界面.html',head('二手集市 · 交易统计与操作日志查询')+overview(frames.filter(f=>f.name.startsWith('49_')||f.name.startsWith('52_'))));await page.goto(pathToFileURL(sourceFolder+'统计日志主要界面.html').href);await page.screenshot({path:previewFolder+'统计日志主要界面.png',fullPage:true});console.log(JSON.stringify({screens:frames.length,checks:checks.length,allPassed:true,pageErrors:errors}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
