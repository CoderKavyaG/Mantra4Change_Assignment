import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { prisma } from "../src/lib/db";

const ROOT_DIR = path.resolve(__dirname, "..");
const WORKSPACE_DIR = path.resolve(ROOT_DIR, ".."); // c:\Users\Kavya\Downloads\Mantra4Change_PBL_AI_Prework_Candidate_Package

const PRIMARY_DATA_DIR = path.join(WORKSPACE_DIR, "02_Primary_PBL_Data", "csv_exports");
const GRANT_DATA_DIR = path.join(WORKSPACE_DIR, "03_Grant_Reporting_Evidence", "csv");

async function countCSVRows(filePath: string): Promise<number> {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf-8");
  const records = parse(content, { skip_empty_lines: true });
  return records.length - 1; // Subtract header row
}

async function main() {
  console.log("Starting DB Ingestion Verification...");

  // 1. Row count mappings
  const expectedSchoolCounts =
    (await countCSVRows(path.join(PRIMARY_DATA_DIR, "PBL_School_Response_Data_July_2025.csv"))) +
    (await countCSVRows(path.join(PRIMARY_DATA_DIR, "PBL_School_Response_Data_August_2025.csv"))) +
    (await countCSVRows(path.join(PRIMARY_DATA_DIR, "PBL_School_Response_Data_September_2025.csv")));

  const expectedFinanceCount = await countCSVRows(path.join(GRANT_DATA_DIR, "01_Grant_Profile_and_Finance.csv"));
  const expectedPerfCount = await countCSVRows(path.join(GRANT_DATA_DIR, "02_Grant_Performance_and_Report_Material.csv"));
  const expectedMediaCount = await countCSVRows(path.join(GRANT_DATA_DIR, "03_Evidence_and_Media_Index.csv"));

  // 2. Query actual db row counts
  const dbSchoolCount = await prisma.schoolResponse.count();
  const dbFinanceCount = await prisma.grantFinance.count();
  const dbPerfCount = await prisma.grantPerformance.count();
  const dbMediaCount = await prisma.evidenceMedia.count();

  console.log("\n=== Ingestion Summary ===");
  console.log(`School Responses - Expected (CSV): ${expectedSchoolCounts}, Actual (DB): ${dbSchoolCount}`);
  console.log(`Grant Finance    - Expected (CSV): ${expectedFinanceCount}, Actual (DB): ${dbFinanceCount}`);
  console.log(`Grant Perf       - Expected (CSV): ${expectedPerfCount}, Actual (DB): ${dbPerfCount}`);
  console.log(`Evidence Media   - Expected (CSV): ${expectedMediaCount}, Actual (DB): ${dbMediaCount}`);

  let hasErrors = false;

  // 3. Validation assertions
  if (dbSchoolCount !== expectedSchoolCounts) {
    console.error("Mismatch in School Responses row count!");
    hasErrors = true;
  }
  if (dbFinanceCount !== expectedFinanceCount) {
    console.error("Mismatch in Grant Finance row count!");
    hasErrors = true;
  }
  if (dbPerfCount !== expectedPerfCount) {
    console.error("Mismatch in Grant Performance row count!");
    hasErrors = true;
  }
  if (dbMediaCount !== expectedMediaCount) {
    console.error("Mismatch in Evidence Media row count!");
    hasErrors = true;
  }

  // 4. Data sanity assertions
  console.log("\n=== Performing Data Integrity Checks ===");
  
  // Verify enrollment calculation sum in database
  const sampleResponses = await prisma.schoolResponse.findMany({ take: 100 });
  for (const row of sampleResponses) {
    const calculatedSum = row.class6Enrollment + row.class7Enrollment + row.class8Enrollment;
    if (calculatedSum !== row.derivedTotalEnrollment) {
      console.error(`Enrollment sum mismatch at school ${row.schoolName}: ${calculatedSum} vs ${row.derivedTotalEnrollment}`);
      hasErrors = true;
    }
  }

  // Verify there are no critical fields containing NaN equivalent values or default -1 placeholders
  const sampleFinance = await prisma.grantFinance.findFirst({
    where: {
      OR: [
        { approvedBudgetUnits: { lt: 0 } },
        { monthlyUtilizedUnits: { lt: 0 } }
      ]
    }
  });
  if (sampleFinance) {
    console.error("Found negative units or values in grant finance!");
    hasErrors = true;
  }

  if (hasErrors) {
    console.log("\n❌ Verification Failed with Errors.");
    process.exit(1);
  } else {
    console.log("\n✅ Verification Successful: All checks passed.");
  }
}

main()
  .catch((err) => {
    console.error("Verification script execution failed: ", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
