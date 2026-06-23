export interface GrantReportingFacts {
  grantId: string;
  grantName: string;
  reportingMonth: string;
  pblCompletionRate: number;
  evidenceSubmissionRate: number;
  attendanceRate: number;
  riskStatus: string;
  milestoneSummary: string;
  approvedBudgetUnits: number;
  monthlyUtilizedUnits: number;
  cumulativeUtilizedUnits: number;
  cumulativeUtilizationRate: number;
}

export function generateMockNarrative(facts: GrantReportingFacts): string {
  const formattedCompletion = facts.pblCompletionRate.toFixed(1);
  const formattedEvidence = facts.evidenceSubmissionRate.toFixed(1);
  const formattedAttendance = facts.attendanceRate.toFixed(1);
  
  let recommendations = "";
  if (facts.riskStatus === "Critical") {
    recommendations = " Immediate intervention and field support is required to address severe gaps in PBL completion, evidence submissions, and student attendance.";
  } else if (facts.riskStatus === "At Risk") {
    const needs = [];
    if (facts.pblCompletionRate < 85) needs.push("completion");
    if (facts.evidenceSubmissionRate < 70) needs.push("evidence");
    if (facts.attendanceRate < 60) needs.push("attendance");
    
    // Default to "evidence, attendance" if needs list is empty to match db tone style
    const needsStr = needs.length > 0 ? needs.join(", ") : "evidence, attendance";
    recommendations = ` Needs attention on ${needsStr}. Use district and block dashboards to identify priority follow-up areas.`;
  } else if (facts.riskStatus === "Behind") {
    recommendations = " Core indicators are on track. Use the report to highlight progress and sustain evidence quality.";
  } else {
    recommendations = " Core indicators are on track. Use the report to highlight progress and sustain evidence quality.";
  }

  return `In ${facts.reportingMonth}, ${facts.grantName} reached ${formattedCompletion}% PBL completion, ${formattedEvidence}% evidence submission, and ${formattedAttendance}% attendance. Status: ${facts.riskStatus}.${recommendations}`;
}
