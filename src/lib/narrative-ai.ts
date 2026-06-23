import { GrantReportingFacts } from "./mock-narrative";

/**
 * STRICT ARCHITECTURAL CONSTRAINT:
 * The AI LLM generation MUST receive ONLY the exact same structured facts object
 * representing aggregated metrics and milestones (i.e. GrantReportingFacts).
 * It MUST NOT query the database, parse raw CSV lines, or receive raw database
 * rows directly. This enforces strict separation of data aggregation and report generation.
 */
export async function generateAINarrative(facts: GrantReportingFacts): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment.");
  }

  const prompt = `
You are a professional grant writing assistant. Based ONLY on the structured facts provided below, write a brief narrative summary matching the style of this target example:
"In 2025-07, Learning Support Grant AA reached 77.9% PBL completion, 51.6% evidence submission, and 45.0% attendance. Status: At Risk. Needs attention on evidence, attendance. Use district and block dashboards to identify priority follow-up areas."

FACT PANEL DATA:
- Month: ${facts.reportingMonth}
- Grant ID: ${facts.grantId}
- Grant Name: ${facts.grantName}
- PBL Completion Rate: ${facts.pblCompletionRate.toFixed(1)}%
- Evidence Submission Rate: ${facts.evidenceSubmissionRate.toFixed(1)}%
- Attendance Rate: ${facts.attendanceRate.toFixed(1)}%
- Risk Status: ${facts.riskStatus}
- Milestone Summary: ${facts.milestoneSummary}
- Budget Approved Units: ${facts.approvedBudgetUnits}
- Budget Monthly Utilized Units: ${facts.monthlyUtilizedUnits}
- Budget Cumulative Utilized Units: ${facts.cumulativeUtilizedUnits}
- Budget Cumulative Utilization Rate: ${facts.cumulativeUtilizationRate.toFixed(1)}%

Please write a single, cohesive paragraph report. Do not add any greeting, preamble, or markdown formatting other than plain text.
`;

  // Use Gemini 2.5 Flash as requested / configured
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API response contained no content text.");
  }

  return text.trim();
}
