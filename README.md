# Sigma Sentinel Forge

Build a Modern SOC Sigma Rule Management Console
Product Overview

Build a polished, enterprise-grade web frontend for a Security Operations Center (SOC) team to manage AI-generated Sigma detection rules from CVE inputs.

The backend already exists and is responsible for CVE processing, AI execution, conversation history, validation, and Sigma rule generation. This project focuses on the frontend UI, user experience, API integration layer, and clear visualization of backend execution data.

The application should feel like a modern security engineering workbench, not a generic admin dashboard.

1. Visual Design

Use a premium dark theme with a clean, technical, minimalist aesthetic.

Main background: deep navy / near-black, around #0B1120.
Sidebar and panels: #111827 or #131F32.
Primary accent: teal / emerald, around #14B8A6.
Running state: amber.
Error state: red.
Completed state: green.
Primary text: #E5E7EB.
Secondary text: #94A3B8.
Use subtle borders, restrained shadows, consistent spacing, and rounded corners.
Use a modern sans-serif font and monospace typography for CVE IDs, job IDs, logs, and YAML.
Avoid excessive gradients, oversized charts, excessive glowing effects, and decorative animations.
Use Lucide icons consistently.
Make the layout responsive, prioritizing desktop screens used by SOC analysts.

The overall style should resemble a high-quality security operations console with the usability of a developer tool.

2. Application Layout

Create a persistent left sidebar with these navigation items:

Overview
CVE Pipeline
Sigma Rules
AI Traces
History
Settings

Include a compact application logo and system connection status in the sidebar or top navigation.

The main content area should use a consistent page header, breadcrumbs where appropriate, and contextual actions.

3. Overview Dashboard

Build an operational dashboard with:

Total CVEs processed.
Currently running jobs.
Successfully generated rules.
Failed jobs.
Recent CVE processing jobs.
Recent rule generation activity.
A compact pipeline status summary.

Display recent jobs in a searchable table with:

CVE ID.
Job ID.
Current processing stage.
Status.
Progress.
Started time.
Duration.
Actions to inspect the job.

Use realistic mock data initially, but keep the data layer isolated so it can be replaced by real backend APIs.

Do not present mock metrics as real production data.

4. CVE Processing Workflow

Create a dedicated CVE Pipeline page.

At the top, provide an input for a CVE identifier, such as CVE-2025-12345, and a primary button labeled "Generate Sigma Rule".

Requirements:

Validate the CVE identifier format.
Display a clear validation message.
Prevent accidental duplicate submissions while a request is being submitted.
Submit the CVE to the backend through a dedicated API service.
Capture the returned job or execution ID.
Navigate to, or open, the corresponding job detail view.
Show the actual backend processing status.
Support running, queued, completed, failed, cancelled, and other backend-defined states.
Refresh job status using the backend's supported polling or real-time event mechanism.
Handle loading, timeout, network errors, retries, and empty states.
Preserve the selected job when navigating between views when possible.

Do not fabricate processing progress or automatically mark a job complete.

5. Job Detail Workbench

Design a detailed job inspection page.

The header should contain:

CVE ID.
Job ID.
Overall status.
Start time and duration.
Refresh action.
Relevant retry or cancel actions only if supported by the backend.

The primary section should visualize the execution pipeline as a timeline or vertical step list.

Each step should support:

Step name.
Status.
Start and end time.
Duration.
Input data.
Output data.
Logs.
Error details.
Expand/collapse interaction.

Use clear visual distinctions for completed, running, pending, skipped, and failed steps.

The pipeline must be data-driven. Render the steps returned by the backend rather than hardcoding a fixed sequence.

Include tabs or sections for:

Pipeline
Logs
AI Traces
Generated Rule
Metadata

On completion, make the generated Sigma rule easy to access.

6. Sigma Rule Viewer

Create a professional YAML viewer with:

Syntax highlighting.
Monospace font.
Line numbers.
Copy-to-clipboard.
Download YAML.
Clear validation status.
Rule metadata displayed in a compact panel.

Display relevant Sigma fields when available, including title, id, status, description, references, author, date, tags, logsource, detection, false positives, and level.

