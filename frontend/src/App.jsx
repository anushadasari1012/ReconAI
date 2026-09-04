import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://reconai-4kr7.onrender.com";

function App() {
  // =========================
  // AUTHENTICATION
  // =========================

  const [token, setToken] = useState(
    localStorage.getItem("reconai_token")
  );

  const [user, setUser] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // =========================
  // DASHBOARD DATA
  // =========================

  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [reconciliation, setReconciliation] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  // =========================
  // EXCEPTION INVESTIGATION
  // =========================

  const [selectedException, setSelectedException] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // =========================
  // EXCEPTION FILTERS
  // =========================

  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [decisionFilter, setDecisionFilter] = useState("ALL");

  // =========================
  // RECONCILIATION FILTERS
  // =========================

  const [reconSearch, setReconSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // =========================
  // LOGIN
  // =========================

  async function handleLogin(e) {
    e.preventDefault();

    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Invalid username or password"
        );
      }

      if (!data.access_token) {
        throw new Error(
          "Login succeeded but no token was received."
        );
      }

      localStorage.setItem(
        "reconai_token",
        data.access_token
      );

      setToken(data.access_token);

      setUsername("");
      setPassword("");
    } catch (err) {
      console.error("Login error:", err);

      setLoginError(
        err.message || "Login failed. Please try again."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // =========================
  // LOGOUT
  // =========================

  function handleLogout() {
    localStorage.removeItem("reconai_token");

    setToken(null);
    setUser(null);

    setSummary(null);
    setAnalytics(null);
    setExceptions([]);
    setReconciliation([]);
    setHealth(null);

    setSelectedException(null);
    setDetails(null);

    setError("");
    setLoginError("");
  }

  // =========================
  // AUTHENTICATED FETCH
  // =========================

  async function authenticatedFetch(url, options = {}) {
    const currentToken =
      localStorage.getItem("reconai_token");

    if (!currentToken) {
      handleLogout();
      throw new Error("You are not authenticated.");
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${currentToken}`,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      handleLogout();
      throw new Error("Your session has expired.");
    }

    return response;
  }

  // =========================
  // VERIFY USER
  // =========================

  useEffect(() => {
    async function verifyUser() {
      if (!token) {
        return;
      }

      try {
        const response = await authenticatedFetch(
          `${API_URL}/me`
        );

        if (!response.ok) {
          throw new Error("Authentication failed.");
        }

        const data = await response.json();

        if (!data.user) {
          throw new Error(
            "User information was not returned."
          );
        }

        setUser(data.user);
      } catch (err) {
        console.error(
          "User verification error:",
          err
        );

        localStorage.removeItem("reconai_token");

        setToken(null);
        setUser(null);
      }
    }

    verifyUser();
  }, [token]);

  // =========================
  // LOAD DASHBOARD DATA
  // =========================

  useEffect(() => {
    async function loadData() {
      if (!token || !user) {
        return;
      }

      try {
        setError("");

        const healthPromise = fetch(
          `${API_URL}/health`
        );

        const summaryPromise = authenticatedFetch(
          `${API_URL}/summary`
        );

        const exceptionsPromise = authenticatedFetch(
          `${API_URL}/exceptions`
        );

        const reconciliationPromise = authenticatedFetch(
          `${API_URL}/reconcile`
        );

        const [
          healthResponse,
          summaryResponse,
          exceptionsResponse,
          reconciliationResponse,
        ] = await Promise.all([
          healthPromise,
          summaryPromise,
          exceptionsPromise,
          reconciliationPromise,
        ]);

        // -------------------------
        // HEALTH
        // -------------------------

        if (!healthResponse.ok) {
          throw new Error(
            "Health service is unavailable."
          );
        }

        // -------------------------
        // SUMMARY
        // -------------------------

        if (!summaryResponse.ok) {
          throw new Error(
            "Summary service is unavailable."
          );
        }

        // -------------------------
        // EXCEPTIONS
        // -------------------------

        if (!exceptionsResponse.ok) {
          throw new Error(
            "Exceptions service is unavailable."
          );
        }

        // -------------------------
        // RECONCILIATION
        // -------------------------

        if (!reconciliationResponse.ok) {
          throw new Error(
            "Reconciliation service is unavailable."
          );
        }

        const healthData =
          await healthResponse.json();

        const summaryData =
          await summaryResponse.json();

        const exceptionsData =
          await exceptionsResponse.json();

        const reconciliationData =
          await reconciliationResponse.json();

        setHealth(healthData);
        setSummary(summaryData);

        setExceptions(
          Array.isArray(exceptionsData)
            ? exceptionsData
            : []
        );

        setReconciliation(
          reconciliationData.results || []
        );

        // =========================
        // ADMIN ANALYTICS
        // =========================

        if (user.role === "ADMIN") {
          try {
            const analyticsResponse =
              await authenticatedFetch(
                `${API_URL}/analytics`
              );

            if (analyticsResponse.ok) {
              const analyticsData =
                await analyticsResponse.json();

              setAnalytics(analyticsData);
            }
          } catch (analyticsError) {
            console.error(
              "Analytics loading error:",
              analyticsError
            );
          }
        } else {
          setAnalytics(null);
        }
      } catch (err) {
        console.error(
          "Dashboard loading error:",
          err
        );

        setError(
          err.message ||
            "We couldn't reach the server. Please try again."
        );
      }
    }

    loadData();
  }, [token, user]);

  // =========================
  // VIEW EXCEPTION DETAILS
  // =========================

  async function viewDetails(paymentId) {
    try {
      setDetailsLoading(true);
      setSelectedException(paymentId);
      setDetails(null);

      const response =
        await authenticatedFetch(
          `${API_URL}/analyze/${paymentId}`
        );

      if (!response.ok) {
        let message =
          "Could not load payment details.";

        try {
          const errorData =
            await response.json();

          message =
            errorData.detail ||
            errorData.error ||
            message;
        } catch {
          // Ignore JSON parsing error
        }

        throw new Error(message);
      }

      const data = await response.json();

      setDetails(data);

      setTimeout(() => {
        document
          .getElementById("investigation")
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 100);
    } catch (err) {
      console.error(
        "Exception investigation error:",
        err
      );

      alert(
        err.message ||
          "Could not load payment details."
      );

      setSelectedException(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  // =========================
  // CLOSE DETAILS
  // =========================

  function closeDetails() {
    setDetails(null);
    setSelectedException(null);
  }

  // =========================
  // FILTER EXCEPTIONS
  // =========================

  const filteredExceptions =
    exceptions.filter((exception) => {
      const paymentId = String(
        exception.payment_id || ""
      ).toLowerCase();

      const risk = String(
        exception.risk_level || ""
      ).toUpperCase();

      const decision = String(
        exception.decision || ""
      ).toUpperCase();

      const matchesSearch =
        paymentId.includes(
          searchTerm.toLowerCase()
        );

      const matchesRisk =
        riskFilter === "ALL" ||
        risk === riskFilter;

      const matchesDecision =
        decisionFilter === "ALL" ||
        decision === decisionFilter;

      return (
        matchesSearch &&
        matchesRisk &&
        matchesDecision
      );
    });

  // =========================
  // FILTER RECONCILIATION
  // =========================

  const filteredReconciliation =
    reconciliation.filter(
      (transaction) => {
        const paymentId = String(
          transaction.payment_id || ""
        ).toLowerCase();

        const status = String(
          transaction.status || ""
        ).toUpperCase();

        const matchesSearch =
          paymentId.includes(
            reconSearch.toLowerCase()
          );

        const matchesStatus =
          statusFilter === "ALL" ||
          status === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  // =========================
  // RESET FILTERS
  // =========================

  function resetFilters() {
    setSearchTerm("");
    setRiskFilter("ALL");
    setDecisionFilter("ALL");
  }

  function resetReconFilters() {
    setReconSearch("");
    setStatusFilter("ALL");
  }

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!token) {
    return (
      <div className="login-page">

        {/* Background Decorations */}
        <div className="login-decoration decoration-1"></div>
        <div className="login-decoration decoration-2"></div>
        <div className="login-decoration decoration-3"></div>

        <div className="login-card">

          {/* BRAND */}
          <div className="login-brand">

            <div className="recon-logo">
              R
            </div>

            <div>
              <h1>ReconAI</h1>

              <p>
                Payment Reconciliation System
              </p>
            </div>

          </div>

          {/* LOGIN FORM */}
          <form
            onSubmit={handleLogin}
            className="login-form"
          >

            {/* Username */}
            <div className="input-group">

              <label>
                Username
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  👤
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />

              </div>

            </div>

            {/* Password */}
            <div className="input-group">

              <label>
                Password
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />

              </div>

            </div>

            {/* Error */}
            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="login-button"
              disabled={loginLoading}
            >
              {loginLoading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          {/* SECURITY */}
          <div className="security-section">

            <div className="security-line">

              <span></span>

              <div>
                🛡️ Secure Login
              </div>

              <span></span>

            </div>

            <div className="security-items">

              <div>
                <span>🛡️</span>
                <p>Secure</p>
              </div>

              <div>
                <span>✓</span>
                <p>Reliable</p>
              </div>

              <div>
                <span>🧠</span>
                <p>Intelligent</p>
              </div>

            </div>

          </div>

        

          {/* FOOTER */}
          <div className="login-footer">
            ReconAI © 2026 All rights reserved.
          </div>

        </div>

      </div>
    );
  }

  // =========================
  // WAIT FOR USER VERIFICATION
  // =========================

  if (!user) {
    return (
      <div className="loading-screen">
        <div className="loading">
          Authenticating...
        </div>
      </div>
    );
  }

  // =========================
  // ERROR SCREEN
  // =========================

  if (error) {
    return (
      <div className="error-container">

        <div className="error-box">

          <h2>
            Something went wrong
          </h2>

          <p>
            {error}
          </p>

          <button
            className="reset-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Retry
          </button>

          <button
            className="reset-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </div>
    );
  }

  // =========================
  // DASHBOARD
  // =========================

  return (
    <div className="dashboard">

      {/* =========================
          HEADER
          ========================= */}

      <header className="header">

        <div>
          <h1>
            ReconAI
          </h1>

          <p>
            Payment Reconciliation Dashboard
          </p>
        </div>

        <div className="header-right">

          <div className="user-info">

            <strong>
              {user.name || user.username}
            </strong>

            <span>
              {user.role}
            </span>

          </div>

          <div className="status">

            <span className="status-dot"></span>

            {health?.status ||
              "Connecting..."}

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* =========================
          FLOATING UP / DOWN BUTTONS
          ========================= */}

      <div className="scroll-buttons">

        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          title="Go to Top"
          aria-label="Go to Top"
        >
          ↑
        </button>

        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: document.documentElement
                .scrollHeight,
              behavior: "smooth",
            })
          }
          title="Go to Bottom"
          aria-label="Go to Bottom"
        >
          ↓
        </button>

      </div>

      <main>

        {/* =========================
            OVERVIEW
            ========================= */}

        <section
          id="overview"
          className="overview-section"
        >

          <h2>
            Overview
          </h2>

          {!summary ? (

            <div className="loading">
              Loading dashboard...
            </div>

          ) : (

            <>

              <div className="cards">

                <div className="card">
                  <p>
                    Total Transactions
                  </p>

                  <h3>
                    {summary.total_transactions ?? 0}
                  </h3>
                </div>

                <div className="card">
                  <p>
                    Matched
                  </p>

                  <h3>
                    {summary.matched ?? 0}
                  </h3>
                </div>

                <div className="card">
                  <p>
                    Exceptions
                  </p>

                  <h3>
                    {summary.exceptions ?? 0}
                  </h3>
                </div>

                <div className="card">
                  <p>
                    Match Rate
                  </p>

                  <h3>
                    {summary.match_rate ?? 0}%
                  </h3>
                </div>

              </div>

              <div className="summary">

                <h3
                >
                  Reconciliation Summary
                </h3>

                <div className="progress-container">

                  <div
                    className="progress"
                    style={{
                      width: `${Math.min(
                        Math.max(
                          Number(
                            summary.match_rate || 0
                          ),
                          0
                        ),
                        100
                      )}%`,
                    }}
                  ></div>

                </div>

                <p>
                  {summary.matched ?? 0} of{" "}
                  {summary.total_transactions ?? 0}{" "}
                  transactions matched successfully.
                </p>

              </div>

            </>

          )}

        </section>

        {/* =========================
            ADMIN ONLY: ANALYTICS
            ========================= */}

        {user.role === "ADMIN" && (
          <section
            id="analytics"
            className="analytics-section"
          >

            <h2>
              Analytics
            </h2>

            {!analytics ? (

              <div className="loading">
                Loading analytics...
              </div>

            ) : (

              <>

                <div className="analytics-cards">

                  <div className="analytics-card">
                    <span>
                      Batch Size
                    </span>

                    <strong>
                      {analytics.batch_size ?? 0}
                    </strong>
                  </div>

                  <div className="analytics-card">
                    <span>
                      Auto Resolved
                    </span>

                    <strong>
                      {analytics.auto_resolved ?? 0}
                    </strong>
                  </div>

                  <div className="analytics-card">
                    <span>
                      Manual Review
                    </span>

                    <strong>
                      {analytics.manual_review ?? 0}
                    </strong>
                  </div>

                  <div className="analytics-card">
                    <span>
                      Escalated
                    </span>

                    <strong>
                      {analytics.escalated ?? 0}
                    </strong>
                  </div>

                  <div className="analytics-card">
                    <span>
                      Unresolved
                    </span>

                    <strong>
                      {analytics.unresolved ?? 0}
                    </strong>
                  </div>

                </div>

                <div className="analytics-panel">

                  <h3>
                    Exception Breakdown
                  </h3>

                  {[
                    [
                      "Auto Resolved",
                      analytics.auto_resolved ?? 0,
                      "auto",
                    ],
                    [
                      "Manual Review",
                      analytics.manual_review ?? 0,
                      "manual",
                    ],
                    [
                      "Escalated",
                      analytics.escalated ?? 0,
                      "escalated",
                    ],
                    [
                      "Unresolved",
                      analytics.unresolved ?? 0,
                      "unresolved",
                    ],
                  ].map(
                    ([label, value, className]) => (

                      <div
                        className="bar-row"
                        key={label}
                      >

                        <div className="bar-label">

                          <span>
                            {label}
                          </span>

                          <strong>
                            {value}
                          </strong>

                        </div>

                        <div className="bar-container">

                          <div
                            className={`bar ${className}`}
                            style={{
                              width: `${
                                analytics.exceptions
                                  ? Math.min(
                                      (
                                        value /
                                        analytics.exceptions
                                      ) * 100,
                                      100
                                    )
                                  : 0
                              }%`,
                            }}
                          ></div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </>

            )}

          </section>
        )}

        {/* =========================
            ADMIN ONLY: REPORTS
            ========================= */}

        {user.role === "ADMIN" && (
          <section
            id="reports"
            className="reports-section"
          >

            <div className="section-heading">

              <div>

                <h2>
                  Reports
                </h2>

                <p>
                  Reconciliation performance summary
                </p>

              </div>

              <div className="exception-count">
                {summary?.total_transactions || 0}
                {" "}Transactions
              </div>

            </div>

            {!summary ? (

              <div className="loading">
                Loading reports...
              </div>

            ) : (

              <>

                <div className="analytics-cards">

                  <div className="analytics-card">

                    <span>
                      Total Transactions
                    </span>

                    <strong>
                      {summary.total_transactions}
                    </strong>

                  </div>

                  <div className="analytics-card">

                    <span>
                      Successfully Matched
                    </span>

                    <strong>
                      {summary.matched}
                    </strong>

                  </div>

                  <div className="analytics-card">

                    <span>
                      Exceptions
                    </span>

                    <strong>
                      {summary.exceptions}
                    </strong>

                  </div>

                  <div className="analytics-card">

                    <span>
                      Match Rate
                    </span>

                    <strong>
                      {summary.match_rate}%
                    </strong>

                  </div>

                </div>

                <div className="analytics-panel">

                  <h3>
                    Reconciliation Performance
                  </h3>

                  <div className="bar-row">

                    <div className="bar-label">

                      <span>
                        Matched Transactions
                      </span>

                      <strong>
                        {summary.matched}
                      </strong>

                    </div>

                    <div className="bar-container">

                      <div
                        className="bar auto"
                        style={{
                          width: `${
                            summary.total_transactions
                              ? (
                                  summary.matched /
                                  summary.total_transactions
                                ) * 100
                              : 0
                          }%`,
                        }}
                      ></div>

                    </div>

                  </div>

                  <div className="bar-row">

                    <div className="bar-label">

                      <span>
                        Exception Transactions
                      </span>

                      <strong>
                        {summary.exceptions}
                      </strong>

                    </div>

                    <div className="bar-container">

                      <div
                        className="bar escalated"
                        style={{
                          width: `${
                            summary.total_transactions
                              ? (
                                  summary.exceptions /
                                  summary.total_transactions
                                ) * 100
                              : 0
                          }%`,
                        }}
                      ></div>

                    </div>

                  </div>

                  <div className="report-summary-text">

                    <p>
                      <strong>
                        {summary.match_rate}%
                      </strong>{" "}
                      of transactions were
                      successfully reconciled.
                    </p>

                    <p>
                      <strong>
                        {summary.exceptions}
                      </strong>{" "}
                      transactions require further
                      investigation.
                    </p>

                  </div>

                </div>

              </>

            )}

          </section>
        )}

        {/* =========================
            RECONCILIATION
            ========================= */}

        <section
          id="reconciliation"
          className="reconciliation-section"
        >

          <div className="section-heading">

            <div>

              <h2>
                Reconciliation
              </h2>

              <p>
                Complete transaction reconciliation results
              </p>

            </div>

            <div className="exception-count">
              {reconciliation.length}
              {" "}Transactions
            </div>

          </div>

          <div className="exception-filters">

            <input
              type="text"
              placeholder="Search Payment ID..."
              value={reconSearch}
              onChange={(e) =>
                setReconSearch(e.target.value)
              }
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >

              <option value="ALL">
                All Status
              </option>

              <option value="MATCHED">
                Matched
              </option>

              <option value="EXCEPTION">
                Exception
              </option>

            </select>

            <button
              className="reset-button"
              onClick={resetReconFilters}
            >
              Reset
            </button>

          </div>

          <p className="filter-result">

            Showing{" "}

            <strong>
              {filteredReconciliation.length}
            </strong>{" "}

            of{" "}

            <strong>
              {reconciliation.length}
            </strong>{" "}

            transactions

          </p>

          {!reconciliation.length ? (

            <div className="loading">
              Loading reconciliation results...
            </div>

          ) : filteredReconciliation.length === 0 ? (

            <div className="loading">
              No transactions match your filters.
            </div>

          ) : (

            <div className="table-container">

              <table className="exceptions-table">

                <thead>

                  <tr>
                    <th>Payment ID</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Expected Amount</th>
                    <th>Settled Amount</th>
                    <th>Difference</th>
                    <th>Date Difference</th>
                    <th>Confidence</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredReconciliation.map(
                    (transaction, index) => (

                      <tr
                        key={`${transaction.payment_id}-${index}`}
                      >

                        <td className="payment-id">
                          {transaction.payment_id}
                        </td>

                        <td>

                          <span
                            className={`risk-badge ${
                              transaction.status ===
                              "MATCHED"
                                ? "low"
                                : "high"
                            }`}
                          >
                            {transaction.status}
                          </span>

                        </td>

                        <td>
                          {transaction.reason || "—"}
                        </td>

                        <td>
                          {transaction.expected_amount !==
                          undefined
                            ? `₹${transaction.expected_amount}`
                            : "—"}
                        </td>

                        <td>
                          {transaction.settled_amount !==
                            null &&
                          transaction.settled_amount !==
                            undefined
                            ? `₹${transaction.settled_amount}`
                            : "—"}
                        </td>

                        <td>
                          {transaction.difference !==
                            undefined &&
                          transaction.difference !==
                            null
                            ? `₹${transaction.difference}`
                            : "—"}
                        </td>

                        <td>
                          {transaction.date_difference_days !==
                            undefined &&
                          transaction.date_difference_days !==
                            null
                            ? `${transaction.date_difference_days} days`
                            : "—"}
                        </td>

                        <td>
                          {transaction.confidence !==
                            undefined &&
                          transaction.confidence !==
                            null
                            ? `${(
                                transaction.confidence *
                                100
                              ).toFixed(0)}%`
                            : "—"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* =========================
            EXCEPTIONS
            ========================= */}

        <section
          id="exceptions"
          className="exceptions-section"
        >

          <div className="section-heading">

            <div>

              <h2>
                Exceptions
              </h2>

              <p>
                Transactions requiring attention
              </p>

            </div>

            <div className="exception-count">
              {exceptions.length} Exceptions
            </div>

          </div>

          <div className="exception-filters">

            <input
              type="text"
              placeholder="Search Payment ID..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

            <select
              value={riskFilter}
              onChange={(e) =>
                setRiskFilter(e.target.value)
              }
            >

              <option value="ALL">
                All Risks
              </option>

              <option value="HIGH">
                High Risk
              </option>

              <option value="MEDIUM">
                Medium Risk
              </option>

              <option value="LOW">
                Low Risk
              </option>

            </select>

            <select
              value={decisionFilter}
              onChange={(e) =>
                setDecisionFilter(e.target.value)
              }
            >

              <option value="ALL">
                All Decisions
              </option>

              <option value="AUTO_RESOLVE">
                Auto Resolve
              </option>

              <option value="MANUAL_REVIEW">
                Manual Review
              </option>

              <option value="ESCALATE">
                Escalate
              </option>

            </select>

            <button
              className="reset-button"
              onClick={resetFilters}
            >
              Reset
            </button>

          </div>

          <p className="filter-result">

            Showing{" "}

            <strong>
              {filteredExceptions.length}
            </strong>{" "}

            of{" "}

            <strong>
              {exceptions.length}
            </strong>{" "}

            exceptions

          </p>

          {!exceptions.length ? (

            <div className="loading">
              Loading exceptions...
            </div>

          ) : filteredExceptions.length === 0 ? (

            <div className="loading">
              No exceptions match your filters.
            </div>

          ) : (

            <div className="table-container">

              <table className="exceptions-table">

                <thead>

                  <tr>
                    <th>Payment ID</th>
                    <th>Reason</th>
                    <th>Expected Amount</th>
                    <th>Settled Amount</th>
                    <th>Risk</th>
                    <th>AI Confidence</th>
                    <th>Decision</th>
                    <th>Recommended Action</th>
                    <th>Investigation</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredExceptions.map(
                    (exception, index) => (

                      <tr
                        key={`${exception.payment_id}-${index}`}
                      >

                        <td className="payment-id">
                          {exception.payment_id}
                        </td>

                        <td>
                          {exception.reason || "—"}
                        </td>

                        <td>
                          {exception.expected_amount !==
                          undefined
                            ? `₹${exception.expected_amount}`
                            : "—"}
                        </td>

                        <td>
                          {exception.settled_amount !==
                            null &&
                          exception.settled_amount !==
                            undefined
                            ? `₹${exception.settled_amount}`
                            : "—"}
                        </td>

                        <td>

                          <span
                            className={`risk-badge ${String(
                              exception.risk_level || ""
                            ).toLowerCase()}`}
                          >
                            {exception.risk_level ||
                              "N/A"}
                          </span>

                        </td>

                        <td>

                          {exception.ai_confidence !==
                            null &&
                          exception.ai_confidence !==
                            undefined
                            ? `${(
                                exception.ai_confidence *
                                100
                              ).toFixed(0)}%`
                            : "—"}

                        </td>

                        <td>

                          <span className="decision-badge">
                            {exception.decision ||
                              "N/A"}
                          </span>

                        </td>

                        <td>
                          {exception.recommended_action ||
                            "—"}
                        </td>

                        <td>

                          <button
                            className="details-button"
                            onClick={() =>
                              viewDetails(
                                exception.payment_id
                              )
                            }
                          >
                            View Details
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* =========================
            INVESTIGATION
            ========================= */}

        <section
          id="investigation"
          className="details-panel"
        >

          {detailsLoading ? (

            <div className="loading">
              Loading investigation...
            </div>

          ) : !details ? (

            <div className="loading">
              Select an exception and click
              <strong> View Details </strong>
              to investigate.
            </div>

          ) : (

            <>

              <div className="details-header">

                <div>

                  <h2>
                    Exception Investigation
                  </h2>

                  <p>
                    Payment ID:{" "}
                    <strong>
                      {selectedException}
                    </strong>
                  </p>

                </div>

                <button
                  className="close-button"
                  onClick={closeDetails}
                >
                  Close
                </button>

              </div>

              {/* TOP DETAILS */}

              <div className="details-grid">

                <div className="detail-card">

                  <span>
                    Status
                  </span>

                  <strong>
                    {details.status || "N/A"}
                  </strong>

                </div>

                <div className="detail-card">

                  <span>
                    Risk Level
                  </span>

                  <strong>
                    {details.ai_analysis
                      ?.risk_level ||
                      "N/A"}
                  </strong>

                </div>

                <div className="detail-card">

                  <span>
                    AI Confidence
                  </span>

                  <strong>

                    {details.ai_analysis
                      ?.confidence !== null &&
                    details.ai_analysis
                      ?.confidence !== undefined
                      ? `${(
                          details.ai_analysis.confidence *
                          100
                        ).toFixed(1)}%`
                      : "N/A"}

                  </strong>

                </div>

                <div className="detail-card">

                  <span>
                    Decision
                  </span>

                  <strong>
                    {details.decision
                      ?.decision ||
                      "N/A"}
                  </strong>

                </div>

              </div>

              {/* RECONCILIATION DETAILS */}

              <div className="analysis-box">

                <h3>
                  Reconciliation Details
                </h3>

                <p>

                  <strong>
                    Reason:
                  </strong>{" "}

                  {details.reconciliation
                    ?.reason ||
                    "N/A"}

                </p>

                <p>

                  <strong>
                    Expected Amount:
                  </strong>{" "}

                  {details.reconciliation
                    ?.expected_amount !==
                  undefined
                    ? `₹${details.reconciliation.expected_amount}`
                    : "N/A"}

                </p>

                <p>

                  <strong>
                    Settled Amount:
                  </strong>{" "}

                  {details.reconciliation
                    ?.settled_amount !== null &&
                  details.reconciliation
                    ?.settled_amount !==
                    undefined
                    ? `₹${details.reconciliation.settled_amount}`
                    : "Not settled"}

                </p>

                {details.reconciliation
                  ?.difference !==
                  undefined && (

                  <p>

                    <strong>
                      Difference:
                    </strong>{" "}

                    ₹
                    {
                      details.reconciliation
                        .difference
                    }

                  </p>

                )}

                {details.reconciliation
                  ?.date_difference_days !==
                  undefined && (

                  <p>

                    <strong>
                      Date Difference:
                    </strong>{" "}

                    {
                      details.reconciliation
                        .date_difference_days
                    }{" "}
                    days

                  </p>

                )}

              </div>

              {/* AI ANALYSIS */}

<div className="analysis-box">

  <h3>
    AI Analysis
  </h3>

  <p>
    <strong>
      AI Method:
    </strong>{" "}
    {details.ai_analysis?.ai_method ||
      "N/A"}
  </p>

  <p>
    <strong>
      Anomaly Status:
    </strong>{" "}
    {details.ai_analysis?.is_anomalous
      ? "ANOMALY DETECTED"
      : "NORMAL"}
  </p>

  <p>
    <strong>
      Anomaly Confidence:
    </strong>{" "}
    {details.ai_analysis?.anomaly_confidence !==
      null &&
    details.ai_analysis?.anomaly_confidence !==
      undefined
      ? `${(
          details.ai_analysis.anomaly_confidence *
          100
        ).toFixed(1)}%`
      : "N/A"}
  </p>

  <p>
    <strong>
      Anomaly Score:
    </strong>{" "}
    {details.ai_analysis?.anomaly_score !==
      null &&
    details.ai_analysis?.anomaly_score !==
      undefined
      ? details.ai_analysis.anomaly_score
      : "N/A"}
  </p>

  <p>
    <strong>
      Risk Level:
    </strong>{" "}
    {details.ai_analysis?.risk_level ||
      "N/A"}
  </p>

  <p>
    <strong>
      Difference Percentage:
    </strong>{" "}
    {details.ai_analysis?.difference_percentage !==
      null &&
    details.ai_analysis?.difference_percentage !==
      undefined
      ? `${details.ai_analysis.difference_percentage}%`
      : "N/A"}
  </p>

  <p>
    <strong>
      Possible Cause:
    </strong>{" "}
    {details.ai_analysis?.possible_cause ||
      "N/A"}
  </p>

  <p>
    <strong>
      AI Explanation:
    </strong>{" "}
    {details.ai_analysis?.explanation ||
      "N/A"}
  </p>

  <p>
    <strong>
      Recommended Action:
    </strong>{" "}
    {details.ai_analysis?.recommended_action ||
      "N/A"}
  </p>

</div>

              {/* DECISION */}

              <div className="analysis-box">

                <h3>
                  Decision
                </h3>

                <p>

                  <strong>
                    Decision:
                  </strong>{" "}

                  {details.decision
                    ?.decision ||
                    "N/A"}

                </p>

                <p>

                  <strong>
                    Reason:
                  </strong>{" "}

                  {details.decision
                    ?.reason ||
                    details.decision
                      ?.decision_reason ||
                    "No decision reason available."}

                </p>

              </div>

              {/* AUDIT */}

              {details.audit && (

                <div className="analysis-box">

                  <h3>
                    Audit Information
                  </h3>

                  {Object.entries(
                    details.audit
                  ).map(([key, value]) => (

                    <p key={key}>

                      <strong>
                        {key.replace(
                          /_/g,
                          " "
                        )}:
                      </strong>{" "}

                      {String(value)}

                    </p>

                  ))}

                </div>

              )}

            </>

          )}

        </section>

      </main>

    </div>
  );
}

export default App;