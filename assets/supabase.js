/* ============================================================
 * assets/supabase.js — ตัวเชื่อม Supabase กลาง (ใช้ทุกหน้า)
 * ------------------------------------------------------------
 * แก้ URL / KEY ที่นี่ "ที่เดียว" → มีผลทุกหน้าในเว็บ
 * ต้องโหลด supabase-js (CDN) "ก่อน" ไฟล์นี้:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="../assets/supabase.js"></script>
 *
 * ⚠️ ใช้ publishable/anon key เท่านั้น (public — ป้องกันด้วย RLS)
 *    ห้ามใส่ service_role ที่นี่เด็ดขาด (หน้าเว็บ = ทุกคนเห็น)
 * ============================================================ */
window.SB_URL = "https://abihhdjcrbvwlkzwvjio.supabase.co";
window.SB_KEY = "sb_publishable_HWWGJ1WDS9XPp_MIwwWEBg_pUkws5wu";  // publishable key

window.sb = window.supabase.createClient(window.SB_URL, window.SB_KEY);
