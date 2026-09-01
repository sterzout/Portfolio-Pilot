import "dotenv/config";
import { createOpenRouter} from "@openrouter/ai-sdk-provider";
import { z } from "zod"
import { generateObject, generateText } from "ai";  // Fix: Core function wrapper
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

  // #region agent log
  fetch('http://127.0.0.1:7425/ingest/f16729d2-1077-414a-9da5-0c6e4c79fce3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45114e'},body:JSON.stringify({sessionId:'45114e',location:'gemini.ts:answerFollowUp:pre',message:'Calling follow-up AI',data:{api:'generateText',model:'openrouter/free',contextType:context.type},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion

  const response = await generateText({
    model: openrouter("openrouter/free"),
    prompt,
  });

  // #region agent log
  fetch('http://127.0.0.1:7425/ingest/f16729d2-1077-414a-9da5-0c6e4c79fce3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45114e'},body:JSON.stringify({sessionId:'45114e',location:'gemini.ts:answerFollowUp:post',message:'Follow-up AI success',data:{textLength:response.text?.length??0,modelId:response.response?.modelId??'unknown'},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  return response.text;
}