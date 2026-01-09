/**
 * Alert Utilities v4.1
 * Modern Toast with Pending Actions (Undo/Cancel support)
 * 
 * Features:
 * - Pending Delete: Shows toast, waits for timer, then executes
 * - Cancel: User can click X to cancel the action
 * - Pause/Resume: Click footer to pause/resume timer
 */

import Swal from 'sweetalert2';

// ============================================
// CUSTOM TOAST SYSTEM WITH PENDING ACTIONS
// ============================================

const TOAST_CONTAINER_ID = 'custom-toast-container';

const Colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    pending: '#8b5cf6'
};

function getContainer() {
    if (typeof window === 'undefined') return null;
    
    let container = document.getElementById(TOAST_CONTAINER_ID);
    if (!container) {
        container = document.createElement('div');
        container.id = TOAST_CONTAINER_ID;
        document.body.appendChild(container);
    }
    return container;
}

function createIcon(type) {
    const icons = {
        success: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="${Colors.success}" stroke-width="2.5" fill="none"/>
            <path d="M10 16.5L14 20.5L22 11.5" stroke="${Colors.success}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        error: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="${Colors.error}" stroke-width="2.5" fill="none"/>
            <path d="M11 11L21 21M21 11L11 21" stroke="${Colors.error}" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`,
        warning: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="${Colors.warning}" stroke-width="2.5" fill="none"/>
            <path d="M16 10V18" stroke="${Colors.warning}" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="16" cy="22" r="1.5" fill="${Colors.warning}"/>
        </svg>`,
        info: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="${Colors.info}" stroke-width="2.5" fill="none"/>
            <path d="M16 15V22" stroke="${Colors.info}" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="16" cy="10" r="1.5" fill="${Colors.info}"/>
        </svg>`,
        pending: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="${Colors.pending}" stroke-width="2.5" fill="none"/>
            <path d="M16 10V16L20 18" stroke="${Colors.pending}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    };
    return icons[type] || icons.info;
}

function createToastElement({ id, type, title, message, duration, showCancel = true }) {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.id = `toast-${id}`;
    toast.style.setProperty('--toast-color', Colors[type] || Colors.info);
    
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-icon">${createIcon(type)}</div>
            <div class="toast-title">${title}</div>
            <div class="toast-actions">
                ${showCancel ? `
                <button class="toast-btn toast-close-btn" type="button" aria-label="ยกเลิก">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                ` : ''}
            </div>
        </div>
        
        <div class="toast-content expanded">
            ${message ? `<p class="toast-message">${message}</p>` : ''}
        </div>
        
        <div class="toast-footer">
            <span class="toast-timer-text">จะดำเนินการใน <strong class="timer-seconds">${Math.ceil(duration / 1000)}</strong> วินาที <span class="timer-action">คลิกเพื่อหยุด</span></span>
        </div>
        
        <div class="toast-progress-container">
            <div class="toast-progress-bar" style="width: 100%"></div>
        </div>
    `;

    return toast;
}

// Active toasts tracking
const activeToasts = new Map();

/**
 * Core toast function with timer
 */
function createToast({ 
    type = 'info', 
    title, 
    message = '', 
    duration = 5000,
    onComplete,
    onCancel,
    isPending = false
}) {
    const container = getContainer();
    if (!container) {
        console.warn('[Toast] Cannot create container - window not available');
        return null;
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const toastEl = createToastElement({ 
        id, 
        type, 
        title, 
        message, 
        duration, 
        showCancel: true 
    });
    
    container.appendChild(toastEl);

    // Timer state
    let isPaused = false;
    let remainingTime = duration;
    let lastTickTime = Date.now();
    let intervalId = null;
    let isCompleted = false;
    let isCancelled = false;

    // Get elements
    const closeBtn = toastEl.querySelector('.toast-close-btn');
    const footer = toastEl.querySelector('.toast-footer');
    const progressBar = toastEl.querySelector('.toast-progress-bar');
    const timerSecondsEl = toastEl.querySelector('.timer-seconds');
    const timerActionEl = toastEl.querySelector('.timer-action');

    // Close toast visually
    const closeToast = () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        activeToasts.delete(id);
        toastEl.classList.add('exiting');
        setTimeout(() => {
            if (toastEl.parentNode) {
                toastEl.parentNode.removeChild(toastEl);
            }
        }, 300);
    };

    // Complete action (timer ended)
    const complete = () => {
        if (isCancelled || isCompleted) return;
        isCompleted = true;
        closeToast();
        if (onComplete) {
            try {
                onComplete();
            } catch (e) {
                console.error('[Toast] onComplete error:', e);
            }
        }
    };

    // Cancel action (user clicked X)
    const cancel = () => {
        if (isCompleted || isCancelled) return;
        isCancelled = true;
        closeToast();
        if (onCancel) {
            try {
                onCancel();
            } catch (e) {
                console.error('[Toast] onCancel error:', e);
            }
        }
    };

    // Toggle pause/resume
    const togglePause = () => {
        isPaused = !isPaused;
        
        if (isPaused) {
            // Pausing - save current remaining time
            timerActionEl.textContent = 'คลิกเพื่อดำเนินการต่อ';
            footer.classList.add('paused');
        } else {
            // Resuming - reset tick time
            lastTickTime = Date.now();
            timerActionEl.textContent = 'คลิกเพื่อหยุด';
            footer.classList.remove('paused');
        }
    };

    // Update display
    const updateDisplay = () => {
        const seconds = Math.ceil(remainingTime / 1000);
        timerSecondsEl.textContent = seconds;
        const progress = (remainingTime / duration) * 100;
        progressBar.style.width = `${Math.max(0, progress)}%`;
    };

    // Timer tick
    const tick = () => {
        if (isPaused) {
            // When paused, just update display without decreasing time
            updateDisplay();
            return;
        }

        const now = Date.now();
        const elapsed = now - lastTickTime;
        lastTickTime = now;
        remainingTime -= elapsed;

        if (remainingTime <= 0) {
            complete();
            return;
        }

        updateDisplay();
    };

    // Event listeners
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            cancel();
        });
    }

    footer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePause();
    });

    // Start timer
    intervalId = setInterval(tick, 100);

    // Store reference
    activeToasts.set(id, {
        element: toastEl,
        close: closeToast,
        cancel,
        complete
    });

    return id;
}

