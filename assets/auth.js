/* ============================================================
 * assets/auth.js — ตัวตนผู้ใช้กลาง (LIFF + role) ใช้ร่วมทุกหน้า
 * ------------------------------------------------------------
 * เรียก: const me = await ssbAuth(LIFF_ID);   // { uid, name }
 *   • เปิดใน LINE (LIFF) → ดึง uid/ชื่อ จาก LINE profile จริง
 *   • เปิดนอก LINE / เทส → fallback ?uid=&name= จาก URL
 * ต้องโหลด LIFF SDK ก่อน ถ้าจะใช้ LIFF:
 *   <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
 * ============================================================ */
async function ssbAuth(liffId) {
  const q = new URLSearchParams(location.search);
  let uid = q.get('uid') || '', name = q.get('name') || '';
  try {
    if (liffId && window.liff) {
      await liff.init({ liffId });
      if (liff.isLoggedIn()) {
        const p = await liff.getProfile();
        uid = p.userId; name = p.displayName;
      }
    }
  } catch (e) { console.warn('[ssbAuth] LIFF init:', e); }
  window.SSB_UID = uid;
  window.SSB_NAME = name;
  return { uid, name };
}

/* หา role ของ uid จาก line_hook (ผ่าน RPC ปลอดภัย — ทำภายหลังถ้าต้องการคุมสิทธิ์)
   ตอนนี้ role คุมที่ rich menu (LINE) + RLS (ฝั่งข้อมูล) อยู่แล้ว */
