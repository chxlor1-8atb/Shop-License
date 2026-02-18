import { fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, safeErrorMessage } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// Fast dropdown API - minimal data, no complex queries
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000);

        // Simple query - no joins, no subqueries, no counting
        let query = `
            SELECT id, name, validity_days
            FROM license_types 
            ORDER BY name ASC
            LIMIT $1
        `;

        let params = [limit];

        // Add simple search if provided
        if (search && search.trim()) {
            query = `
                SELECT id, name, validity_days
                FROM license_types 
                WHERE name ILIKE $1
                ORDER BY name ASC
                LIMIT $2
            `;
            params = [`%${search.trim()}%`, limit];
        }

        const types = await fetchAll(query, params);

        return NextResponse.json({
            success: true,
            types,
            count: types.length
        });

    } catch (err) {
        return NextResponse.json({ 
            success: false, 
            message: safeErrorMessage(err) 
        }, { status: 500 });
    }
}
