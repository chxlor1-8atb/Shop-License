/**
 * Security Utilities
 * Provides input validation, sanitization, and security helpers
 */

// ========================================
// Input Validation
// ========================================

/**
 * Validate and sanitize integer input
 * @param {any} value - Input value
 * @param {number} defaultValue - Default if invalid
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Validated integer
 */
export function sanitizeInt(value, defaultValue = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.min(Math.max(parsed, min), max);
}

/**
 * Sanitize string input - removes dangerous characters
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized string
 */
export function sanitizeString(str, maxLength = 255) {
    if (typeof str !== 'string') return '';
    return str
        .trim()
        .slice(0, maxLength)
        .replace(/[<>]/g, ''); // Remove basic HTML tags
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format (Thai format)
 * @param {string} phone - Phone to validate
 * @returns {boolean} Is valid phone
 */
export function isValidPhone(phone) {
    const phoneRegex = /^[0-9\-\+\s\(\)]{8,20}$/;
    return phoneRegex.test(phone);
}

// ========================================
// SQL Safety
// ========================================

/**
 * Validate pagination parameters
 * @param {any} page - Page number
 * @param {any} limit - Items per page
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function validatePagination(page, limit) {
    const validPage = sanitizeInt(page, 1, 1, 10000);
    const validLimit = sanitizeInt(limit, 20, 1, 100); // Max 100 items per page
    const offset = (validPage - 1) * validLimit;
    return { page: validPage, limit: validLimit, offset };
}

/**
 * Validate allowed values (for status, role, etc.)
 * @param {string} value - Value to check
 * @param {string[]} allowedValues - Array of allowed values
 * @param {string} defaultValue - Default if not allowed
 * @returns {string} Validated value
 */
export function validateEnum(value, allowedValues, defaultValue = '') {
    if (!value) return defaultValue;
    return allowedValues.includes(value) ? value : defaultValue;
}

// ========================================
// XSS Prevention
// ========================================

/**
 * Escape HTML entities to prevent XSS
 * @param {string} str - String to escape  
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    return str.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
}

/**
 * Sanitize object values for safe output
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
export function sanitizeOutput(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'string') {
            sanitized[key] = escapeHtml(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeOutput(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

// ========================================
// Security Headers
// ========================================

/**
 * Get security headers for API responses
 * @returns {object} Security headers
 */
export function getSecurityHeaders() {
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
}

// ========================================
// Rate Limiting Helper (Simple in-memory)
// ========================================

const rateLimitStore = new Map();

/**
 * Simple in-memory rate limiter
 * @param {string} key - Unique key (e.g., IP address)
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} Is rate limited
 */
export function isRateLimited(key, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    // Reset if window expired
    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + windowMs;
    }

    record.count++;
    rateLimitStore.set(key, record);

    // Cleanup old entries periodically
    if (rateLimitStore.size > 10000) {
        for (const [k, v] of rateLimitStore) {
            if (now > v.resetAt) rateLimitStore.delete(k);
        }
    }

    return record.count > maxRequests;
}

// ========================================
// Authentication Helpers
// ========================================

/**
 * Validate password strength (Strong Password Policy)
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (optional but recommended)
 * 
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, message: string, strength: 'weak'|'medium'|'strong' }}
 */
export function validatePassword(password) {
    if (!password) {
        return { valid: false, message: 'กรุณากรอกรหัสผ่าน', strength: 'weak' };
    }

    if (password.length < 8) {
        return { valid: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', strength: 'weak' };
    }

    if (password.length > 128) {
        return { valid: false, message: 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร', strength: 'weak' };
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
        return { valid: false, message: 'รหัสผ่านนี้ง่ายเกินไป กรุณาใช้รหัสผ่านที่ปลอดภัยกว่านี้', strength: 'weak' };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase) {
        return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)', strength: 'weak' };
    }

    if (!hasLowercase) {
        return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว (a-z)', strength: 'weak' };
    }

    if (!hasNumber) {
        return { valid: false, message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว (0-9)', strength: 'medium' };
    }

    // Calculate strength
    let strength = 'medium';
    if (hasSpecial && password.length >= 12) {
        strength = 'strong';
    } else if (hasSpecial || password.length >= 10) {
        strength = 'medium';
    }

    return { valid: true, message: '', strength };
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {{ valid: boolean, message: string }}
 */
export function validateUsername(username) {
    if (!username || username.length < 3) {
        return { valid: false, message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' };
    }
    if (username.length > 50) {
        return { valid: false, message: 'ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { valid: false, message: 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9 และ _ เท่านั้น' };
    }
    return { valid: true, message: '' };
}
