// Created by BBMW0 Technologies | bbmw0.com
/**
 * CORTEX Language Quality Engine
 * Enforces perfect spelling, grammar, punctuation, and writing style
 * across all 900+ agent outputs in every language.
 *
 * Rules enforced:
 *   - No em dashes (replace with comma, colon, or parentheses)
 *   - No irregular Unicode characters
 *   - No double hyphens used as dashes
 *   - No orphaned punctuation
 *   - Consistent quotation marks
 *   - 20 distinct writing styles per agent type
 */

// ─── Character Normalisation Map ────────────────────────────────────────────

interface CharacterFix {
  description: string;
  pattern: RegExp;
  replacement: string;
}

export const CHARACTER_FIXES: CharacterFix[] = [
  // Em dash variants: replace with comma or colon based on context
  { description: "em dash (Unicode 2014)", pattern: /: /g, replacement: ", " },
  { description: "en dash (Unicode 2013)", pattern: /–/g, replacement: "-" },
  { description: "double hyphen used as dash", pattern: /\s--\s/g, replacement: ", " },
  { description: "double hyphen at word boundary", pattern: /--/g, replacement: "-" },

  // Smart / curly quotes: normalise to straight quotes
  { description: "left double quotation mark", pattern: /“/g, replacement: "\"" },
  { description: "right double quotation mark", pattern: /”/g, replacement: "\"" },
  { description: "left single quotation mark", pattern: /‘/g, replacement: "'" },
  { description: "right single quotation mark", pattern: /’/g, replacement: "'" },
  { description: "double low-9 quotation mark", pattern: /„/g, replacement: "\"" },
  { description: "single low-9 quotation mark", pattern: /‚/g, replacement: "'" },

  // Ellipsis character: replace with three explicit periods
  { description: "ellipsis character", pattern: /…/g, replacement: "..." },

  // Non-standard spaces
  { description: "non-breaking space", pattern: / /g, replacement: " " },
  { description: "thin space", pattern: / /g, replacement: " " },
  { description: "zero-width space", pattern: /​/g, replacement: "" },
  { description: "zero-width non-joiner", pattern: /‌/g, replacement: "" },

  // Bullet variants: normalise
  { description: "bullet (Unicode 2022)", pattern: /•/g, replacement: "-" },
  { description: "triangular bullet", pattern: /‣/g, replacement: "-" },
  { description: "hyphen bullet", pattern: /⁃/g, replacement: "-" },

  // Mathematical minus: keep as hyphen
  { description: "minus sign", pattern: /−/g, replacement: "-" },

  // Typographic apostrophe
  { description: "modifier letter apostrophe", pattern: /ʼ/g, replacement: "'" },

  // Multiple consecutive spaces (outside code blocks): collapse
  { description: "multiple spaces", pattern: / {2,}/g, replacement: " " },

  // Trailing spaces on lines
  { description: "trailing whitespace", pattern: /[ \t]+$/gm, replacement: "" },
];

// ─── Writing Style Definitions ───────────────────────────────────────────────

export type WritingStyleName =
  | "executive"
  | "academic"
  | "technical"
  | "legal"
  | "medical"
  | "financial"
  | "creative"
  | "journalistic"
  | "consultative"
  | "scientific"
  | "operational"
  | "diplomatic"
  | "analytical"
  | "strategic"
  | "cyber"
  | "pedagogical"
  | "entrepreneurial"
  | "regulatory"
  | "engineering"
  | "investigative";

export interface WritingStyle {
  name: WritingStyleName;
  toneWords: string[];
  sentenceLengthGuide: "short" | "medium" | "long" | "varied";
  structurePreference: "bullets" | "prose" | "numbered" | "mixed";
  forbiddenPatterns: string[];
  systemPromptAddition: string;
}

