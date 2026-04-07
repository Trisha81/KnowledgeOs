import { Router, Request, Response } from 'express';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

export const githubRouter = Router();

// ─── Dynamic env helpers ─────────────────────────────────────────────────────
const ghToken = () => process.env.GITHUB_TOKEN || '';
const ghOwner = () => process.env.GITHUB_OWNER || '';
const ghRepo  = () => process.env.GITHUB_REPO  || '';

const ghHeaders = () => ({
  Authorization: `token ${ghToken()}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'KnowledgeOS/1.0',
});

// Per-request repo resolution: use query params if provided, else fall back to env
const resolveRepo = (req: Request) => {
  const owner = (req.query.repoOwner as string) || ghOwner();
  const repo  = (req.query.repoName  as string) || ghRepo();
  return { owner, repo, baseUrl: `https://api.github.com/repos/${owner}/${repo}` };
};

const handleGHError = (err: any, res: Response, context: string) => {
  console.error(`[GitHub] ${context}:`, err?.response?.data || err.message);
  const status  = err?.response?.status || 500;
  const message = err?.response?.data?.message || err.message || 'GitHub API error';
  res.status(status).json({ error: message });
};

// ─── GET /api/github/config ─────────────────────────────────────────────────
githubRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    configured: !!(ghToken() && ghOwner()),
    owner: ghOwner() || null,
    repo:  ghRepo()  || null,
  });
});

// ─── GET /api/github/repos ──────────────────────────────────────────────────
githubRouter.get('/repos', async (_req: Request, res: Response) => {
  try {
    const { data } = await axios.get('https://api.github.com/user/repos', {
      headers: ghHeaders(),
      params: { per_page: 100, sort: 'updated', affiliation: 'owner,collaborator' },
    });
    const repos = (data as any[]).map((r: any) => ({
      id: r.id, name: r.name, fullName: r.full_name, owner: r.owner.login,
      description: r.description || null, private: r.private,
      language: r.language || null, stars: r.stargazers_count,
      forks: r.forks_count, issues: r.open_issues_count,
      updatedAt: r.updated_at, url: r.html_url, defaultBranch: r.default_branch,
    }));
    res.json({ repos, total: repos.length });
  } catch (err: any) { handleGHError(err, res, 'getRepos'); }
});

// ─── GET /api/github/commits ─────────────────────────────────────────────────
githubRouter.get('/commits', async (req: Request, res: Response) => {
  try {
    const { owner, repo, baseUrl } = resolveRepo(req);
    const { author, search, page = '1', per_page = '20' } = req.query as Record<string, string>;
    const params: Record<string, string> = { page, per_page };
    if (author) params.author = author;
    const { data } = await axios.get(`${baseUrl}/commits`, { headers: ghHeaders(), params });
    const commits = (data as any[]).map((c: any) => ({
      sha: c.sha, message: c.commit.message,
      author: {
        name: c.commit.author.name, email: c.commit.author.email,
        date: c.commit.author.date, login: c.author?.login || null,
        avatar: c.author?.avatar_url || null,
      },
      url: c.html_url, repo: `${owner}/${repo}`,
    }));
    const filtered = search
      ? commits.filter(c =>
          c.message.toLowerCase().includes(search.toLowerCase()) ||
          c.author.name.toLowerCase().includes(search.toLowerCase()))
      : commits;
    res.json({ commits: filtered, page: Number(page), per_page: Number(per_page), repo: `${owner}/${repo}` });
  } catch (err: any) { handleGHError(err, res, 'getCommits'); }
});

// ─── GET /api/github/commits/:sha ─────────────────────────────────────────────
githubRouter.get('/commits/:sha', async (req: Request, res: Response) => {
  try {
    const { baseUrl } = resolveRepo(req);
    const { sha } = req.params;
    const { data } = await axios.get(`${baseUrl}/commits/${sha}`, { headers: ghHeaders() });
    res.json({
      sha: data.sha, message: data.commit.message,
      author: {
        name: data.commit.author.name, email: data.commit.author.email,
        date: data.commit.author.date, login: data.author?.login || null,
        avatar: data.author?.avatar_url || null,
      },
      url: data.html_url, stats: data.stats,
      files: (data.files || []).map((f: any) => ({
        filename: f.filename, status: f.status,
        additions: f.additions, deletions: f.deletions,
        changes: f.changes, patch: f.patch || null,
      })),
    });
  } catch (err: any) { handleGHError(err, res, 'getCommitDetail'); }
});

// ─── GET /api/github/contributors ─────────────────────────────────────────────
githubRouter.get('/contributors', async (req: Request, res: Response) => {
  try {
    const { baseUrl } = resolveRepo(req);
    const { data } = await axios.get(`${baseUrl}/contributors`, {
      headers: ghHeaders(), params: { per_page: 50 },
    });
    const contributors = (data as any[]).map((c: any) => ({
      login: c.login, avatar: c.avatar_url, contributions: c.contributions, url: c.html_url,
    }));
    res.json({ contributors });
  } catch (err: any) { handleGHError(err, res, 'getContributors'); }
});

