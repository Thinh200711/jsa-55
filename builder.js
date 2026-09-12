// ============================================================
// builder.js — Logic riêng cho trang "Xây dựng PC" (builder.html)
// Người dùng chọn từng linh kiện, trang này kiểm tra xem chúng
// có tương thích với nhau không (socket, loại RAM, công suất...).
// ============================================================

// Cấu hình đang được chọn — mỗi khoá tương ứng 1 bước trong STEPS
let build = { cpu:null, mainboard:null, ram:null, gpu:null, storage:null, psu:null, case:null, cooler:null };
let activeStep = 'cpu';   // bước (loại linh kiện) đang xem
let activeBrand = 'all';  // hãng đang lọc trong bước hiện tại

// ---------- các bước chọn linh kiện (tabs) ----------
function renderStepTabs(){
  const el = document.getElementById('stepTabs');
  el.innerHTML = STEPS.map((s, i) => {
    const done = !!build[s.key];
    const active = activeStep === s.key;
    return `<button class="step-tab ${active ? 'active' : ''} ${done && !active ? 'done' : ''}" onclick="setStep('${s.key}')">
      <span class="n">${done ? '✓' : (i + 1)}</span>${s.label}
    </button>`;
  }).join('');
}
function setStep(key){
  activeStep = key;
  activeBrand = 'all';
  renderAll();
}

// ---------- lọc theo hãng ----------
function brandsFor(cat){
  return [...new Set(PARTS[cat].map(p => p.brand))].sort();
}
function renderBrandFilter(){
  const brands = brandsFor(activeStep);
  document.getElementById('brandFilter').innerHTML = ['all', ...brands].map(b =>
    `<button class="brand-chip ${activeBrand === b ? 'active' : ''}" onclick="setActiveBrand('${b}')">${b === 'all' ? 'Tất cả hãng' : b}</button>`
  ).join('');
}
function setActiveBrand(b){
  activeBrand = b;
  renderPartList();
  renderBrandFilter();
}

// ---------- danh sách sản phẩm của bước hiện tại ----------
function renderPartList(){
  const cat = activeStep;
  const items = PARTS[cat].filter(p => activeBrand === 'all' || p.brand === activeBrand);
  document.getElementById('partList').innerHTML = items.map(item => {
    const selected = build[cat] && build[cat].id === item.id;
    return `<div class="part-card card ${selected ? 'selected' : ''}">
      <button class="info-btn" onclick="event.stopPropagation(); openDetail('${cat}','${item.id}')" title="Xem chi tiết">i</button>
      <div onclick="selectPart('${cat}','${item.id}')">
        <div class="check"></div>
        <div class="brand-tag">${item.brand}</div>
        <h4>${item.name}</h4>
        <div class="specs">${specChips(item, cat)}</div>
        <div class="price">${fmt(item.price)}</div>
      </div>
    </div>`;
  }).join('');
}
function selectPart(cat, id){
  build[cat] = PARTS[cat].find(p => p.id === id);
  // tự động chuyển sang bước kế tiếp cho tiện
  const idx = STEPS.findIndex(s => s.key === cat);
  if(idx < STEPS.length - 1) activeStep = STEPS[idx + 1].key;
  activeBrand = 'all';
  renderAll();
}

// ---------- kiểm tra tương thích giữa các linh kiện ----------

