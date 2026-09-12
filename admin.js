// ============================================================
// admin.js — Logic cho admin.html
// Nạp sau: data.js, store.js, auth.js
// ============================================================

// ---------- schema cho form "thêm linh kiện mới" theo từng loại ----------
const PART_SCHEMA = {
  cpu: [
    { key:'brand',  label:'Hãng',          type:'text' },
    { key:'name',   label:'Tên sản phẩm',  type:'text' },
    { key:'price',  label:'Giá (VNĐ)',     type:'number' },
    { key:'socket', label:'Socket',        type:'text', placeholder:'VD: AM5, LGA1700, LGA1851' },
    { key:'cores',  label:'Nhân / luồng',  type:'text', placeholder:'VD: 6 nhân 12 luồng' },
    { key:'tdp',    label:'TDP (W)',       type:'number' },
  ],
  mainboard: [
    { key:'brand',  label:'Hãng',                 type:'text' },
    { key:'name',   label:'Tên sản phẩm',         type:'text' },
    { key:'price',  label:'Giá (VNĐ)',            type:'number' },
    { key:'socket', label:'Socket',                type:'text', placeholder:'Phải khớp CPU, VD: AM5' },
    { key:'ram',    label:'Chuẩn RAM hỗ trợ',      type:'select', options:['DDR4','DDR5'] },
    { key:'form',   label:'Kích thước bo mạch',    type:'select', options:['mATX','ATX'] },
  ],
  ram: [
    { key:'brand', label:'Hãng',         type:'text' },
    { key:'name',  label:'Tên sản phẩm', type:'text' },
    { key:'price', label:'Giá (VNĐ)',    type:'number' },
    { key:'type',  label:'Chuẩn RAM',    type:'select', options:['DDR4','DDR5'] },
    { key:'size',  label:'Dung lượng',   type:'text', placeholder:'VD: 16GB (2x8GB)' },
  ],
  gpu: [
    { key:'brand', label:'Hãng',         type:'text' },
    { key:'name',  label:'Tên sản phẩm', type:'text' },
    { key:'price', label:'Giá (VNĐ)',    type:'number' },
    { key:'vram',  label:'VRAM',         type:'text', placeholder:'VD: 8GB GDDR6' },
    { key:'tdp',   label:'TDP (W)',      type:'number' },
  ],
  storage: [
    { key:'brand', label:'Hãng',         type:'text' },
    { key:'name',  label:'Tên sản phẩm', type:'text' },
    { key:'price', label:'Giá (VNĐ)',    type:'number' },
    { key:'cap',   label:'Dung lượng',   type:'text', placeholder:'VD: 1TB' },
    { key:'type',  label:'Loại ổ',       type:'text', placeholder:'VD: NVMe Gen4 / SATA SSD / HDD' },
  ],
  psu: [
    { key:'brand', label:'Hãng',           type:'text' },
    { key:'name',  label:'Tên sản phẩm',   type:'text' },
    { key:'price', label:'Giá (VNĐ)',      type:'number' },
    { key:'watt',  label:'Công suất (W)',  type:'number' },
  ],
  case: [
    { key:'brand', label:'Hãng',              type:'text' },
    { key:'name',  label:'Tên sản phẩm',      type:'text' },
    { key:'price', label:'Giá (VNĐ)',         type:'number' },
    { key:'form',  label:'Kích thước hỗ trợ', type:'select', options:['mATX','ATX'] },
  ],
  cooler: [
    { key:'brand', label:'Hãng',         type:'text' },
    { key:'name',  label:'Tên sản phẩm', type:'text' },
    { key:'price', label:'Giá (VNĐ)',    type:'number' },
    { key:'type',  label:'Loại tản',     type:'select', options:['Khí','AIO'] },
  ],
};
const COOLER_HINT = 'Mẹo: với Tản nhiệt, hãy thêm 1 thông số tên đúng là "TDP hỗ trợ" (VD: ~180W) để hệ thống kiểm tra tương thích tự động nhận ra.';

let adminActivePage = 'overview';
let adminActiveCat = 'cpu';

