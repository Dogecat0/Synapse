// src/app/api/import/route.ts
import { NextResponse } from 'next/server';
import { processJournalImport } from '../../../lib/importAgent';

export const dynamic = 'force-dynamic'; // Ensures this route is not statically cached

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { journalText } = body;

        if (!journalText || typeof journalText !== 'string') {
            return NextResponse.json({ error: 'journalText is required' }, { status: 400 });
        }

        // Use a ReadableStream to send progress updates to the client.
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                const enqueue = (message: string) => {
                    controller.enqueue(encoder.encode(message + '\n'));
                };

                try {
                    // processJournalImport now takes the enqueue function as its progress callback
                    await processJournalImport(journalText, enqueue);
                } catch (error: any) {
                    enqueue(`❌ An unexpected error occurred on the server: ${error.message}`);
                } finally {
                    controller.close();
                }
            },
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('[Import API] Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}