import pool from "./client.js";

export async function createAnalysis(repoUrl: string, result: object) {
  const sql = `INSERT INTO analyses (repo_url, result) VALUES ($1, $2) RETURNING *`;
  const values = [repoUrl, result]; // pg handles object -> JSONB directly, no stringify needed
  try {
    const queryResult = await pool.query(sql, values);
    return queryResult.rows[0];
  } catch (err) {
    console.error("createAnalysis failed:", err);
    throw new Error("Failed to save analysis");
  }
}

export async function getAnalysis(id: string) {
  const sql = `SELECT * FROM analyses WHERE id = $1`;
  const values = [id];
  try {
    const queryResult = await pool.query(sql, values);
    return queryResult.rows[0] ?? null; // explicit null when no match, instead of undefined
  } catch (err) {
    console.error("getAnalysis failed:", err);
    throw new Error("Failed to fetch analysis");
  }
}

export async function listAnalyses() {
  const sql = `SELECT * FROM analyses ORDER BY analyzed_at DESC`;
  try {
    const queryResult = await pool.query(sql);
    return queryResult.rows;
  } catch (err) {
    console.error("listAnalyses failed:", err);
    throw new Error("Failed to fetch analyses");
  }
}