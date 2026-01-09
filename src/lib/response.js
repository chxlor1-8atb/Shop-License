import { NextResponse } from 'next/server';

export function success(message, data = null) {
    return NextResponse.json({
        success: true,
        message,
        ...(data && { data }),
    });
}

export function error(message, data = null, status = 400) {
    return NextResponse.json(
        {
            success: false,
            message,
            ...(data && { data }),
        },
        { status }
    );
}
