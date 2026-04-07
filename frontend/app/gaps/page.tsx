'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, TrendingUp, Lightbulb, Loader2,
  BarChart3, RefreshCw, Plus, Info
} from 'lucide-react';
import { getKnowledgeGaps, KnowledgeGap } from '../../lib/api';

// Mock fallback data when backend isn't available
const MOCK_GAPS: KnowledgeGap[] = [
  { topic: 'Employee Onboarding Process',  queries: 34, priority: 'high' },
  { topic: 'API Rate Limiting Procedures', queries: 21, priority: 'high' },
  { topic: 'Security Incident Response',   queries: 18, priority: 'medium' },
  { topic: 'Remote Work Policy',           queries: 15, priority: 'medium' },
  { topic: 'Performance Review Criteria',  queries: 12, priority: 'medium' },
  { topic: 'Deployment Rollback Guide',    queries: 8,  priority: 'low' },
];

const priorityConfig = {
  high:   { badge: 'badge-danger',  label: 'High',   bar: 'var(--color-danger)' },
  medium: { badge: 'badge-warning', label: 'Medium', bar: 'var(--color-warning)' },
  low:    { badge: 'badge-success', label: 'Low',    bar: 'var(--color-success)' },
};

export default function KnowledgeGaps() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingMock, setUsingMock] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getKnowledgeGaps();
      const arr: KnowledgeGap[] = Array.isArray(data) ? data : (data as any)?.gaps || [];
      if (arr.length === 0) {
        // Use mock data for demo
        setGaps(MOCK_GAPS);
        setUsingMock(true);
      } else {
        setGaps(arr);
        setUsingMock(false);
      }
    } catch (err: any) {
      // Gracefully fall back to mock data
      setGaps(MOCK_GAPS);
      setUsingMock(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const highCount   = gaps.filter(g => g.priority === 'high').length;
  const mediumCount = gaps.filter(g => g.priority === 'medium').length;
  const lowCount    = gaps.filter(g => g.priority === 'low').length;
  const totalQueries = gaps.reduce((sum, g) => sum + g.queries, 0);

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={26} style={{ color: 'var(--color-primary-light)' }} />
            Gap Analysis
          </h1>
          <p>Identify missing knowledge based on failed queries and low-confidence responses.</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary" disabled={loading} id="refresh-gaps-btn">
          <RefreshCw size={15} className={loading ? 'spinner' : ''} />
          Refresh
        </button>
      </div>

      {/* API Warning (demo mode) */}
      {usingMock && (
        <div className="alert alert-info" style={{ marginBottom: '24px' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            <strong>Demo Mode:</strong> Showing sample gap analysis data.{' '}
            {error && <>Backend returned: <code style={{ opacity: 0.8 }}>{error}</code>. </>}
            Connect a configured backend with real Anthropic API keys for live analysis.
          </span>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Gaps',     value: gaps.length,  color: 'var(--color-primary)' },
          { label: 'High Priority',  value: highCount,    color: 'var(--color-danger)' },
          { label: 'Medium Priority',value: mediumCount,  color: 'var(--color-warning)' },
          { label: 'Failed Queries', value: totalQueries, color: 'var(--color-info)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: stat.color, marginBottom: '4px' }}>
              {loading ? '—' : stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Gap Cards */}
      {loading ? (
        <div className="loading-center">
          <Loader2 size={24} className="spinner" style={{ color: 'var(--color-primary)' }} />
          <span>Analyzing knowledge gaps...</span>
        </div>
      ) : gaps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Lightbulb size={52} style={{ color: 'var(--color-success)' }} /></div>
          <h3>No Knowledge Gaps Detected</h3>
          <p>Your knowledge base appears comprehensive for recent user queries. Keep it updated!</p>
        </div>
      ) : (
        <div className="gaps-grid">
          {gaps.map((gap, i) => {
            const config = priorityConfig[gap.priority] || priorityConfig.low;
            const barWidth = Math.min(100, (gap.queries / Math.max(...gaps.map(g => g.queries))) * 100);

            return (
              <div className="gap-card animate-in" key={i}>
                <div className="gap-card-header">
                  <h3 className="gap-card-title">{gap.topic}</h3>
                  <span className={`badge ${config.badge}`}>{config.label}</span>
                </div>

                <p className="gap-card-desc">
                  Frequent user queries about this topic are returning low-confidence responses.
                  Adding relevant documentation will improve answer quality.
                </p>

                {/* Query Volume Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                    <span>Query Volume</span>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{gap.queries} failed</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--color-surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: config.bar, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>

                <div className="gap-card-footer">
                  <span className="gap-stat">
                    <TrendingUp size={14} />
                    {gap.queries} unanswered queries
                  </span>
                  <button className="btn btn-primary btn-sm" id={`add-context-${i}`}>
                    <Plus size={12} /> Add Context
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
