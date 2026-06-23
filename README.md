# PBL Program Intelligence & Grant Reporting Dashboard

A full-stack Next.js application for project-based learning (PBL) analytics, deterministic risk monitoring, and grant reporting.

---

## Setup Instructions

### 1. Clone & Position
Clone this repository to your local workspace:
```bash
git clone <repository-url>
cd pbl-program-intelligence
```

### 2. Install Dependencies
Install all package requirements using `npm`:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (or `.env.local` for local development):
```env
DATABASE_URL="postgresql://username:password@hostname-pooler.region.neon.tech/neondb?sslmode=require"
AI_ENABLED="false"
GEMINI_API_KEY="your-api-key-here"
```

### 4. Database Setup & Ingestion
Synchronize the database schema with Neon PostgreSQL, run the seeding script, and verify integrity:
```bash
# Push schema structure to Neon Postgres
npx prisma db push

# Run CSV data ingestion and seeding
npx tsx scripts/ingest.ts

# Verify school rows, finance, performance, and media records count
npx tsx scripts/verify.ts
```

### 5. Run Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to view the application.

---

## Architecture Overview

This application separates data persistence, calculation layers, API endpoints, and client render cycles:

1. **Database Layer (Neon PostgreSQL + Prisma):** Stores raw transactions and media indexes hosted in the cloud.
2. **Deterministic Core Logic:** All rates, aggregation maps, and risk rules are isolated in `calculations.ts` and `risk-engine.ts`.
3. **API Controllers:** Next.js API routes (`/api/analytics`, `/api/filters`, `/api/grants/analytics`) run math summaries server-side.
4. **Client Interface:** Client-side React components render dashboards, multi-select selectors, top lists, and report previews.

---

## Data Model Header Mappings

The tables ingest data from raw CSV exports according to the following header mappings:

### 1. `SchoolResponse` Table
| Prisma Field Name | Raw CSV Header Name |
| :--- | :--- |
| `reportingMonth` | `Reporting Month` |
| `timestamp` | `Timestamp` |
| `schoolName` | `What is the name of your school?` |
| `schoolCode` | `What is your school's synthetic school code?` |
| `district` | `What is the name of your district?` |
| `block` | `Block Details` |
| `conducted` | `Was the PBL project conducted...` (Yes=true, No=false) |
| `evidenceSubmitted` | `Was evidence submitted...` (Yes=true, No=false) |
| `classes` | `In which class/classes did you conduct...` |
| `subject` | `Which subject do you teach?` |
| `class6Enrollment` | `Total number of students enrolled in Class 6...` |
| `class6ScienceAttendance`| `Average student attendance ... PBL Science session...` |
| `class6MathAttendance` | `Average student attendance ... PBL Math session...` |
| `derivedTotalEnrollment` | `Derived: Total enrollment across Classes 6-8` |
| `derivedTotalAttendance` | `Derived: Total attendance across PBL Science/Math` |
| `derivedOverallAttendanceRate` | `Derived: Overall PBL attendance rate` |
| `derivedRiskStatus` | `Derived: Risk status` |

### 2. `GrantFinance` Table
| Prisma Field Name | Raw CSV Header Name |
| :--- | :--- |
| `grantId` | `grant_id` |
| `donor` | `donor` |
| `grantName` | `grant_name` |
| `reportingMonth` | `reporting_month` |
| `budgetLine` | `budget_line` |
| `approvedBudgetUnits` | `approved_budget_units` |
| `monthlyUtilizedUnits` | `monthly_utilized_units` |
| `cumulativeUtilizedUnits`| `cumulative_utilized_units` |
| `cumulativeUtilizationRate`| `cumulative_utilization_rate` |

### 3. `GrantPerformance` Table
| Prisma Field Name | Raw CSV Header Name |
| :--- | :--- |
| `grantId` | `grant_id` |
| `pblCompletionRate` | `pbl_completion_rate` |
| `evidenceSubmissionRate` | `evidence_submission_rate` |
| `attendanceRate` | `attendance_rate` |
| `riskStatus` | `risk_status` |
| `milestoneSummary` | `milestone_summary` |
| `draftReportText` | `draft_report_text` |

### 4. `EvidenceMedia` Table
| Prisma Field Name | Raw CSV Header Name |
| :--- | :--- |
| `recordId` | `record_id` |
| `recordType` | `record_type` |
| `title` | `title` |
| `summaryOrCaption` | `summary_or_caption` |
| `relativePath` | `relative_path` (maps to `/public/images/`) |

---

## Calculations & Risk Logic

### Overall PBL Attendance Rate Formula
To reconcile enrollment logs (unique counts of students) with attendance logs (representing two sessions, Math and Science, per student), the overall attendance rate uses:
$$\text{Attendance Rate} = \frac{\sum \text{Derived Attendance}}{\sum \text{Derived Enrollment} \times 2} \times 100$$

### Risk Status Thresholds
Assessed program risks use these rate thresholds:
- **On Track:** Rate $\ge 75\%$
- **Behind:** Rate $\ge 60\%$ and $< 75\%$
- **At Risk:** Rate $\ge 35\%$ and $< 60\%$
- **Critical:** Rate $< 35\%$

---

## AI Narrative Generation Workflow

The narrative text drafting is controlled by the `AI_ENABLED` flag:

```
                  [AI_ENABLED Toggle]
                         /  \
             "true"     /    \    "false"
                       /      \
            (Gemini API)      (Rule-Based template)
                  |                     |
          Only Facts Passed     Interpolates facts
                  |                     |
            Report Output         Report Output
```

1. **Rule-Based Mock Narrative (`AI_ENABLED="false"`):** 
   Interpolates metric figures into a deterministic string matching the tone of raw database reports. Fast, free, and robust.
2. **AI-Powered Summary (`AI_ENABLED="true"`):** 
   Makes an HTTP request to Gemini models using `GEMINI_API_KEY`. It takes ONLY the structured facts object, preventing any DB read calls or hallucinations. Automatically falls back to the template if API calls fail.

---

## Known Limitations

- **Local Assets:** Media files must be copied manually to `public/images/` to prevent broken image references on the web client.
- **Database Connection Caps:** Free-tier Neon Postgres instances have connection caps that require connection pooling configurations under heavy concurrency.
- **Dynamic Active Styling:** Active navigation tags in `/layout.tsx` do not dynamically highlight links based on router paths.

---

## Future Improvements

1. **Automated Visual Regression Tests:** Add Playwright tests to visually check KPI cards, filter actions, and chart metrics across different viewport sizes.
2. **Role-Based Access Control (RBAC):** Enable user login and JWT auth to restrict donor visibility to authorized grants and districts only.
3. **Caching and Pagination:** Implement Redis or React-Query caching for district metrics and add pagination to scale response grids.
