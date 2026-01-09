/**
 * License Status Constants
 * Single source of truth for all license status values
 */

export const LICENSE_STATUS = {
    ACTIVE: 'active',
    PENDING: 'pending',
    EXPIRED: 'expired',
    SUSPENDED: 'suspended',
    REVOKED: 'revoked'
};

export const STATUS_LABELS = {
    [LICENSE_STATUS.ACTIVE]: 'ปกติ',
    [LICENSE_STATUS.PENDING]: 'กำลังดำเนินการ',
    [LICENSE_STATUS.EXPIRED]: 'หมดอายุ',
    [LICENSE_STATUS.SUSPENDED]: 'ถูกพักใช้',
    [LICENSE_STATUS.REVOKED]: 'ถูกเพิกถอน'
};

export const STATUS_BADGE_CLASSES = {
    [LICENSE_STATUS.ACTIVE]: 'badge-active',
    [LICENSE_STATUS.PENDING]: 'badge-pending',
    [LICENSE_STATUS.EXPIRED]: 'badge-expired',
    [LICENSE_STATUS.SUSPENDED]: 'badge-suspended',
    [LICENSE_STATUS.REVOKED]: 'badge-revoked'
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(
    ([value, label]) => ({ value, label })
);

export const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'ทุกสถานะ' },
    ...STATUS_OPTIONS
];

/**
 * User Role Constants
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    USER: 'user'
};

export const ROLE_LABELS = {
    [USER_ROLES.ADMIN]: 'ผู้ดูแลระบบ',
    [USER_ROLES.USER]: 'ผู้ใช้งาน'
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(
    ([value, label]) => ({ value, label })
);
