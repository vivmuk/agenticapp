
import {
    planPost,
    researchTopicStream,
    researchTopicStreamQwen,
    writeDraftStream,
    critiqueDraft,
    finalizePostStream,
    generateImage
} from '@/lib/agents';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const { topic } = await req.json();
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                // Enforce clean event separation
                const sendEvent = (type: string, data: any) => {
                    const json = JSON.stringify({ type, data });
                    // Double newline is critical for SSE
                    controller.enqueue(encoder.encode(`data: ${json}\n\n`));
                };

                const sendLog = (message: string) => {
                    sendEvent('log', { message });
                };

                try {
                    // --- Step 1: Planning ---
                    sendEvent('step_start', { step: 'One', name: 'Planner' });
                    sendLog(`[Planner] Starting plan...`);

                    const plan = await planPost(topic);
                    sendLog(`[Planner] Plan: ${JSON.stringify(plan)}`);
                    sendEvent('step_update', { step: 'One', data: { plan }, status: 'completed' });


                    // --- Step 2: Research ---
                    sendEvent('step_start', { step: 'Two', name: 'Researcher (Grok)' });
                    sendLog(`[Researcher A] Deep diving with Grok...`);

                    const researchRes = await researchTopicStream(topic, plan);
                    const researchReader = researchRes.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullResearch = '';
                    let buffer = '';

                    if (researchReader) {
                        while (true) {
                            const { done, value } = await researchReader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            buffer += chunk;

                            const lines = buffer.split('\n');
                            buffer = lines.pop() || ''; // Keep partial line

                            for (const line of lines) {
                                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                    try {
                                        const json = JSON.parse(line.slice(6));
                                        const content = json.choices?.[0]?.delta?.content || '';
                                        if (content) {
                                            fullResearch += content;
                                            sendEvent('step_stream', { step: 'Two', content: fullResearch });
                                        }
                                    } catch (e) { }
                                }
                            }
                        }
                    }
                    sendLog(`[Researcher A] Primary research complete.`);
                    sendEvent('step_update', { step: 'Two', data: { research: fullResearch }, status: 'completed' });

                    // --- Step 2b: Research (secondary) ---
                    sendEvent('step_start', { step: 'Two_B', name: 'Researcher (Qwen)' });
                    sendLog(`[Researcher B] Cross-verifying with Qwen...`);

                    const researchResQwen = await researchTopicStreamQwen(topic, plan);
                    const researchReaderQwen = researchResQwen.body?.getReader();
                    let fullResearchQwen = '';
                    buffer = '';

                    if (researchReaderQwen) {
                        while (true) {
                            const { done, value } = await researchReaderQwen.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            buffer += chunk;

                            const lines = buffer.split('\n');
                            buffer = lines.pop() || ''; // Keep partial line

                            for (const line of lines) {
                                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                    try {
                                        const json = JSON.parse(line.slice(6));
                                        const content = json.choices?.[0]?.delta?.content || '';
                                        if (content) {
                                            fullResearchQwen += content;
                                            sendEvent('step_stream', { step: 'Two_B', content: fullResearchQwen });
                                        }
                                    } catch (e) { }
                                }
                            }
                        }
                    }
                    sendLog(`[Researcher B] Secondary research complete.`);
                    sendEvent('step_update', { step: 'Two_B', data: { research: fullResearchQwen }, status: 'completed' });

                    // Combine Research
                    fullResearch = `SOURCE A (Deep Search):\n${fullResearch}\n\nSOURCE B (Verification/Alternative Data):\n${fullResearchQwen}`;


                    // --- Step 3: Drafting Loop (3 Iterations) ---
                    const draftsHistory: { round: number, draft: string, critique: any, score: number }[] = [];
                    const writerSteps = ['Three', 'Three_Rev', 'Three_Rev_2'];
                    const criticSteps = ['Four', 'Four_Rev', 'Four_Rev_2'];
                    const writerNames = ['Writer (Initial)', 'Writer (Revision 1)', 'Writer (Revision 2)'];
                    const criticNames = ['Critic (Initial)', 'Critic (Revision 1)', 'Critic (Revision 2)'];

                    for (let i = 0; i < 3; i++) {
                        const stepId = writerSteps[i];
                        const criticId = criticSteps[i];
                        const roundName = writerNames[i];

                        // Prepare context from previous rounds
                        let previousContext = "";
                        if (i > 0) {
                            previousContext = draftsHistory.map(d =>
                                `Round ${d.round + 1} Draft (Score: ${d.score}/10):\nCritique: ${d.critique.critique}\nStrong points: ${d.critique.suggestions.join(", ")}`
                            ).join("\n\n");
                        }

                        // WRITER STEP
                        sendEvent('step_start', { step: stepId, name: roundName });
                        sendLog(`[${roundName}] Drafting iteration ${i + 1}...`);

                        const draftRes = await writeDraftStream(topic, plan, fullResearch, previousContext);
                        const draftReader = draftRes.body?.getReader();
                        let currentDraft = '';
                        buffer = '';

                        if (draftReader) {
                            while (true) {
                                const { done, value } = await draftReader.read();
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
                                                currentDraft += content;
                                                sendEvent('step_stream', { step: stepId, content: currentDraft });
                                            }
                                        } catch (e) { }
                                    }
                                }
                            }
                        }
                        sendLog(`[${roundName}] Draft complete.`);
                        sendEvent('step_update', { step: stepId, data: { draft: currentDraft }, status: 'completed' });

                        // CRITIC STEP
                        sendEvent('step_start', { step: criticId, name: criticNames[i] });
                        sendLog(`[${criticNames[i]}] Reviewing...`);

                        const critique = await critiqueDraft(currentDraft);
                        const averageScore = ((critique.scores?.hook || 0) + (critique.scores?.readability || 0) + (critique.scores?.viralPotential || 0)) / 3;

                        sendLog(`[${criticNames[i]}] Score: ${averageScore.toFixed(1)}/10`);
                        sendEvent('step_update', { step: criticId, data: { review: critique }, status: 'completed' });

                        draftsHistory.push({
                            round: i,
                            draft: currentDraft,
                            critique: critique,
                            score: averageScore
                        });
                    }

                    // --- Selection Logic ---
                    // Sort by score descending
                    draftsHistory.sort((a, b) => b.score - a.score);
                    const bestRound = draftsHistory[0];

                    sendLog(`[Orchestrator] Best draft was Round ${bestRound.round + 1} with score ${bestRound.score.toFixed(1)}.`);


                    // --- Step 5: Finalize ---
                    sendEvent('step_start', { step: 'Five', name: 'Finalizer' });
                    sendLog(`[Finalizer] Polishing best draft (Round ${bestRound.round + 1})...`);

                    // Ensure we pass citations requirement
                    const suggestions = [...(bestRound.critique.suggestions || []), "Include all relevant citations and links from the research in the footer of the post."];
                    const finalRes = await finalizePostStream(bestRound.draft, suggestions);

                    const finalReader = finalRes.body?.getReader();
                    let finalPost = '';
                    buffer = '';

                    if (finalReader) {
                        while (true) {
                            const { done, value } = await finalReader.read();
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
                                            finalPost += content;
                                            sendEvent('step_stream', { step: 'Five', content: finalPost });
                                        }
                                    } catch (e) { }
                                }
                            }
                        }
                    }
                    sendLog(`[Finalizer] Text ready.`);
                    sendEvent('step_update', { step: 'Five', data: { finalPost }, status: 'completed' });

                    // --- Step 6: Visualizer (Image Gen) ---
                    sendEvent('step_start', { step: 'Six', name: 'Visualizer' });
                    sendLog(`[Visualizer] Generating watercolor art...`);

                    const imageUrl = await generateImage(finalPost);

                    if (imageUrl) {
                        sendLog(`[Visualizer] Image generated successfully.`);
                        sendEvent('step_update', { step: 'Six', data: { image: imageUrl }, status: 'completed' });
                    } else {
                        sendLog(`[Visualizer] Failed to generate image.`);
                        sendEvent('step_update', { step: 'Six', status: 'failed' });
                    }

                    // Final payload with everything, stripping <think> tags for clean output
                    const cleanFinalPost = finalPost.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                    sendEvent('workflow_complete', { finalPost: cleanFinalPost, imageUrl });

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
