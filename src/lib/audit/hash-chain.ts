import { createHash } from "crypto";

export function computeEventHash(previousHash: string | null, eventData: Record<string, any>): string {
  // Canonical sort of keys for deterministic hashing
  const canonicalString = JSON.stringify(eventData, Object.keys(eventData).sort());
  const input = `${previousHash || "GENESIS_BLOCK"}:${canonicalString}`;
  return createHash("sha256").update(input).digest("hex");
}

export function verifyHashChain(logs: Array<{ event_hash: string; previous_event_hash: string | null; event_data: any }>): { valid: boolean; brokenAtIndex?: number } {
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const prevHash = i === 0 ? null : logs[i - 1].event_hash;
    
    if (log.previous_event_hash !== prevHash) {
      return { valid: false, brokenAtIndex: i };
    }
    
    const computed = computeEventHash(prevHash, log.event_data);
    if (computed !== log.event_hash) {
      return { valid: false, brokenAtIndex: i };
    }
  }
  return { valid: true };
}
