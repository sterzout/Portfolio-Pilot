import { PDFParse } from "pdf-parse";

export async function extractResumeText(fileBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: fileBuffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

// temporarily, at the bottom of resume.ts
import { readFileSync } from "fs";

const testBuffer = readFileSync("./test-resume.pdf"); // put any real PDF here
extractResumeText(testBuffer).then(console.log);