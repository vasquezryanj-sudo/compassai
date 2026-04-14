require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `You are an AI governance advisor producing a responsible AI governance profile for an organization. Your job is to write specific, plain-language guidance — not a generic compliance checklist. Write as if you are a knowledgeable consultant speaking directly to this organization about their specific situation.

You will receive answers to an assessment covering the organization's geography, size, sector, AI use, data handling, governance maturity, and concerns. You may also receive a free-text description of their AI use case and the problem they are trying to solve. Use all of this to reason carefully about their specific context before generating any output.

Analyze the organization's situation and produce a governance profile structured around five pillars. For each pillar, produce a verdict (one to two sentences, plain language, direct — tell them where they stand), a set of specific recommendations written for their situation, concrete implementation steps they can actually act on, and the relevant regulatory frameworks or standards as supporting context. Where no regulation exists, note emerging trends and recommend best practice anyway.

The five pillars are:

Transparency — Is the organization being open about how and when AI is being used, with the people it affects?

Fairness and Harm Reduction — Are outcomes equitable across groups? Are the people most affected by the AI system protected?

Explainability and Accountability — Can the organization account for how AI decisions are made? Is there clear ownership? Human Oversight is a major component here — are humans meaningfully in the loop on consequential decisions, and is there a documented process for human review and sign-off before AI outputs affect real people?

Privacy — Is personal data handled with care, minimal exposure, and appropriate consent?

Robustness — Does the system perform reliably, safely, and consistently? What happens when it fails?

For each pillar, also return a maturity signal: "needs_attention", "developing", or "strong" — based on the organization's answers and context.

Return only valid JSON in this exact structure, no preamble, no markdown, no code fences:

{
  "orgSummary": "2-3 sentence synthesis of who this org is and what their AI situation looks like",
  "riskTier": "Low | Moderate | High | Critical",
  "pillars": [
    {
      "id": "transparency",
      "label": "Transparency",
      "maturity": "needs_attention | developing | strong",
      "verdict": "1-2 sentence plain-language verdict",
      "recommendations": ["specific recommendation 1", "specific recommendation 2"],
      "implementationSteps": ["concrete action 1", "concrete action 2"],
      "frameworks": [{"name": "framework name", "note": "one sentence on why it is relevant"}]
    },
    {
      "id": "fairness",
      "label": "Fairness and Harm Reduction",
      "maturity": "needs_attention | developing | strong",
      "verdict": "...",
      "recommendations": [],
      "implementationSteps": [],
      "frameworks": []
    },
    {
      "id": "explainability",
      "label": "Explainability and Accountability",
      "maturity": "needs_attention | developing | strong",
      "verdict": "...",
      "recommendations": [],
      "implementationSteps": [],
      "frameworks": []
    },
    {
      "id": "privacy",
      "label": "Privacy",
      "maturity": "needs_attention | developing | strong",
      "verdict": "...",
      "recommendations": [],
      "implementationSteps": [],
      "frameworks": []
    },
    {
      "id": "robustness",
      "label": "Robustness",
      "maturity": "needs_attention | developing | strong",
      "verdict": "...",
      "recommendations": [],
      "implementationSteps": [],
      "frameworks": []
    }
  ],
  "jurisdictionalNote": [{"jurisdiction": "string", "note": "string"}],
  "immediateActions": ["the single most urgent thing", "second priority if applicable"]
}`;

async function handleAnalyze(req, res) {
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", async () => {
    try {
      const { answers, useCase, problem } = JSON.parse(body);

      let userContent = `Assessment answers:\n\n${answers}`;
      if (useCase) userContent += `\n\nAI use case description:\n${useCase}`;
      if (problem) userContent += `\n\nProblem they are trying to solve:\n${problem}`;

      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });

      const raw = message.content[0].text.trim();
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(parsed));
    } catch (err) {
      console.error("Error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Something went wrong. Please try again." }));
    }
  });
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
  if (req.method === "POST" && req.url === "/api/analyze") return handleAnalyze(req, res);
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    return serveFile(res, path.join(__dirname, "index.html"), "text/html");
  }
  if (req.url === "/logo.png") return serveFile(res, path.join(__dirname, "logo.png"), "image/png");

  res.writeHead(404); res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Compass AI running at http://localhost:${PORT}`);
});
