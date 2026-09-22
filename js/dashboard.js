const menu=document.getElementById('dashMenu'),sidebar=document.getElementById('sidebar');
if(menu&&sidebar)menu.addEventListener('click',()=>sidebar.classList.toggle('open'));
document.querySelectorAll('.quiz-card button').forEach(btn=>btn.addEventListener('click',()=>{btn.textContent='Quiz selected ✓';btn.style.background='#7bea8b';btn.style.color='#102015'}));

function setText(selector,value){const el=document.querySelector(selector);if(el)el.textContent=value}
async function loadStudentData(){
 if(!window.MindQuizAuth)return;
 const user=MindQuizAuth.getUser();
 if(user){
  const display=user.name||user.username||'Student';
  setText('.dash-header h1','Good morning, '+display+'.');
  const b=document.querySelector('.user-chip b');if(b)b.textContent=display;
  const small=document.querySelector('.user-chip small');if(small)small.textContent=user.username?'Student ID: '+user.username:'Student';
  const av=document.querySelector('.user-chip .avatar');if(av)av.textContent=display.charAt(0).toUpperCase();
 }
 try{
  const r=await fetch(MindQuizAuth.API_BASE+'/api/my-attempts',{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});
  const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load results');
  const a=d.attempts||[], scores=a.map(x=>Number(x.percentage)||0);
  const avg=scores.length?Math.round(scores.reduce((s,v)=>s+v,0)/scores.length):0;
  const best=scores.length?Math.max(...scores):0;
  const metrics=document.querySelectorAll('.metric strong');
  if(metrics.length){metrics[0].textContent=a.length;metrics[1].textContent=avg+'%';metrics[2].textContent=best+'%';}
  const rows=document.querySelectorAll('.result-row');
  if(rows.length){
   const recent=a.slice(0,3);
   rows.forEach((row,i)=>{
    const item=recent[i]; if(!item){row.style.display='none';return;}
    row.style.display='grid';
    const cells=row.children;
    if(cells[0])cells[0].textContent=item.quizTitle;
    if(cells[1])cells[1].textContent=new Date(item.submittedAt).toLocaleDateString();
    if(cells[2])cells[2].textContent=item.percentage+'%';
    if(cells[3])cells[3].textContent=item.percentage>=85?'Excellent':item.percentage>=70?'Good':'Needs Practice';
   });
  }
 }catch(e){console.error(e)}
}
async function loadAvailableQuizzes(){
 const el=document.getElementById('quizList');if(!el||!window.MindQuizAuth)return;
 try{
  const r=await fetch(MindQuizAuth.API_BASE+'/api/quizzes',{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});
  const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load quizzes');
  el.innerHTML=(d.quizzes||[]).map(q=>'<article class="quiz-card"><span class="quiz-badge">'+(q.category||'General')+'</span><h3>'+q.title+'</h3><p>'+(q.description||'Test your knowledge.')+'</p><small>'+q.questions.length+' Questions • '+q.time+' min</small><a class="next-btn" href="quiz.html?id='+encodeURIComponent(q.id)+'">Start Quiz →</a></article>').join('')||'<p>No published quizzes yet.</p>';
 }catch(e){el.innerHTML='<p>Unable to load quizzes. Start the Mind Quiz server and refresh.</p>'}
}
loadStudentData();loadAvailableQuizzes();
(function(){const u=MindQuizAuth?.getUser?.();if(!u)return;const name=u.name||u.username||'Student';const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('profileName',name);set('profileUsername',u.username||'');set('profileEmail',u.email||'');set('profileAvatar',name.charAt(0).toUpperCase());document.getElementById('studentLogout')?.addEventListener('click',e=>{e.preventDefault();MindQuizAuth.logout()});document.getElementById('studentAccountLogout')?.addEventListener('click',()=>MindQuizAuth.logout())})();
async function updateProfile(name,email,messageId){
 const r=await fetch(MindQuizAuth.API_BASE+'/api/profile',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('mindQuizToken')},body:JSON.stringify({name,email})});
 const d=await r.json(); const m=document.getElementById(messageId); if(!r.ok)throw new Error(d.message||'Unable to update profile');
 localStorage.setItem('mindQuizUser',JSON.stringify(d.user)); return d.user;
}
async function changePassword(currentPassword,newPassword,messageId){
 const r=await fetch(MindQuizAuth.API_BASE+'/api/change-password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('mindQuizToken')},body:JSON.stringify({currentPassword,newPassword})});
 const d=await r.json(); const m=document.getElementById(messageId); if(!r.ok)throw new Error(d.message||'Unable to change password'); return d;
}
(function(){
 const u=MindQuizAuth?.getUser?.(); if(!u)return;
 const nameInput=document.getElementById('studentEditName'), emailInput=document.getElementById('studentEditEmail');
 if(nameInput)nameInput.value=u.name||u.username||''; if(emailInput)emailInput.value=u.email||'';
 document.getElementById('studentSaveProfile')?.addEventListener('click',async()=>{const m=document.getElementById('studentProfileMessage');try{const x=await updateProfile(nameInput.value,emailInput.value,'studentProfileMessage');m.textContent='Profile saved ✓';m.className='account-message success';setText('profileName',x.name);setText('profileEmail',x.email)}catch(e){m.textContent=e.message;m.className='account-message error'}});
 document.getElementById('studentChangePassword')?.addEventListener('click',async()=>{const m=document.getElementById('studentPasswordMessage');try{await changePassword(document.getElementById('studentCurrentPassword').value,document.getElementById('studentNewPassword').value,'studentPasswordMessage');m.textContent='Password changed ✓';m.className='account-message success';document.getElementById('studentCurrentPassword').value='';document.getElementById('studentNewPassword').value=''}catch(e){m.textContent=e.message;m.className='account-message error'}});
})();
