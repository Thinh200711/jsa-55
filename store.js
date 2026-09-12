// ============================================================
// store.js — Lớp dữ liệu dùng chung, MỞ RỘNG data.js
// Nạp NGAY SAU <script src="data.js"> và TRƯỚC mọi file khác.
//
// Chịu trách nhiệm cho:
//  1. Đơn hàng (đặt hàng, tình trạng đơn hàng)
//  2. Tài khoản quản trị (admin) — tách biệt với tài khoản user
//  3. Linh kiện do admin thêm mới -> hợp nhất trực tiếp vào PARTS
//  4. Cấu hình dựng sẵn (preset) do admin thêm -> hợp nhất vào PREBUILT
//
// Toàn bộ vẫn lưu trong localStorage (đây là demo không có máy chủ
// thật), nhưng được tách khỏi phần dữ liệu gốc trong data.js để
// không đụng vào "dữ liệu mặc định" của cửa hàng.
// ============================================================

const ORDERS_KEY         = 'marcpc_orders';
const CUSTOM_PARTS_KEY   = 'marcpc_custom_parts';
const CUSTOM_PREBUILT_KEY= 'marcpc_custom_prebuilt';
const ADMIN_ACCOUNT_KEY  = 'marcpc_admin_account';
const ADMIN_SESSION_KEY  = 'marcpc_admin_session';
const CUSTOM_DISCOUNTS_KEY = 'marcpc_custom_discounts';

// ---------------------------------------------------------
// 1) ĐƠN HÀNG
// ---------------------------------------------------------
const ORDER_STATUSES = ['Chờ xử lý', 'Đã duyệt', 'Đang giao', 'Hoàn tất', 'Đã huỷ'];

