const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('kos_token');
}

async function fetchAPI(url: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as any;

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errText}`);
  }

  return response.json();
}

/** ─── Auth ─────────────────────────────────────────────────────── */
export async function loginAPI(email: string, password: string) {
  return fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function registerAPI(name: string, email: string, password: string, department?: string) {
  return fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, department }) });
}

export async function updateProfile(data: { name: string; department?: string }) {
  return fetchAPI('/users/profile', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function updatePassword(data: any) {
  return fetchAPI('/users/password', { method: 'PUT', body: JSON.stringify(data) });
}

/** ─── Documents ───────────────────────────────────────────────── */
export interface DocumentItem {
  _id: string;
  title: string;
  category: string;
  type?: string;
  content: string;
  summary?: string;
  tags?: string[];
  keyInsights?: string[];
  faqs?: { q: string; a: string }[];
  createdAt: string;
  updatedAt: string;
}

export async function getDocuments(params?: { search?: string; category?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.search)   query.append('search',   params.search);
  if (params?.category) query.append('category', params.category);
  if (params?.page)     query.append('page',     params.page.toString());
  if (params?.limit)    query.append('limit',    params.limit.toString());
  const qs = query.toString();
  return fetchAPI(`/documents${qs ? `?${qs}` : ''}`);
}

export async function uploadDocument(data: { title: string; category: string; content?: string; file?: File }) {
  if (data.file) {
    const fd = new FormData();
    fd.append('title', data.title);
    fd.append('category', data.category);
    if (data.content) fd.append('content', data.content);
    fd.append('file', data.file);
    return fetchAPI('/documents/upload', { method: 'POST', body: fd });
  }
  return fetchAPI('/documents/upload', { method: 'POST', body: JSON.stringify(data) });
}

export async function getDocument(id: string): Promise<DocumentItem> {
  return fetchAPI(`/documents/${id}`);
}

export async function deleteDocument(id: string) {
  return fetchAPI(`/documents/${id}`, { method: 'DELETE' });
}

/** ─── AI Chat ─────────────────────────────────────────────────── */
export async function sendChatMessage(query: string, sessionId: string) {
  return fetchAPI('/chat', { method: 'POST', body: JSON.stringify({ query, sessionId }) });
}

/** ─── Gaps ────────────────────────────────────────────────────── */
export interface KnowledgeGap {
  topic: string;
  queries: number;
  priority: 'low' | 'medium' | 'high';
}

export async function getKnowledgeGaps() {
  return fetchAPI('/gaps');
}

/** ─── Analytics ───────────────────────────────────────────────── */

export async function getAnalyticsStats() {
  return fetchAPI('/analytics/stats');
}

/** ─── GitHub Nest ──────────────────────────────────────────────── */

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stars: number;
  forks: number;
  issues: number;
  updatedAt: string;
  url: string;
  defaultBranch: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
    login: string | null;
    avatar: string | null;
  };
  url: string;
  repo?: string;
}

export interface GitHubCommitDetail extends GitHubCommit {
  stats: { additions: number; deletions: number; total: number };
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch: string | null;
  }[];
}

export interface GitHubContributor {
  login: string;
  avatar: string;
  contributions: number;
  url: string;
}

// Helper: build query string with optional repo override params
type RepoParams = { repoOwner?: string; repoName?: string };
function repoQS(rp?: RepoParams, extra?: Record<string, string>): string {
  const q = new URLSearchParams();
  if (rp?.repoOwner) q.append('repoOwner', rp.repoOwner);
  if (rp?.repoName)  q.append('repoName',  rp.repoName);
  if (extra) Object.entries(extra).forEach(([k, v]) => v && q.append(k, v));
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export async function getGitHubConfig() {
  return fetchAPI('/github/config');
}

export async function getRepos(): Promise<{ repos: GitHubRepo[]; total: number }> {
  return fetchAPI('/github/repos');
}

export async function getRepoInfo(rp?: RepoParams) {
  return fetchAPI(`/github/repo-info${repoQS(rp)}`);
}

export async function getCommits(params?: {
  repoOwner?: string; repoName?: string;
  author?: string; search?: string; page?: number; per_page?: number;
}) {
  const { repoOwner, repoName, author, search, page, per_page } = params || {};
  const extra: Record<string, string> = {};
  if (author)   extra.author   = author;
  if (search)   extra.search   = search;
  if (page)     extra.page     = String(page);
  if (per_page) extra.per_page = String(per_page);
  return fetchAPI(`/github/commits${repoQS({ repoOwner, repoName }, extra)}`);
}

export async function getCommitDetail(sha: string, rp?: RepoParams): Promise<GitHubCommitDetail> {
  return fetchAPI(`/github/commits/${sha}${repoQS(rp)}`);
}

export async function getContributors(rp?: RepoParams): Promise<{ contributors: GitHubContributor[] }> {
  return fetchAPI(`/github/contributors${repoQS(rp)}`);
}

export async function getReadme(rp?: RepoParams): Promise<{ content: string }> {
  return fetchAPI(`/github/readme${repoQS(rp)}`);
}

export async function getTimeline(rp?: RepoParams) {
  return fetchAPI(`/github/timeline${repoQS(rp)}`);
}

export async function getGitHubSummary(rp?: RepoParams) {
  return fetchAPI(`/github/summary${repoQS(rp)}`, { method: 'POST' });
}
