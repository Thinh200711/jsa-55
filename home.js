// ============================================================
// home.js — Logic riêng cho trang chủ (index.html)
// Chỉ tính vài con số thống kê + vẽ 1 sơ đồ minh hoạ tĩnh
// (trang chủ không có cấu hình đang build, nên sơ đồ ở đây chỉ
// là ví dụ minh hoạ, không phải dữ liệu thật).
// ============================================================

function renderHeroStats(){
  const totalParts = Object.values(PARTS).reduce((sum, arr) => sum + arr.length, 0);
  const totalBrands = new Set(Object.values(PARTS).flat().map(p => p.brand)).size;
  document.getElementById('statParts').textContent = totalParts;
  document.getElementById('statBrands').textContent = totalBrands;
}

// Sơ đồ minh hoạ: 7 linh kiện, tất cả đã "nối" và "hợp nhau" (màu xanh)
function renderHeroDiagram(){
  const w = 300, h = 170;
  const nodes = {
    cooler: { x: w*0.16, y: h*0.22, label: 'TẢN NHIỆT' },
    cpu:    { x: w*0.42, y: h*0.22, label: 'CPU' },
    mb:     { x: w*0.68, y: h*0.22, label: 'MAINBOARD' },
    ram:    { x: w*0.92, y: h*0.22, label: 'RAM' },
    gpu:    { x: w*0.16, y: h*0.78, label: 'GPU' },
    psu:    { x: w*0.42, y: h*0.78, label: 'PSU' },
    caseN:  { x: w*0.68, y: h*0.78, label: 'CASE' },
  };
  const okColor = '#4ADE80';
  const nodeColor = '#FF7A33';

  const line = (a, b) => `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="${okColor}" stroke-width="2"/>`;
  const dot = (key) => {
    const n = nodes[key];
    return `<g>
      <circle cx="${n.x}" cy="${n.y}" r="7" fill="${nodeColor}" stroke="#0A0F1C" stroke-width="1"/>
      <circle cx="${n.x}" cy="${n.y}" r="12" fill="none" stroke="${nodeColor}" stroke-width="1" opacity="0.4"/>
      <text x="${n.x}" y="${n.y + (n.y < h/2 ? -16 : 22)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#E7ECF6">${n.label}</text>
    </g>`;
  };

  document.getElementById('heroDiagram').innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block;">
    ${line('cooler','cpu')}${line('cpu','mb')}${line('mb','ram')}${line('mb','caseN')}${line('cpu','psu')}${line('gpu','psu')}
    ${dot('cooler')}${dot('cpu')}${dot('mb')}${dot('ram')}${dot('gpu')}${dot('psu')}${dot('caseN')}
  </svg>`;
}

renderHeroStats();
renderHeroDiagram();
