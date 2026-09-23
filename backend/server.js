const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const QUIZZES_FILE = path.join(DATA_DIR, "quizzes.json");
const ATTEMPTS_FILE = path.join(DATA_DIR, "attempts.json");
const sessions = new Map();

app.use(express.json({ limit: "1mb" }));
app.use((req,res,next)=>{
  const allowed = process.env.CLIENT_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if(req.method==="OPTIONS") return res.sendStatus(204);
  next();
});

function ensureData(){fs.mkdirSync(DATA_DIR,{recursive:true});if(!fs.existsSync(QUIZZES_FILE))fs.writeFileSync(QUIZZES_FILE,"[]");if(!fs.existsSync(ATTEMPTS_FILE))fs.writeFileSync(ATTEMPTS_FILE,"[]");if(!fs.existsSync(USERS_FILE)){const users=[seedUser("admin","admin@mindquiz.local","Admin","admin123"),seedUser("faculty1","faculty1@mindquiz.local","Faculty","faculty123"),seedUser("student1","student1@mindquiz.local","Student","student123")];fs.writeFileSync(USERS_FILE,JSON.stringify(users,null,2));}}
function seedUser(username,email,role,password,name=""){return{id:crypto.randomUUID(),username,email,role,name:String(name||"").trim(),passwordHash:hash(password),createdAt:new Date().toISOString()};}
function hash(value){return crypto.createHash("sha256").update(value).digest("hex");}
function users(){ensureData();return JSON.parse(fs.readFileSync(USERS_FILE,"utf8"));}
function quizzes(){ensureData();return JSON.parse(fs.readFileSync(QUIZZES_FILE,"utf8"));}
function saveQuizzes(items){fs.writeFileSync(QUIZZES_FILE,JSON.stringify(items,null,2));}
function attempts(){ensureData();return JSON.parse(fs.readFileSync(ATTEMPTS_FILE,"utf8"));}
function saveAttempts(items){fs.writeFileSync(ATTEMPTS_FILE,JSON.stringify(items,null,2));}
function safeUser(u){return{id:u.id,username:u.username,email:u.email,role:u.role,name:u.name||""};}

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Mind Quiz API",runtime:process.env.VERCEL?"vercel":"node"}));

