/**
 * Optimized License Types API
 * ใช้ caching และ optimized queries
 */

import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { queryCache, CACHE_KEYS, CACHE_TTL } from '@/lib/performance';
import { requireAuth } from '@/lib/api-helpers';

// Force dynamic for this route - can't use static generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/license-types-optimized
 * Uses caching for better performance
 */
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // Single item - no caching (specific lookup)
        if (id) {
            const type = await fetchOne(
                'SELECT id, name, description, validity_days FROM license_types WHERE id = $1', 
                [id]
            );
            
            return NextResponse.json({ 
                success: true, 
                type 
            });
        }

        // List all - use cache (frequently accessed, rarely changes)
        const types = await queryCache.getOrFetch(
            CACHE_KEYS.LICENSE_TYPES,
            async () => {
                return await fetchAll(
                    'SELECT id, name, description, validity_days FROM license_types ORDER BY name ASC'
                );
            },
            CACHE_TTL.LONG  // Cache for 1 hour
        );

        return NextResponse.json({ 
            success: true, 
            types 
        }, {
            headers: {
                // CDN caching: cache for 1 hour, serve stale for 24 hours while revalidating
                'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
            }
        });

    } catch (err) {
        console.error('License Types GET error:', err);
        return NextResponse.json({ 
            success: false, 
            message: err.message 
        }, { status: 500 });
    }
}

/**
 * POST /api/license-types-optimized
 * Creates new license type and invalidates cache
 */
export async function POST(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { name, description, validity_days } = body;

        if (!name) {
            return NextResponse.json({ 
                success: false, 
                message: 'Name is required' 
            }, { status: 400 });
        }

        const result = await executeQuery(
            `INSERT INTO license_types (name, description, validity_days) 
             VALUES ($1, $2, $3) 
             RETURNING id`,
            [name, description || null, validity_days || 365]
        );

        // Invalidate cache when data changes
        queryCache.invalidate(CACHE_KEYS.LICENSE_TYPES);

        return NextResponse.json({ 
            success: true, 
            message: 'เพิ่มประเภทใบอนุญาตเรียบร้อยแล้ว',
            id: result[0]?.id
        });

    } catch (err) {
        console.error('License Types POST error:', err);
        return NextResponse.json({ 
            success: false, 
            message: err.message 
        }, { status: 500 });
    }
}

/**
 * PUT /api/license-types-optimized
 * Updates license type and invalidates cache
 */
export async function PUT(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { id, name, description, validity_days } = body;

        if (!id || !name) {
            return NextResponse.json({ 
                success: false, 
                message: 'ID and Name are required' 
            }, { status: 400 });
        }

        await executeQuery(
            `UPDATE license_types 
             SET name = $1, description = $2, validity_days = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [name, description || null, validity_days || 365, id]
        );

        // Invalidate cache when data changes
        queryCache.invalidate(CACHE_KEYS.LICENSE_TYPES);

        return NextResponse.json({ 
            success: true, 
            message: 'บันทึกประเภทใบอนุญาตเรียบร้อยแล้ว'
        });

    } catch (err) {
        console.error('License Types PUT error:', err);
        return NextResponse.json({ 
            success: false, 
            message: err.message 
        }, { status: 500 });
    }
}

/**
 * DELETE /api/license-types-optimized
 * Deletes license type and invalidates cache
 */
export async function DELETE(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ 
                success: false, 
                message: 'ID is required' 
            }, { status: 400 });
        }

        await executeQuery('DELETE FROM license_types WHERE id = $1', [id]);

        // Invalidate cache when data changes
        queryCache.invalidate(CACHE_KEYS.LICENSE_TYPES);

        return NextResponse.json({ 
            success: true, 
            message: 'ลบประเภทใบอนุญาตเรียบร้อยแล้ว'
        });

    } catch (err) {
        console.error('License Types DELETE error:', err);
        return NextResponse.json({ 
            success: false, 
            message: err.message 
        }, { status: 500 });
    }
}
