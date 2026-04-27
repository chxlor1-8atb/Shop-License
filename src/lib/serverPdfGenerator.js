const PdfPrinterModule = require('pdfmake/js/Printer');
const PdfPrinter = PdfPrinterModule.default || PdfPrinterModule;
import path from 'path';
import fs from 'fs';

// Define fonts helper
const getFontContent = (filename) => {
    try {
        const filePath = path.join(process.cwd(), 'public', 'fonts', filename);
        // console.log(`Attempting to load font: ${filePath}`);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath);
        }
        console.warn(`Font file not found: ${filePath}`);
        return null;
    } catch (error) {
        console.error(`Error loading font ${filename}:`, error);
        return null;
    }
};

// Font definition will be created inside generatePdf
let fonts = null;



// Colors
const COLORS = {
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    secondary: '#64748b',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    light: '#f8fafc',
    dark: '#1e293b',
    muted: '#94a3b8',
    white: '#ffffff',
    border: '#e2e8f0'
};

const STATUS_CONFIG = {
    active: { color: COLORS.success, label: 'ใช้งานปกติ' },
    expired: { color: COLORS.danger, label: 'หมดอายุ' },
    pending: { color: COLORS.warning, label: 'รออนุมัติ' },
    suspended: { color: '#f97316', label: 'ถูกระงับ' },
    revoked: { color: COLORS.danger, label: 'ถูกเพิกถอน' }
};

// Utils
function formatThaiDate(dateStr) {
    if (dateStr === null || dateStr === undefined || dateStr === '') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return String(dateStr);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    } catch {
        return String(dateStr);
    }
}

/**
 * Format Thai datetime: `วว/ดด/ปปปป HH:mm`
 * ใช้กับ custom field type = 'datetime'
 */
