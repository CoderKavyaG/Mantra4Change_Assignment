"use client";

import { useState, useEffect, useMemo, useRef } from "react";

interface KPIData {
  totalSchools: number;
  participatingSchools: number;
  participationRate: number;
  schoolsWithEvidence: number;
  evidenceRate: number;
  totalEnrollment: number;
  totalAttendance: number;
  attendanceRate: number;
  participationRateDelta: number | null;
  attendanceRateDelta: number | null;
}

interface GeogAggregation {
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

interface FilterOptions {
  months: string[];
  districts: string[];
  districtBlocks: Record<string, string[]>;
  subjects: string[];
  classes: string[];
}

export default function Dashboard() {
  // Loading & Error States
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter Options from DB
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    months: [],
    districts: [],
    districtBlocks: {},
    subjects: [],
    classes: [],
  });

  // Selected Filters
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Popover Visibility States
  const [districtsOpen, setDistrictsOpen] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(false);

  // Popover Refs for Click-Outside closing
  const districtRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  // Analytics Data from API
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [districtData, setDistrictData] = useState<GeogAggregation[]>([]);
  const [blockData, setBlockData] = useState<GeogAggregation[]>([]);
  const [topBlocks, setTopBlocks] = useState<GeogAggregation[]>([]);
  const [bottomBlocks, setBottomBlocks] = useState<GeogAggregation[]>([]);
  const [topDistricts, setTopDistricts] = useState<GeogAggregation[]>([]);
  const [bottomDistricts, setBottomDistricts] = useState<GeogAggregation[]>([]);

  // UI state for sort and search
  const [activeTab, setActiveTab] = useState<"district" | "block">("district");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch filters on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        setFiltersLoading(true);
        const res = await fetch("/api/filters");
        if (!res.ok) throw new Error("Failed to load filter options from database.");
        const data = (await res.json()) as FilterOptions;
        setFilterOptions(data);
        
        // Default to latest month
        if (data.months && data.months.length > 0) {
          setSelectedMonth(data.months[data.months.length - 1]);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred while loading filters.");
      } finally {
        setFiltersLoading(false);
      }
    }
    loadFilters();
  }, []);

  // Fetch analytics whenever filters change
  useEffect(() => {
    if (!selectedMonth) return;

    async function loadAnalytics() {
      try {
        setAnalyticsLoading(true);
        
        const params = new URLSearchParams();
        params.append("month", selectedMonth);
        
        if (selectedDistricts.length > 0) {
          params.append("districts", selectedDistricts.join(","));
        }
        if (selectedBlocks.length > 0) {
          params.append("blocks", selectedBlocks.join(","));
        }
        if (selectedGrades.length > 0) {
          params.append("grades", selectedGrades.join(","));
        }
        if (selectedSubjects.length > 0) {
          params.append("subjects", selectedSubjects.join(","));
        }

        const res = await fetch(`/api/analytics?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to compute analytics.");
        const data = await res.json();
        
        setKpis(data.kpis);
        setDistrictData(data.districtAggregations);
        setBlockData(data.blockAggregations);
        setTopBlocks(data.topBlocks);
        setBottomBlocks(data.bottomBlocks);
        setTopDistricts(data.topDistricts);
        setBottomDistricts(data.bottomDistricts);
      } catch (err: any) {
        setError(err.message || "An error occurred while loading analytics.");
      } finally {
        setAnalyticsLoading(false);
      }
    }

    loadAnalytics();
  }, [selectedMonth, selectedDistricts, selectedBlocks, selectedGrades, selectedSubjects]);

  // Click outside listener for popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (districtRef.current && !districtRef.current.contains(event.target as Node)) {
        setDistrictsOpen(false);
      }
      if (blockRef.current && !blockRef.current.contains(event.target as Node)) {
        setBlocksOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter available blocks based on selected districts
  const availableBlocks = useMemo(() => {
    if (selectedDistricts.length === 0) {
      // Merge all blocks
      return Object.values(filterOptions.districtBlocks).flat().sort();
    }
    // Only return blocks from selected districts
    const blocks: string[] = [];
    selectedDistricts.forEach((dist) => {
      if (filterOptions.districtBlocks[dist]) {
        blocks.push(...filterOptions.districtBlocks[dist]);
      }
    });
    return Array.from(new Set(blocks)).sort();
  }, [selectedDistricts, filterOptions.districtBlocks]);

  // Handle District Checkbox Toggle
  const toggleDistrict = (district: string) => {
    setSelectedDistricts((prev) => {
      const next = prev.includes(district) ? prev.filter((d) => d !== district) : [...prev, district];
      // Reset selected blocks that are no longer valid
      setSelectedBlocks((prevBlocks) => {
        if (next.length === 0) return prevBlocks;
        const validBlocks = new Set<string>();
        next.forEach((d) => {
          if (filterOptions.districtBlocks[d]) {
            filterOptions.districtBlocks[d].forEach((b) => validBlocks.add(b));
          }
        });
        return prevBlocks.filter((b) => validBlocks.has(b));
      });
      return next;
    });
  };

  // Handle Block Checkbox Toggle
  const toggleBlock = (block: string) => {
    setSelectedBlocks((prev) =>
      prev.includes(block) ? prev.filter((b) => b !== block) : [...prev, block]
    );
  };

  // Handle Grade Selection
  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  // Handle Subject Selection
  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedDistricts([]);
    setSelectedBlocks([]);
    setSelectedGrades([]);
    setSelectedSubjects([]);
    if (filterOptions.months.length > 0) {
      setSelectedMonth(filterOptions.months[filterOptions.months.length - 1]);
    }
  };

  // Sorting & Filtering for main Table
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // Default to desc for metrics
    }
  };

  const sortedAndFilteredTableData = useMemo(() => {
    const data = activeTab === "district" ? districtData : blockData;
    
    // 1. Apply local Search Filter
    let filtered = data;
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      filtered = data.filter((item) => item.name.toLowerCase().includes(q));
    }

    // 2. Sort data
    if (!sortBy) return filtered;

    return [...filtered].sort((a, b) => {
      let valA: any = a[sortBy as keyof GeogAggregation];
      let valB: any = b[sortBy as keyof GeogAggregation];

      if (sortBy === "riskStatus") {
        const riskOrder = { "On Track": 4, "Behind": 3, "At Risk": 2, "Critical": 1 };
        valA = riskOrder[valA as keyof typeof riskOrder] || 0;
        valB = riskOrder[valB as keyof typeof riskOrder] || 0;
      }

      if (typeof valA === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });
  }, [activeTab, districtData, blockData, searchTerm, sortBy, sortOrder]);

  // Risk Badge helper
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

  // Render month string format helper (e.g. 2025-09 -> September 2025)
  const formatMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, m] = monthStr.split("-");
    const monthsNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const index = parseInt(m, 10) - 1;
    return `${monthsNames[index]} ${year}`;
  };

  if (filtersLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <span>Loading dashboard filters...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <header className="header-section">
        <h1>PBL Program Intelligence Dashboard</h1>
        <p>Real-time project-based learning analytics, attendance tracking, and school risk assessment.</p>
      </header>

      {/* Filters Panel */}
      <section className="filters-panel">
        <div className="filters-header">
          <span className="filters-title">Program Filters</span>
          <button className="clear-btn" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>

        <div className="filters-grid">
          {/* Month Filter */}
          <div className="filter-group">
            <label className="filter-label">Reporting Month</label>
            <select
              className="select-control"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {filterOptions.months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter (Multi-select popover) */}
          <div className="filter-group" ref={districtRef}>
            <label className="filter-label">District</label>
            <div className="multi-select-container">
              <button
                type="button"
                className="select-control"
                style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => setDistrictsOpen(!districtsOpen)}
              >
                <span>
                  {selectedDistricts.length === 0
                    ? "All Districts"
                    : `${selectedDistricts.length} Selected`}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {districtsOpen && (
                <div className="popover">
                  <div
                    className="popover-item"
                    style={{ borderBottom: "1px solid var(--border)", fontWeight: 600 }}
                    onClick={() => setSelectedDistricts([])}
                  >
                    Clear Selection
                  </div>
                  {filterOptions.districts.map((dist) => (
                    <label key={dist} className="popover-item">
                      <input
                        type="checkbox"
                        className="popover-checkbox"
                        checked={selectedDistricts.includes(dist)}
                        onChange={() => toggleDistrict(dist)}
                      />
                      <span>{dist}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Block Filter (Multi-select popover) */}
          <div className="filter-group" ref={blockRef}>
            <label className="filter-label">Block</label>
            <div className="multi-select-container">
              <button
                type="button"
                className="select-control"
                style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => setBlocksOpen(!blocksOpen)}
              >
                <span>
                  {selectedBlocks.length === 0
                    ? "All Blocks"
                    : `${selectedBlocks.length} Selected`}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {blocksOpen && (
                <div className="popover">
                  <div
                    className="popover-item"
                    style={{ borderBottom: "1px solid var(--border)", fontWeight: 600 }}
                    onClick={() => setSelectedBlocks([])}
                  >
                    Clear Selection
                  </div>
                  {availableBlocks.map((block) => (
                    <label key={block} className="popover-item">
                      <input
                        type="checkbox"
                        className="popover-checkbox"
                        checked={selectedBlocks.includes(block)}
                        onChange={() => toggleBlock(block)}
                      />
                      <span>{block}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grade Filter (Class 6, 7, 8 checkboxes) */}
          <div className="filter-group">
            <label className="filter-label">Grade</label>
            <div className="toggle-group">
              {["Class 6", "Class 7", "Class 8"].map((grade) => (
                <button
                  key={grade}
                  type="button"
                  className={`toggle-item ${selectedGrades.includes(grade) ? "active" : ""}`}
                  onClick={() => toggleGrade(grade)}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Filter (Science, Math) */}
          <div className="filter-group">
            <label className="filter-label">Subject</label>
            <div className="toggle-group">
              {["Science", "Math"].map((sub) => (
                <button
                  key={sub}
                  type="button"
                  className={`toggle-item ${selectedSubjects.includes(sub) ? "active" : ""}`}
                  onClick={() => toggleSubject(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      {analyticsLoading ? (
        <div className="loading-overlay" style={{ minHeight: "150px" }}>
          <div className="spinner"></div>
          <span>Loading analytics summary...</span>
        </div>
      ) : kpis ? (
        <>
          <section className="kpi-grid">
            {/* Total Schools */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total Schools</span>
              </div>
              <div className="kpi-value">{kpis.totalSchools}</div>
              <div className="kpi-footer">
                <span className="kpi-subtext">Total reporting in {formatMonth(selectedMonth)}</span>
              </div>
            </div>

            {/* Participating Schools */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Participating Schools</span>
              </div>
              <div className="kpi-value">{kpis.participatingSchools}</div>
              <div className="kpi-footer">
                <span className="kpi-subtext">Schools conducting PBL project</span>
              </div>
            </div>

            {/* Participation % */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Participation Rate</span>
                {kpis.participationRateDelta !== null && (
                  <span className={`delta-badge ${kpis.participationRateDelta >= 0 ? "delta-positive" : "delta-negative"}`}>
                    {kpis.participationRateDelta >= 0 ? "+" : ""}{kpis.participationRateDelta.toFixed(2)} pp
                  </span>
                )}
              </div>
              <div className="kpi-value">{kpis.participationRate.toFixed(2)}%</div>
              <div className="kpi-footer">
                <span className="kpi-subtext">Month-over-Month change</span>
              </div>
            </div>

            {/* Evidence Submission % */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Evidence Submission Rate</span>
              </div>
              <div className="kpi-value">{kpis.evidenceRate.toFixed(2)}%</div>
              <div className="kpi-footer">
                <span className="kpi-subtext">Schools uploading evidence</span>
              </div>
            </div>

            {/* Total Enrollment */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total Enrollment</span>
              </div>
              <div className="kpi-value">{kpis.totalEnrollment.toLocaleString()}</div>
              <div className="kpi-footer">
                <span className="kpi-subtext">Unique student enrollments</span>
              </div>
            </div>

            {/* Total Attendance */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total Attendance</span>
              </div>
              <div className="kpi-value">{kpis.totalAttendance.toLocaleString()}</div>
              <div className="kpi-footer">
                <span className="kpi-subtext">Combined attendance sessions</span>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Overall Attendance Rate</span>
                {kpis.attendanceRateDelta !== null && (
                  <span className={`delta-badge ${kpis.attendanceRateDelta >= 0 ? "delta-positive" : "delta-negative"}`}>
                    {kpis.attendanceRateDelta >= 0 ? "+" : ""}{kpis.attendanceRateDelta.toFixed(2)} pp
                  </span>
                )}
              </div>
              <div className="kpi-value">{kpis.attendanceRate.toFixed(2)}%</div>
              <div className="kpi-footer">
                <span className="kpi-subtext">Derived via verified formula</span>
              </div>
            </div>
          </section>

          {/* High/Low Performers Lists */}
          <section className="performers-grid">
            {/* High Performers */}
            <div className="performers-card">
              <h2 className="performers-title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#166534" }}>
                  <path d="M8 12L3 7L4.4 5.6L8 9.2L11.6 5.6L13 7L8 12Z" fill="currentColor" transform="rotate(180 8 8)"/>
                </svg>
                <span>High-Performing Geographies</span>
              </h2>
              <div className="performers-list">
                {activeTab === "district" ? (
                  topDistricts.length === 0 ? (
                    <span className="kpi-subtext">No geographies matched filters.</span>
                  ) : (
                    topDistricts.map((d) => (
                      <div key={d.name} className="performer-row">
                        <span className="performer-name">{d.name}</span>
                        <div className="performer-meta">
                          <span className="performer-val">{d.attendanceRate.toFixed(2)}%</span>
                          <span className={getRiskBadgeClass(d.riskStatus)}>{d.riskStatus}</span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  topBlocks.length === 0 ? (
                    <span className="kpi-subtext">No geographies matched filters.</span>
                  ) : (
                    topBlocks.map((b) => (
                      <div key={b.name} className="performer-row">
                        <span className="performer-name">{b.name}</span>
                        <div className="performer-meta">
                          <span className="performer-val">{b.attendanceRate.toFixed(2)}%</span>
                          <span className={getRiskBadgeClass(b.riskStatus)}>{b.riskStatus}</span>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            {/* Low Performers (Focus Geographies) */}
            <div className="performers-card">
              <h2 className="performers-title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#991b1b" }}>
                  <path d="M8 12L3 7L4.4 5.6L8 9.2L11.6 5.6L13 7L8 12Z" fill="currentColor"/>
                </svg>
                <span>Geographies Requiring Focus</span>
              </h2>
              <div className="performers-list">
                {activeTab === "district" ? (
                  bottomDistricts.length === 0 ? (
                    <span className="kpi-subtext">No geographies matched filters.</span>
                  ) : (
                    bottomDistricts.map((d) => (
                      <div key={d.name} className="performer-row">
                        <span className="performer-name">{d.name}</span>
                        <div className="performer-meta">
                          <span className="performer-val">{d.attendanceRate.toFixed(2)}%</span>
                          <span className={getRiskBadgeClass(d.riskStatus)}>{d.riskStatus}</span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  bottomBlocks.length === 0 ? (
                    <span className="kpi-subtext">No geographies matched filters.</span>
                  ) : (
                    bottomBlocks.map((b) => (
                      <div key={b.name} className="performer-row">
                        <span className="performer-name">{b.name}</span>
                        <div className="performer-meta">
                          <span className="performer-val">{b.attendanceRate.toFixed(2)}%</span>
                          <span className={getRiskBadgeClass(b.riskStatus)}>{b.riskStatus}</span>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </section>

          {/* Main Geographies Table */}
          <section className="table-panel">
            <div className="table-header">
              <div className="tab-group">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "district" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("district");
                    setSortBy("name");
                  }}
                >
                  Districts
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "block" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("block");
                    setSortBy("name");
                  }}
                >
                  Blocks
                </button>
              </div>

              <div className="table-actions">
                <input
                  type="search"
                  placeholder="Search geography..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("name")}>
                      {activeTab === "district" ? "District" : "Block"} Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th onClick={() => handleSort("totalSchools")}>
                      Total Schools {sortBy === "totalSchools" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th onClick={() => handleSort("participatingSchools")}>
                      Participating Schools {sortBy === "participatingSchools" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th onClick={() => handleSort("participationRate")}>
                      Participation Rate {sortBy === "participationRate" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th onClick={() => handleSort("evidenceRate")}>
                      Evidence Rate {sortBy === "evidenceRate" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th onClick={() => handleSort("attendanceRate")}>
                      Attendance Rate {sortBy === "attendanceRate" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th onClick={() => handleSort("riskStatus")}>
                      Risk Status {sortBy === "riskStatus" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredTableData.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--foreground-muted)", padding: "2rem" }}>
                        No records found matching search query.
                      </td>
                    </tr>
                  ) : (
                    sortedAndFilteredTableData.map((row) => (
                      <tr key={row.name}>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.totalSchools}</td>
                        <td>{row.participatingSchools}</td>
                        <td>{row.participationRate.toFixed(2)}%</td>
                        <td>{row.evidenceRate.toFixed(2)}%</td>
                        <td style={{ fontWeight: 600 }}>{row.attendanceRate.toFixed(2)}%</td>
                        <td>
                          <span className={getRiskBadgeClass(row.riskStatus)}>{row.riskStatus}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="loading-overlay" style={{ minHeight: "150px" }}>
          <span>No analytics data could be computed for the selected filters.</span>
        </div>
      )}

      {error && (
        <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "var(--risk-critical-bg)", color: "var(--risk-critical-text)", border: "1px solid var(--risk-critical-border)", borderRadius: "6px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
