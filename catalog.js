// ============================================================
// catalog.js — Logic riêng cho trang "Linh kiện" (catalog.html)
// Bảng liệt kê toàn bộ sản phẩm, lọc theo loại và theo hãng.
// ============================================================

let catalogFilter = 'all'; // loại linh kiện đang lọc (cpu, ram, ... hoặc 'all')
let catalogBrand = 'all';  // hãng đang lọc

function renderCatalogFilters(){
  const cats = [{ key: 'all', label: 'Tất cả' }, ...STEPS];
  document.getElementById('catalogFilters').innerHTML = cats.map(c =>
    `<button class="filter-chip ${catalogFilter === c.key ? 'active' : ''}" onclick="setCatalogFilter('${c.key}')">${c.label}</button>`
  ).join('');
}
function setCatalogFilter(key){
  catalogFilter = key;
  catalogBrand = 'all';
  renderCatalog();
  renderCatalogFilters();
  renderCatalogBrandFilter();
}

function catalogBrands(){
  const cats = catalogFilter === 'all' ? Object.keys(PARTS) : [catalogFilter];
  const set = new Set();
  cats.forEach(c => PARTS[c].forEach(p => set.add(p.brand)));
  return [...set].sort();
}
function renderCatalogBrandFilter(){
  const brands = catalogBrands();
  document.getElementById('catalogBrandFilter').innerHTML = ['all', ...brands].map(b =>
    `<button class="brand-chip ${catalogBrand === b ? 'active' : ''}" onclick="setCatalogBrand('${b}')">${b === 'all' ? 'Tất cả hãng' : b}</button>`
  ).join('');
}
function setCatalogBrand(b){
  catalogBrand = b;
  renderCatalog();
  renderCatalogBrandFilter();
}

function renderCatalog(){
  const rows = [];
  Object.keys(PARTS).forEach(cat => {
    if(catalogFilter !== 'all' && catalogFilter !== cat) return;
    PARTS[cat].forEach(item => {
      if(catalogBrand !== 'all' && item.brand !== catalogBrand) return;
      rows.push({ cat, item });
    });
  });

  document.getElementById('catalogBody').innerHTML = rows.map(({ cat, item }) => `
    <tr onclick="openDetail('${cat}','${item.id}')">
      <td class="cat-name">${item.name}</td>
      <td class="cat-brand">${item.brand}</td>
      <td>${specChips(item, cat)}</td>
      <td class="cat-price">${fmt(item.price)}</td>
      <td><button class="add-mini" onclick="event.stopPropagation(); addToCart('${item.name.replace(/'/g, "\\'")}', ${item.price})">+ Giỏ hàng</button></td>
    </tr>
  `).join('');
}

renderCatalogFilters();
renderCatalogBrandFilter();
renderCatalog();
