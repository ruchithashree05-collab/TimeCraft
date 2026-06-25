// ══════════════════════════════════════════
// DATA STRUCTURE
// ══════════════════════════════════════════
const DK = 'stt_v5';
function dl(){
  try{ const r=localStorage.getItem(DK); if(r) return JSON.parse(r); }catch(e){}
  return mk();
}
function mk(){
  return {
    subjects:[],classes:[],teachers:[],
    teacherSubjects:{},
    classSubjects:{},       // { cls: [sub, sub, ...] }
    subjectPeriods:{},      // { cls_sub: periodsPerWeek }
    users:[                 // user accounts
      {role:'hod',username:'admin',password:'admin123',linked:''}
    ],
    config:{
      periodDur:45, periodsPerDay:6, startTime:'08:00',
      sb1After:2,sb1Dur:15,sb2After:4,sb2Dur:15,lunchAfter:5,lunchDur:45
    }
  };
}
function ds(d){ localStorage.setItem(DK,JSON.stringify(d)); }

let DB = dl();
// migrate
if(!DB.teachers) DB.teachers=[];
if(!DB.teacherSubjects) DB.teacherSubjects={};
if(!DB.classSubjects) DB.classSubjects={};
if(!DB.subjectPeriods) DB.subjectPeriods={};
if(!DB.users || !DB.users.length) DB.users=[{role:'hod',username:'admin',password:'admin123',linked:''}];
if(!DB.config) DB.config={periodDur:45,periodsPerDay:6,startTime:'08:00',sb1After:2,sb1Dur:15,sb2After:4,sb2Dur:15,lunchAfter:5,lunchDur:45};

// ══════════════════════════════════════════
// SESSION (persisted across page refresh)
// ══════════════════════════════════════════
const SK = 'stt_session_v1';
function saveSession(s){ try{ localStorage.setItem(SK, JSON.stringify(s)); }catch(e){} }
function loadSession(){ try{ const r=localStorage.getItem(SK); if(r) return JSON.parse(r); }catch(e){} return null; }
function clearSession(){ try{ localStorage.removeItem(SK); }catch(e){} }

let SESSION = null; // { role, username, linked }
let loginRole = 'hod';

function setLoginRole(r){
  loginRole=r;
  ['hod','teacher','student'].forEach(x=>{
    g('rtab-'+x).classList.toggle('active',x===r);
  });
  const hints={hod:'HOD: <code>admin</code> / <code>admin123</code>',
               teacher:'Enter your teacher account credentials',
               student:'Enter your student account credentials'};
  g('lhint-text').innerHTML=hints[r];
}
function updateLoginHint(){}

function doLogin(){
  const u=g('iu').value.trim(), p=g('ip').value;
  // find user matching username, password AND role
  const user=DB.users.find(x=>x.username===u && x.password===p &&
    (loginRole==='hod'?x.role==='hod':loginRole==='teacher'?x.role==='teacher':x.role==='student'));
  if(user){
    SESSION={role:user.role,username:user.username,linked:user.linked||''};
    saveSession(SESSION);
    g('login-screen').style.display='none';
    g('app').style.display='block';
    initApp();
  } else {
    g('lerr').textContent='⚠ Invalid credentials or wrong role tab selected.';
    g('ip').value=''; g('ip').focus();
  }
}
function doLogout(){
  SESSION=null;
  clearSession();
  g('login-screen').style.display='flex';
  g('app').style.display='none';
  g('iu').value=''; g('ip').value=''; g('lerr').textContent='';
  setLoginRole('hod');
}
function initApp(){
  DB=dl();
  // Topbar
  const initials=SESSION.username.charAt(0).toUpperCase();
  g('tb-av').textContent=initials;
  g('tb-uname').textContent=SESSION.username;
  const roleLabels={hod:'HOD',teacher:'Teacher',student:'Student'};
  const roleClasses={hod:'role-hod',teacher:'role-teacher',student:'role-student'};
  const roleBadge=g('tb-role');
  roleBadge.textContent=roleLabels[SESSION.role];
  roleBadge.className='tb-role-badge '+roleClasses[SESSION.role];
  // Sidebar visibility
  g('sid-admin-nav').style.display=SESSION.role==='hod'?'block':'none';
  g('sid-teacher-nav').style.display=SESSION.role==='teacher'?'block':'none';
  g('sid-student-nav').style.display=SESSION.role==='student'?'block':'none';
  // Nav to right landing page
  if(SESSION.role==='hod'){
    nav('dashboard'); updateBadges();
  } else if(SESSION.role==='teacher'){
    nav('my-timetable');
  } else {
    nav('student-timetable');
  }
}

// ══════════════════════════════════════════
// NAV
// ══════════════════════════════════════════
const PAGES=['dashboard','subjects','classes','teachers','teacher-subjects','class-subjects',
  'timetable','users','config','my-timetable','student-timetable','settings'];
function nav(name){
  PAGES.forEach(p=>{
    const pe=g('page-'+p); if(pe) pe.classList.toggle('active',p===name);
    const ne=g('n-'+p); if(ne) ne.classList.toggle('active',p===name);
  });
  if(name==='dashboard') renderDashboard();
  if(name==='subjects') renderSubjects();
  if(name==='classes') renderClasses();
  if(name==='teachers') renderTeachers();
  if(name==='teacher-subjects') initTSPage();
  if(name==='class-subjects') initCSPage();
  if(name==='users') renderUsersPage();
  if(name==='config') renderConfigPage();
  if(name==='my-timetable') renderMyTimetable();
  if(name==='student-timetable') renderStudentTimetable();
  if(name==='settings') renderSettingsPage();
}

