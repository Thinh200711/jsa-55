// ============================================================
// cart.js — Giỏ hàng, thông báo (toast), và các lớp phủ (overlay)
// Dùng chung cho TẤT CẢ các trang.
//
// Giỏ hàng được lưu vào localStorage của trình duyệt, để khi
// bạn thêm sản phẩm ở trang này rồi qua trang khác, giỏ hàng
// vẫn còn nguyên (vì giờ mỗi trang là 1 file HTML riêng, không
// còn dùng chung 1 biến JavaScript như bản single-page nữa).
// ============================================================

const CART_KEY = 'marcpc_cart';

// Đọc giỏ hàng đã lưu, nếu chưa có gì thì trả về mảng rỗng
function loadCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}

// Lưu giỏ hàng hiện tại vào localStorage
function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

let cart = loadCart();

// Thêm 1 sản phẩm vào giỏ hàng rồi cập nhật giao diện
function addToCart(label, price){
  cart.push({label, price, qty:1});
  saveCart();
  renderCart();
  showToast('Đã thêm ' + label + ' vào giỏ hàng');
}

function removeFromCart(idx){
  cart.splice(idx, 1);
  saveCart();
  renderCart();
}

// Vẽ lại số lượng trên icon giỏ hàng + danh sách trong ngăn kéo giỏ hàng
function renderCart(){
  const countEl = document.getElementById('cartCount');
  if(countEl) countEl.textContent = cart.length;

  const listEl = document.getElementById('drawerItems');
  if(listEl){
    if(!cart.length){
      listEl.innerHTML = `<div class="empty-note">Giỏ hàng trống.<br>Build một cấu hình hoặc chọn PC dựng sẵn nhé.</div>`;
    } else {
      listEl.innerHTML = cart.map((c, i) => `
        <div class="drawer-item">
          <div class="info">${c.label}<small>${fmt(c.price)}</small></div>
          <button onclick="removeFromCart(${i})">×</button>
        </div>
      `).join('');
    }
  }

  const totalEl = document.getElementById('drawerTotal');
  if(totalEl){
    const total = cart.reduce((sum, c) => sum + c.price, 0);
    totalEl.textContent = fmt(total);
  }
}

function toggleCart(show){
  document.getElementById('drawer').classList.toggle('show', show);
  setOverlay(show || isAnyOverlayOpen());
}

// ---------- MODAL "THÔNG TIN ĐẶT HÀNG" ----------
let checkoutDiscount = null; // { code, type, value, label } hoặc null

function openCheckoutModal(){
  if(!cart.length){
    showToast('Giỏ hàng đang trống');
    return;
  }
  const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if(!currentUser){
    showToast('Vui lòng đăng nhập để đặt hàng');
    toggleCart(false);
    if(typeof openAuthModal === 'function') openAuthModal('login');
    return;
  }
  checkoutDiscount = null;
  renderCheckoutModal(currentUser);
  toggleCart(false);
  document.getElementById('checkoutModal').classList.add('show');
  setOverlay(true);
}
function closeCheckoutModal(){
  const el = document.getElementById('checkoutModal');
  if(el) el.classList.remove('show');
  setOverlay(isAnyOverlayOpen());
}

function renderCheckoutModal(currentUser){
  const subtotal = cart.reduce((s, c) => s + c.price, 0);
  document.getElementById('checkoutBox').innerHTML = `
    <button class="auth-close" onclick="closeCheckoutModal()">×</button>
    <h3>Thông tin đặt hàng</h3>
    <p class="auth-note" style="text-align:left;margin-bottom:14px;">Điền thông tin giao hàng để hoàn tất đơn.</p>

    <div class="checkout-items">
      ${cart.map(c => `<div class="order-item-row"><span>${c.label}</span><b>${fmt(c.price)}</b></div>`).join('')}
    </div>

    <div class="auth-field"><label>Họ tên người nhận</label><input type="text" id="coName" value="${(currentUser.name || '').replace(/"/g,'&quot;')}"></div>
    <div class="auth-field"><label>Số điện thoại</label><input type="tel" id="coPhone" placeholder="09xxxxxxxx"></div>
    <div class="auth-field"><label>Địa chỉ giao hàng</label><textarea id="coAddress" rows="2" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"></textarea></div>
    <div class="auth-field">
      <label>Phương thức thanh toán</label>
      <select id="coPayment">
        <option value="COD">Thanh toán khi nhận hàng (COD)</option>
        <option value="BANK">Chuyển khoản ngân hàng</option>
        <option value="CARD">Thẻ tín dụng / ghi nợ</option>
        <option value="EWALLET">Ví điện tử (MoMo / ZaloPay)</option>
      </select>
    </div>
    <div class="auth-field">
      <label>Mã giảm giá (nếu có)</label>
      <div class="checkout-discount-row">
        <input type="text" id="coDiscountCode" placeholder="VD: MARC10" onkeydown="if(event.key==='Enter'){ event.preventDefault(); applyDiscountCode(); }">
        <button type="button" class="btn btn-ghost btn-sm" onclick="applyDiscountCode()">Áp dụng</button>
      </div>
      <div class="checkout-discount-msg" id="coDiscountMsg"></div>
    </div>

    <div class="auth-error" id="checkoutError"></div>

    <div class="checkout-summary">
      <div class="summary-row"><span>Tạm tính</span><b class="mono" id="coSubtotal">${fmt(subtotal)}</b></div>
      <div class="summary-row" id="coDiscountRow" style="display:none;"><span>Giảm giá</span><b class="mono" id="coDiscountAmount" style="color:var(--accent);"></b></div>
      <div class="summary-row" style="border-top:1px dashed var(--border);padding-top:10px;">
        <span class="mono" style="color:var(--muted);font-size:13px;">TỔNG THANH TOÁN</span>
        <b id="coTotal" class="order-total">${fmt(subtotal)}</b>
      </div>
    </div>

    <button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="submitCheckoutForm()">Xác nhận đặt hàng</button>
  `;
}

