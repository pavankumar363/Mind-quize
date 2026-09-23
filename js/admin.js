if(!MindQuizAuth.requireRole('admin')) throw new Error('Admin access required.');
let state={stats:{},users:[],quizzes:[],attempts:[]};
const content=document.getElementById('adminContent');
const api=MindQuizAuth.API_BASE;
const token=()=>localStorage.getItem('mindQuizToken');
function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function render(tab='overview'){
 if(tab==='overview') content.innerHTML='<div class="admin-stat-grid">'+Object.entries(state.stats).map(([k,v])=>'<div class="admin-stat"><span>'+k.replace(/([A-Z])/g,' $1').toUpperCase()+'</span><b>'+v+'</b></div>').join('')+'</div><p class="admin-note">Live data from the Mind Quiz platform.</p>';
 if(tab==='users') content.innerHTML='<div class="admin-panel"><div class="panel-title-row"><h2>Users</h2><span>'+state.users.length+' accounts</span></div><div class="admin-table"><table><thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>'+state.users.map(u=>'<tr><td>'+esc(u.username)+'</td><td>'+esc(u.name||'—')+'</td><td>'+esc(u.email)+'</td><td><select class="role-select" data-id="'+u.id+'"><option '+(u.role==='Student'?'selected':'')+'>Student</option><option '+(u.role==='Faculty'?'selected':'')+'>Faculty</option><option '+(u.role==='Admin'?'selected':'')+'>Admin</option></select> <button class="table-action danger" data-delete-user="'+u.id+'">Delete</button></td></tr>').join('')+'</tbody></table></div></div>';
 if(tab==='quizzes') content.innerHTML='<div class="admin-panel"><div class="panel-title-row"><h2>Quizzes</h2><span>'+state.quizzes.length+' total</span></div><div class="admin-table"><table><thead><tr><th>Quiz</th><th>Category</th><th>Faculty</th><th>Questions</th><th>Status</th></tr></thead><tbody>'+state.quizzes.map(q=>'<tr><td>'+esc(q.title)+'</td><td>'+esc(q.category)+'</td><td>'+esc(q.createdByName)+'</td><td>'+q.questions+'</td><td><span class="status-pill '+(q.status==='published'?'published':'draft')+'">'+esc(q.status)+'</span> <button class="table-action danger" data-delete-quiz="'+q.id+'">Delete</button></td></tr>').join('')+'</tbody></table></div></div>';
 if(tab==='attempts') content.innerHTML='<div class="admin-panel"><div class="panel-title-row"><h2>All Attempts</h2><span>'+state.attempts.length+' attempts</span></div><div class="admin-table"><table><thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Percentage</th><th>Submitted</th></tr></thead><tbody>'+state.attempts.map(a=>'<tr><td>'+esc(a.studentUsername)+'</td><td>'+esc(a.quizTitle)+'</td><td>'+a.score+'/'+a.total+'</td><td><strong>'+a.percentage+'%</strong></td><td>'+new Date(a.submittedAt).toLocaleString()+'</td></tr>').join('')+'</tbody></table></div></div>';
}
async function adminAction(url,opts={}){
 const r=await fetch(api+url,{...opts,headers:{...(opts.headers||{}),Authorization:'Bearer '+token()}});
 const d=await r.json();if(!r.ok)throw new Error(d.message||'Action failed');return d;
}
async function load(activeTab='overview'){
 try{const r=await fetch(api+'/admin/overview',{headers:{Authorization:'Bearer '+token()}});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load admin data');state=d;
 const m=document.querySelectorAll('.metric strong');if(m.length){m[0].textContent=d.stats.users;m[1].textContent=d.stats.faculty;m[2].textContent=d.stats.students;m[3].textContent=d.stats.quizzes;}
 render(activeTab);}
 catch(e){content.innerHTML='<div class="admin-panel"><p>'+esc(e.message)+'</p></div>';}
}
document.addEventListener('change',async e=>{const el=e.target;if(!el.matches('.role-select'))return;try{await adminAction('/admin/users/'+el.dataset.id+'/role',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:el.value})});await load('users')}catch(err){alert(err.message);await load('users')}});

document.addEventListener('click',async e=>{const user=e.target.closest('[data-delete-user]'),quiz=e.target.closest('[data-delete-quiz]');try{if(user){if(!confirm('Delete this user and their data?'))return;await adminAction('/admin/users/'+user.dataset.deleteUser,{method:'DELETE'});await load('users')}else if(quiz){if(!confirm('Delete this quiz and its attempts?'))return;await adminAction('/admin/quizzes/'+quiz.dataset.deleteQuiz,{method:'DELETE'});await load('quizzes')}}catch(err){alert(err.message)}});

document.querySelectorAll('.admin-tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.tab);}));
document.getElementById('refreshAdmin')?.addEventListener('click',()=>{const active=document.querySelector('.admin-tab.active')?.dataset.tab||'overview';load(active)});
load();
async function loadAnalytics(){
 const el=document.getElementById('adminAnalytics');if(!el)return;
 try{
  const r=await fetch(api+'/admin/reports',{headers:{Authorization:'Bearer '+token()}});const d=await r.json();if(!r.ok)throw new Error(d.message);
  const max=Math.max(1,...d.categoryStats.map(x=>x.attempts));
  el.innerHTML='<div class="analytics-cards">'+[['Users',d.metrics.users],['Quizzes',d.metrics.quizzes],['Attempts',d.metrics.attempts],['Average',d.metrics.average+'%']].map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div><div class="analytics-grid"><div class="analytics-panel"><h3>Attempts by category</h3>'+ (d.categoryStats.length?d.categoryStats.map(x=>'<div class="bar-row"><span>'+esc(x.category)+'</span><i><b style="width:'+Math.round(x.attempts/max*100)+'%"></b></i><strong>'+x.attempts+'</strong></div>').join(''):'<p>No attempts yet.</p>')+'</div><div class="analytics-panel"><h3>Recent activity</h3>'+ (d.recent.length?d.recent.map(x=>'<div class="activity-row"><div><b>'+esc(x.quiz)+'</b><small>'+esc(x.student)+'</small></div><strong>'+x.score+'%</strong></div>').join(''):'<p>No recent activity.</p>')+'</div></div>';
 }catch(e){el.innerHTML='<p>'+esc(e.message)+'</p>'}
}
function exportAttempts(){
 if(!state.attempts.length)return alert('No attempts to export.');
 const rows=[['Student','Quiz','Score','Total','Percentage','Submitted'],...state.attempts.map(a=>[a.studentUsername,a.quizTitle,a.score,a.total,a.percentage,new Date(a.submittedAt).toISOString()])];
 const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mind-quiz-attempts.csv';a.click();URL.revokeObjectURL(url);
}
document.getElementById('exportAttempts')?.addEventListener('click',exportAttempts);
loadAnalytics();