// ══════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════
function g(x){ return document.getElementById(x); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sv(){ ds(DB); updateBadges(); }
function sa(bid,msg,type='warn'){
  const b=g(bid); b.className=`alert alert-${type} show`;
  b.querySelector('span:first-child').textContent=msg;
}
function ha(bid){ const b=g(bid); if(b) b.classList.remove('show'); }
function toast(msg,type='ok'){
  const icons={ok:'✓',err:'✕',warn:'⚠',info:'ℹ'};
  const el=document.createElement('div');
  el.className=`toast t-${type}`;
  el.innerHTML=`<span>${icons[type]||'•'}</span> ${esc(msg)}`;
  g('tc').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=>el.remove(),400); },3000);
}
function shuf(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function q(s){ return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

function updateBadges(){
  if(SESSION&&SESSION.role!=='hod') return;
  const bs=g('b-sub'),bc=g('b-cls'),bt=g('b-tch');
  if(bs) bs.textContent=DB.subjects.length;
  if(bc) bc.textContent=DB.classes.length;
  if(bt) bt.textContent=DB.teachers.length;
}
const SCOLS=['pc-b','pc-g','pc-o','pc-p','pc-t','pc-r','pc-y','pc-i','pc-c'];
const CCOLS=['c-blue','c-green','c-orange','c-purple','c-teal','c-gray','c-red','c-pink','c-yellow','c-indigo'];
let subColorMap={};
function getSC(s){
  if(!subColorMap[s]){ subColorMap[s]=SCOLS[Object.keys(subColorMap).length%SCOLS.length]; }
  return subColorMap[s];
}
function getCC(s){ const i=DB.subjects.indexOf(s); return CCOLS[(i<0?0:i)%CCOLS.length]; }
function getTeacherForSubject(sub){
  for(const [tch,subs] of Object.entries(DB.teacherSubjects)){
    if(subs.includes(sub)) return tch;
  }
  return '';
}
function buildCTMap(){
  const map={};
  for(const cls of DB.classes){
    const subs=DB.classSubjects[cls]||[];
    for(const sub of subs){
      const tch=getTeacherForSubject(sub);
      if(tch) map[`${cls}_${sub}`]=tch;
    }
  }
  return map;
}
function emptyState(ico,msg,hint){
  return `<div class="empty"><div class="empty-ico">${ico}</div><p>${msg}</p><small>${hint}</small></div>`;
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
function renderDashboard(){
  if(!SESSION) return;
  const totalTS=Object.values(DB.teacherSubjects).reduce((a,b)=>a+b.length,0);
  const totalCS=Object.values(DB.classSubjects).reduce((a,b)=>a+b.length,0);
  const ctMap=buildCTMap();
  if(SESSION.role==='hod'){
    g('dash-wf-card').style.display='block';
    g('sg').innerHTML=[
      {ico:'📚',num:DB.subjects.length,lbl:'Subjects',bg:'#eff6ff',page:'subjects'},
      {ico:'🏫',num:DB.classes.length,lbl:'Classes',bg:'#f0fdf4',page:'classes'},
      {ico:'👨‍🏫',num:DB.teachers.length,lbl:'Teachers',bg:'#fff7ed',page:'teachers'},
      {ico:'🔗',num:totalTS,lbl:'Teacher-Subject Links',bg:'#f5f3ff',page:'teacher-subjects'},
      {ico:'📋',num:totalCS,lbl:'Class-Subject Links',bg:'#f0fdfa',page:'class-subjects'},
      {ico:'🎯',num:Object.keys(ctMap).length,lbl:'Ready Mappings',bg:'#fef9c3',page:'timetable'},
    ].map(s=>`<div class="sc" onclick="nav('${s.page}')">
      <div class="sc-icon" style="background:${s.bg}">${s.ico}</div>
      <div><div class="sc-num">${s.num}</div><div class="sc-lbl">${s.lbl}</div></div>
    </div>`).join('');
    const subsDone=DB.subjects.length>0, clsDone=DB.classes.length>0, tchDone=DB.teachers.length>0;
    const tsDone=totalTS>0, csDone=totalCS>0;
    const steps=[
      {label:'Add Subjects',hint:`${DB.subjects.length} subject(s) added`,done:subsDone,page:'subjects'},
      {label:'Add Classes',hint:`${DB.classes.length} class(es) added`,done:clsDone,page:'classes'},
      {label:'Add Teachers',hint:`${DB.teachers.length} teacher(s) added`,done:tchDone,page:'teachers'},
      {label:'Assign Subjects to Teachers',hint:`${totalTS} link(s) made`,done:tsDone,page:'teacher-subjects'},
      {label:'Assign Subjects to Classes',hint:`${totalCS} link(s) made`,done:csDone,page:'class-subjects'},
      {label:'Generate Timetable',hint:'Final step — generate the schedule',done:false,page:'timetable'},
    ];
    const firstPending=steps.findIndex(s=>!s.done);
    g('wf').innerHTML=steps.map((s,i)=>{
      const isDone=s.done, isActive=i===firstPending&&!s.done;
      return `<div class="wf-row${isDone?' wf-done':isActive?' wf-active':''}" onclick="nav('${s.page}')">
        <div class="wf-num">${isDone?'✓':i+1}</div>
        <div class="wf-info">
          <div class="wf-label">${s.label}</div>
          <div class="wf-hint">${s.hint}</div>
        </div>
        <div class="wf-status">${isDone?'Done ✓':isActive?'→ Do Now':'Pending'}</div>
      </div>`;
    }).join('');
    if(DB.classes.length>0){
      g('dash-cls-card').style.display='block';
      let h='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">';
      DB.classes.forEach(cls=>{
        const subs=DB.classSubjects[cls]||[];
        const mapped=subs.filter(s=>getTeacherForSubject(s)).length;
        const ok=subs.length>0&&mapped===subs.length;
        h+=`<div style="background:${ok?'var(--green-soft)':'#fafbfc'};border:1px solid ${ok?'var(--green-border)':'var(--border)'};border-radius:9px;padding:12px 14px">
          <div style="font-weight:800;font-size:.88rem;margin-bottom:6px"><span class="chip c-blue">${esc(cls)}</span></div>
          <div style="font-size:.77rem;color:var(--muted)">${subs.length} subject(s) assigned</div>
          <div style="font-size:.77rem;font-weight:700;color:${ok?'var(--green)':'var(--yellow)'}">
            ${subs.length?`${mapped}/${subs.length} have teacher`:'No subjects yet'}
          </div>
        </div>`;
      });
      h+='</div>'; g('dash-cls').innerHTML=h;
    } else { g('dash-cls-card').style.display='none'; }
  }
}

// ══════════════════════════════════════════
// STEP 1 — SUBJECTS
// ══════════════════════════════════════════
function addSubject(){
  const inp=g('i-sub'), name=inp.value.trim();
  if(!name){ sa('al-sub','Subject name cannot be empty.'); inp.classList.add('inp-err'); inp.focus(); return; }
  inp.classList.remove('inp-err');
  if(DB.subjects.some(s=>s.toLowerCase()===name.toLowerCase())){
    sa('al-sub',`⚠ "${name}" already exists!`,'warn'); inp.select(); return;
  }
  DB.subjects.push(name); sv(); inp.value='';
  toast(`Subject "${name}" added.`); renderSubjects(); renderDashboard();
}
function delSubject(name){
  if(!confirm(`Delete subject "${name}"?\n\nThis will remove it from all teacher and class assignments.`)) return;
  DB.subjects=DB.subjects.filter(s=>s!==name);
  for(const t in DB.teacherSubjects) DB.teacherSubjects[t]=DB.teacherSubjects[t].filter(s=>s!==name);
  for(const c in DB.classSubjects) DB.classSubjects[c]=DB.classSubjects[c].filter(s=>s!==name);
  sv(); toast(`Subject "${name}" deleted.`,'warn'); renderSubjects(); renderDashboard();
}
function startEditSub(i){
  const old=DB.subjects[i];
  g('sub-n-'+i).innerHTML=`<input class="iedit" id="se-${i}" value="${esc(old)}"/>
    <button class="btn btn-p btn-sm" style="margin-left:6px" onclick="saveEditSub(${i},'${q(old)}')">Save</button>
    <button class="btn btn-ghost btn-sm" style="margin-left:4px" onclick="renderSubjects()">Cancel</button>`;
  const inp=g('se-'+i); inp.focus(); inp.select();
}
function saveEditSub(i,old){
  const n=g('se-'+i).value.trim();
  if(!n){ toast('Name cannot be empty.','err'); return; }
  if(n.toLowerCase()!==old.toLowerCase()&&DB.subjects.some(s=>s.toLowerCase()===n.toLowerCase())){
    toast(`"${n}" already exists.`,'warn'); return;
  }
  DB.subjects[i]=n;
  for(const t in DB.teacherSubjects) DB.teacherSubjects[t]=DB.teacherSubjects[t].map(s=>s===old?n:s);
  for(const c in DB.classSubjects) DB.classSubjects[c]=DB.classSubjects[c].map(s=>s===old?n:s);
  sv(); toast(`Renamed to "${n}".`); renderSubjects();
}
function renderSubjects(){
  const cnt=DB.subjects.length; const cel=g('c-sub'); if(cel) cel.textContent=cnt?`(${cnt})`:'';
  updateBadges();
  if(!cnt){ g('sub-list').innerHTML=emptyState('📚','No subjects yet','Add your first subject above'); return; }
  let h=`<div class="tw"><table class="dt"><thead><tr><th>#</th><th>Subject</th><th>Tag</th><th>Assigned Teachers</th><th>Actions</th></tr></thead><tbody>`;
  DB.subjects.forEach((s,i)=>{
    const tch=getTeacherForSubject(s);
    h+=`<tr>
      <td style="color:var(--muted);font-weight:700">${i+1}</td>
      <td id="sub-n-${i}"><span class="chip ${getCC(s)}">${esc(s)}</span></td>
      <td><span class="chip ${getCC(s)}">${esc(s)}</span></td>
      <td>${tch?`<span class="chip c-teal">👤 ${esc(tch)}</span>`:'<span style="color:var(--muted);font-size:.78rem">Not assigned</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-w btn-sm" onclick="startEditSub(${i})">✏️ Edit</button>
        <button class="btn btn-d btn-sm" style="margin-left:5px" onclick="delSubject('${q(s)}')">🗑️</button>
      </td></tr>`;
  });
  h+='</tbody></table></div>';
  g('sub-list').innerHTML=h;
}

// ══════════════════════════════════════════
// STEP 2 — CLASSES
// ══════════════════════════════════════════
function addClass(){
  const inp=g('i-cls'), name=inp.value.trim();
  if(!name){ sa('al-cls','Class name cannot be empty.'); inp.classList.add('inp-err'); inp.focus(); return; }
  inp.classList.remove('inp-err');
  if(DB.classes.some(c=>c.toLowerCase()===name.toLowerCase())){
    sa('al-cls',`⚠ "${name}" already exists!`,'warn'); inp.select(); return;
  }
  DB.classes.push(name); sv(); inp.value='';
  toast(`Class "${name}" added.`); renderClasses(); renderDashboard();
}
function delClass(name){
  if(!confirm(`Delete class "${name}"?\n\nThis removes all its subject assignments.`)) return;
  DB.classes=DB.classes.filter(c=>c!==name);
  delete DB.classSubjects[name];
  sv(); toast(`Class "${name}" deleted.`,'warn'); renderClasses(); renderDashboard();
}
function startEditCls(i){
  const old=DB.classes[i];
  g('cls-n-'+i).innerHTML=`<input class="iedit" id="ce-${i}" value="${esc(old)}"/>
    <button class="btn btn-p btn-sm" style="margin-left:6px" onclick="saveEditCls(${i},'${q(old)}')">Save</button>
    <button class="btn btn-ghost btn-sm" style="margin-left:4px" onclick="renderClasses()">Cancel</button>`;
  const inp=g('ce-'+i); inp.focus(); inp.select();
}
function saveEditCls(i,old){
  const n=g('ce-'+i).value.trim();
  if(!n){ toast('Name cannot be empty.','err'); return; }
  if(n.toLowerCase()!==old.toLowerCase()&&DB.classes.some(c=>c.toLowerCase()===n.toLowerCase())){
    toast(`"${n}" already exists.`,'warn'); return;
  }
  DB.classes[i]=n;
  if(DB.classSubjects[old]){ DB.classSubjects[n]=DB.classSubjects[old]; delete DB.classSubjects[old]; }
  sv(); toast(`Renamed to "${n}".`); renderClasses();
}
function renderClasses(){
  const cnt=DB.classes.length; const cel=g('c-cls'); if(cel) cel.textContent=cnt?`(${cnt})`:'';
  updateBadges();
  if(!cnt){ g('cls-list').innerHTML=emptyState('🏫','No classes yet','Add your first class above'); return; }
  let h=`<div class="tw"><table class="dt"><thead><tr><th>#</th><th>Class</th><th>Subjects Assigned</th><th>Teacher Coverage</th><th>Actions</th></tr></thead><tbody>`;
  DB.classes.forEach((c,i)=>{
    const subs=DB.classSubjects[c]||[];
    const mapped=subs.filter(s=>getTeacherForSubject(s)).length;
    const ok=subs.length>0&&mapped===subs.length;
    h+=`<tr>
      <td style="color:var(--muted);font-weight:700">${i+1}</td>
      <td id="cls-n-${i}"><span class="chip c-blue">${esc(c)}</span></td>
      <td>${subs.length?subs.map(s=>`<span class="chip ${getCC(s)}">${esc(s)}</span>`).join(''):'<span style="color:var(--muted);font-size:.78rem">None yet</span>'}</td>
      <td style="font-weight:700;font-size:.84rem;color:${ok?'var(--green)':subs.length?'var(--yellow)':'var(--muted)'}">
        ${subs.length?`${mapped}/${subs.length} mapped`:'—'}
      </td>
      <td style="white-space:nowrap">
        <button class="btn btn-w btn-sm" onclick="startEditCls(${i})">✏️ Edit</button>
        <button class="btn btn-d btn-sm" style="margin-left:5px" onclick="delClass('${q(c)}')">🗑️</button>
      </td></tr>`;
  });
  h+='</tbody></table></div>'; g('cls-list').innerHTML=h;
}

// ══════════════════════════════════════════
// STEP 3 — TEACHERS
// ══════════════════════════════════════════
function addTeacher(){
  const inp=g('i-tch'), name=inp.value.trim();
  if(!name){ sa('al-tch','Teacher name cannot be empty.'); inp.classList.add('inp-err'); inp.focus(); return; }
  inp.classList.remove('inp-err');
  if(DB.teachers.some(t=>t.toLowerCase()===name.toLowerCase())){
    sa('al-tch',`⚠ "${name}" already exists!`,'warn'); inp.select(); return;
  }
  DB.teachers.push(name); sv(); inp.value='';
  toast(`Teacher "${name}" added.`); renderTeachers(); renderDashboard();
}
function delTeacher(name){
  if(!confirm(`Delete teacher "${name}"?\n\nThis removes all their subject assignments.`)) return;
  DB.teachers=DB.teachers.filter(t=>t!==name);
  delete DB.teacherSubjects[name];
  sv(); toast(`Teacher "${name}" deleted.`,'warn'); renderTeachers(); renderDashboard();
}
function startEditTch(i){
  const old=DB.teachers[i];
  g('tch-n-'+i).innerHTML=`<input class="iedit" id="te-${i}" value="${esc(old)}"/>
    <button class="btn btn-p btn-sm" style="margin-left:6px" onclick="saveEditTch(${i},'${q(old)}')">Save</button>
    <button class="btn btn-ghost btn-sm" style="margin-left:4px" onclick="renderTeachers()">Cancel</button>`;
  const inp=g('te-'+i); inp.focus(); inp.select();
}
function saveEditTch(i,old){
  const n=g('te-'+i).value.trim();
  if(!n){ toast('Name cannot be empty.','err'); return; }
  if(n.toLowerCase()!==old.toLowerCase()&&DB.teachers.some(t=>t.toLowerCase()===n.toLowerCase())){
    toast(`"${n}" already exists.`,'warn'); return;
  }
  DB.teachers[i]=n;
  if(DB.teacherSubjects[old]){ DB.teacherSubjects[n]=DB.teacherSubjects[old]; delete DB.teacherSubjects[old]; }
  sv(); toast(`Renamed to "${n}".`); renderTeachers();
}
function renderTeachers(){
  const cnt=DB.teachers.length; const cel=g('c-tch'); if(cel) cel.textContent=cnt?`(${cnt})`:'';
  updateBadges();
  if(!cnt){ g('tch-list').innerHTML=emptyState('👨‍🏫','No teachers yet','Add your first teacher above'); return; }
  let h=`<div class="tw"><table class="dt"><thead><tr><th>#</th><th>Teacher</th><th>Subjects They Teach</th><th>Actions</th></tr></thead><tbody>`;
  DB.teachers.forEach((t,i)=>{
    const subs=DB.teacherSubjects[t]||[];
    h+=`<tr>
      <td style="color:var(--muted);font-weight:700">${i+1}</td>
      <td id="tch-n-${i}">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="av" style="width:28px;height:28px;font-size:.7rem">${t.charAt(0).toUpperCase()}</div>
          <span style="font-weight:700">${esc(t)}</span>
        </div>
      </td>
      <td>${subs.length?subs.map(s=>`<span class="chip ${getCC(s)}">${esc(s)}</span>`).join(''):'<span style="color:var(--muted);font-size:.78rem">None assigned yet</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-w btn-sm" onclick="startEditTch(${i})">✏️ Edit</button>
        <button class="btn btn-d btn-sm" style="margin-left:5px" onclick="delTeacher('${q(t)}')">🗑️</button>
      </td></tr>`;
  });
  h+='</tbody></table></div>'; g('tch-list').innerHTML=h;
}

// ══════════════════════════════════════════
// STEP 4 — TEACHER → SUBJECTS
// ══════════════════════════════════════════
function initTSPage(){
  const sel=g('ts-sel-tch');
  sel.innerHTML='<option value="">— Choose a teacher —</option>';
  DB.teachers.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o); });
  g('ts-panel').style.display='none';
  g('ts-hint').textContent=DB.teachers.length?'Select a teacher above to assign subjects.':'⚠ No teachers yet. Add teachers in Step 3 first.';
  renderTSSummary();
}
function onTSTeacherChange(){
  const tch=g('ts-sel-tch').value, panel=g('ts-panel'), hint=g('ts-hint');
  if(!tch){ panel.style.display='none'; hint.textContent='Select a teacher above.'; return; }
  if(!DB.subjects.length){ panel.style.display='none'; hint.textContent='⚠ No subjects yet. Add subjects in Step 1 first.'; return; }
  hint.textContent='';
  const assigned=DB.teacherSubjects[tch]||[];
  g('ts-checks').innerHTML=DB.subjects.map(s=>`
    <label class="citem${assigned.includes(s)?' on':''}" onclick="toggleCI(this)">
      <input type="checkbox" value="${esc(s)}" ${assigned.includes(s)?'checked':''}/>
      ${esc(s)}
    </label>`).join('');
  panel.style.display='block';
}
function toggleCI(label){ setTimeout(()=>{ const cb=label.querySelector('input'); label.classList.toggle('on',cb.checked); },0); }
function tsAll(v){
  g('ts-checks').querySelectorAll('input').forEach(cb=>{ cb.checked=v; cb.closest('label').classList.toggle('on',v); });
}
function saveTSAssign(){
  const tch=g('ts-sel-tch').value;
  if(!tch){ toast('Select a teacher first.','warn'); return; }
  const selected=[...g('ts-checks').querySelectorAll('input:checked')].map(cb=>cb.value);
  const clashes=[];
  selected.forEach(sub=>{
    const existing=getTeacherForSubject(sub);
    if(existing && existing!==tch) clashes.push(`"${sub}" is already assigned to ${existing}`);
  });
  if(clashes.length){
    toast(`Cannot save — clash detected: ${clashes.join('; ')}. Remove from the other teacher first.`,'err');
    return;
  }
  DB.teacherSubjects[tch]=selected;
  sv(); toast(`${tch} → ${selected.length} subject(s) saved.`);
  renderTSSummary(); renderSubjects(); renderTeachers(); renderDashboard();
}
function renderTSSummary(){
  const entries=DB.teachers.filter(t=>DB.teacherSubjects[t]&&DB.teacherSubjects[t].length);
  if(!entries.length){
    g('ts-summary').innerHTML=emptyState('🔗','No teacher-subject links yet','Assign subjects to teachers using the form above'); return;
  }
  let h=`<div class="tw"><table class="dt"><thead><tr><th>Teacher</th><th>Subjects They Handle</th><th>Count</th><th>Action</th></tr></thead><tbody>`;
  entries.forEach(t=>{
    const subs=DB.teacherSubjects[t]||[];
    h+=`<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="av" style="width:26px;height:26px;font-size:.68rem">${t.charAt(0).toUpperCase()}</div>
        <span style="font-weight:700">${esc(t)}</span>
      </div></td>
      <td>${subs.map(s=>`<span class="chip ${getCC(s)}">${esc(s)}</span>`).join('')}</td>
      <td style="font-weight:800;color:var(--accent)">${subs.length}</td>
      <td><button class="btn btn-d btn-sm" onclick="clearTSForTeacher('${q(t)}')">🗑️ Clear</button></td>
    </tr>`;
  });
  h+='</tbody></table></div>'; g('ts-summary').innerHTML=h;
}
function clearTSForTeacher(tch){
  if(!confirm(`Remove all subject assignments from ${tch}?`)) return;
  delete DB.teacherSubjects[tch]; sv(); toast(`Assignments cleared for ${tch}.`,'warn');
  renderTSSummary(); onTSTeacherChange(); renderSubjects(); renderTeachers(); renderDashboard();
}

