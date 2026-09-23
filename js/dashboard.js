const menu=document.getElementById('dashMenu'),sidebar=document.getElementById('sidebar');
if(menu&&sidebar)menu.addEventListener('click',()=>sidebar.classList.toggle('open'));
function setText(selector,value){const el=document.querySelector(selector);if(el)el.textContent=value}
function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
const authHeaders=()=>({Authorization:'Bearer '+localStorage.getItem('mindQuizToken')});
let allQuizzes=[];

async function loadStudentData(){
 if(!window.MindQuizAuth)return;
 const user=MindQuizAuth.getUser();
 if(user){
  const display=user.name||user.username||'Student';
  setText('.dash-header h1','Good morning, '+display+'.');
  setText('.user-chip b',display);
  setText('.user-chip small',user.username?'Student ID: '+user.username:'Student');
  setText('.user-chip .avatar',display.charAt(0).toUpperCase());
  setText('profileName',display); setText('profileUsername',user.username||''); setText('profileEmail',user.email||''); setText('profileAvatar',display.charAt(0).toUpperCase());
  const ni=document.getElementById('studentEditName'),ei=document.getElementById('studentEditEmail');if(ni)ni.value=user.name||user.username||'';if(ei)ei.value=user.email||'';
 }
 try{
  const [r,ins]=await Promise.all([
   fetch(MindQuizAuth.API_BASE+'/my-attempts',{headers:authHeaders()}),
   fetch(MindQuizAuth.API_BASE+'/student/insights',{headers:authHeaders()})
  ]);
  const d=await r.json(), x=await ins.json();
  if(!r.ok)throw new Error(d.message||'Unable to load results');
  const a=d.attempts||[], scores=a.map(v=>Number(v.percentage)||0);
  const avg=scores.length?Math.round(scores.reduce((s,v)=>s+v,0)/scores.length):0,best=scores.length?Math.max(...scores):0;
  const streak=Number(x.stats?.streak)||0;
  const metrics=document.querySelectorAll('.metric strong'); if(metrics.length){metrics[0].textContent=a.length;metrics[1].textContent=avg+'%';metrics[2].textContent=best+'%';metrics[3].textContent=streak+' 🔥';}
  const rows=document.querySelectorAll('.result-row'), recent=a.slice(0,5);
  rows.forEach((row,i)=>{const item=recent[i];if(!item){row.style.display='none';return}row.style.display='grid';const c=row.children;if(c[0])c[0].textContent=item.quizTitle;if(c[1])c[1].textContent=new Date(item.submittedAt).toLocaleDateString();if(c[2])c[2].textContent=item.percentage+'%';if(c[3])c[3].textContent=item.percentage>=85?'Excellent':item.percentage>=70?'Good':'Needs Practice';});
  renderInsights(x);
 }catch(e){console.error(e)}
}
function renderInsights(x){
 const badgeEl=document.getElementById('badgeList'),noteEl=document.getElementById('notificationList');
 if(badgeEl)badgeEl.innerHTML=(x.badges||[]).length?x.badges.map(b=>'<div class="badge-item"><span>'+b.icon+'</span><div><b>'+esc(b.title)+'</b><small>'+esc(b.text)+'</small></div></div>').join(''):'<p class="muted">Complete quizzes to unlock achievements.</p>';
 if(noteEl)noteEl.innerHTML=(x.notifications||[]).length?x.notifications.map(n=>'<div class="notification-item"><span>●</span><div><b>'+esc(n.title)+'</b><small>'+esc(n.text)+'</small></div></div>').join(''):'<p class="muted">You are all caught up.</p>';
}
function renderQuizzes(list){
 const el=document.getElementById('quizList');if(!el)return;
 el.innerHTML=list.length?list.map(q=>'<article class="quiz-card"><span class="quiz-badge">'+esc(q.category||'General')+'</span><h3>'+esc(q.title)+'</h3><p>'+esc(q.description||'Test your knowledge.')+'</p><small>'+q.questions.length+' Questions • '+(q.time||15)+' min</small><a class="next-btn" href="quiz.html?id='+encodeURIComponent(q.id)+'">Start Quiz →</a></article>').join(''):'<div class="empty-results">No matching quizzes found.</div>';
}
async function loadAvailableQuizzes(){
 const el=document.getElementById('quizList');if(!el||!window.MindQuizAuth)return;
 try{const r=await fetch(MindQuizAuth.API_BASE+'/quizzes',{headers:authHeaders()});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load quizzes');allQuizzes=d.quizzes||[];populateCategories();renderQuizzes(allQuizzes);}
 catch(e){el.innerHTML='<p>Unable to load quizzes. Start the Mind Quiz server and refresh.</p>'}
}
function populateCategories(){const select=document.getElementById('quizCategory');if(!select)return;const cats=[...new Set(allQuizzes.map(q=>q.category||'General'))].sort();select.innerHTML='<option value="all">All categories</option>'+cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');}
function applyQuizFilters(){const q=(document.getElementById('quizSearch')?.value||'').toLowerCase().trim(),cat=(document.getElementById('quizCategory')?.value||'all').toLowerCase();renderQuizzes(allQuizzes.filter(x=>(!q||[x.title,x.description,x.category].join(' ').toLowerCase().includes(q))&&(cat==='all'||String(x.category||'').toLowerCase()===cat)));}
document.getElementById('quizSearch')?.addEventListener('input',applyQuizFilters);
document.getElementById('quizCategory')?.addEventListener('change',applyQuizFilters);
async function updateProfile(name,email){const r=await fetch(MindQuizAuth.API_BASE+'/profile',{method:'PUT',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({name,email})});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to update profile');localStorage.setItem('mindQuizUser',JSON.stringify(d.user));return d.user}
async function changePassword(currentPassword,newPassword){const r=await fetch(MindQuizAuth.API_BASE+'/change-password',{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword})});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to change password');return d}
document.getElementById('studentSaveProfile')?.addEventListener('click',async()=>{const m=document.getElementById('studentProfileMessage');try{const x=await updateProfile(document.getElementById('studentEditName').value,document.getElementById('studentEditEmail').value);m.textContent='Profile saved ✓';m.className='account-message success';setText('profileName',x.name);setText('profileEmail',x.email)}catch(e){m.textContent=e.message;m.className='account-message error'}});
document.getElementById('studentChangePassword')?.addEventListener('click',async()=>{const m=document.getElementById('studentPasswordMessage');try{await changePassword(document.getElementById('studentCurrentPassword').value,document.getElementById('studentNewPassword').value);m.textContent='Password changed ✓';m.className='account-message success';document.getElementById('studentCurrentPassword').value='';document.getElementById('studentNewPassword').value=''}catch(e){m.textContent=e.message;m.className='account-message error'}});
document.getElementById('studentLogout')?.addEventListener('click',e=>{e.preventDefault();MindQuizAuth.logout()});
document.getElementById('studentAccountLogout')?.addEventListener('click',()=>MindQuizAuth.logout());
loadStudentData();loadAvailableQuizzes();