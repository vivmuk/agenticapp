
import { submitHumanInput } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const { sessionId, feedback } = await req.json();
        if (!sessionId) {
            return new Response(JSON.stringify({ error: 'sessionId is required' }), { status: 400 });
        }
        const submitted = submitHumanInput(sessionId, { action: 'continue', feedback: feedback || '' });
        return new Response(JSON.stringify({ ok: true, submitted }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }
}
