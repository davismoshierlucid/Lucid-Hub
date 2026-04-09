function daysSince(iso) {
  if (!iso) return null;
  const a = new Date(iso).getTime();
  const b = Date.now();
  return (b - a) / (1000 * 60 * 60 * 24);
}

/**
 * Intent to pre-select when opening the draft modal from a dashboard
 * action card (Options A & B). Option C uses an empty string.
 * @param {{ outreach_attempt_count?: number, last_interaction?: string | null }} action
 */
export function outreachIntentForActionCard(action) {
  const count = action.outreach_attempt_count ?? 0;
  if (count === 0) {
    return 'First introduction — no prior relationship';
  }
  const idleDays = daysSince(action.last_interaction);
  const longIdle = idleDays != null && idleDays >= 180;
  if (longIdle) {
    return 'Re-engagement after gap (6+ months)';
  }
  return 'Follow-up on prior conversation';
}