// ---------- CỔNG ĐĂNG NHẬP ----------
function checkAdminGate(){
  if(isAdminLoggedIn()){
    document.getElementById('adminGate').style.display = 'none';
    document.getElementById('adminShell').classList.add('show');
    renderAdminAll();
  } else {
    document.getElementById('adminGate').style.display = 'flex';
    document.getElementById('adminShell').classList.remove('show');
  }
}
function submitAdminLogin(){
  const u = document.getElementById('adminUser').value.trim();
  const p = document.getElementById('adminPass').value;
  const errEl = document.getElementById('adminLoginError');

  if(!u || !p){
    errEl.textContent = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.';
    errEl.classList.add('show');
    return;
  }
  if(u.includes('@')){
    errEl.textContent = 'Tài khoản quản trị KHÔNG phải email — đây là ô "Tên đăng nhập" riêng cho admin (mặc định: admin), khác với tài khoản email bạn dùng để mua hàng.';
    errEl.classList.add('show');
    return;
  }
  if(adminLogin(u, p)){
    errEl.classList.remove('show');
    document.getElementById('adminUser').value = '';
    document.getElementById('adminPass').value = '';
    checkAdminGate();
  } else {
    errEl.textContent = 'Sai tên đăng nhập hoặc mật khẩu quản trị. Mặc định là admin / admin123 (trừ khi đã đổi ở mục Cài đặt).';
    errEl.classList.add('show');
  }
}
function doAdminLogout(){
  adminLogout();
  checkAdminGate();
}

// ---------- ĐIỀU HƯỚNG SIDEBAR ----------
function setAdminPage(page){
  adminActivePage = page;
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.admin-page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
}

function renderAdminAll(){
  renderOverview();
  renderUsersTable();
  renderOrdersTable();
  renderCatTabs();
  renderPartsPage();
  renderPresetsPage();
  renderDiscountsPage();
}

