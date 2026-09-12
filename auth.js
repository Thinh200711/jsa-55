// ============================================================
// auth.js — Đăng nhập / Đăng ký đơn giản
// Dùng chung cho TẤT CẢ các trang.
//
// Đây chỉ là bản DEMO: tài khoản được lưu trong localStorage của
// trình duyệt (không có máy chủ thật), chỉ để minh hoạ giao diện.
// Không nên dùng cách này cho mật khẩu thật ngoài đời.
// ============================================================

const USERS_KEY = 'marcpc_users';
const CURRENT_USER_KEY = 'marcpc_current_user_email';

function loadUsers(){
  try{
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}
function saveUsers(){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

let users = loadUsers();
let authMode = 'login'; // 'login' hoặc 'register'

// Tìm user hiện tại đang đăng nhập (dựa vào email lưu trong localStorage)
function getCurrentUser(){
  const email = localStorage.getItem(CURRENT_USER_KEY);
  if(!email) return null;
  return users.find(u => u.email === email) || null;
}

function initials(name){
  return name.trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase();
}

// ---------- vẽ khu vực đăng nhập trên thanh nav ----------
function renderNavAuth(){
  const el = document.getElementById('navAuth');
  if(!el) return;
  const currentUser = getCurrentUser();

  if(!currentUser){
    el.innerHTML = `<div class="nav-auth-guest">
      <button class="btn btn-ghost btn-sm" onclick="openAuthModal('login')">Đăng nhập</button>
      <button class="btn btn-primary btn-sm" onclick="openAuthModal('register')">Đăng ký</button>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="nav-auth-user">
    <button class="nav-auth-trigger" onclick="toggleNavDropdown()">
      <span class="nav-avatar">${initials(currentUser.name)}</span>
      <span class="pts">${currentUser.name}</span>
    </button>
    <div class="nav-auth-dropdown" id="navDropdown">
      <button onclick="toggleNavDropdown(false); toggleCart(true);">🛒 Giỏ hàng của tôi</button>
      <button onclick="location.href='orders.html'">📦 Đơn hàng của tôi</button>
      <button onclick="logout()">Đăng xuất</button>
    </div>
  </div>`;
}

function toggleNavDropdown(show){
  const dd = document.getElementById('navDropdown');
  if(!dd) return;
  const next = show === undefined ? !dd.classList.contains('show') : show;
  dd.classList.toggle('show', next);
}
// Bấm ra ngoài khu vực tài khoản thì tự đóng menu thả xuống
document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.nav-auth-user');
  if(wrap && !wrap.contains(e.target)) toggleNavDropdown(false);
});

// ---------- modal đăng nhập / đăng ký ----------
function openAuthModal(mode){
  authMode = mode || 'login';
  renderAuthModal();
  document.getElementById('authModal').classList.add('show');
  setOverlay(true);
}
function closeAuthModal(){
  document.getElementById('authModal').classList.remove('show');
  setOverlay(isAnyOverlayOpen());
}
function setAuthMode(mode){
  authMode = mode;
  renderAuthModal();
}

function renderAuthModal(){
  const isLogin = authMode === 'login';
  document.getElementById('authBox').innerHTML = `
    <button class="auth-close" onclick="closeAuthModal()">×</button>
    <div class="auth-tabs">
      <button class="auth-tab ${isLogin ? 'active' : ''}" onclick="setAuthMode('login')">Đăng nhập</button>
      <button class="auth-tab ${!isLogin ? 'active' : ''}" onclick="setAuthMode('register')">Đăng ký</button>
    </div>
    <div class="auth-form">
      ${isLogin ? `
        <div class="auth-field"><label>Email</label><input type="email" id="authEmail" placeholder="ban@email.com"></div>
        <div class="auth-field"><label>Mật khẩu</label><input type="password" id="authPassword" placeholder="••••••••"></div>
      ` : `
        <div class="auth-field"><label>Họ tên</label><input type="text" id="authName" placeholder="Nguyễn Văn A"></div>
        <div class="auth-field"><label>Email</label><input type="email" id="authEmail" placeholder="ban@email.com"></div>
        <div class="auth-field"><label>Mật khẩu</label><input type="password" id="authPassword" placeholder="Tối thiểu 6 ký tự"></div>
      `}
      <div class="auth-error" id="authError"></div>
      <button class="btn btn-primary" style="width:100%;" onclick="submitAuth()">${isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
      <div class="auth-note">Đăng ký tài khoản miễn phí để lưu lại thông tin đặt hàng của bạn.</div>
    </div>
  `;
}

function authFail(msg){
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.add('show');
}

function submitAuth(){
  const email = document.getElementById('authEmail').value.trim().toLowerCase();
  const password = document.getElementById('authPassword').value;
  if(!email || !password){
    authFail('Vui lòng nhập đầy đủ email và mật khẩu.');
    return;
  }

  // Nếu đang ở tab "Đăng nhập" và thông tin nhập vào trùng với tài khoản
  // quản trị (admin) thì chuyển thẳng sang Admin Dashboard, không đăng
  // nhập như user thường. adminLogin() được định nghĩa trong store.js.
  if(authMode === 'login' && typeof adminLogin === 'function' && adminLogin(email, password)){
    closeAuthModal();
    showToast('Đăng nhập quản trị thành công — đang chuyển đến Admin Dashboard...');
    setTimeout(() => { location.href = 'admin.html'; }, 600);
    return;
  }

  if(authMode === 'register'){
    const name = document.getElementById('authName').value.trim();
    if(!name){ authFail('Vui lòng nhập họ tên.'); return; }
    if(password.length < 6){ authFail('Mật khẩu cần tối thiểu 6 ký tự.'); return; }
    if(users.some(u => u.email === email)){ authFail('Email này đã đăng ký tài khoản.'); return; }

    const user = { name, email, password };
    users.push(user);
    saveUsers();
    localStorage.setItem(CURRENT_USER_KEY, email);
    showToast('Chào mừng ' + name + ' đến với MARC PC 🎉');
  } else {
    const user = users.find(u => u.email === email && u.password === password);
    if(!user){ authFail('Email hoặc mật khẩu không đúng.'); return; }
    localStorage.setItem(CURRENT_USER_KEY, email);
    showToast('Đăng nhập thành công — chào ' + user.name);
  }

  closeAuthModal();
  renderNavAuth();
}

function logout(){
  localStorage.removeItem(CURRENT_USER_KEY);
  toggleNavDropdown(false);
  renderNavAuth();
  showToast('Đã đăng xuất');
}

// ---------- dùng cho admin dashboard: xoá 1 tài khoản user ----------
function adminDeleteUser(email){
  users = users.filter(u => u.email !== email);
  saveUsers();
}

// Khởi động: vẽ khu vực đăng nhập ngay khi trang tải xong
renderNavAuth();
