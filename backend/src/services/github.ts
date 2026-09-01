import "dotenv/config";
import { extractResumeText } from "./resume.js";
import { analyzeGaps } from "./gemini.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function fetchRepoFiles(owner: string, repo: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
  });
  
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  const filenames = data.map((file: any) => file.name);
  return filenames;
}

export async function fetchRepoLanguages(owner: string, repo: string) {
    const url = `https://api.github.com/repos/${owner}/${repo}/languages`;
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
    });
    
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    const languages = Object.keys(data);
    return languages;
  }

  export async function fetchRepoCommits(owner: string, repo: string) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits`;
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
    });
    
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    const commits = data.map((commit: any) => ({
        message: commit.commit.message,
        date: commit.commit.author.date
      }));
    return commits;
  }

  export async function fetchRepoSummary(owner: string, repo: string) {
    const start = Date.now();
    const [files, languages, commits] = await Promise.all([
    fetchRepoFiles(owner, repo),
    fetchRepoLanguages(owner, repo),
    fetchRepoCommits(owner, repo),
    ]);
    console.log(`Repo summary fetched in ${Date.now() - start}ms`);
    return { files, languages, commits };
  }

//user info fetching

export async function fetchUserRepos(username: string) {
  const url = `https://api.github.com/users/${username}/repos?per_page=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const repos = data.map((repo: any) => ({
    name: repo.name,
    description: repo.description,
    language: repo.language,
    topics: repo.topics ?? [],
    url: repo.html_url,
    updatedAt: repo.updated_at,
  }));
  return repos;
}

export async function fetchUserProfile(username: string) {
  const repos = await fetchUserRepos(username);

  // aggregate every language used across all repos, deduplicated
  const languageSet = new Set<string>();
    for (const repo of repos) {
      if (repo.language) {
        languageSet.add(repo.language);
      }
}

  // aggregate every topic tag across all repos, deduplicated
  const topicSet = new Set<string>();
  for (const repo of repos) {
    for (const topic of repo.topics) topicSet.add(topic);
  }

  return {
    repoCount: repos.length,
    languages: Array.from(languageSet),
    topics: Array.from(topicSet),
    repos
  }
}

export async function fetchUserProfileAnalysis(username: string, resumeBuffer: Buffer, jobDescription: string) {
  const resumeText = await extractResumeText(resumeBuffer);
  if (username === "") {
    return await analyzeGaps(resumeText, { repoCount: 0, languages: [], topics: [], repos: [] }, jobDescription);
  } else {
    const githubProfile = await fetchUserProfile(username);
    return await analyzeGaps(resumeText, githubProfile, jobDescription);
  }
}
