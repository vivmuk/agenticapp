'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Play, Loader2, Terminal, FileText, Search, PenTool, MessageSquare,
    Star, Image as ImageIcon, CheckCircle2, ChevronDown, ChevronUp,
    Share2, Copy, Check, Lightbulb, Database, ShieldCheck, ShieldAlert,
    MessageCircle, Clock
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type StepId =
    | 'One' | 'Two' | 'Two_B' | 'Two_C'
    | 'Three' | 'Three_Rev' | 'Three_Rev_2' | 'Three_Rev_3' | 'Three_Rev_4'
    | 'Four' | 'Four_Rev' | 'Four_Rev_2' | 'Four_Rev_3' | 'Four_Rev_4'
    | 'Five' | 'Six' | 'Seven';

interface AgentStepData {
    step: StepId;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    data?: any;
    streamContent?: string;
}

type Tone = 'Professional' | 'Conversational' | 'Inspirational' | 'Contrarian';

const TONES: { value: Tone; label: string; description: string }[] = [
    { value: 'Professional', label: 'Professional', description: 'Data-driven, authoritative' },
    { value: 'Conversational', label: 'Conversational', description: 'Casual, relatable, direct' },
    { value: 'Inspirational', label: 'Inspirational', description: 'Motivating, story-driven' },
    { value: 'Contrarian', label: 'Contrarian', description: 'Challenges conventional wisdom' },
];

const TOPIC_SUGGESTIONS = [
    'The future of AI agents in the workplace',
    'Why most startups fail at product-market fit',
    'The hidden cost of remote work culture',
    'What nobody tells you about raising Series A',
    'How sleep deprivation kills executive performance',
    'The counterintuitive truth about productivity systems',
];

const STEP_ORDER: StepId[] = [
    'One', 'Two', 'Two_B', 'Two_C',
    'Three', 'Four', 'Three_Rev', 'Four_Rev', 'Three_Rev_2', 'Four_Rev_2',
    'Three_Rev_3', 'Four_Rev_3', 'Three_Rev_4', 'Four_Rev_4',
    'Five', 'Six', 'Seven'
];

// --- AgentCard Component ---

