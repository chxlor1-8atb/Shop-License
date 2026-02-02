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
 * Initialize pdfMake with fonts (including Thai)
 */
let cachedVfs = null;

async function getPdfMake() {
    try {
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        const pdfMake = pdfMakeModule.default || pdfMakeModule;

        if (!pdfMake) throw new Error('Failed to load pdfMake module');

        // Ensure global access and VFS init
        if (typeof window !== 'undefined') window.pdfMake = pdfMake;
        if (!pdfMake.vfs) pdfMake.vfs = {};

        // 1. Try to load default Roboto fonts from package
        try {
            const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
            const pdfFonts = pdfFontsModule.default || pdfFontsModule;
            if (pdfFonts?.pdfMake?.vfs) {
                pdfMake.vfs = { ...pdfMake.vfs, ...pdfFonts.pdfMake.vfs };
            }
        } catch (e) {
            console.warn('Could not load default vfs_fonts:', e);
        }

        // 2. Define Thai Fonts
        const FILE_REGULAR = 'THSarabunNew.ttf';
        const FILE_BOLD = 'THSarabunNew-Bold.ttf';

        // 3. Load missing Thai fonts
        const missingRegular = !pdfMake.vfs[FILE_REGULAR];
        const missingBold = !pdfMake.vfs[FILE_BOLD];

        if (missingRegular || missingBold) {
            console.log('PDF Export: Loading Thai fonts...');
            const tasks = [];

            if (missingRegular) {
                tasks.push(
                    loadFont('/fonts/' + FILE_REGULAR)
                        .then(data => {
                            if (data) pdfMake.vfs[FILE_REGULAR] = data;
                            else console.warn('Failed to load ' + FILE_REGULAR);
                        })
                );
            }

            if (missingBold) {
                tasks.push(
                    loadFont('/fonts/' + FILE_BOLD)
                        .then(data => {
                            if (data) pdfMake.vfs[FILE_BOLD] = data;
                            else console.warn('Failed to load ' + FILE_BOLD);
                        })
                );
            }

            await Promise.all(tasks);
        }

        // 4. Verification & Fallback Strategy
        const vfsKeys = Object.keys(pdfMake.vfs);
        console.log('PDF Export VFS Keys:', vfsKeys);

        const hasRegular = vfsKeys.includes(FILE_REGULAR);
        const hasBold = vfsKeys.includes(FILE_BOLD);

        // Find a fallback font (Roboto or whatever exists) to prevent crash
        const safeFallback = vfsKeys.find(k => k.includes('Roboto-Regular')) || vfsKeys[0];

        if (!hasRegular && !hasBold && !safeFallback) {
            alert('ไม่สามารถโหลดฟอนต์ได้ (VFS Empty) - กรุณารีเฟรชหน้าจอ');
            throw new Error('Critical: No fonts available in VFS');
        }

        // 5. Construct Safe Font Config
        // We ONLY assign keys that definitely exist in VFS
        const regularFont = hasRegular ? FILE_REGULAR : (hasBold ? FILE_BOLD : safeFallback);
        const boldFont = hasBold ? FILE_BOLD : (hasRegular ? FILE_REGULAR : safeFallback);

        console.log(`PDF Font Config: Regular=${regularFont}, Bold=${boldFont}`);

        pdfMake.fonts = {
            Roboto: {
                normal: safeFallback || 'Roboto-Regular.ttf',
                bold: 'Roboto-Medium.ttf',
                italics: 'Roboto-Italic.ttf',
                bolditalics: 'Roboto-MediumItalic.ttf'
            },
            THSarabunNew: {
                normal: regularFont,
                bold: boldFont,
                italics: regularFont,
                bolditalics: boldFont
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
 * Get common document styles
 */
function getStyles() {
    return {
        headerTitle: {
            fontSize: 18,
            bold: true,
            color: COLORS.white
        },
        headerSubtitle: {
            fontSize: 14,
            color: COLORS.white
        },
        headerDate: {
            fontSize: 10,
            color: 'rgba(255,255,255,0.8)'
        },
        statValue: {
            fontSize: 20,
            bold: true,
            color: COLORS.primary
        },
        statLabel: {
            fontSize: 9,
            color: COLORS.secondary
        },
        tableHeader: {
            fontSize: 10,
            bold: true
        },
        tableCell: {
            fontSize: 9
        },
        filterTitle: {
            fontSize: 9,
            bold: true,
            color: COLORS.warning
        },
        filterText: {
            fontSize: 8,
            color: COLORS.secondary
        },
        pageNumber: {
            fontSize: 8,
            color: COLORS.muted
        },
        footer: {
            fontSize: 8,
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
        downloadPdfBlob(pdfMake, docDefinition, `licenses_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
        console.error('PDF Download Error:', e);
        alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
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

    downloadPdfBlob(pdfMake, docDefinition, `shops_${new Date().toISOString().split('T')[0]}.pdf`);
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

    downloadPdfBlob(pdfMake, docDefinition, `users_${new Date().toISOString().split('T')[0]}.pdf`);
}

export default {
    exportLicensesToPDF,
    exportShopsToPDF,
    exportUsersToPDF,
    exportUserCredentialsPDF,
    exportActivityLogsToPDF
};

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

    downloadPdfBlob(pdfMake, docDefinition, `credential_${userData.username}.pdf`);
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

    downloadPdfBlob(pdfMake, docDefinition, `activity_logs_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Helper to download PDF as Blob with correct type
 * Ensures the file is treated as PDF by the browser
 */
function downloadPdfBlob(pdfMake, docDefinition, filename) {
    try {
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        pdfDocGenerator.getBlob((blob) => {
            // Create a new Blob with explicit PDF MIME type
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const url = URL.createObjectURL(pdfBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up - increase timeout to prevent "Site - Failed - Network" error
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 60000);
        });
    } catch (e) {
        console.error('Download Error:', e);
        alert('เกิดข้อผิดพลาดในการดาวน์โหลด: ' + e.message);
    }
}
