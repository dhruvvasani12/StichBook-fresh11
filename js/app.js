(function(){
'use strict';

/* ======================= constants & helpers ======================= */
const FABRIC_PER_UNIT=6, MIN_PHOTOS=2, MAX_PHOTOS=12, MAX_FILE_MB=12, WORKER_EDIT_DAYS=2, PAGE=25;
const KEY='stitchbook.v1';
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const $=(s,el)=>(el||document).querySelector(s);
const $$=(s,el)=>[...(el||document).querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseISO=s=>{const p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])};
const addDays=(s,n)=>{const d=parseISO(s);d.setDate(d.getDate()+n);return iso(d)};
const todayISO=()=>iso(new Date());
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate=s=>{const d=parseISO(s);return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()};
const fmtShort=s=>{const d=parseISO(s);return d.getDate()+' '+MON[d.getMonth()]};
const fmtTs=t=>{const d=new Date(t);return fmtDate(iso(d))+', '+pad(d.getHours())+':'+pad(d.getMinutes())};
const num=n=>Number(n||0).toLocaleString('en-US');
const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
const weekStart=s=>{const d=parseISO(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d)};
const daysBetween=(a,b)=>Math.round((parseISO(b)-parseISO(a))/864e5);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sumBy=(a,f)=>a.reduce((t,r)=>t+(+r[f]||0),0);
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ICONS={
 dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
 entry:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
 records:'<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.3c2.3.7 3.5 2.6 3.5 5.7"/>',
 layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
 chart:'<path d="M5 20V11M12 20V4M19 20v-8"/>',
 shield:'<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
 bell:'<path d="M6 17v-6a6 6 0 1112 0v6l1.5 2h-15L6 17z"/><path d="M10 21h4"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
 camera:'<path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z"/><circle cx="12" cy="13" r="3.5"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 download:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 upload:'<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
 logout:'<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
 edit:'<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1z"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 alert:'<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.5"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'
};
const ico=(n,s)=>'<svg class="ico" width="'+(s||18)+'" height="'+(s||18)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[n]+'</svg>';
const logo=(dark)=>'<div class="logo'+(dark?' dark':'')+'"><svg width="34" height="34" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="24" cy="24" r="21" stroke-opacity=".5"/><path d="M34 7L14 40"/><circle cx="32.6" cy="10.4" r="1.2" fill="currentColor" stroke="none"/><path d="M32.6 10.4C41 17 31 27 23 22.5S6 31 14 40" stroke="#2DC6B8"/></svg><b>Stitch<span>Book</span></b></div>';

/* ======================= storage ======================= */
let db=null;
function save(){const ok=LS.set(KEY,JSON.stringify(db));if(!ok&&!S.warnedStorage){S.warnedStorage=true;toast('Browser storage is full or blocked. Changes will be lost when you close this page.','err')}}
async function hashPw(pw,salt){
  const data=new TextEncoder().encode(salt+':'+pw);
  try{const buf=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  catch(e){let h=2166136261;for(const b of data){h^=b;h=Math.imul(h,16777619)}return 'f'+(h>>>0).toString(16)}
}
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
async function makeSeed(){
  const t=todayISO(),rnd=mulberry(20261025);
  const mk=async(id,name,email,pw,role,status,confirmed,ago)=>({id,name,email,role,status,confirmed,pw:await hashPw(pw,id),created:Date.now()-ago*864e5});
  const users=[
    await mk('u_admin','Anita Desai','admin@stitchbook.app','Admin#2026','admin','active',true,120),
    await mk('u_w1','John Mehta','worker1@stitchbook.app','Worker#2026','worker','active',true,100),
    await mk('u_w2','Priya Shah','worker2@stitchbook.app','Worker#2026','worker','active',true,90),
    await mk('u_w3','Ravi Patel','worker3@stitchbook.app','Worker#2026','worker','active',true,80),
    await mk('u_w4','Meera Joshi','worker4@stitchbook.app','Worker#2026','worker','pending',true,1)
  ];
  const machines={u_w1:['M-101','M-102'],u_w2:['M-201'],u_w3:['M-301','M-302']};
  const records=[];
  for(let i=75;i>=1;i--){
    const d=addDays(t,-i);if(parseISO(d).getDay()===0)continue;
    Object.keys(machines).forEach(w=>{
      if(rnd()>0.9)return;
      const ms=machines[w],work=Math.round(85+rnd()*55),per=Math.round(380+rnd()*40);
      const ts=parseISO(d).getTime()+17*36e5;
      records.push({id:uid(),workerId:w,date:d,machine:ms[Math.floor(rnd()*ms.length)],workCount:work,stitchCount:work*per,fabricLength:work*FABRIC_PER_UNIT,photos:[],notes:'',createdAt:ts,updatedAt:ts,demo:true,key:uid(),edits:[]});
    });
  }
  const now=Date.now();
  return {v:1,users,records,
    audit:[{id:uid(),ts:now,actor:'System',action:'demo_reset',detail:'Sample workspace created with demo accounts and '+records.length+' sample records.'}],
    notifs:[{id:uid(),ts:now-36e5,to:'admins',text:'Meera Joshi registered and is waiting for approval.',readBy:[]}]};
}
async function loadDB(){
  let raw=LS.get(KEY);
  try{const p=raw&&JSON.parse(raw);if(p&&Array.isArray(p.users)&&Array.isArray(p.records)){db=p;db.audit=db.audit||[];db.notifs=db.notifs||[];return}}catch(e){}
  db=await makeSeed();save();
}

/* ======================= photo store (IndexedDB with memory fallback) ======================= */
const PH={map:new Map(),h:null,
  async open(){if(this.h!==null)return this.h;this.h=false;try{this.h=await new Promise((res,rej)=>{const r=indexedDB.open('stitchbook-photos',1);r.onupgradeneeded=()=>r.result.createObjectStore('p');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}catch(e){this.h=false}return this.h},
  async put(id,data){this.map.set(id,data);const d=await this.open();if(!d)return;await new Promise(res=>{try{const tx=d.transaction('p','readwrite');tx.objectStore('p').put(data,id);tx.oncomplete=res;tx.onerror=res;tx.onabort=res}catch(e){res()}})},
  async get(id){if(this.map.has(id))return this.map.get(id);const d=await this.open();if(!d)return null;return new Promise(res=>{try{const r=d.transaction('p').objectStore('p').get(id);r.onsuccess=()=>{if(r.result)this.map.set(id,r.result);res(r.result||null)};r.onerror=()=>res(null)}catch(e){res(null)}})},
  async del(id){this.map.delete(id);const d=await this.open();if(!d)return;await new Promise(res=>{try{const tx=d.transaction('p','readwrite');tx.objectStore('p').delete(id);tx.oncomplete=res;tx.onerror=res;tx.onabort=res}catch(e){res()}})}
};
function hydratePhotos(){
  $$('img[data-photo]').forEach(img=>{
    if(img.getAttribute('src'))return;
    PH.get(img.dataset.photo).then(d=>{if(d)img.src=d;else{img.alt='Photo not available on this device';img.style.display='none'}});
  });
}
function compress(file){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{try{const max=1280;let w=img.naturalWidth,h=img.naturalHeight;const k=Math.min(1,max/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',0.72))}catch(e){rej(e)}};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('unreadable'))};
    img.src=url;
  });
}

/* ======================= state ======================= */
const S={userId:LS.get('sb.session'),view:'dashboard',auth:'signin',authMsg:null,pendingEmail:'',resetEmail:'',
  theme:LS.get('sb.theme'),dash:{days:30,from:'',to:''},trend:'daily',rf:{q:'',worker:'',from:'',to:'',page:1},
  rep:{kind:'weekly',from:'',to:'',worker:''},af:{cat:'',q:'',page:1},wq:'',ph:[],origPhotos:[],entryKey:'',saving:false,charts:{},fails:{},notifOpen:false,editId:null,dlg:null};
const me=()=>db&&db.users.find(u=>u.id===S.userId)||null;
const isAdmin=()=>{const u=me();return !!u&&u.role==='admin'};
const wname=id=>{const u=db.users.find(x=>x.id===id);return u?u.name:'Unknown worker'};
const recById=id=>db.records.find(r=>r.id===id);
function audit(action,detail,actor){const u=me();db.audit.push({id:uid(),ts:Date.now(),actor:actor||(u?u.name:'System'),actorId:u?u.id:null,action,detail})}
function notify(to,text){db.notifs.push({id:uid(),ts:Date.now(),to,text,readBy:[]})}
function myNotifs(){const u=me();return db.notifs.filter(n=>n.to===u.id||(u.role==='admin'&&n.to==='admins')).sort((a,b)=>b.ts-a.ts)}
function requireActive(){
  const u=me();
  if(u&&u.status==='active'&&u.confirmed)return true;
  S.userId=null;LS.del('sb.session');S.auth='signin';
  S.authMsg={type:'err',text:'Your account is no longer active. Contact your admin.'};render();return false;
}

/* ======================= toast / modal ======================= */
function toast(text,type){
  const el=document.createElement('div');el.className='toast '+(type||'ok');el.setAttribute('role',type==='err'?'alert':'status');
  el.innerHTML=ico(type==='err'?'alert':'check',18)+'<span>'+esc(text)+'</span>';
  $('#toasts').appendChild(el);setTimeout(()=>el.remove(),type==='err'?6500:3800);
}
function openModal(html,o){
  o=o||{};const r=$('#modal');
  r.innerHTML='<div class="scrim" data-act="close-modal"></div><div class="sheet'+(o.wide?' wide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(o.label||'Dialog')+'" tabindex="-1">'+html+'</div>';
  r.hidden=false;S.lastFocus=document.activeElement;document.body.classList.add('noscroll');
  const sh=$('.sheet',r);sh.focus();hydratePhotos();
}
function closeModal(result){
  const r=$('#modal');r.hidden=true;r.innerHTML='';document.body.classList.remove('noscroll');
  if(S.dlg){const f=S.dlg;S.dlg=null;f(!!result)}
  if(S.lastFocus&&S.lastFocus.focus&&document.contains(S.lastFocus))S.lastFocus.focus();
}
function confirmDlg(o){
  return new Promise(res=>{
    S.dlg=res;
    openModal('<div class="sheet-h"><h2>'+esc(o.title)+'</h2></div><p>'+o.body+'</p><div class="sheet-f"><button class="btn" data-act="dlg-cancel">Cancel</button><button class="btn '+(o.danger?'danger solid':'primary')+'" data-act="dlg-ok">'+esc(o.ok||'Confirm')+'</button></div>',{label:o.title});
  });
}
function openLightbox(id){
  const r=$('#lightbox');r.innerHTML='<button class="iconbtn" data-act="close-lightbox" aria-label="Close photo">'+ico('x',20)+'</button><img data-photo="'+esc(id)+'" alt="Production photo, enlarged">';
  r.hidden=false;hydratePhotos();
}

/* ======================= form helpers ======================= */
function fld(o){
  const name=o.name||o.id,attrs=(o.ac?' autocomplete="'+o.ac+'"':'')+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+(o.max!=null?' max="'+o.max+'"':'')+(o.min!=null?' min="'+o.min+'"':'')+(o.ml?' maxlength="'+o.ml+'"':'')+(o.im?' inputmode="'+o.im+'"':'')+(o.list?' list="'+o.list+'"':'')+(o.ro?' readonly':'')+(o.extra?' '+o.extra:'');
  const val=' value="'+esc(o.value==null?'':o.value)+'"';
  const label='<label for="'+o.id+'">'+esc(o.label)+(o.req===false?'<span class="opt">optional</span>':'')+'</label>';
  let ctl;
  if(o.type==='password')ctl='<div class="pw"><input class="input" id="'+o.id+'" name="'+name+'" type="password"'+attrs+val+'><button type="button" class="pwt" data-act="toggle-pw" data-for="'+o.id+'" aria-label="Show password">'+ico('eye',16)+'</button></div>';
  else if(o.type==='textarea')ctl='<textarea class="textarea" id="'+o.id+'" name="'+name+'"'+attrs+'>'+esc(o.value||'')+'</textarea>';
  else ctl='<input class="input'+(o.cls?' '+o.cls:'')+'" id="'+o.id+'" name="'+name+'" type="'+(o.type||'text')+'"'+attrs+val+'>';
  return '<div class="field">'+label+ctl+(o.hint?'<div class="hint">'+o.hint+'</div>':'')+'<div class="ferr" data-err="'+name+'" role="alert"></div></div>';
}
function setErrors(form,errs){
  $$('[data-err]',form).forEach(e=>e.textContent='');
  $$('[aria-invalid]',form).forEach(e=>e.removeAttribute('aria-invalid'));
  const keys=Object.keys(errs);
  keys.forEach(k=>{const e=$('[data-err="'+k+'"]',form);if(e)e.textContent=errs[k];const i=$('[name="'+k+'"]',form);if(i)i.setAttribute('aria-invalid','true')});
  if(keys.length){const i=$('[name="'+keys[0]+'"]',form);if(i&&i.focus)i.focus()}
  return keys.length>0;
}
function busy(f,on){const b=$('button[type="submit"]',f);if(b){b.disabled=on;b.classList.toggle('busy',on)}}
function showMsg(id,type,text){const el=$('#'+id);if(!el)return;el.className='msg '+type;el.innerHTML=ico(type==='ok'?'check':'alert',16)+'<span>'+esc(text)+'</span>';el.hidden=false}
function pwScore(p){let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p)&&/[^A-Za-z0-9]/.test(p))s++;return Math.min(s,4)}
function pwProblem(p){if(p.length<8)return 'Use at least 8 characters.';if(!/[A-Za-z]/.test(p)||!/\d/.test(p))return 'Include at least one letter and one number.';return ''}

/* ======================= auth views ======================= */
function authView(){
  const v=S.auth,m=S.authMsg;S.authMsg=null;
  const msg='<div class="msg '+(m?m.type:'err')+'" id="authMsg" role="alert"'+(m?'':' hidden')+'>'+(m?ico(m.type==='ok'?'check':'alert',16)+'<span>'+esc(m.text)+'</span>':'')+'</div>';
  let body='';
  if(v==='signin'){
    body='<div><h1>Sign in</h1><p class="lead" style="margin-top:6px">Welcome back! Please sign in to your account.</p></div>'+msg+
    '<form class="form" data-form="signin" novalidate>'+fld({id:'si_email',name:'email',label:'Email address',type:'email',ph:'you@company.com',ac:'username'})+fld({id:'si_pw',name:'password',label:'Password',type:'password',ph:'Enter your password',ac:'current-password'})+
    '<div class="split"><span></span><button type="button" class="link" data-act="go-auth" data-to="forgot">Forgot password?</button></div><button class="btn primary block" type="submit">Sign in</button></form>'+
    '<p class="center muted" style="text-align:center">Don\'t have an account? <button class="link" data-act="go-auth" data-to="register">Register</button></p>'+
    '<details class="demo"><summary>Demo accounts</summary><div class="demo-list">'+
    [['Admin','admin@stitchbook.app','Admin#2026'],['Worker (John Mehta)','worker1@stitchbook.app','Worker#2026'],['Worker (Priya Shah)','worker2@stitchbook.app','Worker#2026']].map(a=>'<button type="button" data-act="demo-fill" data-email="'+a[1]+'" data-pw="'+a[2]+'"><span><b>'+a[0]+'</b><br><span class="muted mono">'+a[1]+'</span></span><span class="pill acc">Use</span></button>').join('')+
    '</div><p class="note-demo" style="margin-top:8px">Sample data lives in this browser only. Nothing is sent anywhere.</p></details>';
  }else if(v==='register'){
    body='<div><h1>Create account</h1><p class="lead" style="margin-top:6px">Register as a worker. An admin must activate your account before you can sign in.</p></div>'+msg+
    '<form class="form" data-form="register" novalidate>'+fld({id:'rg_name',name:'fullname',label:'Full name',ph:'Your name',ac:'name',ml:60})+fld({id:'rg_email',name:'email',label:'Email address',type:'email',ph:'you@company.com',ac:'email'})+
    fld({id:'rg_pw',name:'password',label:'Password',type:'password',ac:'new-password',hint:'At least 8 characters with a letter and a number.'})+'<div class="meter" id="pwMeter" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'+
    fld({id:'rg_pw2',name:'password2',label:'Confirm password',type:'password',ac:'new-password'})+'<button class="btn primary block" type="submit">Register</button></form>'+
    '<p style="text-align:center" class="muted">Already registered? <button class="link" data-act="go-auth" data-to="signin">Sign in</button></p>';
  }else if(v==='confirm'){
    body='<div class="center-note"><div class="bigmark">'+ico('mail',30)+'</div><h1>Confirm your email</h1><p class="lead">We sent a confirmation link to <b>'+esc(S.pendingEmail)+'</b>. Open it to verify your address.</p></div>'+msg+
    '<button class="btn primary block" data-act="confirm-email">Open confirmation link (demo)</button><p class="note-demo" style="text-align:center">In the live app this link arrives by email. Here the button stands in for it.</p><p style="text-align:center"><button class="link" data-act="go-auth" data-to="signin">Back to sign in</button></p>';
  }else if(v==='pending'){
    body='<div class="center-note"><div class="bigmark">'+ico('shield',30)+'</div><h1>Waiting for approval</h1><p class="lead">Your email is confirmed. An admin will activate your account soon. You can sign in as soon as that happens.</p></div><button class="btn primary block" data-act="go-auth" data-to="signin">Back to sign in</button>';
  }else if(v==='forgot'){
    body='<div><h1>Reset password</h1><p class="lead" style="margin-top:6px">Enter your email and we will send you a reset link.</p></div>'+msg+
    '<form class="form" data-form="forgot" novalidate>'+fld({id:'fg_email',name:'email',label:'Email address',type:'email',ph:'you@company.com',ac:'email'})+'<button class="btn primary block" type="submit">Send reset link</button></form>'+
    (S.resetEmail?'<button class="btn block" data-act="open-reset">Open reset link (demo)</button><p class="note-demo" style="text-align:center">In the live app this link arrives by email.</p>':'')+
    '<p style="text-align:center"><button class="link" data-act="go-auth" data-to="signin">Back to sign in</button></p>';
  }else if(v==='reset'){
    body='<div><h1>Choose a new password</h1><p class="lead" style="margin-top:6px">for <b>'+esc(S.resetEmail)+'</b></p></div>'+msg+
    '<form class="form" data-form="reset" novalidate>'+fld({id:'rs_pw',name:'password',label:'New password',type:'password',ac:'new-password',hint:'At least 8 characters with a letter and a number.'})+'<div class="meter" id="pwMeter" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'+fld({id:'rs_pw2',name:'password2',label:'Confirm new password',type:'password',ac:'new-password'})+'<button class="btn primary block" type="submit">Save password</button></form>';
  }
  return '<div class="auth"><section class="auth-card"><div class="inner">'+logo(true)+body+'</div></section>'+
  '<aside class="auth-art"><div>'+logo(false)+'</div><div style="display:flex;flex-direction:column;gap:14px;position:relative;z-index:1"><h2>Your work. Your records. All in one place.</h2><p>Log daily production, attach photos, and see fabric length calculated for you. Admins review, correct and report.</p></div><div class="tri"><span>Secure</span><span>Simple</span><span>Professional</span></div>'+
  '<svg class="stitch" viewBox="0 0 600 120" fill="none" aria-hidden="true"><path d="M0 90C80 20 160 120 260 60S440 10 600 70" stroke="#2DC6B8" stroke-width="3" stroke-dasharray="14 12" stroke-linecap="round"/></svg></aside></div>';
}

const forms={};
forms.signin=async f=>{
  const v=Object.fromEntries(new FormData(f)),email=(v.email||'').trim().toLowerCase(),pw=v.password||'';
  const errs={};if(!EMAIL_RE.test(email))errs.email='Enter a valid email address.';if(!pw)errs.password='Enter your password.';
  if(setErrors(f,errs))return;
  busy(f,true);await sleep(350);
  const fl=S.fails[email]||{n:0,t:0};
  if(fl.n>=5&&Date.now()-fl.t<120000){busy(f,false);return showMsg('authMsg','err','Too many attempts. Wait two minutes, then try again.')}
  const u=db.users.find(x=>x.email===email);
  const ok=u&&(await hashPw(pw,u.id))===u.pw;
  if(!ok){S.fails[email]={n:(fl.n>=5?0:fl.n)+1,t:Date.now()};audit('signin_failed','Failed sign-in attempt for '+email,email);save();busy(f,false);return showMsg('authMsg','err','Email or password is incorrect.')}
  if(!u.confirmed){S.pendingEmail=u.email;S.auth='confirm';return render()}
  if(u.status==='pending'){busy(f,false);return showMsg('authMsg','warn','Your account is waiting for admin approval. You can sign in once it is activated.')}
  if(u.status!=='active'){busy(f,false);audit('signin_blocked','Blocked sign-in for deactivated account '+u.email,u.name);save();return showMsg('authMsg','err','This account has been deactivated. Contact your admin.')}
  delete S.fails[email];S.userId=u.id;LS.set('sb.session',u.id);S.view='dashboard';S.rf={q:'',worker:'',from:'',to:'',page:1};
  audit('signin','Signed in',u.name);save();render();
};
forms.register=async f=>{
  const v=Object.fromEntries(new FormData(f)),name=(v.fullname||'').trim().replace(/\s+/g,' '),email=(v.email||'').trim().toLowerCase();
  const errs={};
  if(name.length<2)errs.fullname='Enter your full name.';
  if(!EMAIL_RE.test(email))errs.email='Enter a valid email address.';
  else if(db.users.some(u=>u.email===email))errs.email='An account with this email already exists. Sign in or reset your password.';
  const pp=pwProblem(v.password||'');if(pp)errs.password=pp;
  if(v.password!==v.password2)errs.password2='Passwords do not match.';
  if(setErrors(f,errs))return;
  busy(f,true);await sleep(350);
  const id='u_'+uid();
  db.users.push({id,name,email,role:'worker',status:'pending',confirmed:false,pw:await hashPw(v.password,id),created:Date.now()});
  audit('register','New worker registration: '+name+' ('+email+')',name);save();
  S.pendingEmail=email;S.auth='confirm';render();
};
forms.forgot=async f=>{
  const email=(new FormData(f).get('email')||'').trim().toLowerCase();
  if(setErrors(f,EMAIL_RE.test(email)?{}:{email:'Enter a valid email address.'}))return;
  busy(f,true);await sleep(350);busy(f,false);
  const u=db.users.find(x=>x.email===email);
  S.resetEmail=u?email:'';
  S.authMsg={type:'ok',text:'If an account exists for that address, a reset link is on its way.'};
  if(!u)S.resetEmail='';
  S.auth='forgot';render();
  if(!u){/* same message either way, so the form never reveals which emails are registered */}
};
forms.reset=async f=>{
  const v=Object.fromEntries(new FormData(f)),errs={},pp=pwProblem(v.password||'');
  if(pp)errs.password=pp;if(v.password!==v.password2)errs.password2='Passwords do not match.';
  if(setErrors(f,errs))return;
  busy(f,true);const u=db.users.find(x=>x.email===S.resetEmail);
  if(u){u.pw=await hashPw(v.password,u.id);audit('password_reset','Password reset by link for '+u.email,u.name);save()}
  S.resetEmail='';S.auth='signin';S.authMsg={type:'ok',text:'Password updated. Sign in with your new password.'};render();
};

/* ======================= shell ======================= */
const TITLES={dashboard:'Dashboard',entry:'Daily entry',records:'My records',profile:'Profile',workers:'Workers',production:'Production',reports:'Reports',audit:'Audit log',settings:'Settings'};
function shell(u){
  const admin=u.role==='admin';
  const nav=admin?[['dashboard','dashboard'],['workers','users'],['production','layers'],['reports','chart'],['audit','shield'],['settings','gear'],['profile','user']]:[['dashboard','dashboard'],['entry','entry'],['records','records'],['profile','user']];
  const pend=db.users.filter(x=>x.status==='pending').length;
  const unread=myNotifs().filter(n=>!n.readBy.includes(u.id)).length;
  const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
  let view='';
  try{view=({dashboard:admin?adminDash:workerDash,entry:entryView,records:()=>recordsView('mine'),production:()=>recordsView('all'),workers:workersView,reports:reportsView,audit:auditView,settings:settingsView,profile:profileView})[S.view]()}catch(e){console.error(e);view='<div class="card"><div class="empty">Something went wrong showing this page. Try another page or reload.</div></div>'}
  const sub=S.view==='dashboard'?(admin?'Production overview':'Welcome back, '+esc(u.name.split(' ')[0])+'. Here\'s your production overview.'):'';
  return '<div class="shell"><aside class="side">'+logo(false)+'<nav class="nav" aria-label="Main">'+nav.map(n=>'<button data-act="nav" data-view="'+n[0]+'"'+(S.view===n[0]?' aria-current="page"':'')+'>'+ico(n[1],20)+'<span>'+TITLES[n[0]]+'</span>'+(n[0]==='workers'&&pend?'<span class="badge" aria-label="'+pend+' waiting">'+pend+'</span>':'')+'</button>').join('')+'</nav>'+
  '<div class="side-foot"><div class="who"><div class="avatar" aria-hidden="true">'+esc(initials(u.name))+'</div><div><strong>'+esc(u.name)+'</strong><span style="text-transform:capitalize">'+u.role+'</span></div></div><button class="btn sm" data-act="signout">'+ico('logout',16)+' Sign out</button></div></aside>'+
  '<main class="main"><header class="top"><div style="min-width:0"><div class="top-brand" style="margin-bottom:8px">'+logo(true)+'</div><h1>'+(S.view==='dashboard'&&!admin?'Welcome back, '+esc(u.name.split(' ')[0]):TITLES[S.view])+'</h1>'+(sub?'<p class="sub">'+(admin?fmtDate(todayISO())+' · Production overview':'Here\'s your production overview.')+'</p>':'')+'</div>'+
  '<div class="top-actions"><button class="iconbtn" data-act="bell" aria-label="Notifications" aria-expanded="'+S.notifOpen+'">'+ico('bell',19)+(unread?'<span class="dot"></span>':'')+'</button><button class="iconbtn" data-act="theme" aria-label="Switch to '+(dark?'light':'dark')+' mode">'+ico(dark?'sun':'moon',19)+'</button><button class="iconbtn" data-act="signout" aria-label="Sign out" title="Sign out" style="display:none" id="mobSignout">'+ico('logout',19)+'</button>'+(S.notifOpen?notifPop(u):'')+'</div></header>'+view+'</main></div>';
}
function notifPop(u){
  const list=myNotifs().slice(0,8);
  return '<div class="pop" role="dialog" aria-label="Notifications"><header>Notifications <button class="btn sm ghost" data-act="mark-read">Mark all read</button></header>'+(list.length?'<ul>'+list.map(n=>'<li class="'+(n.readBy.includes(u.id)?'':'unread')+'"><div>'+esc(n.text)+'<small>'+fmtTs(n.ts)+'</small></div></li>').join('')+'</ul>':'<div class="empty">You\'re all caught up.</div>')+'</div>';
}

/* ======================= charts ======================= */
function niceMax(v){if(v<=0)return 10;const p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
const compact=n=>n>=1e6?(n/1e6).toFixed(n%1e6?1:0)+'M':n>=1e4?Math.round(n/1e3)+'k':n>=1e3?(n/1e3).toFixed(n%1e3?1:0)+'k':String(Math.round(n*10)/10);
function chartSVG(spec,w){
  const items=spec.items,n=items.length,H=Math.round(Math.max(190,Math.min(260,w*0.46)));
  const m={l:44,r:12,t:14,b:30},iw=Math.max(60,w-m.l-m.r),ih=H-m.t-m.b;
  const max=niceMax(Math.max.apply(null,items.map(i=>i.value).concat([0]))),T=4;
  let g='';
  for(let i=0;i<=T;i++){const y=m.t+ih-ih*i/T;g+='<line class="gl" x1="'+m.l+'" x2="'+(w-m.r)+'" y1="'+y+'" y2="'+y+'"/><text class="tk" x="'+(m.l-8)+'" y="'+(y+4)+'" text-anchor="end">'+compact(max*i/T)+'</text>'}
  const step=Math.ceil(n/Math.max(1,Math.floor(iw/62)));
  const lab=(x,i)=>((n-1-i)%step===0)?'<text class="tk" x="'+x+'" y="'+(H-8)+'" text-anchor="middle">'+esc(items[i].label)+'</text>':'';
  let body='';
  if(spec.type==='bar'){
    const band=iw/n,bw=Math.max(2,Math.min(44,band*0.66));
    items.forEach((it,i)=>{const h=ih*it.value/max,x=m.l+band*i+(band-bw)/2;body+='<rect class="bar" x="'+x.toFixed(1)+'" y="'+(m.t+ih-h).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(h,it.value>0?1.5:0).toFixed(1)+'" rx="2"><title>'+esc(it.title||it.label)+'</title></rect>'+lab(m.l+band*i+band/2,i)});
  }else{
    const px=i=>n===1?m.l+iw/2:m.l+iw*i/(n-1),py=v=>m.t+ih-ih*v/max;
    const pts=items.map((it,i)=>px(i).toFixed(1)+','+py(it.value).toFixed(1));
    body+='<path class="ar" d="M'+px(0).toFixed(1)+','+(m.t+ih)+' L'+pts.join(' L')+' L'+px(n-1).toFixed(1)+','+(m.t+ih)+' Z"/><polyline class="ln" points="'+pts.join(' ')+'"/>';
    items.forEach((it,i)=>{body+=lab(px(i),i)});
    const l=n-1;body+='<circle class="pt" cx="'+px(l).toFixed(1)+'" cy="'+py(items[l].value).toFixed(1)+'" r="5"><title>'+esc(items[l].title||items[l].label)+'</title></circle>';
    items.forEach((it,i)=>{if(i<l)body+='<circle cx="'+px(i).toFixed(1)+'" cy="'+py(it.value).toFixed(1)+'" r="9" fill="transparent"><title>'+esc(it.title||it.label)+'</title></circle>'});
  }
  return '<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="'+esc(spec.label||'Chart')+'">'+g+body+'</svg>';
}
function chartBox(id,spec){
  S.charts[id]=spec;
  if(!spec.items.some(i=>i.value>0))return '<div class="empty">'+ico('chart',26)+'<span>No production recorded in this period.</span></div>';
  return '<div class="chart" data-chart="'+id+'"></div>';
}
function drawCharts(){$$('[data-chart]').forEach(el=>{const sp=S.charts[el.dataset.chart];if(!sp)return;const w=Math.round(el.clientWidth)||600;el.innerHTML=chartSVG(sp,w)})}

/* ======================= periods & aggregation ======================= */
function periods(kind,from,to){
  const out=[];let cur=kind==='daily'?from:kind==='weekly'?weekStart(from):from.slice(0,7)+'-01',g=0;
  while(cur<=to&&g++<800){
    let end,label,short;
    if(kind==='daily'){end=cur;label=fmtDate(cur);short=fmtShort(cur)}
    else if(kind==='weekly'){end=addDays(cur,6);label='Week of '+fmtDate(cur);short=fmtShort(cur)}
    else{const d=parseISO(cur);end=addDays(iso(new Date(d.getFullYear(),d.getMonth()+1,1)),-1);label=MON[d.getMonth()]+' '+d.getFullYear();short=MON[d.getMonth()]+' '+String(d.getFullYear()).slice(2)}
    out.push({start:cur,end,label,short});cur=addDays(end,1);
  }
  return out;
}
function groupRecs(recs,kind,from,to){
  return periods(kind,from,to).map(p=>{const rs=recs.filter(r=>r.date>=p.start&&r.date<=p.end&&r.date>=from&&r.date<=to);return Object.assign({},p,{recs:rs,work:sumBy(rs,'workCount'),stitches:sumBy(rs,'stitchCount'),fabric:sumBy(rs,'fabricLength'),workers:new Set(rs.map(r=>r.workerId)).size})});
}
const tile=(k,v,s,unit,extra)=>'<div class="tile"'+(extra||'')+'><span class="k">'+k+'</span><span class="v">'+v+(unit?'<small>'+unit+'</small>':'')+'</span>'+(s?'<span class="s">'+s+'</span>':'')+'</div>';

/* ======================= dashboards ======================= */
function workerDash(){
  const u=me(),mine=db.records.filter(r=>r.workerId===u.id),t=todayISO(),td=mine.filter(r=>r.date===t);
  const monthRecs=mine.filter(r=>r.date.slice(0,7)===t.slice(0,7));
  const banner=td.length?'<div class="banner done"><div><strong>Today\'s work is submitted</strong>'+num(sumBy(td,'workCount'))+' units logged. You can correct it from My records.</div><button class="btn" data-act="nav" data-view="records">View records</button></div>'
    :'<div class="banner todo"><div><strong>No entry for today yet</strong>Log today\'s production before you leave.</div><button class="btn primary" data-act="nav" data-view="entry">'+ico('entry',16)+' Add today\'s work</button></div>';
  const items=trendItems(mine,S.trend);
  const recent=mine.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,5);
  return banner+'<div class="tiles">'+tile('Today\'s work',num(sumBy(td,'workCount')),'units submitted')+tile('Total stitch count',num(sumBy(td,'stitchCount')),'today')+tile('Fabric length',num(sumBy(td,'fabricLength')),'today, work × '+FABRIC_PER_UNIT+' m','m')+tile('Records this month',num(monthRecs.length),num(sumBy(monthRecs,'workCount'))+' units in '+MON[parseISO(t).getMonth()])+'</div>'+
  '<section class="card"><div class="card-h"><h2>Production trend</h2><div class="seg" role="group" aria-label="Trend period">'+['daily','weekly','monthly'].map(m=>'<button data-act="trend" data-mode="'+m+'" aria-pressed="'+(S.trend===m)+'">'+m[0].toUpperCase()+m.slice(1)+'</button>').join('')+'</div></div>'+chartBox('wtrend',{type:'line',items,label:'Work count over time'})+'</section>'+
  '<section class="card"><div class="card-h"><h2>Recent records</h2><button class="btn sm" data-act="nav" data-view="records">See all</button></div>'+(recent.length?'<div class="tw"><table class="stack"><thead><tr><th>Date</th><th>Machine</th><th class="num">Work</th><th class="num">Fabric</th><th></th></tr></thead><tbody>'+recent.map(r=>'<tr><td data-l="Date">'+fmtDate(r.date)+'</td><td data-l="Machine"><span class="mono">'+esc(r.machine)+'</span></td><td data-l="Work" class="num">'+num(r.workCount)+'</td><td data-l="Fabric" class="num">'+num(r.fabricLength)+' m</td><td class="act"><button class="btn sm ghost" data-act="view-record" data-id="'+r.id+'">View</button></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No records yet. Your first entry will show up here.</div>')+'</section>';
}
function trendItems(recs,mode){
  const t=todayISO(),items=[];
  if(mode==='daily'){for(let i=13;i>=0;i--){const d=addDays(t,-i);items.push({label:fmtShort(d),title:fmtDate(d),value:sumBy(recs.filter(r=>r.date===d),'workCount')})}}
  else if(mode==='weekly'){const ws=weekStart(t);for(let i=9;i>=0;i--){const d=addDays(ws,-7*i),e=addDays(d,6);items.push({label:fmtShort(d),title:'Week of '+fmtDate(d),value:sumBy(recs.filter(r=>r.date>=d&&r.date<=e),'workCount')})}}
  else{const d0=parseISO(t);for(let i=5;i>=0;i--){const d=new Date(d0.getFullYear(),d0.getMonth()-i,1),k=iso(d).slice(0,7);items.push({label:MON[d.getMonth()]+' '+String(d.getFullYear()).slice(2),title:MON[d.getMonth()]+' '+d.getFullYear(),value:sumBy(recs.filter(r=>r.date.slice(0,7)===k),'workCount')})}}
  items.forEach(i=>i.title+': '+num(i.value)+' units');items.forEach(i=>{i.title=i.title+': '+num(i.value)+' units'});
  return items;
}
function adminDash(){
  const t=todayISO(),d=S.dash;if(!d.to){d.to=t;d.from=addDays(t,-(d.days-1))}
  if(d.from>d.to){const x=d.from;d.from=d.to;d.to=x}
  const recs=db.records.filter(r=>r.date>=d.from&&r.date<=d.to),workers=db.users.filter(u=>u.role==='worker'&&u.status==='active');
  const span=daysBetween(d.from,d.to)+1,kind=span<=31?'daily':span<=190?'weekly':'monthly';
  const grp=groupRecs(db.records,kind,d.from,d.to).map(p=>({label:p.short,title:p.label+': '+num(p.work)+' units',value:p.work}));
  const todayRecs=db.records.filter(r=>r.date===t),done=new Set(todayRecs.map(r=>r.workerId));
  const byW=workers.map(w=>({w,work:sumBy(recs.filter(r=>r.workerId===w.id),'workCount')})).sort((a,b)=>b.work-a.work);
  const topMax=Math.max(1,...byW.map(x=>x.work));
  const pend=db.users.filter(u=>u.status==='pending').length;
  return '<section class="card"><div class="card-h"><h2>Production overview</h2><div class="seg" role="group" aria-label="Date range">'+[7,30,90].map(n=>'<button data-act="dash-days" data-days="'+n+'" aria-pressed="'+(span===n)+'">'+n+' days</button>').join('')+'</div></div>'+
  '<div class="row2" style="max-width:420px"><div class="field"><label for="d_from">From</label><input class="input" type="date" id="d_from" data-chg="dash-from" value="'+d.from+'" max="'+t+'"></div><div class="field"><label for="d_to">To</label><input class="input" type="date" id="d_to" data-chg="dash-to" value="'+d.to+'" max="'+t+'"></div></div></section>'+
  '<div class="tiles">'+tile('Total work',num(sumBy(recs,'workCount')),fmtShort(d.from)+' to '+fmtShort(d.to))+tile('Stitch count',num(sumBy(recs,'stitchCount')),'all workers')+tile('Fabric length',num(sumBy(recs,'fabricLength')),'work × '+FABRIC_PER_UNIT+' m','m')+tile('Records',num(recs.length),'submitted in range')+'</div>'+
  '<div class="grid2"><section class="card"><div class="card-h"><h2>'+(kind==='daily'?'Daily':kind==='weekly'?'Weekly':'Monthly')+' production</h2><button class="btn sm" data-act="nav" data-view="reports">Open reports</button></div>'+chartBox('abar',{type:'bar',items:grp,label:'Work count per '+kind.replace('ly','').replace('dai','day')+' in range'})+'</section>'+
  '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><section class="card"><div class="card-h"><h2>Today</h2><span class="pill '+(done.size===workers.length&&workers.length?'good':'warn')+'">'+done.size+' of '+workers.length+' submitted</span></div><ul class="status-list">'+(workers.length?workers.map(w=>'<li><span>'+esc(w.name)+'</span>'+(done.has(w.id)?'<span class="pill good">'+ico('check',12)+' Submitted</span>':'<span class="pill">Not yet</span>')+'</li>').join(''):'<li class="muted">No active workers.</li>')+'</ul></section>'+
  (pend?'<button class="tile link-tile" data-act="nav" data-view="workers"><span class="k">Needs your approval</span><span class="v">'+pend+'</span><span class="s">Worker account'+(pend>1?'s':'')+' waiting to be activated</span></button>':'')+
  '<section class="card"><h2 style="margin-bottom:14px">Top workers</h2>'+(byW.length?byW.map(x=>'<div class="meterrow"><span>'+esc(x.w.name)+'</span><b class="num">'+num(x.work)+'</b><div class="bar"><i style="width:'+Math.round(x.work/topMax*100)+'%"></i></div></div>').join(''):'<p class="muted">No data yet.</p>')+'</section></div></div>';
}

/* ======================= entry / edit form ======================= */
function machineList(){const u=me();const s=new Set(db.records.filter(r=>u.role==='admin'||r.workerId===u.id).map(r=>r.machine));return [...s].sort()}
function photoGridHTML(){
  return S.ph.map((p,i)=>'<div class="thumb"><img '+(p.data?'src="'+p.data+'"':'data-photo="'+esc(p.id)+'"')+' alt="Photo '+(i+1)+'" data-act="zoom" data-i="'+i+'"><button type="button" class="rm" data-act="rm-photo" data-i="'+i+'" aria-label="Remove photo '+(i+1)+'">'+ico('x',14)+'</button></div>').join('');
}
function photoCountText(){const n=S.ph.length;return n+' of '+MAX_PHOTOS+' photos · minimum '+MIN_PHOTOS}
function refreshPhotos(){const g=$('#photoGrid');if(!g)return;g.innerHTML=photoGridHTML();const c=$('#photoCount');c.textContent=photoCountText();c.classList.toggle('pcount',true);c.classList.toggle('ok',S.ph.length>=MIN_PHOTOS);hydratePhotos()}
function recForm(rec){
  const u=me(),admin=u.role==='admin',edit=!!rec,t=todayISO();
  const mins=admin||edit?'':addDays(t,-WORKER_EDIT_DAYS);
  const datalist='<datalist id="machines">'+machineList().map(m=>'<option value="'+esc(m)+'">').join('')+'</datalist>';
  return '<form class="form" data-form="record-save" novalidate>'+(edit?'<input type="hidden" name="id" value="'+rec.id+'">':'')+datalist+
  '<div class="row2">'+fld({id:'f_date',name:'date',label:'Date',type:'date',value:rec?rec.date:t,max:t,min:(admin&&edit)?null:(edit?null:mins),ro:edit&&!admin,hint:edit&&!admin?'The date cannot be changed. Ask an admin if it is wrong.':''})+
  fld({id:'f_machine',name:'machine',label:'Machine number',value:rec?rec.machine:'',ph:'e.g. M-101',list:'machines',ml:20,ac:'off'})+'</div>'+
  '<div class="row2">'+fld({id:'f_work',name:'work',label:'Work count',type:'number',value:rec?rec.workCount:'',ph:'e.g. 100',min:1,max:9999,im:'numeric'})+
  fld({id:'f_stitch',name:'stitch',label:'Total stitch count',type:'number',value:rec?rec.stitchCount:'',ph:'e.g. 40000',min:1,max:9999999,im:'numeric'})+'</div>'+
  '<div class="field"><span class="lbl">Fabric length</span><div class="calc" aria-live="polite"><span id="calcFormula">'+(rec?num(rec.workCount)+' × '+FABRIC_PER_UNIT+' m':'Enter a work count')+'</span><span class="big" id="calcOut">'+(rec?num(rec.fabricLength)+' m':'0 m')+'</span></div></div>'+
  '<div class="field"><span class="lbl" id="photoLbl">Machine photos</span><div class="dz" id="dropzone"><div class="pgrid" id="photoGrid">'+photoGridHTML()+'</div><div class="split"><span class="hint pcount'+(S.ph.length>=MIN_PHOTOS?' ok':'')+'" id="photoCount">'+photoCountText()+'</span><label class="btn sm" for="photoInput" style="cursor:pointer">'+ico('camera',16)+' Add photos</label><input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp" multiple hidden></div><div class="hint">JPG, PNG or WebP, up to '+MAX_FILE_MB+' MB each. You can also drop files here.</div></div><div class="ferr" data-err="photos" role="alert"></div></div>'+
  fld({id:'f_notes',name:'notes',label:'Notes',type:'textarea',value:rec?rec.notes:'',req:false,ml:300})+
  (edit?fld({id:'f_reason',name:'reason',label:'Reason for correction',ph:'What changed and why',ml:200,hint:'Saved in the record history and the audit log.'}):'')+
  '<div class="msg err" id="formMsg" hidden></div><div class="'+(edit?'sheet-f':'split')+'">'+(edit?'<button type="button" class="btn" data-act="close-modal">Cancel</button>':'<span class="hint">Duplicate entries for the same date and machine are blocked.</span>')+'<button class="btn primary" type="submit">'+(edit?'Save correction':'Submit work')+'</button></div></form>';
}
function entryView(){
  S.ph=[];S.entryKey=uid();
  return '<div class="grid2"><section class="card"><div class="card-h"><h2>Submit daily work</h2></div>'+recForm(null)+'</section>'+
  '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><section class="card"><h2 style="margin-bottom:12px">Fabric calculation</h2><div class="calc"><span>Work count × '+FABRIC_PER_UNIT+' metres</span><span style="margin-top:8px">Example</span><span class="mono">100 work units × '+FABRIC_PER_UNIT+' m = 600 metres</span></div><p class="hint" style="margin-top:10px">The calculation is automatic and stored with the record.</p></section>'+
  '<section class="card"><h2 style="margin-bottom:12px">Before you submit</h2><ul class="ticks">'+['Attach '+MIN_PHOTOS+' to '+MAX_PHOTOS+' clear machine photos.','One entry per machine per day.','You can correct your own entries for '+WORKER_EDIT_DAYS+' days.','Corrections are logged with your reason.'].map(x=>'<li>'+ico('check',16)+'<span>'+x+'</span></li>').join('')+'</ul></section></div></div>';
}
async function addPhotos(files){
  const msg=[];const ok=['image/jpeg','image/png','image/webp'];
  for(const f of files){
    if(S.ph.length>=MAX_PHOTOS){msg.push('Only '+MAX_PHOTOS+' photos are allowed per record.');break}
    if(!ok.includes(f.type)){msg.push(f.name+' was skipped: use JPG, PNG or WebP.');continue}
    if(f.size>MAX_FILE_MB*1048576){msg.push(f.name+' was skipped: larger than '+MAX_FILE_MB+' MB.');continue}
    try{S.ph.push({data:await compress(f),name:f.name});refreshPhotos()}catch(e){msg.push(f.name+' could not be read.')}
  }
  const e=$('[data-err="photos"]');if(e)e.textContent=msg.join(' ');
}
forms['record-save']=async f=>{
  if(S.saving||!requireActive())return;
  const u=me(),admin=u.role==='admin',v=Object.fromEntries(new FormData(f)),edit=!!v.id,rec=edit?recById(v.id):null,t=todayISO();
  if(edit&&!rec)return toast('That record no longer exists.','err');
  if(edit&&!canEdit(rec))return toast('This record can no longer be edited by you.','err');
  const errs={},date=edit&&!admin?rec.date:(v.date||''),machine=(v.machine||'').trim().toUpperCase(),work=Number(v.work),stitch=Number(v.stitch);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))errs.date='Choose a date.';
  else if(date>t)errs.date='The date cannot be in the future.';
  else if(!admin&&!edit&&daysBetween(date,t)>WORKER_EDIT_DAYS)errs.date='You can only log work from the last '+WORKER_EDIT_DAYS+' days.';
  if(!machine)errs.machine='Enter the machine number.';else if(!/^[A-Z0-9][A-Z0-9 \-_\/]*$/.test(machine))errs.machine='Use letters, numbers, dashes or slashes only.';
  if(!Number.isInteger(work)||work<1||work>9999)errs.work='Enter a whole number from 1 to 9,999.';
  if(!Number.isInteger(stitch)||stitch<1||stitch>9999999)errs.stitch='Enter a whole number from 1 to 9,999,999.';
  const demoEmpty=edit&&rec.demo&&rec.photos.length===0&&S.ph.length===0;
  if(!demoEmpty&&(S.ph.length<MIN_PHOTOS||S.ph.length>MAX_PHOTOS))errs.photos='Attach '+MIN_PHOTOS+' to '+MAX_PHOTOS+' photos. You have '+S.ph.length+'.';
  const reason=(v.reason||'').trim();if(edit&&reason.length<5)errs.reason='Explain the correction in a few words.';
  const ownerId=edit?rec.workerId:u.id;
  if(!errs.machine&&!errs.date&&db.records.some(r=>r.workerId===ownerId&&r.date===date&&r.machine===machine&&(!edit||r.id!==rec.id)))errs.machine='A record for '+machine+' on '+fmtDate(date)+' already exists. Open it from the records list to correct it.';
  if(!edit&&db.records.some(r=>r.key===S.entryKey)){toast('This entry was already submitted.','err');return go('records')}
  if(setErrors(f,errs))return;
  S.saving=true;busy(f,true);
  try{
    const kept=S.ph.filter(p=>!p.data).map(p=>p.id),added=[];
    for(const p of S.ph.filter(p=>p.data)){const id='ph_'+uid();await PH.put(id,p.data);added.push(id)}
    const photos=kept.concat(added),fabric=work*FABRIC_PER_UNIT,notes=(v.notes||'').trim();
    if(!edit){
      const r={id:uid(),workerId:u.id,date,machine,workCount:work,stitchCount:stitch,fabricLength:fabric,photos,notes,createdAt:Date.now(),updatedAt:Date.now(),key:S.entryKey,edits:[]};
      db.records.push(r);audit('record_create','Submitted '+num(work)+' units on machine '+machine+' for '+fmtDate(date));save();
      toast('Work submitted. Fabric length '+num(fabric)+' m.');S.hl=r.id;go('records');
    }else{
      const ch=[],cmp=(k,a,b)=>{if(String(a)!==String(b))ch.push({f:k,from:a,to:b})};
      cmp('Date',rec.date,date);cmp('Machine',rec.machine,machine);cmp('Work count',rec.workCount,work);cmp('Stitch count',rec.stitchCount,stitch);cmp('Notes',rec.notes||'',notes);
      const removed=rec.photos.filter(id=>!kept.includes(id));
      if(removed.length||added.length)ch.push({f:'Photos',from:rec.photos.length,to:photos.length});
      if(!ch.length){S.saving=false;busy(f,false);for(const id of added)await PH.del(id);return showMsg('formMsg','warn','Nothing was changed. Edit a field, then save.')}
      rec.date=date;rec.machine=machine;rec.workCount=work;rec.stitchCount=stitch;rec.fabricLength=fabric;rec.notes=notes;rec.photos=photos;rec.updatedAt=Date.now();
      rec.edits=(rec.edits||[]).concat([{ts:Date.now(),by:u.name,byId:u.id,reason,changes:ch}]);
      audit('record_edit','Corrected '+wname(rec.workerId)+'\'s record of '+fmtDate(date)+' ('+machine+'): '+ch.map(c=>c.f).join(', ')+'. Reason: '+reason);
      if(u.id!==rec.workerId)notify(rec.workerId,u.name+' corrected your record of '+fmtDate(date)+' ('+machine+'): '+reason);
      else notify('admins',u.name+' corrected their record of '+fmtDate(date)+' ('+machine+').');
      save();for(const id of removed)await PH.del(id);
      toast('Correction saved.');closeModal();render();
    }
  }catch(e){console.error(e);showMsg('formMsg','err','Could not save this record. Try again.')}
  S.saving=false;busy(f,false);
};
function canEdit(r){
  const u=me();if(!u)return false;if(u.role==='admin')return true;
  return r.workerId===u.id&&daysBetween(r.date,todayISO())<=WORKER_EDIT_DAYS;
}

/* ======================= records ======================= */
function recordsView(scope){
  const admin=isAdmin();S.scope=scope;
  const f=S.rf;
  return '<section class="card"><div class="card-h"><h2>'+(scope==='mine'?'Production history':'All production records')+'</h2>'+(admin?'<div class="exports">'+exportBtns('records')+'</div>':'')+'</div>'+
  '<div class="filters"><div class="field grow"><label for="rf_q">Search</label><input class="input" id="rf_q" type="search" data-inp="rf-q" placeholder="'+(admin?'Worker, machine, date or notes':'Machine, date or notes')+'" value="'+esc(f.q)+'"></div>'+
  (admin?'<div class="field"><label for="rf_w">Worker</label><select class="select" id="rf_w" data-chg="rf-worker"><option value="">All workers</option>'+db.users.filter(u=>u.role==='worker'||db.records.some(r=>r.workerId===u.id)).map(u=>'<option value="'+u.id+'"'+(f.worker===u.id?' selected':'')+'>'+esc(u.name)+'</option>').join('')+'</select></div>':'')+
  '<div class="field"><label for="rf_from">From</label><input class="input" type="date" id="rf_from" data-chg="rf-from" value="'+f.from+'"></div><div class="field"><label for="rf_to">To</label><input class="input" type="date" id="rf_to" data-chg="rf-to" value="'+f.to+'"></div>'+
  '<button class="btn" data-act="rf-clear">Clear filters</button></div><div id="recArea">'+recTable()+'</div></section>';
}
function filteredRecs(){
  const f=S.rf,u=me(),q=f.q.trim().toLowerCase();
  return db.records.filter(r=>{
    if(S.scope==='mine'&&r.workerId!==u.id)return false;
    if(f.worker&&r.workerId!==f.worker)return false;
    if(f.from&&r.date<f.from)return false;if(f.to&&r.date>f.to)return false;
    if(q){const hay=(wname(r.workerId)+' '+r.machine+' '+r.date+' '+fmtDate(r.date)+' '+(r.notes||'')).toLowerCase();if(!hay.includes(q))return false}
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
}
function recTable(){
  const list=filteredRecs(),admin=isAdmin(),shown=list.slice(0,S.rf.page*PAGE);
  if(!list.length)return '<div class="empty">'+ico('records',28)+'<span>No records match these filters.</span>'+(S.scope==='mine'&&!db.records.some(r=>r.workerId===me().id)?'<button class="btn primary" data-act="nav" data-view="entry">Add your first entry</button>':'')+'</div>';
  return '<div class="summary"><span><b>'+num(list.length)+'</b> records</span><span><b>'+num(sumBy(list,'workCount'))+'</b> units</span><span><b>'+num(sumBy(list,'stitchCount'))+'</b> stitches</span><span><b>'+num(sumBy(list,'fabricLength'))+'</b> m fabric</span></div>'+
  '<div class="tw"><table class="stack"><thead><tr><th>Date</th>'+(admin?'<th>Worker</th>':'')+'<th>Machine</th><th class="num">Work</th><th class="num">Stitches</th><th class="num">Fabric</th><th>Photos</th><th>Status</th><th></th></tr></thead><tbody>'+
  shown.map(r=>'<tr'+(S.hl===r.id?' style="background:var(--accent-soft)"':'')+'><td data-l="Date">'+fmtDate(r.date)+'</td>'+(admin?'<td data-l="Worker">'+esc(wname(r.workerId))+'</td>':'')+'<td data-l="Machine"><span class="mono">'+esc(r.machine)+'</span></td><td data-l="Work" class="num">'+num(r.workCount)+'</td><td data-l="Stitches" class="num">'+num(r.stitchCount)+'</td><td data-l="Fabric" class="num">'+num(r.fabricLength)+' m</td><td data-l="Photos">'+(r.photos.length?ico('camera',14)+' '+r.photos.length:'<span class="muted">None</span>')+'</td><td data-l="Status">'+(r.edits&&r.edits.length?'<span class="pill warn">Corrected</span>':'<span class="pill good">Submitted</span>')+'</td><td class="act"><button class="btn sm ghost" data-act="view-record" data-id="'+r.id+'">View</button>'+(canEdit(r)?'<button class="btn sm ghost" data-act="edit-record" data-id="'+r.id+'">Edit</button>':'')+'</td></tr>').join('')+'</tbody></table></div>'+
  (list.length>shown.length?'<div style="text-align:center;margin-top:12px"><button class="btn" data-act="more">Show more ('+(list.length-shown.length)+' left)</button></div>':'');
}
function recordModal(id){
  const r=recById(id);if(!r)return;
  const hist=(r.edits||[]).slice().reverse();
  openModal('<div class="sheet-h"><div><h2>Production record</h2><p class="muted" style="margin-top:4px">'+fmtDate(r.date)+' · machine <span class="mono">'+esc(r.machine)+'</span></p></div><button class="iconbtn" data-act="close-modal" aria-label="Close">'+ico('x',18)+'</button></div>'+
  '<dl class="dl"><div><dt>Worker</dt><dd>'+esc(wname(r.workerId))+'</dd></div><div><dt>Work count</dt><dd>'+num(r.workCount)+'</dd></div><div><dt>Stitch count</dt><dd>'+num(r.stitchCount)+'</dd></div><div><dt>Fabric length</dt><dd>'+num(r.fabricLength)+' m <span class="muted" style="font-weight:400">('+num(r.workCount)+' × '+FABRIC_PER_UNIT+')</span></dd></div><div><dt>Submitted</dt><dd>'+fmtTs(r.createdAt)+'</dd></div></dl>'+
  (r.notes?'<div><div class="lbl">Notes</div><p>'+esc(r.notes)+'</p></div>':'')+
  '<div><div class="lbl" style="margin-bottom:8px">Photos ('+r.photos.length+')</div>'+(r.photos.length?'<div class="pgrid">'+r.photos.map((p,i)=>'<div class="thumb"><img data-photo="'+esc(p)+'" alt="Photo '+(i+1)+'" data-act="zoom-saved" data-id="'+esc(p)+'"></div>').join('')+'</div>':'<p class="muted">'+(r.demo?'This is a sample record without photos.':'No photos on this record.')+'</p>')+'</div>'+
  (hist.length?'<div><div class="lbl" style="margin-bottom:8px">Correction history</div><ul class="hist">'+hist.map(h=>'<li><b>'+esc(h.by)+'</b> · '+fmtTs(h.ts)+'<br><span class="muted">'+esc(h.reason)+'</span><br>'+h.changes.map(c=>'<span class="pill">'+esc(c.f)+': '+esc(c.from)+' → '+esc(c.to)+'</span>').join(' ')+'</li>').join('')+'</ul></div>':'')+
  '<div class="sheet-f">'+(canEdit(r)?'<button class="btn primary" data-act="edit-record" data-id="'+r.id+'">'+ico('edit',16)+' Edit record</button>':(me().role==='worker'?'<span class="hint" style="align-self:center">Records can be corrected for '+WORKER_EDIT_DAYS+' days. Ask an admin for older ones.</span>':''))+'<button class="btn" data-act="close-modal">Close</button></div>',{wide:true,label:'Production record'});
}
function editModal(id){
  const r=recById(id);if(!r||!canEdit(r))return toast('You can no longer edit this record.','err');
  S.ph=r.photos.map(p=>({id:p}));
  openModal('<div class="sheet-h"><div><h2>Edit record</h2><p class="muted" style="margin-top:4px">'+esc(wname(r.workerId))+' · '+fmtDate(r.date)+'</p></div><button class="iconbtn" data-act="close-modal" aria-label="Close">'+ico('x',18)+'</button></div>'+recForm(r),{wide:true,label:'Edit record'});
}

/* ======================= workers ======================= */
function workersView(){
  const pend=db.users.filter(u=>u.status==='pending'),q=S.wq.trim().toLowerCase();
  const list=db.users.filter(u=>u.status!=='pending'&&(!q||(u.name+' '+u.email).toLowerCase().includes(q)));
  return (pend.length?'<section class="card"><div class="card-h"><h2>Waiting for approval</h2><span class="pill warn">'+pend.length+'</span></div><ul class="status-list">'+pend.map(u=>'<li style="flex-wrap:wrap"><div><b>'+esc(u.name)+'</b><br><span class="muted">'+esc(u.email)+' · registered '+fmtDate(iso(new Date(u.created)))+(u.confirmed?'':' · email not confirmed')+'</span></div><div class="exports"><button class="btn sm primary" data-act="approve" data-id="'+u.id+'"'+(u.confirmed?'':' disabled title="Email not confirmed yet"')+'>Approve</button><button class="btn sm danger" data-act="decline" data-id="'+u.id+'">Decline</button></div></li>').join('')+'</ul></section>':'')+
  '<section class="card"><div class="card-h"><h2>Team</h2><button class="btn primary" data-act="add-worker">'+ico('entry',16)+' Add worker</button></div>'+
  '<div class="filters" style="grid-template-columns:minmax(0,420px)"><div class="field"><label for="w_q">Search</label><input class="input" id="w_q" type="search" data-inp="w-q" placeholder="Name or email" value="'+esc(S.wq)+'"></div></div><div id="wArea">'+workersTable(list)+'</div></section>';
}
function workersTable(list){
  const t=todayISO();
  if(!list.length)return '<div class="empty">No workers match your search.</div>';
  return '<div class="tw"><table class="stack"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th class="num">Records</th><th>Last entry</th><th></th></tr></thead><tbody>'+list.map(u=>{
    const rs=db.records.filter(r=>r.workerId===u.id),last=rs.reduce((m,r)=>r.date>m?r.date:m,'');
    return '<tr><td data-l="Name"><b>'+esc(u.name)+'</b><br><span class="muted">'+esc(u.email)+'</span></td><td data-l="Role" style="text-transform:capitalize">'+u.role+'</td><td data-l="Status"><span class="pill '+(u.status==='active'?'good':'bad')+'">'+(u.status==='active'?'Active':'Deactivated')+'</span></td><td data-l="Records" class="num">'+num(rs.length)+'</td><td data-l="Last entry">'+(last?(last===t?'Today':fmtDate(last)):'<span class="muted">None</span>')+'</td><td class="act"><button class="btn sm ghost" data-act="edit-worker" data-id="'+u.id+'">Edit</button>'+(u.id===S.userId?'':(u.status==='active'?'<button class="btn sm danger" data-act="deactivate" data-id="'+u.id+'">Deactivate</button>':'<button class="btn sm" data-act="reactivate" data-id="'+u.id+'">Reactivate</button>'))+'</td></tr>';
  }).join('')+'</tbody></table></div>';
}
const activeAdmins=()=>db.users.filter(u=>u.role==='admin'&&u.status==='active');
async function setStatus(id,status,action,verb){
  const u=db.users.find(x=>x.id===id);if(!u||!requireActive())return;
  if(status!=='active'&&u.role==='admin'&&u.status==='active'&&activeAdmins().length<=1)return toast('This is the only active admin. Make another admin first.','err');
  u.status=status;audit(action,verb+' '+u.name+' ('+u.email+')');
  if(status==='active')notify(u.id,'Your account was activated. You can sign in now.');
  save();render();toast(u.name+' '+(status==='active'?'is active.':'was '+(action==='worker_decline'?'declined.':'deactivated.')));
}
function workerModal(id){
  const u=id&&db.users.find(x=>x.id===id),self=u&&u.id===S.userId;
  openModal('<div class="sheet-h"><h2>'+(u?'Edit worker':'Add worker')+'</h2><button class="iconbtn" data-act="close-modal" aria-label="Close">'+ico('x',18)+'</button></div>'+
  '<form class="form" data-form="worker-save" novalidate>'+(u?'<input type="hidden" name="id" value="'+u.id+'">':'')+fld({id:'wk_name',name:'fullname',label:'Full name',value:u?u.name:'',ml:60})+
  (u?'<div class="field"><label for="wk_email">Email address</label><input class="input" id="wk_email" value="'+esc(u.email)+'" readonly></div>':fld({id:'wk_email',name:'email',label:'Email address',type:'email',ac:'off'})+fld({id:'wk_pw',name:'password',label:'Temporary password',type:'password',ac:'new-password',hint:'Share this securely. At least 8 characters with a letter and a number.'}))+
  '<div class="field"><label for="wk_role">Role</label><select class="select" id="wk_role" name="role"'+(self?' disabled':'')+'><option value="worker"'+(u&&u.role==='worker'?' selected':'')+'>Worker</option><option value="admin"'+(u&&u.role==='admin'?' selected':'')+'>Admin</option></select><div class="hint">'+(self?'You cannot change your own role.':'Admins can see every record and manage workers. Role changes are logged.')+'</div></div>'+
  '<div class="sheet-f"><button type="button" class="btn" data-act="close-modal">Cancel</button><button class="btn primary" type="submit">'+(u?'Save changes':'Add worker')+'</button></div></form>',{label:u?'Edit worker':'Add worker'});
}
forms['worker-save']=async f=>{
  if(!requireActive()||!isAdmin())return;
  const v=Object.fromEntries(new FormData(f)),errs={},name=(v.fullname||'').trim().replace(/\s+/g,' '),u=v.id&&db.users.find(x=>x.id===v.id);
  if(name.length<2)errs.fullname='Enter the full name.';
  let email;
  if(!u){email=(v.email||'').trim().toLowerCase();if(!EMAIL_RE.test(email))errs.email='Enter a valid email address.';else if(db.users.some(x=>x.email===email))errs.email='An account with this email already exists.';const pp=pwProblem(v.password||'');if(pp)errs.password=pp}
  if(setErrors(f,errs))return;
  busy(f,true);
  if(u){
    const role=u.id===S.userId?u.role:(v.role==='admin'?'admin':'worker');
    if(role!==u.role&&u.role==='admin'&&u.status==='active'&&activeAdmins().length<=1){busy(f,false);return setErrors(f,{fullname:'This is the only active admin. Make another admin first.'})}
    const ch=[];if(u.name!==name)ch.push('name');if(u.role!==role)ch.push('role '+u.role+' → '+role);
    u.name=name;u.role=role;if(ch.length)audit('worker_edit','Updated '+u.email+': '+ch.join(', '));
  }else{
    const id='u_'+uid();db.users.push({id,name,email,role:v.role==='admin'?'admin':'worker',status:'active',confirmed:true,pw:await hashPw(v.password,id),created:Date.now()});
    audit('worker_add','Added '+(v.role==='admin'?'admin ':'worker ')+name+' ('+email+')');
  }
  save();closeModal();render();toast(u?'Changes saved.':'Worker added. Share the temporary password securely.');
};

/* ======================= reports ======================= */
function reportData(){
  const t=todayISO(),r=S.rep;if(!r.to){r.to=t;r.from=addDays(t,-55)}
  if(r.from>r.to){const x=r.from;r.from=r.to;r.to=x}
  const recs=db.records.filter(x=>x.date>=r.from&&x.date<=r.to&&(!r.worker||x.workerId===r.worker));
  const groups=groupRecs(recs,r.kind,r.from,r.to),rows=groups.filter(g=>g.recs.length);
  const ws=db.users.filter(u=>recs.some(x=>x.workerId===u.id)).map(u=>{const rs=recs.filter(x=>x.workerId===u.id);return {name:u.name,records:rs.length,work:sumBy(rs,'workCount'),stitches:sumBy(rs,'stitchCount'),fabric:sumBy(rs,'fabricLength')}}).sort((a,b)=>b.work-a.work);
  return {recs,groups,rows,ws};
}
function reportsView(){
  const r=S.rep,d=reportData(),t=todayISO();
  const tot={records:d.recs.length,work:sumBy(d.recs,'workCount'),stitches:sumBy(d.recs,'stitchCount'),fabric:sumBy(d.recs,'fabricLength')};
  const kindName={daily:'Daily',weekly:'Weekly',monthly:'Monthly'}[r.kind];
  return '<section class="card"><div class="card-h"><h2>Production summary</h2><div class="exports">'+exportBtns('report')+'</div></div>'+
  '<div class="filters"><div class="field"><span class="lbl">Summary by</span><div class="seg" role="group" aria-label="Summary period">'+['daily','weekly','monthly'].map(k=>'<button data-act="rep-kind" data-kind="'+k+'" aria-pressed="'+(r.kind===k)+'">'+k[0].toUpperCase()+k.slice(1)+'</button>').join('')+'</div></div>'+
  '<div class="field"><label for="rp_from">From</label><input class="input" type="date" id="rp_from" data-chg="rep-from" value="'+r.from+'" max="'+t+'"></div><div class="field"><label for="rp_to">To</label><input class="input" type="date" id="rp_to" data-chg="rep-to" value="'+r.to+'" max="'+t+'"></div>'+
  '<div class="field"><label for="rp_w">Worker</label><select class="select" id="rp_w" data-chg="rep-worker"><option value="">All workers</option>'+db.users.filter(u=>u.role==='worker').map(u=>'<option value="'+u.id+'"'+(r.worker===u.id?' selected':'')+'>'+esc(u.name)+'</option>').join('')+'</select></div></div>'+
  '<div class="tiles" style="margin-bottom:16px">'+tile('Work count',num(tot.work),null)+tile('Stitch count',num(tot.stitches),null)+tile('Fabric length',num(tot.fabric),null,'m')+tile('Records',num(tot.records),null)+'</div>'+
  chartBox('rep',{type:'bar',items:d.groups.map(g=>({label:g.short,title:g.label+': '+num(g.work)+' units',value:g.work})),label:kindName+' work count'})+'</section>'+
  '<section class="card"><h2 style="margin-bottom:14px">'+kindName+' totals</h2>'+(d.rows.length?'<div class="tw"><table class="stack"><thead><tr><th>Period</th><th class="num">Records</th><th class="num">Work</th><th class="num">Stitches</th><th class="num">Fabric (m)</th><th class="num">Workers</th></tr></thead><tbody>'+d.rows.slice().reverse().map(g=>'<tr><td data-l="Period">'+esc(g.label)+'</td><td data-l="Records" class="num">'+num(g.recs.length)+'</td><td data-l="Work" class="num">'+num(g.work)+'</td><td data-l="Stitches" class="num">'+num(g.stitches)+'</td><td data-l="Fabric" class="num">'+num(g.fabric)+'</td><td data-l="Workers" class="num">'+g.workers+'</td></tr>').join('')+'</tbody><tfoot><tr><td>Total</td><td class="num">'+num(tot.records)+'</td><td class="num">'+num(tot.work)+'</td><td class="num">'+num(tot.stitches)+'</td><td class="num">'+num(tot.fabric)+'</td><td></td></tr></tfoot></table></div>':'<div class="empty">No records in this range.</div>')+'</section>'+
  '<section class="card"><h2 style="margin-bottom:14px">By worker</h2>'+(d.ws.length?'<div class="tw"><table class="stack"><thead><tr><th>Worker</th><th class="num">Records</th><th class="num">Work</th><th class="num">Stitches</th><th class="num">Fabric (m)</th></tr></thead><tbody>'+d.ws.map(w=>'<tr><td data-l="Worker">'+esc(w.name)+'</td><td data-l="Records" class="num">'+num(w.records)+'</td><td data-l="Work" class="num">'+num(w.work)+'</td><td data-l="Stitches" class="num">'+num(w.stitches)+'</td><td data-l="Fabric" class="num">'+num(w.fabric)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No records in this range.</div>')+'</section>';
}

/* ======================= audit ======================= */
const AUD={signin:['Sign-in','auth'],signin_failed:['Failed sign-in','auth'],signin_blocked:['Blocked sign-in','auth'],signout:['Sign-out','auth'],register:['Registration','auth'],email_confirm:['Email confirmed','auth'],password_reset:['Password reset','auth'],password_change:['Password changed','auth'],record_create:['Record added','records'],record_edit:['Record corrected','records'],worker_approve:['Worker approved','workers'],worker_decline:['Worker declined','workers'],worker_deactivate:['Worker deactivated','workers'],worker_reactivate:['Worker reactivated','workers'],worker_add:['Worker added','workers'],worker_edit:['Worker updated','workers'],backup:['Backup saved','system'],restore:['Backup restored','system'],demo_reset:['Sample data reset','system']};
function auditList(){
  const f=S.af,q=f.q.trim().toLowerCase();
  return db.audit.filter(a=>(!f.cat||(AUD[a.action]||[0,'system'])[1]===f.cat)&&(!q||(a.actor+' '+a.detail+' '+(AUD[a.action]||[a.action])[0]).toLowerCase().includes(q))).sort((a,b)=>b.ts-a.ts);
}
function auditView(){
  const f=S.af;
  return '<section class="card"><div class="card-h"><h2>Activity</h2><div class="exports">'+exportBtns('audit')+'</div></div><p class="hint" style="margin-bottom:12px">Entries are append-only. The app has no way to edit or remove them.</p>'+
  '<div class="filters"><div class="field grow"><label for="af_q">Search</label><input class="input" id="af_q" type="search" data-inp="af-q" placeholder="Person or action" value="'+esc(f.q)+'"></div><div class="field"><label for="af_c">Type</label><select class="select" id="af_c" data-chg="af-cat">'+[['','All activity'],['auth','Sign-ins and accounts'],['records','Records'],['workers','Workers'],['system','System']].map(o=>'<option value="'+o[0]+'"'+(f.cat===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></div></div><div id="audArea">'+auditTable()+'</div></section>';
}
function auditTable(){
  const list=auditList(),shown=list.slice(0,S.af.page*PAGE);
  if(!list.length)return '<div class="empty">No activity matches.</div>';
  return '<div class="tw"><table class="stack"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead><tbody>'+shown.map(a=>'<tr><td data-l="When" style="white-space:nowrap">'+fmtTs(a.ts)+'</td><td data-l="Who">'+esc(a.actor)+'</td><td data-l="Action"><span class="pill'+((a.action==='signin_failed'||a.action==='signin_blocked')?' bad':'')+'">'+esc((AUD[a.action]||[a.action])[0])+'</span></td><td data-l="Details">'+esc(a.detail)+'</td></tr>').join('')+'</tbody></table></div>'+(list.length>shown.length?'<div style="text-align:center;margin-top:12px"><button class="btn" data-act="more-audit">Show more ('+(list.length-shown.length)+' left)</button></div>':'');
}

/* ======================= settings & profile ======================= */
function settingsView(){
  return '<div class="grid2"><div style="display:flex;flex-direction:column;gap:16px;min-width:0"><section class="card"><div class="card-h"><h2>Backup and recovery</h2></div><p class="muted" style="margin-bottom:14px">A backup holds all accounts, records, photos, notifications and the audit log. Keep copies somewhere safe, and test a restore now and then.</p><div class="exports"><button class="btn primary" data-act="backup">'+ico('download',16)+' Download backup</button><label class="btn" for="restoreInput" style="cursor:pointer">'+ico('upload',16)+' Restore from backup</label><input type="file" id="restoreInput" accept=".json,application/json" hidden></div><div class="msg err" id="restoreMsg" style="margin-top:12px" hidden></div></section>'+
  '<section class="card"><div class="card-h"><h2>Sample data</h2></div><p class="muted" style="margin-bottom:14px">This workspace started with demo accounts and sample records. Resetting replaces everything with a fresh sample set.</p><button class="btn danger" data-act="reset-demo">Reset to sample data</button></section></div>'+
  '<section class="card"><h2 style="margin-bottom:12px">Business rules</h2><ul class="ticks">'+['Fabric length = work count × '+FABRIC_PER_UNIT+' metres, calculated and stored automatically.','Each record needs '+MIN_PHOTOS+' to '+MAX_PHOTOS+' photos (JPG, PNG, WebP; '+MAX_FILE_MB+' MB each).','One record per worker, machine and date.','Workers can correct their own records for '+WORKER_EDIT_DAYS+' days. Admins can correct any record.','Every correction needs a reason and is logged.','Deactivated workers cannot sign in or submit.','New accounts start as pending. Only an admin activates them.'].map(x=>'<li>'+ico('check',16)+'<span>'+x+'</span></li>').join('')+'</ul></section></div>';
}
function profileView(){
  const u=me();
  return '<div class="grid2"><section class="card"><div class="card-h"><h2>Your account</h2></div><dl class="dl"><div><dt>Name</dt><dd>'+esc(u.name)+'</dd></div><div><dt>Email</dt><dd style="overflow-wrap:anywhere">'+esc(u.email)+'</dd></div><div><dt>Role</dt><dd style="text-transform:capitalize">'+u.role+'</dd></div><div><dt>Member since</dt><dd>'+fmtDate(iso(new Date(u.created)))+'</dd></div></dl></section>'+
  '<section class="card"><div class="card-h"><h2>Change password</h2></div><form class="form" data-form="password" novalidate>'+fld({id:'pw_cur',name:'current',label:'Current password',type:'password',ac:'current-password'})+fld({id:'pw_new',name:'password',label:'New password',type:'password',ac:'new-password',hint:'At least 8 characters with a letter and a number.'})+'<div class="meter" id="pwMeter" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'+fld({id:'pw_new2',name:'password2',label:'Confirm new password',type:'password',ac:'new-password'})+'<div class="msg ok" id="pwMsg" hidden></div><button class="btn primary" type="submit">Update password</button></form></section></div>';
}
forms.password=async f=>{
  if(!requireActive())return;
  const u=me(),v=Object.fromEntries(new FormData(f)),errs={};
  if(!v.current)errs.current='Enter your current password.';else if((await hashPw(v.current,u.id))!==u.pw)errs.current='That is not your current password.';
  const pp=pwProblem(v.password||'');if(pp)errs.password=pp;else if(v.password===v.current)errs.password='Choose a password you have not used just now.';
  if(v.password!==v.password2)errs.password2='Passwords do not match.';
  if(setErrors(f,errs))return;
  u.pw=await hashPw(v.password,u.id);audit('password_change','Changed own password');save();f.reset();$('#pwMeter').dataset.s='0';showMsg('pwMsg','ok','Password updated.');
};

/* ======================= exports ======================= */
function exportBtns(what){
  return ['csv','xlsx','pdf'].map(fmt=>'<button class="btn sm" data-act="export" data-what="'+what+'" data-fmt="'+fmt+'">'+ico('download',15)+' '+({csv:'CSV',xlsx:'Excel',pdf:'PDF'})[fmt]+'</button>').join('');
}
//#region exporters
function csvCell(v){let s=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(s)&&isNaN(Number(s)))s="'"+s;return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function toCSV(sections){return sections.map(s=>[s.name,s.columns.map(csvCell).join(',')].concat(s.rows.map(r=>r.map(csvCell).join(','))).join('\r\n')).join('\r\n\r\n')}
function buildPDF(title,sections){
  const W=842,H=595,M=34,FS=8.5,LH=14,pages=[];let cur,y;
  const enc=s=>String(s==null?'':s).replace(/[\r\n\t]+/g,' ').replace(/[^\x20-\xFF]/g,m=>({'–':'-','—':'-','×':'x','’':"'",'‘':"'",'“':'"','”':'"','…':'...','→':'->'}[m]||'?')).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const fit=(s,w)=>{s=String(s==null?'':s);const n=Math.max(1,Math.floor((w-6)/(FS*0.52)));return s.length>n?s.slice(0,Math.max(1,n-3))+'...':s};
  const np=()=>{cur=[];pages.push(cur);y=H-M};
  const txt=(x,yy,s,size,bold)=>cur.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x.toFixed(1)+' '+yy.toFixed(1)+' Td ('+enc(s)+') Tj ET');
  np();txt(M,y-14,'StitchBook',16,true);txt(M,y-30,title,10,false);y-=50;
  sections.forEach(sec=>{
    if(y<M+70)np();
    txt(M,y-10,sec.name,11,true);y-=22;
    const cols=sec.columns,lens=cols.map((c,i)=>Math.min(30,Math.max(String(c).length,...sec.rows.map(r=>String(r[i]==null?'':(typeof r[i]==='number'?num(r[i]):r[i])).length)))+2),tot=lens.reduce((a,b)=>a+b,0),avail=W-2*M,cw=lens.map(l=>avail*l/tot);
    const head=()=>{cur.push('0.89 0.93 0.95 rg '+M+' '+(y-LH+3)+' '+avail+' '+LH+' re f 0 g');let x=M;cols.forEach((c,i)=>{txt(x+3,y-LH+7,fit(c,cw[i]),FS,true);x+=cw[i]});y-=LH};
    head();
    sec.rows.forEach(r=>{if(y<M+LH+16){np();head()}let x=M;r.forEach((c,i)=>{txt(x+3,y-LH+7,fit(typeof c==='number'?num(c):c,cw[i]),FS,false);x+=cw[i]});cur.push('0.88 G 0.5 w '+M+' '+(y-LH+3)+' m '+(M+avail)+' '+(y-LH+3)+' l S');y-=LH});
    y-=14;
  });
  const stamp=new Date().toISOString().slice(0,10);
  pages.forEach((p,i)=>p.push('BT /F1 7.5 Tf '+M+' 18 Td ('+enc('Generated '+stamp+'   Page '+(i+1)+' of '+pages.length)+') Tj ET'));
  const objs=[];objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objs[2]='<< /Type /Pages /Kids ['+pages.map((_,i)=>(5+i*2)+' 0 R').join(' ')+'] /Count '+pages.length+' >>';
  objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((p,i)=>{const c=p.join('\n');objs[5+i*2]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+(6+i*2)+' 0 R >>';objs[6+i*2]='<< /Length '+c.length+' >>\nstream\n'+c+'\nendstream'});
  let out='%PDF-1.4\n';const offs=[];
  for(let i=1;i<objs.length;i++){offs[i]=out.length;out+=i+' 0 obj\n'+objs[i]+'\nendobj\n'}
  const xr=out.length;out+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
  for(let i=1;i<objs.length;i++)out+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
  out+='trailer\n<< /Size '+objs.length+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF';
  const bytes=new Uint8Array(out.length);for(let i=0;i<out.length;i++)bytes[i]=out.charCodeAt(i)&255;return bytes;
}
async function buildXLSX(sections){
  const zip=new JSZip();
  const colL=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
  const xe=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const names=[];
  const nm=s=>{let b=String(s).replace(/[\\\/\?\*\[\]:]/g,' ').trim().slice(0,28)||'Sheet',n=b,k=2;while(names.includes(n.toLowerCase()))n=b+' '+(k++);names.push(n.toLowerCase());return n};
  const shNames=sections.map(s=>nm(s.name));
  sections.forEach((s,si)=>{
    const lens=s.columns.map((c,i)=>Math.min(40,Math.max(String(c).length,...s.rows.map(r=>String(r[i]==null?'':r[i]).length))+2));
    let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>'+lens.map((l,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+Math.max(10,l)+'" customWidth="1"/>').join('')+'</cols><sheetData>';
    const row=(cells,r,hd)=>'<row r="'+r+'">'+cells.map((c,i)=>{const ref=colL(i)+r;return typeof c==='number'?'<c r="'+ref+'"><v>'+c+'</v></c>':'<c r="'+ref+'" t="inlineStr"'+(hd?' s="1"':'')+'><is><t xml:space="preserve">'+xe(c)+'</t></is></c>'}).join('')+'</row>';
    x+=row(s.columns,1,true)+s.rows.map((r,i)=>row(r,i+2,false)).join('')+'</sheetData></worksheet>';
    zip.file('xl/worksheets/sheet'+(si+1)+'.xml',x);
  });
  const n=sections.length;
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sections.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+shNames.map((s,i)=>'<sheet name="'+xe(s)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sections.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rId'+(n+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('xl/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>');
  return zip.generateAsync({type:'blob'});
}
//#endregion
function sectionsFor(what){
  if(what==='report'){
    const d=reportData(),r=S.rep;
    return {title:{daily:'Daily',weekly:'Weekly',monthly:'Monthly'}[r.kind]+' production report, '+fmtDate(r.from)+' to '+fmtDate(r.to)+(r.worker?' ('+wname(r.worker)+')':''),base:'stitchbook-report-'+r.kind+'-'+r.from+'-to-'+r.to,
      sections:[{name:{daily:'Daily',weekly:'Weekly',monthly:'Monthly'}[r.kind]+' totals',columns:['Period','Records','Work count','Stitch count','Fabric length (m)','Workers'],rows:d.rows.map(g=>[g.label,g.recs.length,g.work,g.stitches,g.fabric,g.workers])},
      {name:'By worker',columns:['Worker','Records','Work count','Stitch count','Fabric length (m)'],rows:d.ws.map(w=>[w.name,w.records,w.work,w.stitches,w.fabric])}]};
  }
  if(what==='records'){
    S.scope='all';const list=filteredRecs();
    return {title:'Production records ('+list.length+')',base:'stitchbook-records-'+todayISO(),sections:[{name:'Production records',columns:['Date','Worker','Machine','Work count','Stitch count','Fabric length (m)','Photos','Corrected','Notes'],rows:list.map(r=>[r.date,wname(r.workerId),r.machine,r.workCount,r.stitchCount,r.fabricLength,r.photos.length,(r.edits&&r.edits.length)?'Yes':'No',r.notes||''])}]};
  }
  const list=auditList();
  return {title:'Audit log ('+list.length+' entries)',base:'stitchbook-audit-'+todayISO(),sections:[{name:'Audit log',columns:['When','Who','Action','Details'],rows:list.map(a=>[fmtTs(a.ts),a.actor,(AUD[a.action]||[a.action])[0],a.detail])}]};
}
async function saveFile(filename,data){
  let d=null;try{d=window.claude&&window.claude.use?await window.claude.use('downloads'):null}catch(e){}
  if(d){
    try{await d.save({filename,data});toast('Export ready: '+filename)}
    catch(e){if(e&&e.code==='declined')return;toast('Could not save the file'+(e&&e.code?' ('+e.code+')':'')+'.','err')}
    return;
  }
  /* Standalone hosting: normal browser download. */
  try{
    const type=/\.csv$/.test(filename)?'text/csv':/\.pdf$/.test(filename)?'application/pdf':/\.xlsx$/.test(filename)?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/json';
    const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);toast('Export ready: '+filename);
  }catch(e){toast('Could not save the file.','err')}
}
async function doExport(what,fmt){
  const s=sectionsFor(what);
  if(!s.sections[0].rows.length&&what!=='report')return toast('There is nothing to export for these filters.','err');
  if(fmt==='csv')return saveFile(s.base+'.csv','﻿'+toCSV(s.sections));
  if(fmt==='pdf')return saveFile(s.base+'.pdf',buildPDF(s.title,s.sections));
  if(typeof JSZip==='undefined')return toast('The Excel export tool did not load. Use CSV, which Excel also opens.','err');
  return saveFile(s.base+'.xlsx',await buildXLSX(s.sections));
}

/* ======================= backup / restore ======================= */
async function doBackup(){
  const ids=new Set();db.records.forEach(r=>r.photos.forEach(p=>ids.add(p)));const photos={};
  for(const id of ids){const d=await PH.get(id);if(d)photos[id]=d}
  const payload={app:'StitchBook',version:1,exportedAt:new Date().toISOString(),data:{users:db.users,records:db.records,audit:db.audit,notifs:db.notifs},photos};
  audit('backup','Downloaded a backup ('+db.records.length+' records, '+Object.keys(photos).length+' photos)');save();
  await saveFile('stitchbook-backup-'+todayISO()+'.json',JSON.stringify(payload));
}
async function doRestore(file){
  const bad=t=>{showMsg('restoreMsg','err',t)};
  $('#restoreMsg').hidden=true;
  if(!file)return;
  if(file.size>60*1048576)return bad('That file is larger than 60 MB.');
  let p;try{p=JSON.parse(await file.text())}catch(e){return bad('That file is not a valid StitchBook backup.')}
  const d=p&&p.app==='StitchBook'&&p.data;
  if(!d||!Array.isArray(d.users)||!Array.isArray(d.records)||!d.users.every(u=>u&&u.id&&u.email&&u.pw&&(u.role==='admin'||u.role==='worker'))||!d.records.every(r=>r&&r.id&&r.workerId&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Array.isArray(r.photos)))return bad('That file is missing data or is not a StitchBook backup.');
  if(!d.users.some(u=>u.id===S.userId&&u.role==='admin'&&u.status==='active'))return bad('This backup does not contain your admin account, so restoring it would lock you out.');
  const ok=await confirmDlg({title:'Restore this backup?',body:'This replaces all current accounts, records and photos with the backup from <b>'+esc(p.exportedAt?fmtTs(Date.parse(p.exportedAt)):'an unknown date')+'</b> ('+d.records.length+' records). It cannot be undone.',ok:'Restore backup',danger:true});
  if(!ok)return;
  db={v:1,users:d.users,records:d.records.map(r=>Object.assign({edits:[]},r)),audit:d.audit||[],notifs:d.notifs||[]};
  for(const id of Object.keys(p.photos||{}))if(typeof p.photos[id]==='string'&&p.photos[id].startsWith('data:image/'))await PH.put(id,p.photos[id]);
  audit('restore','Restored a backup with '+db.records.length+' records');save();render();toast('Backup restored.');
}

/* ======================= actions ======================= */
function go(view){S.view=view;S.notifOpen=false;S.rf={q:'',worker:'',from:'',to:'',page:1};S.af={cat:'',q:'',page:1};S.wq='';render();window.scrollTo(0,0)}
const actions={
 'go-auth':t=>{S.auth=t.dataset.to;if(S.auth!=='forgot')S.resetEmail=S.auth==='reset'?S.resetEmail:'';render()},
 'demo-fill':t=>{$('#si_email').value=t.dataset.email;$('#si_pw').value=t.dataset.pw;$('#si_pw').focus()},
 'toggle-pw':t=>{const i=$('#'+t.dataset.for);i.type=i.type==='password'?'text':'password';t.setAttribute('aria-label',i.type==='password'?'Show password':'Hide password')},
 'confirm-email':()=>{const u=db.users.find(x=>x.email===S.pendingEmail);if(u){u.confirmed=true;audit('email_confirm','Email confirmed for '+u.email,u.name);if(u.status==='pending')notify('admins',u.name+' confirmed their email and is waiting for approval.');save()}S.auth='pending';render()},
 'open-reset':()=>{S.auth='reset';render()},
 nav:t=>go(t.dataset.view),
 signout:()=>{const u=me();if(u){audit('signout','Signed out',u.name);save()}S.userId=null;LS.del('sb.session');S.auth='signin';S.notifOpen=false;render()},
 theme:()=>{const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);S.theme=dark?'light':'dark';LS.set('sb.theme',S.theme);render()},
 bell:()=>{S.notifOpen=!S.notifOpen;render()},
 'mark-read':()=>{const u=me();myNotifs().forEach(n=>{if(!n.readBy.includes(u.id))n.readBy.push(u.id)});save();render()},
 trend:t=>{S.trend=t.dataset.mode;render()},
 'dash-days':t=>{S.dash.days=+t.dataset.days;S.dash.to=todayISO();S.dash.from=addDays(S.dash.to,-(S.dash.days-1));render()},
 'rm-photo':t=>{S.ph.splice(+t.dataset.i,1);refreshPhotos()},
 zoom:t=>{const p=S.ph[+t.dataset.i];if(p&&p.data){$('#lightbox').innerHTML='<button class="iconbtn" data-act="close-lightbox" aria-label="Close photo">'+ico('x',20)+'</button><img src="'+p.data+'" alt="Photo, enlarged">';$('#lightbox').hidden=false}else if(p)openLightbox(p.id)},
 'zoom-saved':t=>openLightbox(t.dataset.id),
 'close-lightbox':()=>{$('#lightbox').hidden=true;$('#lightbox').innerHTML=''},
 'view-record':t=>{const keep=S.lastFocus;recordModal(t.dataset.id)},
 'edit-record':t=>{if(!$('#modal').hidden)closeModal();editModal(t.dataset.id)},
 more:()=>{S.rf.page++;$('#recArea').innerHTML=recTable()},
 'more-audit':()=>{S.af.page++;$('#audArea').innerHTML=auditTable()},
 'rf-clear':()=>{S.rf={q:'',worker:'',from:'',to:'',page:1};render()},
 approve:async t=>{await setStatus(t.dataset.id,'active','worker_approve','Approved')},
 decline:async t=>{const u=db.users.find(x=>x.id===t.dataset.id);if(await confirmDlg({title:'Decline '+u.name+'?',body:'They will not be able to sign in. You can reactivate the account later.',ok:'Decline',danger:true}))setStatus(u.id,'inactive','worker_decline','Declined')},
 deactivate:async t=>{const u=db.users.find(x=>x.id===t.dataset.id);if(await confirmDlg({title:'Deactivate '+u.name+'?',body:'They are signed out of new actions straight away and cannot submit or sign in. Their existing records stay.',ok:'Deactivate',danger:true}))setStatus(u.id,'inactive','worker_deactivate','Deactivated')},
 reactivate:t=>setStatus(t.dataset.id,'active','worker_reactivate','Reactivated'),
 'add-worker':()=>workerModal(),
 'edit-worker':t=>workerModal(t.dataset.id),
 'rep-kind':t=>{S.rep.kind=t.dataset.kind;render()},
 export:t=>doExport(t.dataset.what,t.dataset.fmt),
 backup:doBackup,
 'reset-demo':async()=>{if(await confirmDlg({title:'Reset to sample data?',body:'All current accounts, records and photos are replaced. You will be signed out.',ok:'Reset everything',danger:true})){db=await makeSeed();save();S.userId=null;LS.del('sb.session');S.auth='signin';S.authMsg={type:'ok',text:'Sample data restored. Sign in with a demo account.'};render()}},
 'close-modal':()=>closeModal(false),
 'dlg-ok':()=>closeModal(true),
 'dlg-cancel':()=>closeModal(false)
};
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');
  if(!t){if(S.notifOpen&&!e.target.closest('.pop')){S.notifOpen=false;render()}return}
  const a=actions[t.dataset.act];if(a){e.preventDefault();a(t,e)}
});
document.addEventListener('submit',e=>{const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();const h=forms[f.dataset.form];if(h)Promise.resolve(h(f)).catch(err=>{console.error(err);busy(f,false);toast('Something went wrong. Try again.','err')})});
document.addEventListener('input',e=>{
  const t=e.target,k=t.dataset&&t.dataset.inp;
  if(k==='rf-q'){S.rf.q=t.value;S.rf.page=1;$('#recArea').innerHTML=recTable()}
  else if(k==='w-q'){S.wq=t.value;$('#wArea').innerHTML=workersTable(db.users.filter(u=>u.status!=='pending'&&(!S.wq.trim()||(u.name+' '+u.email).toLowerCase().includes(S.wq.trim().toLowerCase()))))}
  else if(k==='af-q'){S.af.q=t.value;S.af.page=1;$('#audArea').innerHTML=auditTable()}
  else if(t.id==='f_work'){const n=Number(t.value);const ok=Number.isFinite(n)&&n>0;$('#calcFormula').textContent=ok?num(n)+' × '+FABRIC_PER_UNIT+' m':'Enter a work count';$('#calcOut').textContent=ok?num(n*FABRIC_PER_UNIT)+' m':'0 m'}
  else if(t.id==='rg_pw'||t.id==='rs_pw'||t.id==='pw_new'){const m=$('#pwMeter');if(m)m.dataset.s=t.value?pwScore(t.value):0}
});
document.addEventListener('change',e=>{
  const t=e.target,k=t.dataset&&t.dataset.chg;
  if(t.id==='photoInput'){addPhotos([...t.files]);t.value='';return}
  if(t.id==='restoreInput'){doRestore(t.files[0]);t.value='';return}
  if(!k)return;
  if(k==='rf-worker'){S.rf.worker=t.value;S.rf.page=1;$('#recArea').innerHTML=recTable()}
  else if(k==='rf-from'){S.rf.from=t.value;S.rf.page=1;$('#recArea').innerHTML=recTable()}
  else if(k==='rf-to'){S.rf.to=t.value;S.rf.page=1;$('#recArea').innerHTML=recTable()}
  else if(k==='af-cat'){S.af.cat=t.value;S.af.page=1;$('#audArea').innerHTML=auditTable()}
  else if(k==='dash-from'){if(t.value){S.dash.from=t.value;render()}}
  else if(k==='dash-to'){if(t.value){S.dash.to=t.value;render()}}
  else if(k==='rep-from'){if(t.value){S.rep.from=t.value;render()}}
  else if(k==='rep-to'){if(t.value){S.rep.to=t.value;render()}}
  else if(k==='rep-worker'){S.rep.worker=t.value;render()}
});
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('#dropzone');if(z){e.preventDefault();z.classList.add('over')}});
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('#dropzone');if(z)z.classList.remove('over')});
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('#dropzone');if(z){e.preventDefault();z.classList.remove('over');addPhotos([...e.dataTransfer.files])}});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(!$('#lightbox').hidden){actions['close-lightbox']();return}
    if(!$('#modal').hidden){closeModal(false);return}
    if(S.notifOpen){S.notifOpen=false;render()}
  }
  if(e.key==='Tab'&&!$('#modal').hidden){
    const sh=$('#modal .sheet'),f=$$('button,input,select,textarea,a[href],[tabindex="0"]',sh).filter(x=>!x.disabled&&x.offsetParent!==null);
    if(!f.length)return;const first=f[0],last=f[f.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===sh)){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
});
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(drawCharts,150)});

