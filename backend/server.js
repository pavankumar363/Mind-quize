const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const QUIZZES_FILE = path.join(DATA_DIR, "quizzes.json");
const ATTEMPTS_FILE = path.join(DATA_DIR, "attempts.json");
const sessions = new Map();

app.use(express.json({ limit: "1mb" }));
app.use((req,res,next)=>{
  res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method==="OPTIONS") return res.sendStatus(204);
  next();
});

function ensureData(){
  fs.mkdirSync(DATA_DIR,{recursive:true});
  if(!fs.existsSync(QUIZZES_FILE)) fs.writeFileSync(QUIZZES_FILE,"[]");
  if(!fs.existsSync(ATTEMPTS_FILE)) fs.writeFileSync(ATTEMPTS_FILE,"[]");
  if(!fs.existsSync(USERS_FILE)){
    const users=[
      seedUser("admin","admin@mindquiz.local","Admin","admin123"),
      seedUser("faculty1","faculty1@mindquiz.local","Faculty","faculty123"),
      seedUser("student1","student1@mindquiz.local","Student","student123")
    ];
    fs.writeFileSync(USERS_FILE,JSON.stringify(users,null,2));
  }
}
function seedUser(username,email,role,password){
  return {id:crypto.randomUUID(),username,email,role,passwordHash:hash(password),createdAt:new Date().toISOString()};
}
function hash(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function users(){ ensureData(); return JSON.parse(fs.readFileSync(USERS_FILE,"utf8")); }
function quizzes(){ ensureData(); return JSON.parse(fs.readFileSync(QUIZZES_FILE,"utf8")); }
function saveQuizzes(items){ fs.writeFileSync(QUIZZES_FILE,JSON.stringify(items,null,2)); }
function attempts(){ ensureData(); return JSON.parse(fs.readFileSync(ATTEMPTS_FILE,"utf8")); }
function saveAttempts(items){ fs.writeFileSync(ATTEMPTS_FILE,JSON.stringify(items,null,2)); }
function safeUser(u){ return {id:u.id,username:u.username,email:u.email,role:u.role}; }

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Mind Quiz API"}));

app.post("/api/register",(req,res)=>{
  const {username,password,email}=req.body||{};
  const cleanUsername=String(username||"").trim();
  const cleanEmail=String(email||"").trim();
  if(!cleanUsername || !password || !cleanEmail) return res.status(400).json({message:"Name, email and password are required."});
  if(cleanUsername.length<3) return res.status(400).json({message:"Username must be at least 3 characters."});
  if(String(password).length<6) return res.status(400).json({message:"Password must be at least 6 characters."});
  const all=users();
  if(all.some(u=>u.username.toLowerCase()===cleanUsername.toLowerCase())) return res.status(409).json({message:"Username already exists."});
  if(all.some(u=>u.email.toLowerCase()===cleanEmail.toLowerCase())) return res.status(409).json({message:"Email already registered."});
  const user=seedUser(cleanUsername,cleanEmail,"Student",String(password));
  all.push(user);
  fs.writeFileSync(USERS_FILE,JSON.stringify(all,null,2));
  const token=crypto.randomBytes(32).toString("hex");
  sessions.set(token,{userId:user.id,expiresAt:Date.now()+8*60*60*1000});
  res.status(201).json({token,user:safeUser(user)});
});

app.post("/api/login",(req,res)=>{
  const {username,password,role}=req.body||{};
  if(!username||!password||!role) return res.status(400).json({message:"Username, password and role are required."});
  const user=users().find(u=>u.username.toLowerCase()===String(username).trim().toLowerCase() && u.role.toLowerCase()===String(role).toLowerCase());
  if(!user || user.passwordHash!==hash(password)) return res.status(401).json({message:"Invalid login details."});
  const token=crypto.randomBytes(32).toString("hex");
  sessions.set(token,{userId:user.id,expiresAt:Date.now()+8*60*60*1000});
  res.json({token,user:safeUser(user)});
});

function auth(req,res,next){
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  const session=sessions.get(token);
  if(!session || session.expiresAt<Date.now()){
    sessions.delete(token);
    return res.status(401).json({message:"Session expired. Please log in again."});
  }
  const user=users().find(u=>u.id===session.userId);
  if(!user) return res.status(401).json({message:"User account not found."});
  req.user=user;
  next();
}

app.get("/api/me",auth,(req,res)=>res.json({user:safeUser(req.user)}));

app.get("/api/quizzes",auth,(req,res)=>{
  res.json({quizzes:quizzes().filter(q=>q.status==="published")});
});

app.post("/api/quizzes",auth,(req,res)=>{
  if(req.user.role.toLowerCase()!=="faculty" && req.user.role.toLowerCase()!=="admin"){
    return res.status(403).json({message:"Only Faculty or Admin can publish quizzes."});
  }
  const body=req.body||{};
  if(!body.title || !Array.isArray(body.questions) || !body.questions.length){
    return res.status(400).json({message:"Quiz title and questions are required."});
  }
  const item={
    id:crypto.randomUUID(),
    title:String(body.title).trim(),
    category:String(body.category||"General"),
    description:String(body.description||""),
    time:Number(body.time)||15,
    questions:body.questions,
    status:body.status==="draft"?"draft":"published",
    createdBy:req.user.id,
    createdByName:req.user.username,
    createdAt:new Date().toISOString()
  };
  const all=quizzes();
  all.unshift(item);
  saveQuizzes(all);
  res.status(201).json({quiz:item});
});
app.post("/api/attempts",(req,res)=>{
  const token=(req.headers.authorization||"").replace(/^Bearer\\s+/i,"");
  const session=sessions.get(token);
  if(!session || session.expiresAt<Date.now()) return res.status(401).json({message:"Please log in again."});
  const user=users().find(u=>u.id===session.userId);
  if(!user) return res.status(401).json({message:"User account not found."});
  if(user.role.toLowerCase()!=="student") return res.status(403).json({message:"Only students can submit quiz attempts."});
  const {quizId,answers,score,total,timeTaken}=req.body||{};
  const quiz=quizzes().find(q=>q.id===quizId);
  if(!quiz) return res.status(404).json({message:"Quiz not found."});
  const safeScore=Math.max(0,Math.min(Number(score)||0,quiz.questions.length));
  const attempt={id:crypto.randomUUID(),quizId,userId:user.id,studentUsername:user.username,quizTitle:quiz.title,score:safeScore,total:quiz.questions.length,percentage:Math.round((safeScore/quiz.questions.length)*100),answers:Array.isArray(answers)?answers:[],timeTaken:Number(timeTaken)||0,submittedAt:new Date().toISOString()};
  const all=attempts(); all.unshift(attempt); saveAttempts(all);
  res.status(201).json({attempt});
});

app.get("/api/my-attempts",auth,(req,res)=>{
  if(req.user.role.toLowerCase()!=="student") return res.status(403).json({message:"Students only."});
  res.json({attempts:attempts().filter(a=>a.userId===req.user.id)});
});

app.get("/api/admin/overview",auth,(req,res)=>{
  if(req.user.role.toLowerCase()!=="admin") return res.status(403).json({message:"Admin only."});
  const allUsers=users(), allQuizzes=quizzes(), allAttempts=attempts();
  res.json({
    stats:{users:allUsers.length,students:allUsers.filter(u=>u.role==="Student").length,faculty:allUsers.filter(u=>u.role==="Faculty").length,admins:allUsers.filter(u=>u.role==="Admin").length,quizzes:allQuizzes.length,published:allQuizzes.filter(q=>q.status==="published").length,attempts:allAttempts.length},
    users:allUsers.map(safeUser),
    quizzes:allQuizzes.map(q=>({id:q.id,title:q.title,category:q.category,createdByName:q.createdByName,createdAt:q.createdAt,status:q.status,questions:q.questions.length})),
    attempts:allAttempts
  });
});

app.get("/api/faculty/overview",auth,(req,res)=>{
  if(req.user.role.toLowerCase()!=="faculty") return res.status(403).json({message:"Faculty only."});
  const qs=quizzes().filter(q=>q.createdBy===req.user.id), ids=new Set(qs.map(q=>q.id));
  const ats=attempts().filter(a=>ids.has(a.quizId));
  res.json({
    user:safeUser(req.user),
    stats:{quizzes:qs.length,active:qs.filter(q=>q.status==="published").length,attempts:ats.length,average:ats.length?Math.round(ats.reduce((s,a)=>s+a.percentage,0)/ats.length):0},
    quizzes:qs.map(q=>({...q,attempts:ats.filter(a=>a.quizId===q.id).length,average:ats.filter(a=>a.quizId===q.id).length?Math.round(ats.filter(a=>a.quizId===q.id).reduce((s,a)=>s+a.percentage,0)/ats.filter(a=>a.quizId===q.id).length):0})),
    attempts:ats
  });
});

app.put("/api/faculty/quizzes/:id",auth,(req,res)=>{
  if(req.user.role.toLowerCase()!=="faculty") return res.status(403).json({message:"Faculty only."});
  const all=quizzes(), i=all.findIndex(q=>q.id===req.params.id && q.createdBy===req.user.id);
  if(i<0) return res.status(404).json({message:"Quiz not found."});
  const b=req.body||{}, q=all[i];
  all[i]={...q,title:String(b.title??q.title).trim(),category:String(b.category??q.category),description:String(b.description??q.description),time:Number(b.time)||q.time,questions:Array.isArray(b.questions)?b.questions:q.questions,status:b.status==="draft"?"draft":"published",updatedAt:new Date().toISOString()};
  saveQuizzes(all); res.json({quiz:all[i]});
});

app.delete("/api/faculty/quizzes/:id",auth,(req,res)=>{
  if(req.user.role.toLowerCase()!=="faculty") return res.status(403).json({message:"Faculty only."});
  const all=quizzes(), q=all.find(x=>x.id===req.params.id && x.createdBy===req.user.id);
  if(!q) return res.status(404).json({message:"Quiz not found."});
  saveQuizzes(all.filter(x=>x.id!==req.params.id)); res.json({ok:true});
});

app.patch("/api/faculty/quizzes/:id/status",auth,(req,res)=>{
  if(req.user.role.toLowerCase()!=="faculty") return res.status(403).json({message:"Faculty only."});
  const all=quizzes(), i=all.findIndex(q=>q.id===req.params.id && q.createdBy===req.user.id);
  if(i<0) return res.status(404).json({message:"Quiz not found."});
  all[i].status=req.body?.status==="draft"?"draft":"published"; all[i].updatedAt=new Date().toISOString(); saveQuizzes(all); res.json({quiz:all[i]});
});

app.get("/api/faculty/attempts",auth,(req,res)=>{
  if(!["faculty","admin"].includes(req.user.role.toLowerCase())) return res.status(403).json({message:"Faculty or Admin only."});
  const qs=new Set(quizzes().filter(q=>req.user.role.toLowerCase()==="admin" || q.createdBy===req.user.id).map(q=>q.id));
  res.json({attempts:attempts().filter(a=>qs.has(a.quizId))});
});

app.post("/api/logout",auth,(req,res)=>{
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  sessions.delete(token);
  res.json({ok:true});
});

app.listen(PORT,()=>console.log(`Mind Quiz API running on http://localhost:${PORT}`));