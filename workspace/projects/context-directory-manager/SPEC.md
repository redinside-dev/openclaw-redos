## Problem: Teams trying to run the 12-agent, folder-based context architecture described in https://twitter.com/ziwenxu_/status/test still struggle to keep OpenViking directories tidy because the CLI can't add multiple Markdown resources to an existing folder without creating duplicate prefix directories (see https://github.com/volcengine/OpenViking/issues/596).
## Source: https://github.com/volcengine/OpenViking/issues/596 + https://twitter.com/ziwenxu_/status/test
## Solution: Build a Python CLI utility that batch-adds files into an OpenViking directory with deterministic naming, metadata, and commit checks so agents can curate context the same way they manage local folders.
## Stack: Python
## Files:
- context_directory_manager/__init__.py
- context_directory_manager/cli.py
- context_directory_manager/batch_runner.py
- README.md
- tests/test_batch_runner.py
## Core logic:
1. parse CLI args (target directory, file globs, metadata)
2. load OpenViking config and open the target scope
3. ensure the directory exists and is locked against concurrent adds
4. expand globs into absolute file paths
5. for each file: read bytes, determine semantic name, build metadata
6. call directory.add_resource(name, content, metadata)
7. record new entries for README tracking
8. commit via OpenViking client and capture result metadata
9. emit a summary table for CLI output
10. exit with nonzero if any add failed
