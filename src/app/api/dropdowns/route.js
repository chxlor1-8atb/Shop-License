import { fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, safeErrorMessage } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// Combined dropdown API - fetch shops + license types in one request
// Reduces 2 HTTP roundtrips to 1, and uses Promise.all for parallel DB queries
export async function GET(request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000);

        // Parallel fetch both datasets in a single API call
        const [shops, types] = await Promise.all([
            fetchAll(
                'SELECT id, shop_name, owner_name FROM shops ORDER BY shop_name ASC LIMIT $1',
                [limit]
            ),
            fetchAll(
                'SELECT id, name, validity_days FROM license_types ORDER BY name ASC LIMIT $1',
                [limit]
            ),
        ]);

        return NextResponse.json({
            success: true,
            shops,
            types,
        });
    } catch (err) {
        return NextResponse.json({
            success: false,
            message: safeErrorMessage(err)
        }, { status: 500 });
    }
}
