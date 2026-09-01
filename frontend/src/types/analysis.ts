export interface Commit {
  message: string;
  date: string;
}

export interface RepoData {
  files: string[];
  languages: string[];
  commits: Commit[];
}

export interface SavedAnalysis {
  id: string;
  repo_url: string;
  result: RepoData;
  analyzed_at: string;
}

export interface AnalysisResult {
  matchedSkills: string[];
  missingSkills: string[];
  suggestedProject: {
    title: string;
    description: string;
    skillsItCovers: string[];
  };
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  analysisResult?: AnalysisResult;
}

export interface AnalysisSession {
  id: string;
  title: string;
  type: 'repo' | 'resume';
  createdAt: string;
  repoUrl?: string;
  owner?: string;
  repoData?: RepoData;
  jobDescription?: string;
  analysisResult?: AnalysisResult;
  messages: ChatMessage[];
  savedAnalysisId?: string;
}

export interface ChatContext {
  type: 'repo' | 'resume';
  repoUrl?: string;
  owner?: string;
  repoData?: RepoData;
  jobDescription?: string;
  analysisResult?: AnalysisResult;
  previousMessages?: { role: 'user' | 'assistant'; content: string }[];
}