export const WRITING_STYLES: Record<WritingStyleName, WritingStyle> = {
  executive: {
    name: "executive",
    toneWords: ["decisive", "concise", "authoritative", "outcome-focused"],
    sentenceLengthGuide: "short",
    structurePreference: "bullets",
    forbiddenPatterns: ["basically", "kind of", "sort of", "I think maybe"],
    systemPromptAddition: `WRITING STANDARD: Executive style.
- Lead with the conclusion or recommendation before any supporting detail.
- Use active voice exclusively.
- Each sentence carries a single, complete idea.
- Paragraphs are no longer than four sentences.
- Preferred structure: headline, three supporting points, clear call to action.
- Forbidden words: basically, kind of, sort of, perhaps, maybe (unless expressing genuine uncertainty with evidence).
- Punctuation: full stops, commas, colons, and semicolons only. No dashes of any kind.`,
  },

  academic: {
    name: "academic",
    toneWords: ["precise", "evidence-based", "objective", "thorough"],
    sentenceLengthGuide: "long",
    structurePreference: "prose",
    forbiddenPatterns: ["obviously", "clearly", "needless to say"],
    systemPromptAddition: `WRITING STANDARD: Academic style.
- Every claim is supported by evidence, citation, or explicit reasoning.
- Define technical terms on first use.
- Hedging language (may, might, suggests, indicates) is appropriate when evidence is incomplete.
- Passive voice is acceptable where the agent of action is unknown or unimportant.
- Avoid rhetorical questions.
- Structure: introduction, body with numbered sections, conclusion.
- Punctuation: standard scholarly punctuation. No dashes replacing colons or commas.`,
  },

  technical: {
    name: "technical",
    toneWords: ["precise", "systematic", "step-by-step", "unambiguous"],
    sentenceLengthGuide: "medium",
    structurePreference: "numbered",
    forbiddenPatterns: ["as you know", "it goes without saying", "etc."],
    systemPromptAddition: `WRITING STANDARD: Technical style.
- Use numbered steps for procedures.
- Each step contains exactly one action.
- Code, commands, file paths, and variable names appear in code blocks.
- State prerequisites before instructions.
- Use precise technical vocabulary; do not substitute casual synonyms.
- End every section with the expected outcome or verification step.
- No vague terms: replace "etc." with a complete list or "and related items".`,
  },

  legal: {
    name: "legal",
    toneWords: ["precise", "formal", "unambiguous", "authoritative"],
    sentenceLengthGuide: "long",
    structurePreference: "numbered",
    forbiddenPatterns: ["etc.", "and so on", "kind of", "roughly"],
    systemPromptAddition: `WRITING STANDARD: Legal style.
- Define all terms of art in a definitions section before use.
- Use "shall" for obligations, "may" for permissions, "must not" for prohibitions.
- Numbered and lettered subsections for all provisions.
- No ambiguous pronouns: repeat the noun or use defined terms.
- Passive constructions are acceptable where legally standard.
- Dates in full: 1 May 2026, not 01/05/26.
- Monetary amounts in words followed by numerals: one thousand pounds (GBP 1,000).`,
  },

  medical: {
    name: "medical",
    toneWords: ["precise", "evidence-based", "cautious", "compassionate"],
    sentenceLengthGuide: "medium",
    structurePreference: "mixed",
    forbiddenPatterns: ["obviously", "definitely cures", "guaranteed"],
    systemPromptAddition: `WRITING STANDARD: Medical style.
- Use standard anatomical and clinical terminology.
- Cite evidence level where relevant (RCT, meta-analysis, case series).
- Dosages include units, route, and frequency every time.
- Contraindications and warnings precede instructions.
- Avoid absolute language for clinical outcomes: use "associated with", "may reduce", "evidence suggests".
- Patient-facing summaries use plain language equivalents alongside clinical terms.`,
  },

  financial: {
    name: "financial",
    toneWords: ["precise", "analytical", "evidence-based", "risk-aware"],
    sentenceLengthGuide: "medium",
    structurePreference: "mixed",
    forbiddenPatterns: ["guaranteed returns", "definitely will", "no risk"],
    systemPromptAddition: `WRITING STANDARD: Financial style.
- All figures include currency, period, and basis (e.g., USD 4.2 million FY2025, GAAP).
- Percentages state the base: revenue grew 12% year-on-year, not just "grew 12%".
- Risk disclosures precede forecasts.
- Use standard financial abbreviations: EBITDA, P/E, CAGR, LTV.
- Tables for comparative data; prose for narrative interpretation.
- Past performance disclaimers where projections appear.`,
  },

  creative: {
    name: "creative",
    toneWords: ["vivid", "engaging", "original", "sensory"],
    sentenceLengthGuide: "varied",
    structurePreference: "prose",
    forbiddenPatterns: ["very unique", "very tired cliche", "at the end of the day"],
    systemPromptAddition: `WRITING STANDARD: Creative style.
- Vary sentence length deliberately: short for impact, long for immersion.
- Concrete sensory details over abstract adjectives.
- Show through specific action and image rather than telling through label.
- Each paragraph has a single emotional or narrative purpose.
- Avoid cliches; find the precise, unexpected word.
- Punctuation serves rhythm: a comma is a breath, a full stop is a beat.`,
  },

  journalistic: {
    name: "journalistic",
    toneWords: ["clear", "factual", "impartial", "concise"],
    sentenceLengthGuide: "short",
    structurePreference: "prose",
    forbiddenPatterns: ["allegedly (without attribution)", "sources say (unnamed)"],
    systemPromptAddition: `WRITING STANDARD: Journalistic style.
- Inverted pyramid: most important information first.
- Every claim attributes to a named or described source.
- Lead paragraph answers: who, what, when, where, why, how.
- No opinion in news reporting; opinion is clearly labelled.
- Active voice and strong verbs.
- Short paragraphs: two to three sentences maximum.`,
  },

  consultative: {
    name: "consultative",
    toneWords: ["structured", "insight-driven", "client-focused", "action-oriented"],
    sentenceLengthGuide: "medium",
    structurePreference: "mixed",
    forbiddenPatterns: ["to be honest", "frankly speaking", "let me be clear"],
    systemPromptAddition: `WRITING STANDARD: Consultative style.
- Frame findings as insights, not observations.
- Every insight connects to a business impact.
- Use the "situation, complication, resolution" structure.
- Recommendations are numbered and prioritised.
- Quantify impact where possible: time, money, risk, or efficiency.
- Avoid jargon unless the client uses it; mirror client language.`,
  },

  scientific: {
    name: "scientific",
    toneWords: ["objective", "methodical", "reproducible", "evidence-driven"],
    sentenceLengthGuide: "varied",
    structurePreference: "numbered",
    forbiddenPatterns: ["proves that", "conclusively shows", "obviously"],
    systemPromptAddition: `WRITING STANDARD: Scientific style.
- IMRaD structure for reports: Introduction, Methods, Results, Discussion.
- Hypotheses are stated before methodology.
- Methods sections provide enough detail for replication.
- Results are reported without interpretation; interpretation belongs in Discussion.
- Statistical results include test statistic, degrees of freedom, and p-value.
- No causal language unless the study design supports causation.`,
  },

  operational: {
    name: "operational",
    toneWords: ["direct", "process-oriented", "clear", "actionable"],
    sentenceLengthGuide: "short",
    structurePreference: "numbered",
    forbiddenPatterns: ["ASAP", "whenever possible", "try to"],
    systemPromptAddition: `WRITING STANDARD: Operational style.
- Every instruction uses imperative mood: "Open the settings panel", not "You should open".
- Numbered steps for sequential processes; bullets for parallel options.
- Include the responsible party for every action.
- State success criteria at the end of each procedure.
- Avoid vague timing: use specific deadlines or conditions rather than "soon" or "when ready".`,
  },

  diplomatic: {
    name: "diplomatic",
    toneWords: ["measured", "respectful", "constructive", "precise"],
    sentenceLengthGuide: "medium",
    structurePreference: "prose",
    forbiddenPatterns: ["you failed", "you were wrong", "obviously you should"],
    systemPromptAddition: `WRITING STANDARD: Diplomatic style.
- Frame challenges as shared problems rather than failures.
- Acknowledge the other party's position before presenting an alternative.
- Use "and" rather than "but" when bridging contrasting points.
- Passive constructions to depersonalise sensitive statements where appropriate.
- Formal salutation and closing in all correspondence.
- Avoid absolute judgements; prefer "this approach may benefit from..." over "this is wrong".`,
  },

  analytical: {
    name: "analytical",
    toneWords: ["structured", "logical", "data-driven", "objective"],
    sentenceLengthGuide: "medium",
    structurePreference: "mixed",
    forbiddenPatterns: ["I feel like", "it seems like", "kind of"],
    systemPromptAddition: `WRITING STANDARD: Analytical style.
- State the analytical framework before applying it.
- Every conclusion follows explicitly from stated evidence.
- Distinguish facts (measured), inferences (derived), and assumptions (stated).
- Quantitative data precedes qualitative interpretation.
- Use comparison tables for multi-option analysis.
- Sensitivity analysis for any projections: what changes if a key assumption shifts?`,
  },

  strategic: {
    name: "strategic",
    toneWords: ["forward-looking", "decisive", "systemic", "visionary"],
    sentenceLengthGuide: "varied",
    structurePreference: "mixed",
    forbiddenPatterns: ["in the current landscape", "going forward", "synergies"],
    systemPromptAddition: `WRITING STANDARD: Strategic style.
- Open with the strategic context: what is changing and why it matters.
- Frame recommendations in terms of competitive position and long-term value.
- Use horizon framing: immediate (0-6 months), near-term (6-18 months), long-term (18+ months).
- Every strategic choice names the trade-off being made.
- Avoid buzzwords: replace with precise language about the actual mechanism.`,
  },

  cyber: {
    name: "cyber",
    toneWords: ["precise", "threat-aware", "systematic", "unambiguous"],
    sentenceLengthGuide: "medium",
    structurePreference: "numbered",
    forbiddenPatterns: ["it is secure", "unhackable", "completely safe"],
    systemPromptAddition: `WRITING STANDARD: Cybersecurity style.
- Classify information by sensitivity tier before discussing it.
- Use standard terminology: CVE IDs, CVSS scores, MITRE ATT&CK tactics.
- Risk statements follow the format: "Threat actor X exploiting vulnerability Y via vector Z with impact A."
- Remediation steps include verification commands or tests.
- Never state that a system is "fully secure"; use "hardened to current best practice".
- TLP (Traffic Light Protocol) classification on all threat intelligence outputs.`,
  },

  pedagogical: {
    name: "pedagogical",
    toneWords: ["clear", "encouraging", "structured", "patient"],
    sentenceLengthGuide: "medium",
    structurePreference: "mixed",
    forbiddenPatterns: ["obviously", "as everyone knows", "trivially"],
    systemPromptAddition: `WRITING STANDARD: Pedagogical style.
- Begin with the learner objective: "By the end of this section, you will be able to..."
- Introduce concepts before applying them.
- Use analogies to connect new concepts to familiar ones.
- Check comprehension with questions or worked examples before advancing.
- Celebrate correct reasoning, not just correct answers.
- Avoid "obviously" or "clearly"; what is obvious to the teacher may not be to the learner.`,
  },

  entrepreneurial: {
    name: "entrepreneurial",
    toneWords: ["energetic", "opportunity-focused", "concise", "persuasive"],
    sentenceLengthGuide: "short",
    structurePreference: "mixed",
    forbiddenPatterns: ["we might potentially", "could possibly consider"],
    systemPromptAddition: `WRITING STANDARD: Entrepreneurial style.
- Lead with the opportunity or problem being solved, not the solution.
- Use plain language: no jargon unless the audience expects it.
- Short sentences carry energy; use them for key points.
- Every paragraph earns its place: if it does not move the story forward, cut it.
- Quantify traction and potential: users, revenue, growth rate.
- Calls to action are specific: "Schedule a 20-minute call by Friday", not "Let us know".`,
  },

  regulatory: {
    name: "regulatory",
    toneWords: ["precise", "compliant", "formal", "unambiguous"],
    sentenceLengthGuide: "long",
    structurePreference: "numbered",
    forbiddenPatterns: ["etc.", "and so on", "roughly", "approximately (without range)"],
    systemPromptAddition: `WRITING STANDARD: Regulatory style.
- Reference the specific regulation, article, and clause for every requirement.
- Obligations use "must" or "is required to"; permissions use "may".
- Define all terms with regulatory definitions before use.
- Compliance status is explicit: "compliant", "non-compliant", or "requires assessment".
- Dates, thresholds, and limits are exact: no approximations.
- Cross-references include section numbers, not just descriptions.`,
  },

  engineering: {
    name: "engineering",
    toneWords: ["precise", "systematic", "specification-driven", "verifiable"],
    sentenceLengthGuide: "medium",
    structurePreference: "numbered",
    forbiddenPatterns: ["should work", "might be okay", "good enough"],
    systemPromptAddition: `WRITING STANDARD: Engineering style.
- Specifications state: requirement, measurement method, acceptance criterion.
- Use SI units with explicit prefixes.
- Tolerances and error bounds on all numerical values.
- Risk items follow FMEA format: failure mode, effect, cause, detection, severity.
- All assumptions are stated explicitly at the start of calculations.
- Review checklists at the end of every deliverable section.`,
  },

  investigative: {
    name: "investigative",
    toneWords: ["methodical", "evidence-driven", "impartial", "thorough"],
    sentenceLengthGuide: "varied",
    structurePreference: "mixed",
    forbiddenPatterns: ["allegedly (without basis)", "rumour has it"],
    systemPromptAddition: `WRITING STANDARD: Investigative style.
- Follow the evidence chain: every conclusion traces back to primary sources.
- Distinguish confirmed facts from working hypotheses from speculation.
- Document the chain of custody for all evidence.
- Give subjects under investigation the opportunity to respond (where applicable).
- Timeline reconstruction precedes causal analysis.
- Conflicting evidence is presented and resolved, not ignored.`,
  },
};

