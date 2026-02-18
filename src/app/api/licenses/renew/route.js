
import { fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAdmin, getCurrentUser, safeErrorMessage } from '@/lib/api-helpers';
import { sanitizeInt, sanitizeDate } from '@/lib/security';
import { CACHE_TAGS } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const id = sanitizeInt(body.id, 0, 1);
        const mode = body.mode; // 'one_year' or 'custom'
        const customDate = body.custom_date ? sanitizeDate(body.custom_date) : null;

        if (id < 1) {
            return NextResponse.json({ success: false, message: 'Invalid license ID' }, { status: 400 });
        }

        if (!mode || !['one_year', 'custom'].includes(mode)) {
            return NextResponse.json({ success: false, message: 'Invalid renew mode' }, { status: 400 });
        }

        if (mode === 'custom' && !customDate) {
            return NextResponse.json({ success: false, message: 'กรุณาระบุวันหมดอายุใหม่' }, { status: 400 });
        }

        // Get current license
        const license = await fetchOne('SELECT * FROM licenses WHERE id = $1', [id]);
        if (!license) {
            return NextResponse.json({ success: false, message: 'ไม่พบใบอนุญาต' }, { status: 404 });
        }

        let newExpiryDate;
        let newIssueDate = new Date().toISOString().split('T')[0]; // today

        if (mode === 'one_year') {
            // Calculate new expiry: from current expiry_date + 1 year, or from today + 1 year if already expired
            const currentExpiry = license.expiry_date ? new Date(license.expiry_date) : new Date();
            const today = new Date();
            const baseDate = currentExpiry > today ? currentExpiry : today;
            const newExpiry = new Date(baseDate);
            newExpiry.setFullYear(newExpiry.getFullYear() + 1);
            newExpiryDate = newExpiry.toISOString().split('T')[0];
        } else {
            newExpiryDate = customDate;
        }

        // Update license: set new issue_date, expiry_date, and status to active
        await executeQuery(
            `UPDATE licenses 
             SET issue_date = $1, expiry_date = $2, status = 'active'
             WHERE id = $3`,
            [newIssueDate, newExpiryDate, id]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.LICENSE,
            entityId: id,
            details: `ต่ออายุใบอนุญาต ${license.license_number || id} → หมดอายุ ${newExpiryDate}`
        });

        // Revalidate cache so sidebar badge updates immediately
        revalidateTag(CACHE_TAGS.LICENSES);
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS);

        return NextResponse.json({
            success: true,
            message: `ต่ออายุใบอนุญาตเรียบร้อย (หมดอายุ: ${newExpiryDate})`,
            new_expiry_date: newExpiryDate,
            new_issue_date: newIssueDate
        });
    } catch (err) {
        console.error('[POST /api/licenses/renew] Error:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
