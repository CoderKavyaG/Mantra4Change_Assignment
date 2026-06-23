import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GrantReportingFacts, generateMockNarrative } from "@/lib/mock-narrative";
import { generateAINarrative } from "@/lib/narrative-ai";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get("grantId");
    const month = searchParams.get("month");

    if (!grantId || !month) {
      return NextResponse.json(
        { error: "grantId and month query parameters are required" },
        { status: 400 }
      );
    }

    // 1. Fetch Performance Record
    const performance = await prisma.grantPerformance.findFirst({
      where: {
        grantId,
        reportingMonth: month,
      },
    });

    if (!performance) {
      return NextResponse.json(
        { error: `No performance record found for ${grantId} in ${month}.` },
        { status: 404 }
      );
    }

    // 2. Fetch Finance Records
    const financeRecords = await prisma.grantFinance.findMany({
      where: {
        grantId,
        reportingMonth: month,
      },
    });

    // 3. Fetch Media Records
    const mediaRecords = await prisma.evidenceMedia.findMany({
      where: {
        grantId,
        reportingMonth: month,
      },
    });

    // 4. Aggregate Finance Utilization
    const totalApprovedUnits = financeRecords.reduce((sum: number, r: typeof financeRecords[number]) => sum + r.approvedBudgetUnits, 0);
    const totalMonthlyUnits = financeRecords.reduce((sum: number, r: typeof financeRecords[number]) => sum + r.monthlyUtilizedUnits, 0);
    const totalCumulativeUnits = financeRecords.reduce((sum: number, r: typeof financeRecords[number]) => sum + r.cumulativeUtilizedUnits, 0);
    const cumulativeUtilizationRate =
      totalApprovedUnits > 0 ? (totalCumulativeUnits / totalApprovedUnits) * 100 : 0;

    // 5. Build Unified Facts Object
    const facts: GrantReportingFacts = {
      grantId,
      grantName: performance.grantName,
      reportingMonth: month,
      pblCompletionRate: performance.pblCompletionRate * 100,
      evidenceSubmissionRate: performance.evidenceSubmissionRate * 100,
      attendanceRate: performance.attendanceRate * 100,
      riskStatus: performance.riskStatus,
      milestoneSummary: performance.milestoneSummary,
      approvedBudgetUnits: totalApprovedUnits,
      monthlyUtilizedUnits: totalMonthlyUnits,
      cumulativeUtilizedUnits: totalCumulativeUnits,
      cumulativeUtilizationRate,
    };

    // 6. Generate Narrative Report
    let narrative = "";
    let aiGenerated = false;
    let aiError = null;

    const isAiEnabled = process.env.AI_ENABLED === "true";

    if (isAiEnabled) {
      try {
        narrative = await generateAINarrative(facts);
        aiGenerated = true;
      } catch (err: any) {
        console.warn("AI generation failed, falling back to rule-based generator:", err.message);
        aiError = err.message || "Unknown AI error";
        // Fallback
        narrative = generateMockNarrative(facts);
      }
    } else {
      narrative = generateMockNarrative(facts);
    }

    return NextResponse.json({
      facts,
      budgetLines: financeRecords,
      media: mediaRecords,
      narrative,
      aiGenerated,
      aiError,
    });
  } catch (error) {
    console.error("Failed to fetch grant analytics:", error);
    return NextResponse.json({ error: "Failed to load grant analytics" }, { status: 500 });
  }
}