// ─── Style Assignment Map ────────────────────────────────────────────────────

/**
 * Maps agent tier and department keywords to the most appropriate writing style.
 * Agents can have this overridden by explicit configuration.
 */
const DEPARTMENT_STYLE_MAP: Record<string, WritingStyleName> = {
  "C-Suite":                  "executive",
  "Executive Leadership":     "executive",
  "Strategy":                 "strategic",
  "Legal":                    "legal",
  "Compliance":               "regulatory",
  "Finance":                  "financial",
  "Investment":               "financial",
  "Medicine":                 "medical",
  "Healthcare":               "medical",
  "Science":                  "scientific",
  "Research":                 "scientific",
  "Cybersecurity":            "cyber",
  "Security":                 "cyber",
  "Red Team":                 "cyber",
  "Blue Team":                "cyber",
  "SOC":                      "cyber",
  "Engineering":              "engineering",
  "Software Engineering":     "technical",
  "DevOps":                   "technical",
  "Architecture":             "technical",
  "Data":                     "analytical",
  "Analytics":                "analytical",
  "Product":                  "consultative",
  "Operations":               "operational",
  "HR":                       "diplomatic",
  "People":                   "diplomatic",
  "Communications":           "journalistic",
  "Marketing":                "entrepreneurial",
  "Sales":                    "consultative",
  "Education":                "pedagogical",
  "Training":                 "pedagogical",
  "Creative":                 "creative",
  "Design":                   "creative",
  "Journalism":               "journalistic",
  "Policy":                   "diplomatic",
  "Government":               "diplomatic",
  "Diplomacy":                "diplomatic",
  "Intelligence":             "investigative",
  "Forensics":                "investigative",
};

