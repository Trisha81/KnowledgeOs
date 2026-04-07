'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, TrendingUp, AlertTriangle, Users,
  ArrowUpRight, ArrowDownRight, FileText, Zap,
  CheckCircle, MessageSquare, AlertCircle
} from 'lucide-react';
import { getAnalyticsStats } from '../lib/api';
import { useAuth } from '../components/AuthProvider';

const BAR_HEIGHTS = [42, 65, 48, 80, 58, 92, 85, 70, 76, 88, 63, 95];
const BAR_MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const activities = [
  { id: 1, title: 'Document Uploaded',     desc: 'Q3 Strategy Playbook',       time: '10m ago', type: 'info',    Icon: FileText },
  { id: 2, title: 'Knowledge Gap Found',   desc: 'Onboarding Procedures',       time: '1h ago',  type: 'warning', Icon: AlertCircle },
  { id: 3, title: 'System Health Scan',    desc: 'Completed successfully',       time: '3h ago',  type: 'success', Icon: CheckCircle },
  { id: 4, title: 'User Query Resolved',   desc: 'API Documentation',            time: '5h ago',  type: 'primary', Icon: MessageSquare },
  { id: 5, title: 'New User Registered',   desc: 'engineering@acme.com',         time: '8h ago',  type: 'info',    Icon: Users },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getAnalyticsStats();
        setStats(res);
      } catch (err) {
        console.error('Dashboard data error', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statCards = [
    {
      label: 'Knowledge Base',
      value: loading || !stats ? '—' : stats.docs.toLocaleString(),
      change: stats?.trends?.docs || '+4.3%', changeDir: 'up', note: 'this month',
      color: 'info', Icon: BookOpen,
    },
    {
      label: 'Knowledge Score',
      value: loading || !stats ? '—' : stats.knowledgeScore,
      change: stats?.trends?.score || '+1.2%', changeDir: 'up', note: 'this week',
      color: 'success', Icon: TrendingUp,
    },
    {
      label: 'Open Gaps',
      value: loading || !stats ? '—' : stats.gaps.toString(),
      change: 'Active', changeDir: 'down', note: 'audit needed',
      color: 'warning', Icon: AlertTriangle,
    },
    {
      label: 'Active Users',
      value: loading || !stats ? '—' : stats.activeUsers.toLocaleString(),
      change: stats?.trends?.users || '+12', changeDir: 'up', note: 'today',
      color: 'primary', Icon: Users,
    },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1>{greeting}, {user?.name || 'Admin'} 👋</h1>
        <p>Here is the latest intelligence from your KnowledgeOS platform.</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        {statCards.map((card, i) => {
          const Icon = card.Icon;
          return (
            <div className={`stat-card animate-in`} key={card.label} style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`stat-card-glow ${card.color}`} />
              <div className={`stat-card-icon ${card.color}`}>
                <Icon size={22} color="white" />
              </div>
              <div className="stat-card-label">{card.label}</div>
              <div className="stat-card-value">{card.value}</div>
              <div className="stat-card-footer">
                <span className={`stat-card-change ${card.changeDir}`}>
                  {card.changeDir === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.change}
                </span>
                &nbsp;{card.note}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Row */}
      <div className="dashboard-grid">
        {/* Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Query Resolution Trends</div>
            <div className="chart-card-subtitle">
              <TrendingUp size={13} style={{ color: 'var(--color-success)' }} />
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>+14%</span>
              <span>more resolutions in 2026</span>
            </div>
          </div>
          <div className="chart-card-body">
            <div className="bar-chart">
              {BAR_HEIGHTS.map((h, i) => (
                <div className="bar-chart-item" key={i}>
                  <div
                    className="bar-chart-bar"
                    style={{ height: `${h}%` }}
                    title={`${BAR_MONTHS[i]}: ${h}%`}
                  />
                  <span className="bar-chart-label">{BAR_MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Live Activity</div>
            <div className="chart-card-subtitle">Real-time platform events</div>
          </div>
          <div className="chart-card-body">
            <div className="activity-feed">
              {activities.map((a) => {
                const Icon = a.Icon;
                return (
                  <div className="activity-item" key={a.id}>
                    <div className={`activity-icon ${a.type}`}>
                      <Icon size={15} />
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{a.title}</div>
                      <div className="activity-desc">{a.desc}</div>
                    </div>
                    <div className="activity-time">{a.time}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Row */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/documents" className="btn btn-primary">
          <BookOpen size={16} /> View Knowledge Base
        </Link>
        <Link href="/chat" className="btn btn-secondary">
          <MessageSquare size={16} /> Open AI Chat
        </Link>
        <Link href="/gaps" className="btn btn-ghost">
          <Zap size={16} /> Run Gap Analysis
        </Link>
      </div>
    </>
  );
}
