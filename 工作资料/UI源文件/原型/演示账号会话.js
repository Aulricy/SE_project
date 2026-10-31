(()=>{'use strict';
const KEY='se-lab2-demo-accounts-v1',INITIAL_ADMIN_ID=1;
const base=Object.freeze([
Object.freeze({id:1,username:'admin_demo',role:'ADMIN',createdAt:'2026-10-25 09:00'}),
Object.freeze({id:2,username:'reviewer_demo',role:'ADMIN',createdAt:'2026-10-28 10:00'}),
Object.freeze({id:101,username:'chen_demo',role:'MEMBER',createdAt:'2026-10-25 10:00'})]);
const publicAccount=a=>a?Object.freeze({id:a.id,username:a.username,role:a.role,createdAt:a.createdAt}):null;
function stored(){const raw=sessionStorage.getItem(KEY);if(!raw)return [];const parsed=JSON.parse(raw);if(!Array.isArray(parsed))throw Error('INVALID_STORE');return parsed;}
function all(){return [...base,...stored()];}
function find(username){return publicAccount(all().find(a=>a.username===username));}
function isAdmin(username){return find(username)?.role==='ADMIN';}
function isInitialAdmin(username){const a=find(username);return a?.id===INITIAL_ADMIN_ID&&a.role==='ADMIN';}
async function digest(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(salt),iterations:10000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits)).map(x=>x.toString(16).padStart(2,'0')).join('');}
function time(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());}
async function create(username,password,role,actor){username=String(username||'').trim();if(role==='ADMIN'&&!isInitialAdmin(actor))return {ok:false,code:'FORBIDDEN',message:'仅预置的首个管理员可以批准并设置新增管理员账号。'};if(!username||!password)return {ok:false,code:'REQUIRED',message:'请填写用户名和密码。'};if(all().some(a=>a.username===username))return {ok:false,code:'DUPLICATE',message:'该用户名已被使用，请填写一个新用户名。'};
try{const salt=Array.from(crypto.getRandomValues(new Uint8Array(16))),hash=await digest(password,salt),latest=stored();if([...base,...latest].some(a=>a.username===username))return {ok:false,code:'DUPLICATE',message:'该用户名已被使用，请填写一个新用户名。'};if(role==='ADMIN'&&!isInitialAdmin(actor))return {ok:false,code:'FORBIDDEN',message:'当前账号无权增设管理员。'};const a={id:Math.max(199,...all().map(a=>a.id))+1,username,role,createdAt:time(),salt,hash};sessionStorage.setItem(KEY,JSON.stringify([...latest,a]));return {ok:true,account:publicAccount(a)};}catch{return {ok:false,code:'STORAGE',message:'演示账号未能保存，请使用 Chrome 打开后重试。'};}}
async function verify(username,password){const a=stored().find(a=>a.username===username);return !!a&&a.hash===await digest(password,a.salt);}
const api={initialAdminId:INITIAL_ADMIN_ID,find,isAdmin,isInitialAdmin,listAdmins(){return Object.freeze(all().filter(a=>a.role==='ADMIN').map(publicAccount));},createAdmin(actor,username,password){return create(username,password,'ADMIN',actor);},registerMember(username,password){return create(username,password,'MEMBER',null);},verify};
Object.defineProperty(window,'DemoAccounts',{value:Object.freeze(api),writable:false,configurable:false});
})();