function formatThaiDateTime(dateStr) {
    if (dateStr === null || dateStr === undefined || dateStr === '') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return String(dateStr);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear() + 543;
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hh}:${mm}`;
    } catch {
        return String(dateStr);
    }
}

/**
 * 🛡️ Safe string coercion — คืน fallback เฉพาะเมื่อ null/undefined/empty string
 * **ไม่ทำ falsy trap** (0, false, NaN ถือว่าเป็นค่าที่ valid ต้องแสดง)
 *
 * ⚠️ เดิมใช้ `val || '-'` ซึ่งจะทำให้:
 *    - `license_count: 0` → '-' (ร้านไม่มีใบอนุญาต)
 *    - `active: false` → '-' (boolean)
 *    - `notes: ''` → '-' (OK แต่ตั้งใจหรือเปล่า?)
 * ตอนนี้จัดการแบบ explicit
 */
function safeStr(val, fallback = '-') {
    if (val === null || val === undefined) return fallback;
    const s = String(val);
    return s === '' ? fallback : s;
}

/**
 * Safe status label — รองรับ val ที่ไม่ใช่ string (เช่น number/null)
 * คืน label ไทยถ้า match, ถ้าไม่ match คืน raw value หรือ '-'
 */
function formatStatus(val) {
    if (val === null || val === undefined || val === '') return '-';
    const key = String(val).toLowerCase();
    return STATUS_CONFIG[key]?.label || String(val);
}

/**
 * 🧬 Format custom field value ตาม `field_type`
 * - date / datetime → Thai date format
 * - boolean → ใช่/ไม่ใช่
 * - multiselect (array or comma-string) → "a, b, c"
 * - object (JSON) → JSON.stringify
 * - null/undefined/empty → '-'
 * - อื่น → String(value)
 *
 * ⚠️ ไม่ truncate — ให้ pdfmake wrap text อัตโนมัติตาม column width
 *    เดิม truncate 30 chars → **ข้อมูลหายแบบเงียบ**
 */
function formatCustomValue(cf, value) {
    if (value === null || value === undefined || value === '') return '-';

    const type = cf?.field_type;

    if (type === 'date') return formatThaiDate(value);
    if (type === 'datetime') return formatThaiDateTime(value);

    if (type === 'boolean') {
        if (value === true || value === 'true' || value === 1 || value === '1') return 'ใช่';
        if (value === false || value === 'false' || value === 0 || value === '0') return 'ไม่ใช่';
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map(v => String(v)).join(', ');
    }

    if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch { return '[object]'; }
    }

    return String(value);
}

function getCurrentThaiDate() {
    const date = new Date();
    const thaiMonths = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

// Layout Creators
function createHeader(title, subtitle) {
    return {
        table: {
            widths: ['*'],
            body: [
                [{
                    columns: [
                        {
                            stack: [
                                { text: 'สำนักงานเทศบาลเมืองนางรอง', style: 'brandName' },
                                { text: 'ระบบจัดการใบอนุญาตประกอบกิจการ', style: 'brandSub' },
                                { text: '906 ถนนโชคชัย-เดชอุดม ตำบลนางรอง อำเภอนางรอง จังหวัดบุรีรัมย์ 31110', style: 'brandAddress' }
                            ],
                            alignment: 'left'
                        },
                        {
                            stack: [
                                { text: title, style: 'docTitle', alignment: 'right' },
                                { text: subtitle || `วันที่: ${formatThaiDate(new Date().toISOString())}`, style: 'docDate', alignment: 'right' }
                            ],
                            alignment: 'right'
                        }
                    ],
                    margin: [0, 5, 0, 15]
                }]
            ]
        },
        layout: {
            hLineWidth: (i) => i === 1 ? 2 : 0,
            vLineWidth: () => 0,
            hLineColor: () => '#1e293b'
        },
        margin: [0, 0, 0, 20]
    };
}

function createSummaryBox(stats) {
    const items = Object.entries(stats).map(([label, value]) => ({
        stack: [
            { text: value.toString(), style: 'statValue', alignment: 'center' },
            { text: label, style: 'statLabel', alignment: 'center' }
        ],
        margin: [10, 10, 10, 10]
    }));

    return {
        table: {
            widths: Array(items.length).fill('*'),
            body: [items]
        },
        layout: {
            fillColor: () => COLORS.light,
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => COLORS.border,
            vLineColor: () => COLORS.border
        },
        margin: [0, 0, 0, 20]
    };
}

function createDataTable(headers, data, options = {}) {
    const { columnWidths, colorColumn } = options;

    // 📏 Padding [5, 10, 5, 10] — header ต้องเด่น + breathing room พอ
    const headerRow = headers.map(h => ({
        text: h,
        style: 'tableHeader',
        fillColor: COLORS.primaryDark,
        color: COLORS.white,
        alignment: 'center',
        margin: [5, 10, 5, 10]
    }));

    // 📏 Padding [5, 8, 5, 8] (จาก 6) — ลด differential ของ row heights
    // ที่เกิดจาก character metrics ต่างกัน (ตัว ฎ/ฏ/ญ) + content wrap → ตารางดู uniform
    // 🛡️ ใช้ safeStr() แทน `cell || '-'` เพื่อกัน falsy trap (0, false → '-' เดิม = bug)
    const dataRows = data.map((row, rowIndex) => {
        return row.map((cell, colIndex) => {
            const cellText = safeStr(cell);
            let cellStyle = {
                text: cellText,
                style: 'tableCell',
                alignment: 'center',
                margin: [5, 8, 5, 8],
                fillColor: rowIndex % 2 === 0 ? COLORS.white : COLORS.light
            };

            if (colorColumn !== undefined && colIndex === colorColumn) {
                // 🛡️ safe toLowerCase — เดิมถ้า cell ไม่ใช่ string อาจ crash
                const cellLower = typeof cell === 'string' ? cell.toLowerCase() : '';
                const statusKey = Object.keys(STATUS_CONFIG).find(
                    key => STATUS_CONFIG[key].label === cellText || key === cellLower
                );
                if (statusKey) {
                    cellStyle.color = STATUS_CONFIG[statusKey].color;
                    cellStyle.bold = true;
                }
            }

            return cellStyle;
        });
    });

    return {
        table: {
            headerRows: 1,
            widths: columnWidths || Array(headers.length).fill('auto'),
            body: [headerRow, ...dataRows]
        },
        layout: {
            hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: (i) => i <= 1 ? COLORS.primaryDark : COLORS.border,
            vLineColor: () => COLORS.border,
            paddingLeft: () => 5,
            paddingRight: () => 5
        }
    };
}

const FILTER_LABELS = {
    'License Type ID': 'ประเภทใบอนุญาต',
    'Status': 'สถานะ',
    'Expiry From': 'วันหมดอายุ (เริ่มต้น)',
    'Expiry To': 'วันหมดอายุ (สิ้นสุด)',
    'Expiry Month': 'เดือนที่หมดอายุ',
    'Expiry Year': 'ปีที่หมดอายุ (พ.ศ.)'
};

const THAI_MONTH_NAMES = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function createFilterInfo(filters) {
    if (!filters || Object.keys(filters).length === 0) return null;

    const filterTexts = Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => {
            const label = FILTER_LABELS[key] || key;
            let displayValue = value;

            // Format Status
            if (key === 'Status') {
                const statusKey = Object.keys(STATUS_CONFIG).find(k => k === value?.toLowerCase());
                if (statusKey) {
                    displayValue = STATUS_CONFIG[statusKey].label;
                }
            }

            // Format Month (1-12 → ชื่อเดือนไทย)
            if (key === 'Expiry Month') {
                const m = parseInt(value, 10);
                displayValue = THAI_MONTH_NAMES[m] || value;
            }
            // Format Year (ค.ศ. → พ.ศ.)
            else if (key === 'Expiry Year') {
                const y = parseInt(value, 10);
                displayValue = !isNaN(y) ? String(y + 543) : value;
            }
            // Format Date range values
            else if (key.includes('Expiry') && value) {
                displayValue = formatThaiDate(value);
            }

            return `${label}: ${displayValue}`;
        });

    if (filterTexts.length === 0) return null;

    return {
        table: {
            widths: ['*'],
            body: [[{
                stack: [
                    { text: 'เงื่อนไขการกรองข้อมูล', style: 'filterTitle' },
                    { text: filterTexts.join(' | '), style: 'filterText' }
                ],
                margin: [10, 8, 10, 8]
            }]]
        },
        layout: {
            fillColor: () => '#fef3c7',
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#fcd34d',
            vLineColor: () => '#fcd34d'
        },
        margin: [0, 0, 0, 15]
    };
}

function getStyles() {
    /* 📏 Font size rationale (A4 landscape + THSarabunNew)
     *   • THSarabunNew render เล็กกว่า Helvetica/Arial ขนาดเดียวกัน ~20% → ต้อง compensate
     *   • มาตรฐานเอกสารราชการไทย (TH SarabunPSK/THSarabunNew):
     *       - Body text: 14-16pt  | ในรายงาน PDF/ตาราง: 12pt อ่านชัดสบายตา
     *       - Table header: 13-14pt bold
     *       - Page title: 20-22pt bold
     *   • A4 landscape usable area ≈ 762 × 495 pt → รองรับ body 12pt สบายๆ
     *   • ต้อง sync ค่ากับ pdfExportSafe.js (ฝั่ง client) เพื่อความ consistent
     */
    return {
        // ── Official header ──
        brandName:    { fontSize: 18, bold: true, color: COLORS.dark },
        brandSub:     { fontSize: 14, color: COLORS.secondary },
        brandAddress: { fontSize: 11, color: COLORS.muted, margin: [0, 2, 0, 0] },
        docTitle:     { fontSize: 22, bold: true, color: COLORS.primaryDark },
        docDate:      { fontSize: 12, color: COLORS.dark },

        // ── Summary / Stats ──
        statValue: { fontSize: 22, bold: true, color: COLORS.primary },
        statLabel: { fontSize: 12, color: COLORS.secondary },

        // ── Table (body 12pt, header 13pt — มาตรฐานรายงานราชการ) ──
        tableHeader: { fontSize: 13, bold: true },
        tableCell:   { fontSize: 12 },

        // ── Filter box (สีส้มเข้ม) ──
        filterTitle: { fontSize: 13, bold: true, color: '#92400e' },
        filterText:  { fontSize: 12, color: '#b45309' },

        // ── Page number / Footer ──
        pageNumber: { fontSize: 10, color: COLORS.muted },
        footer:     { fontSize: 10, color: COLORS.muted }
    };
}

// DocDef Creators
function createLicensesDocDef(licenses, customFieldDefs, filters, activeBaseFields = null) {
    const title = 'รายงานใบอนุญาต';
    const stats = {
        'ทั้งหมด': licenses.length,
        'ใช้งานปกติ': licenses.filter(l => l.status === 'active').length,
        'หมดอายุ': licenses.filter(l => l.status === 'expired').length,
        'อื่นๆ': licenses.filter(l => !['active', 'expired'].includes(l.status)).length
    };

    // Default base header definitions (Fallback — matches /api/export definitions)
    const defaultBaseFields = [
        { key: 'owner_name', dataKey: 'owner_name', label: 'ชื่อเจ้าของ' },
        { key: 'shop_id', dataKey: 'shop_name', label: 'ชื่อร้านค้า' },
        { key: 'license_type_id', dataKey: 'type_name', label: 'ประเภทใบอนุญาต' },
        { key: 'license_number', dataKey: 'license_number', label: 'เลขที่ใบอนุญาต' },
        { key: 'issue_date', dataKey: 'issue_date', label: 'วันที่ออก' },
        { key: 'expiry_date', dataKey: 'expiry_date', label: 'วันหมดอายุ' },
        { key: 'status', dataKey: 'status', label: 'สถานะ', afterCustom: true },
        { key: 'notes', dataKey: 'notes', label: 'หมายเหตุ', afterCustom: true }
    ];

    const baseFields = activeBaseFields || defaultBaseFields;

    // Split into pre-custom and post-custom so custom fields appear in the middle
    const preCustomFields = baseFields.filter(f => !f.afterCustom);
    const postCustomFields = baseFields.filter(f => f.afterCustom);

    // Construct headers: [ลำดับที่, preCustom..., customFields..., postCustom...]
    const headers = [
        'ลำดับที่',
        ...preCustomFields.map(f => f.label),
        ...customFieldDefs.map(cf => cf.field_label),
        ...postCustomFields.map(f => f.label)
    ];

    // 🛡️ Safe renderer — ใช้ safeStr (ไม่ทำ falsy trap) + รองรับ type-based formatting
    const renderBaseCell = (f, val) => {
        if (f.type === 'date' || f.dataKey === 'issue_date' || f.dataKey === 'expiry_date' || f.dataKey === 'created_at') {
            return formatThaiDate(val);
        }
        if (f.dataKey === 'status') return formatStatus(val);
        return safeStr(val);
    };

    // Custom cell — ไม่ truncate (ให้ pdfmake wrap), รองรับ date/datetime/boolean/array/object
    const renderCustomCell = (cf, value) => formatCustomValue(cf, value);

    const data = licenses.map((l, idx) => {
        const preData = preCustomFields.map(f => renderBaseCell(f, l[f.dataKey]));
        const customFieldsData = l.custom_fields || {};
        const customData = customFieldDefs.map(cf => renderCustomCell(cf, customFieldsData[cf.field_name]));
        const postData = postCustomFields.map(f => renderBaseCell(f, l[f.dataKey]));
        return [String(idx + 1), ...preData, ...customData, ...postData];
    });

    // Compute which visible column index is the status column so colorColumn still works
    const statusIdxInPost = postCustomFields.findIndex(f => f.dataKey === 'status');
    const statusColorColumn = statusIdxInPost >= 0
        ? 1 + preCustomFields.length + customFieldDefs.length + statusIdxInPost
        : undefined;

    const columnWidths = Array(headers.length).fill('auto');

    return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [40, 40, 40, 60],
        watermark: { text: 'ใบอนุญาตประกอบการค้า', color: 'gray', opacity: 0.08, bold: true, italics: false },
        defaultStyle: { font: 'THSarabunNew' },
        header: (currentPage, pageCount) => ({
            text: `หน้า ${currentPage} จาก ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),
        footer: () => ({
            columns: [
                { text: 'เอกสารอิเล็กทรอนิกส์ออกโดยระบบ  ·  สำนักงานเทศบาลเมืองนางรอง', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),
        content: [
            createHeader(title),
            // createSummaryBox(stats),
            filters && Object.keys(filters).length > 0 ? createFilterInfo(filters) : null,
            createDataTable(headers, data, {
                columnWidths: columnWidths, // Use auto-calculated widths based on header count
                colorColumn: statusColorColumn // Apply color styling to status column regardless of its new position
            })
        ].filter(Boolean),
        styles: getStyles()
    };
}

function createShopsDocDef(shops, customFieldDefs, activeBaseFields = null, filters = {}) {
    const title = 'รายงานร้านค้า';
    const stats = {
        'ร้านค้าทั้งหมด': shops.length
    };

    // Default Fallback — ✅ match /api/export: เพิ่ม notes + license_count
    // ⚠️ ก่อนหน้าขาด 2 field นี้ → ถ้า activeBaseFields = null → ข้อมูลจะหาย
    const defaultBaseFields = [
        { key: 'shop_name',  dataKey: 'shop_name',  label: 'ชื่อร้านค้า' },
        { key: 'owner_name', dataKey: 'owner_name', label: 'ชื่อเจ้าของ' },
        { key: 'address',    dataKey: 'address',    label: 'ที่อยู่' },
        { key: 'phone',      dataKey: 'phone',      label: 'เบอร์โทรศัพท์' },
        { key: 'notes',      dataKey: 'notes',      label: 'หมายเหตุ' },
        { key: 'license_count', dataKey: 'license_count', label: 'จำนวนใบอนุญาต' },
        { key: 'created_at', dataKey: 'created_at', label: 'วันที่สร้าง', type: 'date' }
    ];

    const baseFields = activeBaseFields || defaultBaseFields;

    // Construct headers: [ลำดับที่, base..., custom...]
    const baseHeaders = baseFields.map(f => f.label);
    const customHeaders = customFieldDefs.map(cf => cf.field_label);
    const headers = ['ลำดับที่', ...baseHeaders, ...customHeaders];

    // 🛡️ Safe renderer (ไม่ truncate + ไม่ falsy trap)
    const renderBaseCell = (f, val) => {
        if (f.type === 'date' || f.dataKey === 'created_at') return formatThaiDate(val);
        return safeStr(val);
    };

    const data = shops.map((s, idx) => {
        const baseData = baseFields.map(f => renderBaseCell(f, s[f.dataKey]));
        const customFieldsData = s.custom_fields || {};
        const customData = customFieldDefs.map(cf => formatCustomValue(cf, customFieldsData[cf.field_name]));
        return [String(idx + 1), ...baseData, ...customData];
    });

    const columnWidths = Array(headers.length).fill('auto');

    return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [40, 40, 40, 60],
        watermark: { text: 'ใบอนุญาตประกอบการค้า', color: 'gray', opacity: 0.08, bold: true, italics: false },
        defaultStyle: { font: 'THSarabunNew' },
        header: (currentPage, pageCount) => ({
            text: `หน้า ${currentPage} จาก ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),
        footer: () => ({
            columns: [
                { text: 'เอกสารอิเล็กทรอนิกส์ออกโดยระบบ  ·  สำนักงานเทศบาลเมืองนางรอง', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),
        content: [
            createHeader(title),
            // ✅ แสดง filter info box เหมือน licenses (เดิม shops ไม่มี → inconsistent)
            filters && Object.keys(filters).length > 0 ? createFilterInfo(filters) : null,
            createDataTable(headers, data, { columnWidths })
        ].filter(Boolean),
        styles: getStyles()
    };
}

function createUsersDocDef(users, activeBaseFields = null) {
    const title = 'รายงานข้อมูลผู้ใช้งาน';
    const stats = {
        'ผู้ใช้งานทั้งหมด': users.length,
        'แอดมิน': users.filter(u => u.role === 'admin').length,
        'ผู้ใช้ทั่วไป': users.filter(u => u.role === 'user').length
    };

    // ✅ Match /api/export definition exactly (username, full_name, role, created_at)
    const defaultBaseFields = [
        { key: 'username',   dataKey: 'username',   label: 'ชื่อผู้ใช้' },
        { key: 'full_name',  dataKey: 'full_name',  label: 'ชื่อ-นามสกุล' },
        { key: 'role',       dataKey: 'role',       label: 'สิทธิ์การใช้งาน' },
        { key: 'created_at', dataKey: 'created_at', label: 'วันที่สร้าง', type: 'date' }
    ];

    const baseFields = activeBaseFields || defaultBaseFields;
    // เพิ่ม "ลำดับที่" นำหน้าเพื่อ consistent กับ licenses/shops
    const headers = ['ลำดับที่', ...baseFields.map(f => f.label)];

    // 🛡️ Safe renderer — ใช้ safeStr + handle role mapping safely
    const renderUserCell = (f, val) => {
        if (f.type === 'date' || f.dataKey === 'created_at') return formatThaiDate(val);
        if (f.dataKey === 'role') {
            if (val === null || val === undefined || val === '') return '-';
            return String(val) === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป';
        }
        return safeStr(val);
    };

    const data = users.map((u, idx) => {
        const row = baseFields.map(f => renderUserCell(f, u[f.dataKey]));
        return [String(idx + 1), ...row];
    });

    const columnWidths = Array(headers.length).fill('*');

    return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 40, 40, 60],
        watermark: { text: 'ใบอนุญาตประกอบการค้า', color: 'gray', opacity: 0.08, bold: true, italics: false },
        defaultStyle: { font: 'THSarabunNew' },
        header: (currentPage, pageCount) => ({
            text: `หน้า ${currentPage} จาก ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),
        footer: () => ({
            columns: [
                { text: 'เอกสารอิเล็กทรอนิกส์ออกโดยระบบ  ·  สำนักงานเทศบาลเมืองนางรอง', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),
        content: [
            createHeader(title),
            // createSummaryBox(stats),
            createDataTable(headers, data, {
                columnWidths: columnWidths
            })
        ],
        styles: getStyles()
    };
}

// Main Export Function
export async function generatePdf(type, data, customFieldDefs = [], filters = {}, activeBaseFields = null) {
    // Initialize fonts if not loaded
    if (!fonts) {
        console.log('Initializing fonts for PDF Generator...');
        try {
            const thSarabunRegular = getFontContent('THSarabunNew.ttf');
            const thSarabunBold = getFontContent('THSarabunNew-Bold.ttf');

            fonts = {
                THSarabunNew: {
                    normal: thSarabunRegular,
                    bold: thSarabunBold,
                    italics: thSarabunRegular, // Fallback
                    bolditalics: thSarabunBold // Fallback
                },
                Roboto: {
                    normal: 'Helvetica',
                    bold: 'Helvetica-Bold',
                    italics: 'Helvetica-Oblique',
                    bolditalics: 'Helvetica-BoldOblique'
                }
            };

            // Check if font loaded
            if (!fonts.THSarabunNew.normal) {
                console.warn('THSarabunNew.ttf not found. Using Helvetica fallback.');
                fonts.THSarabunNew = fonts.Roboto;
            } else {
                console.log('Fonts loaded successfully.');
            }
        } catch (fontError) {
            console.error('Error constructing font object:', fontError);
            // Fallback to avoid crash
            fonts = {
                THSarabunNew: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' },
                Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' }
            };
        }
    }

    let printer;
    try {
        printer = new PdfPrinter(fonts);
    } catch (printerError) {
        console.error('Failed to initialize PdfPrinter:', printerError);
        throw new Error('PDF Printer Initialization Failed: ' + printerError.message);
    }

    let docDefinition;

    if (type === 'licenses') {
        docDefinition = createLicensesDocDef(data, customFieldDefs, filters, activeBaseFields);
    } else if (type === 'shops') {
        // ✅ Pass filters → shops PDF จะแสดง filter info box เหมือน licenses
        docDefinition = createShopsDocDef(data, customFieldDefs, activeBaseFields, filters);
    } else if (type === 'users') {
        docDefinition = createUsersDocDef(data, activeBaseFields);
    } else {
        throw new Error('Invalid export type for PDF');
    }

    // Must await the document processing since createPdfKitDocument is async
    let doc;
    try {
        doc = await printer.createPdfKitDocument(docDefinition);
    } catch (docError) {
        console.error('Error creating PDF document:', docError);
        throw docError;
    }

    return new Promise((resolve, reject) => {
        try {
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}
