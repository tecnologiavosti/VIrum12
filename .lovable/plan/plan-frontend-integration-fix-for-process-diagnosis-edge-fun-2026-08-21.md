# Plan: Frontend Integration Fix for `process-diagnosis` Edge Function

Correct the frontend logic in `src/pages/NewDiagnosis.tsx` to align with the sequential processing contract of the `process-diagnosis` Edge Function.

## Proposed Changes

### Frontend Integration (`src/pages/NewDiagnosis.tsx`)
- Refactor the `processNext` function to strictly follow the new contract.
- Ensure only `diagnosisId` and `section` are sent in subsequent calls (except the first one which may need context).
- Implement robust response handling for HTTP 200, 429, 500, and 502.
- Add mandatory logging for debugging as requested.
- Handle `alreadyCompleted: true` and `data.success === true` correctly.
- Implement sequential execution based on `data.nextSection`.

### Rules to Follow
- Sequential calls only: body → strategy → color → style → modeling → essentials → capsule → final.
- Do not treat valid HTTP 200 responses with `success: true` as errors.
- Respect `retryAfter` for 429 errors.
- Display specific error messages from the backend for 500/502 errors.

## Technical Details
- **Location**: `src/pages/NewDiagnosis.tsx` inside the `handleStartProcessing` scope.
- **Contract**:
  ```json
  {
    "success": true,
    "diagnosisId": "...",
    "section": "...",
    "completed": false,
    "nextSection": "...",
    "completedSections": 1,
    "totalSections": 8
  }
  ```
- **Logging**:
  ```javascript
  console.log("[DIAGNOSIS] invoking process-diagnosis", { diagnosisId, section });
  console.log("[DIAGNOSIS] response", { diagnosisId, section, data, error });
  console.log("[DIAGNOSIS] next section", { currentSection: data?.section, nextSection: data?.nextSection, completed: data?.completed });
  ```
