'use client';

/**
 * Authentication Utilities
 * Centralized auth functions for the application
 */

import Swal from 'sweetalert2';

/**
 * Logout the current user
 * Uses window.location.replace() with cache-busting to ensure full fresh page load
 * @param {Object} options - Logout options
 * @param {boolean} options.showConfirmation - Show confirmation dialog (default: true)
 * @param {string} options.redirectTo - URL to redirect after logout (default: '/login')
 * @returns {Promise<boolean>} - Returns true if logout was successful
 */
export async function logout(options = {}) {
    const {
        showConfirmation = true,
        redirectTo = '/'
    } = options;

    // Show confirmation dialog if requested
    if (showConfirmation) {
        
        const result = await Swal.fire({
            title: 'ยืนยันการออกจากระบบ',
            text: 'คุณต้องการออกจากระบบหรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ออกจากระบบ',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
            customClass: {
                popup: 'colored-toast-modal', // Make sure to add this if needed, or just rely on default
                // For a proper toast match, we might want to just let the modal be a modal.
                // But let's add the TOAST after confirmation.
            }
        });

        if (!result.isConfirmed) {
            return false;
        }
        
        // Show "Logging out" Toast (Red Style)
    /* Toast logic removed */
    }

    try {
        // Call logout API and wait for it to complete
        console.log('Calling logout API...');
        const response = await fetch('/api/auth?action=logout', { 
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Wait for the response to be fully processed
        const data = await response.json();
        console.log('Logout API response:', data);
        
        if (!data.success) {
            console.error('Logout failed:', data.message);
        }

        // Clear any client-side storage
        clearClientStorage();

        // Small delay to ensure server has processed the session destruction
        await new Promise(resolve => setTimeout(resolve, 100));

        // Force full page reload with cache-busting
        console.log('Redirecting to login...');
        const freshUrl = `${redirectTo}?t=${Date.now()}`;
        window.location.replace(freshUrl);

        return true;
    } catch (error) {
        console.error('Logout error:', error);
        
        // Clear storage and redirect anyway
        clearClientStorage();
        window.location.replace(`${redirectTo}?t=${Date.now()}`);
        
        return false;
    }
}

/**
 * Logout without confirmation dialog
 * Useful for automatic logout (session expired, unauthorized, etc.)
 * @param {string} redirectTo - URL to redirect after logout
 */
export async function forceLogout(redirectTo = '/') {
    return logout({
        showConfirmation: false,
        redirectTo
    });
}

/**
 * Clear all client-side storage related to authentication
 */
export function clearClientStorage() {
    try {
        // Preserve rememberMe data (saved username) across logouts
        // Only clear it if the user had unchecked "Remember Me"
        
        // Remove any session-related items
        sessionStorage.clear();
        
        // Remove any auth-related cookies (client-accessible ones)
        // Note: HttpOnly cookies are cleared by the server
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            if (name.includes('session') || name.includes('auth')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });
    } catch (error) {
        console.error('Error clearing client storage:', error);
    }
}

/**
 * Check if user is authenticated
 * @returns {Promise<{authenticated: boolean, user: object|null}>}
 */
export async function checkAuth() {
    try {
        const response = await fetch('/api/auth?action=check', {
            cache: 'no-store',
            credentials: 'include',
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
        });

        const data = await response.json();

        if (data.success) {
            return {
                authenticated: true,
                user: data.user
            };
        }

        return {
            authenticated: false,
            user: null
        };
    } catch (error) {
        console.error('Auth check error:', error?.message || error, error?.stack);
        return {
            authenticated: false,
            user: null
        };
    }
}

/**
 * Redirect to login if not authenticated
 * @param {Function} router - Next.js router (optional, will use window.location if not provided)
 * @returns {Promise<object|null>} - Returns user object if authenticated, null otherwise
 */
export async function requireAuth(router = null) {
    const { authenticated, user } = await checkAuth();

    if (!authenticated) {
        if (router) {
            router.push('/');
        } else {
            window.location.href = '/';
        }
        return null;
    }

    return user;
}

/**
 * Handle session expiration
 * Shows a message and redirects to login
 */
export async function handleSessionExpired() {
    
    await Swal.fire({
        title: 'เซสชันหมดอายุ',
        text: 'กรุณาเข้าสู่ระบบอีกครั้ง',
        icon: 'warning',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#d97706',
        allowOutsideClick: false,
        allowEscapeKey: false
    });

    await forceLogout();
}
