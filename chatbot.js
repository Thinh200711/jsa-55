// ============================================================
// chatbot.js — Chatbot gọi THẲNG tới Groq API từ trình duyệt.
//
// ⚠️ CẢNH BÁO BẢO MẬT — ĐỌC KỸ TRƯỚC KHI DEPLOY ⚠️
// Vì trang này chạy trên GitHub Pages (chỉ phục vụ file tĩnh,
// không chạy được code phía server), API key BẮT BUỘC phải nằm
// trong file JS này để trình duyệt gọi được Groq. Điều đó có
// nghĩa là:
//   - Bất kỳ ai bấm F12 / "View Page Source" đều đọc được key.
//   - Ai đó có thể copy key này và dùng ké quota/tiền của bạn
//     trên tài khoản Groq, KHÔNG thông qua chatbot trên site
//     bạn — rate limit phía client bên dưới không chặn được
//     việc này (nó chỉ hạn chế người dùng bình thường trên
//     chính trang web của bạn, không hạn chế người lấy key
//     rồi gọi trực tiếp bằng script/Postman).
//
// Để giảm thiểu rủi ro, bạn NÊN:
//   1) Tạo một API key MỚI dành riêng cho việc này tại
//      https://console.groq.com/keys — KHÔNG dùng lại key cũ
//      đã từng nằm trong file .env (coi như key đó đã lộ).
//   2) Vào Groq Console đặt giới hạn chi tiêu / usage alert cho
//      key này (nếu Groq hỗ trợ) để nếu bị lạm dụng, bạn được
//      báo sớm chứ không bị "cháy" quota âm thầm.
//   3) Theo dõi usage định kỳ, sẵn sàng revoke + đổi key ngay
//      nếu thấy lượng gọi bất thường.
//   4) Chỉ dùng key này cho việc demo/thử nghiệm — nếu site lên
//      production thật và có ngân sách để lo, cân nhắc chuyển
//      sang một serverless function (Cloudflare Pages Functions,
//      Netlify Functions...) để giấu key thật sự.
// ============================================================

// >>> ĐIỀN KEY GROQ MỚI (đã tạo riêng, không phải key cũ) VÀO ĐÂY <<<
const GROQ_API_KEY = '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';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_PRIMARY = 'openai/gpt-oss-120b';
const GROQ_MODEL_FALLBACK = 'openai/gpt-oss-20b';

const CHAT_SYSTEM_PROMPT = `Bạn là trợ lý hỗ trợ khách hàng của MARC PC — một cửa hàng linh kiện máy tính và PC theo yêu cầu tại Việt Nam.
Nhiệm vụ của bạn:
- Giúp khách chọn linh kiện phù hợp (CPU, mainboard, RAM, GPU, ổ cứng, nguồn, case, tản nhiệt) và giải thích ngắn gọn về tương thích (socket, chuẩn RAM, công suất nguồn...).
- Giải đáp về cách đặt hàng, giỏ hàng, tài khoản, và tình trạng đơn hàng (các trạng thái: Chờ xử lý, Đã duyệt, Đang giao, Hoàn tất, Đã huỷ). Nếu khách hỏi về đơn hàng cụ thể, hướng dẫn họ vào mục "Đơn hàng của tôi" ở menu tài khoản để xem chi tiết vì bạn không có quyền truy cập dữ liệu đơn hàng thật.
- Luôn trả lời bằng tiếng Việt, ngắn gọn, thân thiện, đi thẳng vào vấn đề.
- Nếu không chắc chắn về thông tin cụ thể (giá, tồn kho...), hãy nói rõ là khách nên kiểm tra trực tiếp trên trang thay vì đoán.
Đây là một trang demo giao diện, dữ liệu sản phẩm chỉ mang tính minh hoạ.`;

const CHAT_HISTORY_KEY = 'marcpc_chat_history';

// ---------- Rate limit phía client (chỉ hạn chế người dùng bình
// thường trên chính trang này, KHÔNG bảo vệ được key khỏi bị lấy
// và gọi trực tiếp từ nơi khác — xem cảnh báo phía trên) ----------
const RATE_LIMIT_MAX = 30;              // tối đa 30 tin nhắn
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // trong 5 phút
const RATE_LIMIT_KEY = 'marcpc_chat_rate';

function checkRateLimit(){
  const now = Date.now();
  let hits = [];
  try{ hits = JSON.parse(sessionStorage.getItem(RATE_LIMIT_KEY) || '[]'); }catch(e){ hits = []; }
  hits = hits.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if(hits.length >= RATE_LIMIT_MAX) return false;
  hits.push(now);
  sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(hits));
  return true;
}

