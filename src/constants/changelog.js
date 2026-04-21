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
            { type: 'fix', text: '• แก้ปัญหา Dropdown ล้นขอบล่าง viewport (รอบแรกแก้แล้วยังเจอ) โดยเปลี่ยน auto-flip logic ให้เลือกทิศที่มี space เหลือมากกว่าเสมอ ไม่บังคับต้องมีที่พอ 420px' },
            { type: 'fix', text: '• Clamp max-height ของ Dropdown ตาม space จริงที่เหลือใน viewport + เปิด overflow-y: auto ให้ scroll ภายในได้เมื่อที่จำกัด' },
            { type: 'fix', text: '• Clamp ขอบบน/ล่าง + ปรับ width ให้ไม่ล้น viewport แม้หน้าจอเล็กมาก (เช่น laptop 13" + taskbar)' },
            { type: 'improve', text: '• ใช้ position: fixed + คำนวณตำแหน่งจาก getBoundingClientRect() ของ trigger' },
            { type: 'improve', text: '• จัดชิดขวาเมื่อ Dropdown ชนขอบขวาของ viewport' },
            { type: 'improve', text: '• อัปเดตตำแหน่ง Dropdown อัตโนมัติเมื่อ resize / scroll (รองรับ nested scroll ด้วย capture-phase listener)' },
            { type: 'improve', text: '• ปรับปรุง click-outside ให้ detect ได้ทั้ง wrapper และ dropdown ใน portal' },
            { type: 'improve', text: '• เพิ่ม scrollbar แบบบางสีส้มกลมกลืนสำหรับ Dropdown variant ใน portal' },
            { type: 'improve', text: '🔤 ปรับ font ปุ่ม "รีเซ็ต" / "ตกลง" / ปุ่มนำทางเดือนใน DatePicker ให้ใช้ฟอนต์เดียวกับระบบ (Inter + Noto Sans Thai) แทน system font default ของ <button>' },
            { type: 'note', text: '📝 ส่งผลกับทุกหน้าที่ใช้ DatePicker (Export, Expiring Licenses, Excel Tables ฯลฯ)' },
            // ─────────────────────────────────────────────
            // Licenses Page — Owner Column (2026-04-20)
            // ─────────────────────────────────────────────
            { type: 'feature', text: '👤 เพิ่มคอลัมน์ "เจ้าของร้าน" ในตารางหน้า /dashboard/licenses (ดึงจากตาราง shops อัตโนมัติตาม shop_id)' },
            { type: 'improve', text: '• คอลัมน์ใหม่วางต่อจาก "ร้านค้า" ทันที (read-only, แก้ไขได้ที่หน้าร้านค้าเท่านั้น)' },
            { type: 'improve', text: '• อัปเดต API /api/licenses (GET/POST/PUT) ให้ JOIN และ SELECT owner_name พร้อม shop_name' },
            { type: 'improve', text: '• Fallback: ถ้า API ยังไม่ส่ง owner_name กลับมา จะ lookup จาก shops dropdown cache ให้อัตโนมัติ' },
            // ─────────────────────────────────────────────
            // CSV Export Thai Date Fix (2026-04-20)
            // ─────────────────────────────────────────────
            { type: 'fix', text: '📅 แก้บั๊ก CSV Export หน้า /dashboard/export แสดงวันที่เป็น "Mon Jan 12 2026 00:00:00 GMT+0700" แทนที่จะเป็นวันที่ไทย' },
            { type: 'fix', text: '• สาเหตุ: PG driver คืน issue_date/expiry_date/created_at เป็น JS Date object → String() ให้ออกมาเป็น Date.toString() default แบบอังกฤษ' },
            { type: 'improve', text: '🇹🇭 เพิ่ม helper formatThaiDate() ใน /api/export ที่แปลงวันที่ให้เป็น พ.ศ. แบบสั้น เช่น "12 ม.ค. 2569"' },
            { type: 'improve', text: '• Mark field เป็น type: "date" ใน baseFieldsDefinitions (issue_date, expiry_date, created_at) เพื่อ dispatch การ format อัตโนมัติ' },
            { type: 'improve', text: '• ครอบคลุม custom field ที่มี field_type = date/datetime ให้แปลงเป็นวันที่ไทยใน CSV ด้วย' },
            { type: 'note', text: '📝 หัวคอลัมน์ + สถานะ + role แปลงเป็นไทยอยู่แล้วตั้งแต่เดิม (ปกติ/หมดอายุ/ถูกพักใช้/แอดมิน/ผู้ใช้ทั่วไป) — บั๊กอยู่แค่วันที่' },
            // ─────────────────────────────────────────────
            // CSV Export License Number — Excel Auto-Date Fix
            // ─────────────────────────────────────────────
            { type: 'fix', text: '🔢 แก้ปัญหา Excel แปลง "เลขที่ใบอนุญาต" เช่น "1/42" / "23/44" ให้กลายเป็น "ม.ค.-42" / "มี.ค.-44" อัตโนมัติเวลาเปิดไฟล์ CSV' },
            { type: 'fix', text: '• สาเหตุ: Excel regional Thai อ่าน pattern "เลข/เลข" แล้วตีความเป็นวันที่ (day/year) โดยไม่ถาม' },
            { type: 'improve', text: '🛡️ เพิ่ม flag preserveText ให้ field เลขที่ใบอนุญาต — wrap ค่าด้วย Excel formula syntax ="..." เพื่อบังคับให้ Excel/Google Sheets/LibreOffice treat เป็น text เสมอ' },
            { type: 'note', text: '📝 ใน Excel จะเห็น "1/42" ปกติ แต่ถ้าเปิดใน text editor (Notepad, VSCode) จะเห็น =""1/42"" — เป็นเรื่องปกติของ convention CSV สำหรับ Excel' },
            // ─────────────────────────────────────────────
            // Export PDF/CSV — Column Reordering + เจ้าของ + ลำดับที่
            // ─────────────────────────────────────────────
            { type: 'feature', text: '📊 จัดเรียงคอลัมน์รายงาน Export (PDF + CSV) ใหม่ตามลำดับ: ลำดับที่ → ชื่อเจ้าของ → ชื่อร้านค้า → ประเภทใบอนุญาต → เลขที่ใบอนุญาต → วันที่ออก → วันหมดอายุ → [custom fields] → สถานะ → หมายเหตุ' },
            { type: 'feature', text: '🔢 เพิ่มคอลัมน์ "ลำดับที่" (running number) เป็นคอลัมน์แรกของทั้ง PDF และ CSV' },
            { type: 'feature', text: '👤 เพิ่มคอลัมน์ "ชื่อเจ้าของ" ก่อน "ชื่อร้านค้า" ในรายงาน Export ใบอนุญาต (JOIN owner_name มาจากตาราง shops)' },
            { type: 'improve', text: '🎯 เพิ่ม flag afterCustom ให้ status/notes เพื่อย้ายไปท้ายสุดหลัง custom fields — custom fields จะแสดงอยู่กึ่งกลางระหว่าง base info และ status/notes' },
            { type: 'improve', text: '• อัปเดต SQL /api/export + /api/export-preview ให้ SELECT s.owner_name และ GROUP BY ด้วย' },
            { type: 'improve', text: '• Preview modal ในหน้า /dashboard/export รับ order ใหม่อัตโนมัติ (# + preCustom + custom + postCustom)' },
            { type: 'improve', text: '• PDF generator รักษา color coding ของคอลัมน์ "สถานะ" ให้ยังคงทำงานแม้ย้ายตำแหน่งแล้ว' },
            // ─────────────────────────────────────────────
            // Export Page — Quick License Type Filter
            // ─────────────────────────────────────────────
            { type: 'feature', text: '🎯 เพิ่ม dropdown "เลือกประเภทใบอนุญาต" ข้างๆ dropdown "เลือกประเภทข้อมูล" ในหน้า /dashboard/export เพื่อให้กรองก่อนส่งออกได้ง่ายขึ้น (ไม่ต้องเลื่อนลงไป Advanced Filters)' },
            { type: 'improve', text: '• แสดงเฉพาะเมื่อเลือก "ประเภทข้อมูล = ใบอนุญาต" + sync state กับ filter ใน Advanced Filters (เปลี่ยนที่ไหนก็ตรงกัน)' },
            { type: 'improve', text: '• รองรับการค้นหาใน dropdown อัตโนมัติเมื่อมีประเภทใบอนุญาตมากกว่า 8 รายการ' },
            // ─────────────────────────────────────────────
            // Export Page — Quick Month/Year Filter (expiry_date)
            // ─────────────────────────────────────────────
            { type: 'feature', text: '📅 เพิ่ม dropdown "หมดอายุเดือน" และ "หมดอายุปี (พ.ศ.)" ในตัวกรองใบอนุญาตหน้า /dashboard/export เป็นตัวกรองแยกจาก DatePicker (วันหมดอายุจาก/ถึง)' },
            { type: 'improve', text: '• เดือน: ทุกเดือน / มกราคม … ธันวาคม (1-12)' },
            { type: 'improve', text: '• ปี: ทุกปี / ปีปัจจุบัน ± 5 ปี (แสดงเป็น พ.ศ. เก็บเป็น ค.ศ. ภายใน) รองรับการค้นหา' },
            { type: 'improve', text: '• ใช้ EXTRACT(MONTH/YEAR FROM l.expiry_date) ในทั้ง /api/export และ /api/export-preview — ใช้งานร่วมกับ DatePicker ช่วงวันที่ได้ (AND)' },
            { type: 'improve', text: '• PDF Filter Info box แสดง "เดือนที่หมดอายุ: มกราคม" และ "ปีที่หมดอายุ (พ.ศ.): 2569" ให้อ่านง่าย' },
            { type: 'fix', text: '🔧 ปรับ dropdown "หมดอายุปี" ให้แสดง**เฉพาะปีที่มีอยู่จริงในฐานข้อมูล** (dynamic) ไม่ใช่ ±5 ปี hardcoded อีกต่อไป — แก้ปัญหา dropdown ยาวทะลุจอ' },
            { type: 'feature', text: '🆕 เพิ่ม API `/api/licenses/expiry-years` คืนรายการปี (ค.ศ.) + คู่ (year, month) แบบ DISTINCT จาก licenses.expiry_date เรียง DESC (ใหม่สุดก่อน)' },
            { type: 'fix', text: '🔧 ปรับ dropdown "หมดอายุเดือน" ให้แสดง**เฉพาะเดือนที่มีข้อมูลจริง**ในระบบ — ถ้าเลือกปีเฉพาะ จะกรองเหลือเฉพาะเดือนของปีนั้นอัตโนมัติ' },
            { type: 'improve', text: '• Auto-reset "หมดอายุเดือน" กลับเป็น "ทุกเดือน" อัตโนมัติ ถ้าปีใหม่ที่เลือกไม่มีเดือนที่เลือกไว้ — ป้องกัน query ค่าว่าง' },
            // ─────────────────────────────────────────────
            // Export Preview — Pagination + Bug Fixes
            // ─────────────────────────────────────────────
            { type: 'feature', text: '📄 เพิ่มระบบ Pagination ใน Modal "ดูตัวอย่างข้อมูลก่อนส่งออก" — เปลี่ยนหน้า / ข้ามหน้า / เลือกจำนวนรายการต่อหน้า (10/20/50/100) ได้เหมือนหน้าอื่นๆ' },
            { type: 'improve', text: '• `/api/export-preview` รองรับ `page` + `limit` + OFFSET ใน SQL ครบทั้ง 3 types (licenses/shops/users) — คืน `{ pagination: { page, limit, total, totalPages } }`' },
            { type: 'improve', text: '• Auto-correct เมื่อ `page` เกิน `totalPages` จาก response (เช่น filter ลดข้อมูลลง) — จะย้อนกลับหน้าสุดท้ายอัตโนมัติ' },
            { type: 'fix', text: '🐛 แก้ bug `usePagination.updateFromResponse` ที่เรียก `setState` 2 ครั้ง → รวมเป็น single setState เพื่อลด re-render' },
            { type: 'fix', text: '🐛 แก้ bug `Pagination` component: **Global keyboard listener** (Arrow Left/Right) ที่ attach บน `window` ทำให้ Pagination หลายตัวในหน้าเดียว (เช่น modal + page ข้างหลัง) ตอบ key พร้อมกัน — เพิ่ม prop `enableKeyboardNav` (default true) + skip key ถ้า target อยู่ใน dialog/modal/SweetAlert' },
            { type: 'fix', text: '🐛 แก้ dead code ใน `generatePageNumbers()` ของ `Pagination` — เงื่อนไข `else if (leftSiblingIndex > 2)` ไม่มีวันจริงเพราะซ้ำกับ `if (showLeftDots)` — เปลี่ยนเป็น `else` ปกติเพื่อให้เลขหน้าช่วงกลางแสดงถูกต้องเมื่อไม่มี ellipsis' },
            { type: 'fix', text: '🎨 ปรับความสูง/padding ของกล่อง "ค้นหา" ในตัวกรอง (licenses + shops) ให้เท่ากับ dropdown (height: 42px, padding: 0 1rem, border: 1.5px, font-size: 0.9375rem) — ก่อนหน้านี้ `SearchInput` รับ style จาก `.form-group input` (padding 0.875rem 1rem → สูงกว่า ~44-46px) ทำให้เห็นขนาดไม่เสมอกับ `CustomSelect`' },
            // ─────────────────────────────────────────────
            // Expiring Page — เพิ่มคอลัมน์ชื่อเจ้าของ
            // ─────────────────────────────────────────────
            { type: 'feature', text: '👤 เพิ่มคอลัมน์ **ชื่อเจ้าของ** ในตาราง "ใบอนุญาตใกล้หมดอายุ" หน้า /dashboard/expiring — จะเห็นชื่อเจ้าของร้านถัดจากชื่อร้านในแต่ละแถวทันที ไม่ต้องเข้าไปดูรายละเอียด' },
            { type: 'improve', text: '• `/api/licenses/expiring` เพิ่ม `s.owner_name` ใน SELECT เพื่อส่งข้อมูลให้ frontend' },
            { type: 'improve', text: '• Search box ครอบคลุม `owner_name` เพิ่มเติม (เดิมค้นได้แค่ชื่อร้าน + เลขที่ใบอนุญาต)' },
            { type: 'improve', text: '• เพิ่มตัวเลือก sort: "ชื่อเจ้าของ (ก-ฮ)" และ "ชื่อเจ้าของ (ฮ-ก)"' },
            { type: 'improve', text: '• ปรับ `skeletonColumns` + `colSpan` "ไม่พบข้อมูล" จาก 6 → 7 ให้ตรงกับจำนวนคอลัมน์ใหม่' },
            // ─────────────────────────────────────────────
            // Expiring Page — Export PDF
            // ─────────────────────────────────────────────
            { type: 'feature', text: '📄 เพิ่มปุ่ม **"ส่งออก PDF"** ในหน้า /dashboard/expiring — ส่งออกได้ทันทีตามตัวกรองปัจจุบัน (search/ประเภท/สถานะใกล้หมด/วันหมดอายุจาก-ถึง/การเรียงลำดับ)' },
            { type: 'feature', text: '🆕 เพิ่ม util `exportExpiringLicensesToPDF(licenses, filters)` ใน `@/lib/pdfExportSafe` — สร้าง PDF ภาษาไทย (THSarabunNew) พร้อม header/footer/page number เหมือน PDF อื่นๆ ในระบบ' },
            { type: 'improve', text: '• คอลัมน์ PDF: ชื่อร้านค้า / **ชื่อเจ้าของ** / ประเภท / เลขที่ใบอนุญาต / วันหมดอายุ / **คงเหลือ (วัน)** / สถานะ' },
            { type: 'improve', text: '• Summary Box ด้านบนแสดงสถิติ: ทั้งหมด / หมดอายุแล้ว / ≤ 7 วัน / 8-14 วัน / > 14 วัน' },
            { type: 'improve', text: '• คอลัมน์ "คงเหลือ" + "สถานะ" ระบายสีตามระดับความเร่งด่วน (แดง=หมดอายุ, ส้ม=≤7 วัน, เหลือง=8-14 วัน, น้ำเงิน=>14 วัน) — เห็นทันทีว่ารายการไหนควรจัดการก่อน' },
            { type: 'improve', text: '• ส่งออกจาก `filteredLicenses` ใน memory — ใช้ผลลัพธ์หลัง apply ทุก filter (รวม statusFilter ที่คำนวณจาก days_until_expiry) ไม่ต้องเรียก API ใหม่' },
            { type: 'improve', text: '• Loading state: ปุ่มเปลี่ยนเป็น spinner + "กำลังสร้าง PDF..." + Swal loading dialog ระหว่างประมวลผล' },
            // ─────────────────────────────────────────────
            // Shops + Licenses — ปรับขนาดกล่องค้นหาให้เท่ากับ dropdown
            // ─────────────────────────────────────────────
            { type: 'fix', text: '🎨 แก้ปัญหา**ขนาดกล่องค้นหาไม่เท่ากับ dropdown** ในหน้า /dashboard/licenses + /dashboard/shops — ปรับ CSS `.filter-grid input` ให้ใช้ `height: 42px` + `padding: 0 1rem` + `box-sizing: border-box` ตรงกับ `.custom-select-trigger` (เดิม `padding: 0.75rem 1rem` → สูง ~38-40px ไม่เท่ากับ dropdown 42px)' },
            { type: 'improve', text: '• Root-cause fix ที่ CSS ส่วนกลาง — ครอบคลุมทุกหน้าที่ใช้ `.filter-grid` อัตโนมัติ (licenses/shops/อื่นๆ) ไม่ต้อง inline-style ทีละหน้า' },
            { type: 'improve', text: '• ไม่กระทบ CSS `.form-group input` (ใช้ใน Modal/Form) ที่ยังต้องการ padding สูงกว่าเพื่อการอ่านง่าย' },
            // ─────────────────────────────────────────────
            // License Form — แยกร้านชื่อซ้ำด้วยเจ้าของ + เบอร์
            // ─────────────────────────────────────────────
            { type: 'feature', text: '🏪 แก้ปัญหา**ร้านชื่อซ้ำกันเลือกไม่ถูก** ใน Modal "สร้างใบอนุญาตใหม่" — dropdown ร้านค้าตอนนี้แสดง `ชื่อร้าน — เจ้าของ (เบอร์โทร)` เพื่อแยกร้านที่ชื่อเดียวกัน (เช่น 7ELEVEN หลายสาขา)' },
            { type: 'feature', text: '🔍 ปรับ search ใน dropdown ร้านค้า — ค้นเจอได้จาก**ชื่อร้าน, ชื่อเจ้าของ, หรือเบอร์โทร** ในช่องเดียว (เดิมค้นเฉพาะชื่อร้าน)' },
            { type: 'improve', text: '• `/api/dropdowns` เพิ่ม `phone` ใน SELECT shops เพื่อส่งให้ frontend ใช้ filter' },
            { type: 'improve', text: '• `useDropdownData` hook expose `shopOptionsDetailed` ใหม่ — มี `label` แบบ detailed + `searchText` ครอบคลุม + raw fields (shop_name/owner_name/phone) สำหรับ custom rendering' },
            { type: 'improve', text: '• `CustomSelect` รองรับ `opt.searchText` เพื่อให้ filter ค้นข้าม field โดยไม่ต้องเห็นใน label — general-purpose enhancement' },
            { type: 'improve', text: '• `QuickAddModal` (สร้างใบอนุญาต) ใช้ `shopOptionsDetailed` แทน `shopOptions` เดิม' },
            { type: 'improve', text: '• ในตาราง `/dashboard/licenses` — Excel dropdown ใช้ detailed labels เพื่อให้เลือกได้ถูกต้อง แต่ cell display ใช้ `shop_name` (สั้น) เพื่อไม่ให้ตารางกว้างเกินไป (column "เจ้าของร้าน" แยกอยู่แล้ว)' },
            // ─────────────────────────────────────────────
            // Shop Dropdown — เพิ่มที่อยู่ + แสดง 2 บรรทัด
            // ─────────────────────────────────────────────
            { type: 'feature', text: '🏠 เพิ่ม **ที่อยู่** ในตัวเลือกร้านค้าของ Modal "สร้างใบอนุญาตใหม่" — แสดงผลแบบ 2 บรรทัด:\n  • บรรทัด 1: ชื่อร้าน (ตัวหนา)\n  • บรรทัด 2: เจ้าของ · ที่อยู่ · เบอร์โทร (เล็ก สีเทา, truncate ถ้ายาว)' },
            { type: 'improve', text: '• `/api/dropdowns` เพิ่ม `address` ใน SELECT shops (เดิม: id/shop_name/owner_name/phone)' },
            { type: 'improve', text: '• `shopOptionsDetailed` เพิ่ม field `address` + รวมใน `searchText` → ค้นเจอจากที่อยู่ได้ด้วย (เช่น พิมพ์ "สุขุมวิท" เจอทุกสาขา)' },
            { type: 'improve', text: '• `CustomSelect` รองรับ prop `opt.optionLabel` (ReactNode) — สำหรับการแสดงผลแบบ custom JSX ใน list โดย fallback เป็น `label/name` string เหมือนเดิม (backward compatible)' },
            { type: 'improve', text: '• `QuickAddModal` สร้าง `shopOptionsWithDisplay` ที่มี `optionLabel` เป็น JSX 2 บรรทัด — trigger ยังใช้ `label` string เดิม (ไม่ล้น)' },
            // ─────────────────────────────────────────────
            // Bug Fix — Export PDF ในหน้า /dashboard/expiring ไม่ download
            // ─────────────────────────────────────────────
            { type: 'fix', text: '🐛 แก้ปัญหา**กด "ส่งออก PDF" ในหน้า `/dashboard/expiring` แล้วไม่ได้ไฟล์** (เงียบ ไม่มี error)' },
            { type: 'fix', text: '• **Root cause**: `downloadPdfBlob()` ใน `pdfExportSafe.js` ใช้ `pdfMake.getBlob(callback)` แบบ sync + callback → function return ก่อน `link.click()` จะ trigger → `await exportExpiringLicensesToPDF(...)` resolve ทันที → Swal success modal ถูกเปิดก่อน → เมื่อ callback มาทีหลัง, Chrome block download เพราะหลุด user-gesture chain + มี modal ซ้อน' },
            { type: 'fix', text: '• **Fix**: wrap `downloadPdfBlob()` เป็น **Promise** ที่ resolve หลัง `link.click()` ทำงานจริงๆ → caller `await` ได้ถูกต้อง → รอ download เสร็จก่อนค่อยขึ้น Swal success (เทคนิคเดียวกับที่ `/dashboard/export` ใช้อยู่แล้ว)' },
            { type: 'fix', text: '• ปรับ `exportLicensesToPDF` / `exportExpiringLicensesToPDF` ให้ `await downloadPdfBlob(...)` และ `throw` error ต่อให้ caller จับได้ (เดิมกลืน error ด้วย `alert` อย่างเดียว → caller คิดว่าสำเร็จ)' },
            { type: 'fix', text: '• ปรับ `exportShopsToPDF` / `exportUsersToPDF` / `exportUserCredentialsPDF` / `exportActivityLogsToPDF` ให้ `return downloadPdfBlob(...)` เพื่อให้ consistent และ caller await ได้ครบทุกตัว' },
            // ─────────────────────────────────────────────
            // Performance + Reliability — PDF Export เร็วขึ้น 10x + แก้ VFS error
            // ─────────────────────────────────────────────
            { type: 'fix', text: '🐛 แก้ error `File \'THSarabunNew-Bold.ttf\' not found in virtual file system` ตอนสร้าง PDF' },
            { type: 'perf', text: '⚡ **Export PDF เร็วขึ้นมาก** — เดิมทุกครั้งที่กด Export ต้องโหลด pdfmake module + vfs_fonts + fetch ฟอนต์ไทย ~850KB (2-5 วินาที/ครั้ง) ตอนนี้ **โหลดครั้งเดียว** แล้ว cache ไว้ใช้ตลอด session (ครั้งถัดไป <5ms)' },
            { type: 'fix', text: '• **Root cause ของ VFS error**: `pdfmake@0.3.1` เปลี่ยน API ของ `vfs_fonts.js` — โค้ดเดิมเช็ค `pdfFonts?.pdfMake?.vfs` แต่ v0.3.x ใช้ `pdfFonts?.vfs` → merge Roboto ไม่สำเร็จ + บางกรณี import ทับ VFS ที่โหลด Thai ไว้แล้ว → หา font ไม่เจอตอน render' },
            { type: 'fix', text: '• **Fix**: ข้ามการโหลด Roboto ทั้งหมด (ไม่ได้ใช้ — `defaultStyle.font = \'THSarabunNew\'`) → โหลดเฉพาะ THSarabunNew ที่ต้องการจริงๆ → ขจัด API mismatch + ลดขนาดโหลด' },
            { type: 'improve', text: '• Cache `pdfMake` instance + font base64 ด้วย **module-level Promise** (`cachedPdfMakePromise`) → concurrent export ก็ใช้ Promise เดียวกัน (ไม่เริ่ม init ซ้ำ)' },
            { type: 'improve', text: '• ถ้าโหลดฟอนต์ล้มเหลว → `throw` error ชัดเจน พร้อม filename (เดิม: `console.warn` แล้วยัง config ต่อ → fail ตอน render อย่างงงๆ) — caller จับแล้วแสดง "ไม่สามารถส่งออกเป็น PDF ได้" ให้ผู้ใช้เห็น' },
            { type: 'improve', text: '• ถ้า init fail → **reset cache** เพื่อให้ครั้งถัดไป retry ได้ (ไม่ติด cached error)' },
            { type: 'improve', text: '• Log เวลาที่ใช้ init — `[PDF Export] pdfMake initialized in XXXms (Thai fonts only)` เพื่อให้ debug/monitor ได้' },
            // ─────────────────────────────────────────────
            // Critical Fix — pdfmake v0.3 API Migration
            // ─────────────────────────────────────────────
            { type: 'fix', text: '🔥 **แก้ปัญหาจริง** ของ error `File \'THSarabunNew-Bold.ttf\' not found in virtual file system` + Swal loading ค้าง' },
            { type: 'fix', text: '• **Deep root cause**: `pdfmake@0.3.1` เปลี่ยน internal API จาก v0.2 อย่างมีนัยสำคัญ — `pdfMake.vfs = {...}` **ไม่มีผลเลย** เพราะ internal เก็บใน private `virtual_fs` instance (`writeFileSync`) ผ่าน method `addVirtualFileSystem()` เท่านั้น' },
            { type: 'fix', text: '• **Fix #1**: เปลี่ยน `pdfMake.vfs = { ... }` → `pdfMake.addVirtualFileSystem({ [FILE]: base64Data })` ตาม API v0.3' },
            { type: 'fix', text: '• **Fix #2**: เปลี่ยน `pdfMake.fonts = { ... }` → `pdfMake.addFonts({ THSarabunNew: {...} })` เพื่อให้ merge เข้ากับ default client fonts อย่างถูกต้อง' },
            { type: 'fix', text: '• **Fix #3**: เพิ่มการ validate `typeof pdfMake.addVirtualFileSystem === "function"` ก่อนใช้ → ถ้า upgrade pdfmake แล้ว API เปลี่ยนอีก จะ throw ทันทีพร้อมข้อความชัด (ไม่ silent fail)' },
            { type: 'fix', text: '• **Swal ค้าง**: pdfmake v0.3 `getBlob()` เปลี่ยนเป็น `async` ที่คืน `Promise<Blob>` แล้ว — callback style (`getBlob(cb)`) ของ v0.2 ไม่จับ error ที่ throw ภายใน render → callback ไม่เคยถูกเรียก → Promise wrap ไม่ resolve/reject → Swal loading ค้างถาวร' },
            { type: 'fix', text: '• **Fix #4**: เปลี่ยน `downloadPdfBlob` เป็น `async` และใช้ `await pdfDocGenerator.getBlob()` ตรงๆ → error ภายใน pdfmake render จะ bubble ขึ้น → caller catch + แสดง error message ให้ผู้ใช้เห็น (ไม่ค้าง)' },
            // ─────────────────────────────────────────────
            // รายงานใบอนุญาตใกล้หมดอายุ — ใช้แบบฟอร์มเดียวกับ /dashboard/export
            // ─────────────────────────────────────────────
            { type: 'feature', text: '📄 **รายงาน PDF "ใบอนุญาตใกล้หมดอายุ" ใช้แบบฟอร์มเดียวกับ `/dashboard/export`** — ดูเป็นทางการและ consistent กับรายงานอื่นๆ ของระบบ' },
            { type: 'improve', text: '• **Header แบบทางการ** 2 คอลัมน์ — ซ้าย: "สำนักงานเทศบาลเมืองนางรอง / ระบบจัดการใบอนุญาตประกอบกิจการ / ที่อยู่" | ขวา: ชื่อเอกสาร, วันที่ไทย — พร้อมเส้นขอบล่างสีเข้ม (แทนที่ header indigo แบบเดิม)' },
            { type: 'improve', text: '• เอา label "ต้นฉบับ / ORIGINAL" ออก — เพราะระบบไม่มีการแยก "สำเนา" vs "ต้นฉบับ" → ใส่ไว้เป็น placeholder เปล่าๆ ไม่ให้ข้อมูลที่มีประโยชน์ + ลบ style `officialTag` ที่ไม่ใช้แล้วทิ้ง (sync ทั้ง `pdfExportSafe.js` และ `serverPdfGenerator.js`)' },
            { type: 'improve', text: '• **Watermark** "ใบอนุญาตประกอบการค้า" สีเทาโปร่งใสตรงกลางหน้า (match รายงานอื่น)' },
            { type: 'improve', text: '• **คอลัมน์ "ลำดับที่"** นำหน้าตาราง (1, 2, 3, ...) ตามแบบ `/api/export`' },
            { type: 'improve', text: '• **Page header** เปลี่ยนจาก `Page X of Y` → `หน้า X จาก Y` (ภาษาไทย)' },
            { type: 'improve', text: '• **Footer** เปลี่ยนเป็น `เอกสารอิเล็กทรอนิกส์ออกโดยระบบ · สำนักงานเทศบาลเมืองนางรอง / พิมพ์เมื่อ: ...` — ดูเป็นทางการแบบเอกสารราชการ (sync ทั้ง `pdfExportSafe.js` และ `serverPdfGenerator.js` เพื่อให้ทุกรายงาน — expiring / licenses / shops / users — ใช้ข้อความเดียวกัน)' },
            { type: 'improve', text: '• **Filter info box** หัวข้อเปลี่ยนจาก "Filters Applied" → "เงื่อนไขการกรองข้อมูล" สีส้มเข้ม + พื้นเหลืองอ่อน (match backend)' },
            { type: 'improve', text: '• เพิ่ม helper functions ใหม่ใน `pdfExportSafe.js`: `createOfficialHeader()`, `createOfficialFilterInfo()`, `FILTER_LABELS_TH`, `THAI_MONTH_NAMES` — ใช้ร่วมกับ style keys ใหม่ (`brandName`, `brandSub`, `brandAddress`, `docTitle`, `officialTag`, `docDate`, `filterTitleOfficial`, `filterTextOfficial`)' },
            { type: 'improve', text: '• exporter อื่นๆ (`exportLicensesToPDF`, `exportShopsToPDF`, `exportUsersToPDF` ฯลฯ) **ยังใช้ layout เดิม** ไม่กระทบ — ผู้ใช้ขอเฉพาะหน้า expiring' },
            // ─────────────────────────────────────────────
            // ปรับขนาดตัวอักษร PDF ให้พอดีกับ A4 landscape + THSarabunNew
            // ─────────────────────────────────────────────
            { type: 'improve', text: '🔤 **ปรับขนาดตัวอักษร PDF ทุกรายงานให้พอดีกับ A4 landscape + ฟอนต์ THSarabunNew**' },
            { type: 'improve', text: '• **เหตุผล**: `THSarabunNew` render เล็กกว่า Helvetica/Arial ขนาดเดียวกัน ~20% → body 9pt เดิม = **เล็กมากอ่านยาก** (≈ Arial 7pt) + ไม่เป็นไปตามมาตรฐานรายงานราชการไทย (body ควร 12-14pt)' },
            { type: 'improve', text: '• **Table body** 9pt → **12pt** (+33%) — อ่านสบายตา เหมาะกับเอกสารราชการไทย' },
            { type: 'improve', text: '• **Table header** 10pt → **13pt** bold — เด่นขึ้น แยกจากแถวข้อมูลชัดเจน' },
            { type: 'improve', text: '• **Brand name / ที่อยู่** (header ซ้าย) 16/12/9pt → **18/14/11pt** — อ่านง่ายขึ้น proportion สวย' },
            { type: 'improve', text: '• **Doc title** (header ขวา) คง 22pt แต่เพิ่ม **docDate** 10 → 12pt ให้อ่านได้ชัด' },
            { type: 'improve', text: '• **Filter info box** 9-10pt → **12-13pt** — label กับ value อ่านชัดไม่ต้องเพ่ง' },
            { type: 'improve', text: '• **Stats summary** 9/20pt → **12/22pt** — ตัวเลขสถิติโดดเด่น label อ่านง่าย' },
            { type: 'improve', text: '• **Page number / Footer** 8pt → **10pt** — footer เอกสารราชการต้องอ่านได้โดยไม่ต้องซูม' },
            { type: 'improve', text: '• **Legacy header** (ใช้ใน `exportLicensesToPDF` / `exportShopsToPDF` ฯลฯ) 18/14/10pt → **20/16/12pt**' },
            { type: 'improve', text: '• **Sync ทั้ง 2 ไฟล์**: `pdfExportSafe.js` (client) + `serverPdfGenerator.js` (server) ใช้ค่าเดียวกัน → รายงานทุกแหล่งดูเหมือนกันหมด (expiring / licenses / shops / users)' },
            { type: 'improve', text: '• A4 landscape usable area ≈ 762 × 495 pt — body 12pt รองรับได้สบาย รวมทั้ง `licenses` ที่มี custom fields เพิ่ม (pdfmake จะ wrap text อัตโนมัติถ้าเกิน)' },
            // ─────────────────────────────────────────────
            // แก้ row height ไม่สม่ำเสมอใน PDF
            // ─────────────────────────────────────────────
            { type: 'fix', text: '📐 **แก้ความสูงแถวใน PDF ไม่สม่ำเสมอ — บางแถวช่องดูเล็ก บางแถวช่องดูใหญ่**' },
            { type: 'fix', text: '• **Root cause**: (1) pdfmake auto-size row height ตาม content → ชื่อสั้น/`-` vs ชื่อยาว/มีอักษรไทยพิเศษ (ฎ, ฏ, ญ, ฐ) → character metrics ต่าง → height ต่าง  (2) cell padding บางเกินไป (`margin: [5, 6, 5, 6]`) → differential 2-3pt relative กับ row 24pt = เห็นต่าง ~10% → ตาสังเกตได้ชัด' },
            { type: 'fix', text: '• **แก้**: เพิ่ม cell padding แนวตั้ง **6pt → 8pt** (+33%) และ header padding **8pt → 10pt** (+25%) → มี whitespace รอบ text มากขึ้น → differential ของ row heights **relative น้อยลง** → ตารางดู uniform' },
            { type: 'fix', text: '• apply ทั้ง 3 จุด: `createDataTable` ใน `pdfExportSafe.js` + inline cells ใน `exportExpiringLicensesToPDF` + `createDataTable` ใน `serverPdfGenerator.js` → ทุกรายงาน (expiring / licenses / shops / users จาก /api/export) ได้ประโยชน์พร้อมกัน' },
            { type: 'fix', text: '• **ไม่ใช้ fixed row height** — เพราะ pdfmake ถ้า content overflow จะ clip ข้อมูลหาย → เลือกเพิ่ม padding แทน ซึ่งปลอดภัยและ proportional' },
            // ─────────────────────────────────────────────
            // 🛡️ Critical Data Loss Audit & Fix — PDF Export
            // ─────────────────────────────────────────────
            { type: 'fix', text: '🛡️ **Audit ครบทุก PDF exporter — แก้ bug 9 จุดที่ทำให้ข้อมูลตกหล่น/เพี้ยน**' },
            // Data loss bugs (HIGH)
            { type: 'fix', text: '• 🔴 **[HIGH] Truncate 30 chars** — custom fields + address ถูกตัดเงียบๆ ที่ 30 ตัวอักษร + ต่อด้วย "..." → **ข้อมูลหายแบบเงียบ** (ที่อยู่ยาว / comment ยาว / note ยาว)  **แก้**: เอา truncation ออกทั้งหมด → ให้ pdfmake wrap text อัตโนมัติตาม column width' },
            { type: 'fix', text: '• 🔴 **[HIGH] Falsy trap `val \|\| \'-\'`** — ถ้า value เป็น `0`, `false`, `""` จะถูกแทนที่ด้วย `-` → เช่น `license_count: 0` (ร้านยังไม่มีใบอนุญาต) แสดงเป็น `-` แทน `0` = **ข้อมูลผิด** + boolean `false` → `-`  **แก้**: สร้าง helper `safeStr(val)` ที่เช็คเฉพาะ `null/undefined/""` → แทนที่ `|| \'-\'` ทั้งไฟล์ (>15 จุด ใน `createDataTable`, `exportLicensesToPDF`, `exportShopsToPDF`, `exportUsersToPDF`, `exportExpiringLicensesToPDF`, `exportActivityLogsToPDF`, `exportUserCredentialsPDF`, `createLicensesDocDef`, `createShopsDocDef`, `createUsersDocDef`)' },
            // Medium bugs
            { type: 'fix', text: '• 🟠 **[MEDIUM] Custom field `datetime` ไม่ format** — check เฉพาะ `\'date\'` → datetime field แสดงเป็น ISO string `2026-01-12T03:45:00.000Z` แทน `12/1/2569 10:45` (CSV รองรับแต่ PDF ไม่)  **แก้**: เพิ่ม `formatThaiDateTime()` + logic ใน `formatCustomValue()` รองรับทั้ง `date` และ `datetime`' },
            { type: 'fix', text: '• 🟠 **[MEDIUM] `createShopsDocDef` ขาด default fields `notes` + `license_count`** — ถ้า `activeBaseFields = null` (fallback case) → **ข้อมูล 2 ฟิลด์นี้จะหายจากรายงาน** แม้ `/api/export` มีส่งมา  **แก้**: เพิ่ม 2 fields ใน default + mark `created_at` เป็น `type: "date"`' },
            { type: 'fix', text: '• 🟠 **[MEDIUM] `createShopsDocDef` ไม่รับ/แสดง filters** — PDF รายงานร้านค้าไม่แสดง filter info box ขณะที่ licenses แสดง = inconsistent  **แก้**: เพิ่ม param `filters` + แสดง `createFilterInfo(filters)` + `generatePdf()` pass filters ไป shops ด้วย' },
            { type: 'fix', text: '• 🟠 **[MEDIUM] Typo `Asia/Bangk ok`** (มีช่องว่าง) ใน footer ของ `exportUsersToPDF` → `toLocaleString` throw `RangeError` → footer render ไม่ได้  **แก้**: `Asia/Bangkok` ถูกต้อง' },
            { type: 'fix', text: '• 🟠 **[MEDIUM] `val?.toLowerCase()` ไม่ safe** — ถ้า status เป็น `number` หรือ non-string → crash  **แก้**: สร้าง `formatStatus(val)` + check `typeof === "string"` ก่อน lowercase' },
            // Low bug
            { type: 'fix', text: '• 🟡 **[LOW] Custom field types `boolean` / `array` / `object` แสดงแย่** — `String(true)` = `"true"`, `String([...])` = `"a,b"`, `String({...})` = `"[object Object]"` (ไม่ readable)  **แก้**: `formatCustomValue()` รองรับ:\n  - `boolean` → `"ใช่" / "ไม่ใช่"`\n  - array (multiselect) → `"a, b, c"` (join comma+space)\n  - object (JSON) → `JSON.stringify()`' },
            // Helpers สรุป
            { type: 'improve', text: '🧬 **สร้าง helpers ใหม่ 4 ตัวใน ทั้ง `pdfExportSafe.js` + `serverPdfGenerator.js`** (sync logic ทั้ง client + server): `safeStr(val)`, `formatStatus(val)`, `formatCustomValue(cf, value)`, `formatThaiDateTime(dateStr)` → ใช้ซ้ำทุก exporter แทน inline logic กระจัดกระจาย' },
            { type: 'improve', text: '• **Defensive date parsing** — เพิ่ม `isNaN(date.getTime())` check ใน `formatThaiDate()` + `formatThaiDateTime()` → ถ้า date string ผิด format → fallback `String(val)` แทน return invalid date' },
            { type: 'note', text: '📝 Impact: รายงาน PDF ทั้งระบบ (expiring / licenses / shops / users / activity logs / credentials) แสดงข้อมูลครบถ้วน ไม่มีการตัด/กลืนค่า falsy อีก — สำคัญเฉพาะกับเอกสารราชการที่ต้องการความถูกต้อง 100%' },
            // ─────────────────────────────────────────────
            // 🏷️ Watermark dynamic — เฉพาะ /dashboard/expiring
            // ─────────────────────────────────────────────
            { type: 'improve', text: '🏷️ **เปลี่ยน watermark ของ PDF หน้า `/dashboard/expiring` ให้ dynamic ตามเนื้อหารายงาน** (แทนที่ข้อความ "ใบอนุญาตประกอบการค้า" แบบเดิมที่ไม่ตรงกับบริบท)' },
            { type: 'improve', text: '• **"ใบอนุญาตหมดอายุ"** — เมื่อ user filter สถานะ = "หมดอายุแล้ว" หรือเมื่อทุกรายการในรายงานหมดอายุไปแล้ว (days < 0 ทุกตัว)' },
            { type: 'improve', text: '• **"ใบอนุญาตใกล้หมดอายุ"** — default สำหรับกรณีอื่น (ไม่ filter / filter ช่วงวัน / mixed content)' },
            { type: 'note', text: '📝 ผลกระทบเฉพาะ `exportExpiringLicensesToPDF` ใน `pdfExportSafe.js` — PDF อื่นๆ (licenses / shops / users จาก `/api/export`) ยังใช้ watermark "ใบอนุญาตประกอบการค้า" เหมือนเดิม' }
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
