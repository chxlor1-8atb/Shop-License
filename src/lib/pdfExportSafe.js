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
    active: { color: COLORS.success, label: 'Active' },
    expired: { color: COLORS.danger, label: 'Expired' },
    pending: { color: COLORS.warning, label: 'Pending' },
    suspended: { color: '#f97316', label: 'Suspended' },
    revoked: { color: COLORS.danger, label: 'Revoked' }
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
async function getPdfMake() {
    try {
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        const pdfMake = pdfMakeModule.default || pdfMakeModule;

        if (!pdfMake) {
            console.error('Failed to load pdfMake module');
            throw new Error('Failed to load pdfMake module');
        }

        // Fix for vfs_fonts: It expects a global pdfMake object to exist
        if (typeof window !== 'undefined') {
            window.pdfMake = pdfMake;
        }

        // Initialize vfs immediately to prevent "read of undefined" errors
        if (!pdfMake.vfs) {
            pdfMake.vfs = {};
        }

        // Try to load vfs_fonts safely
        try {
            const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
            const pdfFonts = pdfFontsModule.default || pdfFontsModule;

            // Robust vfs assignment
            let vfs = null;
            if (pdfFonts) {
                if (pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
                    vfs = pdfFonts.pdfMake.vfs;
                } else if (pdfFonts.vfs) {
                    vfs = pdfFonts.vfs;
                } else if (window.pdfMake && window.pdfMake.vfs) {
                    vfs = window.pdfMake.vfs;
                }
            }

            if (vfs) {
                pdfMake.vfs = { ...pdfMake.vfs, ...vfs };
            }
        } catch (fontError) {
            console.warn('Failed to load vfs_fonts:', fontError);
            // vfs is already initialized to {} above, so we are safe
        }

        // Load Thai fonts
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const fontTasks = [];
        const requiredFonts = [
            { name: 'THSarabunNew.ttf', url: `${baseUrl}/fonts/THSarabunNew.ttf` },
            { name: 'THSarabunNew-Bold.ttf', url: `${baseUrl}/fonts/THSarabunNew-Bold.ttf` }
        ];

        requiredFonts.forEach(font => {
            if (!pdfMake.vfs[font.name]) {
                fontTasks.push(
                    loadFont(font.url).then(base64 => {
                        if (base64) {
                            pdfMake.vfs[font.name] = base64;
                        }
                    }).catch(err => {
                        console.warn(`Failed to load font ${font.name}:`, err);
                    })
                );
            }
        });

        if (fontTasks.length > 0) {
            await Promise.all(fontTasks);
        }

        // Check if Thai fonts are available
        const hasThaiRegular = typeof pdfMake.vfs['THSarabunNew.ttf'] === 'string';
        const hasThaiBold = typeof pdfMake.vfs['THSarabunNew-Bold.ttf'] === 'string';

        // Fallback if one is missing
        if (hasThaiRegular && !hasThaiBold) {
            pdfMake.vfs['THSarabunNew-Bold.ttf'] = pdfMake.vfs['THSarabunNew.ttf'];
        }
        if (!hasThaiRegular && hasThaiBold) {
            pdfMake.vfs['THSarabunNew.ttf'] = pdfMake.vfs['THSarabunNew-Bold.ttf'];
        }

        // Determine which fonts to use
        const finalRegular = hasThaiRegular || hasThaiBold ? 'THSarabunNew.ttf' : 'Roboto-Regular.ttf';
        const finalBold = hasThaiRegular || hasThaiBold ? 'THSarabunNew-Bold.ttf' : 'Roboto-Medium.ttf';

        // Assign fonts map with Thai support
        pdfMake.fonts = {
            Roboto: {
                normal: 'Roboto-Regular.ttf',
                bold: 'Roboto-Medium.ttf',
                italics: 'Roboto-Italic.ttf',
                bolditalics: 'Roboto-MediumItalic.ttf'
            },
            THSarabunNew: {
                normal: finalRegular,
                bold: finalBold,
                italics: finalRegular,
                bolditalics: finalBold
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

    const title = 'License Report';

    // Calculate statistics
    const stats = {
        'Total': licenses.length,
        'Active': licenses.filter(l => l.status === 'active').length,
        'Expired': licenses.filter(l => l.status === 'expired').length,
        'Other': licenses.filter(l => !['active', 'expired'].includes(l.status)).length
    };

    // Prepare table data
    const headers = ['License No.', 'Shop Name', 'Type', 'Issue Date', 'Expiry Date', 'Status'];
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
                { text: `Printed: ${new Date().toLocaleString('th-TH')}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
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

    const title = 'Shop Report';

    const stats = {
        'Total Shops': shops.length
    };

    const headers = ['Shop Name', 'Owner', 'Phone', 'Email', 'Address', 'Created'];
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
                { text: `Printed: ${new Date().toLocaleString('th-TH')}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
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

    const title = 'User Report';

    const stats = {
        'Total Users': users.length
    };

    const headers = ['No.', 'Username', 'Created'];
    const data = users.map((u, index) => [
        (index + 1).toString(),
        u.username || '-',
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
                { text: `Printed: ${new Date().toLocaleString('th-TH')}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] }
            ],
            margin: [0, 20, 0, 0]
        }),

        content: [
            createHeader(title),
            createSummaryBox(stats),
            createDataTable(headers, data, {
                columnWidths: [50, '*', 100]
            })
        ],

        styles: getStyles()
    };

    pdfMake.createPdf(docDefinition).download(`users_${new Date().toISOString().split('T')[0]}.pdf`);
}

export default {
    exportLicensesToPDF,
    exportShopsToPDF,
    exportUsersToPDF
};
