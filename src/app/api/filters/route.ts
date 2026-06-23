import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rows = await prisma.schoolResponse.findMany({
      select: {
        reportingMonth: true,
        district: true,
        block: true,
        subject: true,
        classes: true,
      },
    });

    const monthsSet = new Set<string>();
    const districtsSet = new Set<string>();
    const subjectsSet = new Set<string>();
    const classesSet = new Set<string>();
    const districtBlocks: Record<string, Set<string>> = {};

    for (const row of rows) {
      if (row.reportingMonth) monthsSet.add(row.reportingMonth);
      if (row.district) {
        districtsSet.add(row.district);
        if (!districtBlocks[row.district]) {
          districtBlocks[row.district] = new Set<string>();
        }
        if (row.block) {
          districtBlocks[row.district].add(row.block);
        }
      }
      if (row.subject) subjectsSet.add(row.subject);
      if (row.classes) classesSet.add(row.classes);
    }

    // Convert sets to sorted arrays
    const months = Array.from(monthsSet).sort();
    const districts = Array.from(districtsSet).sort();
    const subjects = Array.from(subjectsSet).sort();
    const classes = Array.from(classesSet).sort();

    // Map sets to arrays for district-to-block lookup
    const districtBlocksArray: Record<string, string[]> = {};
    for (const [dist, blocksSet] of Object.entries(districtBlocks)) {
      districtBlocksArray[dist] = Array.from(blocksSet).sort();
    }

    return NextResponse.json({
      months,
      districts,
      districtBlocks: districtBlocksArray,
      subjects,
      classes,
    });
  } catch (error) {
    console.error("Failed to fetch filters:", error);
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}