// Đọc số W hỗ trợ từ thông số tản nhiệt, vd "~180W" -> 180
function coolerTdpSupport(cooler){
  if(!cooler || !cooler.specs) return null;
  const raw = cooler.specs['TDP hỗ trợ'] || '';
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function computeCompat(){
  const issues = [];
  const edges = {};

  // CPU và mainboard phải cùng loại socket
  if(build.cpu && build.mainboard){
    const ok = build.cpu.socket === build.mainboard.socket;
    edges.cpu_mb = { ok };
    if(!ok) issues.push(`Socket CPU (${build.cpu.socket}) không khớp mainboard (${build.mainboard.socket}).`);
  } else edges.cpu_mb = { ok: null };

  // Mainboard và RAM phải cùng chuẩn (DDR4 / DDR5)
  if(build.mainboard && build.ram){
    const ok = build.mainboard.ram === build.ram.type;
    edges.mb_ram = { ok };
    if(!ok) issues.push(`Mainboard dùng ${build.mainboard.ram}, RAM bạn chọn là ${build.ram.type}.`);
  } else edges.mb_ram = { ok: null };

  // Case phải đủ lớn cho mainboard (mATX nhỏ hơn ATX)
  if(build.mainboard && build.case){
    const order = { mATX: 1, ATX: 2 };
    const ok = order[build.case.form] >= order[build.mainboard.form];
    edges.mb_case = { ok };
    if(!ok) issues.push(`Case ${build.case.form} không đủ chỗ cho mainboard ${build.mainboard.form}.`);
  } else edges.mb_case = { ok: null };

  // Tản nhiệt phải chịu được mức TDP của CPU
  if(build.cpu && build.cooler){
    const support = coolerTdpSupport(build.cooler);
    const ok = support === null ? null : support >= build.cpu.tdp;
    edges.cpu_cooler = { ok };
    if(ok === false) issues.push(`Tản nhiệt ${build.cooler.name} hỗ trợ tối đa ~${support}W, chưa đủ cho CPU ${build.cpu.tdp}W TDP.`);
  } else edges.cpu_cooler = { ok: null };

  // Ước tính tổng công suất tiêu thụ, cộng thêm 20% dự phòng
  const wattBreakdown = {
    cpu:       build.cpu ? build.cpu.tdp : 0,
    gpu:       build.gpu ? build.gpu.tdp : 0,
    mainboard: build.mainboard ? 45 : 0,
    ram:       build.ram ? (build.ram.type === 'DDR5' ? 12 : 8) : 0,
    storage:   build.storage ? (build.storage.type && build.storage.type.includes('NVMe') ? 8 : 5) : 0,
    cooler:    build.cooler ? (build.cooler.type === 'AIO' ? 18 : 6) : 0,
    base:      25, // quạt case, bo mạch phụ, LED...
  };
  const rawTotal = Object.values(wattBreakdown).reduce((a, b) => a + b, 0);
  const estTotal = Math.round(rawTotal * 1.2);

  let wattOk = null;
  let overloadPct = 0;
  if(build.psu){
    wattOk = build.psu.watt >= estTotal;
    overloadPct = Math.round((estTotal / build.psu.watt) * 100);
    edges.power = { ok: wattOk };
    if(!wattOk) issues.push(`Nguồn ${build.psu.watt}W không đủ — cấu hình cần khoảng ${estTotal}W (đang tải ${overloadPct}%).`);
  } else edges.power = { ok: null };

  return { edges, issues, estTotal, psuWatt: build.psu ? build.psu.watt : 0, loadPct: overloadPct };
}

// ---------- sơ đồ tương thích (vẽ bằng SVG) ----------
function edgeColor(ok){
  if(ok === true) return '#4ADE80';
  if(ok === false) return '#F87171';
  return '#243252';
}
function nodeColor(present, ok){
  if(present && ok === false) return '#F87171';
  if(present) return '#FF7A33';
  return '#1B2740';
}
function diagramSVG(compat){
  const w = 560, h = 250;
  const nodes = {
    cooler: { x: w*0.16, y: h*0.22, label: 'TẢN NHIỆT' },
    cpu:    { x: w*0.42, y: h*0.22, label: 'CPU' },
    mb:     { x: w*0.68, y: h*0.22, label: 'MAINBOARD' },
    ram:    { x: w*0.92, y: h*0.22, label: 'RAM' },
    gpu:    { x: w*0.16, y: h*0.78, label: 'GPU' },
    psu:    { x: w*0.42, y: h*0.78, label: 'PSU' },
    caseN:  { x: w*0.68, y: h*0.78, label: 'CASE' },
  };
  const cpuMbOk  = compat.edges.cpu_mb.ok;
  const mbRamOk  = compat.edges.mb_ram.ok;
  const mbCaseOk = compat.edges.mb_case.ok;
  const powerOk  = compat.edges.power.ok;
  const coolerOk = compat.edges.cpu_cooler.ok;

  const line = (a, b, ok) => `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="${edgeColor(ok)}" stroke-width="2" ${ok === false ? 'stroke-dasharray="4 3"' : ''}/>`;
  const dot = (key, present, ok) => {
    const n = nodes[key];
    return `<g>
      <circle cx="${n.x}" cy="${n.y}" r="7" fill="${nodeColor(present, ok)}" ${present ? 'stroke="#0A0F1C" stroke-width="1"' : ''}/>
      ${present ? `<circle cx="${n.x}" cy="${n.y}" r="12" fill="none" stroke="${nodeColor(present, ok)}" stroke-width="1" opacity="0.4"/>` : ''}
      <text x="${n.x}" y="${n.y + (n.y < h/2 ? -16 : 22)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="${present ? '#E7ECF6' : '#5D6B8C'}">${n.label}</text>
    </g>`;
  };

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block;">
    ${line('cooler','cpu', coolerOk)}
    ${line('cpu','mb', cpuMbOk)}
    ${line('mb','ram', mbRamOk)}
    ${line('mb','caseN', mbCaseOk)}
    ${line('cpu','psu', powerOk)}
    ${line('gpu','psu', powerOk)}
    ${dot('cooler', !!build.cooler, coolerOk)}
    ${dot('cpu', !!build.cpu, cpuMbOk === false || coolerOk === false ? false : cpuMbOk)}
    ${dot('mb', !!build.mainboard, cpuMbOk === false || mbRamOk === false || mbCaseOk === false ? false : (build.mainboard ? true : null))}
    ${dot('ram', !!build.ram, mbRamOk)}
    ${dot('gpu', !!build.gpu, powerOk)}
    ${dot('psu', !!build.psu, powerOk)}
    ${dot('caseN', !!build.case, mbCaseOk)}
  </svg>`;
}

// ---------- bảng tóm tắt cấu hình bên phải ----------
function renderSummary(){
  const rows = STEPS.map(s => {
    const item = build[s.key];
    return `<div class="summary-row"><span>${s.label}</span><b>${item ? item.name : '—'}</b></div>`;
  }).join('');
  document.getElementById('summaryRows').innerHTML = rows;

  const total = STEPS.reduce((sum, s) => sum + (build[s.key] ? build[s.key].price : 0), 0);
  document.getElementById('totalPrice').textContent = fmt(total);

  const compat = computeCompat();
  const realPct = compat.psuWatt ? Math.round((compat.estTotal / compat.psuWatt) * 100) : 0;
  const barPct = Math.min(100, realPct);

  const wattTextEl = document.getElementById('wattText');
  wattTextEl.textContent = compat.psuWatt
    ? `${compat.estTotal}W cần · ${compat.psuWatt}W nguồn (${realPct}%)`
    : `${compat.estTotal}W cần · —W nguồn`;
  wattTextEl.style.color = compat.psuWatt && realPct > 100 ? 'var(--bad)' : '';

  const bar = document.getElementById('wattBarFill');
  bar.style.width = barPct + '%';
  bar.style.background = realPct > 100 ? '#F87171' : (realPct > 85 ? '#FBBF24' : '#4FD8C4');

  const issuesBox = document.getElementById('issuesBox');
  const allSelected = STEPS.every(s => build[s.key]);
  if(compat.issues.length){
    issuesBox.innerHTML = compat.issues.map(i => `<div class="issue">${i}</div>`).join('');
  } else if(allSelected){
    issuesBox.innerHTML = `<div class="ok-msg">Toàn bộ linh kiện tương thích, sẵn sàng đặt hàng.</div>`;
  } else {
    issuesBox.innerHTML = `<div style="font-size:12px;color:var(--muted-2);">Chọn đủ 8 linh kiện để hoàn tất kiểm tra.</div>`;
  }

  document.getElementById('addBuildBtn').disabled = !(allSelected && compat.issues.length === 0);
  document.getElementById('buildDiagram').innerHTML = diagramSVG(compat);
}

function resetBuild(){
  build = { cpu:null, mainboard:null, ram:null, gpu:null, storage:null, psu:null, case:null, cooler:null };
  activeStep = 'cpu';
  activeBrand = 'all';
  renderAll();
}

function addBuildToCart(){
  const total = STEPS.reduce((sum, s) => sum + build[s.key].price, 0);
  const label = `Cấu hình tự build (${build.cpu.name.split(' ').slice(0, 3).join(' ')}...)`;
  addToCart(label, total);
}

function renderAll(){
  renderStepTabs();
  renderBrandFilter();
  renderPartList();
  renderSummary();
}

renderAll();