// ══════════════════════════════════════════
// STEP 5 — CLASS → SUBJECTS (with periods/week)
// ══════════════════════════════════════════
let _ppwCls='', _ppwSub='', _ppwCb=null;

function initCSPage(){
  const sel=g('cs-sel-cls');
  sel.innerHTML='<option value="">— Choose a class —</option>';
  DB.classes.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
  g('cs-panel').style.display='none';
  g('cs-hint').textContent=DB.classes.length?'Select a class above.':'⚠ No classes yet. Add classes in Step 2 first.';
  renderCSSummary();
}
function onCSClassChange(){
  const cls=g('cs-sel-cls').value, panel=g('cs-panel'), hint=g('cs-hint');
  if(!cls){ panel.style.display='none'; hint.textContent='Select a class above.'; return; }
  const readySubs=DB.subjects.filter(s=>getTeacherForSubject(s));
  if(!readySubs.length){
    panel.style.display='none';
    hint.textContent='⚠ No subjects have a teacher assigned yet. Complete Step 4 first.'; return;
  }
  hint.textContent='';
  const assigned=DB.classSubjects[cls]||[];
  let html='<div style="display:flex;flex-direction:column;gap:6px">';
  readySubs.forEach(s=>{
    const tch=getTeacherForSubject(s);
    const isOn=assigned.includes(s);
    const ppw=DB.subjectPeriods[`${cls}_${s}`]||5;
    html+=`<div class="ts-row${isOn?' on':''}" id="csrow-${esc(s).replace(/\s/g,'_')}"
        style="display:flex;align-items:center;gap:10px;padding:10px 13px;border:1.5px solid var(--border);border-radius:9px;background:${isOn?'var(--accent-soft)':'#fafbfc'}">
      <input type="checkbox" value="${esc(s)}" id="cscb-${esc(s).replace(/\s/g,'_')}" ${isOn?'checked':''}
        onchange="onCSSubCheck(this,'${q(cls)}','${q(s)}')" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0"/>
      <span style="flex:1;font-weight:700;font-size:.875rem"><span class="chip ${getCC(s)}" style="margin:0">${esc(s)}</span></span>
      <span style="font-size:.72rem;font-weight:700;color:var(--green)">👤 ${esc(tch)}</span>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        <span style="font-size:.72rem;font-weight:700;color:var(--muted)">periods/week:</span>
        <span id="ppw-disp-${esc(s).replace(/\s/g,'_')}"
          style="display:${isOn?'inline-flex':'none'};align-items:center;gap:5px;background:#f1f5f9;padding:4px 9px;border-radius:7px;font-size:.82rem;font-weight:800;color:var(--accent);cursor:pointer"
          onclick="askPPW('${q(cls)}','${q(s)}')">
          ${ppw} <span style="font-size:.68rem;opacity:.65">✏️</span>
        </span>
      </div>
    </div>`;
  });
  html+='</div>';
  g('cs-checks').innerHTML=html;
  panel.style.display='block';
}
function onCSSubCheck(cb, cls, sub){
  const key=sub.replace(/\s/g,'_');
  const row=document.getElementById('csrow-'+key);
  const disp=document.getElementById('ppw-disp-'+key);
  if(cb.checked){
    row.style.background='var(--accent-soft)';
    // Ask how many periods/week are required for this subject in this class
    askPPW(cls, sub, cb);
  } else {
    row.style.background='#fafbfc';
    if(disp) disp.style.display='none';
  }
}
function askPPW(cls, sub, cb){
  _ppwCls=cls; _ppwSub=sub; _ppwCb=cb||null;
  g('ppw-sub-name').textContent=sub;
  g('ppw-cls-name').textContent=cls;
  g('ppw-val').value=DB.subjectPeriods[`${cls}_${sub}`]||5;
  g('ppw-modal').classList.add('open');
  setTimeout(()=>{ g('ppw-val').focus(); g('ppw-val').select(); },50);
}
function closePPWModal(){
  // If this prompt was triggered by freshly checking a box and the user cancels,
  // uncheck it again so no periods/week value is left unset.
  if(_ppwCb && !DB.subjectPeriods[`${_ppwCls}_${_ppwSub}`]){
    _ppwCb.checked=false;
    onCSSubCheck(_ppwCb, _ppwCls, _ppwSub);
  }
  g('ppw-modal').classList.remove('open');
  _ppwCls=''; _ppwSub=''; _ppwCb=null;
}
function confirmPPW(){
  const val=Math.max(1,parseInt(g('ppw-val').value)||1);
  DB.subjectPeriods[`${_ppwCls}_${_ppwSub}`]=val;
  ds(DB);
  const key=_ppwSub.replace(/\s/g,'_');
  const disp=document.getElementById('ppw-disp-'+key);
  if(disp){ disp.style.display='inline-flex'; disp.innerHTML=`${val} <span style="font-size:.68rem;opacity:.65">✏️</span>`; }
  g('ppw-modal').classList.remove('open');
  toast(`${_ppwSub}: ${val} period(s)/week for ${_ppwCls}.`);
  _ppwCls=''; _ppwSub=''; _ppwCb=null;
}
function csAll(v){
  const cls=g('cs-sel-cls').value;
  g('cs-checks').querySelectorAll('input[type=checkbox]').forEach(cb=>{
    if(cb.checked===v) return;
    cb.checked=v;
    const sub=cb.value;
    const key=sub.replace(/\s/g,'_');
    const row=document.getElementById('csrow-'+key);
    const disp=document.getElementById('ppw-disp-'+key);
    if(v){
      row.style.background='var(--accent-soft)';
      // default to existing or 5 without popping a dialog for bulk "select all"
      const existing=DB.subjectPeriods[`${cls}_${sub}`]||5;
      DB.subjectPeriods[`${cls}_${sub}`]=existing;
      if(disp){ disp.style.display='inline-flex'; disp.innerHTML=`${existing} <span style="font-size:.68rem;opacity:.65">✏️</span>`; }
    } else {
      row.style.background='#fafbfc';
      if(disp) disp.style.display='none';
    }
  });
  if(v) ds(DB);
}
function saveCSAssign(){
  const cls=g('cs-sel-cls').value;
  if(!cls){ toast('Select a class first.','warn'); return; }
  const selected=[...g('cs-checks').querySelectorAll('input[type=checkbox]:checked')].map(cb=>cb.value);
  // Ensure every selected subject has a periods/week value (fallback to 5 if somehow missing)
  selected.forEach(sub=>{
    const key=`${cls}_${sub}`;
    if(!DB.subjectPeriods[key]) DB.subjectPeriods[key]=5;
  });
  DB.classSubjects[cls]=selected;
  sv(); toast(`Subjects saved for class "${cls}".`);
  renderCSSummary(); renderClasses(); renderDashboard();
}
function renderCSSummary(){
  const entries=DB.classes.filter(c=>DB.classSubjects[c]&&DB.classSubjects[c].length);
  if(!entries.length){
    g('cs-summary').innerHTML=emptyState('📋','No class-subject links yet','Assign subjects to classes using the form above'); return;
  }
  let h=`<div class="tw"><table class="dt"><thead><tr><th>Class</th><th>Subjects</th><th>Teachers</th><th>Periods/Week</th><th>Ready?</th></tr></thead><tbody>`;
  entries.forEach(cls=>{
    const subs=DB.classSubjects[cls]||[];
    const mapped=subs.filter(s=>getTeacherForSubject(s));
    const ok=mapped.length===subs.length&&subs.length>0;
    h+=`<tr>
      <td><span class="chip c-blue">${esc(cls)}</span></td>
      <td>${subs.map(s=>`<span class="chip ${getCC(s)}">${esc(s)}</span>`).join('')}</td>
      <td>${subs.map(s=>{const t=getTeacherForSubject(s);return t?`<span class="chip c-teal" style="font-size:.72rem">${esc(t)}</span>`:'<span class="chip c-gray" style="font-size:.72rem">TBA</span>';}).join('')}</td>
      <td style="font-size:.78rem">${subs.map(s=>`<span style="margin:2px;display:inline-block;background:#f1f5f9;padding:2px 7px;border-radius:6px;font-weight:700">${esc(s)}: ${DB.subjectPeriods[cls+'_'+s]||5}/wk</span>`).join('')}</td>
      <td style="font-weight:800;font-size:.84rem;color:${ok?'var(--green)':'var(--yellow)'}">
        ${ok?'✅ Ready':`${mapped.length}/${subs.length} mapped`}
      </td>
    </tr>`;
  });
  h+='</tbody></table></div>'; g('cs-summary').innerHTML=h;
}

