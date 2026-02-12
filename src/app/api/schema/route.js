
import { NextResponse } from 'next/server';
import { executeQuery, fetchAll } from '@/lib/db';
import { requireAuth, requireAdmin, safeErrorMessage } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table');

        if (!table) {
            return NextResponse.json({ success: false, message: 'Table name is required' }, { status: 400 });
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
        const { table_name, column_key, column_label, column_type } = body;

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
            [table_name, column_key, column_label, column_type || 'text']
        );

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
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
        }

        await executeQuery('DELETE FROM schema_definitions WHERE id = $1', [id]);

        return NextResponse.json({ success: true, message: 'Column removed successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
