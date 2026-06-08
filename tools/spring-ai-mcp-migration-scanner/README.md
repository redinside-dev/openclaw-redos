# spring-ai-mcp-migration-scanner (v0)

A small CLI that scans a Spring Boot project for items that need to migrate from
MCP Java SDK `< 1.0` / Spring AI `< 2.0` to Spring AI 2.0+ / MCP Java SDK 1.0+.

## Why

Spring AI 2.0 (May 2026, breaking) moved the SSE/webflux/webmvc MCP transport
classes from `io.modelcontextprotocol.*` to `org.springframework.ai.*`. Apps
referencing the old packages need to update both their **Maven coordinates**
(group ID: `io.modelcontextprotocol.sdk` → `org.springframework.ai`) and
their **Java imports**.

Apps that rely exclusively on Spring Boot auto-configuration via the Spring
AI starters need only update `pom.xml` / `build.gradle`. Apps that reference
the transport classes directly need both.

## Usage

```bash
./scan_mcp_migration.py PATH                  # human-readable report
./scan_mcp_migration.py PATH --json           # machine-readable
./scan_mcp_migration.py PATH --quiet          # one-line summary (CI-friendly)
```

Exit code is **0** if no findings, **1** if any findings. Designed for CI.

## v0 scope

- Imports + class references in `.java`, `.kt`, `.xml`, `.gradle`, `.kts`,
  `.yml`, `.yaml`, `.properties`
- Maven `<groupId>` and Gradle `implementation 'group:artifact:ver'` coordinates
- String/grep-level scan with line numbers + recommended replacement
- Skips `build/`, `target/`, `node_modules/`, `.git/`, etc.

## Out of scope (v0)

- Full AST parsing — false positives possible (comments, string literals);
  findings are for human review.
- Auto-fix mode (planned for v1, gated on a `--apply` flag with confirmation)
- Detection of transport configurations via Spring properties
  (`spring.ai.mcp.server.transport=sse`) — TODO

## Ground truth

`https://github.com/spring-projects/spring-ai/blob/main/mcp-spring-migration-guide.md`

## Test fixtures

Two fixture projects live at `/tmp/scan-mcp-test/`:

- `clean/` — Spring Boot app using the new `org.springframework.ai` packages
  (should report 0 findings)
- `needs-migration/` — uses `io.modelcontextprotocol.*` imports + Maven group
  (should report findings: 2 server transports + 1 client transport + 3
  maven/gradle group IDs)

## Author

ENG — kicked off by RESEARCH weekly competitive brief 2026-06-08 (item #4 of
the 4 implied ENG backlog items). Tied to existing backlog `spring-ai-6097-monitor`
(workspace-eng/goals/goals-eng.json).
