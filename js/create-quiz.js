const state={questions:[{text:'',options:['','','',''],answer:0}]};
if(window.MindQuizAuth && !MindQuizAuth.requireRole('faculty')) throw new Error('Faculty access required.');
const $=id=>document.getElementById(id), api=MindQuizAuth.API_BASE;
const token=()=>localStorage.getItem('mindQuizToken');
const editId=new URLSearchParams(location.search).get('edit');

function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderQuestion(){
 $('questionHeading').textContent=state.questions.length+' Question'+(state.questions.length===1?'':'s');
 $('questionCount').value=state.questions.length;
 $('questionBuilder').innerHTML=state.questions.map((q,qi)=>'<div class="question-form"><label>Question '+(qi+1)+'<input class="qtext" data-q="'+qi+'" placeholder="Type your question here..." value="'+escapeHtml(q.text)+'"></label><div class="options-builder">'+q.options.map((o,oi)=>'<div class="option-row"><input type="radio" name="correct'+qi+'" data-a="'+qi+'" value="'+oi+'" '+(q.answer===oi?'checked':'')+'><span class="option-letter">'+String.fromCharCode(65+oi)+'</span><input type="text" class="opt" data-q="'+qi+'" data-o="'+oi+'" placeholder="Answer option '+String.fromCharCode(65+oi)+'" value="'+escapeHtml(o)+'"></div>').join('')+'</div><div class="hint">Select the correct answer.</div></div>').join('');
 document.querySelectorAll('.qtext').forEach(e=>e.oninput=()=>{state.questions[+e.dataset.q].text=e.value;updatePreview()});
 document.querySelectorAll('.opt').forEach(e=>e.oninput=()=>{state.questions[+e.dataset.q].options[+e.dataset.o]=e.value;updatePreview()});
 document.querySelectorAll('input[type=radio]').forEach(e=>e.onchange=()=>{state.questions[+e.dataset.a].answer=+e.value});
 updatePreview();
}
function updatePreview(){
 $('previewTitle').textContent=$('quizTitle').value||'Your quiz title';
 $('previewDescription').textContent=$('quizDescription').value||'Your quiz description will appear here.';
 $('previewCount').textContent=state.questions.length;
 $('previewTime').textContent=$('quizTime').value+' min';
 const q=state.questions[0]||{};
 $('previewQuestion').textContent=q.text||'Your question will appear here.';
}
function collect(){return{title:$('quizTitle').value.trim(),category:$('quizCategory').value,description:$('quizDescription').value.trim(),time:+$('quizTime').value,questions:state.questions}}
$('quizTitle').oninput=updatePreview;$('quizDescription').oninput=updatePreview;$('quizTime').onchange=updatePreview;
$('addQuestion').onclick=()=>{state.questions.push({text:'',options:['','','',''],answer:0});renderQuestion();document.querySelectorAll('.question-form')[state.questions.length-1]?.scrollIntoView({behavior:'smooth',block:'center'})};

async function loadEdit(){
 if(!editId)return;
 try{
  const r=await fetch(api+'/faculty/overview',{headers:{Authorization:'Bearer '+token()}});
  const d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to load quiz');
  const q=d.quizzes.find(x=>x.id===editId);if(!q)throw new Error('Quiz not found or you do not own it.');
  $('quizTitle').value=q.title||'';$('quizCategory').value=q.category||'Computer Science';$('quizDescription').value=q.description||'';$('quizTime').value=q.time||15;
  state.questions=(q.questions||[]).map(x=>({text:x.text||'',options:[...(x.options||[])].slice(0,4),answer:Number(x.answer)||0}));
  state.questions.forEach(q=>{while(q.options.length<4)q.options.push('')});
  document.title='Edit Quiz | Mind Quiz';document.querySelector('.creator-head h1').innerHTML='Edit your <em>quiz.</em>';document.querySelector('.creator-head p').textContent='Update questions, answers and quiz details, then save your changes.';$('saveState').textContent=q.status==='published'?'● Published':'● Draft';
  renderQuestion();
 }catch(e){toast(e.message);setTimeout(()=>location.href='faculty.html',1200)}
}
async function saveQuizToServer(status){
 const q=collect();q.status=status;
 if(!q.title){$('quizTitle').focus();toast('Please enter a quiz title.');return}
 if(q.questions.some(x=>!x.text.trim()||x.options.some(o=>!String(o).trim()))){toast('Complete every question and option first.');return}
 try{
  const r=await fetch(editId?api+'/faculty/quizzes/'+editId:api+'/quizzes',{method:editId?'PUT':'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify(q)});
  const d=await r.json();if(!r.ok)throw new Error(d.message||'Save failed.');
  localStorage.setItem('mindQuizPublished',JSON.stringify(d.quiz));$('saveState').textContent=status==='draft'?'● Draft saved':'● Published';toast(editId?'Quiz updated successfully.':(status==='draft'?'Draft saved successfully.':'Quiz published successfully.'));setTimeout(()=>location.href='faculty.html',700);
 }catch(e){toast(e.message)}
}
$('saveDraft').onclick=()=>saveQuizToServer('draft');$('publishQuiz').onclick=()=>saveQuizToServer('published');
const draft=localStorage.getItem('mindQuizDraft');
if(draft&&!editId){try{const d=JSON.parse(draft);$('quizTitle').value=d.title||'';$('quizCategory').value=d.category||'Computer Science';$('quizDescription').value=d.description||'';$('quizTime').value=d.time||15;state.questions=d.questions||state.questions}catch(e){}}
renderQuestion();loadEdit();