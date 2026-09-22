if(!MindQuizAuth.requireRole('admin')) throw new Error('Admin access required.');
let state={stats:{},users:[],quizzes:[],attempts:[]};
const content=document.getElementById('adminContent');
const api=MindQuizAuth.API_BASE;
const token=()=>localStorage.getItem('mindQuizToken');
function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function render(tab='overview'){
 if(tab==='overview') content.innerHTML='<div class="admin-stat-grid">'+Object.entries(state.stats).map(([k,v])=>'<div class="admin-stat"><span>'+k.replace(/([A-Z])/g,' $1').toUpperCase()+'</span><b>'+v+'</b></div>').join('')+'</div><p class="admin-note">Live data from the Mind Quiz platform.</p>';
 if(tab==='users') content.innerHTML='<div class="admin-panel"><div class="panel-title-row"><h2>Users</h2><span>'+state.users.length+' accounts</span></div><div class="admin-table"><table><thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>'+state.users.map(u=>'<tr><td>'+esc(u.username)+'</td><td>'+esc(u.name||'—')+'</td><td>'+esc(u.email)+'</td><td><span class="role-pill">'+esc(u.role)+'</span></td></tr>').join('')+'</tbody></table></div></div>';
 if(tab==='quizzes') content.innerHTML='<div class="admin-panel"><div class="panel-title-row"><h2>Quizzes</h2><span>'+state.quizzes.length+' total</span></div><div class="admin-table"><table><thead><tr><th>Quiz</th><th>Category</th><th>Faculty</th><th>Questions</th><th>Status</th></tr></thead><tbody>'+state.quizzes.map(q=>'<tr><td>'+esc(q.title)+'</td><td>'+esc(q.category)+'</td><td>'+esc(q.createdByName)+'</td><td>'+q.questions+'</td><td><span class="status-pill '+(q.status==='published'?'published':'draft')+'">'+esc(q.status)+'</span></td></tr>').join('')+'</tbody></table></div></div>';
 if(tab==='attempts') content.innerHTML='<div class="admin-panel"><div class="panel-title-row"><h2>All Attempts</h2><span>'+state.attempts.length+' attempts</span></div><div class="admin-table"><table><thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Percentage</th><th>Submitted</th></tr></thead><tbody>'+state.attempts.map(a=>'<tr><td>'+esc(a.studentUsername)+'</td><td>'+esc(a.quizTitle)+'</td><td>'+a.score+'/'+a.total+'</td><td><strong>'+a.percentage+'%</strong></td><td>'+new Date(a.submittedAt).toLocaleString()+'</td></tr>').join('')+'</tbody></table></div></div>';
}
async function load(activeTab='overview'){
 try{const r=await fetch(api+'/api/admin/overview',{headers:{Authorization:'Bearer '+token()}});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load admin data');state=d;render(activeTab);}
 catch(e){content.innerHTML='<div class="admin-panel"><p>'+esc(e.message)+'</p></div>';}
}
document.querySelectorAll('.admin-tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.tab);}));
document.getElementById('refreshAdmin')?.addEventListener('click',()=>{const active=document.querySelector('.admin-tab.active')?.dataset.tab||'overview';load(active)});
load();