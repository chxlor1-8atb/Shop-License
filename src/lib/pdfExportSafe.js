/**
 * Professional PDF Export Utility (Safe Version)
 * ใช้ pdfmake สำหรับสร้าง PDF ที่สวยงาม
 * แก้ไขปัญหา vfs undefined โดยตัด vfs_fonts.js ออกและ init manual
 */

// Color palette for professional look
const COLORS = {
    primary: '#6366f1',      // Indigo
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

// Status colors and labels
const STATUS_CONFIG = {
    active: { color: COLORS.success, label: 'ใช้งานปกติ' },
    expired: { color: COLORS.danger, label: 'หมดอายุ' },
    pending: { color: COLORS.warning, label: 'รออนุมัติ' },
    suspended: { color: '#f97316', label: 'ถูกระงับ' },
    revoked: { color: COLORS.danger, label: 'ถูกเพิกถอน' }
};

/**
 * Mask password for display - shows first 2 chars + asterisks
 * Security: Never export full passwords in plaintext
 */
function maskPassword(password) {
    if (!password) return '********';
    if (password.length <= 4) return '*'.repeat(password.length);
    return password.substring(0, 2) + '*'.repeat(Math.min(password.length - 2, 6));
}

/**
 * Helper to load font file as base64
 */
async function loadFont(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch font: ${url}`);

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Failed to read font blob'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error('Error loading font:', e);
        return null;
    }
}

/**
 * Initialize pdfMake with Thai fonts (THSarabunNew)
 *
 * 🚀 Performance & Reliability:
 *   - Cache pdfMake instance + font base64 ที่ module-level → โหลดครั้งเดียวตลอด session
 *     (เดิม: ทุกครั้งที่กด Export ต้อง import + fetch ~850KB → 2-5 วินาที)
 *   - ข้ามการโหลด Roboto (vfs_fonts) — ไม่ได้ใช้เพราะ defaultStyle.font = 'THSarabunNew'
 *     (เดิม: vfs_fonts API ของ pdfmake v0.3.x เปลี่ยน → merge ไม่สำเร็จ → เสียเวลาเปล่า
 *      + บางกรณี module side-effect ทับ VFS ของเรา → error "not found in VFS")
 *   - ถ้าโหลดฟอนต์ล้มเหลว → throw error ชัดเจน (เดิม: warn แต่ยัง config font แล้ว fail ตอน render)
 *
 * Returns pdfMake instance ที่พร้อมใช้งาน (cached)
 */
let cachedPdfMakePromise = null;

const FILE_REGULAR = 'THSarabunNew.ttf';
const FILE_BOLD = 'THSarabunNew-Bold.ttf';

async function getPdfMake() {
    // ถ้ามี Promise ที่ pending/resolved อยู่ → reuse เลย (ไม่ init ซ้ำ)
    if (cachedPdfMakePromise) return cachedPdfMakePromise;

    cachedPdfMakePromise = (async () => {
        try {
            const t0 = performance.now();

            // 1. Load pdfmake module
            const pdfMakeModule = await import('pdfmake/build/pdfmake');
            const pdfMake = pdfMakeModule.default || pdfMakeModule;
            if (!pdfMake) throw new Error('Failed to load pdfMake module');

            // ⚠️ pdfmake v0.3 API — VFS + fonts ต้องใช้ method ไม่ใช่ assign property
            //    เพราะ internal เก็บไว้ใน private `virtual_fs` instance (ผ่าน writeFileSync)
            //    ไม่ใช่ `pdfMake.vfs` public เหมือน v0.2
            if (typeof pdfMake.addVirtualFileSystem !== 'function') {
                throw new Error('pdfMake.addVirtualFileSystem() ไม่มีอยู่ — อาจเป็น pdfmake เวอร์ชันเก่า (<0.3)');
            }
            if (typeof pdfMake.addFonts !== 'function') {
                throw new Error('pdfMake.addFonts() ไม่มีอยู่ — ตรวจสอบ pdfmake version');
            }

            // Global access (บาง use case ของ pdfmake อ่าน window.pdfMake)
            if (typeof window !== 'undefined') window.pdfMake = pdfMake;

            // 2. Load Thai fonts (parallel) + verify
            //    ใช้ Promise.all + ตรวจผลชัดเจน — ถ้า load fail จะ throw ทันที
            const [regularData, boldData] = await Promise.all([
                loadFont('/fonts/' + FILE_REGULAR),
                loadFont('/fonts/' + FILE_BOLD),
            ]);

            if (!regularData) throw new Error(`ไม่สามารถโหลดฟอนต์ ${FILE_REGULAR} — ตรวจสอบว่าไฟล์มีใน /public/fonts/`);
            if (!boldData)    throw new Error(`ไม่สามารถโหลดฟอนต์ ${FILE_BOLD} — ตรวจสอบว่าไฟล์มีใน /public/fonts/`);

            // 3. Register fonts เข้า internal VFS ผ่าน API v0.3
            //    (เดิมใช้ `pdfMake.vfs = {...}` ซึ่ง v0.3 ไม่อ่าน → font not found error)
            pdfMake.addVirtualFileSystem({
                [FILE_REGULAR]: regularData,
                [FILE_BOLD]: boldData,
            });

            // 4. Register font config ผ่าน API v0.3 (`addFonts` จะ merge เข้ากับ default client fonts)
            pdfMake.addFonts({
                THSarabunNew: {
                    normal: FILE_REGULAR,
                    bold: FILE_BOLD,
                    italics: FILE_REGULAR,
                    bolditalics: FILE_BOLD,
                },
            });

            const elapsed = Math.round(performance.now() - t0);
            console.log(`[PDF Export] pdfMake initialized in ${elapsed}ms (Thai fonts via v0.3 API)`);

            return pdfMake;
        } catch (error) {
            // Reset cache เพื่อให้ครั้งถัดไป retry ได้ (ไม่ติด cache ของ error)
            cachedPdfMakePromise = null;
            console.error('Error initializing pdfMake:', error);
            throw error;
        }
    })();

    return cachedPdfMakePromise;
}

/**
 * Format date to Thai format
 */
function formatThaiDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear() + 543; // Buddhist year
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
}

/**
 * Get current Thai date for document
 */
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

/**
 * Create document header with logo/title
 */
function createHeader(title, subtitle) {
    return {
        table: {
            widths: ['*'],
            body: [
                [{
                    stack: [
                        {
                            text: 'License Management System',
                            style: 'headerTitle',
                            alignment: 'center'
                        },
                        {
                            text: title,
                            style: 'headerSubtitle',
                            alignment: 'center',
                            margin: [0, 5, 0, 0]
                        },
                        {
                            text: subtitle || `Document Date: ${getCurrentThaiDate()}`,
                            style: 'headerDate',
                            alignment: 'center',
                            margin: [0, 5, 0, 0]
                        }
                    ],
                    fillColor: COLORS.primary,
                    margin: [20, 15, 20, 15]
                }]
            ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20]
    };
}

/**
 * Create summary statistics box
 */
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

/**
 * Create professional data table
 */
function createDataTable(headers, data, options = {}) {
    const { columnWidths, colorColumn } = options;

    // Table header row
    // 📏 Padding [5, 10, 5, 10] — font 13pt + ~7.5pt ว่าง บน/ล่าง = row ~28pt สบายตา
    const headerRow = headers.map(h => ({
        text: h,
        style: 'tableHeader',
        fillColor: COLORS.primaryDark,
        color: COLORS.white,
        alignment: 'center',
        margin: [5, 10, 5, 10]
    }));

    // Table data rows
    // 📏 Padding [5, 8, 5, 8] (จาก 6 → 8) — ลด relative differential ของ row heights
    // ที่เกิดจาก character metrics ต่างกัน + content wrap → ตารางดู uniform ขึ้น
    const dataRows = data.map((row, rowIndex) => {
        return row.map((cell, colIndex) => {
            let cellStyle = {
                text: cell || '-',
                style: 'tableCell',
                alignment: 'center',
                margin: [5, 8, 5, 8],
                fillColor: rowIndex % 2 === 0 ? COLORS.white : COLORS.light
            };

            // Apply status color if this is the status column
            if (colorColumn !== undefined && colIndex === colorColumn) {
                const statusKey = Object.keys(STATUS_CONFIG).find(
                    key => STATUS_CONFIG[key].label === cell || key === cell?.toLowerCase()
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
            widths: columnWidths || Array(headers.length).fill('*'),
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

/**
 * Create filter info box
 */
function createFilterInfo(filters) {
    if (!filters || Object.keys(filters).length === 0) return null;

    const filterTexts = Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`);

    if (filterTexts.length === 0) return null;

    return {
        table: {
            widths: ['*'],
            body: [[{
                stack: [
                    { text: 'Filters Applied', style: 'filterTitle' },
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

/* ═══════════════════════════════════════════════════════════════════
 * Official Layout Helpers (ลอกจาก /api/export → serverPdfGenerator.js)
 * ใช้ใน exportExpiringLicensesToPDF เพื่อให้รูปแบบ PDF
 * เป็นแนวเดียวกับรายงานที่ออกจากหน้า /dashboard/export
 * ═══════════════════════════════════════════════════════════════════ */

/**
 * Official header แบบ 2 คอลัมน์ (เหมือน /api/export)
 *   - ซ้าย: ชื่อสำนักงาน / ระบบ / ที่อยู่
 *   - ขวา: ต้นฉบับ ORIGINAL / ชื่อเอกสาร / วันที่ไทย
 *   - เส้นล่างสีเข้ม (2pt)
 */
function createOfficialHeader(title, subtitle) {
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

// Filter label map (ภาษาไทย) — ใช้กับ createOfficialFilterInfo
const FILTER_LABELS_TH = {
    'License Type ID': 'ประเภทใบอนุญาต',
    'Status': 'สถานะ',
    'Expiry From': 'วันหมดอายุ (เริ่มต้น)',
    'Expiry To': 'วันหมดอายุ (สิ้นสุด)',
    'Expiry Month': 'เดือนที่หมดอายุ',
    'Expiry Year': 'ปีที่หมดอายุ (พ.ศ.)',
};

const THAI_MONTH_NAMES = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Official filter info box (เหมือน /api/export)
 *   - หัวข้อ "เงื่อนไขการกรองข้อมูล" สีส้มเข้ม
 *   - พื้นสีเหลืองอ่อน + เส้นขอบสีเหลือง
 *   - แปลง label อังกฤษ → ไทย
 *   - แปลง Expiry Month (1-12) → ชื่อเดือนไทย
 *   - แปลง Expiry Year (ค.ศ.) → พ.ศ.
 *   - แปลง date values → วันที่ไทย
 */
function createOfficialFilterInfo(filters) {
    if (!filters || Object.keys(filters).length === 0) return null;

    const filterTexts = Object.entries(filters)
        .filter(([_, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => {
            const label = FILTER_LABELS_TH[key] || key;
            let displayValue = value;

            if (key === 'Status') {
                const statusKey = Object.keys(STATUS_CONFIG).find(k => k === String(value).toLowerCase());
                if (statusKey) displayValue = STATUS_CONFIG[statusKey].label;
            } else if (key === 'Expiry Month') {
                const m = parseInt(value, 10);
                displayValue = THAI_MONTH_NAMES[m] || value;
            } else if (key === 'Expiry Year') {
                const y = parseInt(value, 10);
                displayValue = !isNaN(y) ? String(y + 543) : value;
            } else if (key.toLowerCase().includes('expiry') && value) {
                // Expiry From / Expiry To → format Thai date
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
                    { text: 'เงื่อนไขการกรองข้อมูล', style: 'filterTitleOfficial' },
                    { text: filterTexts.join(' | '), style: 'filterTextOfficial' }
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

/**
 * Get common document styles
 */
function getStyles() {
    /* 📏 Font size rationale (A4 landscape + THSarabunNew)
     *   • THSarabunNew render เล็กกว่า Helvetica/Arial ขนาดเดียวกัน ~20% → ต้อง compensate
     *   • มาตรฐานเอกสารราชการไทย (TH SarabunPSK/THSarabunNew):
     *       - Body text: 14-16pt  | ในรายงาน PDF/ตาราง: 12pt อ่านชัดสบายตา
     *       - Table header: 13-14pt bold
     *       - Page title: 20-22pt bold
     *   • A4 landscape usable area ≈ 762 × 495 pt → รองรับ body 12pt สบายๆ
     */
    return {
        // ── Legacy header (ใช้โดย exportLicensesToPDF / shops / users ฯลฯ) ──
        headerTitle: {
            fontSize: 20,
            bold: true,
            color: COLORS.white
        },
        headerSubtitle: {
            fontSize: 16,
            color: COLORS.white
        },
        headerDate: {
            fontSize: 12,
            color: 'rgba(255,255,255,0.8)'
        },
        // ── Official header (ลอกจาก /api/export — ใช้โดย exportExpiringLicensesToPDF) ──
        brandName:    { fontSize: 18, bold: true, color: COLORS.dark },
        brandSub:     { fontSize: 14, color: COLORS.secondary },
        brandAddress: { fontSize: 11, color: COLORS.muted, margin: [0, 2, 0, 0] },
        docTitle:     { fontSize: 22, bold: true, color: COLORS.primaryDark },
        docDate:      { fontSize: 12, color: COLORS.dark },
        // ── Summary / Stats ──
        statValue: {
            fontSize: 22,
            bold: true,
            color: COLORS.primary
        },
        statLabel: {
            fontSize: 12,
            color: COLORS.secondary
        },
        // ── Table (body 12pt, header 13pt — มาตรฐานรายงานราชการ) ──
        tableHeader: {
            fontSize: 13,
            bold: true
        },
        tableCell: {
            fontSize: 12
        },
        // ── Filter box (legacy) ──
        filterTitle: {
            fontSize: 12,
            bold: true,
            color: COLORS.warning
        },
        filterText: {
            fontSize: 11,
            color: COLORS.secondary
        },
        // ── Filter box (official — สีส้มเข้ม match backend) ──
        filterTitleOfficial: { fontSize: 13, bold: true, color: '#92400e' },
        filterTextOfficial:  { fontSize: 12, color: '#b45309' },
        // ── Page number / Footer ──
        pageNumber: {
            fontSize: 10,
            color: COLORS.muted
        },
        footer: {
            fontSize: 10,
            color: COLORS.muted
        }
    };
}



/**
 * Export Licenses to PDF
 */
export async function exportLicensesToPDF(licenses, filters = {}) {
    const pdfMake = await getPdfMake();

    const title = 'รายงานใบอนุญาต';

    // Calculate statistics
    const stats = {
        'ทั้งหมด': licenses.length,
        'ใช้งานปกติ': licenses.filter(l => l.status === 'active').length,
        'หมดอายุ': licenses.filter(l => l.status === 'expired').length,
        'อื่นๆ': licenses.filter(l => !['active', 'expired'].includes(l.status)).length
    };

    // Fetch custom field definitions for licenses
    let customFieldDefs = [];
    try {
        const response = await fetch('/api/custom-fields?entity_type=licenses&show_in_table=true');
        const data = await response.json();
        if (data.success) {
            customFieldDefs = (data.fields || []).filter(f => f.show_in_table);
        }
    } catch (error) {
        console.warn('Failed to fetch custom fields for licenses:', error);
    }

    // Build headers dynamically
    const baseHeaders = ['เลขที่ใบอนุญาต', 'ชื่อร้านค้า', 'ประเภท', 'วันที่ออก', 'วันหมดอายุ', 'สถานะ'];
    const customHeaders = customFieldDefs.map(cf => cf.field_label);
    const headers = [...baseHeaders, ...customHeaders];

    // Build data rows dynamically
    const data = licenses.map(l => {
        const baseData = [
            l.license_number || '-',
            l.shop_name || '-',
            l.type_name || '-',
            formatThaiDate(l.issue_date),
            formatThaiDate(l.expiry_date),
            STATUS_CONFIG[l.status?.toLowerCase()]?.label || l.status || '-'
        ];

        // Add custom field values
        const customFieldsData = l.custom_fields || {};
        const customData = customFieldDefs.map(cf => {
            const value = customFieldsData[cf.field_name];
            if (value === null || value === undefined) return '-';

            // Format based on field type
            if (cf.field_type === 'date' && value) {
                return formatThaiDate(value);
            }

            const stringVal = String(value);
            // Truncate long text
            return stringVal.length > 30 ? stringVal.substring(0, 30) + '...' : stringVal;
        });

        return [...baseData, ...customData];
    });

    // Calculate column widths dynamically
    const baseWidths = ['auto', '*', 'auto', 'auto', 'auto', 'auto'];
    const customWidths = customFieldDefs.map(() => 'auto');
    const columnWidths = [...baseWidths, ...customWidths];

    // Build document
    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: 'THSarabunNew' },

        header: (currentPage, pageCount) => ({
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),

        footer: () => ({
            columns: [
                { text: 'License Management System', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `Printed: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),

        content: [
            createHeader(title),
            createSummaryBox(stats),
            filters && Object.keys(filters).length > 0 ? createFilterInfo(filters) : null,
            customFieldDefs.length > 0 ? {
                text: `Custom Fields: ${customFieldDefs.map(cf => cf.field_label).join(', ')}`,
                style: 'filterText',
                margin: [0, 0, 0, 10]
            } : null,
            createDataTable(headers, data, {
                columnWidths: columnWidths,
                colorColumn: 5 // Status column index
            })
        ].filter(Boolean),

        styles: getStyles()
    };

    // Generate and download PDF
    try {
        await downloadPdfBlob(pdfMake, docDefinition, `licenses_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
        console.error('PDF Download Error:', e);
        alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
        throw e;
    }
}

/**
 * Export Expiring Licenses to PDF
 * สำหรับหน้า /dashboard/expiring — แสดงคอลัมน์ที่เหมาะกับการตรวจเช็คใบอนุญาตใกล้หมด
 * รวม: ชื่อร้านค้า / ชื่อเจ้าของ / ประเภท / เลขที่ / วันหมดอายุ / คงเหลือ (วัน) / สถานะ
 *
 * @param {Array} licenses - ข้อมูลใบอนุญาต (ต้องมี days_until_expiry)
 * @param {Object} filters - ตัวกรองที่ใช้ (search/filterType/statusFilter/dateFrom/dateTo)
 */
export async function exportExpiringLicensesToPDF(licenses, filters = {}) {
    const pdfMake = await getPdfMake();

    const title = 'รายงานใบอนุญาตใกล้หมดอายุ';

    // จัดกลุ่มตาม days_until_expiry เพื่อสร้าง stats + ระบุสี
    const classifyExpiry = (days) => {
        const d = parseInt(days);
        if (isNaN(d)) return { key: 'unknown', label: '-', color: COLORS.muted };
        if (d < 0)   return { key: 'expired',  label: 'หมดอายุแล้ว', color: COLORS.danger };
        if (d <= 7)  return { key: 'critical', label: '≤ 7 วัน',     color: '#f97316' /* orange */ };
        if (d <= 14) return { key: 'warning',  label: '8-14 วัน',    color: COLORS.warning };
        return        { key: 'info',     label: '> 14 วัน',    color: COLORS.primary };
    };

    // Summary stats
    const stats = {
        'ทั้งหมด': licenses.length,
        'หมดอายุแล้ว': licenses.filter(l => classifyExpiry(l.days_until_expiry).key === 'expired').length,
        '≤ 7 วัน': licenses.filter(l => classifyExpiry(l.days_until_expiry).key === 'critical').length,
        '8-14 วัน': licenses.filter(l => classifyExpiry(l.days_until_expiry).key === 'warning').length,
        '> 14 วัน': licenses.filter(l => classifyExpiry(l.days_until_expiry).key === 'info').length,
    };

    // Headers — เพิ่มคอลัมน์ "ลำดับที่" นำหน้า (ตามแบบ /api/export)
    const headers = [
        'ลำดับที่',
        'ชื่อร้านค้า',
        'ชื่อเจ้าของ',
        'ประเภท',
        'เลขที่ใบอนุญาต',
        'วันหมดอายุ',
        'คงเหลือ (วัน)',
        'สถานะ'
    ];

    // Header row (สี primaryDark + ตัวหนังสือสีขาว — match /api/export)
    // 📏 Padding [5, 10, 5, 10] — header ต้องเด่น + breathing room พอ
    const headerRow = headers.map(h => ({
        text: h,
        style: 'tableHeader',
        fillColor: COLORS.primaryDark,
        color: COLORS.white,
        alignment: 'center',
        margin: [5, 10, 5, 10]
    }));

    // Data rows — มีลำดับที่ + zebra stripes + สีของ "คงเหลือ" / "สถานะ" ตาม classifyExpiry
    // 📏 Padding [5, 8, 5, 8] (จาก 6) — ลด differential ของ row heights ที่เกิดจาก
    // character metrics ต่างกัน (เช่น ตัว ฎ/ฏ/ญ) → ตารางดู uniform ขึ้น
    const dataRows = licenses.map((l, rowIndex) => {
        const exp = classifyExpiry(l.days_until_expiry);
        const fill = rowIndex % 2 === 0 ? COLORS.white : COLORS.light;
        const daysNum = parseInt(l.days_until_expiry);
        const daysText = isNaN(daysNum)
            ? '-'
            : (daysNum < 0 ? `${Math.abs(daysNum)} วัน (เกิน)` : `${daysNum} วัน`);

        const baseCell = (text) => ({
            text: text || '-',
            style: 'tableCell',
            alignment: 'center',
            margin: [5, 8, 5, 8],
            fillColor: fill
        });

        return [
            baseCell(String(rowIndex + 1)),
            baseCell(l.shop_name),
            baseCell(l.owner_name),
            baseCell(l.type_name),
            baseCell(l.license_number),
            baseCell(formatThaiDate(l.expiry_date)),
            { ...baseCell(daysText), color: exp.color, bold: true },
            { ...baseCell(exp.label), color: exp.color, bold: true }
        ];
    });

    // Column widths — ลำดับที่ แคบ, ชื่อร้าน กว้าง, อื่นๆ auto
    const columnWidths = ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'];

    const table = {
        table: {
            headerRows: 1,
            widths: columnWidths,
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

    // Build document — layout แบบ /api/export
    //   • official 2-column header (สำนักงาน/ระบบ/ที่อยู่ | ORIGINAL/title/date)
    //   • watermark "ใบอนุญาตประกอบการค้า"
    //   • Thai page number "หน้า X จาก Y"
    //   • Thai footer "เอกสารนี้จัดทำโดยระบบคอมพิวเตอร์..." + "พิมพ์เมื่อ..."
    //   • filter info ใช้ label ภาษาไทย + แปลงเดือน/ปี/วันที่
    const docDefinition = {
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
            createOfficialHeader(title),
            filters && Object.keys(filters).length > 0 ? createOfficialFilterInfo(filters) : null,
            licenses.length === 0
                ? { text: 'ไม่พบข้อมูลที่ตรงกับเงื่อนไข', style: 'tableCell', alignment: 'center', margin: [0, 30, 0, 30] }
                : table
        ].filter(Boolean),

        styles: getStyles()
    };

    try {
        await downloadPdfBlob(
            pdfMake,
            docDefinition,
            `expiring_licenses_${new Date().toISOString().split('T')[0]}.pdf`
        );
    } catch (e) {
        console.error('PDF Download Error:', e);
        // โยน error ต่อเพื่อให้ caller (handleExportPDF ในหน้า expiring) จับและ showError ได้ถูกต้อง
        // แทนที่จะกลืน error + Swal success ผิดเพี้ยน
        throw e;
    }
}

/**
 * Export Shops to PDF
 */
export async function exportShopsToPDF(shops) {
    const pdfMake = await getPdfMake();

    const title = 'รายงานร้านค้า';

    const stats = {
        'ร้านค้าทั้งหมด': shops.length
    };

    // Fetch custom field definitions for shops
    let customFieldDefs = [];
    try {
        const response = await fetch('/api/custom-fields?entity_type=shops&show_in_table=true');
        const data = await response.json();
        if (data.success) {
            customFieldDefs = (data.fields || []).filter(f => f.show_in_table);
        }
    } catch (error) {
        console.warn('Failed to fetch custom fields for shops:', error);
    }

    // Build headers dynamically
    const baseHeaders = ['ชื่อร้านค้า', 'เจ้าของ', 'เบอร์โทรศัพท์', 'อีเมล', 'ที่อยู่', 'วันที่สร้าง'];
    const customHeaders = customFieldDefs.map(cf => cf.field_label);
    const headers = [...baseHeaders, ...customHeaders];

    // Build data rows dynamically
    const data = shops.map(s => {
        const baseData = [
            s.shop_name || '-',
            s.owner_name || '-',
            s.phone || '-',
            s.email || '-',
            s.address?.substring(0, 30) + (s.address?.length > 30 ? '...' : '') || '-',
            formatThaiDate(s.created_at)
        ];

        // Add custom field values
        const customFieldsData = s.custom_fields || {};
        const customData = customFieldDefs.map(cf => {
            const value = customFieldsData[cf.field_name];
            if (value === null || value === undefined) return '-';

            // Format based on field type
            if (cf.field_type === 'date' && value) {
                return formatThaiDate(value);
            }

            const stringVal = String(value);
            // Truncate long text
            return stringVal.length > 30 ? stringVal.substring(0, 30) + '...' : stringVal;
        });

        return [...baseData, ...customData];
    });

    // Calculate column widths dynamically
    const baseWidths = ['*', 'auto', 'auto', 'auto', '*', 'auto'];
    const customWidths = customFieldDefs.map(() => 'auto');
    const columnWidths = [...baseWidths, ...customWidths];

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: customFieldDefs.length > 2 ? 'landscape' : 'landscape', // Always landscape for shops
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: 'THSarabunNew' },

        header: (currentPage, pageCount) => ({
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),

        footer: () => ({
            columns: [
                { text: 'License Management System', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `Printed: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),

        content: [
            createHeader(title),
            createSummaryBox(stats),
            customFieldDefs.length > 0 ? {
                text: `Custom Fields: ${customFieldDefs.map(cf => cf.field_label).join(', ')}`,
                style: 'filterText',
                margin: [0, 0, 0, 10]
            } : null,
            createDataTable(headers, data, {
                columnWidths: columnWidths
            })
        ].filter(Boolean),

        styles: getStyles()
    };

    return downloadPdfBlob(pdfMake, docDefinition, `shops_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Users to PDF
 */
export async function exportUsersToPDF(users) {
    const pdfMake = await getPdfMake();

    const title = 'รายงานข้อมูลผู้ใช้งาน';

    const stats = {
        'ผู้ใช้งานทั้งหมด': users.length,
        'แอดมิน': users.filter(u => u.role === 'admin').length,
        'ผู้ใช้ทั่วไป': users.filter(u => u.role === 'user').length
    };

    const headers = ['ลำดับ', 'ชื่อผู้ใช้งาน', 'ชื่อ-นามสกุล', 'สิทธิ์การใช้งาน', 'วันที่สร้าง'];
    const data = users.map((u, index) => [
        (index + 1).toString(),
        u.username || '-',
        u.full_name || '-',
        u.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป',
        formatThaiDate(u.created_at)
    ]);

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: 'THSarabunNew' },

        header: (currentPage, pageCount) => ({
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),

        footer: () => ({
            columns: [
                { text: 'License Management System', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `Printed: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangk ok' })}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),

        content: [
            createHeader(title),
            createSummaryBox(stats),
            createDataTable(headers, data, {
                columnWidths: [50, '*', '*', 'auto', 'auto']
            })
        ],

        styles: getStyles()
    };

    return downloadPdfBlob(pdfMake, docDefinition, `users_${new Date().toISOString().split('T')[0]}.pdf`);
}


const pdfExportSafeFunctions = {
    exportLicensesToPDF,
    exportShopsToPDF,
    exportUsersToPDF,
    exportUserCredentialsPDF,
    exportActivityLogsToPDF
};

export default pdfExportSafeFunctions;

/**
 * Export Single User Credentials to PDF
 */
export async function exportUserCredentialsPDF(userData) {
    const pdfMake = await getPdfMake();

    const docDefinition = {
        pageSize: 'A5',
        pageOrientation: 'landscape',
        pageMargins: [30, 30, 30, 30],
        defaultStyle: { font: 'THSarabunNew' },

        content: [
            {
                text: 'ข้อมูลบัญชีผู้ใช้งาน',
                style: 'headerTitle',
                alignment: 'center',
                color: COLORS.primaryDark,
                margin: [0, 0, 0, 20]
            },
            {
                text: 'ข้อมูลเข้าใช้งานระบบ - กรุณาเก็บรักษาเป็นความลับ',
                alignment: 'center',
                color: COLORS.danger,
                fontSize: 12,
                bold: true,
                margin: [0, 0, 0, 20]
            },
            {
                table: {
                    widths: ['30%', '70%'],
                    body: [
                        [
                            { text: 'ชื่อ-นามสกุล', style: 'labelCell' },
                            { text: userData.full_name || '-', style: 'valueCell' }
                        ],
                        [
                            { text: 'สิทธิ์การใช้งาน', style: 'labelCell' },
                            { text: userData.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป', style: 'valueCell' }
                        ],
                        [
                            { text: 'ชื่อผู้ใช้', style: 'labelCell' },
                            { text: userData.username, style: 'valueCellBold' }
                        ],
                        [
                            { text: 'รหัสผ่าน', style: 'labelCell' },
                            { text: maskPassword(userData.password), style: 'valueCellBold', color: COLORS.primary }
                        ],
                        [
                            { text: 'วันที่สร้าง', style: 'labelCell' },
                            { text: getCurrentThaiDate(), style: 'valueCell' }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => COLORS.border,
                    vLineColor: () => COLORS.border,
                    paddingTop: () => 10,
                    paddingBottom: () => 10,
                    paddingLeft: () => 10,
                    paddingRight: () => 10
                }
            },
            {
                text: 'ผู้ดูแลระบบ',
                alignment: 'right',
                fontSize: 12,
                color: COLORS.muted,
                margin: [0, 30, 0, 0]
            }
        ],

        styles: {
            headerTitle: {
                fontSize: 22,
                bold: true
            },
            labelCell: {
                fontSize: 14,
                color: COLORS.secondary,
                bold: true
            },
            valueCell: {
                fontSize: 14,
                color: COLORS.dark
            },
            valueCellBold: {
                fontSize: 16,
                bold: true,
                color: COLORS.dark
            }
        }
    };

    return downloadPdfBlob(pdfMake, docDefinition, `credential_${userData.username}.pdf`);
}

/**
 * Export Activity Logs to PDF
 */
export async function exportActivityLogsToPDF(logs, filters = {}) {
    const pdfMake = await getPdfMake();

    const title = 'รายงานประวัติกิจกรรม';

    const stats = {
        'จำนวนรายการ': logs.length,
        'เข้าสู่ระบบ': logs.filter(l => l.action === 'LOGIN').length,
        'ดูข้อมูล': logs.filter(l => l.action === 'VIEW').length
    };

    const ACTION_LABELS = {
        LOGIN: 'เข้าสู่ระบบ',
        LOGOUT: 'ออกจากระบบ',
        CREATE: 'สร้าง',
        UPDATE: 'แก้ไข',
        DELETE: 'ลบ',
        EXPORT: 'ส่งออก',
        VIEW: 'ดู'
    };

    const headers = ['เวลา', 'ผู้ใช้งาน', 'กิจกรรม', 'หมวดหมู่', 'รายละเอียด', 'IP'];

    // Helper to format datetime
    function formatThaiDateTime(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear() + 543;
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch {
            return dateStr;
        }
    }

    const data = logs.map(l => [
        formatThaiDateTime(l.created_at),
        l.user_name || l.username || '-',
        ACTION_LABELS[l.action] || l.action || '-',
        l.entity_type || '-',
        l.details || '-',
        l.ip_address || '-'
    ]);

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: 'THSarabunNew' },

        header: (currentPage, pageCount) => ({
            text: `หน้า ${currentPage} จาก ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),

        footer: () => ({
            columns: [
                { text: 'ระบบจัดการใบอนุญาต', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),

        content: [
            createHeader(title),
            createSummaryBox(stats),
            filters && Object.keys(filters).length > 0 ? createFilterInfo(filters) : null,
            createDataTable(headers, data, {
                columnWidths: ['auto', 'auto', 'auto', 'auto', '*', 'auto']
            })
        ],

        styles: getStyles()
    };

    return downloadPdfBlob(pdfMake, docDefinition, `activity_logs_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Helper to download PDF as Blob with correct type
 * Ensures the file is treated as PDF by the browser
 *
 * ✅ pdfmake v0.3: `getBlob()` เป็น async function ที่คืน Promise<Blob>
 *    (v0.2 ใช้ callback — deprecated ใน v0.3)
 *
 *    Using `await` directly:
 *      • จับ error ได้ถูกต้อง (ถ้า render fail → promise rejects → catch ทำงาน)
 *      • ไม่เสี่ยง Swal loading ค้างเมื่อ pdfmake throw ภายใน
 *      • user-gesture chain ครบ (onClick → await → link.click())
 */
async function downloadPdfBlob(pdfMake, docDefinition, filename) {
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    // pdfmake v0.3 getBlob() returns Promise<Blob> — await ตรงๆ
    const blob = await pdfDocGenerator.getBlob();

    // Force explicit PDF MIME type (บาง browser ใช้ generic type ถ้าไม่ระบุ)
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up - delay เพื่อกัน "Network Failed" ใน Chrome เวลา blob ยังถูก stream
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
