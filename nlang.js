import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "dotenv";

// Load .env file when running locally
config();

const { LLM_SECRET, LLM_MODEL, LLM_BASEPATH } = process.env;

function getSecretForHostname(hostname) {
  // Convert hostname to env var format: github.com -> GITHUB_SECRET
  const envKey =
    hostname
      .split(".")
      .slice(0, -1) // Remove TLD
      .join("_")
      .toUpperCase()
      .replace(/-/g, "_") + "_SECRET";
  return process.env[envKey];
}

async function fetchUrl(url) {
  const { hostname } = new URL(url);
  const secret = getSecretForHostname(hostname);

  const headers = {};
  if (secret) {
    headers["Authorization"] = `Bearer ${secret}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function replaceUrlsWithContent(content) {
  // Match URLs (http/https)
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const urls = [...new Set(content.match(urlRegex) || [])];

  for (const url of urls) {
    try {
      const fetched = await fetchUrl(url);
      content = content.replaceAll(url, fetched);
    } catch (err) {
      console.error(`Warning: Could not fetch ${url}: ${err.message}`);
    }
  }
  return content;
}

async function findMdMdFiles(dir = ".") {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      files.push(...(await findMdMdFiles(path)));
    } else if (entry.name.endsWith(".md.md")) {
      files.push(path);
    }
  }
  return files;
}

async function chat(prompt) {
  const response = await fetch(`${LLM_BASEPATH}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_SECRET}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `LLM API error: ${response.status} ${await response.text()}`,
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function main() {
  const files = await findMdMdFiles();
  console.log(`Found ${files.length} .md.md files`);

  for (const file of files) {
    console.log(`Processing: ${file}`);
    const content = await readFile(file, "utf-8");
    const processedContent = await replaceUrlsWithContent(content);
    const result = await chat(processedContent);
    const outputPath = file.replace(/\.md\.md$/, ".md");
    await writeFile(outputPath, result);
    console.log(`Written: ${outputPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