// ---------- 1) TỔNG QUAN ----------
function renderOverview(){
  const totalUsers = users.length;
  const orders = loadOrders();
  const totalOrders = orders.length;
  const revenue = orders.filter(o => o.status !== 'Đã huỷ').reduce((s,o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === 'Chờ xử lý').length;
  const totalParts = Object.values(PARTS).reduce((s, arr) => s + arr.length, 0);
  const customParts = Object.values(PARTS).reduce((s, arr) => s + arr.filter(isCustomPart).length, 0);

  document.getElementById('ovStats').innerHTML = `
    <div class="card admin-stat-card"><div class="lbl">Tài khoản người dùng</div><b>${totalUsers}</b></div>
    <div class="card admin-stat-card"><div class="lbl">Tổng đơn hàng</div><b>${totalOrders}</b></div>
    <div class="card admin-stat-card"><div class="lbl">Đơn chờ xử lý</div><b>${pending}</b></div>
    <div class="card admin-stat-card"><div class="lbl">Doanh thu (chưa trừ đơn huỷ)</div><b style="font-size:18px;">${fmt(revenue)}</b></div>
    <div class="card admin-stat-card"><div class="lbl">Tổng linh kiện</div><b>${totalParts}</b></div>
    <div class="card admin-stat-card"><div class="lbl">Linh kiện admin đã thêm</div><b>${customParts}</b></div>
  `;

  const recent = orders.slice(0, 5);
  document.getElementById('ovRecentOrders').innerHTML = recent.length ? `
    <div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
      <tbody>${recent.map(o => `<tr>
        <td class="mono">${o.id}</td>
        <td>${o.customerName || o.userName}<div class="muted">${o.userEmail}</div></td>
        <td class="mono">${fmt(o.total)}</td>
        <td><span class="status-badge ${statusClassAdmin(o.status)}">${o.status}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>
  ` : `<div class="empty-note">Chưa có đơn hàng nào.</div>`;
}

// ---------- 2) NGƯỜI DÙNG ----------
function renderUsersTable(){
  const el = document.getElementById('usersTableWrap');
  if(!users.length){
    el.innerHTML = `<div class="empty-note">Chưa có tài khoản người dùng nào đăng ký.</div>`;
    return;
  }
  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Họ tên</th><th>Email</th><th>Số đơn đã đặt</th><th></th></tr></thead>
    <tbody>${users.map(u => {
      const orderCount = getOrdersByUser(u.email).length;
      return `<tr>
        <td>${u.name}</td>
        <td class="muted">${u.email}</td>
        <td class="mono">${orderCount}</td>
        <td><button class="add-mini" style="color:var(--bad);border-color:rgba(248,113,113,0.35);" onclick="confirmDeleteUser('${u.email.replace(/'/g,"\\'")}')">Xoá</button></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}
function confirmDeleteUser(email){
  if(!confirm('Xoá tài khoản ' + email + '? Hành động này không thể hoàn tác.')) return;
  adminDeleteUser(email);
  renderUsersTable();
  renderOverview();
}

// ---------- 3) ĐƠN HÀNG ----------
function statusClassAdmin(status){
  return {
    'Chờ xử lý': 'st-cho', 'Đã duyệt': 'st-duyet', 'Đang giao': 'st-giao',
    'Hoàn tất': 'st-hoantat', 'Đã huỷ': 'st-huy',
  }[status] || '';
}
function renderOrdersTable(){
  const el = document.getElementById('ordersTableWrap');
  const orders = loadOrders();
  if(!orders.length){
    el.innerHTML = `<div class="empty-note">Chưa có đơn hàng nào được đặt.</div>`;
    return;
  }
  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Giao hàng</th><th>Thanh toán</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày đặt</th><th></th></tr></thead>
    <tbody>${orders.map(o => `<tr>
      <td class="mono">${o.id}</td>
      <td>${o.customerName || o.userName}<div class="muted">${o.userEmail}${o.phone ? ' · '+o.phone : ''}</div></td>
      <td class="muted" style="max-width:200px;">${o.address || '—'}</td>
      <td class="muted">${o.paymentMethod || '—'}</td>
      <td class="mono">
        ${fmt(o.total)}
        ${o.discountAmount ? `<div class="muted" style="color:var(--accent);">-${fmt(o.discountAmount)}${o.discountCode ? ' ('+o.discountCode+')' : ''}</div>` : ''}
      </td>
      <td>
        <select class="status-select" onchange="changeOrderStatus('${o.id}', this.value)">
          ${ORDER_STATUSES.map(s => `<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td class="muted">${new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
      <td><button class="add-mini" style="color:var(--bad);border-color:rgba(248,113,113,0.35);" onclick="confirmDeleteOrder('${o.id}')">Xoá</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function changeOrderStatus(id, status){
  updateOrderStatus(id, status);
  renderOrdersTable();
  renderOverview();
  showToast('Đã cập nhật trạng thái đơn ' + id);
}
function confirmDeleteOrder(id){
  if(!confirm('Xoá đơn hàng ' + id + '?')) return;
  deleteOrder(id);
  renderOrdersTable();
  renderOverview();
}

// ---------- 4) LINH KIỆN ----------
function renderCatTabs(){
  document.getElementById('catTabs').innerHTML = STEPS.map(s =>
    `<button class="admin-cat-tab ${adminActiveCat===s.key?'active':''}" onclick="setAdminCat('${s.key}')">${s.label}</button>`
  ).join('');
}
function setAdminCat(cat){
  adminActiveCat = cat;
  renderCatTabs();
  renderPartsPage();
}
function renderPartsPage(){
  renderPartForm();
  renderPartsTable();
}
function renderPartForm(){
  const schema = PART_SCHEMA[adminActiveCat];
  const fieldsHtml = schema.map(f => {
    if(f.type === 'select'){
      return `<div class="admin-field"><label>${f.label}</label>
        <select id="pf-${f.key}">${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>
      </div>`;
    }
    return `<div class="admin-field"><label>${f.label}</label>
      <input type="${f.type}" id="pf-${f.key}" placeholder="${f.placeholder || ''}">
    </div>`;
  }).join('');

  document.getElementById('partFormArea').innerHTML = `
    <div class="card admin-form-card">
      <h3>+ Thêm ${(STEPS.find(s=>s.key===adminActiveCat)||{}).label} mới</h3>
      <p>${adminActiveCat === 'cooler' ? COOLER_HINT : 'Điền thông tin cơ bản, có thể thêm thông số kỹ thuật chi tiết bên dưới (không bắt buộc).'}</p>
      <div class="admin-form-grid">${fieldsHtml}</div>
      <div class="admin-field" style="margin-top:14px;">
        <label>Thông số kỹ thuật chi tiết (tuỳ chọn)</label>
        <div class="admin-specs-rows" id="pfSpecsRows"></div>
        <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;width:fit-content;" onclick="addSpecRow()">+ Thêm dòng thông số</button>
      </div>
      <div class="admin-form-actions">
        <button class="btn btn-primary" onclick="submitAddPart()">Thêm vào danh mục</button>
      </div>
    </div>
  `;
  document.getElementById('pfSpecsRows').innerHTML = '';
  addSpecRow();
}
function addSpecRow(){
  const row = document.createElement('div');
  row.className = 'admin-spec-row';
  row.innerHTML = `
    <input type="text" placeholder="Tên thông số (VD: Bộ nhớ đệm)" class="spec-key">
    <input type="text" placeholder="Giá trị (VD: 20MB)" class="spec-val">
    <button type="button" class="admin-remove-row" onclick="this.parentElement.remove()">×</button>
  `;
  document.getElementById('pfSpecsRows').appendChild(row);
}
function submitAddPart(){
  const schema = PART_SCHEMA[adminActiveCat];
  const item = {};
  for(const f of schema){
    const el = document.getElementById('pf-' + f.key);
    let val = el.value.trim ? el.value.trim() : el.value;
    if(f.type === 'number') val = Number(val);
    if(f.type !== 'number' && !val){
      showToast('Vui lòng nhập đủ thông tin: ' + f.label);
      return;
    }
    if(f.type === 'number' && (isNaN(val) || val <= 0)){
      showToast('Giá trị không hợp lệ: ' + f.label);
      return;
    }
    item[f.key] = val;
  }
  const specs = {};
  document.querySelectorAll('#pfSpecsRows .admin-spec-row').forEach(row => {
    const k = row.querySelector('.spec-key').value.trim();
    const v = row.querySelector('.spec-val').value.trim();
    if(k && v) specs[k] = v;
  });
  item.specs = specs;
  item.id = adminActiveCat + '-' + slugify(item.name) + '-' + Date.now().toString().slice(-5);

  addCustomPart(adminActiveCat, item);
  showToast('Đã thêm "' + item.name + '" vào danh mục ' + adminActiveCat.toUpperCase());
  renderPartForm();
  renderPartsTable();
  renderOverview();
}
function slugify(str){
  return str.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}
function renderPartsTable(){
  const items = PARTS[adminActiveCat] || [];
  document.getElementById('partsTableWrap').innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Tên sản phẩm</th><th>Hãng</th><th>Giá</th><th>Nguồn</th><th></th></tr></thead>
    <tbody>${items.map(item => `<tr>
      <td>${item.name}</td>
      <td class="muted">${item.brand}</td>
      <td class="mono">${fmt(item.price)}</td>
      <td><span class="admin-tag ${isCustomPart(item)?'custom':'default'}">${isCustomPart(item)?'Admin đã thêm':'Mặc định'}</span></td>
      <td>${isCustomPart(item) ? `<button class="add-mini" style="color:var(--bad);border-color:rgba(248,113,113,0.35);" onclick="confirmDeletePart('${item.id}')">Xoá</button>` : ''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function confirmDeletePart(id){
  if(!confirm('Xoá linh kiện này khỏi danh mục?')) return;
  deleteCustomPart(adminActiveCat, id);
  renderPartsTable();
  renderOverview();
}

// ---------- 5) PRESET (CẤU HÌNH DỰNG SẴN) ----------
function renderPresetsPage(){
  document.getElementById('presetsTableWrap').innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Tên cấu hình</th><th>Phân khúc</th><th>Giá</th><th>Nguồn</th><th></th></tr></thead>
    <tbody>${PREBUILT.map(p => `<tr>
      <td>${p.name}<div class="muted">${p.use}</div></td>
      <td class="muted">${p.tag}</td>
      <td class="mono">${fmt(p.price)}</td>
      <td><span class="admin-tag ${p._custom?'custom':'default'}">${p._custom?'Admin đã thêm':'Mặc định'}</span></td>
      <td>${p._custom ? `<button class="add-mini" style="color:var(--bad);border-color:rgba(248,113,113,0.35);" onclick="confirmDeletePreset('${p._id}')">Xoá</button>` : ''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
  document.getElementById('psSpecsRows').innerHTML = '';
  addPresetSpecRow();
}
function addPresetSpecRow(){
  const row = document.createElement('div');
  row.className = 'admin-spec-row';
  row.innerHTML = `
    <input type="text" placeholder="Linh kiện (VD: CPU)" class="ps-key">
    <input type="text" placeholder="Giá trị (VD: Intel Core i5-14600K)" class="ps-val">
    <button type="button" class="admin-remove-row" onclick="this.parentElement.remove()">×</button>
  `;
  document.getElementById('psSpecsRows').appendChild(row);
}
function submitAddPreset(){
  const tag = document.getElementById('ps-tag').value.trim();
  const name = document.getElementById('ps-name').value.trim();
  const use = document.getElementById('ps-use').value.trim();
  const price = Number(document.getElementById('ps-price').value);
  if(!tag || !name || !use || !price || price <= 0){
    showToast('Vui lòng điền đầy đủ thông tin cấu hình.');
    return;
  }
  const specs = {};
  document.querySelectorAll('#psSpecsRows .admin-spec-row').forEach(row => {
    const k = row.querySelector('.ps-key').value.trim();
    const v = row.querySelector('.ps-val').value.trim();
    if(k && v) specs[k] = v;
  });
  addCustomPreset({ tag, name, use, price, specs });
  showToast('Đã thêm cấu hình dựng sẵn "' + name + '"');
  document.getElementById('ps-tag').value = '';
  document.getElementById('ps-name').value = '';
  document.getElementById('ps-use').value = '';
  document.getElementById('ps-price').value = '';
  renderPresetsPage();
  renderOverview();
}
function confirmDeletePreset(_id){
  if(!confirm('Xoá cấu hình dựng sẵn này?')) return;
  deleteCustomPreset(_id);
  renderPresetsPage();
  renderOverview();
}

// ---------- 5b) MÃ GIẢM GIÁ ----------
function renderDiscountsPage(){
  const codes = Object.keys(DISCOUNT_CODES);
  document.getElementById('discountsTableWrap').innerHTML = codes.length ? `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Mã</th><th>Loại</th><th>Giá trị</th><th>Mô tả</th><th>Nguồn</th><th></th></tr></thead>
    <tbody>${codes.map(code => {
      const d = DISCOUNT_CODES[code];
      const isCustom = isCustomDiscount(code);
      const valueLabel = d.type === 'percent' ? d.value + '%' : fmt(d.value);
      return `<tr>
        <td class="mono">${code}</td>
        <td class="muted">${d.type === 'percent' ? 'Phần trăm' : 'Số tiền cố định'}</td>
        <td class="mono">${valueLabel}</td>
        <td class="muted">${d.label || ''}</td>
        <td><span class="admin-tag ${isCustom?'custom':'default'}">${isCustom?'Admin đã thêm':'Mặc định'}</span></td>
        <td>${isCustom ? `<button class="add-mini" style="color:var(--bad);border-color:rgba(248,113,113,0.35);" onclick="confirmDeleteDiscount('${code}')">Xoá</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>` : `<div class="empty-note">Chưa có mã giảm giá nào.</div>`;
}
function submitAddDiscount(){
  const code = document.getElementById('dc-code').value.trim().toUpperCase();
  const type = document.getElementById('dc-type').value;
  const value = Number(document.getElementById('dc-value').value);
  const label = document.getElementById('dc-label').value.trim();

  if(!code || !/^[A-Z0-9]{3,20}$/.test(code)){
    showToast('Mã giảm giá không hợp lệ (chỉ gồm chữ/số, 3-20 ký tự).');
    return;
  }
  if(!value || value <= 0 || (type === 'percent' && value > 100)){
    showToast('Giá trị giảm giá không hợp lệ.');
    return;
  }
  if(!label){
    showToast('Vui lòng nhập mô tả hiển thị cho khách.');
    return;
  }
  if(DISCOUNT_CODES[code]){
    showToast('Mã "' + code + '" đã tồn tại, hãy chọn mã khác.');
    return;
  }

  addCustomDiscount(code, { type, value, label });
  showToast('Đã thêm mã giảm giá "' + code + '"');
  document.getElementById('dc-code').value = '';
  document.getElementById('dc-value').value = '';
  document.getElementById('dc-label').value = '';
  renderDiscountsPage();
}
function confirmDeleteDiscount(code){
  if(!confirm('Xoá mã giảm giá "' + code + '"?')) return;
  deleteCustomDiscount(code);
  renderDiscountsPage();
}

// ---------- 6) CÀI ĐẶT (đổi mật khẩu admin) ----------
function submitChangeAdminPassword(){
  const oldP = document.getElementById('adminOldPass').value;
  const newP = document.getElementById('adminNewPass').value;
  const msgEl = document.getElementById('adminPassMsg');
  if(newP.length < 6){
    msgEl.textContent = 'Mật khẩu mới cần tối thiểu 6 ký tự.';
    msgEl.style.color = 'var(--bad)';
    return;
  }
  if(adminChangePassword(oldP, newP)){
    msgEl.textContent = 'Đổi mật khẩu thành công.';
    msgEl.style.color = 'var(--good)';
    document.getElementById('adminOldPass').value = '';
    document.getElementById('adminNewPass').value = '';
  } else {
    msgEl.textContent = 'Mật khẩu hiện tại không đúng.';
    msgEl.style.color = 'var(--bad)';
  }
}

// ---------- khởi động ----------
checkAdminGate();
