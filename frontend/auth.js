const API_BASE = "http://localhost:5000/api";

function saveToken(token){ localStorage.setItem("token", token); }
function getToken(){ return localStorage.getItem("token"); }
function clearToken(){ localStorage.removeItem("token"); }

function authHeader(){
  const t = getToken();
  return t ? { "Authorization": "Bearer " + t } : {};
}

function requireAuth(){
  if(!getToken()){
    alert("Please login first.");
    window.location.href = "./login.html";
    return false;
  }
  return true;
}

function logout(){
  clearToken();
  window.location.href = "./login.html";
}

window.AppAuth = { API_BASE, saveToken, getToken, clearToken, authHeader, requireAuth, logout };
