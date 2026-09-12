// ============================================================
// detail.js — Modal xem chi tiết thông số 1 linh kiện
// Dùng chung cho trang Xây dựng PC và trang Linh kiện.
// ============================================================

// Trả về vài "thẻ" thông số ngắn gọn để hiện trên từng thẻ sản phẩm,
// mỗi loại linh kiện (cpu, ram, gpu...) hiện thông số khác nhau.
function specChips(item, cat){
  const map = {
    cpu:       [`Socket ${item.socket}`, item.cores, `${item.tdp}W`],
    mainboard: [`Socket ${item.socket}`, item.ram, item.form],
    ram:       [item.type, item.size],
    gpu:       [`${item.vram} VRAM`, `${item.tdp}W`],
    storage:   [item.cap, item.type],
    psu:       [`${item.watt}W`, '80+'],
    case:      [item.form],
    cooler:    [item.type, item.specs && item.specs['TDP hỗ trợ'] ? `Hỗ trợ ${item.specs['TDP hỗ trợ']}` : null].filter(Boolean),
  };
  return (map[cat] || []).map(c => `<span class="pill">${c}</span>`).join('');
}

// Mở modal chi tiết cho 1 sản phẩm (cat = loại linh kiện, id = mã sản phẩm)
function openDetail(cat, id){
  const item = PARTS[cat].find(p => p.id === id);
  if(!item) return;

  const specsHtml = Object.entries(item.specs || {}).map(([k, v]) =>
    `<div class="detail-spec-item"><div class="k">${k}</div><div class="v">${v}</div></div>`
  ).join('');

  const categoryLabel = (STEPS.find(s => s.key === cat) || {}).label || cat;
  const safeName = item.name.replace(/'/g, "\\'");

  // Nút "Chọn cho build" chỉ hiện trên trang Xây dựng PC, vì chỉ trang đó
  // có sẵn hàm selectPart(). Trang Linh kiện không định nghĩa hàm này.
  const chooseButton = (typeof selectPart === 'function')
    ? `<button class="btn btn-primary btn-sm" onclick="selectPart('${cat}','${item.id}'); closeDetail();">Chọn cho build</button>`
    : '';

  document.getElementById('detailBox').innerHTML = `
    <div class="detail-head">
      <div>
        <div class="brand-tag">${item.brand} · ${categoryLabel}</div>
        <h3>${item.name}</h3>
      </div>
      <button class="detail-close" onclick="closeDetail()">×</button>
    </div>
    <div class="detail-body">
      <div class="specs" style="margin-bottom:16px;">${specChips(item, cat)}</div>
      <div class="detail-spec-grid">${specsHtml}</div>
    </div>
    <div class="detail-foot">
      <b>${fmt(item.price)}</b>
      <div class="detail-actions">
        <button class="btn btn-ghost btn-sm" onclick="addToCart('${safeName}', ${item.price}); closeDetail();">Thêm vào giỏ</button>
        ${chooseButton}
      </div>
    </div>
  `;
  document.getElementById('detailModal').classList.add('show');
  setOverlay(true);
}

function closeDetail(){
  document.getElementById('detailModal').classList.remove('show');
  setOverlay(isAnyOverlayOpen());
}