// ============================================
// PUBLIC API - Toast Notifications
// ============================================

export const showSuccess = (message, title = 'สำเร็จ') => {
    return createToast({ 
        type: 'success', 
        title, 
        message, 
        duration: 5000 
    });
};

export const showError = (message, title = 'เกิดข้อผิดพลาด') => {
    return createToast({ 
        type: 'error', 
        title, 
        message, 
        duration: 8000 
    });
};

export const showWarning = (message, title = 'คำเตือน') => {
    return createToast({ 
        type: 'warning', 
        title, 
        message, 
        duration: 6000 
    });
};

export const showInfo = (message, title = 'แจ้งเตือน') => {
    return createToast({ 
        type: 'info', 
        title, 
        message, 
        duration: 5000 
    });
};

// ============================================
// PENDING ACTIONS - Delete with Undo
// ============================================

/**
 * Show pending delete toast
 * Removes item from UI immediately, executes API call after timer
 * User can click X to cancel and restore the item
 */
export const pendingDelete = ({
    itemName = 'รายการ',
    onDelete,
    onCancel,
    duration = 5000
}) => {
    return createToast({
        type: 'warning',
        title: `กำลังจะลบ${itemName}`,
        message: 'กด × เพื่อยกเลิก หรือรอให้หมดเวลาเพื่อลบถาวร',
        duration,
        isPending: true,
        onComplete: onDelete,
        onCancel: () => {
            // Show cancelled toast
            createToast({
                type: 'info',
                title: 'ยกเลิกแล้ว',
                message: `${itemName}ถูกกู้คืนแล้ว`,
                duration: 3000
            });
            if (onCancel) onCancel();
        }
    });
};

/**
 * Show pending action toast (generic)
 */
export const pendingAction = ({
    title,
    message = '',
    onComplete,
    onCancel,
    duration = 5000,
    type = 'pending'
}) => {
    return createToast({
        type,
        title,
        message,
        duration,
        isPending: true,
        onComplete,
        onCancel
    });
};

// ============================================
// CONFIRMATION DIALOGS - SweetAlert2
// ============================================

export const confirmDelete = async (itemName = 'ข้อมูลนี้') => {
    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `${itemName}จะถูกลบถาวร`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก',
        showCloseButton: true,
        reverseButtons: true
    });
    return result.isConfirmed;
};

export const confirm = async ({
    title = 'ยืนยัน?',
    text = '',
    confirmText = 'ตกลง',
    cancelText = 'ยกเลิก',
    icon = 'question'
}) => {
    const result = await Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        showCloseButton: true,
        reverseButtons: true
    });
    return result.isConfirmed;
};

export const showLoading = (message = 'กำลังประมวลผล...') => {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        showCloseButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
};

export const closeAlert = () => {
    Swal.close();
};

// Export toast function for direct use
export const toast = createToast;
