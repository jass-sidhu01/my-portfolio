// ============================================================
// AUTO BLOG GENERATOR — Gemini API
// Generates a Punjabi movie blog post daily
// Run via GitHub Actions every day
// ============================================================

import fs from "fs";
import path from "path";
import https from "https";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not found in environment variables");
  process.exit(1);
}

// Generate today's date
const today = new Date();
const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
const readableDate = today.toLocaleDateString("en-IN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// Slug from date
const slug = `punjabi-movie-blog-${dateStr}`;

// Prompt for Gemini
const prompt = `Write a detailed SEO-optimized blog post about upcoming or latest Punjabi movies in 2025-2026. 

The blog should:
- Be written in English
- Be 600-800 words long
- Include a catchy title about Punjabi cinema
- Cover latest Punjabi movie releases, actors, storylines
- Mention popular Punjabi actors like Diljit Dosanjh, Ammy Virk, Sargun Mehta, Neeru Bajwa etc
- Include keywords: Punjabi movies 2026, new Punjabi film, Punjabi cinema, Pollywood
- Be engaging, informative and SEO friendly
- End with a conclusion

Return ONLY a JSON object in this exact format with no extra text:
{
  "title": "blog title here",
  "excerpt": "short 2 sentence summary",
  "content": "full blog content in markdown format",
  "tags": ["tag1", "tag2", "tag3"]
}`;

// Call Gemini API
const requestBody = JSON.stringify({
  contents: [
    {
      parts: [{ text: prompt }],
    },
  ],
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 2048,
  },
});

const options = {
  hostname: "generativelanguage.googleapis.com",
  path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(requestBody),
  },
};

console.log("🤖 Calling Gemini API...");

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);

      if (!response.candidates || !response.candidates[0]) {
        console.error("❌ No response from Gemini:", data);
        process.exit(1);
      }

      const rawText = response.candidates[0].content.parts[0].text;

      // Clean up response — remove markdown code fences if present
      const cleanText = rawText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const blogData = JSON.parse(cleanText);

      // Build markdown file content
      const markdownContent = `---
title: "${blogData.title}"
date: "${dateStr}"
readableDate: "${readableDate}"
excerpt: "${blogData.excerpt}"
tags: ${JSON.stringify(blogData.tags)}
slug: "${slug}"
---

${blogData.content}
`;

      // Save to src/blogs/ folder
      const blogsDir = path.join(process.cwd(), "src", "blogs");
      if (!fs.existsSync(blogsDir)) {
        fs.mkdirSync(blogsDir, { recursive: true });
      }

      const filePath = path.join(blogsDir, `${slug}.md`);
      fs.writeFileSync(filePath, markdownContent, "utf8");

      console.log(`✅ Blog generated successfully: ${filePath}`);
      console.log(`📝 Title: ${blogData.title}`);
    } catch (err) {
      console.error("❌ Error parsing Gemini response:", err);
      process.exit(1);
    }
  });
});

req.on("error", (err) => {
  console.error("❌ Request error:", err);
  process.exit(1);
});

req.write(requestBody);
req.end();
