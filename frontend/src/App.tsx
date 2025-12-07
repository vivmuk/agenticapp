import { useState } from 'react';
import AgentChatView from './components/workflow/AgentChatView';
import WorkflowStartForm from './components/workflow/WorkflowStartForm';
import HumanReviewPanel from './components/humanReview/HumanReviewPanel';

type ViewMode = 'create' | 'orchestration' | 'review';

function App() {
  const [activeView, setActiveView] = useState<ViewMode>('create');
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <header className="border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto px-8 py-10">
          {/* Title */}
          <h1 className="hero-title mb-3">
            <span className="hero-title-black">V'S </span>
            <span className="hero-title-red">LINKEDIN</span>
            <br />
            <span className="hero-title-red">POST CREATOR</span>
          </h1>
          {/* Subtitle */}
          <p className="hero-subtitle">
            AI-Powered Content Generation & Quality Assurance
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b-2 border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="tab-nav">
            <button
              onClick={() => setActiveView('create')}
              className={`tab-item ${activeView === 'create' ? 'active' : ''}`}
            >
              Create Post
            </button>
            <button
              onClick={() => setActiveView('orchestration')}
              className={`tab-item ${activeView === 'orchestration' ? 'active' : ''}`}
            >
              Orchestration
            </button>
            {/* Human Review Tab Removed */}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-10 grid-bg min-h-[calc(100vh-300px)]">
        {activeView === 'create' && (
          <div className="max-w-3xl">
            <WorkflowStartForm onWorkflowStarted={(workflowId) => {
              setActiveWorkflowId(workflowId);
              setActiveView('orchestration');
            }} />
          </div>
        )}

        {activeView === 'orchestration' && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Agent Orchestration</h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Live view of each agent step. Start a post from the Create tab; runs appear here in real time.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveWorkflowId(null);
                    setActiveView('create');
                  }}
                  className="px-4 py-2 bg-gray-900 text-white font-bold uppercase tracking-wide rounded-lg hover:bg-gray-800 transition-all text-sm"
                >
                  + New Post
                </button>
              </div>
              <div className="text-sm text-gray-600">
                When a workflow is running you’ll see agent messages, content drafts, and images in the canvas below.
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm h-[800px] overflow-hidden">
              <AgentChatView workflowId={activeWorkflowId} />
            </div>
          </div>
        )}

        {activeView === 'review' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Human Review</h2>
              <p className="text-gray-500 text-sm mt-1">Review and approve generated content</p>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <HumanReviewPanel />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between text-sm text-gray-500">
          <span>Powered by Venice AI</span>
          <span>v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
