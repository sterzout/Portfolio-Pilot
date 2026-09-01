import type { AnalysisSession } from '../types/analysis';

const STORAGE_KEY = 'portfolio-pilot-sessions';

export function loadLocalSessions(): AnalysisSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalysisSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalSessions(sessions: AnalysisSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMessageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultRepoMessage(repoUrl: string, result: AnalysisSession['repoData']) {
  return {
    id: createMessageId(),
    role: 'assistant' as const,
    content: `Loaded saved repo analysis for **${repoUrl}** (${result?.files.length ?? 0} files, ${result?.languages.length ?? 0} languages, ${result?.commits.length ?? 0} commits). Ask me anything about this repository.`,
  };
}

export function mergeSessions(
  local: AnalysisSession[],
  saved: { id: string; repo_url: string; result: AnalysisSession['repoData']; analyzed_at: string }[]
): AnalysisSession[] {
  const localByDbId = new Map(
    local.filter((s) => s.savedAnalysisId).map((s) => [s.savedAnalysisId!, s])
  );
  const localByRepoUrl = new Map(
    local.filter((s) => s.repoUrl).map((s) => [s.repoUrl!, s])
  );
  const consumedLocalIds = new Set<string>();

  const fromDb: AnalysisSession[] = saved.map((item) => {
    const existing = localByDbId.get(item.id) ?? localByRepoUrl.get(item.repo_url);
    if (existing) consumedLocalIds.add(existing.id);

    return {
      id: existing?.id ?? `db-${item.id}`,
      savedAnalysisId: item.id,
      title: item.repo_url,
      type: 'repo' as const,
      createdAt: existing?.createdAt ?? item.analyzed_at,
      repoUrl: item.repo_url,
      repoData: item.result,
      messages:
        existing?.messages && existing.messages.length > 0
          ? existing.messages
          : [defaultRepoMessage(item.repo_url, item.result)],
    };
  });

  const dbIds = new Set(saved.map((s) => s.id));
  const dbRepoUrls = new Set(saved.map((s) => s.repo_url));

  const localOnly = local.filter(
    (s) =>
      !consumedLocalIds.has(s.id) &&
      !(s.savedAnalysisId && dbIds.has(s.savedAnalysisId)) &&
      !(s.type === 'repo' && s.repoUrl && dbRepoUrls.has(s.repoUrl))
  );

  return [...localOnly, ...fromDb].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const [owner = '', repo = ''] = repoUrl.split('/');
  return { owner, repo };
}
