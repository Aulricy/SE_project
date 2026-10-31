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
 const root=sourceFolder+'',url=pathToFileURL(root+'管理员账号设置原型.html').href,password='ApproveDemo!42';
 const check=(name,value)=>{if(!value)throw Error(name);checks.push({name,passed:true});};
 async function capture(name){await page.evaluate(()=>document.activeElement?.blur());await page.evaluate(()=>document.fonts.ready);const model=await modelFromPage(page);fs.writeFileSync(vectorFolder+''+name+'.svg',svgFromModel(model));await page.screenshot({path:folder+name+'.png'});frames.push({name,model});console.log(name);}
 async function newForm(){await page.evaluate(()=>window.__adminAccounts.renderList());await page.locator('#newAdmin').click();}
 async function fill(username,pwd=password,confirm=pwd){await page.locator('#adminUsername').fill(username);await page.locator('#adminPassword').fill(pwd);await page.locator('#adminConfirm').fill(confirm);}
 async function commit(){await page.locator('#confirmApproval').click();await page.waitForFunction(()=>!window.__adminAccounts.state.busy);}
 async function safeGoto(target){await page.evaluate(()=>{if(window.__adminAccounts)window.__adminAccounts.state.dirty=false;});await page.goto(target);}
 await page.goto(url);await capture('59_首个管理员账号列表');check('首个管理员可查看预置及已批准的管理员',await page.locator('tbody tr').count()===2&&await page.locator('#newAdmin').isVisible());
 check('首个管理员由固定账号编号识别',await page.evaluate(()=>window.DemoAccounts.initialAdminId===1&&window.DemoAccounts.isInitialAdmin('admin_demo')&&!window.DemoAccounts.isInitialAdmin('reviewer_demo')));
 await page.locator('#newAdmin').click();await capture('60_批准并设置管理员账号');check('账号身份固定管理员无身份选择框',await page.locator('.fixed-role').innerText().then(t=>t.includes('管理员（固定）'))&&await page.locator('#adminAccountForm select').count()===0);
 await page.locator('#approveAccount').click();check('缺少必填信息逐项提示且未创建账号',await page.locator('#adminUsernameError').isVisible()&&await page.locator('#adminPasswordError').isVisible()&&await page.locator('#adminConfirmError').isVisible()&&await page.evaluate(()=>window.DemoAccounts.listAdmins().length===2));
 await fill('new_admin_demo',password,'NotMatching');await page.locator('#approveAccount').click();await capture('61_管理员设置表单校验');check('确认密码不一致保留用户名和密码',await page.locator('#adminConfirmError').isVisible()&&await page.locator('#adminUsername').inputValue()==='new_admin_demo'&&await page.locator('#adminPassword').inputValue()===password);
 await fill('chen_demo');await page.locator('#approveAccount').click();await capture('62_管理员用户名已占用');check('普通用户名不能重复使用或被直接提升',await page.locator('#adminUsernameError').isVisible()&&await page.evaluate(()=>window.DemoAccounts.find('chen_demo').role==='MEMBER'));
 await fill('admin_demo');await page.locator('#approveAccount').click();check('首个管理员用户名也不能重复创建',await page.locator('#adminUsernameError').isVisible());
 await fill('new_admin_demo');await page.locator('#approveAccount').click();await capture('63_首个管理员批准确认');check('最终批准前尚未创建新账号',await page.evaluate(()=>window.DemoAccounts.find('new_admin_demo')===null));check('确认框只显示用户名权限与批准人不显示密码',await page.locator('#modal').innerText().then(t=>t.includes('new_admin_demo')&&t.includes('首个管理员')&&!t.includes(password))&&await page.locator('#modal input[type=password]').count()===0);
 await page.locator('#cancelApproval').click();check('返回核对保留输入且不批准',await page.locator('#adminPassword').inputValue()===password&&await page.evaluate(()=>window.DemoAccounts.find('new_admin_demo')===null));
 await page.locator('#cancelForm').click();check('未完成填写离开前提示',await page.locator('#keepForm').isVisible());await page.locator('#keepForm').click();check('继续填写保持内容',await page.locator('#adminUsername').inputValue()==='new_admin_demo');
 await page.locator('#approveAccount').click();await commit();await capture('64_新增管理员设置成功');const created=await page.evaluate(()=>window.DemoAccounts.find('new_admin_demo'));check('确认批准后创建唯一管理员身份',created.role==='ADMIN'&&created.id!==1&&await page.evaluate(()=>window.DemoAccounts.listAdmins().length===3));
 check('成功页清除密码表单和待处理密码',await page.locator('input[type=password]').count()===0&&await page.evaluate(()=>window.__adminAccounts.state.pending===null));
 check('演示会话不保存明文密码',await page.evaluate(pwd=>{const raw=sessionStorage.getItem('se-lab2-demo-accounts-v1');const saved=JSON.parse(raw).find(a=>a.username==='new_admin_demo');return !raw.includes(pwd)&&!!saved.hash&&saved.salt.length===16&&!('password' in saved);},password));
 check('新账号凭据可验证且错误密码不能验证',await page.evaluate(async pwd=>await window.DemoAccounts.verify('new_admin_demo',pwd)&&!(await window.DemoAccounts.verify('new_admin_demo','wrong')),password));
 await page.locator('#returnAccounts').click();check('管理员列表展示新增账号并保留首个管理员',await page.locator('tbody tr').count()===3&&await page.locator('tbody').innerText().then(t=>t.includes('new_admin_demo')&&t.includes('admin_demo')));
 await page.reload();check('刷新账号页后本标签页内的新账号仍在',await page.locator('tbody').innerText().then(t=>t.includes('new_admin_demo')));
 await newForm();await fill('new_admin_demo');await page.locator('#approveAccount').click();check('已设置用户名不可重复创建',await page.locator('#adminUsernameError').isVisible()&&await page.evaluate(()=>window.DemoAccounts.listAdmins().length===3));
 await newForm();await fill('late_duplicate');await page.locator('#approveAccount').click();await page.evaluate(pwd=>window.DemoAccounts.createAdmin('admin_demo','late_duplicate',pwd),password);await commit();check('批准期间用户名被占用时拒绝重复并保留表单',await page.locator('#adminUsernameError').isVisible()&&await page.locator('#adminPassword').inputValue()===password&&await page.evaluate(()=>window.DemoAccounts.listAdmins().filter(a=>a.username==='late_duplicate').length===1));
 await newForm();await fill('double_click_admin');await page.locator('#approveAccount').click();await page.evaluate(()=>{document.querySelector('#confirmApproval').click();document.querySelector('#confirmApproval').click();});await page.waitForFunction(()=>!window.__adminAccounts.state.busy);check('连续点击批准只创建一个账号',await page.evaluate(()=>window.DemoAccounts.listAdmins().filter(a=>a.username==='double_click_admin').length===1));
 const race=await page.evaluate(async pwd=>{const result=await Promise.all([window.DemoAccounts.createAdmin('admin_demo','concurrent_demo',pwd),window.DemoAccounts.createAdmin('admin_demo','concurrent_demo',pwd)]);return {success:result.filter(r=>r.ok).length,count:window.DemoAccounts.listAdmins().filter(a=>a.username==='concurrent_demo').length};},password);check('同名并行设置只成功一次',race.success===1&&race.count===1);
 await newForm();await fill('retry_admin');await page.locator('#approveAccount').click();await page.evaluate(()=>{window.__realSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='se-lab2-demo-accounts-v1')throw Error('SIMULATED');return window.__realSetItem.call(this,key,value);};});await commit();check('模拟保存失败不创建半成账号且可重试',await page.locator('#approvalError').isVisible()&&await page.evaluate(()=>window.DemoAccounts.find('retry_admin')===null)&&!(await page.locator('#confirmApproval').isDisabled()));await page.evaluate(()=>{Storage.prototype.setItem=window.__realSetItem;delete window.__realSetItem;});await commit();check('失败后确认重试可以设置成功',await page.evaluate(()=>window.DemoAccounts.find('retry_admin').role==='ADMIN'));
 await safeGoto(pathToFileURL(root+'登录注册原型.html').href+'?username=new_admin_demo');check('统一登录页可预填新增管理员用户名',await page.locator('#username').inputValue()==='new_admin_demo');await page.locator('#password').fill(password);await page.locator('button[type=submit]').click();await page.waitForFunction(()=>!window.__auth.state.busy);await capture('65_新增管理员统一登录成功');check('新增账号在统一入口识别为管理员',await page.evaluate(()=>window.__auth.state.account.username==='new_admin_demo'&&window.__auth.state.account.role==='ADMIN')&&await page.locator('#enterAdmin').isVisible());
 check('跨页面链接不携带密码或凭据哈希',!page.url().includes(password)&&!(await page.locator('#enterAdmin').getAttribute('href')).includes(password));
 await page.locator('#enterAdmin').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/管理员商品管理原型.html'));check('新管理员登录后可进入商品审核',await page.locator('.page-heading h1').innerText()==='商品审核');check('新管理员不显示增设管理员入口',!(await page.locator('#accountsNav').isVisible()));
 await page.locator('#statsNav').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/统计与日志原型.html'));check('新管理员可查询统计并仍无增设入口',await page.locator('#completedCount').innerText()==='6'&&!(await page.locator('#accountsNav').isVisible()));await page.locator('#logsNav').click();check('新管理员可查询操作日志',await page.locator('#logResultCount').innerText()==='13');
 await page.goto(url+'?user=new_admin_demo');await capture('66_非首个管理员无设置权限');check('新增管理员直接访问设置页被拒绝',await page.locator('.account-denied').isVisible()&&await page.locator('#adminAccountForm,#newAdmin').count()===0);const deniedNew=await page.evaluate(pwd=>window.DemoAccounts.createAdmin('new_admin_demo','unauthorized_new',pwd),password);check('新管理员直接调用增设也被拒绝',!deniedNew.ok&&deniedNew.code==='FORBIDDEN'&&await page.evaluate(()=>window.DemoAccounts.find('unauthorized_new')===null));
 await page.goto(url+'?user=reviewer_demo');check('其他已批准管理员也没有增设权限',await page.locator('.account-denied').isVisible()&&!(await page.evaluate(pwd=>window.DemoAccounts.createAdmin('reviewer_demo','another_admin',pwd),password)).ok);
 await page.goto(url+'?user=chen_demo');await capture('67_普通用户无管理员设置权限');check('普通用户不能访问或调用管理员设置',await page.locator('.account-denied').isVisible()&&!(await page.evaluate(pwd=>window.DemoAccounts.createAdmin('chen_demo','member_attack',pwd),password)).ok);
 await page.goto(pathToFileURL(root+'登录注册原型.html').href+'?mode=register&role=ADMIN');await page.locator('#username').fill('ordinary_new');await page.locator('#password').fill(password);await page.locator('#confirm').fill(password);await page.locator('button[type=submit]').click();await page.waitForFunction(()=>!window.__auth.state.busy);check('普通注册不能由URL选择管理员身份',await page.evaluate(()=>window.__auth.state.account.role==='MEMBER'&&window.DemoAccounts.find('ordinary_new').role==='MEMBER'));
 await page.goto(url);await newForm();await fill('ordinary_new');await page.locator('#approveAccount').click();check('跨页面注册过的普通用户名也不能被覆盖',await page.locator('#adminUsernameError').isVisible()&&await page.evaluate(()=>window.DemoAccounts.find('ordinary_new').role==='MEMBER'));
 await page.evaluate(()=>window.__adminAccounts.renderList());await page.locator('#reviewNav').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/管理员商品管理原型.html'));check('首个管理员商品页显示账号管理入口',await page.locator('#accountsNav').isVisible());await page.locator('#accountsNav').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/管理员账号设置原型.html'));check('首个管理员可从后台导航进入账号设置',await page.locator('#newAdmin').isVisible());await page.locator('#statsNav').click();await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/统计与日志原型.html'));check('首个管理员统计页也可进入账号设置',await page.locator('#accountsNav').isVisible());
 await page.goto(url+'?guest=1');await page.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/登录注册原型.html'));check('游客先进入登录页',await page.locator('#authForm').isVisible());
 const fresh=await browser.newPage();await fresh.route('http://**',r=>r.abort());await fresh.route('https://**',r=>r.abort());await fresh.goto(pathToFileURL(root+'登录注册原型.html').href);check('独立新会话不会保留本次新增账号',await fresh.evaluate(()=>window.DemoAccounts.find('new_admin_demo')===null));await fresh.close();
 check('导出图层没有所填演示密码',!JSON.stringify(frames).includes(password)&&!JSON.stringify(frames).includes('NotMatching'));check('页面无脚本异常',errors.length===0);
 frames.sort((a,b)=>a.name.localeCompare(b.name));fs.writeFileSync(sourceFolder+'管理员账号界面图层数据.json',JSON.stringify(frames));fs.writeFileSync(sourceFolder+'管理员账号界面.drawio','<mxfile host="app.diagrams.net" agent="local-ui-prototype" version="26.0.0" type="device">'+frames.map((f,i)=>drawioPage(f.name,f.model,i+1)).join('')+'</mxfile>');fs.writeFileSync(sourceFolder+'管理员账号交互检查结果.json',JSON.stringify({scope:'离线界面、当前标签页演示账号及角色流程；不等同于真实服务端认证、授权或持久化验证',checks,pageErrors:errors},null,2));
 const head=title=>'<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:25px;background:#eaf0f7;color:#26354c;font:16px Microsoft YaHei}h1{font-size:23px;margin:0 0 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;border-radius:8px;padding:12px}figcaption{font-size:15px;margin:0 0 9px}img{display:block;width:100%;border:1px solid #e7ebf2;box-sizing:border-box}</style><h1>'+title+'</h1>',overview=frames=>'<div class="grid">'+frames.map(f=>'<figure><figcaption>'+f.name.replace('_',' · ')+'</figcaption><img src="../../../UI界面/'+f.name+'.png"></figure>').join('')+'</div>';
 fs.writeFileSync(sourceFolder+'管理员账号总览.html',head('二手集市 · 首个管理员批准并设置新增账号')+overview(frames));await page.setViewportSize({width:1240,height:590});await page.goto(pathToFileURL(sourceFolder+'管理员账号总览.html').href);await page.screenshot({path:previewFolder+'管理员账号界面总览.png',fullPage:true});fs.writeFileSync(sourceFolder+'管理员账号主要界面.html',head('二手集市 · 管理员账号列表与授权设置')+overview(frames.filter(f=>f.name.startsWith('59_')||f.name.startsWith('60_'))));await page.goto(pathToFileURL(sourceFolder+'管理员账号主要界面.html').href);await page.screenshot({path:previewFolder+'管理员账号主要界面.png',fullPage:true});console.log(JSON.stringify({screens:frames.length,checks:checks.length,allPassed:true,pageErrors:errors}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