/* ======================= render ======================= */
function applyTheme(){const r=document.documentElement;if(S.theme==='dark'||S.theme==='light')r.dataset.theme=S.theme;else r.removeAttribute('data-theme')}
function render(){
  applyTheme();S.charts={};
  const u=me(),app=$('#app');
  if(!u||u.status!=='active'||!u.confirmed){if(S.userId){S.userId=null;LS.del('sb.session')}app.innerHTML=authView()}
  else{
    if(S.view==='entry'&&u.role==='admin')S.view='dashboard';
    if(['workers','production','reports','audit','settings'].includes(S.view)&&u.role!=='admin')S.view='dashboard';
    if(S.view==='records'&&u.role==='admin')S.view='production';
    app.innerHTML=shell(u);
  }
  drawCharts();hydratePhotos();
  const ms=$('#mobSignout');if(ms&&matchMedia('(max-width:860px)').matches)ms.style.display='grid';
  if(S.hl){const id=S.hl;setTimeout(()=>{if(S.hl===id)S.hl=null},4000)}
}
async function init(){
  await loadDB();
  const u=me();if(u&&(u.status!=='active'||!u.confirmed)){S.userId=null;LS.del('sb.session')}
  if(me())S.view='dashboard';
  render();
}
init().catch(e=>{console.error(e);$('#app').innerHTML='<div class="loading"><p>StitchBook could not start. Reload the page to try again.</p></div>'});
})();
