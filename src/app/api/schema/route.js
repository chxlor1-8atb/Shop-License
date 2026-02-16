
import { NextResponse } from 'next/server';
import { executeQuery, fetchAll } from '@/lib/db';
import { requireAuth, requireAdmin, getCurrentUser, safeErrorMessage } from '@/lib/api-helpers';
import { sanitizeInt, sanitizeString, validateEnum } from '@/lib/security';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';

const ALLOWED_TABLES = ['shops', 'licenses', 'license_types', 'users'];
const ALLOWED_COLUMN_TYPES = ['text', 'number', 'date', 'select', 'boolean', 'textarea'];

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const table = validateEnum(sanitizeString(searchParams.get('table')), ALLOWED_TABLES, '');

        if (!table) {
            return NextResponse.json({ success: false, message: 'Valid table name is required' }, { status: 400 });
        }

        const columns = await fetchAll(
            'SELECT * FROM schema_definitions WHERE table_name = $1 ORDER BY display_order ASC, created_at ASC',
            [table]
        );

        return NextResponse.json({ success: true, columns });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function POST(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const table_name = validateEnum(sanitizeString(body.table_name), ALLOWED_TABLES, '');
        const column_key = sanitizeString(body.column_key || '', 100);
        const column_label = sanitizeString(body.column_label || '', 255);
        const column_type = validateEnum(sanitizeString(body.column_type), ALLOWED_COLUMN_TYPES, 'text');

        if (!table_name || !column_key || !column_label) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // Check if key exists
        const exists = await fetchAll(
            'SELECT id FROM schema_definitions WHERE table_name = $1 AND column_key = $2',
            [table_name, column_key]
        );

        if (exists.length > 0) {
            return NextResponse.json({ success: false, message: 'Column key already exists' }, { status: 400 });
        }

        await executeQuery(
            `INSERT INTO schema_definitions (table_name, column_key, column_label, column_type)
             VALUES ($1, $2, $3, $4)`,
            [table_name, column_key, column_label, column_type]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.CREATE,
            entityType: ENTITY_TYPES.SETTINGS,
            entityId: null,
            details: `เพิ่ม Schema Column: ${column_label} (${table_name}.${column_key})`
        });

        return NextResponse.json({ success: true, message: 'Column added successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function DELETE(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = sanitizeInt(searchParams.get('id'), 0, 1);

        if (id < 1) {
            return NextResponse.json({ success: false, message: 'Valid ID is required' }, { status: 400 });
        }

        await executeQuery('DELETE FROM schema_definitions WHERE id = $1', [id]);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.SETTINGS,
            entityId: id,
            details: `ลบ Schema Column ID: ${id}`
        });

        return NextResponse.json({ success: true, message: 'Column removed successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
