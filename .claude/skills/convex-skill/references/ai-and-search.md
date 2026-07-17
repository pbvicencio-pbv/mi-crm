# AI, Search, and Vector Reference

## Table of Contents

1. [Full-text search](#1-full-text-search)
2. [Vector search](#2-vector-search)
3. [Agent component (`@convex-dev/agent`)](#3-agent-component-convex-devagent)
4. [RAG component (`@convex-dev/rag`)](#4-rag-component-convex-devrag)
5. [Streaming with HTTP actions](#5-streaming-with-http-actions)
6. [AI workflow patterns](#6-ai-workflow-patterns)

---

## 1. Full-text search

### Define search index

```typescript
defineTable({ body: v.string(), channelId: v.id("channels"), authorId: v.id("users") })
  .searchIndex("search_body", {
    searchField: "body",
    filterFields: ["channelId", "authorId"],  // Fields for equality filtering
  })
```

### Query with search

```typescript
export const searchMessages = query({
  args: { term: v.string(), channelId: v.optional(v.id("channels")) },
  returns: v.array(v.object({ /* message fields */ })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withSearchIndex("search_body", (q) => {
        let search = q.search("body", args.term);
        if (args.channelId) search = search.eq("channelId", args.channelId);
        return search;
      })
      .take(10);
  },
});
```

### Search behavior
- Results are always in **BM25 relevance order** (not insertion order)
- The **last search term gets prefix matching** (typeahead)
- Max **1024** results scanned
- Put as many filters as possible into `.withSearchIndex()` for performance
- Cannot combine `.withSearchIndex()` with `.order()` — relevance order is fixed
- Cannot combine with `.withIndex()` — use one or the other

---

## 2. Vector search

### Define vector index

```typescript
defineTable({
  text: v.string(),
  embedding: v.array(v.float64()),
  category: v.string(),
}).vectorIndex("by_embedding", {
  vectorField: "embedding",
  dimensions: 1536,             // Must match your embedding model
  filterFields: ["category"],   // Optional equality filters
})
```

### Search (actions ONLY — not in queries or mutations)

```typescript
export const semanticSearch = action({
  args: { query: v.string(), category: v.optional(v.string()) },
  returns: v.array(v.object({ /* document fields */ })),
  handler: async (ctx, args) => {
    // 1. Generate embedding
    const embedding = await generateEmbedding(args.query);

    // 2. Vector search
    const results = await ctx.vectorSearch("documents", "by_embedding", {
      vector: embedding,
      limit: 10,
      filter: args.category
        ? (q) => q.eq("category", args.category)
        : undefined,
    });
    // Returns [{ _id, _score }] — score: -1 to 1 (cosine similarity)

    // 3. Fetch full documents
    return await ctx.runQuery(internal.documents.getByIds, {
      ids: results.map((r) => r._id),
    });
  },
});
```

### Limits
- `ctx.vectorSearch()` only available in **actions** (not queries/mutations)
- Max **256** results per search
- Dimensions: **2 to 4096**
- Filter fields: equality only (no range)

### Embedding helper

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}
```

---

## 3. Agent component (`@convex-dev/agent`)

Full-featured AI agents with threads, tools, streaming, and memory — all persisted in Convex.

### Setup

```bash
npm install @convex-dev/agent @ai-sdk/openai
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config.js";
const app = defineApp();
app.use(agent);
export default app;
```

### Define an agent

```typescript
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

const supportAgent = new Agent(components.agent, {
  name: "Support Agent",
  chat: openai.chat("gpt-4o-mini"),
  instructions: "You are a helpful customer support agent.",
  tools: {
    lookupAccount: { /* tool definition */ },
    createTicket: { /* tool definition */ },
  },
});
```

### Use in actions

```typescript
export const chat = action({
  args: { prompt: v.string(), threadId: v.optional(v.string()) },
  returns: v.object({ threadId: v.string(), text: v.string() }),
  handler: async (ctx, { prompt, threadId }) => {
    if (threadId) {
      const { thread } = await supportAgent.continueThread(ctx, { threadId });
      const result = await thread.generateText({ prompt });
      return { threadId, text: result.text };
    }
    const { threadId: newId, thread } = await supportAgent.createThread(ctx);
    const result = await thread.generateText({ prompt });
    return { threadId: newId, text: result.text };
  },
});
```

---

## 4. RAG component (`@convex-dev/rag`)

Retrieval-Augmented Generation with automatic chunking, embedding, and search.

### Setup

```bash
npm install @convex-dev/rag @ai-sdk/openai
```

```typescript
// convex/convex.config.ts
import rag from "@convex-dev/rag/convex.config.js";
app.use(rag);
```

### Usage

```typescript
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

// Ingest documents
export const ingest = action({
  args: { text: v.string(), namespace: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rag.add(ctx, { namespace: args.namespace, text: args.text });
  },
});

// Search + generate
export const ask = action({
  args: { question: v.string(), namespace: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { text } = await rag.generateText(ctx, {
      search: { namespace: args.namespace, limit: 10 },
      prompt: args.question,
      model: openai.chat("gpt-4o-mini"),
    });
    return text;
  },
});
```

---

## 5. Streaming with HTTP actions

```typescript
// convex/http.ts
http.route({
  path: "/chat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { prompt } = await request.json();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Run streaming in background
    (async () => {
      try {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          stream: true,
        });
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          await writer.write(encoder.encode(text));
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    });
  }),
});
```

---

## 6. AI workflow patterns

### Pattern: Background AI processing with status tracking

```typescript
// Schema
defineTable({
  prompt: v.string(),
  status: v.union(v.literal("pending"), v.literal("processing"), v.literal("done"), v.literal("error")),
  result: v.optional(v.string()),
  error: v.optional(v.string()),
}).index("by_status", ["status"])

// 1. Mutation records intent
export const startAI = mutation({
  args: { prompt: v.string() },
  returns: v.id("aiJobs"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aiJobs", { prompt: args.prompt, status: "pending" });
    await ctx.scheduler.runAfter(0, internal.ai.process, { jobId: id });
    return id;
  },
});

// 2. Action does AI work
export const process = internalAction({
  args: { jobId: v.id("aiJobs") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.ai.updateStatus, { id: args.jobId, status: "processing" });
    try {
      const result = await callAIService(/* ... */);
      await ctx.runMutation(internal.ai.saveResult, { id: args.jobId, result });
    } catch (e) {
      await ctx.runMutation(internal.ai.saveError, { id: args.jobId, error: String(e) });
    }
  },
});

// 3. Client observes via reactive query
const job = useQuery(api.ai.getJob, { jobId });
// job.status updates in real-time: "pending" → "processing" → "done"
```

### Pattern: Embedding on insert

```typescript
export const addDocument = mutation({
  args: { text: v.string() },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("documents", { text: args.text, status: "pending" });
    await ctx.scheduler.runAfter(0, internal.embeddings.generate, { docId: id });
    return id;
  },
});

export const generate = internalAction({
  args: { docId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(internal.documents.get, { id: args.docId });
    const embedding = await generateEmbedding(doc!.text);
    await ctx.runMutation(internal.documents.saveEmbedding, { id: args.docId, embedding });
  },
});
```
