import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin, getCurrentUser, safeErrorMessage } from '@/lib/api-helpers';
import { sanitizeInt, sanitizeString } from '@/lib/security';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';

export const dynamic = 'force-dynamic';

// GET - List all entities
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const rawId = searchParams.get('id');

        if (rawId) {
            const id = sanitizeInt(rawId, 0, 1);
            if (id < 1) {
                return NextResponse.json({ success: false, message: 'Invalid entity ID' }, { status: 400 });
            }
            // Get single entity details
            const entity = await fetchOne('SELECT * FROM entities WHERE id = $1', [id]);
            if (!entity) {
                return NextResponse.json({ success: false, message: 'Entity not found' }, { status: 404 });
            }

            // Get fields for this entity
            const fields = await fetchAll(
                'SELECT * FROM entity_fields WHERE entity_id = $1 ORDER BY display_order ASC',
                [id]
            );

            return NextResponse.json({ success: true, entity: { ...entity, fields } });
        }

        // List all entities
        const entities = await fetchAll('SELECT * FROM entities WHERE is_active = true ORDER BY display_order ASC');
        return NextResponse.json({ success: true, entities });

    } catch (err) {
        console.error('Error fetching entities:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// POST - Create new entity
export async function POST(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const label = sanitizeString(body.label || '', 255);
        const icon = sanitizeString(body.icon || 'fa-folder', 100);
        const description = sanitizeString(body.description || '', 1000);
        const display_order = sanitizeInt(body.display_order, 0, 0, 1000);
        const slug = (body.slug || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');

        if (!slug || slug.length < 2 || !label) {
            return NextResponse.json({
                success: false,
                message: 'slug and label are required'
            }, { status: 400 });
        }

        // Check if slug exists
        const existing = await fetchOne('SELECT id FROM entities WHERE slug = $1', [slug]);
        if (existing) {
            return NextResponse.json({
                success: false,
                message: 'Entity name (slug) already exists'
            }, { status: 400 });
        }

        await executeQuery(
            `INSERT INTO entities (slug, label, icon, description, display_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [slug, label, icon, description, display_order]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.CREATE,
            entityType: ENTITY_TYPES.ENTITY,
            entityId: null,
            details: `สร้าง Entity: ${label} (${slug})`
        });

        return NextResponse.json({ success: true, message: 'Entity created successfully' });

    } catch (err) {
        console.error('Error creating entity:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// PUT - Update entity
export async function PUT(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const id = sanitizeInt(body.id, 0, 1);
        const label = body.label ? sanitizeString(body.label, 255) : null;
        const icon = body.icon ? sanitizeString(body.icon, 100) : null;
        const description = body.description !== undefined ? sanitizeString(body.description, 1000) : null;
        const display_order = body.display_order !== undefined ? sanitizeInt(body.display_order, 0, 0, 1000) : null;
        const is_active = body.is_active !== undefined ? body.is_active : null;

        if (id < 1) return NextResponse.json({ success: false, message: 'Valid ID required' }, { status: 400 });

        await executeQuery(
            `UPDATE entities 
             SET label = COALESCE($1, label),
                 icon = COALESCE($2, icon),
                 description = COALESCE($3, description),
                 display_order = COALESCE($4, display_order),
                 is_active = COALESCE($5, is_active)
             WHERE id = $6`,
            [label, icon, description, display_order, is_active, id]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.ENTITY,
            entityId: id,
            details: `อัปเดต Entity ID: ${id}`
        });

        return NextResponse.json({ success: true, message: 'Entity updated successfully' });

    } catch (err) {
        console.error('Error updating entity:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// DELETE - Delete entity
export async function DELETE(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = sanitizeInt(searchParams.get('id'), 0, 1);

        if (id < 1) return NextResponse.json({ success: false, message: 'Valid ID required' }, { status: 400 });

        await executeQuery('DELETE FROM entities WHERE id = $1', [id]);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.ENTITY,
            entityId: id,
            details: `ลบ Entity ID: ${id}`
        });

        return NextResponse.json({ success: true, message: 'Entity deleted successfully' });

    } catch (err) {
        console.error('Error deleting entity:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
