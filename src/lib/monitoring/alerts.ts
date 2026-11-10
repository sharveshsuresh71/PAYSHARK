/**
 * PAYSHARK Security Alert & Telemetry Dispatcher
 */

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityAlertPayload {
  severity: AlertSeverity;
  eventType: string;
  message: string;
  profileId?: string;
  ip?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export async function sendSecurityAlert(payload: SecurityAlertPayload): Promise<void> {
  const event = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
    system: 'PAYSHARK-AI',
  };

  // Structured audit log output (picked up by Log Drains / CloudWatch / Datadog)
  console.warn(`[SECURITY_ALERT][${payload.severity}] ${payload.eventType}: ${payload.message}`, JSON.stringify(event));

  // If webhook configured in environment, dispatch notification
  const webhookUrl = process.env.SECURITY_WEBHOOK_URL;
  if (webhookUrl && (payload.severity === 'HIGH' || payload.severity === 'CRITICAL')) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 [PAYSHARK ${payload.severity}] ${payload.eventType}: ${payload.message}`,
          attachments: [{ color: payload.severity === 'CRITICAL' ? '#d90429' : '#f77f00', text: JSON.stringify(payload.details, null, 2) }],
        }),
      });
    } catch (err) {
      console.error('Failed to dispatch external security alert:', err);
    }
  }
}