// ══════════════════════════════════════════
// STEP 6 — GENERATE TIMETABLE
// ══════════════════════════════════════════
// Build period schedule from config
function buildPDEFS(){
  const cfg=DB.config;
  const slots=[];
  let cur=parseTime(cfg.startTime);
  const dur=cfg.periodDur||45;
  const n=cfg.periodsPerDay||6;
  const sb1After=cfg.sb1After||2, sb1Dur=cfg.sb1Dur||15;
  const sb2After=cfg.sb2After||4, sb2Dur=cfg.sb2Dur||15;
  const lunchAfter=cfg.lunchAfter||5, lunchDur=cfg.lunchDur||45;
  for(let p=1;p<=n;p++){
    const end=addMin(cur,dur);
    slots.push({id:'p'+p,label:'P'+p,time:fmtRange(cur,end),type:'period'});
    cur=end;
    if(p===sb1After && sb1After<n){
      const be=addMin(cur,sb1Dur);
      slots.push({id:'sb1',label:'Short Break',time:fmtRange(cur,be),type:'break'});
      cur=be;
    }
    if(p===sb2After && sb2After!==sb1After && sb2After<n){
      const be=addMin(cur,sb2Dur);
      slots.push({id:'sb2',label:'Short Break',time:fmtRange(cur,be),type:'break'});
      cur=be;
    }
    if(p===lunchAfter && lunchAfter<n){
      const be=addMin(cur,lunchDur);
      slots.push({id:'lunch',label:'Lunch',time:fmtRange(cur,be),type:'break'});
      cur=be;
    }
  }
  return slots;
}
function parseTime(t){
  const [h,m]=(t||'08:00').split(':').map(Number); return h*60+m;
}
function addMin(t,m){ return t+m; }
function fmtTime(t){ const h=Math.floor(t/60), m=t%60; return `${h}:${String(m).padStart(2,'0')}`; }
function fmtRange(s,e){ return `${fmtTime(s)}–${fmtTime(e)}`; }

