const API_BASE = localStorage.getItem("mindQuizApi") || "https://rvgmbpvksoyflfcebxyo.supabase.co/functions/v1/mind-quiz-api";

function saveSession(data){
  localStorage.setItem("mindQuizToken",data.token);
  localStorage.setItem("mindQuizUser",JSON.stringify(data.user));
}
function getUser(){
  try{return JSON.parse(localStorage.getItem("mindQuizUser")||"null")}catch{return null}
}
function logout(){
  const token=localStorage.getItem("mindQuizToken");
  if(token) fetch(API_BASE+"/logout",{method:"POST",headers:{Authorization:"Bearer "+token}}).catch(()=>{});
  localStorage.removeItem("mindQuizToken");
  localStorage.removeItem("mindQuizUser");
  window.location.href="login.html";
}
function requireRole(role){
  const user=getUser();
  if(!user || (role && user.role.toLowerCase()!==role.toLowerCase())){
    window.location.href="login.html";
    return false;
  }
  return true;
}
window.MindQuizAuth={API_BASE,saveSession,getUser,logout,requireRole};