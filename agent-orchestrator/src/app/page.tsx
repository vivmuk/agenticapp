'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Play, Loader2, Terminal, FileText, Search, PenTool, MessageSquare, Star, Image as ImageIcon, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface AgentStepData {
  step: 'One' | 'Two' | 'Two_B' | 'Three' | 'Four' | 'Five' | 'Six' | 'Two_Rev' | 'Three_Rev' | 'Four_Rev' | 'Three_Rev_2' | 'Four_Rev_2';
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data?: any;
  streamContent?: string;
}

// --- Components ---

function AgentCard({ stepData, isActive }: { stepData: AgentStepData, isActive: boolean }) {
  const isCompleted = stepData.status === 'completed';
  const isRunning = stepData.status === 'running';
  const [isExpanded, setIsExpanded] = useState(isActive || isCompleted); // Auto-expand active or new

  // Auto-expand when status changes to running
  useEffect(() => {
    if (isRunning) setIsExpanded(true);
  }, [isRunning]);

  const icons: Record<string, any> = {
    'One': FileText,
    'Two': Search,
    'Two_B': Search,
    'Two_Rev': Search,
    'Three': PenTool,
    'Three_Rev': PenTool,
    'Three_Rev_2': PenTool,
    'Four': MessageSquare,
    'Four_Rev': MessageSquare,
    'Four_Rev_2': MessageSquare,
    'Five': Star,
    'Six': ImageIcon
  };
  const Icon = icons[stepData.step] || FileText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "rounded-xl border transition-all duration-300 overflow-hidden",
        isActive || isCompleted ? "bg-zinc-900 border-zinc-700 shadow-md" : "bg-zinc-900/50 border-zinc-800 opacity-60"
      )}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={clsx(
          "p-2 rounded-lg flex-shrink-0",
          isCompleted ? "bg-emerald-900/30 text-emerald-400" : isRunning ? "bg-blue-900/30 text-blue-400" : "bg-zinc-800 text-zinc-500"
        )}>
          {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
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
            animate={{ height: "auto", opacity: 1 }}
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

              {/* STREAM CONTENT (Research/Drafts) */}
              {stepData.streamContent && !stepData.data?.finalPost && (
                <div className="bg-zinc-950 p-3 rounded-md border border-zinc-800 font-mono text-xs text-zinc-400 max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {stepData.streamContent.replace(/<think>[\s\S]*?<\/think>/g, '')}
                  {isRunning && <span className="animate-pulse inline-block w-1.5 h-3 bg-blue-500 ml-1" />}
                </div>
              )}

              {/* CRITIQUE */}
              {stepData.data?.review && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <ScoreBox label="HOOK" score={stepData.data.review.scores?.hook} />
                    <ScoreBox label="VIRAL" score={stepData.data.review.scores?.viralPotential} />
                    <ScoreBox label="READ" score={stepData.data.review.scores?.readability} />
                  </div>
                  {stepData.data.review.critique && (
                    <p className="text-xs italic text-zinc-400 bg-zinc-950/50 p-2 rounded">
                      "{stepData.data.review.critique}"
                    </p>
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

function ScoreBox({ label, score }: { label: string, score: number }) {
  const color = score >= 8 ? "text-emerald-400" : score >= 5 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="text-center bg-zinc-950 p-2 rounded border border-zinc-800">
      <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{label}</div>
      <div className={clsx("font-mono text-lg font-bold", color)}>{score || 0}<span className="text-zinc-700 text-xs">/10</span></div>
    </div>
  );
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [steps, setSteps] = useState<Record<string, AgentStepData>>({});
  const [finalResult, setFinalResult] = useState<{ post: string, image?: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

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

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
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

          // Splits by double newline which is the standard SSE separator
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep the incomplete last part in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const json = JSON.parse(jsonStr);

                if (json.type === 'log') {
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
                    [json.data.step]: {
                      ...prev[json.data.step],
                      streamContent: json.data.content
                    }
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
                } else if (json.type === 'workflow_complete') {
                  setFinalResult({
                    post: json.data.finalPost,
                    image: json.data.imageUrl
                  });
                }

              } catch (e) {
                // incomplete chunk, ignore till next time
              }
            }
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
        <header className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent font-mono">Venice Agent Swarm</h1>
          <p className="text-zinc-500 text-sm">Orchestrated AI Workflow v2.0</p>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 pb-20">
          {!isGenerating && Object.keys(steps).length === 0 && !finalResult ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-700 space-y-4 border-2 border-dashed border-zinc-900 rounded-xl">
              <Terminal className="w-10 h-10 opacity-50" />
              <p>Ready to deploy swarm.</p>
            </div>
          ) : (
            <>
              {/* Active Steps - Dynamic for History */}
              {Object.keys(steps).map(key => {
                const step = steps[key];
                if (!step) return null;
                return <AgentCard key={key} stepData={step} isActive={step.status === 'running'} />;
              })}

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
                    <button
                      onClick={() => navigator.clipboard.writeText(finalResult.post)}
                      className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 hover:text-emerald-300 transition-colors"
                    >
                      Copy Text
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
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

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-zinc-900 bg-zinc-950 relative z-10">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic needed for viral content..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono shadow-inner"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 lg:px-8 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            <span className="hidden sm:inline">Dispatch Agents</span>
          </button>
        </form>
      </div>

      {/* Right Column: Live Logs */}
      <div className="hidden lg:flex flex-col space-y-4 h-[calc(100vh-3rem)] border-l border-zinc-900 pl-6">
        <header className="flex items-center justify-between text-zinc-500">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider">Neural Stream</h2>
          </div>
          <span className="text-[10px] bg-zinc-900 px-2 py-1 rounded-full border border-zinc-800">
            {isGenerating ? "LIVE" : "IDLE"}
          </span>
        </header>

        <div className="flex-1 bg-black border border-zinc-800 rounded-xl p-0 font-mono text-[10px] sm:text-xs text-zinc-400 overflow-hidden shadow-inner flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {rawLogs.length === 0 ? (
              <div className="text-zinc-800 h-full flex items-center justify-center select-none">
                Waiting for signals...
              </div>
            ) : (
              rawLogs.map((log, i) => (
                <LogEntry key={i} message={log} />
              ))
            )}
            <div ref={logRef} />
          </div>
        </div>
      </div>
    </main>
  );
}

// Collapsible Log Entry
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
