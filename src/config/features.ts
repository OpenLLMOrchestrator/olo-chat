/**
 * Feature flags for menu sections.
 */
export const features = {
  chat: true,
  rag: true,
  documents: true,
} as const

export type FeatureId = keyof typeof features

export const FEATURE_FLAG_META: Partial<Record<FeatureId, { owner: string; removeBy: string }>> = {
  chat: { owner: 'platform', removeBy: 'n/a (core)' },
  rag: { owner: 'platform', removeBy: 'n/a (core)' },
  documents: { owner: 'platform', removeBy: 'n/a (core)' },
}

export function isFeatureEnabled(id: FeatureId): boolean {
  return Boolean(features[id])
}
