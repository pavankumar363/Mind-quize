let allResults=[];
const list=document.getElementById('resultsList');
const filter=document.getElementById('filter');
function render(){
 const mode=filter.value;
 const data=allResults.filter(r=>mode==='All results'||(mode==='Excellent'?r.percentage>=80:r.percentage>=60&&r.percentage<80));
 list.innerHTML=data.length?data.map(r=>'<div class="result-row"><div><b>'+r.quizTitle+'</b><small>'+new Date(r.submittedAt).toLocaleString()+'</small></div><strong>'+r.score+'/'+r.total+' <span>'+r.percentage+'%</span></strong></div>').join(''):'<div class="empty-results">No quiz attempts found yet. Take your first quiz!</div>';
 const count=allResults.length, avg=count?Math.round(allResults.reduce((s,r)=>s+r.percentage,0)/count):0, best=count?Math.max(...allResults.map(r=>r.percentage)):0;
 const metrics=document.querySelectorAll('.result-metrics b'); if(metrics.length){metrics[0].textContent=count;metrics[1].textContent=avg+'%';metrics[2].textContent=best+'%';}
 const overall=document.querySelector('.overall strong'); if(overall)overall.textContent=avg+'%';
 const progress=document.querySelector('.mini-progress b'); if(progress)progress.textContent=avg+'%';
 const track=document.querySelector('.mini-progress .track i'); if(track)track.style.width=avg+'%';
}
async function load(){
 if(window.MindQuizAuth && !MindQuizAuth.requireRole('student')) return;
 try{
  const r=await fetch(MindQuizAuth.API_BASE+'/api/my-attempts',{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});
  const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not load results.');
  allResults=d.attempts||[];
 }catch(e){allResults=[];}
 render();
}
filter.addEventListener('change',render);
load();