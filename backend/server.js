const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const QUIZZES_FILE = path.join(DATA_DIR, "quizzes.json");
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
function safeUser(u){ return {id:u.id,username:u.username,email:u.email,role:u.role}; }

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Mind Quiz API"}));

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
    status:"published",
    createdBy:req.user.id,
    createdByName:req.user.username,
    createdAt:new Date().toISOString()
  };
  const all=quizzes();
  all.unshift(item);
  saveQuizzes(all);
  res.status(201).json({quiz:item});
});
app.post("/api/logout",auth,(req,res)=>{
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  sessions.delete(token);
  res.json({ok:true});
});

app.listen(PORT,()=>console.log(`Mind Quiz API running on http://localhost:${PORT}`));