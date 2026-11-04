# Jyotsvan Enterprise Platform — AI Architecture Specification

## 1. Overview & Constraints

The future Jyotsvan system will incorporate advanced AI intelligence powered by Google Gemini models through the `@google/genai` TypeScript SDK.

In **Phase 1 (Project Foundation)**:
- **Strictly No Active AI Execution**: No generative models, copilot prompts, or auto-categorization modules are executed in Phase 1.
- **Server-Side Exclusivity**: In future phases, all Gemini API calls must be proxied via secure server endpoints. Client components will never directly reference `GEMINI_API_KEY`.
- **Capability Declaration**: The platform metadata preserves `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` to ensure runtime readiness.

---

## 2. Planned AI Subsystems (Phase 12)

### 2.1. Jyotsvan Enterprise Copilot
*Planned for Phase 12*
- Natural language query assistant capable of answering operational queries (e.g. *"Show raw material stock for Batch #4092"* or *"Calculate projected inventory runout at Kolkata depot"*).

### 2.2. Predictive Inventory & Formulation Recommendations
*Planned for Phase 12*
- Automated suggested reorder points based on seasonality and procurement lead times.

### 2.3. Marketing Ad Copy & Performance Diagnostics
*Planned for Phase 12*
- Automated creative analysis and campaign budget reallocation suggestions.

---

## 3. Phase 1 Implementation Status

The `/ai` route is provisioned as an enterprise foundation placeholder clearly outlining the planned architecture, without instantiating unrequested API calls or simulated mock responses.
