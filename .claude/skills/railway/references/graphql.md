# Railway: GraphQL Public API

The Public API at `https://backboard.railway.com/graphql/v2` is the source of truth for everything Railway. The CLI is a wrapper. When you need something the CLI can't do — log queries, multi-resource batching, programmatic rollbacks, custom domain status, multi-project automation — drop down to GraphQL.

## Auth

Three token types:

| Header | Token | Scope |
|---|---|---|
| `Authorization: Bearer <token>` | account or workspace | full |
| `Project-Access-Token: <token>` | project token | one project + environment |

The `scripts/railway-api.sh` helper picks the right header automatically based on which env var is set.

Get tokens:
- Account / workspace: `https://railway.com/account/tokens`
- Project: dashboard → project → Settings → Tokens

## Rate limits

| Plan | RPH | RPS |
|---|---|---|
| Free | 100 | low |
| Hobby | 1,000 | 10 |
| Pro | 10,000 | 50 |
| Enterprise | custom | custom |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

For bulk operations, batch into `variableCollectionUpsert` and similar collection mutations rather than looping single calls.

## Tooling

- **GraphiQL playground**: `https://railway.com/graphiql` — the canonical schema explorer. Sign in to introspect.
- **Postman collection**: `https://gql-collection-server.up.railway.app/railway_graphql_collection.json` — pre-built request library.
- **Network-tab trick**: for any dashboard action, open DevTools → Network → filter for `/graphql/v2`, do the action, copy the request, replay with `scripts/railway-api.sh`.

## Canonical operations

### Authentication / identity

```graphql
query me { me { id name email } }
```

### Projects

```graphql
query projects {
  projects { edges { node { id name description createdAt } } }
}

query project($id: String!) {
  project(id: $id) {
    id name
    services { edges { node { id name } } }
    environments { edges { node { id name } } }
  }
}

mutation projectCreate($input: ProjectCreateInput!) {
  projectCreate(input: $input) { id name }
}
# input: { name: String, description: String, workspaceId: String, isPublic: Boolean }

mutation projectUpdate($id: String!, $input: ProjectUpdateInput!) {
  projectUpdate(id: $id, input: $input) { id }
}

mutation projectDelete($id: String!) { projectDelete(id: $id) }
```

### Services

```graphql
mutation serviceCreate($input: ServiceCreateInput!) {
  serviceCreate(input: $input) { id }
}
# Working pattern - create EMPTY first, then connect:
#   { "input": { "projectId": "...", "name": "API" } }
# Then call serviceConnect or serviceInstanceUpdate with source.
# Including `source` directly in serviceCreate often returns "Problem processing request".

mutation serviceConnect($id: String!, $input: ServiceConnectInput!) {
  serviceConnect(id: $id, input: $input) { id }
}
# input examples:
#   { repo: "owner/repo", branch: "main" }
#   { image: "ghcr.io/owner/img:tag" }

mutation serviceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
  serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
}
# Most-used input fields:
#   startCommand, buildCommand, rootDirectory, healthcheckPath, healthcheckTimeout,
#   restartPolicyType, restartPolicyMaxRetries, numReplicas, region, sleepApplication,
#   source: { repo, branch, image }, watchPatterns, preDeployCommand, cronSchedule

mutation serviceInstanceDeploy($serviceId: String!, $environmentId: String!) {
  serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
}

mutation serviceInstanceRedeploy($serviceId: String!, $environmentId: String!) {
  serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
}

mutation serviceDelete($id: String!) { serviceDelete(id: $id) }
```

### Environments

```graphql
query environments($projectId: String!) {
  environments(projectId: $projectId) { edges { node { id name } } }
}

mutation environmentCreate($input: EnvironmentCreateInput!) {
  environmentCreate(input: $input) { id name }
}
# input: { name, projectId, sourceEnvironmentId (to duplicate from), isEphemeral }

mutation environmentRename($id: String!, $input: EnvironmentRenameInput!) {
  environmentRename(id: $id, input: $input)
}

mutation environmentDelete($id: String!) { environmentDelete(id: $id) }

query environmentLogs($environmentId: String!, $filter: String) {
  environmentLogs(environmentId: $environmentId, filter: $filter) {
    timestamp message severity
    tags { serviceId deploymentId }
  }
}

query environmentStagedChanges($environmentId: String!) {
  environmentStagedChanges(environmentId: $environmentId)
}
```

