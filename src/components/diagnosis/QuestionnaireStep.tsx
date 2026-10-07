import * as React from 'react';
import type { QuestionnaireData } from '@/pages/NewDiagnosis';
import { QuestionnaireV2 } from './questionnaire/QuestionnaireV2';

interface QuestionnaireStepProps {
  questionnaire: QuestionnaireData;
  setQuestionnaire: React.Dispatch<React.SetStateAction<QuestionnaireData>>;
  onLastStepChange?: (isLastStep: boolean) => void;
}

export function QuestionnaireStep(props: QuestionnaireStepProps) {
  return <QuestionnaireV2 {...props} />;
}