function loadOrders(){
  try{
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveOrdersList(list){
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
}
// Tạo mã đơn hàng ngắn, dễ đọc: DH + thời gian + 3 số ngẫu nhiên
function genOrderId(){
  return 'DH' + Date.now().toString().slice(-8) + Math.floor(Math.random()*900+100);
}
function addOrder({ userEmail, userName, items, total, subtotal, discountCode, discountAmount, customerName, phone, address, paymentMethod }){
  const list = loadOrders();
  const order = {
    id: genOrderId(),
    userEmail, userName,
    items: items.map(i => ({ label: i.label, price: i.price, qty: i.qty || 1 })),
    subtotal: subtotal != null ? subtotal : total,
    discountCode: discountCode || null,
    discountAmount: discountAmount || 0,
    total,
    customerName: customerName || userName,
    phone: phone || '',
    address: address || '',
    paymentMethod: paymentMethod || '',
    status: 'Chờ xử lý',
    createdAt: new Date().toISOString(),
    history: [{ status: 'Chờ xử lý', at: new Date().toISOString() }],
  };
  list.unshift(order);
  saveOrdersList(list);
  return order;
}
function getOrdersByUser(email){
  return loadOrders().filter(o => o.userEmail === email);
}
function updateOrderStatus(id, status){
  const list = loadOrders();
  const order = list.find(o => o.id === id);
  if(!order) return null;
  order.status = status;
  order.history = order.history || [];
  order.history.push({ status, at: new Date().toISOString() });
  saveOrdersList(list);
  return order;
}
function deleteOrder(id){
  saveOrdersList(loadOrders().filter(o => o.id !== id));
}

// ---------------------------------------------------------
// 1b) MÃ GIẢM GIÁ
// ---------------------------------------------------------
// Danh sách mã giảm giá demo. type: 'percent' (% trên tạm tính) hoặc
// 'fixed' (số tiền cố định, VNĐ).
const DISCOUNT_CODES = {
  'MARC10':   { type: 'percent', value: 10,     label: 'Giảm 10% tổng đơn hàng' },
  'MARC500K': { type: 'fixed',   value: 500000, label: 'Giảm 500.000đ' },
  'FREESHIP': { type: 'fixed',   value: 50000,  label: 'Giảm 50.000đ phí vận chuyển' },
  'WELCOME5': { type: 'percent', value: 5,      label: 'Giảm 5% cho khách hàng mới' },
};
function validateDiscountCode(code){
  if(!code) return null;
  return DISCOUNT_CODES[code.trim().toUpperCase()] || null;
}
function calcDiscountAmount(subtotal, discount){
  if(!discount) return 0;
  const raw = discount.type === 'percent' ? Math.round(subtotal * discount.value / 100) : discount.value;
  return Math.max(0, Math.min(raw, subtotal));
}

// ---------- mã giảm giá do admin thêm (lưu riêng, hợp nhất vào DISCOUNT_CODES) ----------
function loadCustomDiscounts(){
  try{
    const raw = localStorage.getItem(CUSTOM_DISCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveCustomDiscounts(obj){
  localStorage.setItem(CUSTOM_DISCOUNTS_KEY, JSON.stringify(obj));
}
function applyCustomDiscounts(){
  const custom = loadCustomDiscounts();
  Object.keys(custom).forEach(code => {
    DISCOUNT_CODES[code] = { ...custom[code], _custom: true };
  });
}
function addCustomDiscount(code, discount){
  code = code.trim().toUpperCase();
  const custom = loadCustomDiscounts();
  custom[code] = discount;
  saveCustomDiscounts(custom);
  DISCOUNT_CODES[code] = { ...discount, _custom: true };
}
function deleteCustomDiscount(code){
  const custom = loadCustomDiscounts();
  delete custom[code];
  saveCustomDiscounts(custom);
  delete DISCOUNT_CODES[code];
}
function isCustomDiscount(code){
  return !!(DISCOUNT_CODES[code] && DISCOUNT_CODES[code]._custom);
}

// ---------------------------------------------------------
// 2) TÀI KHOẢN QUẢN TRỊ (ADMIN) — tách biệt hoàn toàn với "users"
// ---------------------------------------------------------
// Khởi tạo tài khoản admin mặc định nếu chưa có (chỉ để demo).
function ensureAdminAccount(){
  if(!localStorage.getItem(ADMIN_ACCOUNT_KEY)){
    localStorage.setItem(ADMIN_ACCOUNT_KEY, JSON.stringify({ username: 'admin', password: 'admin123' }));
  }
}
function adminLogin(username, password){
  ensureAdminAccount();
  const acc = JSON.parse(localStorage.getItem(ADMIN_ACCOUNT_KEY));
  if(acc && acc.username === username.trim() && acc.password === password){
    localStorage.setItem(ADMIN_SESSION_KEY, '1');
    return true;
  }
  return false;
}
function isAdminLoggedIn(){
  return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
}
function adminLogout(){
  localStorage.removeItem(ADMIN_SESSION_KEY);
}
function adminChangePassword(oldPassword, newPassword){
  ensureAdminAccount();
  const acc = JSON.parse(localStorage.getItem(ADMIN_ACCOUNT_KEY));
  if(acc.password !== oldPassword) return false;
  acc.password = newPassword;
  localStorage.setItem(ADMIN_ACCOUNT_KEY, JSON.stringify(acc));
  return true;
}

// ---------------------------------------------------------
// 3) LINH KIỆN DO ADMIN THÊM — hợp nhất trực tiếp vào PARTS
//    (PARTS được khai báo global trong data.js, nạp trước file này)
// ---------------------------------------------------------
function loadCustomParts(){
  try{
    const raw = localStorage.getItem(CUSTOM_PARTS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveCustomParts(customParts){
  localStorage.setItem(CUSTOM_PARTS_KEY, JSON.stringify(customParts));
}
// Đưa toàn bộ linh kiện admin đã thêm (lưu ở localStorage) vào biến PARTS
// để mọi trang (catalog, builder, cpu.html...) tự động thấy được.
function applyCustomParts(){
  if(typeof PARTS === 'undefined') return;
  const custom = loadCustomParts();
  Object.keys(custom).forEach(cat => {
    if(!PARTS[cat]) PARTS[cat] = [];
    custom[cat].forEach(item => {
      if(!PARTS[cat].some(p => p.id === item.id)){
        item._custom = true; // đánh dấu để phân biệt với hàng mặc định
        PARTS[cat].push(item);
      }
    });
  });
}
function addCustomPart(cat, item){
  const custom = loadCustomParts();
  if(!custom[cat]) custom[cat] = [];
  item._custom = true;
  custom[cat].push(item);
  saveCustomParts(custom);
  if(typeof PARTS !== 'undefined'){
    if(!PARTS[cat]) PARTS[cat] = [];
    PARTS[cat].push(item);
  }
}
function deleteCustomPart(cat, id){
  const custom = loadCustomParts();
  if(custom[cat]) custom[cat] = custom[cat].filter(p => p.id !== id);
  saveCustomParts(custom);
  if(typeof PARTS !== 'undefined' && PARTS[cat]){
    PARTS[cat] = PARTS[cat].filter(p => p.id !== id);
  }
}
function isCustomPart(item){ return !!item._custom; }

// ---------------------------------------------------------
// 4) PRESET (CẤU HÌNH DỰNG SẴN) DO ADMIN THÊM -> hợp nhất vào PREBUILT
// ---------------------------------------------------------
function loadCustomPrebuilt(){
  try{
    const raw = localStorage.getItem(CUSTOM_PREBUILT_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveCustomPrebuilt(list){
  localStorage.setItem(CUSTOM_PREBUILT_KEY, JSON.stringify(list));
}
function applyCustomPrebuilt(){
  if(typeof PREBUILT === 'undefined') return;
  const custom = loadCustomPrebuilt();
  custom.forEach(preset => {
    if(!PREBUILT.some(p => p._id === preset._id)){
      preset._custom = true;
      PREBUILT.push(preset);
    }
  });
}
function addCustomPreset(preset){
  const custom = loadCustomPrebuilt();
  preset._id = 'preset-' + Date.now();
  preset._custom = true;
  custom.push(preset);
  saveCustomPrebuilt(custom);
  if(typeof PREBUILT !== 'undefined') PREBUILT.push(preset);
}
function deleteCustomPreset(_id){
  saveCustomPrebuilt(loadCustomPrebuilt().filter(p => p._id !== _id));
  if(typeof PREBUILT !== 'undefined'){
    const idx = PREBUILT.findIndex(p => p._id === _id);
    if(idx >= 0) PREBUILT.splice(idx, 1);
  }
}

// ---------------------------------------------------------
// Khởi động: nạp mọi dữ liệu mở rộng ngay khi file được load
// ---------------------------------------------------------
ensureAdminAccount();
applyCustomParts();
applyCustomPrebuilt();
applyCustomDiscounts();