function loadChatHistory(){
  try{
    const raw = sessionStorage.getItem(CHAT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveChatHistory(history){
  sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
}

let chatHistory = loadChatHistory();
let chatOpen = false;
let chatBusy = false;

function buildChatWidget(){
  const toggle = document.createElement('button');
  toggle.className = 'mpc-chat-toggle';
  toggle.id = 'mpcChatToggle';
  toggle.innerHTML = '💬';
  toggle.onclick = toggleChatPanel;

  const panel = document.createElement('div');
  panel.className = 'mpc-chat-panel';
  panel.id = 'mpcChatPanel';
  panel.innerHTML = `
    <div class="mpc-chat-head">
      <div>
        <div class="t">Hỗ trợ MARC PC</div>
        <div class="s">Đang hoạt động</div>
      </div>
      <button class="mpc-chat-close" onclick="toggleChatPanel(false)">×</button>
    </div>
    <div class="mpc-chat-body" id="mpcChatBody"></div>
    <div class="mpc-chat-foot">
      <input type="text" id="mpcChatInput" placeholder="Nhập câu hỏi..." onkeydown="if(event.key==='Enter') sendChatMessage();">
      <button onclick="sendChatMessage()">Gửi</button>
    </div>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  renderChatMessages();
  if(!chatHistory.length){
    pushChatMessage('bot', 'Chào bạn 👋 Mình là trợ lý MARC PC. Mình có thể giúp bạn chọn linh kiện, kiểm tra tương thích, hoặc hướng dẫn đặt hàng — bạn cần hỗ trợ gì?', false);
  }
}

function toggleChatPanel(show){
  chatOpen = show === undefined ? !chatOpen : show;
  document.getElementById('mpcChatPanel').classList.toggle('show', chatOpen);
  if(chatOpen) document.getElementById('mpcChatInput').focus();
}

function pushChatMessage(role, content, persist){
  chatHistory.push({ role, content });
  if(persist !== false) saveChatHistory(chatHistory);
  renderChatMessages();
}

function renderChatMessages(){
  const body = document.getElementById('mpcChatBody');
  if(!body) return;
  body.innerHTML = chatHistory.map(m =>
    `<div class="mpc-msg ${m.role === 'user' ? 'user' : 'bot'}">${escapeHtml(m.content)}</div>`
  ).join('');
  body.scrollTop = body.scrollHeight;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function sendChatMessage(){
  if(chatBusy) return;
  const input = document.getElementById('mpcChatInput');
  const text = input.value.trim();
  if(!text) return;

  if(!checkRateLimit()){
    pushChatMessage('bot', '⚠️ Bạn gửi tin nhắn hơi nhanh, vui lòng thử lại sau ít phút.', false);
    return;
  }

  input.value = '';
  pushChatMessage('user', text);
  chatBusy = true;

  const body = document.getElementById('mpcChatBody');
  const typingEl = document.createElement('div');
  typingEl.className = 'mpc-msg bot typing';
  typingEl.id = 'mpcTyping';
  typingEl.textContent = 'Đang trả lời...';
  body.appendChild(typingEl);
  body.scrollTop = body.scrollHeight;

  try{
    const history = chatHistory
      .slice(-12)
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.content }));

    const reply = await callGroqWithFallback(history);
    document.getElementById('mpcTyping')?.remove();
    pushChatMessage('bot', reply.trim());
  }catch(err){
    document.getElementById('mpcTyping')?.remove();
    console.error('Chatbot error:', err);
    pushChatMessage('bot',
      '⚠️ Không gọi được dịch vụ chat lúc này, vui lòng thử lại sau.\n' +
      'Chi tiết: ' + (err && err.message ? err.message : String(err)),
      false);
  }finally{
    chatBusy = false;
  }
}

// Gọi thẳng Groq, thử model chính trước rồi model dự phòng nếu lỗi.
async function callGroqWithFallback(history){
  const messages = [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...history];
  let lastErr;

  for(const model of [GROQ_MODEL_PRIMARY, GROQ_MODEL_FALLBACK]){
    try{
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_API_KEY,
        },
        body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: 500 }),
      });

      if(!res.ok){
        const errData = await res.json().catch(() => ({}));
        lastErr = new Error(errData?.error?.message || `Groq HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if(text) return text;
      lastErr = new Error('Phản hồi Groq không hợp lệ');
    }catch(err){
      lastErr = err;
    }
  }
  throw lastErr || new Error('Không có phản hồi từ Groq');
}

buildChatWidget();