Also display backend-provided validation results and errors.

Support version comparison only if the backend exposes rule versions.

Clearly distinguish generated, validated, reviewed, and deployed states. Never imply that a rule is production-ready solely because generation succeeded.

7. AI Trace and Conversation Explorer

Build a dedicated AI execution inspection experience.

The layout should have:

A left panel listing executions or conversation sessions.
A central panel displaying an execution timeline or event stream.
A right-side inspector, drawer, or expandable panel showing event details.

Support backend-provided event types such as:

User messages.
Assistant messages.
Tool calls.
Tool results.
Execution steps.
Validation results.
Errors.
Final generated output.

For each event, display available metadata such as timestamp, event type, duration, tool name, input, output, and error details.

Requirements:

Filter events by type and status.
Search messages and event content.
Expand and collapse event details.
Navigate between runs associated with the same CVE.
Link each trace to its corresponding job and generated rule.
Handle missing or partial event data gracefully.

If the backend stores conversation messages, display the actual persisted conversation in chronological order.

Add an analyst analysis panel where users can ask questions about the selected execution, provided a compatible backend endpoint exists. Clearly distinguish stored conversation history from any new analysis request.

Do not invent AI messages or fabricate tool execution events in production mode.

8. History and Search

Create a searchable history page with filters for:

CVE ID.
Job status.
Date range.
Rule generation outcome.
Execution ID.

Provide pagination or server-side loading for large histories.

Allow users to open a historical job, inspect its traces, and view its generated rule.

Keep filters and navigation state consistent when possible.

9. API Integration Architecture

The backend already exists. Before implementing API integration, inspect the available API documentation, endpoint definitions, or provided backend schemas.

Create a centralized API client and separate service modules for:

CVE submission.
Job status and job details.
Pipeline steps and logs.
Generated Sigma rules.
AI execution traces.
Conversation history.
Rule validation.
History search.

Use TypeScript types for backend response objects.

Keep API URLs and configuration in environment variables.

Implement loading, error, empty, and success states for all data-driven pages.

Do not assume endpoint names, response schemas, authentication methods, or WebSocket support without evidence.

If backend documentation is not yet available, create a typed mock API adapter with realistic sample data and an explicit configuration point for later integration.

Never silently mix mock data with live production data.

10. Interaction and UX
Use skeleton loaders for initial data loading.
Use toasts for action feedback.
Use confirmation dialogs for destructive actions.
Use clear status badges and concise labels.
Keep dense technical information readable.
Use tables for history and compact lists for executions.
Use expandable panels for logs and structured JSON.
Support keyboard navigation and accessible contrast.
Include copy buttons for IDs, logs, and YAML.
Avoid unnecessary modal dialogs for routine inspection tasks.
11. Suggested Technology

Use the project's existing supported stack. If starting from scratch, prefer:

React.
TypeScript.
Tailwind CSS.
shadcn/ui.
Lucide icons.
A suitable syntax-highlighting library for YAML.
A lightweight query/cache library if appropriate for the project.

Keep components reusable and separate presentation from API logic.

12. Required Pages

Implement these pages with consistent styling:

Overview Dashboard.
CVE Pipeline.
CVE Job Detail Workbench.
Sigma Rules List and Rule Detail.
AI Trace Explorer.
Processing History.
Settings / API Connection Configuration.
13. Implementation Priorities

Phase 1:

Establish the visual system and sidebar.
Build the overview dashboard with realistic mock data.
Build CVE submission and job detail layouts.
Implement the dynamic pipeline visualization.
Build the YAML rule viewer.

Phase 2:

Build AI trace and conversation inspection.
Build history search and filtering.
Add API integration using the real backend schemas.

Phase 3:

Add robust error handling, responsive improvements, accessibility, and polish.

The final result should be visually cohesive, fast to navigate, technically credible, and suitable for daily use by SOC analysts and detection engineers.

Prioritize functional navigation and coherent workflows over decorative charts. Ensure all interactive elements have meaningful behavior and all sample data is clearly identified as mock data.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b78ecb37-111b-58ec-8e9e-0ba5ddcf40da).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
