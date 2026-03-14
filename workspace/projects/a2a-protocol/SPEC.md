# a2a-protocol — Spec

## Problem
Multi-agent systems have no standard way to send typed messages between agents — every project invents its own format.

## Solution
Lightweight Node.js library + JSON message schema for agent-to-agent communication with request/response and pub/sub patterns.

## Stack
TypeScript/Node.js, no external dependencies (built-ins only)

## Files to create (5 total)
1. `src/protocol.ts` — A2AProtocol class: send(), receive(), broadcast()
2. `src/types.ts` — A2AMessage interface, MessageType enum
3. `src/transport.ts` — HTTP transport (built-in http module)
4. `example/two-agents.ts` — demo: agent-A sends, agent-B replies
5. `README.md` — install + usage in 10 lines

## Core logic (pseudocode, 20 lines)
```typescript
interface A2AMessage {
  id: string; from: string; to: string;
  type: "request"|"response"|"notify";
  payload: any; timestamp: string;
}

class A2AProtocol {
  send(msg: A2AMessage): Promise<A2AMessage>  // POST to target agent's /receive
  on(type: string, fn: (msg) => any): void    // register handler
  listen(port: number): void                  // start HTTP server
}
```

## Done criteria
- `ts-node example/two-agents.ts` prints "agent-B received: hello"
- README explains install and 5-line usage example
