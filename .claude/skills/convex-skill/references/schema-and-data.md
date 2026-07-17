# Schema and Data Model Reference

## Table of Contents

1. [Defining schemas](#1-defining-schemas)
2. [Complete validator reference](#2-complete-validator-reference)
3. [Validator manipulation (v1.29.0+)](#3-validator-manipulation-v1290)
4. [TypeScript type extraction](#4-typescript-type-extraction)
5. [System fields and constraints](#5-system-fields-and-constraints)
6. [Index design](#6-index-design)
7. [Schema evolution and migrations](#7-schema-evolution-and-migrations)

---

## 1. Defining schemas

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    avatarId: v.optional(v.id("_storage")),
    metadata: v.optional(v.object({
      lastLogin: v.number(),
      preferences: v.record(v.string(), v.boolean()),
    })),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  messages: defineTable({
    authorId: v.id("users"),
    channelId: v.id("channels"),
    body: v.string(),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_channel", ["channelId"])
    .index("by_author_channel", ["authorId", "channelId"])
    .searchIndex("search_body", {
      searchField: "body",
      filterFields: ["channelId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["channelId"],
    }),
});
```

---

## 2. Complete validator reference

| Validator | TypeScript Type | Notes |
|-----------|----------------|-------|
| `v.string()` | `string` | UTF-8, < 1MB |
| `v.number()` | `number` (Float64) | All IEEE-754 doubles |
| `v.boolean()` | `boolean` | |
| `v.int64()` | `bigint` | -2^63 to 2^63-1 |
| `v.float64()` | `number` | Alias for v.number() |
| `v.null()` | `null` | `undefined` is NOT a valid Convex value |
| `v.bytes()` | `ArrayBuffer` | < 1MB |
| `v.id("tableName")` | `Id<"tableName">` | Typed document reference |
| `v.array(element)` | `Array` | Max 8192 items |
| `v.object({...})` | `Object` | Max 1024 entries, 16 nesting levels |
| `v.record(keys, values)` | `Record<K, V>` | Dynamic keys |
| `v.union(v1, v2, ...)` | Union type | Discriminated unions |
| `v.literal(value)` | Literal type | String, number, or boolean constants |
| `v.optional(validator)` | `T \| undefined` | Optional field |
| `v.nullable(validator)` | `T \| null` | Shorthand for `v.union(v, v.null())`. Available since v1.29.0 |
| `v.any()` | `any` | No validation — avoid in production |

### Tabla comparativa: null vs nullable vs optional

| Validador | Acepta undefined | Acepta null | Uso típico |
|-----------|-----------------|-------------|------------|
| `v.optional(v.string())` | ✅ | ❌ | Campo que puede no existir |
| `v.nullable(v.string())` | ❌ | ✅ | Campo que existe pero puede ser null (v1.29.0+) |
| `v.optional(v.nullable(v.string()))` | ✅ | ✅ | Campo opcional que cuando existe puede ser null |

> **⚠️ IMPORTANTE**: Convex usa `undefined` para campos opcionales. Enviar `null` a un campo `v.optional()` causa error en runtime. Usar spread operator para campos opcionales:
> ```typescript
> const data = {
>   plan: "online",
>   ...(discountCode ? { discountCode } : {}),  // Solo incluye si tiene valor
> };
> ```

---

## 3. Validator manipulation (v1.29.0+)

```typescript
const userValidator = v.object({
  name: v.string(),
  email: v.string(),
  role: v.string(),
  bio: v.optional(v.string()),
});

const publicUser = userValidator.pick("name", "bio");         // { name, bio }
const userWithoutRole = userValidator.omit("role");            // { name, email, bio }
const userPatch = userValidator.partial();                     // all fields optional
const extendedUser = userValidator.extend({ age: v.number() });
```

These are useful for creating return validators, patch args, and partial types without duplicating validators.

---

## 4. TypeScript type extraction

```typescript
import { Doc, Id } from "../convex/_generated/dataModel";
import { Infer } from "convex/values";

// Doc type for a table (includes _id and _creationTime)
type User = Doc<"users">;
type UserId = Id<"users">;

// Infer type from a standalone validator
const messageArgs = v.object({ body: v.string(), channelId: v.id("channels") });
type MessageArgs = Infer<typeof messageArgs>;
```

---

## 5. System fields and constraints

Every document automatically has:
- `_id`: Globally unique string ID (`Id<"tableName">`)
- `_creationTime`: Milliseconds since Unix epoch (number)

**Field naming**: Field names cannot start with `_` or `$`.

**Document limits**:
- Max **1MB** per document
- Max **16** nesting levels
- Max **1024** object entries
- Max **8192** array elements
- `undefined` is stripped from documents (like `JSON.stringify`)

---

## 6. Index design

### Defining indexes

```typescript
defineTable({ /* fields */ })
  .index("by_field", ["field"])                        // Single field
  .index("by_compound", ["field1", "field2"])           // Compound
  .index("by_nested", ["metadata.category"])            // Nested field
```

### Rules and limits
- Max **32** indexes per table, **16** fields per index
- `_creationTime` is automatically appended to every index
- A `by_creation_time` index exists on all tables by default
- Redundant indexes waste resources: `["foo"]` is subsumed by `["foo", "bar"]`

### Index query patterns

```typescript
// Equality on first field
.withIndex("by_channel", (q) => q.eq("channelId", channelId))

// Compound: equality then range
.withIndex("by_channel_time", (q) =>
  q.eq("channelId", channelId)
   .gte("_creationTime", startTime)
   .lt("_creationTime", endTime)
)
```

**Range expressions must follow index field order:** Chain 0+ `.eq()` calls, then optionally one `.gt()`/`.gte()`, then optionally one `.lt()`/`.lte()` on the SAME field.

### Search indexes

```typescript
.searchIndex("search_body", {
  searchField: "body",         // The field to full-text search
  filterFields: ["channelId"], // Fields for equality filtering
})
```

### Vector indexes

```typescript
.vectorIndex("by_embedding", {
  vectorField: "embedding",
  dimensions: 1536,            // Must match your embedding model
  filterFields: ["category"],
})
```

---

## 7. Schema evolution and migrations

Schemas are pushed with `npx convex dev` / `npx convex deploy`. First push after schema changes **validates ALL existing documents**. If validation fails, the push fails.

**Strategies for migrations:**
1. **Add optional fields**: Safest — `v.optional(v.newField())` always passes validation
2. **Temporary disable**: Set `schemaValidation: false` in schema, migrate data, re-enable
3. **Use `@convex-dev/migrations` component**: For large-scale data migrations with progress tracking

The Dashboard has a "Generate Schema" button that suggests a schema from existing data — useful when starting with an untyped database.

### Medir tamaño de documentos (v1.31.7+)

```typescript
import { getConvexSize, getDocumentSize } from "convex/values";

// Medir tamaño de cualquier valor Convex (en bytes)
const size = getConvexSize("hello world");  // Retorna número de bytes

// Medir tamaño total de un documento (incluyendo sistema _id, _creationTime)
const doc = await ctx.db.get("tasks", id);
const docSize = getDocumentSize(doc);  // Útil para verificar límite de 1MB
```

### Relationship patterns

```typescript
// One-to-many: store parent ID in child, index it
defineTable({ authorId: v.id("users"), title: v.string() })
  .index("by_author", ["authorId"])

// Many-to-many: junction table
defineTable({ userId: v.id("users"), teamId: v.id("teams") })
  .index("by_user", ["userId"])
  .index("by_team", ["teamId"])
  .index("by_user_team", ["userId", "teamId"])  // For unique constraint checks

// Traverse with convex-helpers
import { getOneFromOrThrow, getManyFrom, getManyVia } from "convex-helpers/server/relationships";
const author = await getOneFromOrThrow(ctx.db, "users", "by_token", tokenId);
const posts = await getManyFrom(ctx.db, "posts", "by_author", author._id);
```
