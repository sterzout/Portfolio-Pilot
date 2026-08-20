import "dotenv/config";
import { createOpenRouter} from "@openrouter/ai-sdk-provider";
import { z } from "zod"
import { generateObject } from "ai";  // Fix: Core function wrapper
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "", //
});

interface GithubProfile {
  repoCount: number;
  languages: string[];
  topics: string[];
  repos: { name: string; description: string | null; language: string | null }[];
}

export async function analyzeGaps(
  resumeText: string,
  githubProfile: GithubProfile,
  jobDescription: string
) {
  const prompt = `
You are a career coach helping a software developer or other business/technical professional prepare for a specific job application.

Compare the following three inputs:

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
  "repositoriesLanguages": string[],
  "overallAssessment": string
}
`;

const response = await generateObject({
  model: openrouter("openrouter/free"), // Fix: Core provider function wrapper
  schemaName: "SkillGapAnalysis",
  schema: z.object({
    matchedSkills: z.array(z.string()),
    missingSkills: z.array(z.string()),
    suggestedProject: z.object({
      title: z.string(),
      description: z.string(),
      skillsItCovers: z.array(z.string())
    }),
    summary: z.string(),
    repositoriesSummary: z.array(z.string()),
    repositoriesLanguages: z.array(z.string()),
    overallAssessment: z.string()
  }),
  prompt: prompt,
});

// response.object is already fully parsed, validated, typed, and ready to go!
return response.object;
}