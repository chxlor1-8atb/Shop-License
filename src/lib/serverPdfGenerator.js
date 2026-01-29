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
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
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

    const headerRow = headers.map(h => ({
        text: h,
        style: 'tableHeader',
        fillColor: COLORS.primaryDark,
        color: COLORS.white,
        alignment: 'center',
        margin: [5, 8, 5, 8]
    }));

    const dataRows = data.map((row, rowIndex) => {
        return row.map((cell, colIndex) => {
            let cellStyle = {
                text: cell || '-',
                style: 'tableCell',
                alignment: 'center',
                margin: [5, 6, 5, 6],
                fillColor: rowIndex % 2 === 0 ? COLORS.white : COLORS.light
            };

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

function getStyles() {
    return {
        headerTitle: { fontSize: 18, bold: true, color: COLORS.white },
        headerSubtitle: { fontSize: 14, color: COLORS.white },
        headerDate: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
        statValue: { fontSize: 20, bold: true, color: COLORS.primary },
        statLabel: { fontSize: 9, color: COLORS.secondary },
        tableHeader: { fontSize: 10, bold: true },
        tableCell: { fontSize: 9 },
        filterTitle: { fontSize: 9, bold: true, color: COLORS.warning },
        filterText: { fontSize: 8, color: COLORS.secondary },
        pageNumber: { fontSize: 8, color: COLORS.muted },
        footer: { fontSize: 8, color: COLORS.muted }
    };
}

// DocDef Creators
function createLicensesDocDef(licenses, customFieldDefs, filters) {
    const title = 'รายงานใบอนุญาต';
    const stats = {
        'ทั้งหมด': licenses.length,
        'ใช้งานปกติ': licenses.filter(l => l.status === 'active').length,
        'หมดอายุ': licenses.filter(l => l.status === 'expired').length,
        'อื่นๆ': licenses.filter(l => !['active', 'expired'].includes(l.status)).length
    };

    const baseHeaders = ['เลขที่ใบอนุญาต', 'ชื่อร้านค้า', 'ประเภท', 'วันที่ออก', 'วันหมดอายุ', 'สถานะ'];
    const customHeaders = customFieldDefs.map(cf => cf.field_label);
    const headers = [...baseHeaders, ...customHeaders];

    const data = licenses.map(l => {
        const baseData = [
            l.license_number || '-',
            l.shop_name || '-',
            l.type_name || '-',
            formatThaiDate(l.issue_date),
            formatThaiDate(l.expiry_date),
            STATUS_CONFIG[l.status?.toLowerCase()]?.label || l.status || '-'
        ];

        const customFieldsData = l.custom_fields || {};
        const customData = customFieldDefs.map(cf => {
            const value = customFieldsData[cf.field_name];
            if (value === null || value === undefined) return '-';
            if (cf.field_type === 'date' && value) return formatThaiDate(value);
            const stringVal = String(value);
            return stringVal.length > 30 ? stringVal.substring(0, 30) + '...' : stringVal;
        });

        return [...baseData, ...customData];
    });

    const baseWidths = ['auto', '*', 'auto', 'auto', 'auto', 'auto'];
    const customWidths = customFieldDefs.map(() => 'auto');
    const columnWidths = [...baseWidths, ...customWidths];

    return {
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
                colorColumn: 5
            })
        ].filter(Boolean),
        styles: getStyles()
    };
}

function createShopsDocDef(shops, customFieldDefs) {
    const title = 'รายงานร้านค้า';
    const stats = {
        'ร้านค้าทั้งหมด': shops.length
    };

    const baseHeaders = ['ชื่อร้านค้า', 'เจ้าของ', 'เบอร์โทรศัพท์', 'อีเมล', 'ที่อยู่', 'วันที่สร้าง'];
    const customHeaders = customFieldDefs.map(cf => cf.field_label);
    const headers = [...baseHeaders, ...customHeaders];

    const data = shops.map(s => {
        const baseData = [
            s.shop_name || '-',
            s.owner_name || '-',
            s.phone || '-',
            s.email || '-',
            s.address?.substring(0, 30) + (s.address?.length > 30 ? '...' : '') || '-',
            formatThaiDate(s.created_at)
        ];

        const customFieldsData = s.custom_fields || {};
        const customData = customFieldDefs.map(cf => {
            const value = customFieldsData[cf.field_name];
            if (value === null || value === undefined) return '-';
            if (cf.field_type === 'date' && value) return formatThaiDate(value);
            const stringVal = String(value);
            return stringVal.length > 30 ? stringVal.substring(0, 30) + '...' : stringVal;
        });

        return [...baseData, ...customData];
    });

    const baseWidths = ['*', 'auto', 'auto', 'auto', '*', 'auto'];
    const customWidths = customFieldDefs.map(() => 'auto');
    const columnWidths = [...baseWidths, ...customWidths];

    return {
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
            customFieldDefs.length > 0 ? {
                text: `Custom Fields: ${customFieldDefs.map(cf => cf.field_label).join(', ')}`,
                style: 'filterText',
                margin: [0, 0, 0, 10]
            } : null,
            createDataTable(headers, data, { columnWidths })
        ].filter(Boolean),
        styles: getStyles()
    };
}

function createUsersDocDef(users) {
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

    return {
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
                { text: `Printed: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
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
}

// Main Export Function
export async function generatePdf(type, data, customFieldDefs = [], filters = {}) {
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
        docDefinition = createLicensesDocDef(data, customFieldDefs, filters);
    } else if (type === 'shops') {
        docDefinition = createShopsDocDef(data, customFieldDefs);
    } else if (type === 'users') {
        docDefinition = createUsersDocDef(data);
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
