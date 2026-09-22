if(!MindQuizAuth.requireRole('faculty')) throw new Error('Faculty access required.');
const api=MindQuizAuth.API_BASE, token=()=>localStorage.getItem('mindQuizToken');
async function facultyData(){
 const r=await fetch(api+'/api/faculty/overview',{headers:{Authorization:'Bearer '+token()}});
 const d=await r.json(); if(!r.ok)throw new Error(d.message||'Unable to load faculty data'); return d;
}
function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
async function renderFaculty(){
 try{
  const d=await facultyData();
  const m=document.querySelectorAll('.metric strong'); if(m.length){m[0].textContent=d.stats.quizzes;m[1].textContent=d.stats.active;m[2].textContent=d.stats.attempts;m[3].textContent=d.stats.average+'%';}
  const table=document.querySelector('.faculty-table');
  if(table)table.innerHTML='<div class="f-head"><span>QUIZ</span><span>QUESTIONS</span><span>ATTEMPTS</span><span>STATUS</span><span>ACTION</span></div>'+d.quizzes.map(q=>'<div class="f-row"><div><b>'+esc(q.title)+'</b><small>'+esc(q.category)+'</small></div><span>'+q.questions.length+'</span><span>'+q.attempts+'</span><i class="'+(q.status==='published'?'published':'draft')+'">'+q.status+'</i><button onclick="manageQuiz(\''+q.id+'\')">Manage</button></div>').join('');
  const el=document.getElementById('facultyAttempts'); if(el)el.innerHTML=d.attempts.length?'<div class="attempt-table"><div class="attempt-head"><span>Student</span><span>Quiz</span><span>Score</span><span>Submitted</span></div>'+d.attempts.map(a=>'<div class="attempt-row"><span>'+esc(a.studentUsername)+'</span><span>'+esc(a.quizTitle)+'</span><span><b>'+a.score+'/'+a.total+'</b> · '+a.percentage+'%</span><span>'+new Date(a.submittedAt).toLocaleString()+'</span></div>').join('')+'</div>':'<p>No student attempts yet.</p>';
 }catch(e){console.error(e);}
}
window.manageQuiz=async id=>{
 const d=await facultyData(),q=d.quizzes.find(x=>x.id===id);if(!q)return;
 document.getElementById('facultyActionModal')?.remove();
 const modal=document.createElement('div');modal.id='facultyActionModal';modal.className='faculty-action-modal';
 modal.innerHTML='<div class="faculty-action-card"><button class="modal-x" id="closeFacultyAction">×</button><span>QUIZ MANAGEMENT</span><h2>'+esc(q.title)+'</h2><p>Choose an action for this quiz.</p><div class="faculty-action-buttons"><button data-action="edit">✏ Edit Quiz</button><button data-action="'+(q.status==='published'?'draft':'publish')+'">'+(q.status==='published'?'⏸ Move to Draft':'▶ Publish Quiz')+'</button><button data-action="delete" class="danger">🗑 Delete Quiz</button></div></div>';
 document.body.appendChild(modal);
 modal.querySelector('#closeFacultyAction').onclick=()=>modal.remove();
 modal.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=async()=>{
  const action=btn.dataset.action;
  if(action==='edit'){location.href='create-quiz.html?edit='+encodeURIComponent(id);return}
  if(action==='delete'&&!confirm('Delete this quiz permanently?'))return;
  const opts=action==='delete'?{method:'DELETE',headers:{Authorization:'Bearer '+token()}}:{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({status:action})};
  const r=await fetch(api+(action==='delete'?'/api/faculty/quizzes/'+id:'/api/faculty/quizzes/'+id+'/status'),opts);const data=await r.json();if(!r.ok){alert(data.message||'Action failed');return}modal.remove();renderFaculty();
 });
};
renderFaculty();
(function(){const u=MindQuizAuth?.getUser?.();if(!u)return;const name=u.name||u.username||'Faculty';const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('facultyProfileName',name);set('facultyProfileUsername',u.username||'');set('facultyProfileEmail',u.email||'');set('facultyProfileAvatar',name.charAt(0).toUpperCase());document.getElementById('facultyAccountLogout')?.addEventListener('click',()=>MindQuizAuth.logout())})();
async function facultyUpdateProfile(name,email){const r=await fetch(api+'/api/profile',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({name,email})});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to update profile');localStorage.setItem('mindQuizUser',JSON.stringify(d.user));return d.user}
async function facultyChangePassword(currentPassword,newPassword){const r=await fetch(api+'/api/change-password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({currentPassword,newPassword})});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to change password');return d}
(function(){const u=MindQuizAuth?.getUser?.();if(!u)return;const ni=document.getElementById('facultyEditName'),ei=document.getElementById('facultyEditEmail');if(ni)ni.value=u.name||u.username||'';if(ei)ei.value=u.email||'';document.getElementById('facultySaveProfile')?.addEventListener('click',async()=>{const m=document.getElementById('facultyProfileMessage');try{const x=await facultyUpdateProfile(ni.value,ei.value);m.textContent='Profile saved ✓';m.className='account-message success';document.getElementById('facultyProfileName').textContent=x.name;document.getElementById('facultyProfileEmail').textContent=x.email}catch(e){m.textContent=e.message;m.className='account-message error'}});document.getElementById('facultyChangePassword')?.addEventListener('click',async()=>{const m=document.getElementById('facultyPasswordMessage');try{await facultyChangePassword(document.getElementById('facultyCurrentPassword').value,document.getElementById('facultyNewPassword').value);m.textContent='Password changed ✓';m.className='account-message success';document.getElementById('facultyCurrentPassword').value='';document.getElementById('facultyNewPassword').value=''}catch(e){m.textContent=e.message;m.className='account-message error'}})})();

async function loadFacultyAnalytics(){
 try{
  const d=await facultyData(),el=document.getElementById('facultyAnalytics');if(!el)return;
  const rows=d.quizzes.slice().sort((a,b)=>b.attempts-a.attempts).slice(0,5),max=Math.max(1,...rows.map(q=>q.attempts));
  el.innerHTML=rows.length?rows.map(q=>'<div class="faculty-bar"><div><b>'+esc(q.title)+'</b><small>'+q.attempts+' attempts · '+q.average+'% avg.</small></div><i><b style="width:'+Math.round(q.attempts/max*100)+'%"></b></i></div>').join(''):'<p>No quiz analytics yet.</p>';
 }catch(e){}
}
loadFacultyAnalytics();
