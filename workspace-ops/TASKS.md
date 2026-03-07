# Critical System Issues - Action Items

## P0 - Immediate Attention
1. **Fix 9router connectivity on port 9999** - Service not responding, causing gateway token errors.
2. **Resolve A2A delegation timeouts** - Multiple timeout errors observed; investigate network/firewall or service config.
3. **Fix gateway token missing errors** - Gateway reports unauthorized token missing; verify and restore gateway token configuration.

## P1 - High Priority
4. **Set up automated backup system** - No backup mechanism currently configured; implement scheduled backups.
5. **Update invalid config entries** - Fix `models.providers.ollama.api` invalid input in openclaw.json, ensure proper model provider configuration.

## P2 - Medium Priority
6. **Restart gateway to apply config changes** - Gateway needs restart after config updates.
7. **Monitor memory usage** - Memory usage at 94%; investigate potential leaks or cleanup processes.

## P3 - Low Priority
8. **Check for outdated dependencies** - Run dependency audit to identify outdated packages.
9. **Verify critical endpoints** - Test connectivity to 18789, 9999, 60203, 20128 to ensure all services are reachable.
