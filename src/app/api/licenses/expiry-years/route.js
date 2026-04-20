import { fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, safeErrorMessage } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/licenses/expiry-years
 * คืนค่ารายการปี (ค.ศ.) ที่มีอยู่จริงใน licenses.expiry_date
 * พร้อมคู่ (year, month) ที่มีจริงในแต่ละปี เพื่อให้ client กรอง dropdown เดือนได้
 *
 * Response:
 * {
 *   success: true,
 *   years:  [2027, 2026, 2025, ...],
 *   months: [{ year: 2027, month: 3 }, { year: 2026, month: 12 }, ...]
 * }
 */
export async function GET() {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const rows = await fetchAll(`
            SELECT DISTINCT
                EXTRACT(YEAR  FROM expiry_date)::int AS year,
                EXTRACT(MONTH FROM expiry_date)::int AS month
            FROM licenses
            WHERE expiry_date IS NOT NULL
            ORDER BY year DESC, month ASC
        `);

        const months = rows.map(r => ({ year: r.year, month: r.month }));
        // Distinct years (เรียง DESC — ใหม่สุดก่อน)
        const years = [...new Set(months.map(r => r.year))];

        return NextResponse.json({
            success: true,
            years,
            months,
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, message: safeErrorMessage(err) },
            { status: 500 }
        );
    }
}
