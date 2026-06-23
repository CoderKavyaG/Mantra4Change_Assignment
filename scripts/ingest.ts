import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { prisma } from "../src/lib/db";

// Absolute paths to CSV folders (Mantra4Change folder is sibling/parent directory of this project)
const ROOT_DIR = path.resolve(__dirname, "..");
const WORKSPACE_DIR = path.resolve(ROOT_DIR, ".."); // c:\Users\Kavya\Downloads\Mantra4Change_PBL_AI_Prework_Candidate_Package

const PRIMARY_DATA_DIR = path.join(WORKSPACE_DIR, "02_Primary_PBL_Data", "csv_exports");
const GRANT_DATA_DIR = path.join(WORKSPACE_DIR, "03_Grant_Reporting_Evidence", "csv");

async function main() {
  console.log("Starting CSV Ingestion...");

  // 1. Clean Database
  console.log("Cleaning existing records...");
  await prisma.schoolResponse.deleteMany({});
  await prisma.grantFinance.deleteMany({});
  await prisma.grantPerformance.deleteMany({});
  await prisma.evidenceMedia.deleteMany({});

  // 2. Ingest Primary PBL Data (July, August, September 2025)
  const schoolFiles = [
    "PBL_School_Response_Data_July_2025.csv",
    "PBL_School_Response_Data_August_2025.csv",
    "PBL_School_Response_Data_September_2025.csv"
  ];

  let totalSchoolResponses = 0;
  for (const filename of schoolFiles) {
    const filePath = path.join(PRIMARY_DATA_DIR, filename);
    console.log(`Ingesting primary data from: ${filename}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Parsed ${records.length} records from ${filename}`);

    const batch = [];
    for (const record of records) {
      batch.push({
        reportingMonth: record["Reporting Month"],
        timestamp: record["Timestamp"],
        schoolName: record["What is the name of your school?"],
        schoolCode: record["What is your school's synthetic school code?"],
        district: record["What is the name of your district?"],
        block: record["Block Details"],
        conducted: record["Was the PBL project conducted in your school this month?"] === "Yes",
        evidenceSubmitted: record["Was evidence submitted for the completed PBL project?"] === "Yes",
        classes: record["In which class/classes did you conduct the PBL project?"],
        subject: record["Which subject do you teach?"],
        class6Enrollment: parseInt(record["Total number of students enrolled in Class 6, including all sections"]) || 0,
        class6ScienceAttendance: parseInt(record["Average student attendance during the Class 6 PBL Science session. If you did not teach Science in Class 6, enter 0."]) || 0,
        class6MathAttendance: parseInt(record["Average student attendance during the Class 6 PBL Math session. If you did not teach Math in Class 6, enter 0."]) || 0,
        class7Enrollment: parseInt(record["Total number of students enrolled in Class 7, including all sections"]) || 0,
        class7ScienceAttendance: parseInt(record["Average student attendance during the Class 7 PBL Science session. If you did not teach Science in Class 7, enter 0."]) || 0,
        class7MathAttendance: parseInt(record["Average student attendance during the Class 7 PBL Math session. If you did not teach Math in Class 7, enter 0."]) || 0,
        class8Enrollment: parseInt(record["Total number of students enrolled in Class 8, including all sections"]) || 0,
        class8ScienceAttendance: parseInt(record["Average student attendance during the Class 8 PBL Science session. If you did not teach Science in Class 8, enter 0."]) || 0,
        class8MathAttendance: parseInt(record["Average student attendance during the Class 8 PBL Math session. If you did not teach Math in Class 8, enter 0."]) || 0,
        derivedTotalEnrollment: parseInt(record["Derived: Total enrollment across Classes 6-8"]) || 0,
        derivedTotalAttendance: parseInt(record["Derived: Total attendance across PBL Science and Math sessions"]) || 0,
        derivedOverallAttendanceRate: parseFloat(record["Derived: Overall PBL attendance rate"]) || 0,
        derivedRiskStatus: record["Derived: Risk status"] || ""
      });
    }

    // Insert using transaction batches of 100 for SQLite performance
    const batchSize = 100;
    for (let i = 0; i < batch.length; i += batchSize) {
      const chunk = batch.slice(i, i + batchSize);
      await prisma.$transaction(
        chunk.map(data => prisma.schoolResponse.create({ data }))
      );
    }
    totalSchoolResponses += batch.length;
  }
  console.log(`Total SchoolResponse rows created: ${totalSchoolResponses}`);

  // 3. Ingest 01_Grant_Profile_and_Finance.csv
  const financeFile = path.join(GRANT_DATA_DIR, "01_Grant_Profile_and_Finance.csv");
  console.log(`Ingesting grant profile and finance: ${financeFile}`);
  if (fs.existsSync(financeFile)) {
    const content = fs.readFileSync(financeFile, "utf-8");
    const records = parse(content, { columns: true, skip_empty_lines: true });
    console.log(`Parsed ${records.length} grant finance rows`);

    const financeData = records.map((record: any) => ({
      grantId: record["grant_id"],
      donor: record["donor"],
      grantName: record["grant_name"],
      periodStart: record["period_start"],
      periodEnd: record["period_end"],
      coveredDistricts: record["covered_districts"],
      reportingMonth: record["reporting_month"],
      budgetLine: record["budget_line"],
      approvedBudgetUnits: parseInt(record["approved_budget_units"]) || 0,
      monthlyUtilizedUnits: parseInt(record["monthly_utilized_units"]) || 0,
      cumulativeUtilizedUnits: parseInt(record["cumulative_utilized_units"]) || 0,
      cumulativeUtilizationRate: parseFloat(record["cumulative_utilization_rate"]) || 0,
      financeNote: record["finance_note"] || ""
    }));

    for (let i = 0; i < financeData.length; i += 50) {
      const chunk = financeData.slice(i, i + 50);
      await prisma.$transaction(
        chunk.map(data => prisma.grantFinance.create({ data }))
      );
    }
  } else {
    throw new Error(`File not found: ${financeFile}`);
  }

  // 4. Ingest 02_Grant_Performance_and_Report_Material.csv
  const perfFile = path.join(GRANT_DATA_DIR, "02_Grant_Performance_and_Report_Material.csv");
  console.log(`Ingesting grant performance and report material: ${perfFile}`);
  if (fs.existsSync(perfFile)) {
    const content = fs.readFileSync(perfFile, "utf-8");
    const records = parse(content, { columns: true, skip_empty_lines: true });
    console.log(`Parsed ${records.length} grant performance rows`);

    const performanceData = records.map((record: any) => ({
      grantId: record["grant_id"],
      donor: record["donor"],
      grantName: record["grant_name"],
      reportingMonth: record["reporting_month"],
      periodEndDate: record["period_end_date"],
      reportDueDate: record["report_due_date"],
      reportStatus: record["report_status"] || "",
      coveredDistricts: record["covered_districts"] || "",
      sampledSchoolRecords: parseInt(record["sampled_school_records"]) || 0,
      schoolsCompletedPbl: parseInt(record["schools_completed_pbl"]) || 0,
      pblCompletionRate: parseFloat(record["pbl_completion_rate"]) || 0,
      schoolsWithEvidence: parseInt(record["schools_with_evidence"]) || 0,
      evidenceSubmissionRate: parseFloat(record["evidence_submission_rate"]) || 0,
      totalEnrollment: parseInt(record["total_enrollment"]) || 0,
      totalAttendance: parseInt(record["total_attendance"]) || 0,
      attendanceRate: parseFloat(record["attendance_rate"]) || 0,
      riskStatus: record["risk_status"] || "",
      milestoneSummary: record["milestone_summary"] || "",
      draftReportText: record["draft_report_text"] || ""
    }));

    for (const data of performanceData) {
      await prisma.grantPerformance.create({ data });
    }
  } else {
    throw new Error(`File not found: ${perfFile}`);
  }

  // 5. Ingest 03_Evidence_and_Media_Index.csv
  const mediaFile = path.join(GRANT_DATA_DIR, "03_Evidence_and_Media_Index.csv");
  console.log(`Ingesting media index: ${mediaFile}`);
  if (fs.existsSync(mediaFile)) {
    const content = fs.readFileSync(mediaFile, "utf-8");
    const records = parse(content, { columns: true, skip_empty_lines: true });
    console.log(`Parsed ${records.length} media items`);

    const mediaData = records.map((record: any) => ({
      recordId: record["record_id"],
      recordType: record["record_type"],
      grantId: record["grant_id"],
      donor: record["donor"],
      reportingMonth: record["reporting_month"],
      district: record["district"],
      title: record["title"],
      summaryOrCaption: record["summary_or_caption"],
      fileName: record["file_name"],
      relativePath: record["relative_path"],
      usageNote: record["usage_note"] || ""
    }));

    for (const data of mediaData) {
      await prisma.evidenceMedia.create({ data });
    }
  } else {
    throw new Error(`File not found: ${mediaFile}`);
  }

  console.log("Successfully ingested all data sources.");
}

main()
  .catch((err) => {
    console.error("Ingestion failed: ", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
