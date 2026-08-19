export type AdmissionCountdownTrack = { id: number; institution: string | null; title: string; examType: string; unit: string | null; configuration: { examDateIso?: string | null } };

export function getUpcomingAdmissionCountdown(tracks: AdmissionCountdownTrack[], now = new Date()) {
  const upcoming = tracks.map(track => ({ track, date: track.configuration.examDateIso ? new Date(track.configuration.examDateIso) : null }))
    .filter((item): item is { track: AdmissionCountdownTrack; date: Date } => Boolean(item.date && !Number.isNaN(item.date.getTime()) && item.date.getTime() >= now.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const next = upcoming[0];
  if (!next) return null;
  const remainingMs = Math.max(0, next.date.getTime() - now.getTime());
  return { ...next.track, examDate: next.date, remainingMs, days: Math.floor(remainingMs / 86_400_000), hours: Math.floor((remainingMs % 86_400_000) / 3_600_000), minutes: Math.floor((remainingMs % 3_600_000) / 60_000) };
}
