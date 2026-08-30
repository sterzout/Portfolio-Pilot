import { useState } from 'react';
import FileList from './components/FileList';
import LanguagesList from './components/LanguagesList';
import RecentCommits from './components/RecentCommits';
import './App.css';

interface Commit {
  message: string;
  date: string;
}

interface RepoData {
  files: string[];
  languages: string[];
  commits: Commit[];
}

interface SavedAnalysis {
  id: string;
  repo_url: string;
  result: RepoData;
  analyzed_at: string;
}

interface AnalysisResult {
  matchedSkills: string[];
  missingSkills: string[];
  suggestedProject: {
    title: string;
    description: string;
    skillsItCovers: string[];
  };
  summary: string;
}

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

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

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

      if (!response.ok) {
        throw new Error('HTTP Error: data was not able to load');
      }

      const data: RepoData = await response.json();

      setFiles(data.files);
      setLanguages(data.languages);
      setCommits(data.commits);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching files.');
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

      if (!response.ok) {
        throw new Error('Failed to save analysis');
      }

      setSaveMessage('Analysis saved successfully.');
    } catch (err: any) {
      setSaveMessage(err.message || 'Failed to save analysis.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadResume = async () => {
    if (!pdfFile) {
      setResumeMessage('Please select a PDF first.');
      return;
    }
    if (!owner || !jobDescription) {
      setResumeMessage('Please fill in GitHub username and job description.');
      return;
    }

    setFileLoading(true);
    setResumeMessage('');
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', pdfFile);
      formData.append('username', owner);
      formData.append('jobDescription', jobDescription);

      const response = await fetch(RESUME_ANALYSIS_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze resume');
      }

      const data: AnalysisResult = await response.json();
      setAnalysisResult(data);
      setResumeMessage('');
    } catch (err: any) {
      setResumeMessage(err.message || 'Failed to upload resume.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleLoadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/analyses`);
      if (!response.ok) {
        throw new Error('Failed to load history');
      }
      const data: SavedAnalysis[] = await response.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const hasRepoData = files.length > 0 || languages.length > 0 || commits.length > 0;

  return (
    <div className="app">
      <div className="app-bg" aria-hidden="true" />

      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">P</div>
          <div>
            <h1>Portfolio Pilot</h1>
            <p>Analyze GitHub repos, match your resume to job postings, and find skill gaps.</p>
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
                  setAnalysisResult(null);
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

          <div className="messages">
            {jobDescription.trim() && pdfFile && !fileLoading && !analysisResult && (
              <div className="message message-user">
                <div className="bubble bubble-user">
                  Analyze my resume for this role using my GitHub profile (@{owner || 'username'}).
                </div>
              </div>
            )}

            {fileLoading && <LoadingDots />}

            {resumeMessage && (
              <div className="message message-assistant">
                <div className="bubble bubble-assistant">{resumeMessage}</div>
              </div>
            )}

            {analysisResult && (
              <div className="message message-assistant">
                <div className="bubble bubble-assistant">
                  <h4>Summary</h4>
                  <p>{analysisResult.summary}</p>

                  <h4>Matched skills</h4>
                  <div className="tags">
                    {analysisResult.matchedSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="tag tag-match"
                        style={{ '--tag-delay': `${i * 40}ms` } as React.CSSProperties}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <h4>Missing skills</h4>
                  <div className="tags">
                    {analysisResult.missingSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="tag tag-missing"
                        style={{ '--tag-delay': `${i * 40}ms` } as React.CSSProperties}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <h4>Suggested project</h4>
                  <p>
                    <strong>{analysisResult.suggestedProject.title}</strong>
                    <br />
                    {analysisResult.suggestedProject.description}
                  </p>
                  {analysisResult.suggestedProject.skillsItCovers.length > 0 && (
                    <div className="tags">
                      {analysisResult.suggestedProject.skillsItCovers.map((skill, i) => (
                        <span
                          key={i}
                          className="tag"
                          style={{ '--tag-delay': `${i * 40}ms` } as React.CSSProperties}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
                  className={saveMessage.startsWith('Failed') ? 'error-banner' : 'success-banner'}
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

        <section className="card" style={{ '--delay': '560ms' } as React.CSSProperties}>
          <h2 className="card-title">Saved analyses</h2>
          <button
            type="button"
            className={`btn btn-secondary${historyLoading ? ' btn-loading' : ''}`}
            onClick={handleLoadHistory}
            disabled={historyLoading}
          >
            {historyLoading ? 'Loading…' : 'Load history'}
          </button>
          {historyLoading && <LoadingDots />}
          {history.length > 0 && (
            <div className="history-list">
              {history.map((item, index) => (
                <div
                  key={item.id}
                  className="history-item"
                  style={{ '--item-delay': `${index * 50}ms` } as React.CSSProperties}
                >
                  <strong>{item.repo_url}</strong>
                  <div className="history-meta">
                    {new Date(item.analyzed_at).toLocaleString()} ·{' '}
                    {item.result.files.length} files, {item.result.languages.length} languages,{' '}
                    {item.result.commits.length} commits
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
