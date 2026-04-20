/**
 * Application Changelog / Patch Notes
 * แสดงประวัติการอัปเดตและแก้บั๊กให้ผู้ใช้เห็น
 */

export const CHANGELOG = [
    {
        version: '2.1.4',
        date: '2026-02-25',
        title: 'ปรับปรุง Layout บนมือถือให้สมดุลและแก้ไข Skeleton Component',
        changes: [
            { type: 'fix', text: '📱 แก้ไขสัดส่วน Stats Grid บนมือถือให้สมดุล (2x2 + 1 card)' },
            { type: 'fix', text: '• เปลี่ยนจาก 3 คอลัมน์เป็น 2 คอลัมน์บนหน้าจอ < 768px' },
            { type: 'fix', text: '• แก้ไข DashboardSkeleton ให้ใช้ responsive CSS เดียวกับจริง' },
            { type: 'fix', text: '• แก้ไข Dashboard Grid Skeleton จาก 2 คอลัมน์เป็น 1 คอลัมน์ตาม layout จริง' },
            { type: 'improve', text: '• เพิ่ม gap ที่เหมาะสมสำหรับแต่ละขนาดหน้าจอ' },
            { type: 'note', text: '📝 แก้ไขปัญหา layout ไม่สมดุจบนมือถือที่ผู้ใช้รายงาน' },
            // ─────────────────────────────────────────────
            // DatePicker Dropdown Fix (2026-04-20)
            // ─────────────────────────────────────────────
            { type: 'fix', text: '📅 แก้ปัญหา DatePicker Dropdown ในหน้า "ส่งออกข้อมูล" ถูกตัดหายไปบางส่วน (คลิกแล้วมองไม่เห็นปฏิทิน)' },
            { type: 'fix', text: '• ย้าย Dropdown ไป render ที่ document.body ผ่าน React Portal เพื่อหลุดจาก stacking context ของ .card (backdrop-filter) และ overflow ของ .main-content' },
            { type: 'improve', text: '• เปลี่ยนมาใช้ position: fixed + คำนวณตำแหน่งจาก getBoundingClientRect() ของ trigger' },
            { type: 'improve', text: '• เพิ่ม Auto-flip: พลิกขึ้นบนอัตโนมัติเมื่อ Dropdown ชนขอบล่าง, จัดชิดขวาเมื่อชนขอบขวาของ viewport' },
            { type: 'improve', text: '• อัปเดตตำแหน่ง Dropdown อัตโนมัติเมื่อ resize / scroll (รองรับ nested scroll ด้วย capture-phase listener)' },
            { type: 'improve', text: '• ปรับปรุง click-outside ให้ detect ได้ทั้ง wrapper และ dropdown ใน portal' },
            { type: 'note', text: '📝 ส่งผลกับทุกหน้าที่ใช้ DatePicker (Export, Expiring Licenses, Excel Tables ฯลฯ)' }
        ]
    },
    {
        version: '2.1.3',
        date: '2026-02-25',
        title: 'แก้ไขปัญหาการแสดงผลข้อมูลบน Vercel',
        changes: [
            { type: 'fix', text: '🔧 แก้ปัญหา UI แสดงข้อมูลที่ลบแล้วกลับมาบน Vercel (Hard Refresh Issue)' },
            { type: 'fix', text: '• ปิด Auto-refresh ชั่วคราวเพื่อป้องกันการ fetch ซ้ำที่ไม่จำเป็น' },
            { type: 'fix', text: '• เพิ่ม SWR cache invalidation อย่างรุนแรงหลังการ CRUD operations' },
            { type: 'fix', text: '• เพิ่ม cache-busting (timestamp + no-store) ในการ fetch ข้อมูลร้านค้า' },
            { type: 'fix', text: '• เพิ่ม conditional logic ใน Realtime hooks ข้าม INSERT events' },
            { type: 'fix', text: '• ปรับปรุง optimistic delete พร้อม delayed refresh 100ms' },
            { type: 'improve', text: '• ทำให้การลบ/แก้ไข/สร้างข้อมูลทำงานเหมือนหน้า licenses ที่ไม่มีปัญหา' },
            { type: 'improve', text: '• แก้ไขปัญหา race condition ระหว่าง optimistic update และ server response' },
            { type: 'improve', text: '• เพิ่ม error handling และ retry logic สำหรับ network failures' },
            { type: 'improve', text: '• ปรับปรุง loading states และ user feedback ระหว่าง operations' },
            { type: 'note', text: '📝 ปัญหานี้เกิดเฉพาะบน Vercel Production เนื่องจาก Edge Caching ไม่มีปัญหาบน Local' },
            { type: 'note', text: '🔍 พบปัญหาจากผู้ใช้รายงานว่าข้อมูลที่ลบไปแล้วยังคงแสดงผลหลัง refresh' }
        ]
    },
    {
        version: '2.1.1',
        date: '2026-02-19',
        title: 'อัปเดตปรับปรุงระบบและแก้ไขปัญหา',
        changes: [
            { type: 'fix', text: '🔧 แก้ไขปัญหาการ revert commit และอัปเดต patch notes' },
            { type: 'improve', text: '• ปรับปรุงความเสถียรของระบบหลังการ revert' },
            { type: 'improve', text: '• อัปเดต changelog ให้เป็นปัจจุบัน' }
        ]
    },
    {
        version: '2.1.0',
        date: '2026-02-18',
        title: 'ระบบบริหารจัดการใบอนุญาตร้านค้า — รวมทุกฟีเจอร์ & คุณสมบัติระบบ',
        changes: [
            // ═══════════════════════════════════════════
            // ภาพรวมระบบ (System Overview)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '🎉 ระบบบริหารจัดการข้อมูลร้านค้าและใบอนุญาต (Shop License Management System) สำหรับเทศบาลนางรอง' },
            { type: 'feature', text: '• สร้างด้วย Next.js 14 App Router + Neon PostgreSQL (Serverless) + iron-session Authentication' },
            { type: 'improve', text: '🎨 UX/UI Design: ธีม Orange-Gold ทันสมัย, Responsive ทุกอุปกรณ์ (Mobile / Tablet / Desktop)' },
            { type: 'improve', text: '• ฟอนต์ Inter + Noto Sans Thai ผ่าน next/font/google — Zero CLS, Preload' },
            { type: 'improve', text: '• Vanilla CSS Styling (ไม่ใช้ Tailwind) พร้อม CSS Variables สำหรับธีม' },

            // ═══════════════════════════════════════════
            // Real-time Data Sync System (New!)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '⚡ Real-time Data Sync: อัปเดตข้อมูลอัตโนมัติทุก 30 วินาที โดยไม่ต้องรีเฟรชหน้าจอ (F5)' },
            { type: 'feature', text: '• Cross-tab Synchronization: เปลี่ยนข้อมูลในแท็บหนึ่ง อีกแท็บจะอัปเดตทันทีผ่าน BroadcastChannel' },
            { type: 'feature', text: '• Focus Refetching: ดึงข้อมูลใหม่ทันทีเมื่อผู้ใช้กลับมาที่แท็บ (Window Focus)' },
            { type: 'feature', text: '• Visibility Pausing: หยุด Polling เมื่อพับหน้าจอหรือซ่อนแท็บ เพื่อประหยัดทรัพยากร' },
            { type: 'feature', text: '• รองรับทุกหน้าหลัก: Dashboard, Users, Licenses, Shops, License Types, Settings' },
            { type: 'fix', text: '🐛 Fix Build Error: แก้ไข Temporal Dead Zone (TDZ) ใน ReferenceError ของ useAutoRefresh' },

            // ═══════════════════════════════════════════
            // หน้า Login & Authentication
            // ═══════════════════════════════════════════
            { type: 'feature', text: '🔐 หน้า Login: ออกแบบใหม่ทั้งหมดพร้อม LoginCard, LoginForm, LoginSlider Animation' },
            { type: 'feature', text: '• Feature Tags แสดงจุดเด่นของระบบ, WaveDivider ตกแต่ง, InputGroup Component' },
            { type: 'feature', text: '• Success Exit Animation เมื่อ Login สำเร็จก่อนเปลี่ยนหน้า' },
            { type: 'security', text: '🔒 Authentication: iron-session cookie-based, bcrypt password hashing (bcryptjs)' },
            { type: 'security', text: '• Session อายุ 30 นาที, HTTP-only Secure Cookies, Auto-redirect เมื่อหมดอายุ' },

            // ═══════════════════════════════════════════
            // Dashboard Layout & Sidebar
            // ═══════════════════════════════════════════
            { type: 'feature', text: '📐 Dashboard Layout: Sidebar + Header + Content Area พร้อม Responsive Toggle' },
            { type: 'feature', text: '• Sidebar: เมนูหลัก (แดชบอร์ด, ใบอนุญาตใกล้หมดอายุ, ร้านค้า, ใบอนุญาต)' },
            { type: 'feature', text: '• Sidebar: จัดการระบบ (ผู้ใช้งาน, ประเภทใบอนุญาต, ประวัติกิจกรรม) — Admin only' },
            { type: 'feature', text: '• Sidebar: รายงาน (ส่งออกข้อมูล), ช่วยเหลือ (ประกาศและอัปเดต / Patch Notes)' },
            { type: 'feature', text: '• Header: แสดง VersionBadge, วันที่-เวลาปัจจุบัน (อัปเดตทุกนาที), ปุ่มเปิด/ปิด Sidebar' },
            { type: 'feature', text: '• Footer: แสดงข้อมูลผู้ใช้ (Avatar, ชื่อ, บทบาท), ปุ่ม Logout' },
            { type: 'feature', text: '• Badge แจ้งเตือนจำนวนใบอนุญาตใกล้หมดอายุ ที่เมนู Sidebar แบบ Real-time' },

            // ═══════════════════════════════════════════
            // Dashboard (หน้าแรก)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '📊 Dashboard ภาพรวม: 5 Stat Cards — ร้านค้าทั้งหมด, ใบอนุญาตทั้งหมด, ใช้งาน, ใกล้หมดอายุ, หมดอายุแล้ว' },
            { type: 'feature', text: '• ส่วน "ต้องดำเนินการ": ตารางใบอนุญาตที่ใกล้หมดอายุ พร้อมลิงก์ไปหน้ารายละเอียด' },
            { type: 'feature', text: '• ส่วน "สรุปตามประเภท": แสดง Breakdown จำนวนใบอนุญาตแยกตามประเภท (ใช้งาน/ใกล้หมด/หมดอายุ)' },
            { type: 'feature', text: '• Parallel Data Fetching: โหลด Auth + Stats + Breakdown + Expiring พร้อมกัน' },
            { type: 'improve', text: '• DashboardSkeleton: แสดง Skeleton Loading ขณะโหลดข้อมูลแทนหน้าว่าง' },

            // ═══════════════════════════════════════════
            // จัดการร้านค้า (Shops)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '🏪 จัดการร้านค้า: ตาราง Excel-like แก้ไข Inline ได้เลย (ชื่อร้าน, เจ้าของ, เบอร์โทร, ที่อยู่, อีเมล, หมายเหตุ)' },
            { type: 'feature', text: '• Right-click Context Menu: แก้ไข, ลบ, ดูรายละเอียด, เพิ่มแถว, เพิ่มคอลัมน์' },
            { type: 'feature', text: '• ค้นหา (Debounced): ชื่อร้าน, เจ้าของ, เบอร์โทร, ที่อยู่, อีเมล' },
            { type: 'feature', text: '• Pagination: เลือกจำนวนต่อหน้า, กระโดดไปหน้าที่ต้องการ, แสดงข้อมูลรวม' },
            { type: 'feature', text: '• QuickAddModal: สร้างร้านค้าใหม่แบบด่วน พร้อมตัวเลือกสร้างใบอนุญาตพร้อมกัน' },
            { type: 'feature', text: '• ShopDetailModal: ดูรายละเอียดร้านค้าแบบ Modal พร้อมรายการใบอนุญาตที่เกี่ยวข้อง' },
            { type: 'feature', text: '• Export ร้านค้าเป็น PDF พร้อมหัวกระดาษตราครุฑ (pdfmake)' },
            { type: 'feature', text: '• เพิ่ม/แก้ไข/ลบคอลัมน์ Custom Fields จากหน้าตาราง, แก้ชื่อหัวคอลัมน์ (Editable Header)' },
            { type: 'feature', text: '• รองรับ Custom Fields: เพิ่มฟิลด์ข้อมูลเฉพาะร้านค้าได้ไม่จำกัด แสดงผลใน Table และ Export' },
            { type: 'improve', text: '• SWR Dropdown Cache: อัปเดต Cache อัตโนมัติเมื่อเพิ่ม/แก้ไข/ลบร้านค้า' },

            // ═══════════════════════════════════════════
            // จัดการใบอนุญาต (Licenses)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '📄 จัดการใบอนุญาต: ตาราง Excel-like พร้อม Inline Editing และ Custom Fields' },
            { type: 'feature', text: '• คอลัมน์: ร้านค้า (Dropdown), ประเภท (Dropdown), เลขที่, วันออก, วันหมดอายุ, สถานะ, หมายเหตุ' },
            { type: 'feature', text: '• กรองข้อมูล: ประเภทใบอนุญาต, สถานะ (ปกติ/หมดอายุ/กำลังดำเนินการ/ถูกพักใช้/ถูกเพิกถอน), ร้านค้า' },
            { type: 'feature', text: '• ค้นหา (Debounced) และ Pagination พร้อมข้อมูลสรุป' },
            { type: 'feature', text: '• QuickAddModal: เพิ่มใบอนุญาตด่วนพร้อม Dropdown ร้านค้า/ประเภท + Custom Fields' },
            { type: 'feature', text: '• สร้างร้านค้าใหม่ได้จากหน้าใบอนุญาต (Quick Add Shop)' },
            { type: 'feature', text: '• เพิ่มคอลัมน์ Custom Fields จากหน้าตาราง (Dynamic Column Add)' },
            { type: 'feature', text: '• Export ใบอนุญาตเป็น PDF พร้อม Custom Fields' },

            // ═══════════════════════════════════════════
            // ใบอนุญาตใกล้หมดอายุ (Expiring Licenses)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '⏰ ใบอนุญาตใกล้หมดอายุ: 4 Stat Cards คลิกกรองได้ — หมดอายุแล้ว / ≤7 วัน / 8-14 วัน / >14 วัน' },
            { type: 'feature', text: '• Badge สีตามระดับความเร่งด่วน: แดง (หมดอายุ), ส้ม (วิกฤต), เหลือง (เตือน), น้ำเงิน (ปกติ)' },
            { type: 'feature', text: '• กรองตามประเภทใบอนุญาต, ช่วงวันที่หมดอายุ (DatePicker), ค้นหาอิสระ' },
            { type: 'feature', text: '• เรียงลำดับ: วันหมดอายุ (ใกล้-ไกล / ไกล-ใกล้), ชื่อร้าน (ก-ฮ / ฮ-ก)' },
            { type: 'feature', text: '• ปุ่ม "ล้างที่หมดอายุ": ลบใบอนุญาตหมดอายุทั้งหมดในครั้งเดียว (พร้อมยืนยัน)' },
            { type: 'feature', text: '• ลบรายการเดี่ยวแบบ Optimistic Delete พร้อมตัวเลือก Undo (Pending Delete)' },
            { type: 'feature', text: '• StatusFilterBadges: คลิก Badge เพื่อ Toggle กรอง, รีเซ็ตตัวกรองทั้งหมด' },
            { type: 'feature', text: '• Pagination พร้อม Page Jump และ Items Per Page' },

            // ═══════════════════════════════════════════
            // ประเภทใบอนุญาต (License Types)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '🏷️ จัดการประเภทใบอนุญาต: ตาราง Excel-like พร้อม Inline Editing + Custom Fields' },
            { type: 'feature', text: '• คอลัมน์: ชื่อ, คำอธิบาย, อายุใบอนุญาต (วัน), จำนวนใบอนุญาตที่ใช้งาน' },
            { type: 'feature', text: '• Parallel Data Fetching: โหลด Types + Custom Fields + Custom Values พร้อมกัน' },
            { type: 'feature', text: '• ป้องกันลบประเภทที่มีใบอนุญาตผูกอยู่ (Referential Integrity Check)' },
            { type: 'feature', text: '• Custom Fields Values: บันทึกค่า Custom Fields แยกตาม Entity ID' },

            // ═══════════════════════════════════════════
            // จัดการผู้ใช้งาน (Users) — Admin Only
            // ═══════════════════════════════════════════
            { type: 'feature', text: '👥 จัดการผู้ใช้งาน (Admin only): ตาราง Excel-like สร้าง/แก้ไข/ลบผู้ใช้' },
            { type: 'feature', text: '• คอลัมน์: ชื่อผู้ใช้, ชื่อ-นามสกุล, บทบาท (Admin/User), วันที่สร้าง' },
            { type: 'feature', text: '• สร้างผู้ใช้ใหม่ผ่าน Modal Form พร้อม Validation (รหัสผ่านขั้นต่ำ 6 ตัวอักษร, ยืนยันรหัสผ่าน)' },
            { type: 'feature', text: '• แก้ไขข้อมูลผ่าน Modal (ชื่อ, บทบาท, รีเซ็ตรหัสผ่าน)' },
            { type: 'feature', text: '• ลบผู้ใช้แบบ Optimistic Delete + Pending Delete (Undo ภายใน 5 วินาที)' },
            { type: 'feature', text: '• Export User Credentials เป็น PDF หลังสร้างผู้ใช้ใหม่ (เอกสารแจ้งรหัสผ่าน)' },
            { type: 'feature', text: '• Stat Cards: จำนวนผู้ใช้ทั้งหมด, Admin, User' },

            // ═══════════════════════════════════════════
            // ส่งออกข้อมูล (Export)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '🖨️ ส่งออกข้อมูล: เลือก Export ร้านค้า, ใบอนุญาต, หรือผู้ใช้งาน เป็น CSV หรือ PDF' },
            { type: 'feature', text: '• เลือกรูปแบบไฟล์: CSV (สำหรับ Excel) หรือ PDF (รายงานทางการ)' },
            { type: 'feature', text: '• ปรับแต่งคอลัมน์: เลือกแสดง/ซ่อน Custom Fields ใน Export (Chip Toggle UI)' },
            { type: 'feature', text: '• ตัวกรองใบอนุญาต: ค้นหา, ร้านค้า (Searchable Dropdown), ประเภท, สถานะ, ช่วงวันหมดอายุ' },
            { type: 'feature', text: '• Preview ข้อมูลก่อน Export: แสดงตัวอย่าง 50 รายการแรกใน Modal พร้อมจำนวนทั้งหมด' },
            { type: 'feature', text: '• PDF: หัวกระดาษตราครุฑ + ที่อยู่เทศบาล, ฟอนต์ TH Sarabun New (pdfmake)' },
            { type: 'feature', text: '• CSV: รองรับภาษาไทย, BOM Header สำหรับ Excel' },
            { type: 'feature', text: '• Loading State พร้อม SweetAlert2 Progress ขณะสร้าง PDF' },

            // ═══════════════════════════════════════════
            // ประวัติกิจกรรม (Activity Logs) — Admin Only
            // ═══════════════════════════════════════════
            { type: 'feature', text: '📋 ประวัติกิจกรรม (Admin only): ติดตามทุกการกระทำ — LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW, EXPORT' },
            { type: 'feature', text: '• 4 Stat Cards: กิจกรรมวันนี้, 7 วันล่าสุด, ผู้ใช้วันนี้, ล็อกอินวันนี้' },
            { type: 'feature', text: '• Tab "รายการกิจกรรม": ตารางแสดงเวลา, ผู้ใช้, การกระทำ (Badge สี), ประเภท, รายละเอียด, IP/อุปกรณ์' },
            { type: 'feature', text: '• Tab "สรุปภาพรวม": Action Breakdown + Entity Breakdown (แยกตามประเภทข้อมูล)' },
            { type: 'feature', text: '• Tab "IP Address": แสดง IP ที่เข้าใช้งานบ่อย 7 วันล่าสุด พร้อมจำนวนครั้ง' },
            { type: 'feature', text: '• Entity Types: AUTH, USER, SHOP, LICENSE, LICENSE_TYPE, CUSTOM_FIELD, ENTITY' },
            { type: 'feature', text: '• Device Detection: แสดงประเภทอุปกรณ์ (Mobile/Desktop) + Browser' },
            { type: 'feature', text: '• ปุ่ม "ล้างข้อมูล": ลบ Activity Logs ทั้งหมด (พร้อมยืนยัน)' },
            { type: 'feature', text: '• Pagination: เลือก Items Per Page, Page Jump, แสดงจำนวนรวม' },

            // ═══════════════════════════════════════════
            // Custom Fields System
            // ═══════════════════════════════════════════
            { type: 'feature', text: '⚙️ Custom Fields: สร้างฟิลด์กำหนดเองสำหรับ shops, licenses, license_types, users' },
            { type: 'feature', text: '• รองรับ 6 ประเภท: Text, Number, Date, Select (Dropdown), Checkbox, Textarea' },
            { type: 'feature', text: '• ตั้งค่าต่อฟิลด์: Required, แสดง/ซ่อนในตาราง, แสดง/ซ่อนในฟอร์ม, ลำดับการแสดงผล (Display Order)' },
            { type: 'feature', text: '• Validation: ชื่อ Field ต้องเป็น a-z, 0-9, _ เท่านั้น, ตรวจสอบชื่อซ้ำ, ต้องมี Options สำหรับ Select' },
            { type: 'feature', text: '• Custom Field Values: บันทึกค่าแยก Entity Type + Entity ID (API /api/custom-field-values)' },
            { type: 'feature', text: '• แสดงคอลัมน์ Custom Fields ในตาราง Excel-like ทุกหน้า (Merge กับ Standard Columns)' },
            { type: 'feature', text: '• CRUD ผ่าน Settings > Custom Fields (สร้าง/แก้ไข/ลบ) พร้อม SweetAlert2 Confirmation' },

            // ═══════════════════════════════════════════
            // Dynamic Entities System
            // ═══════════════════════════════════════════
            { type: 'feature', text: '🧩 Dynamic Entities: สร้างชุดข้อมูลใหม่ได้ไม่จำกัด พร้อมกำหนด Fields เอง' },
            { type: 'feature', text: '• Entity Management: สร้าง Entity (slug, label, icon, description, display_order, is_active)' },
            { type: 'feature', text: '• Entity Fields: กำหนดคอลัมน์ (field_name, field_label, field_type, options, required, unique, show_in_list/form)' },
            { type: 'feature', text: '• Entity Records: CRUD ข้อมูลผ่าน Dynamic Data Page (/dashboard/data/[entity])' },
            { type: 'feature', text: '• รองรับ Field Types: text, number, date, select, checkbox, textarea + Default Values' },
            { type: 'feature', text: '• API: /api/entities, /api/entity-fields, /api/entity-records' },

            // ═══════════════════════════════════════════
            // ExcelTable Component System
            // ═══════════════════════════════════════════
            { type: 'improve', text: '📊 ExcelTable Component: ตาราง Excel-like ใช้ร่วมกันทุกหน้า (shops, licenses, license-types, users)' },
            { type: 'improve', text: '• Inline Editing: คลิก 2 ครั้งที่เซลล์เพื่อแก้ไข (EditableCell Component)' },
            { type: 'improve', text: '• Right-click Context Menu: แก้ไข, ลบ, ดูรายละเอียด, เพิ่มแถว, เพิ่มคอลัมน์ (TableContextMenu)' },
            { type: 'improve', text: '• Editable Headers: คลิก 2 ครั้งที่หัวคอลัมน์เพื่อเปลี่ยนชื่อ (EditableHeader Component)' },
            { type: 'improve', text: '• Column Resize, Sorting, Filter Row, Toolbar (Export/Add)' },
            { type: 'improve', text: '• TableHooks: Logic แยกจาก UI, TableRow: Rendering แยกเป็น Component ย่อย' },
            { type: 'improve', text: '• รองรับ Dropdown, Date, Status Badge ในเซลล์ (CustomSelect, DatePicker, StatusBadge)' },

            // ═══════════════════════════════════════════
            // UI Components Library
            // ═══════════════════════════════════════════
            { type: 'improve', text: '🧱 UI Components ที่พัฒนาเอง (ไม่พึ่ง UI Library):' },
            { type: 'improve', text: '• CustomSelect: Dropdown พร้อม Searchable, Icon, Placeholder, Custom Styling' },
            { type: 'improve', text: '• DatePicker: ตัวเลือกวันที่ พร้อม Icon และ Placeholder' },
            { type: 'improve', text: '• Pagination: Page Navigation, Items Per Page, Page Jump, Total Info' },
            { type: 'improve', text: '• Modal: Dialog Component พร้อม Overlay, Close Button, Prevent Body Scroll' },
            { type: 'improve', text: '• QuickAddModal: สร้างข้อมูลด่วน (Shop/License) พร้อม Custom Fields Support' },
            { type: 'improve', text: '• ShopDetailModal: แสดงรายละเอียดร้านค้า + ใบอนุญาตที่เกี่ยวข้อง' },
            { type: 'improve', text: '• FilterRow + SearchInput: แถวกรองข้อมูลพร้อม Responsive Grid Layout' },
            { type: 'improve', text: '• StatusBadge: แสดงสถานะพร้อมสีตาม Status (active/expired/pending/suspended/revoked)' },
            { type: 'improve', text: '• Skeleton + TableSkeleton: Loading Skeleton สำหรับ Card และ Table' },
            { type: 'improve', text: '• Loading Component: Spinner พร้อม Full Page Mode และ Custom Message' },
            { type: 'improve', text: '• VersionBadge: แสดงเวอร์ชันที่ Header, คลิกเปิด Patch Notes' },
            { type: 'improve', text: '• SweetAlert2 Custom Theme: Toast Notifications, Confirm Dialogs, Pending Delete (Undo)' },

            // ═══════════════════════════════════════════
            // SWR Data Fetching & Custom Hooks
            // ═══════════════════════════════════════════
            { type: 'improve', text: '⚡ SWR Data Fetching: Caching, Deduplication, Revalidation, Prefetch, Mutation' },
            { type: 'improve', text: '• SWR Hooks: useDashboardStats, useExpiringCount, useLicenseBreakdown, useLicenseTypes' },
            { type: 'improve', text: '• SWR Hooks: useShops, useLicenses, useLicense, useExpiringLicenses, useActivityLogs' },
            { type: 'improve', text: '• SWR Hooks: useDropdownData (Shops + License Types + Pre-formatted Options), useMutation' },
            { type: 'improve', text: '• SWR Utilities: prefetch (Hover/Pre-navigation), clearCache (Logout)' },
            { type: 'improve', text: '• SWR Config Variants: dashboard, realtime, list, static — ปรับ TTL ตามประเภทข้อมูล' },

            // ═══════════════════════════════════════════
            // Performance Optimization Hooks
            // ═══════════════════════════════════════════
            { type: 'improve', text: '🚀 Performance Hooks (useOptimized.js):' },
            { type: 'improve', text: '• useDebounce / useDebouncedCallback: ป้องกันการ fetch บ่อยเกินไป (Search Input)' },
            { type: 'improve', text: '• useThrottle: จำกัดความถี่ของการ update (Scroll/Resize)' },
            { type: 'improve', text: '• useIntersectionObserver / useOnScreen: Lazy Load เมื่อ Element อยู่ใน Viewport' },
            { type: 'improve', text: '• useLocalStorage: Persist state ลง localStorage (SSR Safe)' },
            { type: 'improve', text: '• usePrevious: Track ค่าก่อนหน้าสำหรับ Comparison' },
            { type: 'improve', text: '• useMediaQuery / useIsMobile / useIsDesktop: Responsive Design Helper' },
            { type: 'improve', text: '• useClickOutside: ตรวจจับคลิกนอก Element (ปิด Dropdown/Modal)' },
            { type: 'improve', text: '• useKeyPress: ตรวจจับการกดปุ่ม Keyboard' },
            { type: 'improve', text: '• useAsync: จัดการ Async Operations พร้อม Status/Error Handling' },
            { type: 'improve', text: '• useMemoCompare: Custom Comparison สำหรับ useMemo' },

            // ═══════════════════════════════════════════
            // Additional Hooks
            // ═══════════════════════════════════════════
            { type: 'improve', text: '🪝 Hooks อื่นๆ:' },
            { type: 'improve', text: '• usePagination: Pagination Logic (page, limit, total, setPage, setLimit, resetPage, updateFromResponse)' },
            { type: 'improve', text: '• useSchema: Dynamic Schema Management สำหรับ schema_definitions' },
            { type: 'improve', text: '• useAuthLogin: Login Authentication Logic (form state, submit, validation)' },
            { type: 'improve', text: '• useLoginSlider: Login Page Slider Animation Logic' },

            // ═══════════════════════════════════════════
            // Lazy Loading & Code Splitting
            // ═══════════════════════════════════════════
            { type: 'improve', text: '📦 Lazy Loading & Code Splitting:' },
            { type: 'improve', text: '• PatchNotesModal: โหลดเฉพาะเมื่อเปิด Modal (next/dynamic, ssr: false)' },
            { type: 'improve', text: '• Font Awesome CSS: โหลด Non-blocking เฉพาะใน Dashboard Layout' },
            { type: 'improve', text: '• PDF Export (pdfmake): โหลดเฉพาะเมื่อกดส่งออก' },

            // ═══════════════════════════════════════════
            // Security (Middleware + API)
            // ═══════════════════════════════════════════
            { type: 'security', text: '🛡️ Security Middleware (WAF Lite):' },
            { type: 'security', text: '• Anti-Bot Protection: บล็อก 20+ Scanner/Attack Tools (sqlmap, nikto, nuclei, burp, nmap ฯลฯ)' },
            { type: 'security', text: '• Payload Inspection: ตรวจจับ SQL Injection, XSS, Path Traversal, LFI (10+ Patterns)' },
            { type: 'security', text: '• Rate Limiting: General 300 req/min, Login 10 req/min, Sensitive 60 req/min' },
            { type: 'security', text: '• Security Headers: HSTS (2 ปี), CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff' },
            { type: 'security', text: '• Referrer-Policy: strict-origin-when-cross-origin' },
            { type: 'security', text: '• Permissions-Policy: ปิด camera, microphone, geolocation, payment, usb' },
            { type: 'security', text: '• Cross-Origin: COOP same-origin, CORP same-origin' },
            { type: 'security', text: '• API Security: Cache-Control no-store, Pragma no-cache, API-specific CSP' },
            { type: 'security', text: '• ลบ X-Powered-By Header เพื่อซ่อนข้อมูลเซิร์ฟเวอร์' },
            { type: 'security', text: '🔒 Application Security:' },
            { type: 'security', text: '• Parameterized Queries ป้องกัน SQL Injection ทุก API Route' },
            { type: 'security', text: '• Input Validation & Sanitization ทุก API Route' },
            { type: 'security', text: '• HTTP-only Secure Session Cookies (iron-session)' },
            { type: 'security', text: '• bcrypt Password Hashing (bcryptjs)' },
            { type: 'security', text: '• Role-based Access Control: Admin-only pages redirect ผู้ใช้ทั่วไป' },
            { type: 'security', text: '• Auth Check: ตรวจสอบสิทธิ์ทุกครั้งที่เข้า Dashboard' },

            // ═══════════════════════════════════════════
            // API Routes (Backend)
            // ═══════════════════════════════════════════
            { type: 'feature', text: '🔌 API Routes ทั้งหมด 17 เส้นทาง:' },
            { type: 'feature', text: '• /api/auth: POST Login/Logout, GET Auth Check' },
            { type: 'feature', text: '• /api/dashboard: GET Stats, License Breakdown, Expiring Count, Recent Activity' },
            { type: 'feature', text: '• /api/shops: CRUD ร้านค้า + Custom Fields + Pagination + Search' },
            { type: 'feature', text: '• /api/licenses: CRUD ใบอนุญาต + Custom Fields + Pagination + Filters' },
            { type: 'feature', text: '• /api/licenses/expiring: GET ใบอนุญาตใกล้หมดอายุ' },
            { type: 'feature', text: '• /api/license-types: CRUD ประเภทใบอนุญาต' },
            { type: 'feature', text: '• /api/users: CRUD ผู้ใช้งาน + Stats' },
            { type: 'feature', text: '• /api/profile: GET/PUT โปรไฟล์ผู้ใช้ปัจจุบัน' },
            { type: 'feature', text: '• /api/export: Export CSV/PDF (ร้านค้า, ใบอนุญาต, ผู้ใช้)' },
            { type: 'feature', text: '• /api/export-preview: Preview ข้อมูลก่อน Export' },
            { type: 'feature', text: '• /api/activity-logs: GET/DELETE Activity Logs + Stats/Breakdown/IPs' },
            { type: 'feature', text: '• /api/custom-fields: CRUD Custom Field Definitions' },
            { type: 'feature', text: '• /api/custom-field-values: POST/GET Custom Field Values' },
            { type: 'feature', text: '• /api/entities: CRUD Dynamic Entities' },
            { type: 'feature', text: '• /api/entity-fields: CRUD Entity Field Definitions' },
            { type: 'feature', text: '• /api/entity-records: CRUD Entity Records' },
            { type: 'feature', text: '• /api/cron/cleanup: Cron Job Cleanup อัตโนมัติ' },

            // ═══════════════════════════════════════════
            // SEO & Analytics
            // ═══════════════════════════════════════════
            { type: 'improve', text: '📈 SEO & Analytics:' },
            { type: 'improve', text: '• Open Graph + Twitter Card Metadata สำหรับ Social Sharing' },
            { type: 'improve', text: '• Structured Data (JSON-LD): SoftwareApplication Schema' },
            { type: 'improve', text: '• Vercel Analytics + Speed Insights: ติดตามประสิทธิภาพและการใช้งานจริง' },
            { type: 'improve', text: '• Viewport Configuration: Mobile-optimized, themeColor #D97757' },
            { type: 'improve', text: '• Performance Headers: Preconnect to Font Awesome CDN' },

            // ═══════════════════════════════════════════
            // Database & Scripts
            // ═══════════════════════════════════════════
            { type: 'feature', text: '🗄️ Database & Maintenance:' },
            { type: 'feature', text: '• Neon PostgreSQL Serverless: schema.sql V2 + Custom Fields + Dynamic Entities' },
            { type: 'feature', text: '• Scripts: seed-sample, force-reset-all, reset-db, reset-password, migrate, check-user' },
            { type: 'feature', text: '• Scripts: add-sample-custom-fields, cleanup-fields, fix-field-order, verify-db' },
            { type: 'feature', text: '• Cron Jobs: /api/cron/cleanup — ระบบ Cleanup อัตโนมัติ (ลบข้อมูลเก่า, Orphaned Records)' },

            // ═══════════════════════════════════════════
            // Patch Notes & Version System
            // ═══════════════════════════════════════════
            { type: 'feature', text: '📢 Patch Notes System:' },
            { type: 'feature', text: '• PatchNotesModal: ดูประวัติการอัปเดตผ่าน Sidebar หรือ VersionBadge ที่ Header' },
            { type: 'feature', text: '• Version Sidebar: เลือกดูแต่ละเวอร์ชัน พร้อมวันที่ (Thai Format)' },
            { type: 'feature', text: '• Change Type Badges: ฟีเจอร์หลัก (เขียว), แก้ไข (แดง), ออกแบบ (ฟ้า), ความปลอดภัย (เหลือง)' },
            { type: 'feature', text: '• Changelog Constants: getLatestVersion(), getChangelogByVersion(), getChangeTypeBadge()' }
        ]
    },
    {
        version: '2.0.0',
        date: '2026-02-10',
        title: 'ระบบบริหารจัดการใบอนุญาตและร้านค้า V2',
        changes: [
            { type: 'feature', text: '🎉 เปิดตัวระบบ V2 — ปรับปรุงใหม่ทั้งหมดจาก V1' },
            { type: 'feature', text: '• ย้ายจาก MySQL ไปเป็น Neon PostgreSQL (Serverless)' },
            { type: 'feature', text: '• ย้ายจาก Pages Router ไปเป็น App Router (Next.js 14)' },
            { type: 'feature', text: '• เพิ่มระบบ Custom Fields และ Dynamic Entities' },
            { type: 'feature', text: '• เพิ่มระบบ Activity Logs (Audit Trail)' },
            { type: 'feature', text: '• เพิ่มระบบ Export CSV/PDF พร้อม Preview' },
            { type: 'improve', text: '• ปรับปรุง UI/UX ทั้งหมด — ธีม Orange-Gold' },
            { type: 'improve', text: '• เพิ่ม SWR Data Fetching พร้อม Caching' },
            { type: 'improve', text: '• เพิ่ม Performance Hooks (Debounce, Throttle, Lazy Load)' },
            { type: 'security', text: '• เพิ่ม Security Middleware (WAF, Rate Limiting, Security Headers)' },
            { type: 'security', text: '• เพิ่ม iron-session Authentication แทน JWT' }
        ]
    }
];

/**
 * Get badge class for change type
 */
export function getChangeTypeBadge(type) {
    switch (type) {
        case 'feature': return { class: 'badge-success', label: 'ฟีเจอร์หลัก', icon: 'fas fa-star' };
        case 'fix': return { class: 'badge-danger', label: 'แก้ไข', icon: 'fas fa-tools' };
        case 'improve': return { class: 'badge-info', label: 'ออกแบบ', icon: 'fas fa-paint-brush' };
        case 'security': return { class: 'badge-warning', label: 'ความปลอดภัย', icon: 'fas fa-shield-alt' };
        default: return { class: 'badge-secondary', label: 'ข้อมูล', icon: 'fas fa-info-circle' };
    }
}

/**
 * Get latest version
 */
export function getLatestVersion() {
    return CHANGELOG[0];
}

/**
 * Get changelog by version
 */
export function getChangelogByVersion(version) {
    return CHANGELOG.find(c => c.version === version);
}
