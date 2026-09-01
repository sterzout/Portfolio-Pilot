import "dotenv/config";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { generateObject, generateText } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

interface GithubProfile {
  repoCount: number;
  languages: string[];
  topics: string[];
  repos: { name: string; description: string | null; language: string | null }[];
}

export interface SkillGapAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  suggestedProject: {
    title: string;
    description: string;
    skillsItCovers: string[];
  };
  summary: string;
  repositoriesSummary: string[];
  repositoriesLanguages: string[];
}

const skillGapSchema = z
  .object({
    matchedSkills: z.array(z.string()),
    missingSkills: z.array(z.string()),
    suggestedProject: z.object({
      title: z.string(),
      description: z.string(),
      skillsItCovers: z.array(z.string()),
    }),
    summary: z.string().optional(),
    overallAssessment: z.string().optional(),
    repositoriesSummary: z.array(z.string()).optional(),
    repositoriesLanguages: z.array(z.string()).optional(),
  })
  .transform((data): SkillGapAnalysis => ({
    matchedSkills: data.matchedSkills,
    missingSkills: data.missingSkills,
    suggestedProject: data.suggestedProject,
    summary: data.summary ?? data.overallAssessment ?? "Analysis complete.",
    repositoriesSummary: data.repositoriesSummary ?? [],
    repositoriesLanguages: data.repositoriesLanguages ?? [],
  }));

const ANALYSIS_MODEL = openrouter("openrouter/free");

export async function analyzeGaps(
  resumeText: string,
  githubProfile: GithubProfile,
  jobDescription: string
): Promise<SkillGapAnalysis> {
  const prompt = `
You are a career coach helping a software developer or other business/technical professional prepare for a specific job application.

Compare the following three inputs (please only use the information provided in the inputs, do not make up any information):

1. RESUME TEXT:
${resumeText}

2. GITHUB PROFILE (aggregated from all public repos):
Languages used: ${githubProfile.languages.join(", ")}
Topics/tags across repos: ${githubProfile.topics.join(", ")}
Repo count: ${githubProfile.repoCount}
Sample repos: ${githubProfile.repos.slice(0, 15).map(r => `${r.name} (${r.language ?? "unknown"}): ${r.description ?? "no description"}`).join("\n")}

3. JOB DESCRIPTION:
${jobDescription}

Respond ONLY in valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "matchedSkills": string[],
  "missingSkills": string[],
  "suggestedProject": {
    "title": string,
    "description": string,
    "skillsItCovers": string[]
  },
  "summary": string,
  "repositoriesSummary": string[],
  "repositoriesLanguages": string[]
}

IMPORTANT: "summary" is required. It must be a 2-4 paragraph overall assessment of the candidate's fit for the role.
`;

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await generateObject({
        model: ANALYSIS_MODEL,
        schemaName: "SkillGapAnalysis",
        schema: skillGapSchema,
        prompt,
      });

      return response.object;
    } catch (err) {
      lastError = err;
      console.warn(`analyzeGaps attempt ${attempt + 1} failed`);
    }
  }

  throw lastError;
}

interface ChatContextInput {
  type: "repo" | "resume";
  repoUrl?: string;
  owner?: string;
  repoData?: {
    files: string[];
    languages: string[];
    commits: { message: string; date: string }[];
  };
  jobDescription?: string;
  analysisResult?: {
    matchedSkills: string[];
    missingSkills: string[];
    suggestedProject: { title: string; description: string; skillsItCovers: string[] };
    summary: string;
  };
  previousMessages?: { role: "user" | "assistant"; content: string }[];
}

export async function answerFollowUp(message: string, context: ChatContextInput) {
  const history = (context.previousMessages ?? [])
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const repoBlock =
    context.type === "repo" && context.repoData
      ? `
REPOSITORY: ${context.repoUrl ?? "unknown"}
Files (${context.repoData.files.length}): ${context.repoData.files.slice(0, 20).join(", ")}${context.repoData.files.length > 20 ? "…" : ""}
Languages: ${context.repoData.languages.join(", ") || "none"}
Recent commits: ${context.repoData.commits.slice(0, 5).map((c) => c.message).join(" | ") || "none"}
`
      : "";

  const resumeBlock =
    context.type === "resume" && context.analysisResult
      ? `
RESUME ANALYSIS SUMMARY:
${context.analysisResult.summary}
Matched skills: ${context.analysisResult.matchedSkills.join(", ")}
Missing skills: ${context.analysisResult.missingSkills.join(", ")}
Suggested project: ${context.analysisResult.suggestedProject.title} — ${context.analysisResult.suggestedProject.description}
GitHub user: ${context.owner || "not provided"}
Job description excerpt: ${(context.jobDescription ?? "").slice(0, 800)}
`
      : "";

  const prompt = `
You are a career coach assistant helping a developer with portfolio and job-application questions.
Use ONLY the context below. Be concise, practical, and friendly.

CONTEXT TYPE: ${context.type}
${repoBlock}
${resumeBlock}

CONVERSATION SO FAR:
${history || "(none)"}

USER QUESTION:
${message}

Respond in plain text (2–4 short paragraphs max). No JSON, no markdown fences.
`;

  const response = await generateText({
    model: ANALYSIS_MODEL,
    prompt,
  });

  return response.text;
}
