import type { AnalysisSession } from '../types/analysis';

interface AnalysisSidebarProps {
  sessions: AnalysisSession[];
  activeSessionId: string | null;
  loading: boolean;
  onNewAnalysis: () => void;
  onSelectSession: (session: AnalysisSession) => void;
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function sessionIcon(type: AnalysisSession['type']) {
  return type === 'resume' ? '✦' : '⌂';
}

export default function AnalysisSidebar({
  sessions,
  activeSessionId,
  loading,
  onNewAnalysis,
  onSelectSession,
}: AnalysisSidebarProps) {
  return (
    <aside className="analysis-sidebar">
      <div className="sidebar-header">
        <h2>Analyses</h2>
        <button type="button" className="btn btn-primary btn-new-analysis" onClick={onNewAnalysis}>
          + New analysis
        </button>
      </div>

      <div className="sidebar-list">
        {loading && (
          <div className="sidebar-empty">Loading saved analyses…</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="sidebar-empty">
            No analyses yet. Run a repo lookup or resume analysis to start.
          </div>
        )}

        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className={`sidebar-item${activeSessionId === session.id ? ' active' : ''}`}
            onClick={() => onSelectSession(session)}
          >
            <span className="sidebar-item-icon">{sessionIcon(session.type)}</span>
            <span className="sidebar-item-body">
              <span className="sidebar-item-title">{session.title}</span>
              <span className="sidebar-item-meta">
                {session.type === 'resume' ? 'Resume analysis' : 'Repository'} · {formatRelativeTime(session.createdAt)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