function AgentCard({ stepData, isActive }: { stepData: AgentStepData; isActive: boolean }) {
    const isCompleted = stepData.status === 'completed';
    const isRunning = stepData.status === 'running';
    const [isExpanded, setIsExpanded] = useState(isActive || isCompleted);

    useEffect(() => {
        if (isRunning) setIsExpanded(true);
    }, [isRunning]);

    const icons: Partial<Record<StepId, any>> = {
        One: FileText, Two: Search, Two_B: Search, Two_C: Database,
        Three: PenTool, Three_Rev: PenTool, Three_Rev_2: PenTool, Three_Rev_3: PenTool, Three_Rev_4: PenTool,
        Four: MessageSquare, Four_Rev: MessageSquare, Four_Rev_2: MessageSquare, Four_Rev_3: MessageSquare, Four_Rev_4: MessageSquare,
        Five: Star, Six: ShieldCheck, Seven: ImageIcon
    };
    const Icon = icons[stepData.step] || FileText;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
                "rounded-xl border transition-all duration-300 overflow-hidden",
                isActive || isCompleted
                    ? "bg-zinc-900 border-zinc-700 shadow-md"
                    : "bg-zinc-900/50 border-zinc-800 opacity-60"
            )}
        >
            <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className={clsx(
                    "p-2 rounded-lg flex-shrink-0",
                    isCompleted ? "bg-emerald-900/30 text-emerald-400"
                        : isRunning ? "bg-blue-900/30 text-blue-400"
                            : "bg-zinc-800 text-zinc-500"
                )}>
                    {isRunning
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : isCompleted ? <CheckCircle2 className="w-5 h-5" />
                            : <Icon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-zinc-200 truncate">{stepData.name}</h3>
                    <p className={clsx("text-xs capitalize", stepData.status === 'failed' ? "text-red-400" : "text-zinc-500")}>
                        {stepData.status}
                    </p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-800/50"
                    >
                        <div className="p-4 pt-2 text-sm text-zinc-300 space-y-3">
                            {/* PLAN */}
                            {stepData.data?.plan && (
                                <ul className="list-disc pl-4 space-y-1 text-zinc-400 text-xs">
                                    {stepData.data.plan.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                </ul>
                            )}

                            {/* STRUCTURED RESEARCH */}
                            {stepData.data?.structured && (
                                <div className="space-y-2">
                                    {(['facts', 'stats', 'insights', 'sources'] as const).map(key => (
                                        stepData.data.structured[key]?.length > 0 && (
                                            <div key={key}>
                                                <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1">{key}</div>
                                                <ul className="space-y-0.5">
                                                    {stepData.data.structured[key].slice(0, 4).map((item: string, i: number) => (
                                                        <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                                                            <span className="text-emerald-600 flex-shrink-0">•</span>
                                                            <span className="break-words">{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}

                            {/* STREAM CONTENT */}
                            {stepData.streamContent && !stepData.data?.finalPost && (
                                <div className="bg-zinc-950 p-3 rounded-md border border-zinc-800 font-mono text-xs text-zinc-400 max-h-60 overflow-y-auto whitespace-pre-wrap">
                                    {stepData.streamContent.replace(/<think>[\s\S]*?<\/think>/g, '')}
                                    {isRunning && <span className="animate-pulse inline-block w-1.5 h-3 bg-blue-500 ml-1" />}
                                </div>
                            )}

                            {/* CRITIQUE with specialist breakdown */}
                            {stepData.data?.review && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <ScoreBox label="HOOK" score={stepData.data.review.scores?.hook} />
                                        <ScoreBox label="VIRAL" score={stepData.data.review.scores?.viralPotential} />
                                        <ScoreBox label="READ" score={stepData.data.review.scores?.readability} />
                                    </div>
                                    {stepData.data.review.specialistFeedback && (
                                        <div className="space-y-1.5">
                                            {(['hook', 'readability', 'viral'] as const).map(key => (
                                                stepData.data.review.specialistFeedback[key] && (
                                                    <div key={key} className="flex gap-2 text-xs">
                                                        <span className="text-zinc-600 uppercase font-bold flex-shrink-0 w-12">{key}</span>
                                                        <span className="text-zinc-400 italic">{stepData.data.review.specialistFeedback[key]}</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* FACT CHECK */}
                            {stepData.data?.factCheck !== undefined && (
                                <div className="space-y-2">
                                    <div className={clsx(
                                        "flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border",
                                        stepData.data.verified
                                            ? "bg-emerald-900/20 border-emerald-800 text-emerald-400"
                                            : "bg-amber-900/20 border-amber-800 text-amber-400"
                                    )}>
                                        {stepData.data.verified
                                            ? <><ShieldCheck className="w-4 h-4" /> All claims verified</>
                                            : <><ShieldAlert className="w-4 h-4" /> {stepData.data.issues?.length} issue(s) corrected</>
                                        }
                                    </div>
                                    {stepData.data.issues?.length > 0 && (
                                        <ul className="space-y-1">
                                            {stepData.data.issues.map((issue: string, i: number) => (
                                                <li key={i} className="text-xs text-amber-400 flex gap-1.5">
                                                    <span className="flex-shrink-0">•</span>{issue}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* IMAGE */}
                            {stepData.data?.image && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-zinc-700">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={stepData.data.image} alt="Generated visual" className="w-full h-auto object-cover" />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function ScoreBox({ label, score }: { label: string; score: number }) {
    const color = score >= 8 ? 'text-emerald-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400';
    return (
        <div className="text-center bg-zinc-950 p-2 rounded border border-zinc-800">
            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{label}</div>
            <div className={clsx('font-mono text-lg font-bold', color)}>
                {score || 0}<span className="text-zinc-700 text-xs">/10</span>
            </div>
        </div>
    );
}

function ProgressBar({ steps, isGenerating }: { steps: Record<string, AgentStepData>; isGenerating: boolean }) {
    const completedCount = Object.values(steps).filter(s => s.status === 'completed').length;
    const percentage = isGenerating
        ? Math.min(Math.round((completedCount / STEP_ORDER.length) * 100), 95)
        : completedCount > 0 ? 100 : 0;

    if (!isGenerating && completedCount === 0) return null;

    return (
        <div className="mb-4 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                <span>{isGenerating ? 'Processing...' : 'Complete'}</span>
                <span>{percentage}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                    className={clsx('h-full rounded-full', isGenerating ? 'bg-blue-500' : 'bg-emerald-500')}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-emerald-500 hover:text-emerald-300 transition-colors">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : label}
        </button>
    );
}

function LinkedInShareButton({ text }: { text: string }) {
    const handleShare = () => {
        window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`, '_blank');
    };
    return (
        <button onClick={handleShare} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-blue-400 hover:text-blue-300 transition-colors">
            <Share2 className="w-3 h-3" />
            Share on LinkedIn
        </button>
    );
}

// Human-in-the-loop checkpoint panel
function CheckpointPanel({
    sessionId,
    draft,
    critique,
    score,
    onSubmitted
}: {
    sessionId: string;
    draft: string;
    critique: any;
    score: number;
    onSubmitted: () => void;
}) {
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(90);
    const submitted = useRef(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(interval);
                    if (!submitted.current) autoSubmit();
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const autoSubmit = useCallback(async () => {
        if (submitted.current) return;
        submitted.current = true;
        await fetch('/api/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, feedback: '' })
        });
        onSubmitted();
    }, [sessionId, onSubmitted]);

    const handleSubmit = async () => {
        if (submitted.current || submitting) return;
        submitted.current = true;
        setSubmitting(true);
        await fetch('/api/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, feedback })
        });
        onSubmitted();
    };

    const urgency = countdown <= 15 ? 'text-red-400' : countdown <= 30 ? 'text-amber-400' : 'text-zinc-400';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-amber-600/40 bg-amber-950/20 overflow-hidden shadow-lg"
        >
            <div className="bg-amber-900/20 px-4 py-2.5 border-b border-amber-700/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-amber-300 text-sm">Editor Review</h3>
                    <span className="text-[10px] bg-amber-900/40 border border-amber-800 text-amber-400 px-2 py-0.5 rounded-full font-mono">
                        Score: {score.toFixed(1)}/10
                    </span>
                </div>
                <div className={clsx("flex items-center gap-1 text-xs font-mono", urgency)}>
                    <Clock className="w-3 h-3" />
                    {countdown}s
                </div>
            </div>

            <div className="p-4 space-y-3">
                {/* Score breakdown */}
                <div className="grid grid-cols-3 gap-2">
                    <ScoreBox label="HOOK" score={critique.scores?.hook ?? 0} />
                    <ScoreBox label="VIRAL" score={critique.scores?.viralPotential ?? 0} />
                    <ScoreBox label="READ" score={critique.scores?.readability ?? 0} />
                </div>

                {/* First draft preview */}
                <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-3 max-h-32 overflow-y-auto">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5 font-bold">First Draft Preview</p>
                    <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                        {draft.substring(0, 400)}{draft.length > 400 ? '...' : ''}
                    </p>
                </div>

                {/* Feedback textarea */}
                <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-1.5">
                        Direction for the Writer (optional)
                    </label>
                    <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="e.g. 'Add more stats about ROI', 'Make the hook more provocative', 'Focus on the European market'..."
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600/50 outline-none resize-none transition-all"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => { setFeedback(''); handleSubmit(); }}
                        disabled={submitting}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Skip (auto-continue)
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        {feedback ? 'Apply Direction & Continue' : 'Continue Refining'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// --- Main Page ---

export default function Home() {
    const [topic, setTopic] = useState('');
    const [tone, setTone] = useState<Tone>('Professional');
    const [isGenerating, setIsGenerating] = useState(false);
    const [rawLogs, setRawLogs] = useState<string[]>([]);
    const [steps, setSteps] = useState<Record<string, AgentStepData>>({});
    const [finalResult, setFinalResult] = useState<{ post: string; image?: string; factCheck?: any } | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [checkpoint, setCheckpoint] = useState<{ sessionId: string; draft: string; critique: any; score: number } | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [steps, checkpoint]);

    useEffect(() => {
        logRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [rawLogs]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsGenerating(true);
        setRawLogs([]);
        setSteps({});
        setFinalResult(null);
        setCheckpoint(null);
        setSessionId(null);
        setShowSuggestions(false);

        try {
            const response = await fetch('/api/orchestrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, tone }),
            });

            if (!response.body) throw new Error('No stream');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data: ')) continue;
                        const jsonStr = trimmed.slice(6);
                        if (jsonStr === '[DONE]') continue;

                        try {
                            const json = JSON.parse(jsonStr);

                            if (json.type === 'workflow_start') {
                                setSessionId(json.data.sessionId);
                            } else if (json.type === 'log') {
                                setRawLogs(prev => [...prev, json.data.message]);
                            } else if (json.type === 'step_start') {
                                setSteps(prev => ({
                                    ...prev,
                                    [json.data.step]: {
                                        step: json.data.step,
                                        name: json.data.name,
                                        status: 'running',
                                        streamContent: ''
                                    }
                                }));
                            } else if (json.type === 'step_stream') {
                                setSteps(prev => ({
                                    ...prev,
                                    [json.data.step]: { ...prev[json.data.step], streamContent: json.data.content }
                                }));
                            } else if (json.type === 'step_update') {
                                setSteps(prev => ({
                                    ...prev,
                                    [json.data.step]: {
                                        ...prev[json.data.step],
                                        status: json.data.status,
                                        data: { ...prev[json.data.step]?.data, ...json.data.data }
                                    }
                                }));
                            } else if (json.type === 'human_checkpoint') {
                                setCheckpoint({
                                    sessionId: json.data.sessionId,
                                    draft: json.data.draft,
                                    critique: json.data.critique,
                                    score: json.data.score
                                });
                            } else if (json.type === 'workflow_complete') {
                                setFinalResult({
                                    post: json.data.finalPost,
                                    image: json.data.imageUrl,
                                    factCheck: json.data.factCheck
                                });
                                setCheckpoint(null);
                            }
                        } catch { }
                    }
                }

                if (done) break;
            }
        } catch (error) {
            console.error(error);
            setRawLogs(prev => [...prev, `ERROR: ${error}`]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Column: Workflow */}
            <div className="flex flex-col h-[calc(100vh-3rem)]">
                <header className="mb-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent font-mono">Venice Agent Swarm</h1>
                    <p className="text-zinc-500 text-sm">Orchestrated AI Workflow v3.0</p>
                </header>

                {/* Input Area */}
                <div className="space-y-3 pb-4 border-b border-zinc-900">
                    {/* Tone Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-600">Post Tone</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {TONES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setTone(t.value)}
                                    disabled={isGenerating}
                                    title={t.description}
                                    className={clsx(
                                        "px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border",
                                        tone === t.value
                                            ? "bg-emerald-900/40 border-emerald-600 text-emerald-300"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Topic Input */}
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="Enter a topic for viral content..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono shadow-inner pr-10"
                                disabled={isGenerating}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSuggestions(!showSuggestions)}
                                disabled={isGenerating}
                                title="Show topic suggestions"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                            >
                                <Lightbulb className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={isGenerating || !topic.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 lg:px-8 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                            <span className="hidden sm:inline">Dispatch</span>
                        </button>
                    </form>

                    {/* Topic Suggestions */}
                    <AnimatePresence>
                        {showSuggestions && !isGenerating && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {TOPIC_SUGGESTIONS.map(suggestion => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => { setTopic(suggestion); setShowSuggestions(false); }}
                                            className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-full transition-all truncate max-w-[220px]"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div className="pt-3">
                    <ProgressBar steps={steps} isGenerating={isGenerating} />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 pb-6">
                    {!isGenerating && Object.keys(steps).length === 0 && !finalResult ? (
                        <div className="flex flex-col items-center justify-center h-48 text-zinc-700 space-y-4 border-2 border-dashed border-zinc-900 rounded-xl">
                            <Terminal className="w-10 h-10 opacity-50" />
                            <p className="text-sm">Ready to deploy swarm.</p>
                            <p className="text-xs text-zinc-800">Select a tone and enter a topic above</p>
                        </div>
                    ) : (
                        <>
                            {Object.keys(steps).map(key => {
                                const step = steps[key];
                                if (!step) return null;
                                return <AgentCard key={key} stepData={step} isActive={step.status === 'running'} />;
                            })}

                            {/* Human checkpoint panel */}
                            <AnimatePresence>
                                {checkpoint && (
                                    <CheckpointPanel
                                        key="checkpoint"
                                        sessionId={checkpoint.sessionId}
                                        draft={checkpoint.draft}
                                        critique={checkpoint.critique}
                                        score={checkpoint.score}
                                        onSubmitted={() => setCheckpoint(null)}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Final Result Card */}
                            {finalResult && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-br from-zinc-900 to-black border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl shadow-emerald-900/10 mt-8 mb-4 ring-1 ring-emerald-500/20"
                                >
                                    <div className="bg-emerald-900/20 px-4 py-2 border-b border-emerald-500/20 flex items-center justify-between">
                                        <h2 className="font-bold text-emerald-400 text-sm tracking-wider flex items-center gap-2">
                                            <Star className="w-4 h-4" /> FINAL OUTPUT
                                        </h2>
                                        <div className="flex items-center gap-3">
                                            <LinkedInShareButton text={finalResult.post} />
                                            <CopyButton text={finalResult.post} label="Copy" />
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {/* Metadata badges */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                                                {finalResult.post.split(/\s+/).filter(Boolean).length} words
                                            </span>
                                            <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full font-mono capitalize">
                                                {tone} tone
                                            </span>
                                            {finalResult.factCheck && (
                                                <span className={clsx(
                                                    "text-[10px] border px-2 py-0.5 rounded-full font-mono flex items-center gap-1",
                                                    finalResult.factCheck.verified
                                                        ? "bg-emerald-900/20 border-emerald-800 text-emerald-400"
                                                        : "bg-amber-900/20 border-amber-800 text-amber-400"
                                                )}>
                                                    <ShieldCheck className="w-3 h-3" />
                                                    {finalResult.factCheck.verified ? 'Fact-checked' : `${finalResult.factCheck.issues?.length} corrections`}
                                                </span>
                                            )}
                                        </div>

                                        {/* Post Content */}
                                        <div className="prose prose-invert prose-p:leading-relaxed prose-li:marker:text-emerald-500 prose-sm max-w-none text-zinc-300 font-medium overflow-hidden">
                                            <ReactMarkdown>
                                                {finalResult.post.replace(/<think>[\s\S]*?<\/think>/g, '')}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Generated Image */}
                                        {finalResult.image && (
                                            <div className="rounded-lg overflow-hidden border border-zinc-800 relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={finalResult.image} alt="Generated Art" className="w-full h-auto" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <a
                                                        href={finalResult.image}
                                                        download="venice_art.png"
                                                        target="_blank"
                                                        className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs transform translate-y-2 group-hover:translate-y-0 transition-all"
                                                    >
                                                        Download Full Size
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Right Column: Live Logs */}
            <div className="hidden lg:flex flex-col space-y-4 h-[calc(100vh-3rem)] border-l border-zinc-900 pl-6">
                <header className="flex items-center justify-between text-zinc-500">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        <h2 className="font-mono text-xs font-bold uppercase tracking-wider">Neural Stream</h2>
                    </div>
                    <span className={clsx(
                        "text-[10px] px-2 py-1 rounded-full border font-mono",
                        isGenerating ? "bg-blue-900/20 border-blue-800 text-blue-400 animate-pulse" : "bg-zinc-900 border-zinc-800 text-zinc-600"
                    )}>
                        {isGenerating ? 'LIVE' : 'IDLE'}
                    </span>
                </header>

                <div className="flex-1 bg-black border border-zinc-800 rounded-xl font-mono text-[10px] sm:text-xs text-zinc-400 overflow-hidden shadow-inner flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                        {rawLogs.length === 0 ? (
                            <div className="text-zinc-800 h-full flex items-center justify-center select-none">
                                Waiting for signals...
                            </div>
                        ) : (
                            rawLogs.map((log, i) => <LogEntry key={i} message={log} />)
                        )}
                        <div ref={logRef} />
                    </div>

                    {rawLogs.length > 0 && (
                        <div className="border-t border-zinc-900 px-4 py-2 flex justify-between items-center text-[9px] text-zinc-700">
                            <span>{rawLogs.length} events</span>
                            <button onClick={() => setRawLogs([])} className="hover:text-zinc-500 transition-colors">clear</button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

function LogEntry({ message }: { message: string }) {
    const isError = message.includes('ERROR');
    const [isExpanded, setIsExpanded] = useState(false);
    const isLong = message.length > 200;

    return (
        <div className={clsx(
            "border-b border-zinc-900/50 pb-1 mb-1 break-words hover:bg-zinc-900/30 transition-colors font-mono group cursor-default",
            isError && "text-red-400"
        )}>
            <span className="text-emerald-500/50 mr-2 opacity-50 select-none">
                {new Date().toLocaleTimeString().split(' ')[0]}
            </span>
            <span className={clsx("cursor-pointer", isLong && "hover:text-zinc-200")} onClick={() => isLong && setIsExpanded(!isExpanded)}>
                {isExpanded ? message : (isLong ? message.substring(0, 200) + '...' : message)}
                {isLong && (
                    <span className="text-[9px] text-zinc-600 block pt-1 group-hover:text-zinc-500">
                        {isExpanded ? '[collapse]' : '[expand]'}
                    </span>
                )}
            </span>
        </div>
    );
}
