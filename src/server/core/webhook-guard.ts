// Inbound webhooks are public endpoints. They must be cryptographically verified, or they are rejected (fail closed).
// Unsigned delivery can be allowed ONLY in non-production, explicitly, for local testing.

export function allowUnsignedWebhooks(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.WEBHOOK_ALLOW_UNSIGNED === 'true';
}

export const UNSIGNED_REJECTED = {
  accepted: false as const,
  status: 'failed' as const,
  message: 'Webhook rejected: no verified signature. Configure a signing secret for this endpoint.',
};

export const NOT_VERIFIABLE_REJECTED = {
  accepted: false as const,
  status: 'failed' as const,
  message: 'Webhook rejected: signature verification is not implemented for this provider yet.',
};
