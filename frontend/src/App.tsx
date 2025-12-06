import { useState } from 'react';
import { WorkflowCanvas } from './components/workflow/WorkflowCanvas';
import HumanReviewPanel from './components/humanReview/HumanReviewPanel';

function App() {
  const [activeView, setActiveView] = useState<'workflow' | 'review'>('workflow');

  return (
    <div className="h-screen w-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Agentic App
            </h1>
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveView('workflow')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeView === 'workflow'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Workflow
              </button>
              <button
                onClick={() => setActiveView('review')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeView === 'review'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Human Review
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-73px)]">
        {activeView === 'workflow' ? (
          <WorkflowCanvas />
        ) : (
          <HumanReviewPanel />
        )}
      </main>
    </div>
  );
}

export default App;
