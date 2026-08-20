import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { fetchRepoFiles, fetchRepoLanguages, fetchRepoCommits, fetchRepoSummary, fetchUserProfile, fetchUserProfileAnalysis } from "./services/github.js";
import { createAnalysis, getAnalysis, listAnalyses } from "./db/queries.js";
import multer from "multer";
import { extractResumeText } from "./services/resume.js";
import { analyzeGaps } from "./services/gemini.js";
const app = express();

const upload = multer();

const port = 4000;

app.use(cors());
app.use(express.json());

app.get("/home", (_req: Request, res: Response) => {
  res.json({
    redirectLink: "https://google.ca",
    redirectMessage: "Hello World",
    redirectAction: "yes",
  });
});

app.get("/repo-files", async (req: Request, res: Response) => {
  try {
    const files = await fetchRepoFiles(req.query.owner as string, req.query.repo as string);
    return res.json(files);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch repo files" });
  }
});

app.get("/repo-languages", async (req: Request, res: Response) => {
  try {
    const languages = await fetchRepoLanguages(req.query.owner as string, req.query.repo as string);
    return res.json(languages);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch repo languages" });
  }
});

app.get("/repo-commits", async (req: Request, res: Response) => {
  try {
    const commits = await fetchRepoCommits(req.query.owner as string, req.query.repo as string);
    return res.json(commits);
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to fetch repo commits" });
  }
});

app.get("/repo-data", async (req: Request, res: Response) => {
  try {
    const summary = await fetchRepoSummary(req.query.owner as string, req.query.repo as string);
    return res.json(summary);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch repo summary (files, languages and commits" });
  }
});


//resume upload endpoint

app.post("/parse-resume", upload.single("resume"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No resume file uploaded" });
    }
    const text = await extractResumeText(req.file.buffer);
    return res.json({ text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to parse resume" });
  }
});

//db queries api

app.post("/analyses", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const repoUrl = body.repoUrl;
    const result = body.result;
    if (!repoUrl || !result) {
      return res.status(400).json({ error: "repoUrl and result are required" });
    }
    if (
      !Array.isArray(result.files) ||
      !Array.isArray(result.languages) ||
      !Array.isArray(result.commits)
    ) {
      return res.status(400).json({ error: "result must include files, languages, and commits arrays" });
    }
    const saved = await createAnalysis(repoUrl, result);
    return res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save analysis" });
  }
});

app.get("/analyses", async (_req: Request, res: Response) => {
  try {
    const analyses = await listAnalyses();
    return res.json(analyses);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch analyses" });
  }
});

app.get("/analyses/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;           // ✅ just the string
    if (!id) {
      return res.status(400).json({ error: "Analysis id is required" });
    }
    const analysis = await getAnalysis(id);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    return res.json(analysis);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch analysis" });
  }
});


//user info based on repos and github

//since we write req.query.username as string, we need to cast it to a string in the get api endpoint
//ex: /user-profile?username=john-doe
app.get("/user-profile", async (req: Request, res: Response) => {
  try {
    const profile = await fetchUserProfile(req.query.username as string);
    return res.json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});


app.post("/resume-analysis", upload.single("resume"), async (req: Request, res: Response) => {
  const username = req.body.username as string;
  const jobDescription = req.body.jobDescription as string;
  const resumeFile = req.file;

  if (!resumeFile) {
    return res.status(400).json({ error: "No resume file uploaded (expected field name: 'resume')" });
  }
  if (!username || !jobDescription) {
    return res.status(400).json({ error: "username and jobDescription are required" });
  }

  try {
    const analysis = await fetchUserProfileAnalysis(username, resumeFile.buffer, jobDescription);
    return res.json(analysis);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user profile analysis" });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


