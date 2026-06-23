import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateParticipationRate,
  calculateEvidenceRate,
  calculateOverallAttendanceRate,
  monthOverMonthChange,
  aggregateByDistrict,
  aggregateByBlock,
  GeographicAggregation,
} from "@/lib/calculations";

function getPreviousMonth(month: string): string | null {
  const parts = month.split("-");
  if (parts.length !== 2) return null;
  const year = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (m === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${(m - 1).toString().padStart(2, "0")}`;
}

function matchesGrade(classesStr: string | null, selectedGrades: string[]): boolean {
  if (selectedGrades.length === 0) return true;
  if (!classesStr) return false;
  return selectedGrades.some((grade) => {
    if (grade === "Class 6") return classesStr.includes("6");
    if (grade === "Class 7") return classesStr.includes("7");
    if (grade === "Class 8") return classesStr.includes("8");
    return classesStr.toLowerCase().includes(grade.toLowerCase());
  });
}

function matchesSubject(subjectStr: string | null, selectedSubjects: string[]): boolean {
  if (selectedSubjects.length === 0) return true;
  if (!subjectStr) return false;
  return selectedSubjects.some((subj) => {
    if (subj === "Science") return subjectStr.includes("Science");
    if (subj === "Math") return subjectStr.includes("Math");
    return subjectStr.toLowerCase().includes(subj.toLowerCase());
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    
    if (!month) {
      return NextResponse.json({ error: "reporting month is required" }, { status: 400 });
    }

    const districtsParam = searchParams.get("districts");
    const blocksParam = searchParams.get("blocks");
    const gradesParam = searchParams.get("grades");
    const subjectsParam = searchParams.get("subjects");

    const selectedDistricts = districtsParam ? districtsParam.split(",").filter(Boolean) : [];
    const selectedBlocks = blocksParam ? blocksParam.split(",").filter(Boolean) : [];
    const selectedGrades = gradesParam ? gradesParam.split(",").filter(Boolean) : [];
    const selectedSubjects = subjectsParam ? subjectsParam.split(",").filter(Boolean) : [];

    // Fetch all school responses from DB
    const allRows = await prisma.schoolResponse.findMany();

    const previousMonth = getPreviousMonth(month);

    // Filter helper
    const filterRows = (rows: typeof allRows, targetMonth: string) => {
      return rows.filter((row) => {
        if (row.reportingMonth !== targetMonth) return false;
        
        if (selectedDistricts.length > 0 && !selectedDistricts.includes(row.district)) {
          return false;
        }
        if (selectedBlocks.length > 0 && !selectedBlocks.includes(row.block)) {
          return false;
        }
        if (!matchesGrade(row.classes, selectedGrades)) {
          return false;
        }
        if (!matchesSubject(row.subject, selectedSubjects)) {
          return false;
        }
        return true;
      });
    };

    const currentRows = filterRows(allRows, month);
    const prevRows = previousMonth ? filterRows(allRows, previousMonth) : [];

    // 1. Calculate KPI Metrics
    const totalSchools = currentRows.length;
    const participatingSchools = currentRows.filter((r) => r.conducted).length;
    const participationRate = calculateParticipationRate(currentRows);
    
    const schoolsWithEvidence = currentRows.filter((r) => r.evidenceSubmitted).length;
    const evidenceRate = calculateEvidenceRate(currentRows);

    const totalEnrollment = currentRows.reduce((sum, r) => sum + r.derivedTotalEnrollment, 0);
    const totalAttendance = currentRows.reduce((sum, r) => sum + r.derivedTotalAttendance, 0);
    const attendanceRate = calculateOverallAttendanceRate(currentRows);

    // Calculate previous month for delta
    let prevParticipationRate = 0;
    let prevAttendanceRate = 0;
    let hasPreviousMonth = false;

    if (previousMonth && prevRows.length > 0) {
      prevParticipationRate = calculateParticipationRate(prevRows);
      prevAttendanceRate = calculateOverallAttendanceRate(prevRows);
      hasPreviousMonth = true;
    }

    const participationRateDelta = hasPreviousMonth
      ? monthOverMonthChange(participationRate, prevParticipationRate)
      : null;
    const attendanceRateDelta = hasPreviousMonth
      ? monthOverMonthChange(attendanceRate, prevAttendanceRate)
      : null;

    // 2. Perform District/Block Aggregations
    // Passing all current rows representing target month, but since aggregateByDistrict/Block filters
    // by row.reportingMonth === month, we need to pass currentRows which are already filtered for month.
    // Or we can pass the whole database rows filtered by other filters but with reportingMonth preserved.
    const allMonthsFilteredRows = allRows.filter((row) => {
      if (selectedDistricts.length > 0 && !selectedDistricts.includes(row.district)) {
        return false;
      }
      if (selectedBlocks.length > 0 && !selectedBlocks.includes(row.block)) {
        return false;
      }
      if (!matchesGrade(row.classes, selectedGrades)) {
        return false;
      }
      if (!matchesSubject(row.subject, selectedSubjects)) {
        return false;
      }
      return true;
    });

    const districtAggregations = aggregateByDistrict(allMonthsFilteredRows, month);
    const blockAggregations = aggregateByBlock(allMonthsFilteredRows, month);

    // 3. High/Low performing lists based on blocks/districts
    // Sort block aggregations to get top/bottom
    const sortedBlocksDesc = [...blockAggregations].sort((a, b) => b.attendanceRate - a.attendanceRate);
    const sortedBlocksAsc = [...blockAggregations].sort((a, b) => a.attendanceRate - b.attendanceRate);

    const topBlocks = sortedBlocksDesc.slice(0, 5);
    const bottomBlocks = sortedBlocksAsc.slice(0, 5);

    const sortedDistrictsDesc = [...districtAggregations].sort((a, b) => b.attendanceRate - a.attendanceRate);
    const sortedDistrictsAsc = [...districtAggregations].sort((a, b) => a.attendanceRate - b.attendanceRate);

    const topDistricts = sortedDistrictsDesc.slice(0, 5);
    const bottomDistricts = sortedDistrictsAsc.slice(0, 5);

    return NextResponse.json({
      kpis: {
        totalSchools,
        participatingSchools,
        participationRate,
        schoolsWithEvidence,
        evidenceRate,
        totalEnrollment,
        totalAttendance,
        attendanceRate,
        participationRateDelta,
        attendanceRateDelta,
      },
      districtAggregations,
      blockAggregations,
      topBlocks,
      bottomBlocks,
      topDistricts,
      bottomDistricts,
    });
  } catch (error) {
    console.error("Failed to run analytics:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