function applyDiscountCode(){
  const codeInput = document.getElementById('coDiscountCode');
  const code = codeInput.value.trim();
  const msgEl = document.getElementById('coDiscountMsg');

  if(!code){
    checkoutDiscount = null;
    msgEl.textContent = '';
    updateCheckoutTotals();
    return;
  }
  const discount = validateDiscountCode(code);
  if(!discount){
    checkoutDiscount = null;
    msgEl.textContent = 'Mã giảm giá không hợp lệ hoặc đã hết hạn.';
    msgEl.style.color = 'var(--bad)';
  } else {
    checkoutDiscount = { code: code.toUpperCase(), ...discount };
    msgEl.textContent = '✓ Đã áp dụng "' + checkoutDiscount.code + '" — ' + discount.label;
    msgEl.style.color = 'var(--accent)';
  }
  updateCheckoutTotals();
}

function updateCheckoutTotals(){
  const subtotal = cart.reduce((s, c) => s + c.price, 0);
  const discountAmount = calcDiscountAmount(subtotal, checkoutDiscount);
  const total = subtotal - discountAmount;

  document.getElementById('coSubtotal').textContent = fmt(subtotal);
  const discRow = document.getElementById('coDiscountRow');
  if(discountAmount > 0){
    discRow.style.display = 'flex';
    document.getElementById('coDiscountAmount').textContent = '-' + fmt(discountAmount);
  } else {
    discRow.style.display = 'none';
  }
  document.getElementById('coTotal').textContent = fmt(total);
}

function submitCheckoutForm(){
  const name = document.getElementById('coName').value.trim();
  const phone = document.getElementById('coPhone').value.trim();
  const address = document.getElementById('coAddress').value.trim();
  const paymentCode = document.getElementById('coPayment').value;
  const errEl = document.getElementById('checkoutError');

  if(!name || !phone || !address){
    errEl.textContent = 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.';
    errEl.classList.add('show');
    return;
  }
  if(!/^[0-9+()\s-]{9,15}$/.test(phone)){
    errEl.textContent = 'Số điện thoại không hợp lệ.';
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  const currentUser = getCurrentUser();
  const subtotal = cart.reduce((s, c) => s + c.price, 0);
  const discountAmount = calcDiscountAmount(subtotal, checkoutDiscount);
  const total = subtotal - discountAmount;
  const paymentLabels = {
    COD: 'Thanh toán khi nhận hàng (COD)',
    BANK: 'Chuyển khoản ngân hàng',
    CARD: 'Thẻ tín dụng / ghi nợ',
    EWALLET: 'Ví điện tử (MoMo / ZaloPay)',
  };

  const order = addOrder({
    userEmail: currentUser.email,
    userName: currentUser.name,
    items: cart,
    subtotal,
    discountCode: checkoutDiscount ? checkoutDiscount.code : null,
    discountAmount,
    total,
    customerName: name,
    phone,
    address,
    paymentMethod: paymentLabels[paymentCode] || paymentCode,
  });

  showToast('Đặt hàng thành công! Mã đơn: ' + order.id + ' — chờ shop xác nhận.');
  cart = [];
  saveCart();
  renderCart();
  closeCheckoutModal();
}

// ---------- toast (thông báo nhỏ ở góc dưới màn hình) ----------
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- lớp phủ nền tối (overlay) đứng sau drawer / modal ----------
function setOverlay(show){
  document.getElementById('overlay').classList.toggle('show', !!show);
}

// Kiểm tra còn ngăn kéo/modal nào đang mở không, để quyết định có tắt overlay hay không
function isAnyOverlayOpen(){
  const ids = ['drawer', 'detailModal', 'authModal', 'checkoutModal'];
  return ids.some(id => {
    const el = document.getElementById(id);
    return el && el.classList.contains('show');
  });
}

function closeAllOverlays(){
  toggleCart(false);
  // closeDetail() chỉ tồn tại ở trang có modal chi tiết sản phẩm (detail.js)
  if(typeof closeDetail === 'function') closeDetail();
  const authModal = document.getElementById('authModal');
  if(authModal) authModal.classList.remove('show');
  const checkoutModal = document.getElementById('checkoutModal');
  if(checkoutModal) checkoutModal.classList.remove('show');
  setOverlay(false);
}

// Khởi động: vẽ giỏ hàng ngay khi trang tải xong
renderCart();
