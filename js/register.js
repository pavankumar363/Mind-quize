const form=document.getElementById('registerForm');
const msg=document.getElementById('registerMsg');
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const password=document.getElementById('password').value;
 const confirm=document.getElementById('confirmPassword').value;
 if(password!==confirm){msg.textContent='Passwords do not match.';msg.style.color='#ff8f8f';return;}
 msg.textContent='Creating your account…';msg.style.color='';
 try{
  const response=await fetch(MindQuizAuth.API_BASE+'/register',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    fullName:document.getElementById('fullName').value.trim(),
    username:document.getElementById('username').value.trim(),
    email:document.getElementById('email').value.trim(),
    password
   })
  });
  const data=await response.json();
  if(!response.ok) throw new Error(data.message||'Registration failed.');
  MindQuizAuth.saveSession(data);
  msg.textContent='Account created. Opening your dashboard…';msg.style.color='#7bea8b';
  setTimeout(()=>location.href='student.html',500);
 }catch(error){
  msg.textContent=error.message.includes('Failed to fetch')?'Authentication server is not running. Start the backend and try again.':error.message;
  msg.style.color='#ff8f8f';
 }
});