const D5=['Monday','Tuesday','Wednesday','Thursday','Friday'];
const D6=[...D5,'Saturday'];

function getSlots(n){
  const pdefs=buildPDEFS();
  // n is periods count; just return all slots from pdefs (already respects config)
  return pdefs;
}

let curTT=null;

function generateTimetable(){
  if(!DB.classes.length){ toast('No classes found. Add classes first.','err'); return; }
  const periods=parseInt(g('tt-p').value);
  const days=parseInt(g('tt-d').value)===6?D6:D5;
  const ctMap=buildCTMap();

  // Build weighted subject pool respecting periods/week
  // teacherBusy[day][periodIndex] = Set of teacher names
  const teacherBusy={};
  days.forEach(d=>{ teacherBusy[d]={}; for(let p=0;p<periods;p++) teacherBusy[d][p]=new Set(); });

  const timetable={};
  const clashLog=[];
  const totalSlots=periods*days.length;

  for(const cls of DB.classes){
    const rawSubs=DB.classSubjects[cls]||[];
    if(!rawSubs.length){ timetable[cls]=null; continue; }

    // Build weighted pool: each subject repeated by its periods/week setting
    // Normalise to fit totalSlots
    let weightedPool=[];
    rawSubs.forEach(s=>{
      const ppw=DB.subjectPeriods[`${cls}_${s}`]||5;
      // scale per-week to the actual days count (may be 5 or 6)
      const scaled=Math.round(ppw*(days.length/5));
      for(let i=0;i<Math.max(1,scaled);i++) weightedPool.push(s);
    });

    const schedule={};
    // Reset teacher busy per class (clash prevention across classes is global)
    days.forEach(day=>{
      const daySlots=[];
      let pool=shuf([...weightedPool]);
      let last=null;

      for(let p=0;p<periods;p++){
        let candidates=pool.filter(s=>{
          if(s===last) return false;
          const tch=ctMap[`${cls}_${s}`]||'';
          if(!tch) return true;
          return !teacherBusy[day][p].has(tch);
        });
        if(!candidates.length){
          candidates=rawSubs.filter(s=>{
            const tch=ctMap[`${cls}_${s}`]||'';
            return !tch||!teacherBusy[day][p].has(tch);
          });
        }
        if(!candidates.length){
          candidates=[...rawSubs];
          const chosen=candidates[Math.floor(Math.random()*candidates.length)];
          const tch=ctMap[`${cls}_${chosen}`]||'TBA';
          clashLog.push(`${cls} / ${day} P${p+1}: ${chosen} (${tch}) — forced`);
          daySlots.push({subject:chosen,teacher:tch,clash:true});
          last=chosen;
          if(!pool.length) pool=shuf([...weightedPool]);
          continue;
        }
        shuf(candidates);
        const chosen=candidates[0];
        const tch=ctMap[`${cls}_${chosen}`]||'TBA';
        if(tch&&tch!=='TBA') teacherBusy[day][p].add(tch);
        daySlots.push({subject:chosen,teacher:tch,clash:false});
        last=chosen;
        const idx=pool.indexOf(chosen);
        if(idx>-1) pool.splice(idx,1);
        if(!pool.length) pool=shuf([...weightedPool]);
      }
      schedule[day]=daySlots;
    });
    timetable[cls]=schedule;
  }

  curTT={timetable,periods,days,ctMap};
  if(clashLog.length){
    toast(`Generated with ${clashLog.length} unavoidable conflict(s). Check red cells.`,'warn');
  } else {
    toast('Timetable generated — zero teacher clashes! 🎉');
  }
  renderTTOut();
}

