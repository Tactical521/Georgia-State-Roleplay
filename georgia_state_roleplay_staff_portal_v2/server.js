const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const CONTENT_FILE = path.join(DATA, "content.json");
const SETTINGS_FILE = path.join(DATA, "settings.json");
const ADMIN_FILE = path.join(DATA, "admin.json");
const upload = multer({ dest: path.join(ROOT, "public", "uploads") });

fs.mkdirSync(path.join(ROOT, "public", "uploads"), { recursive: true });

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

if (!fs.existsSync(ADMIN_FILE)) {
  // First-run password. Change it immediately from Admin > Security.
  const hash = bcrypt.hashSync("ChangeMe123!", 12);
  writeJSON(ADMIN_FILE, { username: "admin", passwordHash: hash });
}

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || readJSON(SETTINGS_FILE, {}).sessionSecret || "replace-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly:true, sameSite:"lax", secure: process.env.NODE_ENV === "production", maxAge: 1000*60*60*8 }
}));
app.use(express.static(path.join(ROOT, "public")));

function safeUser(req) {
  return req.session.user ? { username:req.session.user.username } : null;
}

async function logEvent(req, action, details="") {
  // Never include passwords, session IDs, or webhook secrets in logs.
  const settings = readJSON(SETTINGS_FILE, {});
  const entry = {
    time: new Date().toISOString(),
    action,
    user: req.session.user?.username || "guest",
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown",
    details: String(details).slice(0, 800)
  };
  console.log("[AUDIT]", entry);

  if (settings.webhook) {
    try {
      await fetch(settings.webhook, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          username:"GS Roleplay Staff Portal",
          embeds:[{
            title:"Staff Portal Audit Log",
            color:3447003,
            fields:[
              {name:"Action", value:entry.action, inline:true},
              {name:"User", value:entry.user, inline:true},
              {name:"IP", value:entry.ip, inline:true},
              {name:"Details", value:entry.details || "None"}
            ],
            timestamp:entry.time
          }]
        })
      });
    } catch (e) {
      console.error("Webhook logging failed:", e.message);
    }
  }
}

function requireAuth(req,res,next) {
  if (!req.session.user) return res.status(401).json({error:"Sign in required."});
  next();
}
function requireAdmin(req,res,next) {
  if (!req.session.user) return res.status(401).json({error:"Sign in required."});
  if (!req.session.user.admin) return res.status(403).json({error:"Admin access required."});
  next();
}

app.get("/api/site", (req,res) => {
  const settings = readJSON(SETTINGS_FILE, {});
  const content = readJSON(CONTENT_FILE, {});
  res.json({ ...content, siteName: settings.siteName, logo: settings.logo });
});

app.get("/api/session", (req,res) => res.json({user:safeUser(req)}));

app.post("/api/login", async (req,res) => {
  const {username,password} = req.body;
  const admin = readJSON(ADMIN_FILE, {});
  if (!username || !password || username !== admin.username || !bcrypt.compareSync(password, admin.passwordHash)) {
    await logEvent(req,"LOGIN_FAILED",`Failed sign-in attempt for username "${String(username||"").slice(0,60)}".`);
    return res.status(401).json({error:"Invalid username or password."});
  }
  req.session.user = {username:admin.username, admin:true};
  await logEvent(req,"LOGIN_SUCCESS","Administrator signed in.");
  res.json({ok:true});
});

app.post("/api/logout", requireAuth, async (req,res) => {
  await logEvent(req,"LOGOUT","Administrator signed out.");
  req.session.destroy(()=>res.json({ok:true}));
});

app.get("/api/admin/content", requireAdmin, (req,res) => res.json(readJSON(CONTENT_FILE, {})));

app.put("/api/admin/content", requireAdmin, async (req,res) => {
  // Only allow the expected content structure; this prevents arbitrary server-side file writes.
  const incoming = req.body;
  const current = readJSON(CONTENT_FILE, {});
  const allowed = ["heroTitle","heroDescription","announcementTitle","announcementText","rulesIntro","guidesIntro","trainingIntro","proceduresIntro","resourcesIntro","rules","guides","training","procedures","resources"];
  for (const key of allowed) if (incoming[key] !== undefined) current[key] = incoming[key];
  writeJSON(CONTENT_FILE,current);
  await logEvent(req,"CONTENT_UPDATED","Site content was updated from the admin editor.");
  res.json({ok:true});
});

app.put("/api/admin/site", requireAdmin, async (req,res) => {
  const settings = readJSON(SETTINGS_FILE,{});
  if (typeof req.body.siteName === "string" && req.body.siteName.trim()) settings.siteName = req.body.siteName.trim().slice(0,80);
  if (typeof req.body.webhook === "string") settings.webhook = req.body.webhook.trim();
  writeJSON(SETTINGS_FILE,settings);
  await logEvent(req,"SITE_SETTINGS_UPDATED","Site name or Discord webhook setting was changed.");
  res.json({ok:true, siteName:settings.siteName});
});

app.post("/api/admin/logo", requireAdmin, upload.single("logo"), async (req,res) => {
  if (!req.file) return res.status(400).json({error:"No image uploaded."});
  const ext = path.extname(req.file.originalname).toLowerCase();
  const allowed = [".png",".jpg",".jpeg",".webp"];
  if (!allowed.includes(ext)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({error:"Use PNG, JPG, JPEG, or WEBP."});
  }
  const target = path.join(ROOT,"public","uploads","site-logo"+ext);
  fs.renameSync(req.file.path,target);
  const settings = readJSON(SETTINGS_FILE,{});
  settings.logo = "uploads/site-logo"+ext;
  writeJSON(SETTINGS_FILE,settings);
  await logEvent(req,"LOGO_UPDATED","Site logo was replaced.");
  res.json({ok:true,logo:settings.logo});
});

app.put("/api/admin/security", requireAdmin, async (req,res) => {
  const {currentPassword,newUsername,newPassword} = req.body;
  const admin = readJSON(ADMIN_FILE,{});
  if (!currentPassword || !bcrypt.compareSync(currentPassword,admin.passwordHash)) {
    await logEvent(req,"PASSWORD_CHANGE_FAILED","Security settings update failed because the current password was incorrect.");
    return res.status(400).json({error:"Current password is incorrect."});
  }
  if (newUsername) admin.username = String(newUsername).trim().slice(0,40);
  if (newPassword) {
    if (String(newPassword).length < 10) return res.status(400).json({error:"New password must be at least 10 characters."});
    admin.passwordHash = bcrypt.hashSync(String(newPassword),12);
  }
  writeJSON(ADMIN_FILE,admin);
  req.session.user.username = admin.username;
  await logEvent(req,"SECURITY_UPDATED","Administrator username and/or password was changed.");
  res.json({ok:true});
});

app.get("/api/admin/log-status", requireAdmin, (req,res) => {
  const settings = readJSON(SETTINGS_FILE,{});
  res.json({webhookConfigured:Boolean(settings.webhook)});
});

app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"public","index.html")));

app.listen(PORT,()=>console.log(`Georgia State Roleplay Staff Portal running on http://localhost:${PORT}`));
