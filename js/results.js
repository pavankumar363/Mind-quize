let allResults=[];
const list=document.getElementById('resultsList'),filter=document.getElementById('filter');
function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c));}
function render(){
 const mode=filter.value;
 const data=allResults.filter(r=>mode==='All results'||(mode==='Excellent'?r.percentage>=80:r.percentage>=60&&r.percentage<80));
 list.innerHTML=data.length?data.map(r=>'<button class="result-item result-click" data-id="'+r.id+'"><div><b>'+esc(r.quizTitle)+'</b><small>'+new Date(r.submittedAt).toLocaleString()+'</small></div><strong>'+r.score+'/'+r.total+' <span>'+r.percentage+'%</span></strong><i>'+(r.percentage>=85?'Excellent':r.percentage>=70?'Good':'Needs Practice')+'</i></button>').join(''):'<div class="empty-results">No quiz attempts found yet. Take your first quiz!</div>';
 const count=allResults.length,avg=count?Math.round(allResults.reduce((s,r)=>s+r.percentage,0)/count):0,best=count?Math.max(...allResults.map(r=>r.percentage)):0;
 document.querySelectorAll('.result-metrics b')[0].textContent=count;document.querySelectorAll('.result-metrics b')[1].textContent=avg+'%';document.querySelectorAll('.result-metrics b')[2].textContent=best+'%';
 document.querySelector('.overall strong').textContent=avg+'%';document.querySelector('.mini-progress b').textContent=avg+'%';document.querySelector('.mini-progress .track i').style.width=avg+'%';
 document.querySelectorAll('.result-click').forEach(b=>b.addEventListener('click',()=>showDetail(b.dataset.id)));
}
async function showDetail(id){
 try{const r=await fetch(MindQuizAuth.API_BASE+'/attempts/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load attempt');const a=d.attempt;
 const modal=document.getElementById('attemptModal');if(!modal)return;
 document.getElementById('detailTitle').textContent=a.quizTitle;document.getElementById('detailScore').textContent=a.score+'/'+a.total+' • '+a.percentage+'%';document.getElementById('detailTime').textContent='Time: '+Math.round((a.timeTaken||0)/60)+' min';
 document.getElementById('detailQuestions').innerHTML=(a.breakdown||[]).map((q,i)=>'<div class="detail-q"><b>'+ (i+1)+'. '+esc(q.question)+'</b><span class="'+(q.selected===q.correct?'correct':'wrong')+'">Your answer: '+esc(q.selectedText||'Not answered')+'</span><small>Correct: '+esc(q.correctText||'')+'</small></div>').join('');
 modal.classList.add('show');
 }catch(e){alert(e.message)}
}
document.getElementById('closeAttempt')?.addEventListener('click',()=>document.getElementById('attemptModal')?.classList.remove('show'));
filter.addEventListener('change',render);
async function load(){
 if(window.MindQuizAuth&&!MindQuizAuth.requireRole('student'))return;
 try{const r=await fetch(MindQuizAuth.API_BASE+'/my-attempts',{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});const d=await r.json();if(!r.ok)throw new Error(d.message);allResults=d.attempts||[]}catch(e){allResults=[]}
 render();
}
async function loadLeaderboard(){const el=document.getElementById('leaderboardList');if(!el)return;try{const r=await fetch(MindQuizAuth.API_BASE+'/leaderboard',{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load leaderboard');el.innerHTML=(d.leaderboard||[]).length?d.leaderboard.map(x=>'<div class="leaderboard-row '+(x.username===MindQuizAuth.getUser()?.username?'me':'')+'"><strong>#'+x.rank+'</strong><div><b>'+esc(x.name)+'</b><small>@'+esc(x.username)+'</small></div><span>'+x.attempts+' quizzes</span><b>'+x.average+'%</b></div>').join(''):'<p>No ranked results yet.</p>'}catch(e){el.innerHTML='<p>Unable to load leaderboard.</p>'}}
document.getElementById('refreshLeaderboard')?.addEventListener('click',loadLeaderboard);
load();loadLeaderboard();