import { useState } from 'react';
import { WorkflowCanvas } from './components/workflow/WorkflowCanvas';
import WorkflowStartForm from './components/workflow/WorkflowStartForm';
import HumanReviewPanel from './components/humanReview/HumanReviewPanel';

function App() {
  const [activeView, setActiveView] = useState<'workflow' | 'review'>('workflow');

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-[#0f0f0f]">
      {/* Header */}
      <header className="border-b border-black/10 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <div className="text-lg font-semibold tracking-tight">Agentic Content Studio</div>
            <div className="text-xs uppercase tracking-[0.2em] text-black/60">Railway · Venice</div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setActiveView('workflow')}
              className={`px-4 py-2 rounded-full border transition ${
                activeView === 'workflow'
                  ? 'border-black bg-black text-white'
                  : 'border-black/15 text-black hover:border-black/40'
              }`}
            >
              Workflow
            </button>
            <button
              onClick={() => setActiveView('review')}
              className={`px-4 py-2 rounded-full border transition ${
                activeView === 'review'
                  ? 'border-black bg-black text-white'
                  : 'border-black/15 text-black hover:border-black/40'
              }`}
            >
              Human Review
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {activeView === 'workflow' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-10 items-start">
            <div className="bg-white border border-black/10 rounded-xl p-5 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-black/60 mb-2">Start</div>
              <h2 className="text-xl font-semibold mb-4">Content Generation</h2>
              <WorkflowStartForm onWorkflowStarted={() => {}} />
            </div>
            <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm h-[720px]">
              <div className="text-xs uppercase tracking-[0.2em] text-black/60 mb-2">Orchestration</div>
              <WorkflowCanvas />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-black/60 mb-2">Review</div>
            <h2 className="text-xl font-semibold mb-4">Human Review</h2>
            <HumanReviewPanel />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