function renderTTOut(){
  const out=g('tt-out'); out.style.display='block';
  const slots=buildPDEFS();
  let leg='<div style="display:flex;flex-wrap:wrap;gap:7px">';
  slots.forEach(s=>{
    if(s.type==='break'){
      leg+=`<div style="display:flex;align-items:center;gap:5px;font-size:.76rem;font-weight:700;
        background:var(--yellow-soft);border:1px solid var(--yellow-border);border-radius:6px;padding:4px 10px;color:#92400e">
        ${s.id==='lunch'?'🍽':'☕'} ${esc(s.label)} <span style="font-weight:400;color:var(--muted)">${esc(s.time)}</span></div>`;
    } else {
      leg+=`<div style="display:flex;align-items:center;gap:5px;font-size:.76rem;font-weight:700;
        background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:4px 10px">
        <span style="color:var(--accent);font-weight:800">${esc(s.label)}</span>
        <span style="color:var(--muted);font-weight:400">${esc(s.time)}</span></div>`;
    }
  });
  leg+='</div>';
  g('tt-legend').innerHTML=leg;
  g('tt-tabs').innerHTML=DB.classes.map((c,i)=>
    `<div class="ttab${i===0?' active':''}" onclick="switchTTCls('${q(c)}',this)">${esc(c)}</div>`
  ).join('');
  renderTTCls(DB.classes[0]);
}
function switchTTCls(cls,el){
  document.querySelectorAll('.ttab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active'); renderTTCls(cls);
}
function renderTTCls(cls){
  const disp=g('tt-disp');
  const schedule=curTT.timetable[cls];
  const slots=buildPDEFS();
  if(!schedule){
    disp.innerHTML=emptyState('⚠️',`No subjects assigned to ${esc(cls)}`,'Go to Step 5 to assign subjects to this class');
    return;
  }
  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <div style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700">Class ${esc(cls)} — Weekly Timetable</div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="font-size:.77rem;color:var(--muted)">${curTT.days.length} days · ${curTT.periods} periods/day</div>
      <button class="btn btn-ghost btn-sm" onclick="downloadTimetableCSV('${q(cls)}')">⬇️ Download CSV</button>
    </div>
  </div>`;
  h+='<div class="ttwrap"><table class="tttable"><thead><tr><th>Day</th>';
  slots.forEach(s=>{
    h+=s.type==='break'
      ?`<th class="bh">${esc(s.label)}<br><span style="font-weight:400;font-size:.6rem">${esc(s.time)}</span></th>`
      :`<th>${esc(s.label)}<br><span style="font-weight:400;font-size:.61rem;opacity:.8">${esc(s.time)}</span></th>`;
  });
  h+='</tr></thead><tbody>';
  curTT.days.forEach(day=>{
    const ds=schedule[day]||[];
    h+=`<tr><td class="dl">${day}</td>`;
    let pi=0;
    slots.forEach(s=>{
      if(s.type==='break'){
        h+=`<td class="bc"><div class="bl">${s.id==='lunch'?'🍽':'☕'}<br>${esc(s.label)}</div></td>`;
      } else {
        const p=ds[pi]||{};
        const sub=p.subject||'—'; const tch=p.teacher||'TBA'; const clash=p.clash;
        const col=sub!=='—'?getSC(sub):'';
        h+=`<td><div class="pc ${col}">
          <div class="ps">${esc(sub)}</div>
          <div class="pt">👤 ${esc(tch)}</div>
          ${clash?'<div class="clash-badge">⚠ Clash</div>':''}
        </div></td>`;
        pi++;
      }
    });
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  disp.innerHTML=h;
}

// ══════════════════════════════════════════
// DOWNLOAD HELPERS (CSV export — works for class, teacher, student views)
// ══════════════════════════════════════════
function csvCell(v){
  const s=String(v==null?'':v);
  if(/[",\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
function triggerDownload(filename, content, mime){
  const blob=new Blob([content],{type:mime||'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadTimetableCSV(cls){
  if(!curTT||!curTT.timetable[cls]){ toast('No timetable available to download.','warn'); return; }
  const slots=buildPDEFS().filter(s=>s.type==='period');
  const schedule=curTT.timetable[cls];
  const rows=[['Day',...slots.map(s=>`${s.label} (${s.time})`)]];
  curTT.days.forEach(day=>{
    const ds=schedule[day]||[];
    const row=[day];
    slots.forEach((s,pi)=>{
      const p=ds[pi]||{};
      row.push(p.subject?`${p.subject} (${p.teacher||'TBA'})`:'—');
    });
    rows.push(row);
  });
  const csv=rows.map(r=>r.map(csvCell).join(',')).join('\n');
  triggerDownload(`Timetable_${cls.replace(/\s+/g,'_')}.csv`, csv);
  toast(`Timetable for ${cls} downloaded.`);
}
function downloadTeacherCSV(teacherName){
  if(!curTT){ toast('No timetable available to download.','warn'); return; }
  const slots=buildPDEFS().filter(s=>s.type==='period');
  const rows=[['Day',...slots.map(s=>`${s.label} (${s.time})`)]];
  curTT.days.forEach(day=>{
    const row=[day];
    slots.forEach((s,pi)=>{
      let found=null;
      for(const cls of DB.classes){
        const sched=curTT.timetable[cls];
        if(!sched) continue;
        const ds=sched[day]||[];
        if(ds[pi]&&ds[pi].teacher===teacherName){ found={cls,sub:ds[pi].subject}; break; }
      }
      row.push(found?`${found.sub} (${found.cls})`:'—');
    });
    rows.push(row);
  });
  const csv=rows.map(r=>r.map(csvCell).join(',')).join('\n');
  triggerDownload(`My_Timetable_${teacherName.replace(/\s+/g,'_')}.csv`, csv);
  toast('Your timetable has been downloaded.');
}
function downloadStudentCSV(cls){
  downloadTimetableCSV(cls);
}

// ══════════════════════════════════════════
// MANAGE USERS
// ══════════════════════════════════════════
function onUserRoleChange(){
  const role=g('u-role').value;
  const wrap=g('u-link-wrap');
  const lbl=g('u-link-label');
  const sel=g('u-link');
  if(role==='teacher'){
    wrap.style.display='';
    lbl.textContent='Link to Teacher';
    sel.innerHTML='<option value="">— Select teacher —</option>';
    DB.teachers.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o); });
  } else {
    wrap.style.display='';
    lbl.textContent='Link to Class';
    sel.innerHTML='<option value="">— Select class —</option>';
    DB.classes.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
  }
}
function addUser(){
  const role=g('u-role').value;
  const linked=g('u-link').value;
  const uname=g('u-uname').value.trim();
  const pass=g('u-pass').value;
  if(!linked){ toast('Please link to a '+(role==='teacher'?'teacher':'class')+'.','warn'); return; }
  if(!uname){ toast('Username cannot be empty.','warn'); return; }
  if(pass.length<6){ toast('Password must be at least 6 characters.','warn'); return; }
  if(DB.users.some(u=>u.username===uname)){ toast(`Username "${uname}" already exists.`,'warn'); return; }
  DB.users.push({role,username:uname,password:pass,linked});
  sv(); toast(`User "${uname}" (${role}) created.`);
  g('u-uname').value=''; g('u-pass').value='';
  renderUsersPage();
}
function delUser(uname){
  if(uname==='admin'){ toast('Cannot delete the admin account.','warn'); return; }
  if(!confirm(`Delete user "${uname}"?`)) return;
  DB.users=DB.users.filter(u=>u.username!==uname);
  sv(); toast(`User "${uname}" deleted.`,'warn'); renderUsersPage();
}
function renderUsersPage(){
  onUserRoleChange();
  const nonAdmin=DB.users.filter(u=>u.role!=='hod'||u.username!=='admin');
  if(!DB.users.length){ g('users-list').innerHTML=emptyState('👥','No users yet','Create login accounts above'); return; }
  let h=`<div class="tw"><table class="dt"><thead><tr><th>#</th><th>Username</th><th>Role</th><th>Linked To</th><th>Actions</th></tr></thead><tbody>`;
  DB.users.forEach((u,i)=>{
    const roleBg={hod:'c-purple',teacher:'c-green',student:'c-orange'}[u.role]||'c-gray';
    h+=`<tr>
      <td style="color:var(--muted);font-weight:700">${i+1}</td>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="av" style="width:26px;height:26px;font-size:.68rem">${u.username.charAt(0).toUpperCase()}</div>
        <span style="font-weight:700">${esc(u.username)}</span>
      </div></td>
      <td><span class="chip ${roleBg}">${esc(u.role.toUpperCase())}</span></td>
      <td>${u.linked?`<span class="chip c-teal">${esc(u.linked)}</span>`:'<span style="color:var(--muted);font-size:.78rem">—</span>'}</td>
      <td>${u.username==='admin'?'<span style="font-size:.78rem;color:var(--muted)">Protected</span>':
        `<button class="btn btn-d btn-sm" onclick="delUser('${q(u.username)}')">🗑️ Delete</button>`}</td>
    </tr>`;
  });
  h+='</tbody></table></div>'; g('users-list').innerHTML=h;
}

