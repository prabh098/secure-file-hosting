// ===== Config =====
const API_BASE = "http://localhost:5000/api";
const API_ROOT = API_BASE.replace(/\/api$/, "");
const TOKEN_KEY = "sfh_token";
const MAX_FILE_MB = 20;

// ===== Token helpers =====
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);
const authHeader = () => (getToken() ? { "Authorization": "Bearer " + getToken() } : {});

// ===== UI auth state =====
function setAuthUI() {
  const loggedIn = !!getToken();

  const show = (id) => document.getElementById(id).classList.remove("hidden");
  const hide = (id) => document.getElementById(id).classList.add("hidden");

  if (loggedIn) {
    hide("nav-login");
    show("nav-upload");
    show("nav-myfiles");
    show("nav-logout");
  } else {
    show("nav-login");
    hide("nav-upload");
    hide("nav-myfiles");
    hide("nav-logout");
  }
}

function navigate(view) {
  document.querySelectorAll("main section").forEach(s => s.classList.add("hidden"));
  document.getElementById("view-" + view).classList.remove("hidden");
  if (view === "myfiles") loadMyFiles();
  if (view === "files") loadPublicFiles();
  if (view === "home") pingHealth();
}

function logout() {
  clearToken();
  setAuthUI();
  navigate("home");
}

// ===== Health =====
async function pingHealth() {
  try {
    const r = await fetch(API_BASE + "/health");
    const d = await r.json();
    document.getElementById("health").textContent = JSON.stringify(d, null, 2);
  } catch (e) {
    document.getElementById("health").textContent = "Cannot reach backend at " + API_BASE;
  }
}

// ===== Share-link opener =====
function normalizeShare(input) {
  input = (input || "").trim();
  if (!input) return null;

  // If it's a full URL
  try {
    const u = new URL(input);
    const m = u.pathname.match(/\/files\/share\/([0-9a-fA-F-]{10,})\/download/);
    if (m) return m[1];
  } catch { /* not a URL */ }

  // If it's a path
  const m2 = input.match(/\/files\/share\/([0-9a-fA-F-]{10,})\/download/);
  if (m2) return m2[1];

  // If it's just a UUID
  const m3 = input.match(/^[0-9a-fA-F-]{10,}$/);
  if (m3) return input;

  return null;
}

function openShare(e) {
  e.preventDefault();
  const raw = document.getElementById("share-input").value;
  const shareId = normalizeShare(raw);
  const status = document.getElementById("share-status");
  if (!shareId) {
    status.textContent = "Invalid share link/ID.";
    status.className = "small warn";
    return;
  }
  const url = API_ROOT + "/api/files/share/" + shareId + "/download";
  status.textContent = "Opening: " + url;
  status.className = "small ok";
  window.open(url, "_blank");
}

// ===== Register (password strength) =====
function setupPasswordStrength() {
  const el = document.getElementById("reg-password");
  if (!el) return;
  const out = document.getElementById("reg-pass-strength");
  el.addEventListener("input", () => {
    const v = el.value;
    const len = v.length;
    const hasLower = /[a-z]/.test(v);
    const hasUpper = /[A-Z]/.test(v);
    const hasNum = /\d/.test(v);
    const hasSym = /[^A-Za-z0-9]/.test(v);
    let score = 0;
    if (len >= 8) score++;
    if (len >= 12) score++;
    if (hasLower && hasUpper) score++;
    if (hasNum) score++;
    if (hasSym) score++;
    const levels = ["Very weak", "Weak", "Okay", "Good", "Strong", "Very strong"];
    const cls = score >= 3 ? "ok" : "warn";
    out.className = "small " + cls;
    out.textContent = "Strength: " + levels[score] + " — Aim for a long passphrase (e.g., 8+ words).";
  });
}

