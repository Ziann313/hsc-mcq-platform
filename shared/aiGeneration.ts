export type IndependentAnswerVerification = {
  supported: boolean;
  correctOptionIndex: number;
  calculationChecked: boolean;
  reason: string;
};

export function independentlyVerified(candidateCorrectOptionIndex: number, verification: IndependentAnswerVerification) {
  return verification.supported === true
    && verification.correctOptionIndex === candidateCorrectOptionIndex
    && verification.calculationChecked === true
    && verification.reason.trim().length > 0;
}
