import { trpc } from "@/lib/trpc";

export function useSubscription(enabled = true) {
  const status = trpc.subscription.status.useQuery(undefined, { enabled, staleTime: 60_000, retry: false });
  const usage = trpc.subscription.usage.useQuery(undefined, { enabled: enabled && Boolean(status.data), staleTime: 30_000, retry: false });
  const data = status.data;
  return {
    ...status,
    subscription: data,
    usage: usage.data,
    isTrial: Boolean(data?.isTrial),
    isPremium: Boolean(data?.isPremium),
    isFree: Boolean(data?.isFree),
    hasFullAccess: Boolean(data?.hasFullAccess),
    trialDaysLeft: data?.trialDaysLeft ?? 0,
    premiumDaysLeft: data?.premiumDaysLeft ?? 0,
    canAccessFeature: (feature: string) => Boolean(data?.features.includes(feature)),
  };
}
