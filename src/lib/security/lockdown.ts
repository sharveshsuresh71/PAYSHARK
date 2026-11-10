import { repo } from '../database/repository';
import { sendSecurityAlert } from '../monitoring/alerts';

export interface LockdownResult {
  success: boolean;
  profileId: string;
  reason: string;
  revokedSessionsCount: number;
  blockedRequestsCount: number;
}

/**
 * Automates account containment upon critical fraud, ATO, or brute-force threshold breach.
 */
export async function lockdownAccount(profileId: string, reason: string): Promise<LockdownResult> {
  // 1. Lock profile in repository
  const profile = await repo.getProfile(profileId);
  if (!profile) {
    throw new Error(`Profile not found for lockdown: ${profileId}`);
  }

  // 2. Perform repository lockdown
  const result = await repo.lockProfile(profileId, reason);

  // 3. Emit high-severity alert
  await sendSecurityAlert({
    severity: 'CRITICAL',
    eventType: 'ACCOUNT_LOCKDOWN',
    message: `Account ${profileId} (${profile.email}) was locked due to: ${reason}`,
    profileId,
    details: {
      reason,
      revokedSessions: result.revokedSessionsCount,
      blockedRequests: result.blockedRequestsCount,
    },
  });

  return {
    success: true,
    profileId,
    reason,
    revokedSessionsCount: result.revokedSessionsCount,
    blockedRequestsCount: result.blockedRequestsCount,
  };
}