const TIER_DEFAULT_STYLE: Record<number, WritingStyleName> = {
  1: "executive",
  2: "strategic",
  3: "analytical",
  4: "technical",
  5: "operational",
};

// ─── Language Quality Engine ─────────────────────────────────────────────────

export class LanguageQualityEngine {
  private static instance: LanguageQualityEngine;

  static getInstance(): LanguageQualityEngine {
    if (!LanguageQualityEngine.instance) {
      LanguageQualityEngine.instance = new LanguageQualityEngine();
    }
    return LanguageQualityEngine.instance;
  }

  /**
   * Main entry point. Cleans a text string:
   * 1. Preserves code blocks untouched.
   * 2. Applies all CHARACTER_FIXES to non-code regions.
   * 3. Returns the cleaned string.
   */
  clean(text: string): string {
    if (!text || text.trim().length === 0) return text;
    return this.cleanAroundCodeBlocks(text);
  }

  /**
   * Splits text into code and non-code segments, applies fixes only to non-code.
   * Handles fenced code blocks (triple backtick or triple tilde) and inline code.
   */
  private cleanAroundCodeBlocks(text: string): string {
    // Split on fenced code blocks: ```...``` or ~~~...~~~
    const segments: Array<{ content: string; isCode: boolean }> = [];
    const fencePattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
    let lastIndex = 0;
    let match: RegExpMatchArray | null;

    // Iterate through all code block matches
    const allMatches = [...text.matchAll(fencePattern)];
    for (const m of allMatches) {
      const start = m.index ?? 0;
      if (start > lastIndex) {
        segments.push({ content: text.slice(lastIndex, start), isCode: false });
      }
      segments.push({ content: m[0], isCode: true });
      lastIndex = start + m[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ content: text.slice(lastIndex), isCode: false });
    }

