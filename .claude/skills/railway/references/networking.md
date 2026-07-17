# Railway: Networking

Public domains, custom domains + SSL, private networking (IPv4+IPv6), TCP proxy, library-specific binding.

## Public networking (Railway domains)

```bash
# generate a Railway-managed subdomain on *.up.railway.app:
railway domain --service <id>

# specify port (Railway auto-detects via Magic Ports usually):
railway domain --service <id> --port 8080
```

Result: `<service>-<env>.up.railway.app`. Auto-issued Let's Encrypt cert (RSA-2048, 90-day, auto-renewed at 30 days remaining).

Bind your app to:
- **IPv4-only environments (legacy)**: `0.0.0.0:$PORT`
- **Dual-stack environments (post Oct 16, 2025)**: `[::]:$PORT` works for both IPv4 and IPv6 traffic
- **Always use `$PORT`** — never hardcode

Edge stack: GeoDNS → regional Envoy → routing proxy → replicas. HTTP/2 client-side, HTTP/1.1 upstream. WebSockets and SSE supported with 60-sec idle timeout. Bandwidth ceiling: 10 Gbps public, 100 Gbps private.

## Custom domains

```bash
# CLI:
railway domain --service <id> api.example.com

# or via GraphQL:
./.claude/skills/railway/scripts/railway-api.sh '
mutation($input: CustomDomainCreateInput!) {
  customDomainCreate(input: $input) {
    id
    status { dnsRecords { hostlabel type requiredValue currentValue } }
  }
}' '{"input":{"serviceId":"<s>","environmentId":"<e>","domain":"api.example.com"}}'
```

You'll be told to add **two** DNS records — both are required:
- A `CNAME` (subdomain) or `ALIAS`/`ANAME` (apex/root)
- A `TXT` verification record

**Both must be present**, or Railway returns 404 indefinitely (no error, just 404). Common gotcha.

DNS statuses: `PENDING` / `VALID` / `INVALID`
Cert statuses: `PENDING` / `ISSUED` / `FAILED`

### Apex domains
For `example.com` (no subdomain), your DNS provider must support `ALIAS`/`ANAME`/flattening. Cloudflare, DNSimple, Route 53, etc. do; some old providers don't — in that case use a `www.` subdomain.

### Wildcard domains
Supported. Add `*.example.com` as the custom domain. If proxied through Cloudflare, the Cloudflare orange-cloud + multi-level subdomain (e.g. `*.api.example.com`) does not auto-issue cert correctly — set those records to **DNS-only** (gray cloud), or buy ACM through Cloudflare.

### Cloudflare specifics
- **SSL/TLS encryption mode**: set to `Full`, NOT `Strict`. Strict will give 525 errors because Railway's edge cert is issued for Railway's hostname, not yours.
- **Always Use HTTPS**: ON
- **Automatic HTTPS Rewrites**: ON

## Private networking

Service-to-service communication within a project+environment.

### Hostnames
Each service is reachable at `<service-name>.railway.internal`. The first label is **stable** (the root) — service display names can change but the internal DNS root persists.

### Protocol
Use `http://` (not `https://`). Encryption is at the network layer (Wireguard mesh). Adding TLS on top is wasted CPU.

### IPv4 vs IPv6
- **Environments created after Oct 16, 2025**: dual-stack IPv4 + IPv6
- **Legacy environments**: IPv6-only

For legacy environments, bind `[::]` (or `::`) instead of `0.0.0.0`. Common library configs:

| Library | IPv6 binding |
|---|---|
| Express / Node `http` | `app.listen(PORT, "::")` |
| FastAPI / uvicorn | `uvicorn ... --host ::` |
| Hono | `serve({ fetch, port: PORT, hostname: "::" })` |
| ioredis | `new Redis(url, { family: 0 })` |
| `pg` (node-postgres) | works out of box if URL resolves |
| MongoDB | `--bind_ip_all` |
| Next.js custom server | `hostname: "::"` |
| Caddy | `bind ::` |
| nginx | `listen [::]:80;` |

`family: 0` (or `family: 6`) tells DNS resolvers to accept IPv6.

