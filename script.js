// Simple notice board using localStorage
(() => {
  const STORAGE_KEY = "community_notices_v1";
  const ADMIN_PASSWORD = "admin123"; // change this to secure
  let isAdmin = false;
  let notices = [];

  // elements
  const noticesEl = document.getElementById("notices");
  const adminBtn = document.getElementById("adminBtn");
  const adminModal = document.getElementById("adminModal");
  const closeModal = document.getElementById("closeModal");
  const noticeForm = document.getElementById("noticeForm");
  const categoryInput = document.getElementById("category");
  const titleInput = document.getElementById("title");
  const messageInput = document.getElementById("message");
  const expiryInput = document.getElementById("expiry");
  const authorInput = document.getElementById("author");
  const hiddenId = document.getElementById("hiddenId");
  const logoutBtn = document.getElementById("logoutBtn");
  const tabs = document.querySelectorAll(".tab");
  const downloadBtn = document.getElementById("downloadBtn");

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    notices = raw ? JSON.parse(raw) : defaultNotices();
    render();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notices));
  }

  function defaultNotices(){
    return [
      {id: genId(), category:"announcement", title:"Welcome to our Community Board", message:"This is a demo notice. Admins can add real notices via the Admin panel.", author:"System", date: new Date().toISOString()},
      {id: genId(), category:"event", title:"Annual Meeting", message:"Community annual meeting on 25th Nov at 6 PM in the clubhouse.", author:"Committee", date: new Date().toISOString()},
    ];
  }

  function genId(){ return 'n-'+Math.random().toString(36).slice(2,9); }

  function render(filter = "all") {
    noticesEl.innerHTML = "";
    const now = new Date();
    const filtered = notices.filter(n => {
      if (filter === "all") return true;
      return n.category === filter;
    }).filter(n => {
      if (!n.expiry) return true;
      const exp = new Date(n.expiry);
      return exp >= now;
    }).sort((a,b) => new Date(b.date) - new Date(a.date));

    if(filtered.length === 0){
      noticesEl.innerHTML = `<div style="grid-column:1/-1;padding:24px;color:var(--muted)">No notices found.</div>`;
      return;
    }

    filtered.forEach(n => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div class="meta">
          <div style="display:flex;flex-direction:column">
            <h3>${escapeHtml(n.title)}</h3>
            <small style="color:var(--muted);font-size:12px;margin-top:4px">${escapeHtml(n.author || 'Community')}</small>
          </div>
          <div class="badge">${capitalize(n.category)}</div>
        </div>
        <p>${escapeHtml(n.message)}</p>
        <div class="card-footer">
          <small>${formatDate(n.date)} ${n.expiry ? ' • Expires: '+formatDate(n.expiry) : ''}</small>
          ${isAdmin ? `<div>
            <button data-id="${n.id}" class="btn outline editBtn">Edit</button>
            <button data-id="${n.id}" class="btn danger delBtn">Delete</button>
          </div>` : ''}
        </div>
      `;
      noticesEl.appendChild(card);
    });

    // attach admin buttons
    document.querySelectorAll(".delBtn").forEach(btn=>{
      btn.addEventListener("click", e=>{
        const id = e.currentTarget.dataset.id;
        if(confirm("Are you sure you want to delete this notice?")){
          notices = notices.filter(x => x.id !== id);
          save(); render(getActiveFilter());
        }
      });
    });

    document.querySelectorAll(".editBtn").forEach(btn=>{
      btn.addEventListener("click", e=>{
        const id = e.currentTarget.dataset.id;
        const n = notices.find(x => x.id === id);
        if(!n) return;
        openAdmin();
        hiddenId.value = n.id;
        categoryInput.value = n.category;
        titleInput.value = n.title;
        messageInput.value = n.message;
        expiryInput.value = n.expiry ? n.expiry.split('T')[0] : "";
        authorInput.value = n.author || "";
      });
    });
  }

  function escapeHtml(s){
    if(!s) return "";
    return s.replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  function formatDate(d){
    if(!d) return "";
    const dt = new Date(d);
    return dt.toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  }

  function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  // admin flow
  adminBtn.addEventListener("click", async () => {
    if(isAdmin){
      openAdmin();
      return;
    }
    const pass = prompt("Admin password:");
    if(pass === ADMIN_PASSWORD){
      isAdmin = true;
      openAdmin();
      adminBtn.textContent = "Admin";
      adminBtn.classList.add("outline");
      render(getActiveFilter());
    } else {
      alert("Incorrect password");
    }
  });

  closeModal.addEventListener("click", closeAdmin);
  logoutBtn.addEventListener("click", () => {
    isAdmin = false;
    closeAdmin();
    adminBtn.textContent = "Admin Login";
    adminBtn.classList.remove("outline");
    render(getActiveFilter());
  });

  function openAdmin(){ adminModal.style.display = "flex"; }
  function closeAdmin(){ adminModal.style.display = "none"; noticeForm.reset(); hiddenId.value = ""; }

  noticeForm.addEventListener("submit", e => {
    e.preventDefault();
    const id = hiddenId.value;
    const data = {
      id: id || genId(),
      category: categoryInput.value,
      title: titleInput.value.trim(),
      message: messageInput.value.trim(),
      expiry: expiryInput.value ? new Date(expiryInput.value).toISOString() : null,
      author: authorInput.value.trim() || "Admin",
      date: new Date().toISOString()
    };

    if(!data.title || !data.message) return alert("Please enter title and message.");

    if(id){
      // edit
      notices = notices.map(n => n.id === id ? {...n, ...data, date: n.date} : n);
    } else {
      // add new
      notices.unshift(data);
    }
    save();
    render(getActiveFilter());
    noticeForm.reset();
    hiddenId.value = "";
    closeAdmin();
  });

  document.getElementById("clearBtn").addEventListener("click", ()=>{ noticeForm.reset(); hiddenId.value = ""; });

  // tabs
  tabs.forEach(t => t.addEventListener("click", (e)=>{
    tabs.forEach(x=>x.classList.remove("active"));
    e.currentTarget.classList.add("active");
    const f = e.currentTarget.dataset.filter || "all";
    render(f);
  }));

  function getActiveFilter(){
    const act = document.querySelector(".tab.active");
    return act ? act.dataset.filter : "all";
  }

  // export as JSON
  downloadBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    const blob = new Blob([JSON.stringify(notices, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "notices.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // initialize
  load();
})();
