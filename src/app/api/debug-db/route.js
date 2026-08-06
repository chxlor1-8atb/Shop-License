import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const rows = await query('SELECT id, license_number, issue_date FROM licenses WHERE EXTRACT(YEAR FROM issue_date) = 2002');
        return NextResponse.json({ success: true, rows });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
