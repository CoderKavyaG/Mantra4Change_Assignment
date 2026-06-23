/**
 * Classifies the risk category of a given rate (0-100).
 * Thresholds:
 * - On Track: rate >= 75
 * - Behind: rate >= 60 and < 75
 * - At Risk: rate >= 35 and < 60
 * - Critical: rate < 35
 * 
 * Note: No LaTeX or math syntax is used in UI strings, comments, or output.
 */
export function classifyRisk(rate: number): "On Track" | "Behind" | "At Risk" | "Critical" {
  if (rate >= 75) {
    return "On Track";
  } else if (rate >= 60) {
    return "Behind";
  } else if (rate >= 35) {
    return "At Risk";
  } else {
    return "Critical";
  }
}

/**
 * Returns a brief explanation for the assigned risk status.
 */
export function getRiskExplanation(status: "On Track" | "Behind" | "At Risk" | "Critical", rate: number): string {
  const roundedRate = Math.round(rate * 100) / 100;
  switch (status) {
    case "On Track":
      return `Performance is strong at ${roundedRate}% (On Track is 75% or above).`;
    case "Behind":
      return `Performance is lagging at ${roundedRate}% (Behind is between 60% and under 75%).`;
    case "At Risk":
      return `Performance is low at ${roundedRate}% (At Risk is between 35% and under 60%). Action is recommended.`;
    case "Critical":
      return `Performance is critical at ${roundedRate}% (Critical is under 35%). Immediate intervention is required.`;
  }
}
