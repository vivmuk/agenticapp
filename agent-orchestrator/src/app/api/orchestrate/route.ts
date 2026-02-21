
import {
    planPost,
    researchTopicStream,
    researchTopicStreamQwen,
    writeDraftStream,
    critiqueWithSpecialists,
    finalizePostStream,
    generateImage,
    summarizePost,
    structureResearch,
    factCheckPost,
    withRetry
} from '@/lib/agents';
import { waitForHumanInput } from '@/lib/session';

export const runtime = 'nodejs';

// Max writer/critic iterations before forcing finalization
const MAX_ITERATIONS = 5;
// Stop iterating early when average score reaches this threshold
const SCORE_THRESHOLD = 8.0;
// Per-step streaming timeout in ms
const STREAM_TIMEOUT_MS = 90000;

// Reads a streaming Venice SSE response into a string, with a per-step timeout.
// Calls onChunk(accumulated) on each new token for live streaming to the client.
async function readStream(
    response: Response,
    onChunk: (accumulated: string) => void,
    timeoutMs = STREAM_TIMEOUT_MS
): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) return '';

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    const abortTimer = setTimeout(() => {
        reader.cancel('step_timeout').catch(() => { });
    }, timeoutMs);

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.slice(6));
                        const content = json.choices?.[0]?.delta?.content || '';
                        if (content) {
                            fullContent += content;
                            onChunk(fullContent);
                        }
                    } catch { }
                }
            }
        }
    } catch (err: any) {
        if (!String(err).toLowerCase().includes('cancel') && !String(err).toLowerCase().includes('timeout')) {
            throw err;
        }
        console.warn(`Stream cancelled after ${timeoutMs}ms`);
    } finally {
        clearTimeout(abortTimer);
    }

    return fullContent;
}

