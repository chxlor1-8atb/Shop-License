/**
 * Date Formatters
 * Utility functions for consistent date formatting across the app
 */

/**
 * Formats a date string to Thai locale format
 * @param {string} dateString - ISO date string or any valid date
 * @returns {string} Formatted date (e.g., "3 ม.ค. 2026")
 */
export const formatThaiDate = (dateString) => {
    if (!dateString) return '-';

    return new Date(dateString).toLocaleDateString('th-TH', {
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

    return new Date(dateString).toLocaleDateString('th-TH', {
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

    return new Date(dateString).toLocaleDateString('th-TH', {
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

    return new Date(dateString).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
