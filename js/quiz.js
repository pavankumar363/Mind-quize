let questions=[];
let current=0;
let answers=[];
let startedAt=Date.now();
let quizId=null;
let timer=null;
const params=new URLSearchParams(location.search);

function getQuiz(){
  try{return JSON.parse(localStorage.getItem('mindQuizPublished')||'null')}catch{return null}
}
async function loadQuiz(){
  if(window.MindQuizAuth && !MindQuizAuth.requireRole('student')) return;
  const local=getQuiz();
  const id=params.get('id');
  try{
    const r=await fetch(MindQuizAuth.API_BASE+'/api/quizzes',{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});
    const data=await r.json();
    const remote=(data.quizzes||[]).find(q=>q.id===id) || (data.quizzes||[]).find(q=>!id) || local;
    if(remote) start(remote); else renderFallback();
  }catch(e){ if(local) start(local); else renderFallback(); }
}
function start(quiz){
  quizId=quiz.id||null;
  questions=quiz.questions||[];
  answers=new Array(questions.length).fill(null);
  document.getElementById('quizTitle').textContent=quiz.title||'Mind Quiz';
  const total=questions.length;
  document.getElementById('questionCount').textContent=total;
  document.getElementById('totalQuestions').textContent=total;
  document.getElementById('timer').textContent=(quiz.time||15)+':00';
  render();
  startTimer((quiz.time||15)*60);
}
function render(){
  if(!questions.length)return;
  const q=questions[current];
  document.getElementById('questionNumber').textContent='QUESTION '+(current+1)+' OF '+questions.length;
  document.getElementById('questionText').textContent=q.text;
  const wrap=document.getElementById('options');
  wrap.innerHTML=q.options.map((o,i)=>'<button class="answer-option '+(answers[current]===i?'selected':'')+'" data-i="'+i+'"><span>'+String.fromCharCode(65+i)+'</span>'+o+'</button>').join('');
  wrap.querySelectorAll('button').forEach(b=>b.onclick=()=>{answers[current]=+b.dataset.i;render()});
  document.getElementById('progress').style.width=((current+1)/questions.length*100)+'%';
  document.getElementById('answeredCount').textContent=answers.filter(a=>a!==null).length+' answered';
  const numbers=document.getElementById('numbers');
  numbers.innerHTML=questions.map((_,i)=>'<button class="q-number '+(i===current?'current ':'')+(answers[i]!==null?'answered':'')+'" data-i="'+i+'">'+(i+1)+'</button>').join('');
  numbers.querySelectorAll('button').forEach(b=>b.onclick=()=>{current=Number(b.dataset.i);render()});
  document.getElementById('prevBtn').disabled=current===0;
  document.getElementById('nextBtn').textContent=current===questions.length-1?'Submit Quiz':'Next Question →';
}
function startTimer(seconds){
  clearInterval(timer); let left=seconds;
  const tick=()=>{const m=Math.floor(left/60),s=String(left%60).padStart(2,'0');document.getElementById('timer').textContent=m+':'+s;if(left<=0){clearInterval(timer);submitQuiz(true)}left--};
  tick();timer=setInterval(tick,1000);
}
async function submitQuiz(auto=false){
  clearInterval(timer);
  const quiz=questions;
  let score=0; answers.forEach((a,i)=>{if(a!==null && a===quiz[i].answer)score++});
  const timeTaken=Math.round((Date.now()-startedAt)/1000);
  const payload={quizId,answers,score,total:quiz.length,timeTaken};
  try{
    const r=await fetch(MindQuizAuth.API_BASE+'/api/attempts',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('mindQuizToken')},body:JSON.stringify(payload)});
    const data=await r.json(); if(!r.ok)throw new Error(data.message||'Could not save result.');
    localStorage.setItem('mindQuizLastAttempt',JSON.stringify(data.attempt));
  }catch(e){localStorage.setItem('mindQuizLastAttempt',JSON.stringify({quizTitle:document.getElementById('quizTitle').textContent,score,total:quiz.length,percentage:Math.round(score/quiz.length*100),timeTaken}));}
  document.getElementById('resultModal').classList.add('show');
  document.getElementById('scoreValue').textContent=score+'/'+quiz.length;
  document.getElementById('scorePercent').textContent=Math.round(score/quiz.length*100)+'%';
}
document.getElementById('prevBtn').onclick=()=>{if(current>0){current--;render()}};
document.getElementById('nextBtn').onclick=()=>{if(current<questions.length-1){current++;render()}else submitQuiz(false)};
document.getElementById('submitQuiz').onclick=()=>submitQuiz(false);
document.getElementById('retryQuiz').onclick=()=>location.reload();
document.getElementById('backDashboard').onclick=()=>location.href='student.html';
loadQuiz();