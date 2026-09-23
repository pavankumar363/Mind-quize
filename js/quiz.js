let questions=[],current=0,answers=[],startedAt=Date.now(),quizId=null,timer=null;
const params=new URLSearchParams(location.search);
function getQuiz(){try{return JSON.parse(localStorage.getItem('mindQuizPublished')||'null')}catch{return null}}
async function loadQuiz(){
 if(window.MindQuizAuth&&!MindQuizAuth.requireRole('student'))return;
 const local=getQuiz(),id=params.get('id');
 try{const r=await fetch(MindQuizAuth.API_BASE+'/quizzes',{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});const data=await r.json();const remote=(data.quizzes||[]).find(q=>q.id===id)||(data.quizzes||[]).find(q=>!id)||local;if(remote)start(remote);else renderFallback()}catch(e){if(local)start(local);else renderFallback()}
}
function start(quiz){
 quizId=quiz.id||null;questions=quiz.questions||[];startedAt=Date.now();answers=new Array(questions.length).fill(null);
 const title=document.getElementById('quizTitle');if(title)title.textContent=quiz.title||'Mind Quiz';
 if(!questions.length){renderFallback();return}
 const timerEl=document.getElementById('timer');if(timerEl)timerEl.textContent=(quiz.time||15)+':00';
 render();startTimer((quiz.time||15)*60);
}
function render(){
 if(!questions.length)return;
 const q=questions[current],qn=document.getElementById('questionNumber'),qt=document.getElementById('questionText'),wrap=document.getElementById('options');
 if(qn)qn.textContent='QUESTION '+(current+1)+' OF '+questions.length;if(qt)qt.textContent=q.text;
 if(wrap){wrap.innerHTML=q.options.map((o,i)=>'<button class="answer-option '+(answers[current]===i?'selected':'')+'" data-i="'+i+'"><span>'+String.fromCharCode(65+i)+'</span>'+o+'</button>').join('');wrap.querySelectorAll('button').forEach(b=>b.onclick=()=>{answers[current]=+b.dataset.i;render()})}
 const progress=document.getElementById('progress');if(progress)progress.style.width=((current+1)/questions.length*100)+'%';
 const answered=document.getElementById('answeredCount');if(answered)answered.textContent=answers.filter(a=>a!==null).length+' answered';
 const numbers=document.getElementById('numbers');if(numbers){numbers.innerHTML=questions.map((_,i)=>'<button class="num '+(i===current?'current ':'')+(answers[i]!==null?'answered':'')+'" data-i="'+i+'">'+(i+1)+'</button>').join('');numbers.querySelectorAll('button').forEach(b=>b.onclick=()=>{current=Number(b.dataset.i);render()})}
 const prev=document.getElementById('prevBtn'),next=document.getElementById('nextBtn');if(prev)prev.disabled=current===0;if(next)next.textContent=current===questions.length-1?'Submit Quiz':'Next Question →';
}
function startTimer(seconds){clearInterval(timer);let left=seconds;const tick=()=>{const m=Math.floor(left/60),s=String(left%60).padStart(2,'0'),el=document.getElementById('timer');if(el)el.textContent=m+':'+s;if(left<=0){clearInterval(timer);submitQuiz(true)}left--};tick();timer=setInterval(tick,1000)}
async function submitQuiz(auto=false){
 clearInterval(timer);const quiz=questions;let score=0;answers.forEach((a,i)=>{if(a!==null&&a===quiz[i].answer)score++});
 const timeTaken=Math.round((Date.now()-startedAt)/1000),payload={quizId,answers,score,total:quiz.length,timeTaken};
 try{const r=await fetch(MindQuizAuth.API_BASE+'/attempts',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('mindQuizToken')},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw new Error(data.message||'Could not save result.');localStorage.setItem('mindQuizLastAttempt',JSON.stringify(data.attempt))}catch(e){localStorage.setItem('mindQuizLastAttempt',JSON.stringify({quizId,quizTitle:document.getElementById('quizTitle')?.textContent||'Mind Quiz',score,total:quiz.length,percentage:Math.round(score/quiz.length*100),timeTaken}))}
 document.getElementById('resultModal')?.classList.add('show');const sv=document.getElementById('scoreValue'),sp=document.getElementById('scorePercent');if(sv)sv.textContent=score+'/'+quiz.length;if(sp)sp.textContent=Math.round(score/quiz.length*100)+'%';
}
function renderFallback(){const q=document.getElementById('questionText');if(q)q.textContent='Quiz could not be loaded. Please return to the dashboard and try again.';const o=document.getElementById('options');if(o)o.innerHTML='';}
document.getElementById('prevBtn')?.addEventListener('click',()=>{if(current>0){current--;render()}});
document.getElementById('nextBtn')?.addEventListener('click',()=>{if(current<questions.length-1){current++;render()}else submitQuiz(false)});
document.getElementById('submitQuiz')?.addEventListener('click',()=>submitQuiz(false));
document.getElementById('retryQuiz')?.addEventListener('click',()=>location.reload());
loadQuiz();