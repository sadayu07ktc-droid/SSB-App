# SSB-App — หน้าเว็บบ้านใหม่ (SSB Smart Supply)

repo เดียว รวมทุกหน้า → GitHub Pages URL เดียว → LIFF เดียว
อ่านข้อมูลจาก **Supabase ตรง** (ไม่ผ่าน GAS)

## โครงสร้าง

```
SSB-App/
├─ index.html            เมนูหลัก / landing
├─ assets/               ของกลาง (แก้ที่เดียว มีผลทุกหน้า)
│   ├─ supabase.js       ตัวเชื่อม Supabase + key (publishable)
│   ├─ theme.css         ธีม/สี/คอมโพเนนต์กลาง
│   └─ auth.js           LIFF init + uid/role
├─ chart/
│   └─ dtc-summary.html  ชาร์ตสรุป DTC (อ่าน Supabase ตรง)
├─ driver/               หน้าคนขับรถ: order / jobstatus / history
├─ owner/                หน้าเจ้าของสวน
├─ team/                 หน้าทีมตัด
├─ ramp/                 หน้าลานเท: daily.html (ฟอร์มลานปาล์ม)
└─ admin/                หน้าแอดมิน
```

## 5 Roles (ตรงกับ CFG.ROLE ในระบบ)

| Role | โฟลเดอร์ | คือ |
|------|---------|-----|
| Owner  | `owner/`  | เจ้าของสวน |
| Team   | `team/`   | ทีมตัด |
| Ramp   | `ramp/`   | ลานเท |
| Driver | `driver/` | คนขับรถ |
| Admin  | `admin/`  | แอดมิน |

## หลักการ path ตาม role

```
https://<user>.github.io/SSB-App/driver/order.html
https://<user>.github.io/SSB-App/driver/history.html
https://<user>.github.io/SSB-App/chart/dtc-summary.html
```

- ทุกหน้าอ้าง assets กลางด้วย path สัมพัทธ์ `../assets/...`
- key/ธีม/auth แก้ที่ `assets/` ที่เดียว

## Deploy (GitHub Pages)

1. สร้าง repo ใหม่ชื่อ `SSB-App` (public)
2. push โฟลเดอร์นี้ทั้งหมดขึ้นไป
3. Settings → Pages → Source = `main` / root → Save
4. ได้ URL: `https://<user>.github.io/SSB-App/`

## LIFF (ตัวเดียวเสิร์ฟทั้งเว็บ)

1. LINE Developers → LIFF → Add
2. Endpoint URL = `https://<user>.github.io/SSB-App/`
3. Size = Full
4. Rich menu ปุ่มต่าง ๆ เปิด path:
   ```
   https://liff.line.me/<LIFF_ID>/driver/order.html
   https://liff.line.me/<LIFF_ID>/chart/dtc-summary.html
   ```
   → LIFF เอา path ต่อท้ายไปเปิดที่ endpoint อัตโนมัติ

## เพิ่มหน้าใหม่

1. สร้างไฟล์ใน role folder เช่น `driver/history.html`
2. หัวไฟล์ใส่:
   ```html
   <link rel="stylesheet" href="../assets/theme.css" />
   ...
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="../assets/supabase.js"></script>
   ```
3. ใช้ `sb.rpc(...)` หรือ `sb.from(...)` อ่านข้อมูล (ผ่าน RPC/view ที่เปิด anon)

## ความปลอดภัย

- หน้าเว็บใช้ **publishable key** (public) — ป้องกันด้วย RLS
- อ่านได้เฉพาะ **RPC/view ที่เปิดให้ anon** (คืนยอดสรุป ไม่มี PII)
- ตารางดิบล็อก 100% (ต้อง service_role = เฉพาะ backend)