// ══════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════
function renderConfigPage(){
  const cfg=DB.config;
  g('cfg-period-dur').value=cfg.periodDur||45;
  g('cfg-periods-day').value=cfg.periodsPerDay||6;
  g('cfg-start').value=cfg.startTime||'08:00';
  g('cfg-sb1-after').value=cfg.sb1After||2;
  g('cfg-sb1-dur').value=cfg.sb1Dur||15;
  g('cfg-sb2-after').value=cfg.sb2After||4;
  g('cfg-sb2-dur').value=cfg.sb2Dur||15;
  g('cfg-lunch-after').value=cfg.lunchAfter||5;
  g('cfg-lunch-dur').value=cfg.lunchDur||45;
  rebuildConfigSlots();
}
function readConfigForm(){
  return {
    periodDur:parseInt(g('cfg-period-dur').value)||45,
    periodsPerDay:parseInt(g('cfg-periods-day').value)||6,
    startTime:g('cfg-start').value||'08:00',
    sb1After:parseInt(g('cfg-sb1-after').value)||2,
    sb1Dur:parseInt(g('cfg-sb1-dur').value)||15,
    sb2After:parseInt(g('cfg-sb2-after').value)||4,
    sb2Dur:parseInt(g('cfg-sb2-dur').value)||15,
    lunchAfter:parseInt(g('cfg-lunch-after').value)||5,
    lunchDur:parseInt(g('cfg-lunch-dur').value)||45,
  };
}
function rebuildConfigSlots(){
  // Temporarily apply config to preview
  const prev=DB.config;
  DB.config=readConfigForm();
  const slots=buildPDEFS();
  DB.config=prev;
  let h='<div style="display:flex;flex-wrap:wrap;gap:8px">';
  slots.forEach(s=>{
    if(s.type==='break'){
      h+=`<div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;
          background:var(--yellow-soft);border:1.5px solid var(--yellow-border);font-size:.82rem;font-weight:700;color:#92400e">
          ${s.id==='lunch'?'🍽':'☕'} ${esc(s.label)}<span style="font-weight:400;color:var(--muted);margin-left:4px">${esc(s.time)}</span></div>`;
    } else {
      h+=`<div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;
          background:var(--accent-soft);border:1.5px solid #bfdbfe;font-size:.82rem;font-weight:700;color:var(--accent)">
          📖 ${esc(s.label)}<span style="font-weight:400;color:var(--muted);margin-left:4px">${esc(s.time)}</span></div>`;
    }
  });
  h+='</div>';
  const el=g('cfg-preview'); if(el) el.innerHTML=h;
}
function saveConfig(){
  DB.config=readConfigForm();
  sv(); toast('Configuration saved! ✓');
  rebuildConfigSlots();
}

