export type AdmissionPracticeCategory = "medical" | "engineering" | "university";
export type SourceTaggedAdmissionTrack = "du" | "buet" | "medical";

export function admissionSourceTrackForUnit(category: AdmissionPracticeCategory, unit: string): SourceTaggedAdmissionTrack | null {
  if (category === "university" && /^DU [A-D] Unit$/.test(unit)) return "du";
  if (category === "engineering" && unit === "BUET") return "buet";
  if (category === "medical" && unit === "MBBS") return "medical";
  return null;
}

export function hasMinimumAdmissionPracticeCapacity(track: SourceTaggedAdmissionTrack | null, availableQuestionCount: number, requestedQuestionCount: number) {
  return Boolean(track) && availableQuestionCount >= requestedQuestionCount;
}