    return segments
      .map(seg => (seg.isCode ? seg.content : this.applyCharacterFixes(seg.content)))
      .join("");
  }

  /**
   * Applies all CHARACTER_FIXES to a plain-text segment.
   */
  private applyCharacterFixes(text: string): string {
    let result = text;
    for (const fix of CHARACTER_FIXES) {
      result = result.replace(fix.pattern, fix.replacement);
    }
    return result;
  }

  /**
   * Returns the appropriate WritingStyle for an agent based on tier and department.
   */
  getStyleForAgent(tier: number, department: string, role?: string): WritingStyle {
    // Check department map first
    for (const [keyword, styleName] of Object.entries(DEPARTMENT_STYLE_MAP)) {
      if (department.toLowerCase().includes(keyword.toLowerCase())) {
        return WRITING_STYLES[styleName];
      }
    }

    // Role-based overrides for specific patterns
    if (role) {
      const roleLower = role.toLowerCase();
      if (roleLower.includes("hacker") || roleLower.includes("penetration") || roleLower.includes("red team")) {
        return WRITING_STYLES.cyber;
      }
      if (roleLower.includes("lawyer") || roleLower.includes("counsel") || roleLower.includes("legal")) {
        return WRITING_STYLES.legal;
      }
      if (roleLower.includes("doctor") || roleLower.includes("physician") || roleLower.includes("surgeon")) {
        return WRITING_STYLES.medical;
      }
      if (roleLower.includes("scientist") || roleLower.includes("researcher") || roleLower.includes("analyst")) {
        return WRITING_STYLES.scientific;
      }
    }

    // Fall back to tier default
    const tierStyle = TIER_DEFAULT_STYLE[tier] ?? "analytical";
    return WRITING_STYLES[tierStyle];
  }

  /**
   * Injects the writing style system prompt addition into an agent's base system prompt.
   * Also appends global punctuation and language quality rules.
   */
  enrichSystemPrompt(baseSystemPrompt: string, tier: number, department: string, role?: string): string {
    const style = this.getStyleForAgent(tier, department, role);

    const globalRules = `

UNIVERSAL LANGUAGE QUALITY RULES (apply to ALL output, ALL languages, ALL formats):
- Perfect spelling, grammar, and punctuation in every language used.
- No em dashes (the character represented as a long horizontal line) anywhere in output.
- No double hyphens (--) used as punctuation between words or sentences.
- No irregular Unicode punctuation characters.
- Quotation marks are straight: " and ' not typographic variants.
- Every sentence ends with appropriate terminal punctuation.
- No trailing spaces on any line.
- In any language, reproduce the correct diacritics and character forms.
- In code, follow the language's own style guide; prose rules do not apply inside code blocks.

${style.systemPromptAddition}`;

    return baseSystemPrompt.trimEnd() + globalRules;
  }

  /**
   * Returns the full list of character fix descriptions for diagnostics.
   */
  listFixes(): string[] {
    return CHARACTER_FIXES.map(f => f.description);
  }

  /**
   * Scans a text and returns all character issues found, with positions.
   */
  diagnose(text: string): Array<{ description: string; position: number; found: string }> {
    const issues: Array<{ description: string; position: number; found: string }> = [];
    for (const fix of CHARACTER_FIXES) {
      const localPattern = new RegExp(fix.pattern.source, "g");
      let m: RegExpMatchArray | null;
      while ((m = localPattern.exec(text)) !== null) {
        issues.push({
          description: fix.description,
          position: m.index ?? 0,
          found: m[0],
        });
      }
    }
    return issues.sort((a, b) => a.position - b.position);
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const languageQualityEngine = LanguageQualityEngine.getInstance();
