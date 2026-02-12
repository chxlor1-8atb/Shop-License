
import { fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, safeErrorMessage } from '@/lib/api-helpers';
import { getWarningDays } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const warningDays = await getWarningDays();

        const query = `
            SELECT 
                l.id, l.license_number, l.expiry_date, l.status,
                s.shop_name,
                lt.name as type_name,
                (l.expiry_date - CURRENT_DATE) as days_until_expiry
            FROM licenses l
            LEFT JOIN shops s ON l.shop_id = s.id
            LEFT JOIN license_types lt ON l.license_type_id = lt.id
            WHERE 
                l.status NOT IN ('suspended', 'revoked')
                AND (
                    l.expiry_date <= CURRENT_DATE + ($1 || ' days')::INTERVAL
                    OR l.expiry_date < CURRENT_DATE
                )
            ORDER BY days_until_expiry ASC
        `;

        const licenses = await fetchAll(query, [warningDays]);

        return NextResponse.json({
            success: true,
            licenses
        });

    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