// ===== Forms: Register / Login / Upload =====
function setupForms() {
  const regForm = document.getElementById("form-register");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pwd = (document.getElementById("reg-password").value || "");
      if (pwd.length < 8) {
        alert("Your password should be at least 8 characters. Consider a long passphrase (e.g., 8+ words).");
        return;
      }
      const body = {
        username: document.getElementById("reg-username").value.trim(),
        email: document.getElementById("reg-email").value.trim(),
        password: pwd
      };
      const res = await fetch(API_BASE + "/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      document.getElementById("out-register").textContent = JSON.stringify(data, null, 2);
      if (res.ok) {
        alert("Registered! Please login.");
        navigate("login");
      } else {
        alert(data.error || "Registration failed");
      }
    });
  }

  const loginForm = document.getElementById("form-login");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {
        email: document.getElementById("login-email").value.trim(),
        password: document.getElementById("login-password").value
      };
      const res = await fetch(API_BASE + "/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      document.getElementById("out-login").textContent = JSON.stringify(data, null, 2);
      if (res.ok && data.token) {
        setToken(data.token);
        setAuthUI();
        navigate("myfiles");
      } else {
        alert(data.error || "Login failed");
      }
    });
  }

  const uploadForm = document.getElementById("form-upload");
  if (uploadForm) {
    const fileInput = document.getElementById("up-file");
    const fileHint = document.getElementById("file-size-hint");
    document.getElementById("max-mb").textContent = MAX_FILE_MB;

    function formatSize(bytes) {
      if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      return (bytes / 1024).toFixed(1) + " KB";
    }

    fileInput.addEventListener("change", () => {
      const f = fileInput.files[0];
      if (!f) { fileHint.textContent = ""; return; }
      const tooBig = f.size > (MAX_FILE_MB * 1024 * 1024);
      fileHint.className = "small " + (tooBig ? "warn" : "muted");
      fileHint.textContent = `Selected: ${f.name} — ${formatSize(f.size)}${tooBig ? " (exceeds ${MAX_FILE_MB} MB limit)" : ""}`;
    });

    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = fileInput.files[0];
      if (!f) return alert("Pick a file.");
      if (f.size > (MAX_FILE_MB * 1024 * 1024)) {
        alert("File exceeds " + MAX_FILE_MB + " MB. Please choose a smaller file.");
        return;
      }
      const privacy = document.getElementById("up-privacy").value;
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(API_BASE + "/upload?privacy=" + encodeURIComponent(privacy), {
        method: "POST", headers: { ...authHeader() }, body: fd
      });
      const data = await res.json().catch(() => ({}));
      document.getElementById("out-upload").textContent = JSON.stringify(data, null, 2);
      if (res.ok) {
        alert("Uploaded!");
        loadMyFiles();
      } else {
        if (data && data.error && /too large/i.test(data.error)) {
          alert(data.error);
        } else {
          alert(data.error || "Upload failed");
        }
      }
    });
  }
}

// ===== Public Files =====
async function loadPublicFiles() {
  const tb = document.getElementById("tb-files");
  tb.innerHTML = "";
  const res = await fetch(API_BASE + "/public-files");
  const data = await res.json().catch(() => ({ files: [] }));
  document.getElementById("out-files").textContent = JSON.stringify(data, null, 2);
  (data.files || []).forEach(f => {
    const tr = document.createElement("tr");
    const sizeKB = (f.size / 1024).toFixed(1) + " KB";
    const when = new Date(f.uploaded_at).toLocaleString();
    tr.innerHTML = `
      <td>${f.originalName}</td>
      <td>${sizeKB}</td>
      <td>${when}</td>
      <td class="actions"><a href="${API_BASE}/files/${f.id || f._id}/download" target="_blank">Download</a></td>`;
    tb.appendChild(tr);
  });
}

// ===== My Files =====
async function loadMyFiles() {
  const tb = document.getElementById("tb-myfiles");
  tb.innerHTML = "";

  const res = await fetch(API_BASE + "/my-files", { headers: { ...authHeader() } });
  const data = await res.json().catch(() => ({ files: [] }));
  document.getElementById("out-myfiles").textContent = JSON.stringify(data, null, 2);

  (data.files || []).forEach(f => {
    const sizeKB = (f.size / 1024).toFixed(1) + " KB";
    const when = new Date(f.uploaded_at).toLocaleString();

    const shareUrl = f.shareLink
      ? (f.shareLink.startsWith("/api/") ? API_ROOT + f.shareLink : API_BASE + f.shareLink)
      : null;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.originalName}</td>
      <td>${sizeKB}</td>
      <td><span class="badge ${f.privacy}">${f.privacy}</span></td>
      <td>${when}</td>
      <td>${
        shareUrl
          ? `<button type="button" class="copy" data-url="${shareUrl}">Copy link</button>`
          : "-"
      }</td>
      <td class="actions">
        <button data-id="${f.id}" class="dl">Download</button>
        <button data-id="${f.id}" class="rm">Delete</button>
      </td>`;
    tb.appendChild(tr);
  });

  document.querySelectorAll(".copy").forEach(btn => {
    btn.addEventListener("click", async () => {
      const url = btn.getAttribute("data-url");
      try {
        await navigator.clipboard.writeText(url);
        const old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = old), 1200);
      } catch {
        prompt("Copy this link manually:", url);
      }
    });
  });

  document.querySelectorAll(".dl").forEach(btn =>
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      const res = await fetch(API_BASE + "/files/" + id + "/download", {
        headers: { ...authHeader() }
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return alert(d.error || "Download blocked");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
  );

  document.querySelectorAll(".rm").forEach(btn =>
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      if (!confirm("Delete this file?")) return;
      const res = await fetch(API_BASE + "/files/" + id, {
        method: "DELETE",
        headers: { ...authHeader() }
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        loadMyFiles();
      } else {
        alert(d.error || "Delete failed");
      }
    })
  );
}

// ===== Init =====
window.addEventListener("DOMContentLoaded", () => {
  setAuthUI();
  setupPasswordStrength();
  setupForms();
  navigate("files");
  pingHealth();
});

// Expose for inline handlers
window.navigate = navigate;
window.openShare = openShare;
window.logout = logout;