// ══════════════════════════════════════════
// TEACHER TIMETABLE VIEW
// ══════════════════════════════════════════
function renderMyTimetable(){
  if(!SESSION||SESSION.role!=='teacher'){ g('my-tt-content').innerHTML=emptyState('🔒','Access denied',''); return; }
  if(!curTT){
    g('my-tt-content').innerHTML=emptyState('📅','No timetable generated yet','Ask the HOD to generate the timetable first.');
    return;
  }
  const teacherName=SESSION.linked;
  if(!teacherName){ g('my-tt-content').innerHTML=emptyState('⚠️','No teacher linked to your account','Contact the HOD.'); return; }
  const slots=buildPDEFS();
  const periodSlots=slots.filter(s=>s.type==='period');
  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700">
      ${esc(teacherName)} — Teaching Schedule</div>
    <button class="btn btn-ghost btn-sm" onclick="downloadTeacherCSV('${q(teacherName)}')">⬇️ Download CSV</button>
  </div>`;
  h+='<div class="ttwrap"><table class="tttable"><thead><tr><th>Day</th>';
  slots.forEach(s=>{
    h+=s.type==='break'
      ?`<th class="bh">${esc(s.label)}<br><span style="font-weight:400;font-size:.6rem">${esc(s.time)}</span></th>`
      :`<th>${esc(s.label)}<br><span style="font-weight:400;font-size:.61rem;opacity:.8">${esc(s.time)}</span></th>`;
  });
  h+='</tr></thead><tbody>';
  curTT.days.forEach(day=>{
    h+=`<tr><td class="dl">${day}</td>`;
    let pi=0;
    slots.forEach(s=>{
      if(s.type==='break'){
        h+=`<td class="bc"><div class="bl">${s.id==='lunch'?'🍽':'☕'}<br>${esc(s.label)}</div></td>`;
      } else {
        // Find which class this teacher teaches at this period on this day
        let found=null;
        for(const cls of DB.classes){
          const sched=curTT.timetable[cls];
          if(!sched) continue;
          const ds=sched[day]||[];
          if(ds[pi]&&ds[pi].teacher===teacherName){
            found={cls,sub:ds[pi].subject,clash:ds[pi].clash};
            break;
          }
        }
        if(found){
          const col=getSC(found.sub);
          h+=`<td><div class="pc ${col}">
            <div class="ps">${esc(found.sub)}</div>
            <div class="pt">🏫 ${esc(found.cls)}</div>
            ${found.clash?'<div class="clash-badge">⚠ Clash</div>':''}
          </div></td>`;
        } else {
          h+=`<td><div class="pc" style="color:var(--muted)"><div class="ps" style="opacity:.35">—</div></div></td>`;
        }
        pi++;
      }
    });
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  g('my-tt-content').innerHTML=h;
}

// ══════════════════════════════════════════
// STUDENT TIMETABLE VIEW
// ══════════════════════════════════════════
function renderStudentTimetable(){
  if(!SESSION||SESSION.role!=='student'){ g('student-tt-content').innerHTML=emptyState('🔒','Access denied',''); return; }
  const cls=SESSION.linked;
  if(!cls){ g('student-tt-content').innerHTML=emptyState('⚠️','No class linked to your account','Contact the HOD.'); return; }
  if(!curTT){
    g('student-tt-content').innerHTML=emptyState('📅','No timetable generated yet','Ask the HOD to generate the timetable.');
    return;
  }
  const schedule=curTT.timetable[cls];
  if(!schedule){
    g('student-tt-content').innerHTML=emptyState('📋',`No timetable found for class ${esc(cls)}`,'Contact the HOD.');
    return;
  }
  const slots=buildPDEFS();
  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700">
      Class ${esc(cls)} — Weekly Schedule</div>
    <button class="btn btn-ghost btn-sm" onclick="downloadStudentCSV('${q(cls)}')">⬇️ Download CSV</button>
  </div>`;
  h+='<div class="ttwrap"><table class="tttable"><thead><tr><th>Day</th>';
  slots.forEach(s=>{
    h+=s.type==='break'
      ?`<th class="bh">${esc(s.label)}<br><span style="font-weight:400;font-size:.6rem">${esc(s.time)}</span></th>`
      :`<th>${esc(s.label)}<br><span style="font-weight:400;font-size:.61rem;opacity:.8">${esc(s.time)}</span></th>`;
  });
  h+='</tr></thead><tbody>';
  curTT.days.forEach(day=>{
    const ds=schedule[day]||[];
    h+=`<tr><td class="dl">${day}</td>`;
    let pi=0;
    slots.forEach(s=>{
      if(s.type==='break'){
        h+=`<td class="bc"><div class="bl">${s.id==='lunch'?'🍽':'☕'}<br>${esc(s.label)}</div></td>`;
      } else {
        const p=ds[pi]||{};
        const sub=p.subject||'—'; const tch=p.teacher||'TBA';
        const col=sub!=='—'?getSC(sub):'';
        h+=`<td><div class="pc ${col}">
          <div class="ps">${esc(sub)}</div>
          <div class="pt">👤 ${esc(tch)}</div>
        </div></td>`;
        pi++;
      }
    });
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  g('student-tt-content').innerHTML=h;
}

// ══════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════
function renderSettingsPage(){
  g('set-uname').value='';
  g('set-curpass').value='';
  g('set-newpass').value='';
  g('set-confpass').value='';
}
function saveSettings(){
  if(!SESSION){ toast('Not logged in.','err'); return; }
  const newUname=g('set-uname').value.trim();
  const curPass=g('set-curpass').value;
  const newPass=g('set-newpass').value;
  const confPass=g('set-confpass').value;
  // Find user
  const uIdx=DB.users.findIndex(u=>u.username===SESSION.username);
  if(uIdx<0){ toast('User not found.','err'); return; }
  const user=DB.users[uIdx];
  if(user.password!==curPass){ toast('Current password is incorrect.','err'); return; }
  if(newPass&&newPass!==confPass){ toast('New passwords do not match.','err'); return; }
  if(newPass&&newPass.length<6){ toast('New password must be at least 6 characters.','err'); return; }
  if(newUname&&newUname!==SESSION.username){
    if(DB.users.some(u=>u.username===newUname)){ toast(`Username "${newUname}" is already taken.`,'warn'); return; }
    DB.users[uIdx].username=newUname;
    SESSION.username=newUname;
    g('tb-uname').textContent=newUname;
    g('tb-av').textContent=newUname.charAt(0).toUpperCase();
  }
  if(newPass) DB.users[uIdx].password=newPass;
  sv(); toast('Settings saved successfully! ✓');
  renderSettingsPage();
}

// ══════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════
(function boot(){
  const restored = loadSession();
  if(restored){
    // validate the stored session still corresponds to a real user
    const stillValid = DB.users.some(u=>u.username===restored.username && u.role===restored.role);
    if(stillValid){
      SESSION = restored;
      g('login-screen').style.display='none';
      g('app').style.display='block';
      initApp();
      return;
    } else {
      clearSession();
    }
  }
  g('login-screen').style.display='flex';
  g('app').style.display='none';
})();