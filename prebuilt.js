// ============================================================
// prebuilt.js — Logic riêng cho trang "PC dựng sẵn" (prebuilt.html)
// ============================================================

function renderPrebuilt(){
  document.getElementById('prebuiltGrid').innerHTML = PREBUILT.map(p => `
    <div class="pre-card card">
      <div class="pre-head">
        <div class="tag">${p.tag}</div>
        <h3>${p.name}</h3>
        <div class="use">${p.use}</div>
      </div>
      <div class="pre-specs">
        ${Object.entries(p.specs).map(([k, v]) => `<div class="pre-spec-row"><span>${k}</span><span>${v}</span></div>`).join('')}
      </div>
      <div class="pre-foot">
        <b>${fmt(p.price)}</b>
        <button class="btn btn-primary btn-sm" onclick="addToCart('${p.name}', ${p.price})">Thêm vào giỏ</button>
      </div>
    </div>
  `).join('');
}

renderPrebuilt();