// ─── GET /api/github/readme ────────────────────────────────────────────────────
githubRouter.get('/readme', async (req: Request, res: Response) => {
  try {
    const { baseUrl } = resolveRepo(req);
    const { data } = await axios.get(`${baseUrl}/readme`, {
      headers: { ...ghHeaders(), Accept: 'application/vnd.github.v3.raw' },
      responseType: 'text',
    });
    res.json({ content: data });
  } catch (err: any) { handleGHError(err, res, 'getReadme'); }
});

// ─── GET /api/github/timeline ─────────────────────────────────────────────────
githubRouter.get('/timeline', async (req: Request, res: Response) => {
  try {
    const { baseUrl } = resolveRepo(req);
    const { data } = await axios.get(`${baseUrl}/commits`, {
      headers: ghHeaders(), params: { per_page: 50 },
    });
    const events = (data as any[]).map((c: any) => ({
      sha: c.sha.substring(0, 7), message: c.commit.message.split('\n')[0],
      author: c.commit.author.name, login: c.author?.login || null,
      avatar: c.author?.avatar_url || null, date: c.commit.author.date, url: c.html_url,
    }));
    res.json({ timeline: events });
  } catch (err: any) { handleGHError(err, res, 'getTimeline'); }
});

// ─── POST /api/github/summary ─────────────────────────────────────────────────
// Tries Claude first; falls back to a rich programmatic summary if key is missing/dummy
githubRouter.post('/summary', async (req: Request, res: Response) => {
  try {
    const { baseUrl } = resolveRepo(req);

    const [commitsRes, contribRes, repoRes] = await Promise.all([
      axios.get(`${baseUrl}/commits`,      { headers: ghHeaders(), params: { per_page: 30 } }),
      axios.get(`${baseUrl}/contributors`, { headers: ghHeaders(), params: { per_page: 10 } }),
      axios.get(baseUrl, { headers: ghHeaders() }),
    ]);

    const commitsData: any[] = commitsRes.data;
    const contribData: any[] = contribRes.data;
    const repoData            = repoRes.data;

    const repoMeta = {
      name: repoData.full_name, description: repoData.description,
      language: repoData.language, stars: repoData.stargazers_count,
      forks: repoData.forks_count, issues: repoData.open_issues_count,
      url: repoData.html_url, updatedAt: repoData.updated_at,
    };

    // ── Try Claude AI ──────────────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    const isDummy = !apiKey || apiKey.includes('dummy') || apiKey.length < 30;

    if (!isDummy) {
      try {
        const commitSummary = commitsData
          .map((c: any) => `- [${c.sha.substring(0,7)}] ${c.commit.author.name}: ${c.commit.message.split('\n')[0]} (${c.commit.author.date.split('T')[0]})`)
          .join('\n');
        const topContributors = contribData
          .map((c: any) => `${c.login} (${c.contributions} commits)`)
          .join(', ');

        const prompt = `You are an expert software project analyst. Analyze this GitHub repository and provide a structured summary.

Repository: ${repoData.full_name}
Description: ${repoData.description || 'No description'}
Language: ${repoData.language || 'Multiple'}
Stars: ${repoData.stargazers_count} | Forks: ${repoData.forks_count} | Open Issues: ${repoData.open_issues_count}
Top Contributors: ${topContributors}

Recent Commits (last ${commitsData.length}):
${commitSummary}

Provide:
1. Project Overview
2. Recent Development Activity
3. Key Contributors
4. Commit Patterns and Velocity
5. Timeline Insights
6. Recommendations

Use markdown formatting. Be professional and concise.`;

        const anthropic = new Anthropic({ apiKey });
        const message = await anthropic.messages.create({
          model: 'claude-opus-4-5', max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        });
        return res.json({
          summary: (message.content[0] as any).text,
          source: 'claude', repo: repoMeta,
          generatedAt: new Date().toISOString(),
        });
      } catch (claudeErr: any) {
        console.warn('[GitHub] Claude failed, using programmatic fallback:', claudeErr.message);
      }
    }

    // ── Programmatic fallback summary ────────────────────────────────────────
    const totalCommits  = commitsData.length;
    const uniqueAuthors = [...new Set(commitsData.map((c: any) => c.commit.author.name as string))];
    const topContrib    = contribData[0];
    const dates         = commitsData.map((c: any) => new Date(c.commit.author.date).getTime());
    const oldest        = dates.length ? new Date(Math.min(...dates)) : null;
    const newest        = dates.length ? new Date(Math.max(...dates)) : null;
    const daySpan       = oldest && newest ? Math.max(1, Math.ceil((newest.getTime() - oldest.getTime()) / 86400000)) : 1;
    const velocity      = (totalCommits / daySpan).toFixed(2);

    const themes: Record<string, number> = {};
    commitsData.forEach((c: any) => {
      const msg = (c.commit.message as string).toLowerCase();
      let key = 'General Updates';
      if (msg.includes('fix') || msg.includes('bug'))             key = 'Bug Fixes';
      else if (msg.includes('feat') || msg.includes('add'))       key = 'New Features';
      else if (msg.includes('refactor') || msg.includes('clean')) key = 'Refactoring';
      else if (msg.includes('doc') || msg.includes('readme'))     key = 'Documentation';
      else if (msg.includes('test'))                              key = 'Testing';
      else if (msg.includes('style') || msg.includes('css'))      key = 'Styling/UI';
      else if (msg.includes('init') || msg.includes('initial'))   key = 'Initial Setup';
      themes[key] = (themes[key] || 0) + 1;
    });

    const themeLines = Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- **${k}**: ${v} commit${v > 1 ? 's' : ''}`)
      .join('\n');

    const recentCommitLines = commitsData.slice(0, 8)
      .map((c: any) => `- \`${c.sha.substring(0,7)}\` **${c.commit.author.name}**: ${c.commit.message.split('\n')[0]} *(${c.commit.author.date.split('T')[0]})*`)
      .join('\n');

    const contributorLines = contribData.length > 0
      ? contribData.slice(0, 5).map((c: any, i: number) => `${i + 1}. **${c.login}** - ${c.contributions} commits`).join('\n')
      : '_No contributor data_';

    const fallbackSummary = [
      `## Project Summary - ${repoData.full_name}`,
      ``,
      `> *Auto-generated analysis (${totalCommits} commits). Add your Anthropic API key in \`backend/.env\` to unlock Claude AI insights.*`,
      ``,
      `---`,
      ``,
      `### 1. Project Overview`,
      `**${repoData.full_name}** is a ${repoData.language || 'multi-language'} repository${repoData.description ? ' - ' + repoData.description : ''}.`,
      ``,
      `| Stat | Value |`,
      `|---|---|`,
      `| Visibility | ${repoData.private ? 'Private' : 'Public'} |`,
      `| Stars | ${repoData.stargazers_count} |`,
      `| Forks | ${repoData.forks_count} |`,
      `| Open Issues | ${repoData.open_issues_count} |`,
      ``,
      `---`,
      ``,
      `### 2. Recent Development Activity`,
      `Analysed **${totalCommits} recent commits**:`,
      themeLines || '- No commits found',
      ``,
      `---`,
      ``,
      `### 3. Key Contributors`,
      contributorLines,
      topContrib ? `\nTop contributor: **${topContrib.login}** with **${topContrib.contributions}** commits.` : '',
      ``,
      `---`,
      ``,
      `### 4. Commit Patterns`,
      `| Metric | Value |`,
      `|---|---|`,
      `| Commits analysed | ${totalCommits} |`,
      `| Active developers | ${uniqueAuthors.length} |`,
      `| Date range | ${oldest ? oldest.toLocaleDateString() : 'N/A'} to ${newest ? newest.toLocaleDateString() : 'N/A'} |`,
      `| Avg velocity | ~${velocity} commits/day |`,
      ``,
      `---`,
      ``,
      `### 5. Recent Commits`,
      recentCommitLines || '_No commits_',
      ``,
      `---`,
      ``,
      `### 6. Recommendations`,
      `- ${uniqueAuthors.length === 1 ? 'Single contributor - consider adding collaborators.' : uniqueAuthors.length + ' active contributors.'}`,
      `- ${repoData.open_issues_count > 10 ? repoData.open_issues_count + ' open issues - consider triaging.' : 'Issue count (' + repoData.open_issues_count + ') is manageable.'}`,
      `- ${repoData.description ? 'Repository has a description.' : 'Add a repository description for discoverability.'}`,
      `- Set ANTHROPIC_API_KEY in backend/.env for Claude AI insights.`,
    ].join('\n');

    res.json({
      summary: fallbackSummary,
      source: 'automated',
      repo: repoMeta,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) { handleGHError(err, res, 'generateSummary'); }
});

// ─── GET /api/github/repo-info ─────────────────────────────────────────────────
githubRouter.get('/repo-info', async (req: Request, res: Response) => {
  try {
    const { baseUrl } = resolveRepo(req);
    const { data } = await axios.get(baseUrl, { headers: ghHeaders() });
    res.json({
      name: data.full_name, description: data.description, language: data.language,
      stars: data.stargazers_count, forks: data.forks_count, issues: data.open_issues_count,
      url: data.html_url, updatedAt: data.updated_at, private: data.private,
      defaultBranch: data.default_branch,
    });
  } catch (err: any) { handleGHError(err, res, 'getRepoInfo'); }
});
