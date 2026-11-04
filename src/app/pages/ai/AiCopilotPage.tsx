// src/app/pages/ai/AiCopilotPage.tsx
// Phase 39: Enterprise AI Copilot Interactive Query Workspace

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Bot,
  User,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type { CopilotQueryResponse } from '../../../server/ai-foundation-service.ts';

interface Message {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  metrics?: { label: string; value: string; trend?: string }[];
  citation?: string;
  drillDown?: string;
  followUps?: string[];
}

export function AiCopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: 'Welcome to the Jyotsvan AI Copilot. I have secure, read-only access to our canonical ERP, sales orders, inventory registers, financial subledgers, marketplace portals, and advertising telemetry. Ask me any business question.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      followUps: [
        'What were sales this month?',
        'Which products are low in stock?',
        'Which customers have the highest outstanding?',
        'How are our marketplace sales divided between Amazon, Flipkart, and Myntra?',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const q = queryText || input;
    if (!q.trim() || isSending) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/copilot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        throw new Error('Copilot service error');
      }

      const data: CopilotQueryResponse = await res.json();

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'copilot',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metrics: data.supportingMetrics,
        citation: data.sourceCitation,
        drillDown: data.drillDownLink,
        followUps: data.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'copilot',
          text: 'Sorry, I encountered an issue retrieving verified enterprise figures. Please ensure your session is active.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const starterChips = [
    'What were sales this month?',
    'Which products are low in stock?',
    'Which distributors have overdue debt?',
    'What is our plant manufacturing yield?',
    'How much did Amazon and Myntra contribute?',
    'What was our Meta & Google Ads ROAS?',
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-amber-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-900">Enterprise AI Copilot</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Zero Hallucination Verified Tools
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Natural language intelligence mediated exclusively by canonical database queries and server-side RBAC.
            </p>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'copilot' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-amber-200" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-slate-900 text-white rounded-tr-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
              }`}
            >
              <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

              {/* Supporting Metrics Pills */}
              {msg.metrics && msg.metrics.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {msg.metrics.map((m, i) => (
                    <div key={i} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-medium">{m.label}</div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5 flex items-baseline justify-between">
                        <span>{m.value}</span>
                        {m.trend && <span className="text-[10px] text-emerald-600">{m.trend}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Source Citation & Drill Down */}
              {msg.citation && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center">
                    <ShieldCheck className="w-3 h-3 text-emerald-500 mr-1" />
                    {msg.citation}
                  </span>
                  {msg.drillDown && (
                    <a
                      href={msg.drillDown}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center"
                    >
                      <span>Drill Down</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              )}

              {/* Follow-up suggestions */}
              {msg.followUps && msg.followUps.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-400">Suggested queries:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.followUps.map((fu, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(fu)}
                        className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors text-left"
                      >
                        {fu}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 text-[9px] text-slate-400 text-right">{msg.timestamp}</div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                <User className="w-4 h-4 text-slate-200" />
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 p-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>AI Copilot querying canonical ERP databases & verifying RBAC permissions...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested Starter Chips */}
      <div className="px-6 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">Prompt Shortcuts:</span>
        {starterChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <input
            type="text"
            placeholder="Ask anything about sales, working capital, inventory cover, batch yield, or marketing ROAS..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center disabled:opacity-50 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
