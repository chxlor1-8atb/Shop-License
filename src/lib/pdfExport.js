/**
 * Professional PDF Export Utility
 * Uses pdfmake for beautiful PDF generation
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
    active: { color: COLORS.success, label: 'Active' },
    expired: { color: COLORS.danger, label: 'Expired' },
    pending: { color: COLORS.warning, label: 'Pending' },
    suspended: { color: '#f97316', label: 'Suspended' },
    revoked: { color: COLORS.danger, label: 'Revoked' }
};

// Activity Action Labels
const ACTION_LABELS = {
    LOGIN: 'เข้าสู่ระบบ',
    LOGOUT: 'ออกจากระบบ',
    CREATE: 'สร้าง',
    UPDATE: 'แก้ไข',
    DELETE: 'ลบ',
    EXPORT: 'ส่งออก',
    VIEW: 'ดู'
};

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
                // remove "data:application/octet-stream;base64," header
                const base64 = reader.result.split(',')[1];
                resolve(base64);
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
 * Initialize pdfMake with fonts
 */
async function getPdfMake() {
    try {
        // Dynamic import pdfmake
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        const pdfMake = pdfMakeModule.default || pdfMakeModule;

        if (!pdfMake) {
            throw new Error('Failed to load pdfMake module');
        }

        if (typeof window !== 'undefined' && !window.pdfMake) {
            window.pdfMake = pdfMake;
        }

        // Helper to ensure VFS exists
        if (!pdfMake.vfs) {
            pdfMake.vfs = {};
        }

        // Check and load Thai fonts if missing
        const fontTasks = [];

        if (!pdfMake.vfs['THSarabunNew.ttf']) {
            fontTasks.push(
                loadFont('/fonts/THSarabunNew.ttf').then(data => {
                    if (data) pdfMake.vfs['THSarabunNew.ttf'] = data;
                })
            );
        }

        if (!pdfMake.vfs['THSarabunNew-Bold.ttf']) {
            fontTasks.push(
                loadFont('/fonts/THSarabunNew-Bold.ttf').then(data => {
                    if (data) pdfMake.vfs['THSarabunNew-Bold.ttf'] = data;
                })
            );
        }

        if (fontTasks.length > 0) {
            await Promise.all(fontTasks);
        }

        // Verify fonts loaded successfully
        if (!pdfMake.vfs['THSarabunNew.ttf'] || !pdfMake.vfs['THSarabunNew-Bold.ttf']) {
            console.warn('PDF Export: Failed to load Thai fonts. PDF may not render correctly.');
        }

        // Configure Fonts with fallbacks to prevent crashes
        const thaiFontNormal = pdfMake.vfs['THSarabunNew.ttf'] ? 'THSarabunNew.ttf' : 'Roboto-Regular.ttf';
        const thaiFontBold = pdfMake.vfs['THSarabunNew-Bold.ttf'] ? 'THSarabunNew-Bold.ttf' : thaiFontNormal;

        pdfMake.fonts = {
            Roboto: {
                normal: 'Roboto-Regular.ttf',
                bold: 'Roboto-Medium.ttf',
                italics: 'Roboto-Italic.ttf',
                bolditalics: 'Roboto-MediumItalic.ttf'
            },
            THSarabunNew: {
                normal: thaiFontNormal,
                bold: thaiFontBold,
                italics: thaiFontNormal,
                bolditalics: thaiFontBold
            }
        };

        return pdfMake;
    } catch (error) {
        console.error('Error initializing pdfMake:', error);
        throw error;
    }
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
 * Format datetime to Thai format
 */
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

/**
 * Get current Thai date for document
 */
function getCurrentThaiDate() {
    const date = new Date();
    const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

/**
 * Get common document styles
 */
function getStyles() {
    return {
        headerTitle: {
            fontSize: 22, // Increased for Thai
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
        statValue: {
            fontSize: 24,
            bold: true,
            color: COLORS.primary
        },
        statLabel: {
            fontSize: 14,
            color: COLORS.secondary
        },
        tableHeader: {
            fontSize: 14,
            bold: true
        },
        tableCell: {
            fontSize: 14
        },
        filterTitle: {
            fontSize: 12,
            bold: true,
            color: COLORS.warning
        },
        filterText: {
            fontSize: 12,
            color: COLORS.secondary
        },
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
                            text: subtitle || `วันที่พิมพ์: ${getCurrentThaiDate()}`,
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
    const headerRow = headers.map(h => ({
        text: h,
        style: 'tableHeader',
        fillColor: COLORS.primaryDark,
        color: COLORS.white,
        alignment: 'center',
        margin: [5, 8, 5, 8]
    }));

    // Table data rows
    const dataRows = data.map((row, rowIndex) => {
        return row.map((cell, colIndex) => {
            let cellStyle = {
                text: cell || '-',
                style: 'tableCell',
                alignment: 'center',
                margin: [5, 6, 5, 6],
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

/**
 * Export Licenses to PDF
 */
export async function exportLicensesToPDF(licenses, filters = {}) {
    const pdfMake = await getPdfMake();

    const title = 'รายงานใบอนุญาต'; // Translated title

    // Calculate statistics
    const stats = {
        'ทั้งหมด': licenses.length,
        'ใช้งานปกติ': licenses.filter(l => l.status === 'active').length,
        'หมดอายุ': licenses.filter(l => l.status === 'expired').length,
        'อื่นๆ': licenses.filter(l => !['active', 'expired'].includes(l.status)).length
    };

    // Prepare table data
    const headers = ['เลขที่ใบอนุญาต', 'ชื่อร้านค้า', 'ประเภท', 'วันที่ออก', 'วันหมดอายุ', 'สถานะ'];
    const data = licenses.map(l => [
        l.license_number || '-',
        l.shop_name || '-',
        l.type_name || '-',
        formatThaiDate(l.issue_date),
        formatThaiDate(l.expiry_date),
        STATUS_CONFIG[l.status?.toLowerCase()]?.label || l.status || '-'
    ]);

    // Build document
    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: 'THSarabunNew' }, // Apply Thai font

        header: (currentPage, pageCount) => ({
            text: `หน้า ${currentPage} จาก ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),

        footer: () => ({
            columns: [
                { text: 'ระบบจัดการใบอนุญาต', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),

        content: [
            createHeader(title),
            createSummaryBox(stats),
            filters && Object.keys(filters).length > 0 ? createFilterInfo(filters) : null,
            createDataTable(headers, data, {
                columnWidths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                colorColumn: 5
            })
        ].filter(Boolean),

        styles: getStyles()
    };

    // Generate and download PDF
    pdfMake.createPdf(docDefinition).download(`licenses_${new Date().toISOString().split('T')[0]}.pdf`);
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

    const headers = ['ชื่อร้านค้า', 'เจ้าของ', 'เบอร์โทรศัพท์', 'อีเมล', 'ที่อยู่', 'วันที่สร้าง'];
    const data = shops.map(s => [
        s.shop_name || '-',
        s.owner_name || '-',
        s.phone || '-',
        s.email || '-',
        s.address?.substring(0, 30) + (s.address?.length > 30 ? '...' : '') || '-',
        formatThaiDate(s.created_at)
    ]);

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: 'THSarabunNew' }, // Apply Thai font

        header: (currentPage, pageCount) => ({
            text: `หน้า ${currentPage} จาก ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),

        footer: () => ({
            columns: [
                { text: 'ระบบจัดการใบอนุญาต', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),

        content: [
            createHeader(title),
            createSummaryBox(stats),
            createDataTable(headers, data, {
                columnWidths: ['*', 'auto', 'auto', 'auto', '*', 'auto']
            })
        ],

        styles: getStyles()
    };

    pdfMake.createPdf(docDefinition).download(`shops_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Users to PDF
 */
export async function exportUsersToPDF(users) {
    const pdfMake = await getPdfMake();

    const defaultStyle = {
        font: 'THSarabunNew'
    };

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
        u.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป', // Translate role
        formatThaiDate(u.created_at)
    ]);

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 40, 40, 60],
        defaultStyle, // Apply Thai font globally

        header: (currentPage, pageCount) => ({
            text: `หน้า ${currentPage} จาก ${pageCount}`,
            alignment: 'right',
            margin: [0, 15, 40, 0],
            style: 'pageNumber'
        }),

        footer: () => ({
            columns: [
                { text: 'ระบบจัดการใบอนุญาต', style: 'footer', alignment: 'left', margin: [40, 0, 0, 0] },
                { text: `พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),

        content: [
            createHeader('รายชื่อผู้ใช้งาน', `วันที่พิมพ์: ${getCurrentThaiDate()}`),
            createSummaryBox(stats),
            createDataTable(headers, data, {
                columnWidths: [40, '*', '*', 80, 100]
            })
        ],

        styles: getStyles()
    };

    pdfMake.createPdf(docDefinition).download(`users_${new Date().toISOString().split('T')[0]}.pdf`);
}

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
                text: 'User Credentials',
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
                            { text: userData.password, style: 'valueCellBold', color: COLORS.primary }
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

    pdfMake.createPdf(docDefinition).download(`credential_${userData.username}.pdf`);
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

    const headers = ['เวลา', 'ผู้ใช้งาน', 'กิจกรรม', 'หมวดหมู่', 'รายละเอียด', 'IP'];
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
                { text: `พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
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

    pdfMake.createPdf(docDefinition).download(`activity_logs_${new Date().toISOString().split('T')[0]}.pdf`);
}

export default {
    exportLicensesToPDF,
    exportShopsToPDF,
    exportUsersToPDF,
    exportUserCredentialsPDF,
    exportActivityLogsToPDF
};
