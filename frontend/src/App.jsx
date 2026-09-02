import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://reconai-4kr7.onrender.com";

function App() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [
          healthResponse,
          summaryResponse,
          analyticsResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/health`),
          fetch(`${API_URL}/summary`),
          fetch(`${API_URL}/analytics`),
        ]);

        if (
          !healthResponse.ok ||
          !summaryResponse.ok ||
          !analyticsResponse.ok
        ) {
          throw new Error("Could not reach the backend");
        }

        const healthData = await healthResponse.json();
        const summaryData = await summaryResponse.json();
        const analyticsData = await analyticsResponse.json();

        setHealth(healthData);
        setSummary(summaryData);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error(err);
        setError("We couldn't reach the server. Please try again.");
      }
    }

    loadData();
  }, []);

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

      {/* Header */}
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

        {/* Overview */}
        <section>
          <h2>Overview</h2>

          {!summary ? (
            <div className="loading">Loading dashboard...</div>
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


        {/* Analytics */}
        <section className="analytics-section">

          <h2>Analytics</h2>

          {!analytics ? (
            <div className="loading">Loading analytics...</div>
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

                <div className="bar-row">
                  <div className="bar-label">
                    <span>Auto Resolved</span>
                    <strong>{analytics.auto_resolved}</strong>
                  </div>

                  <div className="bar-container">
                    <div
                      className="bar auto"
                      style={{
                        width: `${(analytics.auto_resolved / analytics.exceptions) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>


                <div className="bar-row">
                  <div className="bar-label">
                    <span>Manual Review</span>
                    <strong>{analytics.manual_review}</strong>
                  </div>

                  <div className="bar-container">
                    <div
                      className="bar manual"
                      style={{
                        width: `${(analytics.manual_review / analytics.exceptions) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>


                <div className="bar-row">
                  <div className="bar-label">
                    <span>Escalated</span>
                    <strong>{analytics.escalated}</strong>
                  </div>

                  <div className="bar-container">
                    <div
                      className="bar escalated"
                      style={{
                        width: `${(analytics.escalated / analytics.exceptions) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>


                <div className="bar-row">
                  <div className="bar-label">
                    <span>Unresolved</span>
                    <strong>{analytics.unresolved}</strong>
                  </div>

                  <div className="bar-container">
                    <div
                      className="bar unresolved"
                      style={{
                        width: `${(analytics.unresolved / analytics.exceptions) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

              </div>

            </>
          )}

        </section>

      </main>
    </div>
  );
}

export default App;