### Variables

```graphql
query variables($projectId: String!, $environmentId: String!, $serviceId: String) {
  variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
}

mutation variableUpsert($input: VariableUpsertInput!) {
  variableUpsert(input: $input)
}
# input: { projectId, environmentId, serviceId, name, value, shared, sealed, skipDeploys }

mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
  variableCollectionUpsert(input: $input)
}
# input: { projectId, environmentId, serviceId, variables: { KEY: VALUE, ... }, replace }
# replace: true wipes existing scope; replace: false merges. Use replace: false in 99% of cases.

mutation variableDelete($input: VariableDeleteInput!) {
  variableDelete(input: $input)
}
```

### Deployments

Statuses: `BUILDING`, `DEPLOYING`, `SUCCESS`, `FAILED`, `CRASHED`, `REMOVING`, `REMOVED`, `SLEEPING`, `SKIPPED`, `WAITING`, `QUEUED`.

```graphql
query deployments($input: DeploymentListInput!) {
  deployments(input: $input, first: 20) {
    edges { node { id status createdAt staticUrl meta } }
  }
}
# input: { projectId, environmentId, serviceId, status }

query deploymentLogs($deploymentId: String!, $limit: Int) {
  deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
    timestamp message severity
  }
}

query buildLogs($deploymentId: String!, $limit: Int) {
  buildLogs(deploymentId: $deploymentId, limit: $limit) {
    timestamp message
  }
}

query httpLogs($deploymentId: String!, $limit: Int, $filter: String) {
  httpLogs(deploymentId: $deploymentId, limit: $limit, filter: $filter) {
    timestamp httpStatus method path responseDetails
    srcIp edgeRegion clientUa duration
  }
}

mutation deploymentRestart($id: String!)  { deploymentRestart(id: $id) }
mutation deploymentRedeploy($id: String!) { deploymentRedeploy(id: $id) }
mutation deploymentRollback($id: String!) { deploymentRollback(id: $id) }
mutation deploymentStop($id: String!)     { deploymentStop(id: $id) }
mutation deploymentCancel($id: String!)   { deploymentCancel(id: $id) }
mutation deploymentRemove($id: String!)   { deploymentRemove(id: $id) }
```

### Domains

```graphql
mutation serviceDomainCreate($input: ServiceDomainCreateInput!) {
  serviceDomainCreate(input: $input) { domain }
}

mutation customDomainCreate($input: CustomDomainCreateInput!) {
  customDomainCreate(input: $input) {
    id
    status {
      cdnProvider
      certificates { status }
      dnsRecords { hostlabel type purpose requiredValue currentValue zone }
    }
  }
}

query customDomain($id: String!) {
  customDomain(id: $id) {
    id domain
    status {
      certificates { status }
      dnsRecords { hostlabel type requiredValue currentValue }
    }
  }
}

mutation customDomainDelete($id: String!) { customDomainDelete(id: $id) }
```

DNS record statuses: `PENDING` / `VALID` / `INVALID`.
Certificate statuses: `PENDING` / `ISSUED` / `FAILED`.

### Volumes

```graphql
mutation volumeCreate($input: VolumeCreateInput!) {
  volumeCreate(input: $input) { id name }
}
# input: { projectId, environmentId, serviceId, mountPath, size }

mutation volumeUpdate($volumeId: String!, $input: VolumeUpdateInput!) {
  volumeUpdate(volumeId: $volumeId, input: $input) { id name }
}
# input: { name, size }   (size in GB)

mutation volumeInstanceUpdate($volumeInstanceId: String!, $input: VolumeInstanceUpdateInput!) {
  volumeInstanceUpdate(volumeInstanceId: $volumeInstanceId, input: $input)
}

mutation volumeInstanceBackupCreate($volumeInstanceId: String!) {
  volumeInstanceBackupCreate(volumeInstanceId: $volumeInstanceId)
}

mutation volumeDelete($volumeId: String!) {
  volumeDelete(volumeId: $volumeId)
}
```

### TCP proxies

