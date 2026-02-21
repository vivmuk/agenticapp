
// Server-side in-memory session store for human-in-the-loop workflow pauses.
// Works for single-instance deployments (Railway, etc.).

export interface HumanReview {
    action: 'continue';
    feedback: string;
}

interface SessionEntry {
    resolve?: (value: HumanReview) => void;
    review?: HumanReview;
}

const sessionStore = new Map<string, SessionEntry>();

export function waitForHumanInput(sessionId: string, timeoutMs: number = 90000): Promise<HumanReview> {
    return new Promise((resolve) => {
        const existing = sessionStore.get(sessionId);
        if (existing?.review) {
            sessionStore.delete(sessionId);
            resolve(existing.review);
            return;
        }

        const timer = setTimeout(() => {
            sessionStore.delete(sessionId);
            resolve({ action: 'continue', feedback: '' });
        }, timeoutMs);

        sessionStore.set(sessionId, {
            resolve: (value: HumanReview) => {
                clearTimeout(timer);
                resolve(value);
            }
        });
    });
}

export function submitHumanInput(sessionId: string, review: HumanReview): boolean {
    const session = sessionStore.get(sessionId);
    if (session?.resolve) {
        session.resolve(review);
        sessionStore.delete(sessionId);
        return true;
    }
    // Store for later if the workflow hasn't reached the checkpoint yet
    sessionStore.set(sessionId, { review });
    return false;
}
