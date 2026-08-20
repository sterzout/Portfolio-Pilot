import { useState } from 'react';

// matches what fetchRepoCommits returns from the backend
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

// ⚠️ Confirm this matches the exact path you registered in server.ts
const RESUME_ANALYSIS_ENDPOINT = 'http://localhost:4000/resume-analysis';

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
      const response = await fetch(`http://localhost:4000/repo-data?owner=${owner}&repo=${repo}`);

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
      const response = await fetch('http://localhost:4000/analyses', {
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

      setSaveMessage('Saved!');
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
      setResumeMessage('Please fill in owner/username and job description too.');
      return;
    }

    setFileLoading(true);
    setResumeMessage('');
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', pdfFile);
      formData.append('username', owner); // field name must match req.body.username on the backend
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
      setResumeMessage(`Analysis complete for "${pdfFile.name}"`);
    } catch (err: any) {
      setResumeMessage(err.message || 'Failed to upload resume.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleLoadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('http://localhost:4000/analyses');
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

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "600px", margin: "auto" }}>
      <h1>GitHub Repo Analyzer</h1>

      <form onSubmit={handleFetchData} style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "20px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Owner / Username:</label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="e.g., facebook"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Repository Name:</label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="e.g., react"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        <button type="submit" style={{ padding: "10px", background: "#007bff", color: "white", border: "none", cursor: "pointer", fontWeight: "bold" }}>
          {loading ? 'Fetching...' : 'Get Repo Files'}
        </button>
      </form>

      <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "5px", background: "#f8f9fa" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.1em" }}>Resume + Job Description Analysis</h2>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => {
            setPdfFile(e.target.files?.[0] ?? null);
            setResumeMessage('');
          }}
          style={{ marginBottom: "10px" }}
        />
        {pdfFile && (
          <p style={{ margin: "0 0 10px", color: "#666", fontSize: "0.9em" }}>{pdfFile.name}</p>
        )}

        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          style={{ width: "100%", minHeight: "100px", padding: "8px", marginBottom: "10px", boxSizing: "border-box" }}
        />

        <button
          type="button"
          onClick={handleUploadResume}
          disabled={!pdfFile || fileLoading}
          style={{ padding: "10px", background: "#17a2b8", color: "white", border: "none", cursor: pdfFile ? "pointer" : "not-allowed", fontWeight: "bold" }}
        >
          {fileLoading ? 'Analyzing...' : 'Analyze Resume Against Job'}
        </button>
        {resumeMessage && <p style={{ marginTop: "10px", marginBottom: 0 }}>{resumeMessage}</p>}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {files.length > 0 && (
        <button
          onClick={handleSaveAnalysis}
          disabled={saving}
          style={{ padding: "10px", background: "#28a745", color: "white", border: "none", cursor: "pointer", fontWeight: "bold", marginBottom: "20px" }}
        >
          {saving ? 'Saving...' : 'Save Analysis'}
        </button>
      )}
      {saveMessage && <p>{saveMessage}</p>}

      <h2>Files:</h2>
      {files.length > 0 ? (
        <ul style={{ background: "#f8f9fa", padding: "20px", border: "1px solid #ddd", borderRadius: "5px", maxHeight: "300px", overflowY: "auto" }}>
          {files.map((file, index) => (
            <li key={index} style={{ padding: "4px 0" }}>{file}</li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#666" }}>No files loaded yet. Enter an owner and repository above.</p>
      )}

      <h2>Languages:</h2>
      {languages.length > 0 ? (
        <ul style={{ background: "#f8f9fa", padding: "20px", border: "1px solid #ddd", borderRadius: "5px", maxHeight: "300px", overflowY: "auto" }}>
          {languages.map((language, index) => (
            <li key={index} style={{ padding: "4px 0" }}>{language}</li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#666" }}>No languages detected or loaded yet. Enter an owner and repository above.</p>
      )}

      <h2>Commits:</h2>
      {commits.length > 0 ? (
        <ul style={{ background: "#f8f9fa", padding: "20px", border: "1px solid #ddd", borderRadius: "5px", maxHeight: "300px", overflowY: "auto" }}>
          {commits.map((commit, index) => (
            <li key={index} style={{ padding: "4px 0" }}>
              <strong>{commit.message}</strong> — {new Date(commit.date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#666" }}>No commits found or loaded yet. Enter an owner and repository above.</p>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>History</h2>
      <button
        onClick={handleLoadHistory}
        disabled={historyLoading}
        style={{ padding: "10px", background: "#6c757d", color: "white", border: "none", cursor: "pointer", fontWeight: "bold", marginBottom: "15px" }}
      >
        {historyLoading ? 'Loading...' : 'Load Saved Analyses'}
      </button>

      {history.length > 0 && (
        <ul style={{ background: "#f8f9fa", padding: "20px", border: "1px solid #ddd", borderRadius: "5px" }}>
          {history.map((item) => (
            <li key={item.id} style={{ padding: "8px 0", borderBottom: "1px solid #ddd" }}>
              <strong>{item.repo_url}</strong> — {new Date(item.analyzed_at).toLocaleString()}
              <br />
              <span style={{ color: "#666", fontSize: "0.9em" }}>
                {item.result.files.length} files, {item.result.languages.length} languages, {item.result.commits.length} commits
              </span>
            </li>
          ))}
        </ul>
      )}

      {analysisResult && (
        <div style={{
          position: "fixed",
          top: "40px",
          right: "40px",
          width: "320px",
          maxHeight: "80vh",
          overflowY: "auto",
          background: "#ffffff",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          <h2 style={{ marginTop: 0 }}>Gap Analysis</h2>

          <h3 style={{ fontSize: "0.95em", marginBottom: "4px" }}>Summary</h3>
          <p style={{ fontSize: "0.9em", color: "#333" }}>{analysisResult.summary}</p>

          <h3 style={{ fontSize: "0.95em", marginBottom: "4px" }}>✅ Matched Skills</h3>
          <ul style={{ fontSize: "0.85em", paddingLeft: "20px" }}>
            {analysisResult.matchedSkills.map((skill, i) => <li key={i}>{skill}</li>)}
          </ul>

          <h3 style={{ fontSize: "0.95em", marginBottom: "4px" }}>❌ Missing Skills</h3>
          <ul style={{ fontSize: "0.85em", paddingLeft: "20px" }}>
            {analysisResult.missingSkills.map((skill, i) => <li key={i}>{skill}</li>)}
          </ul>

          <h3 style={{ fontSize: "0.95em", marginBottom: "4px" }}>💡 Suggested Project</h3>
          <p style={{ fontSize: "0.85em" }}>
            <strong>{analysisResult.suggestedProject.title}</strong><br />
            {analysisResult.suggestedProject.description}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;