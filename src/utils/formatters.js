/**
 * Date Formatters
 * Utility functions for consistent date formatting across the app
 */

/**
 * Formats a date string to Thai locale format
 * @param {string} dateString - ISO date string or any valid date
 * @returns {string} Formatted date (e.g., "3 ม.ค. 2026")
 */
/**
 * Fixes date string interpretation by assuming UTC if no timezone is provided
 * This handles cases where DB returns UTC strings without 'Z'
 */
const toDate = (date) => {
    if (!date) return null;
    let d = date;
    if (typeof d === 'string') {
        // Handle YYYY-MM-DD format (from date inputs)
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            // Parse as local date to avoid timezone shifts
            const parts = d.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
            const day = parseInt(parts[2], 10);
            const localDate = new Date(year, month, day);
            
            // Check if the date is valid (e.g., not 2024-02-30)
            if (localDate.getFullYear() === year && 
                localDate.getMonth() === month && 
                localDate.getDate() === day) {
                return localDate;
            }
            return null;
        }
        // Handle ISO strings with timezone
        if (d.includes('T') && !d.endsWith('Z') && !d.includes('+')) {
            d += 'Z';
        }
    }
    return new Date(d);
};

/**
 * Formats a date string to Thai locale format
 * @param {string} dateString - ISO date string or any valid date
 * @returns {string} Formatted date (e.g., "3 ม.ค. 2026")
 */
export const formatThaiDate = (dateString) => {
    if (!dateString) return '-';
    const date = toDate(dateString);
    if (!date || isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Formats a date string to Thai short format (DD/MM/YYYY)
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "03/01/2569")
 */
export const formatThaiDateShort = (dateString) => {
    if (!dateString) return '-';
    const date = toDate(dateString);
    if (!date || isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('th-TH', {
        timeZone: 'Asia/Bangkok',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Formats a date string to full Thai locale format
 * @param {string} dateString - ISO date string
 * @returns {string} Full formatted date (e.g., "3 มกราคม 2026")
 */
export const formatThaiDateFull = (dateString) => {
    if (!dateString) return '-';
    const date = toDate(dateString);
    if (!date || isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Formats a date to Thai datetime format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted datetime
 */
export const formatThaiDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = toDate(dateString);
    if (!date || isNaN(date.getTime())) return '-';

    return date.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

/**
 * Extracts YYYY-MM-DD from ISO date string for form inputs
 * @param {string} isoString - ISO date string
 * @returns {string} Date in YYYY-MM-DD format
 */
export const toInputDateFormat = (isoString) => {
    if (!isoString) return '';
    return isoString.split('T')[0];
};

/**
 * Gets today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Number Formatters
 */

/**
 * Formats number with Thai locale (commas)
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat('th-TH').format(num);
};

/**
 * Formats number as Thai currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(amount);
};

/**
 * String Formatters
 */

/**
 * Truncates text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};

/**
 * Gets first character for avatar
 * @param {string} name - Full name
 * @returns {string} First character uppercase
 */
export const getInitial = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
};
