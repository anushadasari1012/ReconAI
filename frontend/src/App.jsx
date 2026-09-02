import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://reconai-4kr7.onrender.com";

function App() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  // Exception investigation
  const [selectedException, setSelectedException] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load dashboard data
  useEffect(() => {
    async function loadData() {
      try {
        const [
          healthResponse,
          summaryResponse,
          analyticsResponse,
          exceptionsResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/health`),
          fetch(`${API_URL}/summary`),
          fetch(`${API_URL}/analytics`),
          fetch(`${API_URL}/exceptions`),
        ]);

        if (
          !healthResponse.ok ||
          !summaryResponse.ok ||
          !analyticsResponse.ok ||
          !exceptionsResponse.ok
        ) {
          throw new Error("Could not reach the backend");
        }

        const healthData = await healthResponse.json();
        const summaryData = await summaryResponse.json();
        const analyticsData = await analyticsResponse.json();
        const exceptionsData = await exceptionsResponse.json();

        setHealth(healthData);
        setSummary(summaryData);
        setAnalytics(analyticsData);
        setExceptions(exceptionsData);
      } catch (err) {
        console.error(err);
        setError("We couldn't reach the server. Please try again.");
      }
    }

    loadData();
  }, []);

  // View exception details
  async function viewDetails(paymentId) {
    try {
      setDetailsLoading(true);
      setSelectedException(paymentId);
      setDetails(null);

      const response = await fetch(
        `${API_URL}/analyze/${paymentId}`
      );

      if (!response.ok) {
        throw new Error("Could not load payment details");
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

  // Close investigation panel
  function closeDetails() {
    setDetails(null);
    setSelectedException(null);
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-box">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* ================= HEADER ================= */}

      <header className="header">
        <div>
          <h1>ReconAI</h1>
          <p>Payment Reconciliation Dashboard</p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          {health?.status || "Connecting..."}
        </div>
      </header>


      <main>

        {/* ================= OVERVIEW ================= */}

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
                  <p>Total Transactions</p>
                  <h3>{summary.total_transactions}</h3>
                </div>

                <div className="card">
                  <p>Matched</p>
                  <h3>{summary.matched}</h3>
                </div>

                <div className="card">
                  <p>Exceptions</p>
                  <h3>{summary.exceptions}</h3>
                </div>

                <div className="card">
                  <p>Match Rate</p>
                  <h3>{summary.match_rate}%</h3>
                </div>

              </div>


              <div className="summary">

                <h2>Reconciliation Summary</h2>

                <div className="progress-container">
                  <div
                    className="progress"
                    style={{
                      width: `${summary.match_rate}%`,
                    }}
                  ></div>
                </div>

                <p>
                  {summary.matched} of {summary.total_transactions}{" "}
                  transactions matched successfully.
                </p>

              </div>
            </>
          )}
        </section>


        {/* ================= ANALYTICS ================= */}

        <section className="analytics-section">

          <h2>Analytics</h2>

          {!analytics ? (
            <div className="loading">
              Loading analytics...
            </div>
          ) : (
            <>

              {/* Analytics Cards */}

              <div className="analytics-cards">

                <div className="analytics-card">
                  <span>Batch Size</span>
                  <strong>{analytics.batch_size}</strong>
                </div>

                <div className="analytics-card">
                  <span>Auto Resolved</span>
                  <strong>{analytics.auto_resolved}</strong>
                </div>

                <div className="analytics-card">
                  <span>Manual Review</span>
                  <strong>{analytics.manual_review}</strong>
                </div>

                <div className="analytics-card">
                  <span>Escalated</span>
                  <strong>{analytics.escalated}</strong>
                </div>

                <div className="analytics-card">
                  <span>Unresolved</span>
                  <strong>{analytics.unresolved}</strong>
                </div>

              </div>


              {/* Exception Breakdown */}

              <div className="analytics-panel">

                <h2>Exception Breakdown</h2>


                {/* Auto Resolved */}

                <div className="bar-row">

                  <div className="bar-label">
                    <span>Auto Resolved</span>
                    <strong>{analytics.auto_resolved}</strong>
                  </div>

                  <div className="bar-container">

                    <div
                      className="bar auto"
                      style={{
                        width: `${
                          (analytics.auto_resolved /
                            analytics.exceptions) *
                          100
                        }%`,
                      }}
                    ></div>

                  </div>

                </div>


                {/* Manual Review */}

                <div className="bar-row">

                  <div className="bar-label">
                    <span>Manual Review</span>
                    <strong>{analytics.manual_review}</strong>
                  </div>

                  <div className="bar-container">

                    <div
                      className="bar manual"
                      style={{
                        width: `${
                          (analytics.manual_review /
                            analytics.exceptions) *
                          100
                        }%`,
                      }}
                    ></div>

                  </div>

                </div>


                {/* Escalated */}

                <div className="bar-row">

                  <div className="bar-label">
                    <span>Escalated</span>
                    <strong>{analytics.escalated}</strong>
                  </div>

                  <div className="bar-container">

                    <div
                      className="bar escalated"
                      style={{
                        width: `${
                          (analytics.escalated /
                            analytics.exceptions) *
                          100
                        }%`,
                      }}
                    ></div>

                  </div>

                </div>


                {/* Unresolved */}

                <div className="bar-row">

                  <div className="bar-label">
                    <span>Unresolved</span>
                    <strong>{analytics.unresolved}</strong>
                  </div>

                  <div className="bar-container">

                    <div
                      className="bar unresolved"
                      style={{
                        width: `${
                          (analytics.unresolved /
                            analytics.exceptions) *
                          100
                        }%`,
                      }}
                    ></div>

                  </div>

                </div>

              </div>

            </>
          )}

        </section>


        {/* ================= EXCEPTIONS ================= */}

        <section className="exceptions-section">

          <div className="section-heading">

            <div>
              <h2>Exceptions</h2>
              <p>Transactions requiring attention</p>
            </div>

            <div className="exception-count">
              {exceptions.length} Exceptions
            </div>

          </div>


          {!exceptions.length ? (

            <div className="loading">
              Loading exceptions...
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

                  {exceptions.map((exception, index) => (

                    <tr
                      key={`${exception.payment_id}-${index}`}
                    >

                      {/* Payment ID */}

                      <td className="payment-id">
                        {exception.payment_id}
                      </td>


                      {/* Reason */}

                      <td>
                        {exception.reason}
                      </td>


                      {/* Expected Amount */}

                      <td>
                        ₹{exception.expected_amount}
                      </td>


                      {/* Settled Amount */}

                      <td>
                        {exception.settled_amount !== null &&
                        exception.settled_amount !== undefined
                          ? `₹${exception.settled_amount}`
                          : "—"}
                      </td>


                      {/* Risk */}

                      <td>

                        <span
                          className={`risk-badge ${String(
                            exception.risk_level || ""
                          ).toLowerCase()}`}
                        >
                          {exception.risk_level || "N/A"}
                        </span>

                      </td>


                      {/* AI Confidence */}

                      <td>

                        {exception.ai_confidence !== null &&
                        exception.ai_confidence !== undefined
                          ? `${(
                              exception.ai_confidence * 100
                            ).toFixed(0)}%`
                          : "—"}

                      </td>


                      {/* Decision */}

                      <td>

                        <span className="decision-badge">
                          {exception.decision || "N/A"}
                        </span>

                      </td>


                      {/* Recommended Action */}

                      <td>
                        {exception.recommended_action || "—"}
                      </td>


                      {/* View Details */}

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

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* ================= EXCEPTION INVESTIGATION ================= */}

        {detailsLoading && (

          <section className="details-panel">

            <div className="loading">
              Loading investigation...
            </div>

          </section>

        )}


        {details && !detailsLoading && (

          <section className="details-panel">

            {/* Investigation Header */}

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


            {/* Investigation Cards */}

            <div className="details-grid">

              <div className="detail-card">

                <span>Status</span>

                <strong>
                  {details.status || "N/A"}
                </strong>

              </div>


              <div className="detail-card">

                <span>Risk Level</span>

                <strong>
                  {details.ai_analysis?.risk_level ||
                    "N/A"}
                </strong>

              </div>


              <div className="detail-card">

                <span>AI Confidence</span>

                <strong>

                  {details.ai_analysis?.confidence !==
                    null &&
                  details.ai_analysis?.confidence !==
                    undefined
                    ? `${(
                        details.ai_analysis.confidence *
                        100
                      ).toFixed(1)}%`
                    : "N/A"}

                </strong>

              </div>


              <div className="detail-card">

                <span>Decision</span>

                <strong>
                  {details.decision?.decision ||
                    "N/A"}
                </strong>

              </div>

            </div>


            {/* Reconciliation Information */}

            <div className="analysis-box">

              <h3>
                Reconciliation Details
              </h3>

              <p>
                <strong>Reason:</strong>{" "}
                {details.reconciliation?.reason ||
                  "N/A"}
              </p>

              <p>
                <strong>Expected Amount:</strong>{" "}
                {details.reconciliation
                  ?.expected_amount !== undefined
                  ? `₹${details.reconciliation.expected_amount}`
                  : "N/A"}
              </p>

              <p>
                <strong>Settled Amount:</strong>{" "}
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
                  <strong>Difference:</strong>{" "}
                  ₹{details.reconciliation.difference}
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
                <strong>Risk Level:</strong>{" "}
                {details.ai_analysis?.risk_level ||
                  "N/A"}
              </p>

              <p>
                <strong>AI Confidence:</strong>{" "}
                {details.ai_analysis?.confidence !==
                  null &&
                details.ai_analysis?.confidence !==
                  undefined
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
                <strong>Decision:</strong>{" "}
                {details.decision?.decision ||
                  "N/A"}
              </p>

              <p>
                <strong>Reason:</strong>{" "}
                {details.decision?.reason ||
                  "No decision reason available."}
              </p>

            </div>


            {/* Audit */}

            {details.audit && (

              <div className="analysis-box">

                <h3>
                  Audit Information
                </h3>

                {Object.entries(details.audit).map(
                  ([key, value]) => (

                    <p key={key}>
                      <strong>
                        {key.replace(
                          /_/g,
                          " "
                        )}:
                      </strong>{" "}
                      {String(value)}
                    </p>

                  )
                )}

              </div>

            )}

          </section>

        )}

      </main>

    </div>
  );
}

export default App;