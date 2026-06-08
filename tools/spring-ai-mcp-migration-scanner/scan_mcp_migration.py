#!/usr/bin/env python3
"""
scan_mcp_migration.py — Spring AI 2.0 MCP migration scanner (v0)

Scans a Spring Boot project (or any directory tree) for usages of MCP Java SDK
classes that need to be migrated to the new Spring AI 2.0 packages.

Spring AI 2.0 (released alongside MCP Java SDK 1.0.0) moved the SSE/webflux/webmvc
MCP transport classes from `io.modelcontextprotocol.*` to `org.springframework.ai.*`.
This scanner flags usages of the OLD packages so teams can plan the migration.

Ground truth: spring-ai/mcp-spring-migration-guide.md in spring-projects/spring-ai.

Usage:
  scan_mcp_migration.py PATH [--json] [--quiet]
  PATH    project root to scan
  --json  emit machine-readable JSON
  --quiet only print summary line (still exits 0/1)

Exit codes:
  0  no MCP migration findings
  1  findings present (CI-friendly)

v0 scope: imports + simple class references in .java, .kt, .xml, .gradle, .yml,
.yaml, .properties. No full AST — string/grep-level scan with line numbers.
False positives possible (comments, string literals); designed for human review.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

# Patterns extracted from spring-ai/mcp-spring-migration-guide.md.
# Each entry: (old package prefix, label, recommended new package for the most
# common classes). Keep this list small and high-signal — false positives are
# worse than misses for a migration tool.

# Server transports (old → new)
SERVER_TRANSPORTS = [
    ("io.modelcontextprotocol.server.transport.WebFluxSseServerTransportProvider",
     "io.modelcontextprotocol.server.transport",
     "org.springframework.ai.mcp.server.webflux.transport"),
    ("io.modelcontextprotocol.server.transport.WebFluxStreamableServerTransportProvider",
     "io.modelcontextprotocol.server.transport",
     "org.springframework.ai.mcp.server.webflux.transport"),
    ("io.modelcontextprotocol.server.transport.WebFluxStatelessServerTransport",
     "io.modelcontextprotocol.server.transport",
     "org.springframework.ai.mcp.server.webflux.transport"),
    ("io.modelcontextprotocol.server.transport.WebMvcSseServerTransportProvider",
     "io.modelcontextprotocol.server.transport",
     "org.springframework.ai.mcp.server.webmvc.transport"),
    ("io.modelcontextprotocol.server.transport.WebMvcStreamableServerTransportProvider",
     "io.modelcontextprotocol.server.transport",
     "org.springframework.ai.mcp.server.webmvc.transport"),
    ("io.modelcontextprotocol.server.transport.WebMvcStatelessServerTransport",
     "io.modelcontextprotocol.server.transport",
     "org.springframework.ai.mcp.server.webmvc.transport"),
]

# Client transports (old → new)
CLIENT_TRANSPORTS = [
    ("io.modelcontextprotocol.client.transport.WebFluxSseClientTransport",
     "io.modelcontextprotocol.client.transport",
     "org.springframework.ai.mcp.client.webflux.transport"),
    ("io.modelcontextprotocol.client.transport.WebClientStreamableHttpTransport",
     "io.modelcontextprotocol.client.transport",
     "org.springframework.ai.mcp.client.webflux.transport"),
]

# Maven coordinates (old → new). Matches the <dependency> block.
OLD_MAVEN_GROUP = "io.modelcontextprotocol.sdk"

# File extensions to scan.
SCAN_EXTS = {".java", ".kt", ".xml", ".gradle", ".kts", ".yml", ".yaml", ".properties"}

# Directories to skip (build outputs, vendored deps, VCS).
SKIP_DIRS = {
    "build", "target", "out", ".gradle", "node_modules", ".git", ".idea",
    "venv", ".venv", "__pycache__", "dist", ".next",
}


@dataclass
class Finding:
    file: str
    line: int
    column: int
    pattern: str
    snippet: str
    category: str   # "server_transport" | "client_transport" | "maven_group"
    recommended_replacement: str
    spring_ai_doc: str = (
        "https://github.com/spring-projects/spring-ai/blob/main/"
        "mcp-spring-migration-guide.md"
    )


def iter_files(root: Path) -> Iterable[Path]:
    """Yield source files under root, skipping build/VC dirs."""
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix not in SCAN_EXTS:
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        yield p


def scan_file(path: Path, root: Path) -> list[Finding]:
    """Scan one file for MCP migration findings. Returns [] if none."""
    findings: list[Finding] = []
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return findings

    rel = str(path.relative_to(root))

    for fqcn, old_pkg, new_pkg in SERVER_TRANSPORTS + CLIENT_TRANSPORTS:
        # Match the fully-qualified class name. Word-boundary on the right
        # prevents matching longer identifiers (e.g. "WebFluxSseServerTransportProviderX").
        for m in re.finditer(re.escape(fqcn) + r"\b", text):
            line_no = text.count("\n", 0, m.start()) + 1
            col = m.start() - (text.rfind("\n", 0, m.start()) + 1) + 1
            line_start = text.rfind("\n", 0, m.start()) + 1
            line_end = text.find("\n", m.start())
            if line_end == -1:
                line_end = len(text)
            snippet = text[line_start:line_end].strip()[:200]
            category = "server_transport" if "server" in fqcn else "client_transport"
            findings.append(Finding(
                file=rel, line=line_no, column=col,
                pattern=fqcn, snippet=snippet,
                category=category,
                recommended_replacement=fqcn.replace(old_pkg, new_pkg, 1),
            ))

    # Maven group ID: only in pom.xml / build.gradle* / settings.gradle*
    if path.suffix in {".xml", ".gradle", ".kts"}:
        # Match <groupId>io.modelcontextprotocol.sdk</groupId> or "io.modelcontextprotocol.sdk" in gradle
        for m in re.finditer(
            rf"<\s*groupId\s*>\s*{re.escape(OLD_MAVEN_GROUP)}\s*<\s*/\s*groupId\s*>",
            text,
        ):
            line_no = text.count("\n", 0, m.start()) + 1
            col = m.start() - (text.rfind("\n", 0, m.start()) + 1) + 1
            line_start = text.rfind("\n", 0, m.start()) + 1
            line_end = text.find("\n", m.start())
            if line_end == -1:
                line_end = len(text)
            snippet = text[line_start:line_end].strip()[:200]
            findings.append(Finding(
                file=rel, line=line_no, column=col,
                pattern=OLD_MAVEN_GROUP, snippet=snippet,
                category="maven_group",
                recommended_replacement="org.springframework.ai",
            ))
        # gradle/kts form: implementation 'io.modelcontextprotocol.sdk:mcp-spring-webflux:0.x'
        for m in re.finditer(
            rf"['\"]{re.escape(OLD_MAVEN_GROUP)}\s*:\s*[^'\"]*['\"]",
            text,
        ):
            line_no = text.count("\n", 0, m.start()) + 1
            col = m.start() - (text.rfind("\n", 0, m.start()) + 1) + 1
            line_start = text.rfind("\n", 0, m.start()) + 1
            line_end = text.find("\n", m.start())
            if line_end == -1:
                line_end = len(text)
            snippet = text[line_start:line_end].strip()[:200]
            findings.append(Finding(
                file=rel, line=line_no, column=col,
                pattern=OLD_MAVEN_GROUP, snippet=snippet,
                category="maven_group",
                recommended_replacement="org.springframework.ai",
            ))

    return findings


def scan(root: Path) -> list[Finding]:
    """Scan a project root and return all MCP migration findings."""
    all_findings: list[Finding] = []
    for f in iter_files(root):
        all_findings.extend(scan_file(f, root))
    # Deterministic order: file → line → column
    all_findings.sort(key=lambda f: (f.file, f.line, f.column))
    return all_findings


def format_text(findings: list[Finding], root: Path) -> str:
    """Human-readable report."""
    if not findings:
        return f"OK: no Spring AI 2.0 MCP migration findings in {root}"

    lines = [f"FOUND {len(findings)} Spring AI 2.0 MCP migration items in {root}"]
    by_category: dict[str, list[Finding]] = {}
    for f in findings:
        by_category.setdefault(f.category, []).append(f)

    category_titles = {
        "server_transport": "Server transport classes (old MCP Java SDK packages)",
        "client_transport": "Client transport classes (old MCP Java SDK packages)",
        "maven_group": "Maven/Gradle dependency group IDs",
    }
    for cat in ("server_transport", "client_transport", "maven_group"):
        items = by_category.get(cat, [])
        if not items:
            continue
        lines.append("")
        lines.append(f"== {category_titles[cat]} ({len(items)}) ==")
        for f in items:
            lines.append(
                f"  {f.file}:{f.line}:{f.column}  {f.pattern}"
            )
            lines.append(f"    → {f.recommended_replacement}")
            lines.append(f"    | {f.snippet}")

    lines.append("")
    lines.append("Migration guide: https://github.com/spring-projects/spring-ai/blob/main/mcp-spring-migration-guide.md")
    lines.append("If you use Spring Boot auto-configuration exclusively, only pom.xml/build.gradle need updates.")
    return "\n".join(lines)


def format_json(findings: list[Finding], root: Path) -> str:
    """Machine-readable JSON report."""
    return json.dumps(
        {
            "scanner": "scan_mcp_migration",
            "version": "0",
            "root": str(root),
            "findings_count": len(findings),
            "findings": [asdict(f) for f in findings],
            "migration_guide": (
                "https://github.com/spring-projects/spring-ai/blob/main/"
                "mcp-spring-migration-guide.md"
            ),
        },
        indent=2,
    )


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Scan a Spring Boot project for Spring AI 2.0 MCP migration items.",
    )
    ap.add_argument("path", help="Project root to scan")
    ap.add_argument("--json", action="store_true", help="Emit JSON output")
    ap.add_argument("--quiet", action="store_true", help="Only print summary line")
    args = ap.parse_args(argv)

    root = Path(args.path).resolve()
    if not root.exists() or not root.is_dir():
        print(f"ERROR: {root} is not a directory", file=sys.stderr)
        return 2

    findings = scan(root)

    if args.json:
        print(format_json(findings, root))
    elif args.quiet:
        if findings:
            print(f"FAIL: {len(findings)} MCP migration items in {root}")
        else:
            print(f"OK: 0 MCP migration items in {root}")
    else:
        print(format_text(findings, root))

    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
