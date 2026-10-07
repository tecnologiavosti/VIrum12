# Plan - Final Correction and Deployment for 401 Error

The goal is to fix the persistent `401 Wrong API Key` error in the `process-diagnosis` Edge Function on the official project `mhvmjgyibehthmglnxge`. 

## Proposed Changes

### 1. Unified AI Deployment Script
- Create a robust deployment script `scripts/deploy-all.sh` that uses the Supabase CLI to deploy all relevant functions (`process-diagnosis`, `debug-keys`, `audit-runtime-v3`, `production-test-groq`, `migrate-sql`) and their shared dependencies to the official project.

### 2. Instrumentation and Fallback Hardening
- **Fingerprinting**: Maintain the SHA-256 fingerprinting in `_shared/ai-config.ts` to verify exactly which keys are being used in production without logging the secrets themselves.
- **Immediate Fallback**: Ensure that any 401 error from Groq triggers an immediate fallback to Gemini without retrying the failed key.
- **Detailed Errors**: If both providers fail, return a combined error message that specifies the status and error from both the primary and fallback providers.

### 3. Frontend Validation Button
- Update the `PainelMigracao.tsx` or create a new `AdminAI.tsx` to include a "Verify Production AI" button that calls the `audit=true` mode of `process-diagnosis` and displays the fingerprints and connectivity status.

### 4. Code Path Audit
- Confirm `process-diagnosis` uses only the centralized `callAI` function for all its sections (`body`, `color`, `style`, etc.).

## Technical Details
- **Project ID**: `mhvmjgyibehthmglnxge`
- **Primary Model**: `groq/compound` (Groq)
- **Fallback Model**: `gemini-1.5-flash` or `gemini-3.6-flash` (whichever is validated as working in the latest runtime test).
- **Security**: Fingerprints are generated using `crypto.subtle.digest("SHA-256", ...)`.

## Verification Steps
1. Run `scripts/deploy-all.sh`.
2. Use the new admin button to verify `GROQ_API_KEY` fingerprint matches the one that worked in standalone tests.
3. Perform a real diagnosis test for the `usuario@virum.test` user.