app.post("/api/register",(req,res)=>{
  const {username,password,email,fullName}=req.body||{};const cleanUsername=String(username||"").trim();const cleanEmail=String(email||"").trim();
  if(!cleanUsername||!password||!cleanEmail)return res.status(400).json({message:"Username, email and password are required."});
  if(cleanUsername.length<3)return res.status(400).json({message:"Username must be at least 3 characters."});
  if(String(password).length<6)return res.status(400).json({message:"Password must be at least 6 characters."});
  const all=users();
  if(all.some(u=>u.username.toLowerCase()===cleanUsername.toLowerCase()))return res.status(409).json({message:"Username already exists."});
  if(all.some(u=>u.email.toLowerCase()===cleanEmail.toLowerCase()))return res.status(409).json({message:"Email already registered."});
  const user=seedUser(cleanUsername,cleanEmail,"Student",String(password),fullName);all.push(user);fs.writeFileSync(USERS_FILE,JSON.stringify(all,null,2));
  const token=crypto.randomBytes(32).toString("hex");sessions.set(token,{userId:user.id,expiresAt:Date.now()+8*60*60*1000});res.status(201).json({token,user:safeUser(user)});
});
app.post("/api/login",(req,res)=>{
  const {username,password,role}=req.body||{};if(!username||!password||!role)return res.status(400).json({message:"Username, password and role are required."});
  const user=users().find(u=>u.username.toLowerCase()===String(username).trim().toLowerCase()&&u.role.toLowerCase()===String(role).toLowerCase());
  if(!user||user.passwordHash!==hash(password))return res.status(401).json({message:"Invalid login details."});
  const token=crypto.randomBytes(32).toString("hex");sessions.set(token,{userId:user.id,expiresAt:Date.now()+8*60*60*1000});res.json({token,user:safeUser(user)});
});
function auth(req,res,next){const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");const session=sessions.get(token);if(!session||session.expiresAt<Date.now()){sessions.delete(token);return res.status(401).json({message:"Session expired. Please log in again."});}const user=users().find(u=>u.id===session.userId);if(!user)return res.status(401).json({message:"User account not found."});req.user=user;next();}
app.get("/api/me",auth,(req,res)=>res.json({user:safeUser(req.user)}));
app.get("/api/quizzes",auth,(req,res)=>{const query=String(req.query.q||"").trim().toLowerCase();const category=String(req.query.category||"").trim().toLowerCase();let list=quizzes().filter(q=>q.status==="published");if(query)list=list.filter(q=>[q.title,q.description,q.category].some(v=>String(v||"").toLowerCase().includes(query)));if(category&&category!=="all")list=list.filter(q=>String(q.category||"").toLowerCase()===category);res.json({quizzes:list});});
app.post("/api/quizzes",auth,(req,res)=>{if(!["faculty","admin"].includes(req.user.role.toLowerCase()))return res.status(403).json({message:"Only Faculty or Admin can publish quizzes."});const body=req.body||{};if(!body.title||!Array.isArray(body.questions)||!body.questions.length)return res.status(400).json({message:"Quiz title and questions are required."});const item={id:crypto.randomUUID(),title:String(body.title).trim(),category:String(body.category||"General"),description:String(body.description||""),time:Number(body.time)||15,questions:body.questions,status:body.status==="draft"?"draft":"published",createdBy:req.user.id,createdByName:req.user.username,createdAt:new Date().toISOString()};const all=quizzes();all.unshift(item);saveQuizzes(all);res.status(201).json({quiz:item});});
app.post("/api/attempts",(req,res)=>{const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");const session=sessions.get(token);if(!session||session.expiresAt<Date.now())return res.status(401).json({message:"Please log in again."});const user=users().find(u=>u.id===session.userId);if(!user)return res.status(401).json({message:"User account not found."});if(user.role.toLowerCase()!=="student")return res.status(403).json({message:"Only students can submit quiz attempts."});const {quizId,answers,score,timeTaken}=req.body||{};const quiz=quizzes().find(q=>q.id===quizId);if(!quiz)return res.status(404).json({message:"Quiz not found."});const safeScore=Math.max(0,Math.min(Number(score)||0,quiz.questions.length));const cleanAnswers=Array.isArray(answers)?answers:[];const breakdown=quiz.questions.map((q,i)=>({question:q.text,selected:cleanAnswers[i]??null,correct:q.answer,correctText:q.options?.[q.answer]??"",selectedText:cleanAnswers[i]!=null?q.options?.[cleanAnswers[i]]??"":"",}));const attempt={id:crypto.randomUUID(),quizId,userId:user.id,studentUsername:user.username,quizTitle:quiz.title,category:quiz.category,score:safeScore,total:quiz.questions.length,percentage:Math.round((safeScore/quiz.questions.length)*100),answers:cleanAnswers,breakdown,timeTaken:Number(timeTaken)||0,submittedAt:new Date().toISOString()};const all=attempts();all.unshift(attempt);saveAttempts(all);res.status(201).json({attempt});});
app.get("/api/my-attempts",auth,(req,res)=>{if(req.user.role.toLowerCase()!=="student")return res.status(403).json({message:"Students only."});res.json({attempts:attempts().filter(a=>a.userId===req.user.id)});});
app.get("/api/leaderboard",auth,(req,res)=>{const allUsers=users(),allAttempts=attempts(),map=new Map();allAttempts.forEach(a=>{const u=allUsers.find(x=>x.id===a.userId);if(!u||u.role.toLowerCase()!=="student")return;const item=map.get(u.id)||{userId:u.id,name:u.name||u.username,username:u.username,attempts:0,totalScore:0,best:0};item.attempts++;item.totalScore+=Number(a.percentage)||0;item.best=Math.max(item.best,Number(a.percentage)||0);map.set(u.id,item);});const rows=[...map.values()].map(x=>({...x,average:Math.round(x.totalScore/x.attempts)})).sort((a,b)=>b.average-a.average||b.best-a.best||b.attempts-a.attempts).slice(0,20);res.json({leaderboard:rows.map((x,i)=>({...x,rank:i+1}))});});
app.get("/api/profile",auth,(req,res)=>res.json({user:safeUser(req.user)}));
app.put("/api/profile",auth,(req,res)=>{const{name,email}=req.body||{};const cleanName=String(name??req.user.name??"").trim();const cleanEmail=String(email??req.user.email??"").trim();if(!cleanName||!cleanEmail)return res.status(400).json({message:"Name and email are required."});if(!/^\S+@\S+\.\S+$/.test(cleanEmail))return res.status(400).json({message:"Enter a valid email address."});const all=users(),i=all.findIndex(u=>u.id===req.user.id);if(i<0)return res.status(404).json({message:"User account not found."});if(all.some((u,idx)=>idx!==i&&u.email.toLowerCase()===cleanEmail.toLowerCase()))return res.status(409).json({message:"Email already registered."});all[i].name=cleanName;all[i].email=cleanEmail;all[i].updatedAt=new Date().toISOString();fs.writeFileSync(USERS_FILE,JSON.stringify(all,null,2));res.json({user:safeUser(all[i])});});
app.post("/api/change-password",auth,(req,res)=>{const{currentPassword,newPassword}=req.body||{};if(!currentPassword||!newPassword)return res.status(400).json({message:"Current and new passwords are required."});if(String(newPassword).length<6)return res.status(400).json({message:"New password must be at least 6 characters."});const all=users(),i=all.findIndex(u=>u.id===req.user.id);if(i<0)return res.status(404).json({message:"User account not found."});if(all[i].passwordHash!==hash(String(currentPassword)))return res.status(401).json({message:"Current password is incorrect."});all[i].passwordHash=hash(String(newPassword));all[i].updatedAt=new Date().toISOString();fs.writeFileSync(USERS_FILE,JSON.stringify(all,null,2));res.json({ok:true,message:"Password changed successfully."});});
app.get("/api/student/insights",auth,(req,res)=>{if(req.user.role.toLowerCase()!=="student")return res.status(403).json({message:"Students only."});const mine=attempts().filter(a=>a.userId===req.user.id);const best=mine.length?Math.max(...mine.map(a=>Number(a.percentage)||0)):0;const avg=mine.length?Math.round(mine.reduce((n,a)=>n+(Number(a.percentage)||0),0)/mine.length):0;res.json({stats:{attempts:mine.length,average:avg,best,streak:0},badges:mine.length?[{key:"first",icon:"★",title:"First Quiz",text:"Completed your first quiz."}]:[],recommended:quizzes().filter(q=>q.status==="published").slice(0,6),notifications:mine.length?[]:[{type:"info",title:"Welcome to Mind Quiz",text:"Take your first quiz to start your learning record."}]});});
app.get("/api/attempts/:id",auth,(req,res)=>{const a=attempts().find(x=>x.id===req.params.id);if(!a)return res.status(404).json({message:"Attempt not found."});if(req.user.role.toLowerCase()!=="admin"&&a.userId!==req.user.id)return res.status(403).json({message:"You cannot view this attempt."});res.json({attempt:a});});
app.post("/api/logout",auth,(req,res)=>{const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");sessions.delete(token);res.json({ok:true});});

if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT,()=>console.log(`Mind Quiz API running on http://localhost:${PORT}`));
}
module.exports = app;
