---
name: skill-creator
description: Create new agent skills and improve existing ones. Use when users want to create a skill from scratch, turn a workflow into a skill, edit or optimize an existing skill, or improve a skill's description for better triggering accuracy. Also use when asked about skill best practices, structure, or writing patterns.
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

## Process overview

1. Understand what the user wants the skill to do and roughly how
2. Write a draft SKILL.md
3. Create 2-3 test prompts and run them with the skill loaded
4. Help the user evaluate results qualitatively
5. Rewrite the skill based on feedback
6. Repeat until satisfied
7. Optimize the description for triggering accuracy

Your job is to figure out where the user is in this process and help them progress. Maybe they want to start from scratch, or maybe they already have a draft and want to iterate.

Be flexible -- if the user says "just vibe with me, skip evals", do that.

## Communicating with the user

Pay attention to context cues about technical familiarity. Terms like "evaluation" and "benchmark" are borderline OK. For "JSON" and "assertion", look for cues the user knows what those are before using them without explanation. Briefly explain terms when in doubt.

---

## Creating a skill

### Capture Intent

Start by understanding the user's intent. The conversation might already contain a workflow the user wants to capture (e.g., "turn this into a skill"). If so, extract answers from the conversation history -- tools used, sequence of steps, corrections made, input/output formats observed. The user may need to fill gaps and should confirm before proceeding.

1. What should this skill enable the agent to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases? Skills with objectively verifiable outputs (file transforms, data extraction, code generation) benefit from test cases. Skills with subjective outputs (writing style, art) often don't. Suggest the appropriate default, but let the user decide.

### Interview and Research

Proactively ask questions about edge cases, input/output formats, example files, success criteria, and dependencies. Wait to write test prompts until you've got this part ironed out.

### Write the SKILL.md

Based on the user interview, fill in these components:

- **name**: Skill identifier
- **description**: When to trigger, what it does. This is the primary triggering mechanism -- include both what the skill does AND specific contexts for when to use it. All "when to use" info goes here, not in the body. Make descriptions a little "pushy" to combat under-triggering. For instance, instead of "How to build a dashboard.", write "How to build a dashboard. Use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of data, even if they don't explicitly ask for a 'dashboard.'"
- **the rest of the skill :)**

### Skill Writing Guide

#### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

#### Progressive Disclosure

Skills use a three-level loading system:
1. **Metadata** (name + description) - Always in context (~100 words)
2. **SKILL.md body** - In context whenever skill triggers (<500 lines ideal)
3. **Bundled resources** - As needed (unlimited, scripts can execute without loading)

These word counts are approximate -- go longer if needed.

**Key patterns:**
- Keep SKILL.md under 500 lines; if approaching this limit, add hierarchy with clear pointers about where to go next.
- Reference files clearly from SKILL.md with guidance on when to read them
- For large reference files (>300 lines), include a table of contents

**Domain organization**: When a skill supports multiple domains/frameworks, organize by variant:
```
cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```
The agent reads only the relevant reference file.

#### Principle of Lack of Surprise

Skills must not contain malware, exploit code, or anything that could compromise system security. A skill's contents should not surprise the user in their intent if described. Don't create misleading skills or skills designed to facilitate unauthorized access or data exfiltration.

#### Writing Patterns

Prefer using the imperative form in instructions.

**Defining output formats:**
```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples pattern** - Include examples. Format them like this (deviate if "Input"/"Output" appear in the examples):
```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Writing Style

Explain to the model **why** things are important instead of heavy-handed MUSTs. Use theory of mind and make the skill general rather than super-narrow to specific examples. Write a draft, then look at it with fresh eyes and improve it.

If you find yourself writing ALWAYS or NEVER in all caps, or using super rigid structures, that's a yellow flag -- reframe and explain the reasoning so the model understands why. That's more humane, powerful, and effective.

### Test Cases

After writing the skill draft, come up with 2-3 realistic test prompts -- the kind of thing a real user would actually say. Share them with the user: "Here are a few test cases I'd like to try. Do these look right, or do you want to add more?"

Then run them by loading the skill and executing the prompts. Compare results against what you'd expect without the skill.

---

## Improving a skill

### How to think about improvements

1. **Generalize from feedback.** Skills get used across many different prompts. Don't overfit to the test examples with fiddly changes or oppressively constrictive MUSTs. If there's a stubborn issue, try branching out with different metaphors or patterns of working.

2. **Keep the prompt lean.** Remove things that aren't pulling their weight. Read transcripts, not just final outputs -- if the skill makes the model waste time on unproductive work, cut those parts.

3. **Explain the why.** Try hard to explain the **why** behind everything. Today's LLMs are smart. They have good theory of mind and when given a good harness can go beyond rote instructions. If the user's feedback is terse, understand the task and transmit that understanding into the instructions.

4. **Look for repeated work across test cases.** If all test cases result in the agent writing similar helper scripts or taking the same multi-step approach, that's a signal the skill should bundle that script. Write it once, put it in `scripts/`, and tell the skill to use it.

### The iteration loop

After improving the skill:

1. Apply your improvements
2. Rerun test cases
3. Ask the user to review
4. Read feedback, improve again, repeat

Keep going until:
- The user says they're happy
- The feedback is all positive
- You're not making meaningful progress

---

## Description Optimization

The description field in SKILL.md frontmatter is the primary mechanism that determines whether the agent invokes a skill. After creating or improving a skill, offer to optimize the description.

### Step 1: Generate trigger eval queries

Create ~20 eval queries -- a mix of should-trigger and should-not-trigger.

Queries must be realistic -- concrete and specific with detail. File paths, personal context, column names, company names, URLs. Some in lowercase, with abbreviations or typos or casual speech. Mix of lengths. Focus on edge cases.

Bad: `"Format this data"`, `"Extract text from PDF"`, `"Create a chart"`

Good: `"ok so my boss just sent me this xlsx file (its in my downloads, called something like 'Q4 sales final FINAL v2.xlsx') and she wants me to add a column that shows the profit margin as a percentage. The revenue is in column C and costs are in column D i think"`

For **should-trigger** queries (8-10): Different phrasings of the same intent, some formal, some casual. Include cases where the user doesn't name the skill but clearly needs it. Include uncommon use cases.

For **should-not-trigger** queries (8-10): Near-misses -- queries sharing keywords or concepts but needing something different. Adjacent domains, ambiguous phrasing where keyword matching would trigger but shouldn't. Don't make them obviously irrelevant -- "Write a fibonacci function" as a negative for a PDF skill is too easy.

### Step 2: Review with user

Present the eval set and let the user edit, toggle, add/remove entries.

### Step 3: Test manually

For each query, check whether the skill's description would reasonably trigger. Adjust the description based on false positives and false negatives.

### Step 4: Apply the result

Update the skill's SKILL.md frontmatter with the improved description. Show the user before/after.

---

## Skill installation

Skills live in one of these locations:
- **User-level**: `~/.agents/skills/` (available everywhere)
- **Project-level**: `.agents/skills/` (available in that project)

Choose user-level by default unless the skill is project-specific.

---

## Attribution

This skill's writing guidance is adapted from [Anthropic's skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator), simplified for pi's skill format and without the Claude Code-specific eval tooling.
