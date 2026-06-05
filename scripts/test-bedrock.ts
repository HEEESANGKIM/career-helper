/**
 * Bedrock + Knowledge Base connectivity check.
 *
 * Usage:
 *   npm run test:bedrock
 *   npm run test:bedrock -- --json-only
 *   npm run test:bedrock -- --converse-only
 *
 * Loads .env.local from project root before importing lib/bedrock-client.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename: string) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return false;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return true;
}

function mask(value: string | undefined, visible = 4) {
  if (!value) return "(missing)";
  if (value.length <= visible) return "*".repeat(value.length);
  return `${value.slice(0, visible)}…${value.slice(-2)} (${value.length} chars)`;
}

function printSection(title: string) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    jsonOnly: args.includes("--json-only"),
    converseOnly: args.includes("--converse-only"),
    listModels: args.includes("--list-models"),
    listKb: args.includes("--list-kb"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(`
PathMate Bedrock test

  npm run test:bedrock                 Full check (env + KB RAG + optional JSON)
  npm run test:bedrock -- --json-only  Skip plain-text KB test
  npm run test:bedrock -- --converse-only  Test Converse API only (no Knowledge Base)
  npm run test:bedrock -- --list-models    List on-demand models in AWS_REGION
  npm run test:bedrock -- --list-kb        List Knowledge Bases in AWS_REGION
`);
    process.exit(0);
  }

  console.log("PathMate — Bedrock / Knowledge Base test\n");

  const loadedLocal = loadEnvFile(".env.local");
  loadEnvFile(".env");

  printSection("Environment");
  console.log(`  .env.local loaded: ${loadedLocal ? "yes" : "no"}`);
  console.log(`  AWS_REGION:              ${process.env.AWS_REGION ?? "(default ap-northeast-2)"}`);
  console.log(`  AWS_ACCESS_KEY_ID:       ${mask(process.env.AWS_ACCESS_KEY_ID)}`);
  console.log(`  AWS_SECRET_ACCESS_KEY:   ${mask(process.env.AWS_SECRET_ACCESS_KEY)}`);
  console.log(`  BEDROCK_MODEL_ID:        ${process.env.BEDROCK_MODEL_ID ?? "(default haiku)"}`);
  console.log(`  BEDROCK_KNOWLEDGE_BASE_ID: ${process.env.BEDROCK_KNOWLEDGE_BASE_ID ?? "(missing)"}`);

  const {
    getBedrockModelId,
    invokeBedrockJson,
    invokeBedrockText,
    isBedrockConfigured,
    isKnowledgeBaseConfigured,
  } = await import("../lib/bedrock-client");

  printSection("Configuration flags");
  console.log(`  isBedrockConfigured():      ${isBedrockConfigured()}`);
  console.log(`  isKnowledgeBaseConfigured(): ${isKnowledgeBaseConfigured()}`);
  console.log(`  modelId (resolved):         ${getBedrockModelId()}`);

  if (!isBedrockConfigured()) {
    console.error("\nFAIL: AWS credentials missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local");
    process.exit(1);
  }

  if (args.listModels) {
    await listFoundationModels();
    return;
  }

  if (args.listKb) {
    await listKnowledgeBases();
    return;
  }

  const started = Date.now();
  let failed = 0;

  if (args.converseOnly) {
    printSection("Test: Converse API (no Knowledge Base)");
    try {
      const text = await invokeBedrockText("Reply with exactly: BEDROCK_OK", {
        useKnowledgeBase: false,
        maxTokens: 64,
        temperature: 0,
      });
      console.log(`  OK (${Date.now() - started}ms)`);
      console.log(`  Response: ${text.slice(0, 200)}`);
      if (!text.toUpperCase().includes("BEDROCK")) failed += 1;
    } catch (error) {
      failed += 1;
      console.error("  FAIL:", error instanceof Error ? error.message : error);
    }
  } else {
    if (!isKnowledgeBaseConfigured()) {
      console.error("\nFAIL: BEDROCK_KNOWLEDGE_BASE_ID is not set.");
      process.exit(1);
    }

    if (!args.jsonOnly) {
      printSection("Test 1: Knowledge Base RAG (RetrieveAndGenerate)");
      const t1 = Date.now();
      try {
        const text = await invokeBedrockText(
          [
            "You are PathMate.ai career assistant.",
            "Using only the retrieved knowledge base documents, briefly summarize what career or job-related topics are available.",
            "Reply in 2-3 sentences. If nothing relevant is found, say NO_RELEVANT_DOCS.",
          ].join("\n"),
          { useKnowledgeBase: true, temperature: 0.2, maxTokens: 512 },
        );
        console.log(`  OK (${Date.now() - t1}ms)`);
        console.log(`  Preview: ${text.slice(0, 400).replace(/\s+/g, " ")}${text.length > 400 ? "…" : ""}`);
        if (/NO_RELEVANT_DOCS/i.test(text)) {
          console.warn("  WARN: KB responded but found no relevant documents. Check S3 sync (cse416-bedrock/RAG/).");
        }
      } catch (error) {
        failed += 1;
        console.error("  FAIL:", formatAwsError(error));
      }
    }

    printSection("Test 2: Knowledge Base + JSON (cover-letter style)");
    const t2 = Date.now();
    try {
      const parsed = await invokeBedrockJson(
        [
          "Return JSON only.",
          'Schema: {"roles":["software engineer","data analyst"]}',
          "Extract two realistic entry-level role keywords for a computer science student.",
        ].join("\n"),
        { useKnowledgeBase: true, temperature: 0.2 },
      );
      console.log(`  OK (${Date.now() - t2}ms)`);
      console.log(`  Parsed: ${JSON.stringify(parsed)}`);
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { roles?: unknown }).roles)) {
        failed += 1;
        console.error("  FAIL: Expected JSON object with roles array.");
      }
    } catch (error) {
      failed += 1;
      console.error("  FAIL:", formatAwsError(error));
    }
  }

  printSection("Summary");
  const elapsed = Date.now() - started;
  if (failed > 0) {
    console.error(`  ${failed} test(s) failed (${elapsed}ms total)`);
    console.error("\nCommon fixes:");
    console.error("  - Bedrock model access: enable model in AWS_REGION (ap-northeast-2 / Seoul)");
    console.error("  - IAM: bedrock:InvokeModel, bedrock:RetrieveAndGenerate");
    console.error("  - KB: sync data source S3 cse416-bedrock/RAG/");
    process.exit(1);
  }

  console.log(`  All tests passed (${elapsed}ms total)`);
}

async function listFoundationModels() {
  const region = process.env.AWS_REGION?.trim() || "ap-northeast-2";
  const { BedrockClient, ListFoundationModelsCommand } = await import("@aws-sdk/client-bedrock");
  const client = new BedrockClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  printSection(`On-demand models (${region})`);
  try {
    const response = await client.send(new ListFoundationModelsCommand({}));
    const models = (response.modelSummaries ?? [])
      .filter((m) => m.modelLifecycle?.status !== "LEGACY")
      .map((m) => m.modelId)
      .filter(Boolean)
      .sort();
    if (!models.length) {
      console.log("  (none — enable model access in Bedrock console → Model access)");
      return;
    }
    for (const id of models) console.log(`  - ${id}`);
  } catch (error) {
    console.error("  FAIL:", formatAwsError(error));
    process.exit(1);
  }
}

async function listKnowledgeBases() {
  const region = process.env.AWS_REGION?.trim() || "ap-northeast-2";
  const { BedrockAgentClient, ListKnowledgeBasesCommand } = await import("@aws-sdk/client-bedrock-agent");
  const client = new BedrockAgentClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  printSection(`Knowledge Bases (${region})`);
  try {
    const response = await client.send(new ListKnowledgeBasesCommand({}));
    const items = response.knowledgeBaseSummaries ?? [];
    if (!items.length) {
      console.log("  (none in this region)");
      return;
    }
    for (const kb of items) {
      console.log(`  - id: ${kb.knowledgeBaseId}  name: ${kb.name}  status: ${kb.status}`);
    }
  } catch (error) {
    console.error("  FAIL:", formatAwsError(error));
    process.exit(1);
  }
}

function formatAwsError(error: unknown) {
  if (!error || typeof error !== "object") return String(error);
  const err = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const status = err.$metadata?.httpStatusCode ? ` [HTTP ${err.$metadata.httpStatusCode}]` : "";
  return `${err.name ?? "Error"}${status}: ${err.message ?? error}`;
}

main().catch((error) => {
  console.error("\nUnexpected error:", error);
  process.exit(1);
});