export async function POST(req: Request) {
    try {
        const { topic, tone } = await req.json();
        const sessionId = crypto.randomUUID();
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (type: string, data: any) => {
                    const json = JSON.stringify({ type, data });
                    controller.enqueue(encoder.encode(`data: ${json}\n\n`));
                };
                const sendLog = (message: string) => sendEvent('log', { message });

                try {
                    // Emit sessionId immediately so the client can use it for human-in-the-loop
                    sendEvent('workflow_start', { sessionId });

                    // --- Step 1: Planning ---
                    sendEvent('step_start', { step: 'One', name: 'Planner' });
                    sendLog('[Planner] Crafting content strategy...');

                    const plan = await withRetry(() => planPost(topic));
                    sendLog(`[Planner] Strategy ready: ${plan.length} steps.`);
                    sendEvent('step_update', { step: 'One', data: { plan }, status: 'completed' });

                    // --- Step 2: Research A (Grok + web search) ---
                    sendEvent('step_start', { step: 'Two', name: 'Researcher (Grok)' });
                    sendLog('[Researcher A] Deep-diving with Grok + web search...');

                    const resA = await withRetry(() => researchTopicStream(topic, plan));
                    const fullResearchA = await readStream(resA, (acc) =>
                        sendEvent('step_stream', { step: 'Two', content: acc })
                    );
                    sendLog('[Researcher A] Primary research complete.');
                    sendEvent('step_update', { step: 'Two', data: { research: fullResearchA }, status: 'completed' });

                    // --- Step 2b: Research B (Qwen + web search) ---
                    sendEvent('step_start', { step: 'Two_B', name: 'Researcher (Qwen)' });
                    sendLog('[Researcher B] Cross-verifying with Qwen...');

                    const resB = await withRetry(() => researchTopicStreamQwen(topic, plan));
                    const fullResearchB = await readStream(resB, (acc) =>
                        sendEvent('step_stream', { step: 'Two_B', content: acc })
                    );
                    sendLog('[Researcher B] Secondary research complete.');
                    sendEvent('step_update', { step: 'Two_B', data: { research: fullResearchB }, status: 'completed' });

                    const combinedResearch = `SOURCE A (Deep Search):\n${fullResearchA}\n\nSOURCE B (Verification):\n${fullResearchB}`;

                    // --- Step 2c: Structure Research (extract facts/stats/insights/sources) ---
                    sendEvent('step_start', { step: 'Two_C', name: 'Research Analyst' });
                    sendLog('[Research Analyst] Extracting structured facts, stats, insights, and sources...');

                    const structured = await withRetry(() => structureResearch(combinedResearch, topic));
                    sendLog(`[Research Analyst] Extracted ${structured.facts.length} facts, ${structured.stats.length} stats, ${structured.sources.length} sources.`);
                    sendEvent('step_update', { step: 'Two_C', data: { structured }, status: 'completed' });

                    // --- Adaptive Draft/Critique Loop ---
                    // Runs up to MAX_ITERATIONS times, stops early when score >= SCORE_THRESHOLD
                    const draftsHistory: { round: number; draft: string; critique: any; score: number }[] = [];
                    const writerSteps = ['Three', 'Three_Rev', 'Three_Rev_2', 'Three_Rev_3', 'Three_Rev_4'];
                    const criticSteps = ['Four', 'Four_Rev', 'Four_Rev_2', 'Four_Rev_3', 'Four_Rev_4'];
                    const writerNames = ['Writer (Draft 1)', 'Writer (Draft 2)', 'Writer (Draft 3)', 'Writer (Draft 4)', 'Writer (Draft 5)'];
                    const criticNames = ['Critic (Round 1)', 'Critic (Round 2)', 'Critic (Round 3)', 'Critic (Round 4)', 'Critic (Round 5)'];

                    let humanFeedback = '';

                    for (let i = 0; i < MAX_ITERATIONS; i++) {
                        const stepId = writerSteps[i];
                        const criticId = criticSteps[i];

                        // Build context from all prior rounds for the writer to improve on
                        const previousContext = draftsHistory.length > 0
                            ? draftsHistory.map(d =>
                                `Draft ${d.round + 1} (Score: ${d.score.toFixed(1)}/10):\n` +
                                `Critique: ${d.critique.critique}\n` +
                                `Fixes suggested: ${d.critique.suggestions.join('; ')}`
                            ).join('\n\n')
                            : '';

                        // WRITER
                        sendEvent('step_start', { step: stepId, name: writerNames[i] });
                        sendLog(`[${writerNames[i]}] Drafting iteration ${i + 1}...`);

                        const draftRes = await withRetry(() =>
                            writeDraftStream(topic, plan, combinedResearch, previousContext, tone, structured, humanFeedback || undefined)
                        );
                        const currentDraft = await readStream(draftRes, (acc) =>
                            sendEvent('step_stream', { step: stepId, content: acc })
                        );
                        sendLog(`[${writerNames[i]}] Draft complete.`);
                        sendEvent('step_update', { step: stepId, data: { draft: currentDraft }, status: 'completed' });

                        // CRITIC - 3 specialists in parallel
                        sendEvent('step_start', { step: criticId, name: criticNames[i] });
                        sendLog(`[${criticNames[i]}] Running 3 specialist critics in parallel (Hook / Readability / Viral)...`);

                        const critique = await withRetry(() => critiqueWithSpecialists(currentDraft));
                        const averageScore = (critique.scores.hook + critique.scores.readability + critique.scores.viralPotential) / 3;

                        sendLog(`[${criticNames[i]}] Hook: ${critique.scores.hook} | Readability: ${critique.scores.readability} | Viral: ${critique.scores.viralPotential} | Avg: ${averageScore.toFixed(1)}`);
                        sendEvent('step_update', { step: criticId, data: { review: critique }, status: 'completed' });

                        draftsHistory.push({ round: i, draft: currentDraft, critique, score: averageScore });

                        // Human-in-the-loop checkpoint after the first draft
                        if (i === 0) {
                            sendLog('[Orchestrator] Pausing for editor review (90s before auto-continue)...');
                            sendEvent('human_checkpoint', {
                                sessionId,
                                draft: currentDraft,
                                critique,
                                score: averageScore,
                                message: 'Review the first draft. Add direction for the writer or click Continue.'
                            });

                            const humanInput = await waitForHumanInput(sessionId, 90000);
                            humanFeedback = humanInput.feedback || '';
                            if (humanFeedback) {
                                sendLog(`[Orchestrator] Editor direction received: "${humanFeedback.substring(0, 80)}..."`);
                            } else {
                                sendLog('[Orchestrator] No direction provided, continuing with AI refinement...');
                            }
                        }

                        // Early exit if quality threshold is met
                        if (averageScore >= SCORE_THRESHOLD) {
                            sendLog(`[Orchestrator] Quality threshold reached (${averageScore.toFixed(1)} >= ${SCORE_THRESHOLD}). Stopping at iteration ${i + 1}.`);
                            break;
                        }
                    }

                    // Select the best draft by average score
                    draftsHistory.sort((a, b) => b.score - a.score);
                    const bestRound = draftsHistory[0];
                    sendLog(`[Orchestrator] Best draft: Round ${bestRound.round + 1} (score ${bestRound.score.toFixed(1)}).`);

                    // --- Step 5: Finalize ---
                    sendEvent('step_start', { step: 'Five', name: 'Finalizer' });
                    sendLog('[Finalizer] Polishing best draft to publication quality...');

                    const suggestions = [
                        ...(bestRound.critique.suggestions || []),
                        'Include all relevant citations and links from the research in the footer.'
                    ];
                    const finalRes = await withRetry(() => finalizePostStream(bestRound.draft, suggestions));
                    const finalPost = await readStream(finalRes, (acc) =>
                        sendEvent('step_stream', { step: 'Five', content: acc })
                    );
                    sendLog('[Finalizer] Text ready.');
                    sendEvent('step_update', { step: 'Five', data: { finalPost }, status: 'completed' });

                    const cleanFinalPost = finalPost.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

                    // --- Step 6: Fact Checker ---
                    sendEvent('step_start', { step: 'Six', name: 'Fact Checker' });
                    sendLog('[Fact Checker] Cross-referencing all claims against research data...');

                    const factCheck = await withRetry(() => factCheckPost(cleanFinalPost, combinedResearch));
                    const verifiedPost = factCheck.correctedPost || cleanFinalPost;

                    if (!factCheck.verified && factCheck.issues.length > 0) {
                        sendLog(`[Fact Checker] Found ${factCheck.issues.length} issue(s). Corrections applied.`);
                        factCheck.issues.forEach((issue, i) => sendLog(`  Issue ${i + 1}: ${issue}`));
                    } else {
                        sendLog('[Fact Checker] All claims verified. No corrections needed.');
                    }
                    sendEvent('step_update', {
                        step: 'Six',
                        data: { factCheck, verified: factCheck.verified, issues: factCheck.issues },
                        status: 'completed'
                    });

                    // --- Step 7: Visualizer ---
                    sendEvent('step_start', { step: 'Seven', name: 'Visualizer' });
                    sendLog('[Visualizer] Summarizing post for image context...');

                    const postSummary = await summarizePost(verifiedPost);
                    sendLog(`[Visualizer] Summary: ${postSummary.substring(0, 100)}...`);
                    sendLog('[Visualizer] Generating watercolor art with seedream-v4...');

                    const imageUrl = await generateImage(verifiedPost, postSummary);
                    if (imageUrl) {
                        sendLog('[Visualizer] Image generated successfully.');
                        sendEvent('step_update', { step: 'Seven', data: { image: imageUrl }, status: 'completed' });
                    } else {
                        sendLog('[Visualizer] Image generation failed.');
                        sendEvent('step_update', { step: 'Seven', status: 'failed' });
                    }

                    sendEvent('workflow_complete', { finalPost: verifiedPost, imageUrl, factCheck });

                } catch (err) {
                    console.error('Orchestration error:', err);
                    sendLog(`ERROR: ${err}`);
                    sendEvent('error', { message: String(err) });
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
}
