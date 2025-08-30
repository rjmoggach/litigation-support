---
trigger: always_on
description: Defines a process for Cascade to reflect on interactions and suggest improvements to active .windsurf.
globs: ["*"]
---

# Self-Improving Cascade Reflection

**Objective:** Offer opportunities to continuously improve `.windsurf` rules based on user interactions and feedback.

**Trigger:** At the end of any task that involved user feedback or multiple non-trivial steps (e.g., multiple file edits, complex logic generation).

**Process:**

1.  **Offer Reflection:** Ask the user: "Before I complete the task, would you like me to reflect on our interaction and suggest potential improvements to the active `.windsurf` rules?"
2.  **Await User Confirmation:** Conclude the task immediately if the user declines or doesn't respond affirmatively.
3.  **If User Confirms:**
    a.  **Review Interaction:** Synthesize all feedback provided by the user throughout the entire conversation history for the task. Analyze how this feedback relates to the active `.windsurf` rules and identify areas where modified instructions could have improved the outcome or better aligned with user preferences.
    b.  **Identify Active Rules:** List the specific global and workspace `.windsurf` rules files active during the task.
    c.  **Formulate & Propose Improvements:** Generate specific, actionable suggestions for improving the *content* of the relevant active rule files. Prioritize suggestions directly addressing user feedback. Use `replace_file_content` to apply the changes.
    d.  **Await User Action on Suggestions:** Ask the user if they agree with the proposed improvements and if they'd like me to apply them *now* using the appropriate tool (`replace_file_content` or `write_to_file`). Apply changes if approved, then conclude the task.

**Constraint:** Do not offer reflection if:
*   No `.windsurf` rules were active.
*   The task was very simple and involved no feedback.