### When private network is NOT available
- ❌ Build phase
- ❌ Pre-deploy command (no network at all yet)
- ❌ Browser clients (browsers can't reach `*.railway.internal`)

For browser-side fetches, your frontend must hit a public Railway domain or external API. The frontend can reach the BACKEND publicly, and the backend reaches the DB privately.

### Cross-environment private networking
NOT supported. Private network is project + environment scoped. Production can't reach staging's private network. (Use shared variables for cross-environment config.)

### Reference variable patterns
```bash
# canonical: service-to-service over private network
API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}

# canonical: app-to-database
DATABASE_URL=${{Postgres.DATABASE_URL}}      # uses RAILWAY_PRIVATE_DOMAIN under the hood
REDIS_URL=${{Redis.REDIS_URL}}
```

**Footgun**: `${{api.PORT}}` will resolve to **empty string** because PORT is runtime-injected, not stored as a variable. To use `${{svc.PORT}}` references, explicitly set a `PORT=8080` service variable on the target service.

## TCP proxy (non-HTTP)

For PostgreSQL public access, custom TCP protocols, game servers, etc. — enable TCP Proxy on the service:

```bash
./.claude/skills/railway/scripts/railway-api.sh '
query($s: String!, $e: String!) {
  tcpProxies(serviceId: $s, environmentId: $e) {
    id domain proxyPort applicationPort
  }
}' '{"s":"<s>","e":"<e>"}'
```

Or in the dashboard: Service → Settings → Networking → TCP Proxy.

You get an external endpoint like `roundhouse.proxy.rlwy.net:12345` that forwards to your service's internal port. Load balancing across replicas in the nearest region.

**Limitation as of May 2026**: custom domains on TCP proxy are NOT supported (community feature request open). You're stuck with the `*.proxy.rlwy.net` hostname.

## Outbound traffic (egress IPs)

By default, outbound traffic uses variable IPs from a pool — fine for most use cases. For third-party APIs that require IP allowlisting:

**Static Outbound IPs** is a Pro+ feature. Enable in service Settings. You get a small fixed set of IPs to allowlist downstream.

Without static IPs, your service's outbound IP changes randomly — third-party allowlists won't work.

## DDoS protection

Auto-enabled on all paid plans (Feb 2026 release). No configuration needed.

## Magic Ports

Railway auto-detects which port your app is listening on by sniffing common patterns and adjusting the public domain to forward there. You usually don't need to set the port explicitly. If detection fails:

```bash
railway domain --service <id> --port 8080
```

Or as a service variable: `RAILWAY_PROXY_PORT=8080`.

## Common patterns

### Frontend + API + DB
```
Browser → Cloudflare → my-frontend.up.railway.app (Next.js)
                       └ at build time: NEXT_PUBLIC_API_URL=https://api.example.com
                       └ at runtime SSR: fetch http://api.railway.internal:3000

api.railway.internal (Node API)
  ↓
Postgres.railway.internal (managed Postgres template)
```

Variables on Frontend:
```
NEXT_PUBLIC_API_URL = https://${{api.RAILWAY_PUBLIC_DOMAIN}}     # browser-visible
INTERNAL_API_URL    = http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}  # SSR
```
Variables on API:
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
PORT         = 3000     # explicitly set so api.PORT resolves
```

### Caddy reverse proxy in front of multiple services
Deploy the Caddy template, point it at the private domains of your backend services. Lets you host multiple subdomain → service mappings under one cert (or use Railway domains directly per service — usually simpler).

## Quick reference

| Want to | How |
|---|---|
| Add Railway domain | `railway domain -s <id>` |
| Add custom domain | `railway domain -s <id> api.example.com` (then add CNAME + TXT) |
| Service-to-service URL | `http://<svc>.railway.internal:<PORT>` |
| Bind on dual-stack | `[::]:$PORT` (works for both v4 and v6) |
| Bind legacy (IPv6-only env) | `[::]:$PORT` (mandatory) |
| Static outbound IPs | Pro+ feature, service Settings |
| Non-HTTP service | Enable TCP Proxy in Settings |
| Cross-env private network | Not supported |
