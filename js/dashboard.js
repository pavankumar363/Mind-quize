const menu=document.getElementById('dashMenu');const sidebar=document.getElementById('sidebar');if(menu)menu.addEventListener('click',()=>sidebar.classList.toggle('open'));document.querySelectorAll('.quiz-card button').forEach(btn=>btn.addEventListener('click',()=>{btn.textContent='Quiz selected ✓';btn.style.background='#7bea8b';btn.style.color='#102015'}));

async function loadAvailableQuizzes(){
 const el=document.getElementById('quizList'); if(!el||!window.MindQuizAuth)return;
 try{const r=await fetch(MindQuizAuth.API_BASE+'/api/quizzes',{headers:{Authorization:'Bearer '+localStorage.getItem('mindQuizToken')}});const d=await r.json();
 el.innerHTML=(d.quizzes||[]).map(q=>'<article class="quiz-card"><span class="quiz-badge">'+(q.category||'General')+'</span><h3>'+q.title+'</h3><p>'+(q.description||'Test your knowledge.')+'</p><small>'+q.questions.length+' Questions • '+q.time+' min</small><a class="next-btn" href="quiz.html?id='+encodeURIComponent(q.id)+'">Start Quiz →</a></article>').join('')||'<p>No published quizzes yet.</p>';
 }catch(e){el.innerHTML='<p>Unable to load quizzes. Start the Mind Quiz server and refresh.</p>';}
}
loadAvailableQuizzes();