import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://reconai-4kr7.onrender.com";

function App() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [reconciliation, setReconciliation] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  // Exception investigation
  const [selectedException, setSelectedException] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Exception filters
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [decisionFilter, setDecisionFilter] = useState("ALL");

  // Reconciliation filters
  const [reconSearch, setReconSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // =========================
  // LOAD DASHBOARD DATA
  // =========================

  useEffect(() => {
    async function loadData() {
      try {
        const [
          healthResponse,
          summaryResponse,
          analyticsResponse,
          exceptionsResponse,
          reconciliationResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/health`),
          fetch(`${API_URL}/summary`),
          fetch(`${API_URL}/analytics`),
          fetch(`${API_URL}/exceptions`),
          fetch(`${API_URL}/reconcile`),
        ]);

        if (!healthResponse.ok) {
          throw new Error("Health service is unavailable");
        }

        if (!summaryResponse.ok) {
          throw new Error("Summary service is unavailable");
        }

        if (!analyticsResponse.ok) {
          throw new Error("Analytics service is unavailable");
        }

        if (!exceptionsResponse.ok) {
          throw new Error("Exceptions service is unavailable");
        }

        if (!reconciliationResponse.ok) {
          throw new Error(
            "Reconciliation service is unavailable"
          );
        }

        const healthData = await healthResponse.json();
        const summaryData = await summaryResponse.json();
        const analyticsData = await analyticsResponse.json();
        const exceptionsData =
          await exceptionsResponse.json();
        const reconciliationData =
          await reconciliationResponse.json();

        setHealth(healthData);
        setSummary(summaryData);
        setAnalytics(analyticsData);
        setExceptions(
          Array.isArray(exceptionsData)
            ? exceptionsData
            : []
        );

        setReconciliation(
          reconciliationData.results || []
        );
      } catch (err) {
        console.error(err);

        setError(
          "We couldn't reach the server. Please try again."
        );
      }
    }

    loadData();
  }, []);

  // =========================
  // VIEW EXCEPTION DETAILS
  // =========================

  async function viewDetails(paymentId) {
    try {
      setDetailsLoading(true);
      setSelectedException(paymentId);
      setDetails(null);

      const response = await fetch(
        `${API_URL}/analyze/${paymentId}`
      );

      if (!response.ok) {
        throw new Error(
          "Could not load payment details"
        );
      }

      const data = await response.json();

      setDetails(data);
    } catch (err) {
      console.error(err);

      alert("Could not load payment details.");

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

  const filteredExceptions = exceptions.filter(
    (exception) => {
      const paymentId = String(
        exception.payment_id || ""
      ).toLowerCase();

      const risk = String(
        exception.risk_level || ""
      ).toUpperCase();

      const decision = String(
        exception.decision || ""
      ).toUpperCase();

      const matchesSearch = paymentId.includes(
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
    }
  );

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

        const matchesSearch = paymentId.includes(
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
  // RESET EXCEPTION FILTERS
  // =========================

  function resetFilters() {
    setSearchTerm("");
    setRiskFilter("ALL");
    setDecisionFilter("ALL");
  }

  // =========================
  // RESET RECONCILIATION FILTERS
  // =========================

  function resetReconFilters() {
    setReconSearch("");
    setStatusFilter("ALL");
  }

  // =========================
  // ERROR SCREEN
  // =========================

  if (error) {
    return (
      <div className="error-container">
        <div className="error-box">
          <h2>Something went wrong</h2>

          <p>{error}</p>

          <button
            className="reset-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* =========================
          HEADER
          ========================= */}

      <header className="header">

        <div>
          <h1>ReconAI</h1>

          <p>
            Payment Reconciliation Dashboard
          </p>
        </div>

        <div className="status">

          <span className="status-dot"></span>

          {health?.status || "Connecting..."}

        </div>

      </header>


      <main>

        {/* =========================
            OVERVIEW
            ========================= */}

        <section>

          <h2>Overview</h2>

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
                    {summary.total_transactions}
                  </h3>

                </div>


                <div className="card">

                  <p>
                    Matched
                  </p>

                  <h3>
                    {summary.matched}
                  </h3>

                </div>


                <div className="card">

                  <p>
                    Exceptions
                  </p>

                  <h3>
                    {summary.exceptions}
                  </h3>

                </div>


                <div className="card">

                  <p>
                    Match Rate
                  </p>

                  <h3>
                    {summary.match_rate}%
                  </h3>

                </div>

              </div>


              <div className="summary">

                <h2>
                  Reconciliation Summary
                </h2>

                <div className="progress-container">

                  <div
                    className="progress"
                    style={{
                      width: `${summary.match_rate}%`,
                    }}
                  ></div>

                </div>

                <p>
                  {summary.matched} of{" "}
                  {summary.total_transactions}{" "}
                  transactions matched successfully.
                </p>

              </div>

            </>

          )}

        </section>


        {/* =========================
            ANALYTICS
            ========================= */}

        <section className="analytics-section">

          <h2>Analytics</h2>

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
                    {analytics.batch_size}
                  </strong>

                </div>


                <div className="analytics-card">

                  <span>
                    Auto Resolved
                  </span>

                  <strong>
                    {analytics.auto_resolved}
                  </strong>

                </div>


                <div className="analytics-card">

                  <span>
                    Manual Review
                  </span>

                  <strong>
                    {analytics.manual_review}
                  </strong>

                </div>


                <div className="analytics-card">

                  <span>
                    Escalated
                  </span>

                  <strong>
                    {analytics.escalated}
                  </strong>

                </div>


                <div className="analytics-card">

                  <span>
                    Unresolved
                  </span>

                  <strong>
                    {analytics.unresolved}
                  </strong>

                </div>

              </div>


              <div className="analytics-panel">

                <h2>
                  Exception Breakdown
                </h2>


                {/* Auto Resolved */}

                <div className="bar-row">

                  <div className="bar-label">

                    <span>
                      Auto Resolved
                    </span>

                    <strong>
                      {analytics.auto_resolved}
                    </strong>

                  </div>

                  <div className="bar-container">

                    <div
                      className="bar auto"
                      style={{
                        width: `${
                          analytics.exceptions
                            ? (
                                analytics.auto_resolved /
                                analytics.exceptions
                              ) * 100
                            : 0
                        }%`,
                      }}
                    ></div>

                  </div>

                </div>


                {/* Manual Review */}

                <div className="bar-row">

                  <div className="bar-label">

                    <span>
                      Manual Review
                    </span>

                    <strong>
                      {analytics.manual_review}
                    </strong>

                  </div>

                  <div className="bar-container">

                    <div
                      className="bar manual"
                      style={{
                        width: `${
                          analytics.exceptions
                            ? (
                                analytics.manual_review /
                                analytics.exceptions
                              ) * 100
                            : 0
                        }%`,
                      }}
                    ></div>

                  </div>

                </div>


                {/* Escalated */}

                <div className="bar-row">

                  <div className="bar-label">

                    <span>
                      Escalated
                    </span>

                    <strong>
                      {analytics.escalated}
                    </strong>

                  </div>

                  <div className="bar-container">

                    <div
                      className="bar escalated"
                      style={{
                        width: `${
                          analytics.exceptions
                            ? (
                                analytics.escalated /
                                analytics.exceptions
                              ) * 100
                            : 0
                        }%`,
                      }}
                    ></div>

                  </div>

                </div>


                {/* Unresolved */}

                <div className="bar-row">

                  <div className="bar-label">

                    <span>
                      Unresolved
                    </span>

                    <strong>
                      {analytics.unresolved}
                    </strong>

                  </div>

                  <div className="bar-container">

                    <div
                      className="bar unresolved"
                      style={{
                        width: `${
                          analytics.exceptions
                            ? (
                                analytics.unresolved /
                                analytics.exceptions
                              ) * 100
                            : 0
                        }%`,
                      }}
                    ></div>

                  </div>

                </div>

              </div>

            </>

          )}

        </section>


        {/* =========================
            REPORTS
            ========================= */}

        <section className="reports-section">

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

              {summary?.total_transactions || 0} Transactions

            </div>

          </div>


          {!summary ? (

            <div className="loading">
              Loading reports...
            </div>

          ) : (

            <>

              {/* Report Cards */}

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


              {/* Reconciliation Performance */}

              <div className="analytics-panel">

                <h2>
                  Reconciliation Performance
                </h2>


                {/* Matched Transactions */}

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


                {/* Exception Transactions */}

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


                {/* Report Summary */}

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


        {/* =========================
            RECONCILIATION
            ========================= */}

        <section className="reconciliation-section">

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

              {reconciliation.length} Transactions

            </div>

          </div>


          {/* Reconciliation Filters */}

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

                    <th>
                      Payment ID
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Reason
                    </th>

                    <th>
                      Expected Amount
                    </th>

                    <th>
                      Settled Amount
                    </th>

                    <th>
                      Difference
                    </th>

                    <th>
                      Date Difference
                    </th>

                    <th>
                      Confidence
                    </th>

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

        <section className="exceptions-section">

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


          {/* Exception Filters */}

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

                    <th>
                      Payment ID
                    </th>

                    <th>
                      Reason
                    </th>

                    <th>
                      Expected Amount
                    </th>

                    <th>
                      Settled Amount
                    </th>

                    <th>
                      Risk
                    </th>

                    <th>
                      AI Confidence
                    </th>

                    <th>
                      Decision
                    </th>

                    <th>
                      Recommended Action
                    </th>

                    <th>
                      Investigation
                    </th>

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
                          {exception.reason}
                        </td>


                        <td>
                          ₹{exception.expected_amount}
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
            EXCEPTION INVESTIGATION
            ========================= */}

        {detailsLoading && (

          <section className="details-panel">

            <div className="loading">
              Loading investigation...
            </div>

          </section>

        )}


        {details && !detailsLoading && (

          <section className="details-panel">

            {/* Header */}

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


            {/* Summary Cards */}

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
                    ?.risk_level || "N/A"}
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
                    ?.decision || "N/A"}
                </strong>

              </div>

            </div>


            {/* Reconciliation Details */}

            <div className="analysis-box">

              <h3>
                Reconciliation Details
              </h3>

              <p>

                <strong>
                  Reason:
                </strong>{" "}

                {details.reconciliation
                  ?.reason || "N/A"}

              </p>


              <p>

                <strong>
                  Expected Amount:
                </strong>{" "}

                {details.reconciliation
                  ?.expected_amount !== undefined
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
                  ?.settled_amount !== undefined
                  ? `₹${details.reconciliation.settled_amount}`
                  : "Not settled"}

              </p>


              {details.reconciliation
                ?.difference !== undefined && (

                <p>

                  <strong>
                    Difference:
                  </strong>{" "}

                  ₹
                  {details.reconciliation.difference}

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


            {/* AI Analysis */}

            <div className="analysis-box">

              <h3>
                AI Analysis
              </h3>


              <p>

                <strong>
                  Risk Level:
                </strong>{" "}

                {details.ai_analysis
                  ?.risk_level || "N/A"}

              </p>


              <p>

                <strong>
                  AI Confidence:
                </strong>{" "}

                {details.ai_analysis
                  ?.confidence !== null &&
                details.ai_analysis
                  ?.confidence !== undefined
                  ? `${(
                      details.ai_analysis.confidence *
                      100
                    ).toFixed(1)}%`
                  : "N/A"}

              </p>


              <p>

                <strong>
                  Recommended Action:
                </strong>{" "}

                {details.ai_analysis
                  ?.recommended_action ||
                  "N/A"}

              </p>

            </div>


            {/* Decision */}

            <div className="analysis-box">

              <h3>
                Decision
              </h3>


              <p>

                <strong>
                  Decision:
                </strong>{" "}

                {details.decision
                  ?.decision || "N/A"}

              </p>


              <p>

                <strong>
                  Reason:
                </strong>{" "}

                {details.decision
                  ?.reason ||
                  "No decision reason available."}

              </p>

            </div>


            {/* Audit */}

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

          </section>

        )}

      </main>

    </div>
  );
}

export default App;