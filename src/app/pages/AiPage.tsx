// src/app/pages/AiPage.tsx
// Phase 38-42: Enterprise AI Intelligence Hub (Copilot, Insights, Recommendations & Alerts)

import React from 'react';
import {
  Sparkles,
  Bot,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { AiCopilotPage } from './ai/AiCopilotPage.tsx';
import { AiInsightsPage } from './ai/AiInsightsPage.tsx';
import { AiRecommendationsPage } from './ai/AiRecommendationsPage.tsx';
import { AiAlertsPage } from './ai/AiAlertsPage.tsx';

export interface AiPageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function AiPage({ currentPath = '/ai', onNavigate }: AiPageProps) {
  // Determine active view
  let activeTab: 'copilot' | 'insights' | 'recommendations' | 'alerts' = 'copilot';
  if (currentPath === '/ai/insights' || currentPath.startsWith('/ai/insights')) {
    activeTab = 'insights';
  } else if (currentPath === '/ai/recommendations' || currentPath.startsWith('/ai/recommendations')) {
    activeTab = 'recommendations';
  } else if (currentPath === '/ai/alerts' || currentPath.startsWith('/ai/alerts')) {
    activeTab = 'alerts';
  } else if (currentPath === '/ai/copilot' || currentPath.startsWith('/ai/copilot')) {
    activeTab = 'copilot';
  }

  const handleTabChange = (tab: 'copilot' | 'insights' | 'recommendations' | 'alerts') => {
    if (onNavigate) {
      onNavigate(`/ai/${tab}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-800 pb-2">
        <button
          onClick={() => handleTabChange('copilot')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            activeTab === 'copilot'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Copilot</span>
        </button>

        <button
          onClick={() => handleTabChange('insights')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            activeTab === 'insights'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Operational Insights</span>
        </button>

        <button
          onClick={() => handleTabChange('recommendations')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            activeTab === 'recommendations'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>Recommendations</span>
        </button>

        <button
          onClick={() => handleTabChange('alerts')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            activeTab === 'alerts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Anomaly Alerts & Actions</span>
        </button>
      </div>

      {/* Render Active View */}
      {activeTab === 'copilot' && <AiCopilotPage />}
      {activeTab === 'insights' && <AiInsightsPage />}
      {activeTab === 'recommendations' && <AiRecommendationsPage />}
      {activeTab === 'alerts' && <AiAlertsPage />}
    </div>
  );
}
