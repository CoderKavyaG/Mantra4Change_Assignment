"use client";

import { useState, useEffect } from "react";

interface GrantFacts {
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

interface BudgetLine {
  id: number;
  budgetLine: string;
  approvedBudgetUnits: number;
  monthlyUtilizedUnits: number;
  cumulativeUtilizedUnits: number;
  cumulativeUtilizationRate: number;
  financeNote: string;
}

interface EvidenceItem {
  recordId: string;
  recordType: string;
  title: string;
  summaryOrCaption: string;
  relativePath: string;
  usageNote: string;
}

interface AnalyticsPayload {
  facts: GrantFacts;
  budgetLines: BudgetLine[];
  media: EvidenceItem[];
  narrative: string;
  aiGenerated: boolean;
  aiError: string | null;
}

export default function GrantAssistant() {
  const [grantId, setGrantId] = useState("GRANT_AA_2025");
  const [month, setMonth] = useState("2025-09");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadGrantAnalytics() {
      try {
        setLoading(true);
        setError(null);
        setCopied(false);
        const res = await fetch(`/api/grants/analytics?grantId=${grantId}&month=${month}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load grant reporting data.");
        }
        const payload = await res.json();
        setData(payload);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadGrantAnalytics();
  }, [grantId, month]);

  const handleCopy = () => {
    if (!data?.narrative) return;
    navigator.clipboard.writeText(data.narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskBadgeClass = (status: string) => {
    switch (status) {
      case "On Track":
        return "status-badge status-ontrack";
      case "Behind":
        return "status-badge status-behind";
      case "At Risk":
        return "status-badge status-atrisk";
      case "Critical":
        return "status-badge status-critical";
      default:
        return "status-badge";
    }
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, m] = monthStr.split("-");
    const monthsNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthsNames[parseInt(m, 10) - 1]} ${year}`;
  };

  const getGrantDisplayName = (id: string) => {
    switch (id) {
      case "GRANT_AA_2025":
        return "Learning Support Grant AA";
      case "GRANT_BB_2025":
        return "Learning Support Grant BB";
      case "GRANT_CC_2025":
        return "Learning Support Grant CC";
      default:
        return id;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="header-section">
        <h1>Grant Reporting Assistant</h1>
        <p>Aggregate performance metrics, verify budget lines, review submitted media evidence, and draft narrative report summaries.</p>
      </header>

      {/* Selectors Panel */}
      <section className="filters-panel">
        <div className="filters-header">
          <span className="filters-title">Grant Selection</span>
        </div>
        <div className="filters-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="filter-group">
            <label className="filter-label">Target Grant ID</label>
            <select
              className="select-control"
              value={grantId}
              onChange={(e) => setGrantId(e.target.value)}
            >
              <option value="GRANT_AA_2025">Learning Support Grant AA</option>
              <option value="GRANT_BB_2025">Learning Support Grant BB</option>
              <option value="GRANT_CC_2025">Learning Support Grant CC</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Reporting Month</label>
            <select
              className="select-control"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="2025-07">July 2025</option>
              <option value="2025-08">August 2025</option>
              <option value="2025-09">September 2025</option>
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <span>Loading grant report analytics...</span>
        </div>
      ) : error ? (
        <div style={{ padding: "1.25rem", backgroundColor: "var(--risk-critical-bg)", color: "var(--risk-critical-text)", border: "1px solid var(--risk-critical-border)", borderRadius: "6px" }}>
          <strong>Error:</strong> {error}
        </div>
      ) : data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Fact Panel */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>1. Performance Facts Summary</h2>
            </div>
            
            {/* KPI Row */}
            <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="kpi-card">
                <span className="kpi-title">PBL Completion Rate</span>
                <div className="kpi-value">{data.facts.pblCompletionRate.toFixed(1)}%</div>
                <span className="kpi-subtext" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Schools conducting projects</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-title">Evidence Submission Rate</span>
                <div className="kpi-value">{data.facts.evidenceSubmissionRate.toFixed(1)}%</div>
                <span className="kpi-subtext" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Schools submitting evidence</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-title">PBL Attendance Rate</span>
                <div className="kpi-value">{data.facts.attendanceRate.toFixed(1)}%</div>
                <span className="kpi-subtext" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Verified overall attendance</span>
              </div>
              <div className="kpi-card" style={{ justifyContent: "center" }}>
                <span className="kpi-title">Geographic Risk Status</span>
                <div style={{ marginTop: "0.5rem" }}>
                  <span className={getRiskBadgeClass(data.facts.riskStatus)} style={{ fontSize: "1rem", padding: "0.375rem 0.75rem" }}>
                    {data.facts.riskStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Milestones Card */}
            <div className="kpi-card" style={{ width: "100%", padding: "1.25rem" }}>
              <span className="kpi-title" style={{ display: "block", marginBottom: "0.5rem" }}>Key Monthly Milestone Summary</span>
              <p style={{ fontSize: "0.9rem", color: "var(--foreground)", lineHeight: 1.6 }}>
                {data.facts.milestoneSummary}
              </p>
            </div>

            {/* Budget Utilization Panel */}
            <div style={{ marginTop: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--foreground-muted)" }}>Budget Utilization</h3>
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "1rem" }}>
                <div className="kpi-card">
                  <span className="kpi-title">Approved Budget Units</span>
                  <div className="kpi-value" style={{ fontSize: "1.5rem" }}>{data.facts.approvedBudgetUnits.toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Monthly Utilized Units</span>
                  <div className="kpi-value" style={{ fontSize: "1.5rem" }}>{data.facts.monthlyUtilizedUnits.toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Cumulative Utilized Units</span>
                  <div className="kpi-value" style={{ fontSize: "1.5rem" }}>{data.facts.cumulativeUtilizedUnits.toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Cumulative Utilization %</span>
                  <div className="kpi-value" style={{ fontSize: "1.5rem" }}>
                    {data.facts.cumulativeUtilizationRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Finance breakdown table */}
              <div className="table-panel">
                <div className="table-header" style={{ padding: "0.75rem 1.25rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Budget Line Item Details</span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Budget Line Item</th>
                        <th>Approved Units</th>
                        <th>Monthly Utilized</th>
                        <th>Cumulative Utilized</th>
                        <th>Cumulative Rate</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.budgetLines.map((line) => (
                        <tr key={line.id}>
                          <td style={{ fontWeight: 600 }}>{line.budgetLine}</td>
                          <td>{line.approvedBudgetUnits.toLocaleString()}</td>
                          <td>{line.monthlyUtilizedUnits.toLocaleString()}</td>
                          <td>{line.cumulativeUtilizedUnits.toLocaleString()}</td>
                          <td>{(line.cumulativeUtilizationRate * 100).toFixed(1)}%</td>
                          <td style={{ color: "var(--foreground-muted)", fontSize: "0.825rem", whiteSpace: "normal" }}>
                            {line.financeNote}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Evidence Panel */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>2. Evidence Media Panel</h2>
            </div>
            {data.media.length === 0 ? (
              <div style={{ padding: "2rem", border: "1px dashed var(--border)", borderRadius: "8px", textAlign: "center", backgroundColor: "var(--surface)" }}>
                <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem" }}>No evidence photographs or media records uploaded for this reporting period.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                {data.media.map((item) => (
                  <div key={item.recordId} className="kpi-card" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ position: "relative", width: "100%", height: "200px", borderRadius: "6px", overflow: "hidden", backgroundColor: "#f1f5f9", display: "flex", justifyContent: "center", alignItems: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/${item.relativePath}`}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div style={{ padding: "0.25rem" }}>
                      <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.25rem" }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", lineHeight: 1.4 }}>
                        {item.summaryOrCaption}
                      </p>
                      {item.usageNote && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "var(--accent)", borderTop: "1px dashed var(--border)", paddingTop: "0.5rem" }}>
                          <strong>Note:</strong> {item.usageNote}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Report Draft Section */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>3. Narrative Summary Draft</h2>
            </div>
            <div className="kpi-card" style={{ width: "100%", gap: "1rem", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <span className={`status-badge ${data.aiGenerated ? "status-ontrack" : "status-behind"}`} style={{ fontSize: "0.75rem" }}>
                  {data.aiGenerated ? "AI-Powered LLM Report" : "Rule-Based Mock Narrative"}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="toggle-item active"
                  style={{ border: "none", padding: "0.375rem 0.75rem", fontSize: "0.8rem" }}
                >
                  {copied ? "Copied!" : "Copy Report Text"}
                </button>
              </div>

              <div style={{ padding: "1rem", backgroundColor: "var(--background)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.95rem", color: "var(--foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {data.narrative}
                </p>
              </div>

              {data.aiError && (
                <div style={{ fontSize: "0.75rem", color: "var(--risk-critical-text)", backgroundColor: "var(--risk-critical-bg)", padding: "0.5rem", borderRadius: "4px" }}>
                  <strong>AI Generation Warning:</strong> {data.aiError}. Using rule-based fallback instead.
                </div>
              )}
            </div>
          </section>

        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <span>No reporting details loaded.</span>
        </div>
      )}
    </div>
  );
}