```graphql
query tcpProxies($serviceId: String!, $environmentId: String!) {
  tcpProxies(serviceId: $serviceId, environmentId: $environmentId) {
    id domain proxyPort applicationPort
  }
}

mutation tcpProxyCreate($input: TCPProxyCreateInput!) {
  tcpProxyCreate(input: $input) { id domain proxyPort applicationPort }
}

mutation tcpProxyDelete($id: String!) { tcpProxyDelete(id: $id) }
```

### Workspace / membership

```graphql
query workspace($workspaceId: String!) {
  workspace(workspaceId: $workspaceId) {
    id name
    members { id name email role }
  }
}
```

## Patterns

### Wait for deploy to succeed (poll)

```bash
SERVICE=...; ENV=...
./.claude/skills/railway/scripts/railway-api.sh \
  'mutation($s: String!, $e: String!) { serviceInstanceDeploy(serviceId: $s, environmentId: $e) }' \
  "$(jq -nc --arg s "$SERVICE" --arg e "$ENV" '{s: $s, e: $e}')"

# poll for status
while true; do
  STATUS=$(./.claude/skills/railway/scripts/railway-api.sh '
    query($input: DeploymentListInput!) {
      deployments(input: $input, first: 1) { edges { node { status } } }
    }' "$(jq -nc --arg s "$SERVICE" --arg e "$ENV" \
        '{input: {serviceId: $s, environmentId: $e}}')" \
    | jq -r '.deployments.edges[0].node.status')
  case "$STATUS" in
    SUCCESS) echo "deploy succeeded"; break ;;
    FAILED|CRASHED) echo "deploy $STATUS"; exit 1 ;;
    *) echo "status: $STATUS"; sleep 5 ;;
  esac
done
```

### Find IDs from project URL
Use `scripts/ids-from-url.sh "<url>"` — handles all the common URL shapes.

### Replicate config across services

```bash
# read config from source service
CONFIG=$(./.claude/skills/railway/scripts/railway-api.sh '
  query($p: String!, $e: String!, $s: String!) {
    project(id: $p) {
      services { edges { node { id name } } }
    }
  }' "$VARS")

# apply ServiceInstanceUpdateInput uniformly across many services
for svc in $TARGET_SERVICES; do
  ./.claude/skills/railway/scripts/railway-api.sh \
    'mutation($s: String!, $e: String!, $input: ServiceInstanceUpdateInput!) {
       serviceInstanceUpdate(serviceId: $s, environmentId: $e, input: $input)
     }' \
    "$(jq -nc --arg s "$svc" --arg e "$ENV" --argjson cfg "$CONFIG_JSON" \
        '{s: $s, e: $e, input: $cfg}')"
done
```

## Error handling

The helper script differentiates:
- **Exit 0**: GraphQL `data` returned (parsed to stdout)
- **Exit 1**: GraphQL `errors` array (printed to stderr)
- **Exit 2**: HTTP error (4xx/5xx), body to stderr
- **Exit 3**: missing auth env var
- **Exit 64**: bad usage

Most mutations return `null` on success and `errors` on failure — check for the absence of `errors` rather than truthy `data`.

## Schema introspection

```graphql
query allTypes {
  __schema {
    types {
      name
      kind
      description
    }
  }
}

query typeDetails($name: String!) {
  __type(name: $name) {
    name kind description
    fields { name description type { name kind ofType { name } } }
    inputFields { name description type { name kind ofType { name } } }
  }
}
```

Useful for finding the exact input shape of an undocumented mutation. Run via `scripts/railway-api.sh`.

## Quick reference

| Want to | Operation |
|---|---|
| Deploy a service | `serviceInstanceDeploy(serviceId, environmentId)` |
| Redeploy | `serviceInstanceRedeploy` |
| Roll back | `deploymentRollback(id)` |
| Stop a deploy in progress | `deploymentCancel(id)` |
| Set many vars + deploy | `variableCollectionUpsert` then `serviceInstanceDeploy` |
| Create empty service | `serviceCreate({projectId, name})` then `serviceConnect` |
| Update service config | `serviceInstanceUpdate(serviceId, environmentId, input)` |
| Add custom domain | `customDomainCreate({serviceId, environmentId, domain})` |
| Resize volume | `volumeUpdate({size})` |
| Inspect schema | `__type(name: "ServiceInstanceUpdateInput")` |
