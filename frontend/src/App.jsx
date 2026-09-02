import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://reconai-4kr7.onrender.com";

function App() {
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [healthResponse, summaryResponse] = await Promise.all([
          fetch(`${API_URL}/health`),
          fetch(`${API_URL}/summary`),
        ]);

        if (!healthResponse.ok || !summaryResponse.ok) {
          throw new Error("Could not reach the backend");
        }

        const healthData = await healthResponse.json();
        const summaryData = await summaryResponse.json();

        setHealth(healthData);
        setSummary(summaryData);
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

            <section className="summary">
              <h2>Reconciliation Summary</h2>

              <div className="progress-container">
                <div
                  className="progress"
                  style={{ width: `${summary.match_rate}%` }}
                ></div>
              </div>

              <p>
                {summary.matched} of {summary.total_transactions} transactions
                matched successfully.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;