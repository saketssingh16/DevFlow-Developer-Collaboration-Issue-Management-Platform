import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface AIAssistantWidgetProps {
  projectId: string;
  issueId: string;
}

export function AIAssistantWidget({ projectId, issueId }: AIAssistantWidgetProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const waitForJob = async (jobId: string): Promise<Record<string, unknown>> => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      const response = await apiClient.get(`/projects/${projectId}/ai/jobs/${jobId}`);
      const job = response.data.data.job;
      if (job.status === 'COMPLETED') return job.result || {};
      if (job.status === 'FAILED') throw new Error('AI Assistant unavailable');
    }
    throw new Error('AI Assistant is taking longer than expected. Please try again shortly.');
  };

  const fetchSummary = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.post(`/projects/${projectId}/ai/issues/${issueId}/summarize`);
      const result = await waitForJob(res.data.data.job.id);
      setSummary(typeof result.summary === 'string' ? result.summary : null);
    } catch {
      setErrorMsg('AI Assistant unavailable');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptanceCriteria = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.post(`/projects/${projectId}/ai/issues/${issueId}/acceptance-criteria`);
      const result = await waitForJob(res.data.data.job.id);
      setCriteria(Array.isArray(result.criteria) ? result.criteria.filter((item): item is string => typeof item === 'string') : null);
    } catch {
      setErrorMsg('AI Assistant unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 space-y-4 shadow-lg ring-1 ring-indigo-500/10">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          AI Engineering Assistant
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          Assistance Mode
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Generate AI Summary'}
        </button>

        <button
          onClick={fetchAcceptanceCriteria}
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Generate Acceptance Criteria'}
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          {errorMsg}
        </div>
      )}

      {summary && (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            AI Generated Summary
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">{summary}</p>
        </div>
      )}

      {criteria && (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            Generated Acceptance Criteria
          </span>
          <ul className="space-y-1.5">
            {criteria.map((c, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-slate-400 italic pt-1">
        * AI insights are provided for assistance only and should be reviewed by engineering team leads.
      </p>
    </div>
  );
}
