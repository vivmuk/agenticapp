import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowCanvas } from './components/workflow/WorkflowCanvas';
import HumanReviewPanel from './components/humanReview/HumanReviewPanel';

function App() {
  const [activeView, setActiveView] = useState<'workflow' | 'review'>('workflow');

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20 relative z-10">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Agentic Content Studio
                </h1>
                <p className="text-xs text-gray-500">AI-Powered Content Generation</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center bg-slate-800/50 rounded-xl p-1">
              <motion.button
                onClick={() => setActiveView('workflow')}
                className={`relative px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  activeView === 'workflow'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {activeView === 'workflow' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Workflow
                </span>
              </motion.button>
              <motion.button
                onClick={() => setActiveView('review')}
                className={`relative px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  activeView === 'review'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {activeView === 'review' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Human Review
                </span>
              </motion.button>
            </nav>

            {/* Status Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-73px)]">
        <AnimatePresence mode="wait">
          {activeView === 'workflow' ? (
            <motion.div
              key="workflow"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <WorkflowCanvas />
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full p-6"
            >
              <HumanReviewPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
