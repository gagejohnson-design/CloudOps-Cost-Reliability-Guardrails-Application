// frontend/app.js
(function () {
  const cfg = window.CLOUDOPS_CONFIG || {};
  const TOKEN_KEY = "cloudops_tokens_v1";
  const PKCE_KEY = "cloudops_pkce_v1";

  function mustConfig() {
    const missing = [];
    if (!cfg.cognitoDomain || cfg.cognitoDomain.includes("PASTE_"))
      missing.push("cognitoDomain");
    if (!cfg.clientId || cfg.clientId.includes("PASTE_"))
      missing.push("clientId");
    if (!cfg.redirectUri || cfg.redirectUri.includes("PASTE_"))
      missing.push("redirectUri");
    return missing;
  }

  // ---------- PKCE helpers ----------
  function randomString(len = 64) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
  }

  async function sha256Base64Url(str) {
    const data = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function setTokens(tokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  }

  function getTokens() {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PKCE_KEY);
  }

  function isLoggedIn() {
    const t = getTokens();
    return !!(t && t.id_token);
  }

  // ---------- Auth flows ----------
  async function login() {
    const missing = mustConfig();
    if (missing.length) {
      alert("Fill frontend/config.js first. Missing: " + missing.join(", "));
      return;
    }

    const verifier = randomString(64);
    const challenge = await sha256Base64Url(verifier);
    localStorage.setItem(PKCE_KEY, verifier);

    const authUrl = new URL(
      cfg.cognitoDomain.replace(/\/+$/, "") + "/oauth2/authorize",
    );
    authUrl.searchParams.set("client_id", cfg.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("redirect_uri", cfg.redirectUri);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("code_challenge", challenge);

    window.location.href = authUrl.toString();
  }

  async function handleCallback() {
    const missing = mustConfig();
    if (missing.length)
      throw new Error("Missing config values: " + missing.join(", "));

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const errorDesc = params.get("error_description");

    if (error) {
      throw new Error(`${error}: ${errorDesc || "OAuth error"}`);
    }
    if (!code) {
      throw new Error("No code found in callback URL.");
    }

    const verifier = localStorage.getItem(PKCE_KEY);
    if (!verifier)
      throw new Error("Missing PKCE verifier. Try logging in again.");

    const tokenUrl = cfg.cognitoDomain.replace(/\/+$/, "") + "/oauth2/token";
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("client_id", cfg.clientId);
    body.set("code", code);
    body.set("redirect_uri", cfg.redirectUri);
    body.set("code_verifier", verifier);

    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error("Token exchange failed: " + text);
    }

    const tokens = await resp.json();
    setTokens(tokens);

    // back to app
    window.location.href = "./#dashboard";
  }

  function logout() {
    const missing = mustConfig();
    clearTokens();

    // If config is present, do a Cognito logout redirect (optional).
    if (!missing.length) {
      const logoutUrl = new URL(
        cfg.cognitoDomain.replace(/\/+$/, "") + "/logout",
      );
      logoutUrl.searchParams.set("client_id", cfg.clientId);
      logoutUrl.searchParams.set(
        "logout_uri",
        cfg.redirectUri.replace(/\/callback$/, "/"),
      );
      window.location.href = logoutUrl.toString();
      return;
    }

    window.location.href = "./";
  }

  // ---------- Fake data (Phase 1) ----------
  const FAKE = {
    kpis: {
      monthSpend: 1247.33,
      spendDeltaPct: 18.4,
      openAlerts: 3,
      openRecs: 4,
    },
    alerts: [
      {
        id: "AL-1001",
        type: "cost",
        status: "open",
        severity: "warn",
        title: "EC2 spend +38% vs baseline",
        createdAt: "2026-02-01",
      },
      {
        id: "AL-1002",
        type: "reliability",
        status: "open",
        severity: "bad",
        title: "API 5XX spike detected",
        createdAt: "2026-02-02",
      },
      {
        id: "AL-1003",
        type: "cost",
        status: "acknowledged",
        severity: "warn",
        title: "NAT data processing up",
        createdAt: "2026-02-02",
      },
    ],
    recs: [
      {
        id: "RC-2001",
        status: "open",
        title: "Review EC2 usage / scale down idle instances",
        linkedAlert: "AL-1001",
      },
      {
        id: "RC-2002",
        status: "in_progress",
        title: "Investigate API errors: deploy logs + correlation IDs",
        linkedAlert: "AL-1002",
      },
      {
        id: "RC-2003",
        status: "open",
        title: "Reduce NAT usage with endpoints where justified",
        linkedAlert: "AL-1003",
      },
      {
        id: "RC-2004",
        status: "done",
        title: "Enable billing alarm in us-east-1 for early warning",
        linkedAlert: "-",
      },
    ],
    costs: [
      { date: "2026-01-25", total: 32.14 },
      { date: "2026-01-26", total: 29.88 },
      { date: "2026-01-27", total: 34.01 },
      { date: "2026-01-28", total: 37.22 },
      { date: "2026-01-29", total: 35.8 },
      { date: "2026-01-30", total: 41.06 },
      { date: "2026-01-31", total: 44.13 },
    ],
  };

  // ---------- UI rendering ----------
  const routes = [
    { id: "dashboard", label: "Dashboard" },
    { id: "costs", label: "Costs" },
    { id: "alerts", label: "Alerts" },
    { id: "recommendations", label: "Recommendations" },
  ];

  function badgeClass(sev) {
    if (sev === "ok") return "badge ok";
    if (sev === "warn") return "badge warn";
    return "badge bad";
  }

  function renderNav(active) {
    const nav = document.getElementById("navLinks");
    if (!nav) return;
    nav.innerHTML = routes
      .map((r) => {
        const cls = "pill" + (r.id === active ? " active" : "");
        return `<a class="${cls}" href="#${r.id}">${r.label}</a>`;
      })
      .join("");
  }

  function setAuthUI() {
    const badge = document.getElementById("authBadge");
    const text = document.getElementById("authText");
    if (!badge || !text) return;

    if (isLoggedIn()) {
      badge.className = "badge ok";
      text.textContent = "Logged in";
    } else {
      badge.className = "badge warn";
      text.textContent = "Not logged in";
    }
  }

  function renderDashboard() {
    const title = document.getElementById("pageTitle");
    const sub = document.getElementById("pageSubtitle");
    const content = document.getElementById("pageContent");
    title.textContent = "Dashboard";
    sub.textContent =
      "High-level view of spend + reliability guardrails (fake data in Phase 1).";

    content.innerHTML = `
      <div class="card span-4">
        <div class="kpi">
          <div class="value">$${FAKE.kpis.monthSpend.toFixed(2)}</div>
          <div class="label">Estimated month spend</div>
          <div class="small">Δ ${FAKE.kpis.spendDeltaPct}% vs baseline</div>
        </div>
      </div>
      <div class="card span-4">
        <div class="kpi">
          <div class="value">${FAKE.kpis.openAlerts}</div>
          <div class="label">Open alerts</div>
          <div class="small">Workflow: open → acknowledged → resolved</div>
        </div>
      </div>
      <div class="card span-4">
        <div class="kpi">
          <div class="value">${FAKE.kpis.openRecs}</div>
          <div class="label">Open recommendations</div>
          <div class="small">Actionable CloudOps next steps</div>
        </div>
      </div>

      <div class="card span-6">
        <h2>Recent alerts</h2>
        ${renderAlertsTable(FAKE.alerts.slice(0, 5))}
      </div>
      <div class="card span-6">
        <h2>Recommendations</h2>
        ${renderRecsTable(FAKE.recs.slice(0, 5))}
      </div>
    `;
  }

  function renderCosts() {
    const title = document.getElementById("pageTitle");
    const sub = document.getElementById("pageSubtitle");
    const content = document.getElementById("pageContent");
    title.textContent = "Costs";
    sub.textContent =
      "30-day rolling view by service will be wired in Phase 3 (Cost Explorer ingestion).";

    content.innerHTML = `
      <div class="card">
        <h2>Daily total (sample)</h2>
        <table class="table">
          <thead><tr><th>Date</th><th>Total ($)</th></tr></thead>
          <tbody>
            ${FAKE.costs.map((r) => `<tr><td>${r.date}</td><td>${r.total.toFixed(2)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAlerts() {
    const title = document.getElementById("pageTitle");
    const sub = document.getElementById("pageSubtitle");
    const content = document.getElementById("pageContent");
    title.textContent = "Alerts";
    sub.textContent =
      "Alerts are generated automatically by guardrail jobs (Phase 4).";

    content.innerHTML = `
      <div class="card">
        <h2>All alerts</h2>
        ${renderAlertsTable(FAKE.alerts)}
      </div>
    `;
  }

  function renderRecommendations() {
    const title = document.getElementById("pageTitle");
    const sub = document.getElementById("pageSubtitle");
    const content = document.getElementById("pageContent");
    title.textContent = "Recommendations";
    sub.textContent =
      "Recommendations are linked to alerts and tracked through a lifecycle (Phase 2+).";

    content.innerHTML = `
      <div class="card">
        <h2>All recommendations</h2>
        ${renderRecsTable(FAKE.recs)}
      </div>
    `;
  }

  function renderAlertsTable(alerts) {
    return `
      <table class="table">
        <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Severity</th><th>Title</th><th>Created</th></tr></thead>
        <tbody>
          ${alerts
            .map(
              (a) => `
            <tr>
              <td class="code">${a.id}</td>
              <td>${a.type}</td>
              <td>${a.status}</td>
              <td><span class="${badgeClass(a.severity)}">${a.severity}</span></td>
              <td>${a.title}</td>
              <td>${a.createdAt}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function renderRecsTable(recs) {
    return `
      <table class="table">
        <thead><tr><th>ID</th><th>Status</th><th>Title</th><th>Linked Alert</th></tr></thead>
        <tbody>
          ${recs
            .map(
              (r) => `
            <tr>
              <td class="code">${r.id}</td>
              <td>${r.status}</td>
              <td>${r.title}</td>
              <td class="code">${r.linkedAlert}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function renderRoute(route) {
    renderNav(route);
    setAuthUI();

    switch (route) {
      case "costs":
        return renderCosts();
      case "alerts":
        return renderAlerts();
      case "recommendations":
        return renderRecommendations();
      default:
        return renderDashboard();
    }
  }

  function init() {
    if (!location.hash) location.hash = "#dashboard";
    const route = location.hash.replace("#", "");
    renderRoute(route);

    window.addEventListener("hashchange", () => {
      const r = location.hash.replace("#", "");
      renderRoute(r);
    });

    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogin) btnLogin.onclick = login;
    if (btnLogout) btnLogout.onclick = logout;
  }

  // Expose callback handler for callback.html
  window.CloudOpsApp = { handleCallback };

  // Only run init on index.html (callback.html runs handleCallback directly)
  if (document.getElementById("pageContent")) init();
})();
