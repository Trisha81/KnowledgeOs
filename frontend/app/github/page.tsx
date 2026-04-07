'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  GitBranch, GitCommit, Users, FileText, Clock,
  RefreshCw, Search, ChevronDown, ChevronUp,
  Plus, Minus, AlertCircle, ExternalLink, Sparkles,
  Calendar, Code2, Eye, BarChart2, Lock, Globe,
  Star, GitFork,
} from 'lucide-react';
import {
  getGitHubConfig, getRepos, getCommits, getCommitDetail, getContributors,
  getReadme, getTimeline, getGitHubSummary,
  GitHubRepo, GitHubCommit, GitHubContributor,
} from '../../lib/api';

// ──────────────────────────────────────────────────────────────────────────────
type Tab = 'commits' | 'timeline' | 'contributors' | 'readme' | 'ai-summary';

interface CommitFile {
  filename: string; status: string;
  additions: number; deletions: number; changes: number; patch: string | null;
}
interface CommitDetail extends GitHubCommit {
  stats: { additions: number; deletions: number; total: number };
  files: CommitFile[];
}
interface TimelineEvent {
  sha: string; message: string; author: string;
  login: string | null; avatar: string | null; date: string; url: string;
}

// ──────────────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function langColor(lang: string | null): string {
  const map: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
    Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', CSS: '#563d7c',
    HTML: '#e34c26', Vue: '#41b883', 'C++': '#f34b7d', C: '#555555',
  };
  return map[lang || ''] || 'var(--color-primary)';
}

// ──────────────────────────────────────────────────────────────────────────────
// Avatar component
function Avatar({ src, name, size = 32 }: { src?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img src={src} alt={name} width={size} height={size} onError={() => setErr(true)}
      style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--color-primary), var(--color-info))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Diff Viewer
function DiffViewer({ patch, filename }: { patch: string | null; filename: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!patch) return <div className="gh-diff-empty">No patch available</div>;
  const lines = patch.split('\n');
  return (
    <div className="gh-diff-wrapper">
      <button className="gh-diff-toggle" onClick={() => setExpanded(e => !e)}>
        <Code2 size={13} />
        {expanded ? 'Hide' : 'Show'} diff — {filename}
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {expanded && (
        <div className="gh-diff-body">
          <pre className="gh-diff-pre">
            {lines.map((line, i) => {
              const type = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'hunk' : 'ctx';
              return (
                <div key={i} className={`gh-diff-line gh-diff-${type}`}>
                  <span className="gh-diff-lineno">{i + 1}</span>
                  <span className="gh-diff-text">{line}</span>
                </div>
              );
            })}
          </pre>
        </div>
      )}
    </div>
  );
}

