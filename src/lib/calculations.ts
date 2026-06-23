import { SchoolResponse } from "@prisma/client";
import { classifyRisk } from "./risk-engine";

/**
 * Calculates the participation rate as a percentage (0-100).
 * Numerator: Number of schools where PBL project was conducted (conducted = true).
 * Denominator: Total number of school records.
 */
export function calculateParticipationRate(rows: SchoolResponse[]): number {
  if (rows.length === 0) return 0;
  const conductedCount = rows.filter(r => r.conducted).length;
  return (conductedCount / rows.length) * 100;
}

/**
 * Calculates the evidence submission rate as a percentage (0-100).
 * Numerator: Number of schools where evidence was submitted (evidenceSubmitted = true).
 * Denominator: Total number of school records.
 */
export function calculateEvidenceRate(rows: SchoolResponse[]): number {
  if (rows.length === 0) return 0;
  const evidenceCount = rows.filter(r => r.evidenceSubmitted).length;
  return (evidenceCount / rows.length) * 100;
}

/**
 * Calculates the overall PBL attendance rate as a percentage (0-100).
 * Numerator: Sum of total attendance across sessions.
 * Denominator: Sum of total enrollment multiplied by 2 (due to 2 sessions: Science and Math).
 */
export function calculateOverallAttendanceRate(rows: SchoolResponse[]): number {
  let totalEnrollment = 0;
  let totalAttendance = 0;

  for (const row of rows) {
    totalEnrollment += row.derivedTotalEnrollment;
    totalAttendance += row.derivedTotalAttendance;
  }

  if (totalEnrollment === 0) return 0;
  return (totalAttendance / (totalEnrollment * 2)) * 100;
}

/**
 * Calculates month-over-month change as a signed percentage points delta.
 */
export function monthOverMonthChange(currentValue: number, previousValue: number): number {
  return currentValue - previousValue;
}

export interface GeographicAggregation {
  name: string;
  month: string;
  totalSchools: number;
  participatingSchools: number;
  participationRate: number;
  schoolsWithEvidence: number;
  evidenceRate: number;
  totalEnrollment: number;
  totalAttendance: number;
  attendanceRate: number;
  riskStatus: "On Track" | "Behind" | "At Risk" | "Critical";
}

/**
 * Aggregates school responses by District for a given month.
 */
export function aggregateByDistrict(rows: SchoolResponse[], month: string): GeographicAggregation[] {
  // Filter rows for the requested month
  const monthlyRows = rows.filter(r => r.reportingMonth === month);

  // Group by district name
  const districtMap = new Map<string, SchoolResponse[]>();
  for (const row of monthlyRows) {
    const list = districtMap.get(row.district) || [];
    list.push(row);
    districtMap.set(row.district, list);
  }

  const results: GeographicAggregation[] = [];
  for (const [districtName, districtRows] of districtMap.entries()) {
    const totalSchools = districtRows.length;
    const participatingSchools = districtRows.filter(r => r.conducted).length;
    const participationRate = (participatingSchools / totalSchools) * 100;

    const schoolsWithEvidence = districtRows.filter(r => r.evidenceSubmitted).length;
    const evidenceRate = (schoolsWithEvidence / totalSchools) * 100;

    const totalEnrollment = districtRows.reduce((sum, r) => sum + r.derivedTotalEnrollment, 0);
    const totalAttendance = districtRows.reduce((sum, r) => sum + r.derivedTotalAttendance, 0);
    const attendanceRate = totalEnrollment > 0 ? (totalAttendance / (totalEnrollment * 2)) * 100 : 0;

    const riskStatus = classifyRisk(attendanceRate);

    results.push({
      name: districtName,
      month,
      totalSchools,
      participatingSchools,
      participationRate,
      schoolsWithEvidence,
      evidenceRate,
      totalEnrollment,
      totalAttendance,
      attendanceRate,
      riskStatus
    });
  }

  return results;
}

/**
 * Aggregates school responses by Block for a given month.
 */
export function aggregateByBlock(rows: SchoolResponse[], month: string): GeographicAggregation[] {
  // Filter rows for the requested month
  const monthlyRows = rows.filter(r => r.reportingMonth === month);

  // Group by block name
  const blockMap = new Map<string, SchoolResponse[]>();
  for (const row of monthlyRows) {
    const list = blockMap.get(row.block) || [];
    list.push(row);
    blockMap.set(row.block, list);
  }

  const results: GeographicAggregation[] = [];
  for (const [blockName, blockRows] of blockMap.entries()) {
    const totalSchools = blockRows.length;
    const participatingSchools = blockRows.filter(r => r.conducted).length;
    const participationRate = (participatingSchools / totalSchools) * 100;

    const schoolsWithEvidence = blockRows.filter(r => r.evidenceSubmitted).length;
    const evidenceRate = (schoolsWithEvidence / totalSchools) * 100;

    const totalEnrollment = blockRows.reduce((sum, r) => sum + r.derivedTotalEnrollment, 0);
    const totalAttendance = blockRows.reduce((sum, r) => sum + r.derivedTotalAttendance, 0);
    const attendanceRate = totalEnrollment > 0 ? (totalAttendance / (totalEnrollment * 2)) * 100 : 0;

    const riskStatus = classifyRisk(attendanceRate);

    results.push({
      name: blockName,
      month,
      totalSchools,
      participatingSchools,
      participationRate,
      schoolsWithEvidence,
      evidenceRate,
      totalEnrollment,
      totalAttendance,
      attendanceRate,
      riskStatus
    });
  }

  return results;
}
