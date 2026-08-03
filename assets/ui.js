/* ============================================================
 * assets/ui.js — Toast + Modal กลาง (แทน alert/confirm/prompt เดิมที่ดูโบราณ)
 * ------------------------------------------------------------
 * ใช้ร่วมทุกหน้า SSB-App · เข้าธีม theme.css (--palm/--leaf/--oil/--danger)
 *   <script src="../assets/ui.js"></script>
 *   toast('บันทึกแล้ว')                       // เดาสีจากข้อความ (✅/❌/⚠️)
 *   toast('❌ ...', 'error')                   // ระบุชนิดเอง
 *   const ok = await confirmModal({title, msg, okText, cancelText, icon, danger})
 *   const txt = await promptModal({title, placeholder, okText})   // คืน null ถ้ายกเลิก
 * ============================================================ */
(function () {
  function ensure() {
    if (!document.getElementById('ssbToastWrap')) {
      var w = document.createElement('div'); w.id = 'ssbToastWrap'; document.body.appendChild(w);
    }
    if (!document.getElementById('ssbModal')) {
      var m = document.createElement('div'); m.id = 'ssbModal'; document.body.appendChild(m);
    }
  }
  function ttype(m) {
    m = String(m || '');
    if (/❌|ไม่สำเร็จ|ผิดพลาด|ผิดปกติ|ไม่ได้|error/i.test(m)) return 'error';
    if (/✅|เรียบร้อย|สำเร็จ|แล้ว/.test(m)) return 'ok';
    if (/⚠️|⏳|📡|กรุณา|ห้าม|รอ/.test(m)) return 'warn';
    return 'info';
  }
  function kill(el) { if (!el || el._k) return; el._k = 1; el.classList.add('out'); setTimeout(function () { el.remove(); }, 200); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function closeModal() { var m = document.getElementById('ssbModal'); if (m) { m.classList.remove('show'); m.innerHTML = ''; } }

  window.toast = function (msg, type, ms) {
    ensure(); msg = String(msg == null ? '' : msg); type = type || ttype(msg);
    var wrap = document.getElementById('ssbToastWrap');
    var ic = ({ ok: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' })[type] || 'ℹ️';
    var clean = msg.replace(/^\s*(✅|❌|⚠️|ℹ️|📤|📡|⏳|📍|📊|📋|🚚)\s*/, '').trim() || msg;
    var el = document.createElement('div'); el.className = 'ssb-toast ' + type;
    el.innerHTML = '<span class="ti"></span><span class="tx"></span>';
    el.querySelector('.ti').textContent = ic; el.querySelector('.tx').textContent = clean;
    el.onclick = function () { kill(el); }; wrap.appendChild(el);
    setTimeout(function () { kill(el); }, ms || (type === 'error' ? 4200 : type === 'warn' ? 3200 : 2600));
  };

  window.confirmModal = function (opt) {
    opt = opt || {}; ensure();
    return new Promise(function (res) {
      var m = document.getElementById('ssbModal');
      m.innerHTML =
        '<div class="ssb-mcard"><div class="ssb-mtop">'
        + '<div class="ssb-mic">' + esc(opt.icon || '❓') + '</div>'
        + '<div class="ssb-mtitle">' + esc(opt.title || 'ยืนยัน') + '</div>'
        + (opt.msg ? '<div class="ssb-mmsg">' + esc(opt.msg) + '</div>' : '')
        + '</div><div class="ssb-mbtns">'
        + '<button class="ssb-cancel" id="_mc">' + esc(opt.cancelText || 'ยกเลิก') + '</button>'
        + '<button class="ssb-ok ' + (opt.danger ? 'danger' : '') + '" id="_mo">' + esc(opt.okText || 'ตกลง') + '</button>'
        + '</div></div>';
      m.classList.add('show');
      m.querySelector('#_mc').onclick = function () { closeModal(); res(false); };
      m.querySelector('#_mo').onclick = function () { closeModal(); res(true); };
    });
  };

  window.promptModal = function (opt) {
    opt = opt || {}; ensure();
    return new Promise(function (res) {
      var m = document.getElementById('ssbModal');
      m.innerHTML =
        '<div class="ssb-mcard"><div class="ssb-mtop">'
        + '<div class="ssb-mic">' + esc(opt.icon || '📝') + '</div>'
        + '<div class="ssb-mtitle">' + esc(opt.title || '') + '</div>'
        + (opt.msg ? '<div class="ssb-mmsg">' + esc(opt.msg) + '</div>' : '')
        + '</div><div class="ssb-mbody"><textarea id="_mt" placeholder="' + esc(opt.placeholder || '') + '"></textarea></div>'
        + '<div class="ssb-mbtns">'
        + '<button class="ssb-cancel" id="_mc">' + esc(opt.cancelText || 'ยกเลิก') + '</button>'
        + '<button class="ssb-ok" id="_mo">' + esc(opt.okText || 'ส่ง') + '</button>'
        + '</div></div>';
      m.classList.add('show');
      var ta = m.querySelector('#_mt'); setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
      m.querySelector('#_mc').onclick = function () { closeModal(); res(null); };
      m.querySelector('#_mo').onclick = function () { var v = ta.value; closeModal(); res(v); };
    });
  };
})();
