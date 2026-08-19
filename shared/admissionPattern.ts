export type AdmissionActivationInput = { questionCount?: number; durationMinutes?: number; marksPerCorrect?: number; negativeMarkPerWrong?: number; session?: string; examDateIso?: string };

export function validateAdmissionPatternActivation(input: AdmissionActivationInput) {
  const errors: string[] = [];
  if (!Number.isInteger(input.questionCount) || (input.questionCount ?? 0) < 1) errors.push("An active pattern requires a verified question total.");
  if (!Number.isInteger(input.durationMinutes) || (input.durationMinutes ?? 0) < 1) errors.push("An active pattern requires a verified duration.");
  if (!Number.isFinite(input.marksPerCorrect) || (input.marksPerCorrect ?? 0) <= 0) errors.push("An active pattern requires verified marks per correct answer.");
  if (!Number.isFinite(input.negativeMarkPerWrong) || (input.negativeMarkPerWrong ?? -1) < 0 || (input.negativeMarkPerWrong ?? 0) > (input.marksPerCorrect ?? 0)) errors.push("An active pattern requires a valid verified negative-mark value.");
  if (!input.session?.trim()) errors.push("An active pattern requires a verified academic session.");
  if (!input.examDateIso || Number.isNaN(Date.parse(input.examDateIso))) errors.push("An active pattern requires a verified examination date.");
  return { valid: errors.length === 0, errors };
}
