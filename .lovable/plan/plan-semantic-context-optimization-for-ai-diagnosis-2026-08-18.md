# Plan - Semantic Context Optimization for AI Diagnosis

Implement Stage A of the optimization plan: semantic reduction of the context sent to the AI in each section to reduce latency and token usage while maintaining quality and stability.

## User Constraints
- **ONLY Stage A**: Redução do contexto enviado à IA.
- **NO Stage B**: No parallelization (`Promise.all`), keep sequential execution with `runWithLimit(2)`.
- **NO concurrent increase**: Keep current concurrency logic.
- **NO provider/model changes**: Stay with Gemini 3.6 Flash.
- **NO methodology changes**: Maintain strategic interpretation.
- **NO removal of Curator**: Keep all 8 calls.

## Proposed Changes

### 1. Context Specialization (Semantic Filtering)
Modify `supabase/functions/process-diagnosis/index.ts` to create specialized context blocks for each section:

#### `BODY` Analysis
- Include: Profession, lifestyle, occasions, body type (self-perceived), height, body challenges, weight, sizes, features to enhance, insecurities.
- Exclude: Color preferences, undertone, hair/eye color, specific budget (unless related to tailoring), climate.

#### `COLOR` Analysis
- Include: Skin tone, undertone, contrast, depth, temperature, hair color, eye color, color preferences.
- Exclude: Body measurements, profession details (unless for color psychology), specific sizes, body challenges.

#### `STYLE` Analysis
- Include: Profession, lifestyle, occasions, goals, style preferences, identity pieces, personal rules, budget.
- Exclude: Specific body measurements (keep general body type), exact skin tone technicalities.

#### `MODELING` Analysis
- Include: Body type, height, weight, sizes, body challenges, features to enhance, insecurities, fit preferences, profession (for formality).

#### `ESSENTIALS`, `CAPSULE`, `CURATOR`, `FINAL`
- Successive refinement: Pass only relevant previous analysis results + specific questionnaire flags.

### 2. Implementation Steps
1. Define specialized context builders in `process-diagnosis/index.ts`.
2. Update the `requireAiSection` calls to use the specialized context for each section.
3. Add token estimation logic (count characters as a proxy or use a simple heuristic) to report Before/After.
4. Perform a real test generation to validate:
   - Token reduction.
   - Quality preservation.
   - Data persistence.

## Technical Details
- Character count / 4 as token estimation proxy for the report.
- Sequential execution loop in `runWithLimit` remains untouched.
- `callOpenAI` remains the same, only the `prompt` string passed to it changes.

## Validation Plan
1. Run `process-diagnosis` manually or via UI.
2. Monitor logs for `[AI-FLOW]` and `[AI-TRACE]`.
3. Compare context lengths.
4. Verify results are saved correctly in the database.
