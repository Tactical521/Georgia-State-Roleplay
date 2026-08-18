let site=null, content=null;
const main=document.getElementById("main");

async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.style.display="block";setTimeout(()=>t.style.display="none",2500)}
async function boot(){
  const s=await api("/api/session");
  if(s.user){document.getElementById("login").classList.add("hidden");document.getElementById("app").classList.remove("hidden");document.getElementById("userBadge").textContent=s.user.username.toUpperCase();await loadSite();showPage("dashboard")}
}
async function loadSite(){site=await api("/api/site");content=site;document.title=site.siteName+" | Staff Center";document.getElementById("brandName").textContent=site.siteName;document.getElementById("brandLogo").src=site.logo+"?v="+Date.now();document.getElementById("loginLogo").src=site.logo+"?v="+Date.now()}
document.getElementById("loginForm").addEventListener("submit",async e=>{e.preventDefault();const err=document.getElementById("loginError");err.textContent="";try{await api("/api/login",{method:"POST",body:JSON.stringify({username:username.value,password:password.value})});location.reload()}catch(x){err.textContent=x.message}});
async function logout(){await api("/api/logout",{method:"POST"});location.reload()}

function navActive(name){document.querySelectorAll("aside button").forEach(b=>b.classList.toggle("active",b.dataset.page===name))}
function showPage(name){
 navActive(name);
 if(name==="dashboard") renderDashboard();
 if(name==="rules") renderRules();
 if(name==="guides") renderGuides();
 if(name==="training") renderTraining();
 if(name==="procedures") renderProcedures();
 if(name==="admin") renderAdmin();
}
function renderDashboard(){
 main.innerHTML=`<div class="hero"><div><span class="kicker">STAFF OPERATIONS</span><h1>${esc(site.heroTitle)}</h1><p>${esc(site.heroDescription)}</p></div><img src="${esc(site.logo)}?v=${Date.now()}" alt=""></div>
 <div class="section-title"><span class="kicker">QUICK ACCESS</span><h1>Staff resources.</h1></div>
 <div class="grid">${[
 ["rules","Staff Rules","Review staff expectations and standards."],
 ["guides","Staff Guides","Helpful guides for common staff responsibilities."],
 ["training","Training","Training information and requirements."],
 ["procedures","Procedures","How to properly handle staff situations."]
 ].map(x=>`<div class="card"><h3>${x[1]}</h3><p>${x[2]}</p><button onclick="showPage('${x[0]}')">Open →</button></div>`).join("")}</div>
 <div class="card" style="margin-top:14px"><span class="kicker">ANNOUNCEMENT</span><h3>${esc(site.announcementTitle)}</h3><p>${esc(site.announcementText)}</p></div>`;
}
function renderRules(){main.innerHTML=`<div class="section-title"><span class="kicker">STAFF INFORMATION / 01</span><h1>Staff Rules</h1><p>${esc(site.rulesIntro)}</p></div><div class="accordion">${site.rules.map((x,i)=>`<details ${i===0?"open":""}><summary>${esc(x.title)}</summary><p>${esc(x.text)}</p></details>`).join("")}</div>`}
function renderGuides(){main.innerHTML=`<div class="section-title"><span class="kicker">STAFF INFORMATION / 02</span><h1>Staff Guides</h1><p>${esc(site.guidesIntro)}</p></div><div class="grid three">${site.guides.map(x=>`<div class="card"><span class="kicker">GUIDE</span><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join("")}</div>`}
function renderTraining(){main.innerHTML=`<div class="section-title"><span class="kicker">STAFF INFORMATION / 03</span><h1>Training</h1><p>${esc(site.trainingIntro)}</p></div><div class="steps">${site.training.map((x,i)=>`<div class="step"><div class="num">${i+1}</div><div><b>${esc(x.title)}</b><p>${esc(x.text)}</p></div></div>`).join("")}</div>`}
function renderProcedures(){main.innerHTML=`<div class="section-title"><span class="kicker">STAFF INFORMATION / 04</span><h1>Procedures</h1><p>${esc(site.proceduresIntro)}</p></div><div class="grid">${site.procedures.map(x=>`<div class="card"><span class="kicker">PROCEDURE</span><h3>${esc(x.title)}</h3><ol>${x.steps.map(s=>`<li style="color:#8da3ba;font-size:12px;margin:6px 0">${esc(s)}</li>`).join("")}</ol></div>`).join("")}</div>`}

function renderAdmin(){
 main.innerHTML=`<div class="section-title"><span class="kicker">ADMINISTRATION</span><h1>Admin Panel</h1><p>Manage site branding, content, security, and audit logging.</p></div>
 <div class="admin-grid">
 <div class="admin-card"><span>BRANDING</span><h3>Site Identity</h3><div class="form"><label>Site name<input id="siteNameInput" value="${attr(site.siteName)}"></label><button class="save" onclick="saveBranding()">Save Site Name</button><label>Logo<input id="logoInput" type="file" accept=".png,.jpg,.jpeg,.webp"></label><button class="save" onclick="uploadLogo()">Upload Logo</button></div></div>
 <div class="admin-card"><span>SECURITY</span><h3>Account</h3><div class="form"><label>Current password<input id="currentPassword" type="password"></label><label>New username<input id="newUsername" placeholder="Leave blank to keep current"></label><label>New password<input id="newPassword" type="password" placeholder="10+ characters"></label><button class="save" onclick="saveSecurity()">Update Security</button></div></div>
 <div class="admin-card"><span>DISCORD AUDIT LOGGING</span><h3>Webhook</h3><p class="hint">Audit events are sent to this webhook. Passwords and session secrets are never sent.</p><div class="form"><label>Discord webhook URL<input id="webhook" type="url" placeholder="https://discord.com/api/webhooks/..."></label><button class="save" onclick="saveWebhook()">Save Webhook</button><div id="webhookStatus" class="status"></div></div></div>
 <div class="admin-card"><span>CONTENT</span><h3>Edit Site Content</h3><p class="hint">Change the text shown across the staff center. Changes are logged.</p><button class="save" onclick="openEditor()">Open Content Editor</button></div>
 </div>`;
 api("/api/admin/log-status").then(x=>document.getElementById("webhookStatus").textContent=x.webhookConfigured?"Webhook configured.":"No webhook configured.");
}

async function saveBranding(){try{await api("/api/admin/site",{method:"PUT",body:JSON.stringify({siteName:document.getElementById("siteNameInput").value})});await loadSite();toast("Site name updated.");renderAdmin()}catch(e){toast(e.message)}}
async function saveWebhook(){try{await api("/api/admin/site",{method:"PUT",body:JSON.stringify({webhook:document.getElementById("webhook").value})});toast("Webhook saved.");renderAdmin()}catch(e){toast(e.message)}}
async function uploadLogo(){const f=document.getElementById("logoInput").files[0];if(!f)return toast("Choose an image first.");const fd=new FormData();fd.append("logo",f);const r=await fetch("/api/admin/logo",{method:"POST",body:fd});const d=await r.json();if(!r.ok)return toast(d.error||"Upload failed.");await loadSite();toast("Logo updated.");renderAdmin()}
async function saveSecurity(){try{await api("/api/admin/security",{method:"PUT",body:JSON.stringify({currentPassword:currentPassword.value,newUsername:newUsername.value,newPassword:newPassword.value})});toast("Security settings updated.");document.getElementById("currentPassword").value="";document.getElementById("newPassword").value="";}catch(e){toast(e.message)}}

function openEditor(){
 const fields=["heroTitle","heroDescription","announcementTitle","announcementText","rulesIntro","guidesIntro","trainingIntro","proceduresIntro","resourcesIntro"];
 const modal=document.createElement("div");modal.className="modal show";modal.innerHTML=`<div class="modal-box"><button class="close" onclick="this.closest('.modal').remove()">×</button><span class="kicker">CONTENT EDITOR</span><h2>Edit Site Text</h2>${fields.map(k=>`<label class="form"><b>${k}</b><textarea id="edit-${k}">${esc(content[k]||"")}</textarea></label>`).join("")}<hr style="border-color:#1a3855"><h3>Rules, Guides, Training & Procedures</h3><div id="advancedEditor"></div><button class="save" onclick="saveAllContent(this)">Save All Content</button></div>`;
 document.body.appendChild(modal);
 const box=modal.querySelector("#advancedEditor");
 box.innerHTML=content.rules.map((x,i)=>`<div class="editor-row"><b>Rule ${i+1}</b><input data-rules-title="${i}" value="${attr(x.title)}"><textarea data-rules-text="${i}">${esc(x.text)}</textarea></div>`).join("")+
 content.guides.map((x,i)=>`<div class="editor-row"><b>Guide ${i+1}</b><input data-guides-title="${i}" value="${attr(x.title)}"><textarea data-guides-text="${i}">${esc(x.text)}</textarea></div>`).join("")+
 content.training.map((x,i)=>`<div class="editor-row"><b>Training ${i+1}</b><input data-training-title="${i}" value="${attr(x.title)}"><textarea data-training-text="${i}">${esc(x.text)}</textarea></div>`).join("")+
 content.procedures.map((x,i)=>`<div class="editor-row"><b>Procedure ${i+1}</b><input data-procedures-title="${i}" value="${attr(x.title)}"><textarea data-procedures-steps="${i}">${esc(x.steps.join("\n"))}</textarea></div>`).join("");
}
async function saveAllContent(btn){
 const fields=["heroTitle","heroDescription","announcementTitle","announcementText","rulesIntro","guidesIntro","trainingIntro","proceduresIntro","resourcesIntro"];
 fields.forEach(k=>content[k]=document.getElementById("edit-"+k).value);
 content.rules.forEach((x,i)=>{x.title=document.querySelector(`[data-rules-title="${i}"]`).value;x.text=document.querySelector(`[data-rules-text="${i}"]`).value});
 content.guides.forEach((x,i)=>{x.title=document.querySelector(`[data-guides-title="${i}"]`).value;x.text=document.querySelector(`[data-guides-text="${i}"]`).value});
 content.training.forEach((x,i)=>{x.title=document.querySelector(`[data-training-title="${i}"]`).value;x.text=document.querySelector(`[data-training-text="${i}"]`).value});
 content.procedures.forEach((x,i)=>{x.title=document.querySelector(`[data-procedures-title="${i}"]`).value;x.steps=document.querySelector(`[data-procedures-steps="${i}"]`).value.split("\n").filter(Boolean)});
 try{await api("/api/admin/content",{method:"PUT",body:JSON.stringify(content)});await loadSite();btn.closest(".modal").remove();toast("All content saved.");showPage("dashboard")}catch(e){toast(e.message)}
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function attr(s){return esc(s)}
boot();
