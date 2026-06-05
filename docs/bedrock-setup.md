# Amazon Bedrock + Knowledge Base Setup

PathMate.ai uses **Amazon Bedrock** instead of OpenAI. RAG documents live in S3:

- **Bucket:** `cse416-bedrock`
- **Prefix:** `RAG/`

## 1. Environment variables (`.env.local`)

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-2
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_KNOWLEDGE_BASE_ID=5N0YBLOFNN
# Optional: required for some models (Nova, Claude 4.x) in Seoul — use inference profile ARN
# BEDROCK_INFERENCE_PROFILE_ARN=arn:aws:bedrock:ap-northeast-2:ACCOUNT:inference-profile/...
```

> Never commit real keys. Rotate any key that was shared in chat or logs.

## 2. AWS Console — Knowledge Base

1. **Amazon Bedrock** → **Knowledge bases** → **Create**
2. **Knowledge base name:** e.g. `pathmate-rag`
3. **IAM role:** allow Bedrock + S3 read on `cse416-bedrock/RAG/*`
4. **Data source:** S3 → bucket `cse416-bedrock`, prefix `RAG/`
5. **Embeddings model:** e.g. `amazon.titan-embed-text-v2:0`
6. **Vector store:** OpenSearch Serverless (default wizard) or Aurora
7. **Sync** data source after upload
8. Copy **Knowledge base ID** (not the display name) → `BEDROCK_KNOWLEDGE_BASE_ID`  
   Verify with: `npm run test:bedrock -- --list-kb`

**This project (Seoul):**

| Item | Value |
|------|-------|
| Region | `ap-northeast-2` |
| KB ID | `5N0YBLOFNN` (`knowledge-base-quick-start-xfefs`) |
| OpenSearch collection | `arn:aws:aoss:ap-northeast-2:776137447517:collection/ohh790b53akd507pi9rd` |

## 3. IAM user permissions (minimum)

- `bedrock:InvokeModel`
- `bedrock:Retrieve`
- `bedrock:RetrieveAndGenerate`
- S3 read on `cse416-bedrock` (for KB ingestion; app calls Bedrock API only)

## 4. App behavior

| Feature | Bedrock API |
|---------|-------------|
| Cover Letter, evaluations, simulators | `RetrieveAndGenerate` when KB ID is set |
| Job Matching | KB RAG (replaces OpenAI `web_search_preview`) |
| Fallback | Rule-based when AWS env vars missing |

## 5. Vercel

Add the same env vars in **Project Settings → Environment Variables** for Production/Preview.
