# Authentication and Authorization Reference

## Table of Contents

1. [Clerk integration (most common)](#1-clerk-integration)
2. [Convex Auth (built-in)](#2-convex-auth-built-in)
3. [Authorization patterns](#3-authorization-patterns)
4. [Auth UI components](#4-auth-ui-components)
5. [Better Auth](#5-better-auth-33k-descargassemana)
6. [Other auth providers](#6-other-auth-providers)

---

## 1. Clerk integration

### Step 1: Auth config

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: "https://your-domain.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

### Step 2: Client provider

```tsx
"use client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Step 3: Access identity in functions

```typescript
export const getMyProfile = query({
  args: {},
  returns: v.union(v.object({ /* user fields */ }), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    // identity.tokenIdentifier — unique per user across providers
    // identity.subject — user ID from auth provider
    // identity.email, identity.name, identity.pictureUrl, etc.
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});
```

### Step 4: Sync user data via Clerk webhook

Set up a webhook in Clerk pointing to your HTTP action:

```typescript
// convex/http.ts
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    // Verify webhook signature with svix
    const { type, data } = body;
    if (type === "user.created") {
      await ctx.runMutation(internal.users.create, {
        tokenIdentifier: `https://your-domain.clerk.accounts.dev|${data.id}`,
        name: `${data.first_name} ${data.last_name}`,
        email: data.email_addresses[0]?.email_address,
      });
    }
    return new Response(null, { status: 200 });
  }),
});
```

---

## 2. Convex Auth (built-in)

> **Estado: Beta** — v0.0.90 (febrero 2026). API puede cambiar entre versiones.

Self-hosted auth running entirely in your Convex backend. No external auth service needed.

### Setup

```bash
npm install @convex-dev/auth @auth/core
```

```typescript
// convex/auth.ts
import GitHub from "@auth/core/providers/github";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [GitHub, Password],
});
```

### Schema must include auth tables

```typescript
// convex/schema.ts
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Your tables...
  profiles: defineTable({
    userId: v.id("users"), // References the auth-managed users table
    displayName: v.string(),
  }).index("by_user", ["userId"]),
});
```

### Get user ID in functions

```typescript
import { getAuthUserId } from "@convex-dev/auth/server";

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});
```

### Client-side sign in/out

```tsx
import { useAuthActions } from "@convex-dev/auth/react";

function LoginForm() {
  const { signIn } = useAuthActions();
  return (
    <button onClick={() => signIn("github")}>Sign in with GitHub</button>
  );
}
```

---

## 3. Authorization patterns

Convex does NOT have built-in RLS. Authorization is enforced in code — more flexible than declarative rules.

### Pattern: Authenticated wrapper (with convex-helpers)

```typescript
import { customQuery, customMutation } from "convex-helpers/server/customFunctions";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

export const authenticatedQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError("User not found");
    return { ctx: { user }, args: {} };
  },
});

export const authenticatedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError("User not found");
    return { ctx: { user }, args: {} };
  },
});
```

### Usage

```typescript
export const mySecureQuery = authenticatedQuery({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    // ctx.user is guaranteed to exist and typed
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_user_team", (q) =>
        q.eq("userId", ctx.user._id).eq("teamId", args.teamId)
      )
      .unique();
    if (!membership) throw new ConvexError("Not a team member");
    // ... proceed with authorized access
  },
});
```

### Pattern: Row-level security with convex-helpers

```typescript
import { wrapDatabaseReader, wrapDatabaseWriter } from "convex-helpers/server/rowLevelSecurity";

const secureDb = wrapDatabaseReader(ctx, ctx.db, {
  tasks: async (ctx, doc) => {
    // Return true if user can read this document
    return doc.ownerId === ctx.user._id;
  },
});
```

---

## 4. Auth UI components

```tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

function App() {
  return (
    <>
      <AuthLoading>Loading auth...</AuthLoading>
      <Unauthenticated><LoginPage /></Unauthenticated>
      <Authenticated><Dashboard /></Authenticated>
    </>
  );
}
```

### useConvexAuth hook

```tsx
import { useConvexAuth } from "convex/react";

function NavBar() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <Spinner />;
  return isAuthenticated ? <UserMenu /> : <LoginButton />;
}
```

---

## 5. Better Auth (~33K descargas/semana)

Alternativa popular a Convex Auth para autenticación completa:

```bash
npm install @convex-dev/better-auth better-auth
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config.js";

const app = defineApp();
app.use(betterAuth);
export default app;
```

Better Auth soporta: OAuth social (Google, GitHub, etc.), email/password, magic links, sessions, 2FA, y más. Funciona como componente de Convex con su propio almacenamiento de sesiones y usuarios.

---

## 6. Other auth providers

Any OIDC-compatible provider works. Add to `auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: "https://accounts.google.com",
      applicationID: "your-client-id",
    },
    {
      domain: "https://your-auth0-domain.auth0.com",
      applicationID: "your-client-id",
    },
  ],
};
```

For Auth0: use `ConvexProviderWithAuth0`. For custom providers: implement the token validation flow.
