/**
 * Application Changelog / Patch Notes
 * แสดงประวัติการอัปเดตและแก้บั๊กให้ผู้ใช้เห็น
 */

export const CHANGELOG = [
    {
        version: '2.6.0',
        date: '2026-01-13',
        title: 'ปรับปรุงประสิทธิภาพและดีไซน์',
        changes: [
            { type: 'feature', text: 'เพิ่มเมนู "ช่วยเหลือ" และประกาศอัปเดตในแถบเมนูข้าง' },
            { type: 'improve', text: 'ปรับปรุงดีไซน์หน้า Dashboard ให้ทันสมัย (Glassmorphism)' },
            { type: 'improve', text: 'ปรับปรุงหน้าประวัติกิจกรรม (Activity Logs) แบบใหม่' },
            { type: 'fix', text: 'แก้ไขปัญหา Pagination ทับซ้อนกับเนื้อหา' },
            { type: 'fix', text: 'แก้ไขปัญหา CSS Caching ที่ทำให้หน้าเว็บแสดงผลผิดเพี้ยน' },
            { type: 'fix', text: 'แก้ไข API Error 500 หน้า License Types' },
            { type: 'improve', text: 'เปลี่ยนลิงก์หน้า Dashboard ให้รองรับภาษาไทยเต็มรูปแบบ' }
        ]
    },
    {
        version: '2.5.0',
        date: '2026-01-05',
        title: 'ปรับปรุง UI หน้า Login',
        changes: [
            { type: 'feature', text: 'ปรับปรุง Wave Divider ให้ต่อเนื่องไม่มีช่องว่าง' },
            { type: 'fix', text: 'แก้ไข UI มือถือหน้า Login ให้ responsive ทุกขนาดหน้าจอ' },
            { type: 'fix', text: 'แก้ไขพื้นหลังสีเทาหน้า Login form บนมือถือ' },
            { type: 'improve', text: 'ปรับสี theme ให้สอดคล้องกับ Orange-Gold' }
        ]
    },
    {
        version: '2.4.0',
        date: '2025-12-30',
        title: 'ปรับปรุงข้อมูลและ Database',
        changes: [
            { type: 'feature', text: 'เพิ่มข้อมูลตัวอย่างภาษาไทยแบบสมจริง' },
            { type: 'fix', text: 'แก้ไขปัญหา Database Connection Error' },
            { type: 'improve', text: 'ลบไฟล์ที่ไม่ใช้งานออกจากระบบ' }
        ]
    },
    {
        version: '2.3.0',
        date: '2025-12-29',
        title: 'ปรับปรุง Custom Select',
        changes: [
            { type: 'feature', text: 'เพิ่มฟังก์ชัน Search ใน Custom Select Dropdown' },
            { type: 'feature', text: 'เพิ่ม Logout Confirmation Dialog' },
            { type: 'improve', text: 'รองรับ Keyboard Navigation (Arrow keys, Enter, Escape)' },
            { type: 'fix', text: 'แก้ไขการแสดงผลเมื่อมี Options จำนวนมาก' }
        ]
    },
    {
        version: '2.2.0',
        date: '2025-12-26',
        title: 'ปรับปรุง Navigation & Responsive',
        changes: [
            { type: 'feature', text: 'รวม Hamburger Menu เข้ากับ Navbar สำหรับมือถือ' },
            { type: 'fix', text: 'แก้ไข Wave Divider ให้ Responsive ทุกขนาดหน้าจอ' },
            { type: 'improve', text: 'ปรับปรุง Mobile Navigation Experience' }
        ]
    },
    {
        version: '2.1.0',
        date: '2025-12-25',
        title: 'ฟีเจอร์ Remember Me & UI',
        changes: [
            { type: 'feature', text: 'เพิ่มฟังก์ชัน Remember Me' },
            { type: 'improve', text: 'ปรับแต่ง Wave Divider หน้า Login' },
            { type: 'improve', text: 'ปรับปรุงประสบการณ์การเข้าสู่ระบบ' }
        ]
    },
    {
        version: '2.0.0',
        date: '2025-12-19',
        title: 'Major UI Overhaul',
        changes: [
            { type: 'feature', text: 'ปรับโฉมหน้า Login ใหม่ทั้งหมด' },
            { type: 'feature', text: 'เพิ่ม Animation แบบ Modern' },
            { type: 'feature', text: 'เปลี่ยน Background เป็นรูปเมฆ 4K' },
            { type: 'feature', text: 'เพิ่มข้อมูลตัวอย่างภาษาไทย' },
            { type: 'improve', text: 'รองรับ CanvasJS Charts' }
        ]
    }
];

/**
 * Get badge class for change type
 */
export function getChangeTypeBadge(type) {
    switch (type) {
        case 'feature': return { class: 'badge-success', label: 'ฟีเจอร์ใหม่', icon: 'fas fa-plus-circle' };
        case 'fix': return { class: 'badge-danger', label: 'แก้บั๊ก', icon: 'fas fa-bug' };
        case 'improve': return { class: 'badge-info', label: 'ปรับปรุง', icon: 'fas fa-arrow-up' };
        case 'security': return { class: 'badge-warning', label: 'ความปลอดภัย', icon: 'fas fa-shield-alt' };
        default: return { class: 'badge-secondary', label: 'อื่นๆ', icon: 'fas fa-circle' };
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