// Commit Card
function CommitCard({ commit, rp }: { commit: GitHubCommit; rp: { repoOwner: string; repoName: string } }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<CommitDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!expanded && !detail) {
      setLoading(true);
      try { setDetail(await getCommitDetail(commit.sha, rp)); } catch {}
      setLoading(false);
    }
    setExpanded(e => !e);
  }, [expanded, detail, commit.sha, rp]);

  const firstLine = commit.message.split('\n')[0];
  const rest = commit.message.split('\n').slice(1).join('\n').trim();

  return (
    <div className={`gh-commit-card ${expanded ? 'expanded' : ''}`}>
      <div className="gh-commit-header" onClick={toggle}>
        <div className="gh-commit-avatar">
          <Avatar src={commit.author.avatar} name={commit.author.name} size={34} />
        </div>
        <div className="gh-commit-info">
          <div className="gh-commit-message">{firstLine}</div>
          <div className="gh-commit-meta">
            <span className="gh-commit-author">{commit.author.login || commit.author.name}</span>
            <span className="gh-commit-dot">·</span>
            <span className="gh-commit-time">{timeAgo(commit.author.date)}</span>
            <span className="gh-commit-dot">·</span>
            <code className="gh-commit-sha">{commit.sha.substring(0, 7)}</code>
          </div>
        </div>
        <div className="gh-commit-actions">
          <a href={commit.url} target="_blank" rel="noreferrer" className="gh-icon-btn" title="View on GitHub" onClick={e => e.stopPropagation()}>
            <ExternalLink size={14} />
          </a>
          <button className="gh-icon-btn">
            {loading ? <RefreshCw size={14} className="gh-spin" /> : expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && detail && (
        <div className="gh-commit-detail">
          {rest && <div className="gh-commit-body">{rest}</div>}
          <div className="gh-commit-stats">
            <span className="gh-stat-add"><Plus size={11} /> {detail.stats?.additions ?? '?'} additions</span>
            <span className="gh-stat-del"><Minus size={11} /> {detail.stats?.deletions ?? '?'} deletions</span>
            <span className="gh-stat-files"><FileText size={11} /> {detail.files?.length ?? 0} files</span>
          </div>
          {detail.files?.map((f, i) => (
            <div key={i} className="gh-file-item">
              <div className="gh-file-header">
                <span className="gh-file-status" style={{ color: f.status === 'added' ? 'var(--color-success)' : f.status === 'removed' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                  {f.status}
                </span>
                <span className="gh-file-name">{f.filename}</span>
                <span className="gh-file-changes">
                  <span className="gh-stat-add">+{f.additions}</span>{' '}
                  <span className="gh-stat-del">-{f.deletions}</span>
                </span>
              </div>
              <DiffViewer patch={f.patch} filename={f.filename} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Repo Selector Card
function RepoCard({ repo, selected, onClick }: { repo: GitHubRepo; selected: boolean; onClick: () => void }) {
  return (
    <button className={`gh-repo-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="gh-repo-card-header">
        <div className="gh-repo-card-name">
          {repo.private ? <Lock size={12} /> : <Globe size={12} />}
          {repo.name}
        </div>
        {repo.language && (
          <div className="gh-repo-lang" style={{ background: langColor(repo.language) + '22', color: langColor(repo.language) }}>
            <span className="gh-lang-dot" style={{ background: langColor(repo.language) }} />
            {repo.language}
          </div>
        )}
      </div>
      {repo.description && <div className="gh-repo-desc">{repo.description}</div>}
      <div className="gh-repo-stats">
        <span><Star size={11} /> {repo.stars}</span>
        <span><GitFork size={11} /> {repo.forks}</span>
        <span><Clock size={11} /> {timeAgo(repo.updatedAt)}</span>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────────
export default function GitHubHubPage() {
  const [tab, setTab] = useState<Tab>('commits');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // All repos
  const [repos, setRepos]   = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repoSearch, setRepoSearch] = useState('');

  // Per-tab data
  const [commits, setCommits]         = useState<GitHubCommit[]>([]);
  const [commitError, setCommitError]  = useState('');
  const [commitSearch, setCommitSearch]   = useState('');
  const [authorFilter, setAuthorFilter]   = useState('');
  const [commitPage, setCommitPage]       = useState(1);
  const [commitsLoading, setCommitsLoading] = useState(false);

  const [timeline, setTimeline]     = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [contribLoading, setContribLoading] = useState(false);

  const [readme, setReadme]         = useState('');
  const [readmeLoading, setReadmeLoading] = useState(false);

  const [aiSummary, setAiSummary]   = useState('');
  const [aiSource, setAiSource]     = useState<'claude' | 'automated' | ''>('');
  const [aiMeta, setAiMeta]         = useState<any>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  const [error, setError]           = useState('');

  // Current repo params
  const rp = selectedRepo
    ? { repoOwner: selectedRepo.owner, repoName: selectedRepo.name }
    : undefined;

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    getGitHubConfig()
      .then((cfg: any) => {
        setBackendOnline(true);
        setConfigured(cfg.configured);
      })
      .catch(() => {
        setBackendOnline(false);
        setConfigured(false);
      });
  }, []);

  useEffect(() => {
    if (!configured) return;
    setReposLoading(true);
    getRepos()
      .then((res: any) => {
        const list = res.repos || [];
        setRepos(list);
        if (list.length > 0) setSelectedRepo(list[0]);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setReposLoading(false));
  }, [configured]);

  // Reset tab data when repo changes
  useEffect(() => {
    setCommits([]); setTimeline([]); setContributors([]);
    setReadme(''); setAiSummary(''); setAiSource(''); setAiGenerated(false);
    setCommitPage(1); setCommitSearch(''); setAuthorFilter('');
    setCommitError(''); setError('');
  }, [selectedRepo]);

  // ── Load commits ─────────────────────────────────────────────────────────
  const loadCommits = useCallback(async () => {
    if (!rp) return;
    setCommitsLoading(true);
    setCommitError('');
    setError('');
    try {
      const res: any = await getCommits({
        ...rp,
        search: commitSearch || undefined,
        author: authorFilter || undefined,
        page: commitPage, per_page: 20,
      });
      setCommits(res.commits || []);
    } catch (e: any) {
      const msg: string = e.message || '';
      const isRateLimit = msg.includes('rate limit') || msg.includes('403') || msg.includes('exceeded');
      setCommitError(isRateLimit
        ? 'GitHub rate limit reached. Please wait a minute and retry.'
        : msg);
    }
    setCommitsLoading(false);
  }, [rp, commitSearch, authorFilter, commitPage]);

  useEffect(() => {
    if (tab === 'commits' && selectedRepo) {
      // Small delay to let repos/config requests complete first
      const t = setTimeout(() => loadCommits(), 800);
      return () => clearTimeout(t);
    }
  }, [tab, selectedRepo, loadCommits]);

  // ── Load timeline ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'timeline' || !selectedRepo || timeline.length > 0) return;
    setTimelineLoading(true);
    const t = setTimeout(() => {
      getTimeline(rp)
        .then((res: any) => setTimeline(res.timeline || []))
        .catch((e: any) => setError(e.message))
        .finally(() => setTimelineLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [tab, selectedRepo]);

  // ── Load contributors ─────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'contributors' || !selectedRepo || contributors.length > 0) return;
    setContribLoading(true);
    const t = setTimeout(() => {
      getContributors(rp)
        .then((res: any) => setContributors(res.contributors || []))
        .catch((e: any) => setError(e.message))
        .finally(() => setContribLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [tab, selectedRepo]);

  // ── Load README ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'readme' || !selectedRepo || readme) return;
    setReadmeLoading(true);
    const t = setTimeout(() => {
      getReadme(rp)
        .then((res: any) => setReadme(res.content || ''))
        .catch((e: any) => setError(e.message))
        .finally(() => setReadmeLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [tab, selectedRepo]);

  // ── AI Summary ────────────────────────────────────────────────────────────
  const generateSummary = useCallback(async () => {
    if (!rp) return;
    setAiLoading(true); setError('');
    try {
      const res: any = await getGitHubSummary(rp);
      setAiSummary(res.summary || '');
      setAiSource(res.source || 'automated');
      setAiMeta(res.repo || null);
      setAiGenerated(true);
    } catch (e: any) { setError(e.message); }
    setAiLoading(false);
  }, [rp]);

  // Auto-generate when switching to AI Summary tab
  useEffect(() => {
    if (tab === 'ai-summary' && selectedRepo && !aiGenerated && !aiLoading) generateSummary();
  }, [tab, selectedRepo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'commits',      label: 'Commits',      icon: GitCommit },
    { id: 'timeline',     label: 'Timeline',     icon: Clock },
    { id: 'contributors', label: 'Contributors', icon: Users },
    { id: 'readme',       label: 'README',       icon: FileText },
    { id: 'ai-summary',   label: 'AI Summary',   icon: Sparkles },
  ];

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(repoSearch.toLowerCase())
  );

  // ── Backend offline ───────────────────────────────────────────────────────
  if (backendOnline === false) {
    return (
      <>
        <div className="page-header">
          <h1><GitBranch size={22} style={{ verticalAlign: 'middle', marginRight: 10 }} />GitHub Nest</h1>
        </div>
        <div className="gh-not-configured">
          <div className="gh-not-configured-icon" style={{ color: 'var(--color-danger)' }}><AlertCircle size={40} /></div>
          <h2>Backend not reachable</h2>
          <p>The backend server at <code>http://localhost:3001</code> is not responding.</p>
          <div className="gh-code-block" style={{ textAlign: 'left' }}>
            <code>cd backend</code><br />
            <code>npm run dev</code>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }}
            onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </>
    );
  }

  // ── GitHub not configured ─────────────────────────────────────────────────
  if (configured === false) {
    return (
      <>
        <div className="page-header">
          <h1><GitBranch size={22} style={{ verticalAlign: 'middle', marginRight: 10 }} />GitHub Nest</h1>
          <p>Connect your GitHub account to unlock commit tracking and AI project insights.</p>
        </div>
        <div className="gh-not-configured">
          <div className="gh-not-configured-icon"><AlertCircle size={40} /></div>
          <h2>GitHub not configured</h2>
          <p>Add these variables to your <code>backend/.env</code> file:</p>
          <div className="gh-code-block">
            <code>GITHUB_TOKEN=ghp_your_personal_access_token</code><br />
            <code>GITHUB_OWNER=your-github-username</code>
          </div>
          <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Get your token at: <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="gh-link">
              github.com/settings/tokens
            </a> — with <strong>repo</strong> scope.
          </p>
        </div>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1>
          <GitBranch size={22} style={{ verticalAlign: 'middle', marginRight: 10 }} />
          GitHub Nest
        </h1>
        <p>Tracking <strong>{repos.length}</strong> repositor{repos.length === 1 ? 'y' : 'ies'} — commits, diffs, contributors &amp; AI insights.</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="gh-error-banner">
          <AlertCircle size={15} />&nbsp;{error}
          <button className="gh-error-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── Repo Selector ────────────────────────────────────────────────── */}
      <div className="gh-repo-selector-section">
        <div className="gh-repo-selector-header">
          <div className="gh-repo-selector-title">
            <GitBranch size={15} />
            Your Repositories
            <span className="gh-repo-count">{repos.length}</span>
          </div>
          <div className="gh-search-wrap" style={{ maxWidth: 240, position: 'relative', zIndex: 1 }}>
            <Search size={13} className="gh-search-icon" />
            <input
              type="text"
              className="gh-input"
              placeholder="Filter repos..."
              value={repoSearch}
              onChange={e => setRepoSearch(e.target.value)}
              style={{ padding: '7px 14px 7px 32px', fontSize: '12px', width: '100%', cursor: 'text' }}
            />
          </div>
        </div>

        {reposLoading ? (
          <div className="gh-loading" style={{ padding: '20px 0' }}>
            <RefreshCw size={18} className="gh-spin" /> Loading repositories…
          </div>
        ) : (
          <div className="gh-repo-grid">
            {filteredRepos.map(repo => (
              <RepoCard
                key={repo.id}
                repo={repo}
                selected={selectedRepo?.id === repo.id}
                onClick={() => { setSelectedRepo(repo); setTab('commits'); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Main content (only if a repo is selected) ─────────────────────── */}
      {selectedRepo && (
        <>
          {/* Active Repo Banner */}
          <div className="gh-active-repo-banner">
            <div className="gh-active-repo-info">
              <Avatar src={`https://github.com/${selectedRepo.owner}.png`} name={selectedRepo.owner} size={28} />
              <div>
                <div className="gh-active-repo-name">
                  <a href={selectedRepo.url} target="_blank" rel="noreferrer" className="gh-link">
                    {selectedRepo.fullName}
                  </a>
                  {selectedRepo.private
                    ? <span className="gh-priv-badge"><Lock size={10} /> Private</span>
                    : <span className="gh-pub-badge"><Globe size={10} /> Public</span>}
                </div>
                {selectedRepo.description && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {selectedRepo.description}
                  </div>
                )}
              </div>
            </div>
            <div className="gh-repo-meta">
              {selectedRepo.language && (
                <div className="gh-meta-chip">
                  <span className="gh-lang-dot" style={{ background: langColor(selectedRepo.language) }} />
                  {selectedRepo.language}
                </div>
              )}
              <div className="gh-meta-chip"><Star size={12} /> {selectedRepo.stars}</div>
              <div className="gh-meta-chip"><GitFork size={12} /> {selectedRepo.forks}</div>
              <div className="gh-meta-chip"><AlertCircle size={12} /> {selectedRepo.issues} issues</div>
              <a href={selectedRepo.url} target="_blank" rel="noreferrer" className="gh-meta-chip gh-link">
                <ExternalLink size={12} /> View on GitHub
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div className="gh-tabs">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} className={`gh-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                  <Icon size={15} />
                  {t.label}
                  {t.id === 'ai-summary' && <span className="gh-badge-ai">AI</span>}
                </button>
              );
            })}
          </div>

          {/* ── COMMITS ── */}
          {tab === 'commits' && (
            <div className="gh-section">
              <div className="gh-filters">
                <div className="gh-search-wrap">
                  <Search size={14} className="gh-search-icon" />
                  <input className="gh-input" placeholder="Search commits…" value={commitSearch}
                    onChange={e => setCommitSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadCommits()} />
                </div>
                <div className="gh-search-wrap">
                  <Users size={14} className="gh-search-icon" />
                  <input className="gh-input" placeholder="Filter by developer…" value={authorFilter}
                    onChange={e => setAuthorFilter(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadCommits()} />
                </div>
                <button className="btn btn-primary gh-filter-btn" onClick={() => { setCommitPage(1); loadCommits(); }}>
                  <Search size={14} /> Search
                </button>
                <button className="btn btn-secondary gh-filter-btn" onClick={() => {
                  setCommitSearch(''); setAuthorFilter(''); setCommitPage(1);
                  setTimeout(loadCommits, 0);
                }}>Clear</button>
              </div>

              {commitsLoading ? (
                <div className="gh-loading"><RefreshCw size={22} className="gh-spin" /> Loading commits...</div>
              ) : commitError ? (
                <div className="gh-empty" style={{ flexDirection: 'column', gap: 12 }}>
                  <AlertCircle size={32} style={{ color: 'var(--color-warning)' }} />
                  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 360 }}>{commitError}</p>
                  <button className="btn btn-primary" onClick={loadCommits} style={{ marginTop: 4 }}>
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              ) : commits.length === 0 ? (
                <div className="gh-empty"><GitCommit size={32} /><p>No commits found.</p></div>
              ) : (
                <div className="gh-commit-list">
                  {commits.map(c => <CommitCard key={c.sha} commit={c} rp={{ repoOwner: selectedRepo.owner, repoName: selectedRepo.name }} />)}
                </div>
              )}

              <div className="gh-pagination">
                <button className="btn btn-ghost" onClick={() => setCommitPage(p => Math.max(1, p - 1))} disabled={commitPage === 1}>← Prev</button>
                <span className="gh-page-num">Page {commitPage}</span>
                <button className="btn btn-ghost" onClick={() => setCommitPage(p => p + 1)} disabled={commits.length < 20}>Next →</button>
              </div>
            </div>
          )}

          {/* ── TIMELINE ── */}
          {tab === 'timeline' && (
            <div className="gh-section">
              {timelineLoading ? (
                <div className="gh-loading"><RefreshCw size={22} className="gh-spin" /> Loading timeline…</div>
              ) : timeline.length === 0 ? (
                <div className="gh-empty"><Clock size={32} /><p>No timeline events found.</p></div>
              ) : (
                <div className="gh-timeline">
                  {timeline.map((event, i) => (
                    <div key={i} className="gh-timeline-item">
                      <div className="gh-timeline-dot" />
                      <div className="gh-timeline-line" />
                      <div className="gh-timeline-content">
                        <div className="gh-timeline-header">
                          <Avatar src={event.avatar} name={event.author} size={26} />
                          <div className="gh-timeline-author">{event.login || event.author}</div>
                          <div className="gh-timeline-date">
                            <Calendar size={11} />
                            {new Date(event.date).toLocaleString()}
                          </div>
                          <a href={event.url} target="_blank" rel="noreferrer" className="gh-icon-btn" title="View on GitHub">
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        <div className="gh-timeline-message">{event.message}</div>
                        <code className="gh-commit-sha">{event.sha}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CONTRIBUTORS ── */}
          {tab === 'contributors' && (
            <div className="gh-section">
              {contribLoading ? (
                <div className="gh-loading"><RefreshCw size={22} className="gh-spin" /> Loading contributors…</div>
              ) : contributors.length === 0 ? (
                <div className="gh-empty"><Users size={32} /><p>No contributors found.</p></div>
              ) : (
                <div className="gh-contributor-grid">
                  {contributors.map((c, i) => {
                    const pct = Math.round((c.contributions / (contributors[0]?.contributions || 1)) * 100);
                    return (
                      <div key={c.login} className="gh-contributor-card">
                        <div className="gh-contributor-rank">#{i + 1}</div>
                        <Avatar src={c.avatar} name={c.login} size={56} />
                        <div className="gh-contributor-name">
                          <a href={c.url} target="_blank" rel="noreferrer" className="gh-link">{c.login}</a>
                        </div>
                        <div className="gh-contributor-commits"><GitCommit size={12} /> {c.contributions} commits</div>
                        <div className="gh-contributor-bar-wrap">
                          <div className="gh-contributor-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── README ── */}
          {tab === 'readme' && (
            <div className="gh-section">
              {readmeLoading ? (
                <div className="gh-loading"><RefreshCw size={22} className="gh-spin" /> Loading README…</div>
              ) : (
                <div className="gh-readme">
                  <div className="gh-readme-header">
                    <Eye size={15} /> README.md — {selectedRepo.fullName}
                    <a href={`${selectedRepo.url}/blob/${selectedRepo.defaultBranch}/README.md`}
                      target="_blank" rel="noreferrer" className="gh-link" style={{ marginLeft: 'auto' }}>
                      <ExternalLink size={12} /> View on GitHub
                    </a>
                  </div>
                  <div className="gh-readme-body">
                    <ReactMarkdown>{readme || '*No README found for this repository.*'}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AI SUMMARY ── */}
          {tab === 'ai-summary' && (
            <div className="gh-section">
              {aiLoading ? (
                <div className="gh-ai-loading">
                  <Sparkles size={28} className="gh-spin" />
                  <p>Analysing <strong>{selectedRepo.fullName}</strong>...</p>
                  <small style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Generating project summary from commit history...</small>
                </div>
              ) : (
                <>
                  <div className="gh-ai-header">
                    <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
                    <span>Project Summary — {selectedRepo.name}</span>
                    {aiSource === 'claude' && (
                      <span className="gh-badge-ai" style={{ background: 'var(--gradient-primary)' }}>Claude AI</span>
                    )}
                    {aiSource === 'automated' && (
                      <span className="gh-badge-ai" style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.3)' }}>Auto</span>
                    )}
                    <button className="btn btn-secondary" style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => { setAiGenerated(false); setAiSummary(''); generateSummary(); }}
                      disabled={aiLoading}>
                      <RefreshCw size={13} /> Refresh
                    </button>
                  </div>
                  <div className="gh-ai-body">
                    {aiSummary ? (
                      <ReactMarkdown>{aiSummary}</ReactMarkdown>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                        <Sparkles size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>Click <strong>Refresh</strong> to generate a project summary.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
