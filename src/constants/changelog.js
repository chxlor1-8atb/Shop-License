/**
 * Application Changelog / Patch Notes
 * แสดงประวัติการอัปเดตและแก้บั๊กให้ผู้ใช้เห็น
 */

export const CHANGELOG = [
    {
        version: '2.0.0',
        date: '2026-02-10',
        title: 'ระบบบริหารจัดการใบอนุญาตและร้านค้า V2',
        changes: [
            // --- System Overview ---
            { type: 'feature', text: '🎉 ระบบบริหารจัดการข้อมูลร้านค้าและใบอนุญาตสำหรับเทศบาลนางรอง' },
            { type: 'improve', text: '🎨 UX/UI Design: ธีม Orange-Gold ทันสมัย สะอาดตา รองรับ Responsive ทุกอุปกรณ์' },

            // --- Login ---
            { type: 'feature', text: '� หน้า Login: ออกแบบใหม่พร้อม Slider Animation, Background Particles และ Feature Tags' },
            { type: 'security', text: '🔒 ระบบ Authentication: iron-session cookie-based, bcrypt password hashing, session 30 นาที' },

            // --- Dashboard ---
            { type: 'feature', text: '📊 Dashboard ภาพรวม: แสดงสถิติร้านค้า, ใบอนุญาตทั้งหมด, ใช้งาน, ใกล้หมดอายุ, หมดอายุแล้ว' },
            { type: 'feature', text: '• ลิงก์ไปหน้าประวัติกิจกรรมสำหรับ Admin' },

            // --- Shop Management ---
            { type: 'feature', text: '� จัดการร้านค้า: ตาราง Excel-like แก้ไข Inline ได้เลย พร้อม Right-click Context Menu' },
            { type: 'feature', text: '• ค้นหาและกรองข้อมูล, Pagination, เพิ่มร้านค้าด่วนผ่าน QuickAddModal' },
            { type: 'feature', text: '• ดูรายละเอียดร้านค้าแบบ Modal (ShopDetailModal) พร้อมใบอนุญาตที่เกี่ยวข้อง' },
            { type: 'feature', text: '• Export ร้านค้าเป็น PDF พร้อมหัวกระดาษตราครุฑ' },
            { type: 'feature', text: '• รองรับ Custom Fields: เพิ่มฟิลด์ข้อมูลเฉพาะร้านค้าได้ไม่จำกัด' },

            // --- License Management ---
            { type: 'feature', text: '� จัดการใบอนุญาต: ตาราง Excel-like พร้อม Inline Editing และ Custom Fields' },
            { type: 'feature', text: '• กรองตามประเภท, สถานะ (ใช้งาน/หมดอายุ/เพิกถอน), ค้นหา และ Pagination' },
            { type: 'feature', text: '• เพิ่มใบอนุญาตด่วนผ่าน QuickAddModal พร้อม Dropdown ร้านค้า/ประเภท' },
            { type: 'feature', text: '• Export ใบอนุญาตเป็น PDF' },

            // --- Expiring Licenses ---
            { type: 'feature', text: '⏰ ใบอนุญาตใกล้หมดอายุ: แสดง Badge จำนวนที่ Sidebar พร้อม Highlight สีตามระดับความเร่งด่วน' },
            { type: 'feature', text: '• กรองตามระดับ: หมดอายุแล้ว / ≤7 วัน (วิกฤต) / 8-14 วัน (เตือน) / >14 วัน' },
            { type: 'feature', text: '• กรองตามประเภทใบอนุญาต, ช่วงวันที่, และค้นหาอิสระ' },

            // --- License Types ---
            { type: 'feature', text: '🏷️ จัดการประเภทใบอนุญาต: ตาราง Excel-like พร้อม Inline Editing' },
            { type: 'feature', text: '• ตั้งค่าชื่อ, คำอธิบาย, อายุ (วัน) และจำนวนใบอนุญาตที่ใช้งาน' },

            // --- User Management ---
            { type: 'feature', text: '👥 จัดการผู้ใช้งาน (Admin only): ตาราง Excel-like สร้าง/แก้ไข/ลบผู้ใช้' },
            { type: 'feature', text: '• กำหนดบทบาท Admin/User, รีเซ็ตรหัสผ่าน' },
            { type: 'feature', text: '• Export ข้อมูลผู้ใช้เป็น PDF (User Credentials)' },

            // --- Export & Reports ---
            { type: 'feature', text: '🖨️ ส่งออกข้อมูล: เลือก Export ร้านค้า หรือ ใบอนุญาต เป็น CSV หรือ PDF' },
            { type: 'feature', text: '• Preview ข้อมูลก่อน Export, เลือกคอลัมน์ที่ต้องการ, กรองตามเงื่อนไขต่างๆ' },
            { type: 'feature', text: '• รองรับ Custom Fields ใน Export' },
            { type: 'feature', text: '• PDF พร้อมหัวกระดาษตราครุฑและที่อยู่เทศบาล (pdfmake)' },

            // --- Activity Logs ---
            { type: 'feature', text: '� ประวัติกิจกรรม (Admin only): ติดตามทุกการกระทำ (Login/Logout/CRUD/Export)' },
            { type: 'feature', text: '• แสดงสถิติ, IP Address, Action Breakdown, Entity Breakdown' },
            { type: 'feature', text: '• กรองตาม Action, Entity Type, ช่วงวันที่ และค้นหา พร้อม Pagination' },

            // --- Custom Fields ---
            { type: 'feature', text: '⚙️ Custom Fields: สร้างฟิลด์กำหนดเองสำหรับร้านค้า/ใบอนุญาต/ประเภทใบอนุญาต/ผู้ใช้' },
            { type: 'feature', text: '• รองรับ 6 ประเภท: Text, Number, Date, Dropdown, Checkbox, Textarea' },
            { type: 'feature', text: '• ตั้งค่า Required, แสดง/ซ่อนในตาราง, แสดง/ซ่อนในฟอร์ม, ลำดับการแสดงผล' },

            // --- Dynamic Entities & Schema ---
            { type: 'feature', text: '🧩 Dynamic Entities: สร้างชุดข้อมูลใหม่พร้อมกำหนด Fields เอง (Entity + Entity Fields + Records)' },
            { type: 'feature', text: '• Schema Definitions: กำหนดคอลัมน์เพิ่มเติมให้ตารางหลักแบบ Dynamic' },

            // --- Excel-like Table Component ---
            { type: 'improve', text: '📊 ExcelTable Component: ตาราง Excel-like ใช้ร่วมกันทุกหน้า' },
            { type: 'improve', text: '• Inline Editing, Right-click Context Menu, Column Resize, Sorting' },
            { type: 'improve', text: '• Editable Headers, Filter Row, Toolbar, Lazy Loading' },

            // --- Performance & Optimization ---
            { type: 'improve', text: '⚡ SWR Data Fetching: Caching, Revalidation, Prefetch และ Mutation ข้อมูลอัตโนมัติ' },
            { type: 'improve', text: '• Lazy Load: PatchNotesModal, ExcelTable, PDF Export โหลดเฉพาะเมื่อใช้งาน' },
            { type: 'improve', text: '• Custom Hooks: useDebounce, useThrottle, useIntersectionObserver, useMediaQuery ฯลฯ' },
            { type: 'improve', text: '• Skeleton Loading: แสดง Skeleton ขณะโหลดข้อมูลแทนหน้าว่าง' },
            { type: 'improve', text: '• Server-side Caching และ Performance Monitoring' },

            // --- UI Components ---
            { type: 'improve', text: '🧱 UI Components: CustomSelect, DatePicker, Pagination, Modal, StatusBadge, FilterRow' },
            { type: 'improve', text: '• SweetAlert2 Custom Theme, Toast Notifications' },
            { type: 'improve', text: '• Loading Component พร้อม Full Page Mode' },

            // --- Version & Changelog ---
            { type: 'feature', text: '📢 Patch Notes Modal: ดูประวัติการอัปเดตผ่าน Sidebar หรือ Version Badge ที่ Header' },

            // --- Security ---
            { type: 'security', text: '🔒 Security Headers: CSP, X-Frame-Options, X-XSS-Protection, Referrer-Policy' },
            { type: 'security', text: '• Parameterized Queries ป้องกัน SQL Injection' },
            { type: 'security', text: '• Input Validation & Sanitization ทุก API Route' },
            { type: 'security', text: '• HTTP-only Secure Session Cookies' },

            // --- Analytics ---
            { type: 'improve', text: '📈 Vercel Analytics & Speed Insights: ติดตามประสิทธิภาพและการใช้งานจริง' },
            { type: 'improve', text: '• Google Fonts Optimization: Inter + Noto Sans Thai ผ่าน next/font (ไม่มี CLS)' },

            // --- Cron & Maintenance ---
            { type: 'feature', text: '🔄 Cron Jobs: ระบบ Cleanup อัตโนมัติ (ลบข้อมูลเก่า, Orphaned Records)' }
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
