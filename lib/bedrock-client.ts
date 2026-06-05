import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  RetrieveCommand,
  type RetrieveAndGenerateCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

export type BedrockInvokeOptions = {
  temperature?: number;
  maxTokens?: number;
  /** Prefer Knowledge Base RAG when BEDROCK_KNOWLEDGE_BASE_ID is set (default: true). */
  useKnowledgeBase?: boolean;
  system?: string;
};

const region = process.env.AWS_REGION?.trim() || "ap-northeast-2";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
const modelId =
  process.env.BEDROCK_MODEL_ID?.trim() || "anthropic.claude-3-haiku-20240307-v1:0";
const converseModelId =
  process.env.BEDROCK_CONVERSE_MODEL_ID?.trim() || "apac.amazon.nova-lite-v1:0";
const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID?.trim();

const credentials =
  accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

const runtimeClient = credentials
  ? new BedrockRuntimeClient({ region, credentials })
  : null;

const agentClient = credentials
  ? new BedrockAgentRuntimeClient({ region, credentials })
  : null;

export function isBedrockConfigured() {
  return Boolean(runtimeClient && credentials);
}

export function isKnowledgeBaseConfigured() {
  return Boolean(agentClient && knowledgeBaseId);
}

export function getBedrockModelId() {
  return modelId;
}

/** RetrieveAndGenerate accepts foundation-model ARN or inference profile ARN. */
function generationModelArn() {
  const profile = process.env.BEDROCK_INFERENCE_PROFILE_ARN?.trim();
  if (profile) return profile;
  return `arn:aws:bedrock:${region}::foundation-model/${modelId}`;
}

function shouldFallbackFromRag(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: string }).name ?? "")
      : "";
  return (
    name === "ValidationException" ||
    name === "ResourceNotFoundException" ||
    /use case details/i.test(message) ||
    /inference profile/i.test(message) ||
    /on-demand throughput/i.test(message) ||
    /invalid model/i.test(message) ||
    /legacy/i.test(message)
  );
}

async function retrieveKbContext(query: string) {
  if (!agentClient || !knowledgeBaseId) return "";

  const response = await agentClient.send(
    new RetrieveCommand({
      knowledgeBaseId,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: Number(process.env.BEDROCK_KB_RESULTS ?? 8),
        },
      },
    }),
  );

  return (response.retrievalResults ?? [])
    .map((item) => item.content?.text?.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");
}

async function converseText(prompt: string, targetModelId: string, options: BedrockInvokeOptions = {}) {
  if (!runtimeClient) {
    throw new Error("Bedrock is not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.");
  }

  const response = await runtimeClient.send(
    new ConverseCommand({
      modelId: targetModelId,
      system: options.system ? [{ text: options.system }] : undefined,
      messages: [
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.2,
      },
    }),
  );

  const parts = response.output?.message?.content ?? [];
  return parts
    .map((part) => ("text" in part && part.text ? part.text : ""))
    .join("")
    .trim();
}

async function invokeWithKbRetrieveAndConverse(prompt: string, options: BedrockInvokeOptions) {
  const context = await retrieveKbContext(prompt);
  const augmented = context
    ? [
        "Answer using the knowledge base excerpts below as your primary source.",
        "If the excerpts lack the answer, say so clearly — do not invent facts.",
        "",
        "[Knowledge base excerpts]",
        context,
        "",
        "[Task]",
        prompt,
      ].join("\n")
    : prompt;

  return converseText(augmented, converseModelId, options);
}

export async function invokeBedrockText(prompt: string, options: BedrockInvokeOptions = {}) {
  const useKb = options.useKnowledgeBase !== false && isKnowledgeBaseConfigured();

  if (useKb && agentClient && knowledgeBaseId) {
    const input: RetrieveAndGenerateCommandInput = {
      input: { text: prompt },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId,
          modelArn: generationModelArn(),
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: Number(process.env.BEDROCK_KB_RESULTS ?? 8),
            },
          },
        },
      },
    };

    try {
      const response = await agentClient.send(new RetrieveAndGenerateCommand(input));
      const text = (response.output?.text ?? "").trim();
      if (text) return text;
    } catch (error) {
      if (!shouldFallbackFromRag(error)) throw error;
      console.warn(
        "[bedrock] RetrieveAndGenerate unavailable, falling back to Retrieve + Converse:",
        error instanceof Error ? error.message : error,
      );
    }

    return invokeWithKbRetrieveAndConverse(prompt, options);
  }

  try {
    return await converseText(prompt, modelId, options);
  } catch (error) {
    if (!shouldFallbackFromRag(error) || modelId === converseModelId) throw error;
    console.warn(
      "[bedrock] Primary Converse model failed, retrying with fallback model:",
      error instanceof Error ? error.message : error,
    );
    return converseText(prompt, converseModelId, options);
  }
}

export function parseJsonFromLlm(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function invokeBedrockJson(prompt: string, options: BedrockInvokeOptions = {}) {
  const text = await invokeBedrockText(prompt, options);
  return parseJsonFromLlm(text);
}
