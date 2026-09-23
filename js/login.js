const roles=document.querySelectorAll('.role');
const roleLabel=document.getElementById('roleLabel');
const username=document.getElementById('username');
const password=document.getElementById('password');
const note=document.getElementById('demoNote');

roles.forEach(role=>role.addEventListener('click',()=>{
  roles.forEach(r=>r.classList.remove('active'));
  role.classList.add('active');
  const name=role.dataset.role.charAt(0).toUpperCase()+role.dataset.role.slice(1);
  roleLabel.textContent=name;
  username.placeholder='Enter '+name.toLowerCase()+' username or ID';
  note.textContent='Sign in securely as '+name+'.';
  note.style.color='';
}));

document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const role=document.querySelector('.role.active').dataset.role;
  const btn=document.querySelector('.login-btn');
  btn.disabled=true;
  btn.classList.add('loading');
  note.textContent='Signing in…';
  note.style.color='';

  try{
    const response=await fetch((window.MindQuizAuth?.API_BASE||'http://localhost:4000')+'/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:username.value.trim(),password:password.value,role})
    });
    const data=await response.json();
    if(!response.ok) throw new Error(data.message||'Login failed.');
    window.MindQuizAuth.saveSession(data);
    const destination={student:'student.html',faculty:'faculty.html',admin:'admin.html'}[data.user.role.toLowerCase()];
    window.location.href=destination||'index.html';
  }catch(error){
    note.textContent=error.message.includes('Failed to fetch')
      ? 'Authentication server is not running. Start the backend and try again.'
      : error.message;
    note.style.color='#ff8f8f';
  }finally{
    btn.disabled=false;
    btn.classList.remove('loading');
  }
});