import { useCallback, useEffect, useState } from 'react';
import FileList from './components/FileList';
import LanguagesList from './components/LanguagesList';
import RecentCommits from './components/RecentCommits';
import AnalysisSidebar from './components/AnalysisSidebar';
import AnalysisChat from './components/AnalysisChat';
import type {
  AnalysisResult,
  AnalysisSession,
  ChatContext,
  Commit,
  RepoData,
  SavedAnalysis,
} from './types/analysis';
import {
  createMessageId,
  createSessionId,
  loadLocalSessions,
  mergeSessions,
  parseRepoUrl,
  saveLocalSessions,
} from './utils/sessions';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL;
const RESUME_ANALYSIS_ENDPOINT = `${API_URL}/resume-analysis`;

function LoadingDots() {
  return (
    <div className="loading-row">
      <div className="loading-bubble">
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmNoOwner, setConfirmNoOwner] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState('');

  const [chatLoading, setChatLoading] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const persistSessions = useCallback((next: AnalysisSession[] | ((prev: AnalysisSession[]) => AnalysisSession[])) => {
    setSessions((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      saveLocalSessions(resolved);
      return resolved;
    });
  }, []);

  const updateSession = useCallback(
    (sessionId: string, updater: (session: AnalysisSession) => AnalysisSession) => {
      persistSessions((prev) => prev.map((s) => (s.id === sessionId ? updater(s) : s)));
    },
    [persistSessions]
  );

  const loadSavedAnalyses = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/analyses`);
      if (!response.ok) throw new Error('Failed to load history');
      const saved: SavedAnalysis[] = await response.json();
      const merged = mergeSessions(loadLocalSessions(), saved);
      setSessions(merged);
      return merged;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load history.';
      setError(message);
      const local = loadLocalSessions();
      setSessions(local);
      return local;
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedAnalyses();
  }, [loadSavedAnalyses]);

  const applyRepoData = (repoUrl: string, data: RepoData) => {
    const { owner: o, repo: r } = parseRepoUrl(repoUrl);
    setOwner(o);
    setRepo(r);
    setFiles(data.files);
    setLanguages(data.languages);
    setCommits(data.commits);
  };

  const handleSelectSession = (session: AnalysisSession) => {
    setActiveSessionId(session.id);
    if (session.type === 'repo' && session.repoData && session.repoUrl) {
      applyRepoData(session.repoUrl, session.repoData);
    }
    if (session.type === 'resume') {
      if (session.owner) setOwner(session.owner);
      if (session.jobDescription) setJobDescription(session.jobDescription);
      if (session.analysisResult) {
        setResumeMessage('');
      }
    }
  };

  const handleNewAnalysis = () => {
    const session: AnalysisSession = {
      id: createSessionId(),
      title: 'New analysis',
      type: 'resume',
      createdAt: new Date().toISOString(),
      owner,
      jobDescription,
      messages: [
        {
          id: createMessageId(),
          role: 'assistant',
          content:
            'Starting a fresh analysis thread. Upload your resume and paste a job description above, or fetch a repository — then ask follow-up questions here.',
        },
      ],
    };
    persistSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setResumeMessage('');
  };

  const handleFetchData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner || !repo) {
      setError('Please enter both owner and repository name.');
      return;
    }

    setLoading(true);
    setError('');
    setFiles([]);
    setLanguages([]);
    setCommits([]);
    setSaveMessage('');

    try {
      const response = await fetch(`${API_URL}/repo-data?owner=${owner}&repo=${repo}`);
      if (!response.ok) throw new Error('HTTP Error: data was not able to load');

      const data: RepoData = await response.json();
      setFiles(data.files);
      setLanguages(data.languages);
      setCommits(data.commits);

      const repoUrl = `${owner}/${repo}`;
      const repoSession: AnalysisSession = {
        id: createSessionId(),
        title: repoUrl,
        type: 'repo',
        createdAt: new Date().toISOString(),
        repoUrl,
        repoData: data,
        messages: [
          {
            id: createMessageId(),
            role: 'assistant',
            content: `Fetched **${repoUrl}** — ${data.files.length} files, ${data.languages.length} languages, ${data.commits.length} recent commits. Save this analysis or ask questions below.`,
          },
        ],
      };
      persistSessions((prev) => [
        repoSession,
        ...prev.filter((s) => s.title !== repoUrl || s.type !== 'repo'),
      ]);
      setActiveSessionId(repoSession.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching files.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const response = await fetch(`${API_URL}/analyses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: `${owner}/${repo}`,
          result: { files, languages, commits },
        }),
      });
      if (!response.ok) throw new Error('Failed to save analysis');
      const savedRow: SavedAnalysis = await response.json();
      setSaveMessage('Analysis saved successfully.');

      if (activeSessionId) {
        persistSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, savedAnalysisId: savedRow.id, repoUrl: savedRow.repo_url }
              : s
          )
        );
      }

      const merged = await loadSavedAnalyses();
      const saved = merged.find((s) => s.repoUrl === `${owner}/${repo}` && s.type === 'repo');
      if (saved) setActiveSessionId(saved.id);
    } catch (err: unknown) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save analysis.');
    } finally {
      setSaving(false);
    }
  };

  const addResumeSession = (data: AnalysisResult) => {
    const title = owner
      ? `Resume · @${owner}`
      : `Resume · ${jobDescription.slice(0, 32)}${jobDescription.length > 32 ? '…' : ''}`;

    const userMsg = {
      id: createMessageId(),
      role: 'user' as const,
      content: owner
        ? `Analyze my resume for this role using my GitHub profile (@${owner}).`
        : 'Analyze my resume for this role (no GitHub username provided).',
    };

    const assistantMsg = {
      id: createMessageId(),
      role: 'assistant' as const,
      content: data.summary,
      analysisResult: data,
    };

    const session: AnalysisSession = {
      id: createSessionId(),
      title,
      type: 'resume',
      createdAt: new Date().toISOString(),
      owner,
      jobDescription,
      analysisResult: data,
      messages: [userMsg, assistantMsg],
    };

    persistSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
  };

  const performUpload = async () => {
    setFileLoading(true);
    setResumeMessage('');
    setConfirmNoOwner(false);

    try {
      const formData = new FormData();
      formData.append('resume', pdfFile!);
      formData.append('username', owner);
      formData.append('jobDescription', jobDescription);

      const response = await fetch(RESUME_ANALYSIS_ENDPOINT, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to analyze resume');

      const data: AnalysisResult = await response.json();
      addResumeSession(data);
    } catch (err: unknown) {
      setResumeMessage(err instanceof Error ? err.message : 'Failed to upload resume.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleUploadResume = async () => {
    if (!pdfFile) {
      setResumeMessage('Please select a PDF first.');
      return;
    }
    if (!jobDescription) {
      setResumeMessage(
        'Please fill in the job description. If you are a software engineer, please also provide the github username for a better analysis.'
      );
      return;
    }
    if (!owner) {
      setConfirmNoOwner(true);
      return;
    }
    await performUpload();
  };

  const handleSendChatMessage = async (message: string) => {
    if (!activeSession) return;

    const userMsg = { id: createMessageId(), role: 'user' as const, content: message };
    const sessionId = activeSession.id;
    const priorMessages = activeSession.messages;

    updateSession(sessionId, (s) => ({
      ...s,
      messages: [...s.messages, userMsg],
    }));

    setChatLoading(true);
    try {
      const context: ChatContext = {
        type: activeSession.type,
        repoUrl: activeSession.repoUrl,
        owner: activeSession.owner ?? owner,
        repoData: activeSession.repoData ?? { files, languages, commits },
        jobDescription: activeSession.jobDescription ?? jobDescription,
        analysisResult: activeSession.analysisResult,
        previousMessages: [...priorMessages, userMsg].map((m) => ({
          role: m.role,
          content: 'analysisResult' in m && m.analysisResult ? m.analysisResult.summary : m.content,
        })),
      };

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      });
      if (!response.ok) throw new Error('Failed to get a reply');

      const { reply } = await response.json();
      updateSession(sessionId, (s) => ({
        ...s,
        messages: [...s.messages, { id: createMessageId(), role: 'assistant', content: reply }],
      }));
    } catch (err: unknown) {
      updateSession(sessionId, (s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: createMessageId(),
            role: 'assistant',
            content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          },
        ],
      }));
    } finally {
      setChatLoading(false);
    }
  };

  const hasRepoData = files.length > 0 || languages.length > 0 || commits.length > 0;

  return (
    <div className="app">
      <div className="app-bg" aria-hidden="true" />

      <div className="app-shell">
        <AnalysisSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          loading={historyLoading}
          onNewAnalysis={handleNewAnalysis}
          onSelectSession={handleSelectSession}
        />

        <div className="app-shell-main">
          <header className="app-header">
            <div className="app-header-inner">
              <div className="app-logo">P</div>
              <div>
                <h1>Portfolio Pilot</h1>
                <p>
                  Analyze GitHub repos, match your resume to job postings, and find skill gaps to
                  build your portfolio.
                </p>
              </div>
            </div>
          </header>

          <main className="app-main">
            {error && <div className="error-banner">{error}</div>}

            <section className="card" style={{ '--delay': '80ms' } as React.CSSProperties}>
              <h2 className="card-title">Repository lookup</h2>
              <form onSubmit={handleFetchData}>
                <div className="field">
                  <label htmlFor="owner">GitHub owner / username</label>
                  <input
                    id="owner"
                    className="input"
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. facebook"
                  />
                </div>
                <div className="field">
                  <label htmlFor="repo">Repository name</label>
                  <input
                    id="repo"
                    className="input"
                    type="text"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="e.g. react"
                  />
                </div>
                <button
                  type="submit"
                  className={`btn btn-primary btn-accent${loading ? ' btn-loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? 'Fetching…' : 'Fetch repository data'}
                </button>
              </form>
              {loading && <LoadingDots />}
            </section>

            <section className="card" style={{ '--delay': '160ms' } as React.CSSProperties}>
              <h2 className="card-title">Resume & job analysis</h2>
              <div className="field">
                <label htmlFor="resume">Resume (PDF)</label>
                <label className={`file-drop${pdfFile ? ' has-file' : ''}`} htmlFor="resume">
                  <input
                    id="resume"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      setPdfFile(e.target.files?.[0] ?? null);
                      setResumeMessage('');
                    }}
                  />
                  <span className="file-drop-icon">{pdfFile ? '✓' : '↑'}</span>
                  <span className="file-drop-label">
                    {pdfFile ? pdfFile.name : 'Drop your resume or click to browse'}
                  </span>
                  {!pdfFile && <span className="file-drop-hint">PDF only</span>}
                </label>
              </div>
              <div className="field">
                <label htmlFor="job">Job description</label>
                <textarea
                  id="job"
                  className="textarea"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here…"
                />
              </div>
              <button
                type="button"
                className={`btn btn-primary btn-accent${fileLoading ? ' btn-loading' : ''}`}
                onClick={handleUploadResume}
                disabled={!pdfFile || fileLoading}
              >
                {fileLoading ? 'Analyzing…' : 'Analyze resume against job'}
              </button>

              {confirmNoOwner && (
                <div className="message message-assistant">
                  <div className="bubble bubble-assistant">
                    <p>
                      You didn't enter a GitHub username — the analysis will only use your resume
                      and the job description, without checking your GitHub profile. Continue
                      anyway?
                    </p>
                    <div className="form-actions" style={{ marginTop: 12 }}>
                      <button type="button" className="btn btn-primary" onClick={performUpload}>
                        Yes, continue
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setConfirmNoOwner(false)}
                      >
                        No, go back
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(fileLoading || resumeMessage) && (
                <div className="messages">
                  {fileLoading && <LoadingDots />}
                  {resumeMessage && (
                    <div className="message message-assistant">
                      <div className="bubble bubble-assistant">{resumeMessage}</div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {hasRepoData && (
              <>
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-value">{files.length}</div>
                    <div className="stat-label">Files</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{languages.length}</div>
                    <div className="stat-label">Languages</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{commits.length}</div>
                    <div className="stat-label">Commits</div>
                  </div>
                </div>

                <section className="card" style={{ '--delay': '240ms' } as React.CSSProperties}>
                  <div className="form-actions">
                    <button
                      type="button"
                      className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                      onClick={handleSaveAnalysis}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save analysis'}
                    </button>
                  </div>
                  {saving && <LoadingDots />}
                  {saveMessage && (
                    <div
                      className={
                        saveMessage.startsWith('Failed') ? 'error-banner' : 'success-banner'
                      }
                      style={{ marginTop: 12 }}
                    >
                      {saveMessage}
                    </div>
                  )}
                </section>
              </>
            )}

            <div className="section-grid">
              <div className="panel" style={{ '--delay': '320ms' } as React.CSSProperties}>
                <div className="panel-header">Files</div>
                {files.length > 0 ? (
                  <div className="panel-body">
                    <FileList files={files} />
                  </div>
                ) : (
                  <div className="panel-empty">No files loaded yet.</div>
                )}
              </div>

              <div className="panel" style={{ '--delay': '400ms' } as React.CSSProperties}>
                <div className="panel-header">Languages</div>
                {languages.length > 0 ? (
                  <div className="panel-body">
                    <div className="tags">
                      <LanguagesList languages={languages} />
                    </div>
                  </div>
                ) : (
                  <div className="panel-empty">No languages loaded yet.</div>
                )}
              </div>

              <div className="panel" style={{ '--delay': '480ms' } as React.CSSProperties}>
                <div className="panel-header">Recent commits</div>
                {commits.length > 0 ? (
                  <div className="panel-body">
                    <RecentCommits commits={commits} />
                  </div>
                ) : (
                  <div className="panel-empty">No commits loaded yet.</div>
                )}
              </div>
            </div>

            <AnalysisChat
              session={activeSession}
              chatLoading={chatLoading}
              onSendMessage={handleSendChatMessage}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
