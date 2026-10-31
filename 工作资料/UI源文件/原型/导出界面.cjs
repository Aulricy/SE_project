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
    const val=el.value||el.placeholder;
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
 const frames=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:2});
  await page.route('http://**',r=>r.abort());await page.route('https://**',r=>r.abort());
  await page.goto(pathToFileURL(sourceFolder+'商品浏览原型.html').href);await page.evaluate(()=>document.fonts.ready);
  async function capture(name){
   const model=await modelFromPage(page);
   const svg=svgFromModel(model);
   fs.writeFileSync(vectorFolder+''+name+'.svg',svg,'utf8');
   await page.screenshot({path:folder+name+'.png'});
   frames.push({name,model});
   console.log(name,'editable elements:',model.length);
  }
  await capture('01_商品列表');
  await page.locator('[data-id="p1"]').click();await capture('02_商品详情');
  await page.locator('#reserve').click();await capture('03_预约确认弹窗');
  await page.locator('#confirmReserve').click();await page.waitForFunction(()=>window.__prototype.state.booking!==null);await capture('04_预约成功');
  await page.evaluate(()=>window.__prototype.reset());
  await page.locator('#keyword').fill('未找到的商品');await page.locator('button[type="submit"]').click();await capture('05_列表无结果');
  await page.evaluate(()=>window.__prototype.renderUnavailable());await capture('06_商品不可用');
  const doc='<mxfile host="app.diagrams.net" agent="local-ui-prototype" version="26.0.0" type="device">'+frames.map((f,i)=>drawioPage(f.name,f.model,i+1)).join('')+'</mxfile>';
  fs.writeFileSync(sourceFolder+'商品浏览界面.drawio',doc,'utf8');
  fs.writeFileSync(sourceFolder+'界面图层数据.json',JSON.stringify(frames),'utf8');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
