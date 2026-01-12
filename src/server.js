const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Proxy helper
const proxyToBackend = async (req, res, endpoint) => {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4001";
    const backendRes = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      try {
        const errorJson = JSON.parse(errorText);
        return res.status(backendRes.status).json(errorJson);
      } catch {
        return res.status(backendRes.status).json({ error: errorText || `HTTP ${backendRes.status}` });
      }
    }

    const data = await backendRes.json();
    res.json(data);
  } catch (err) {
    console.error(`Error proxying to ${endpoint}:`, err);
    res.status(503).json({ error: "Backend unavailable", details: err.message });
  }
};

// Route: Create Payment Intent
app.post("/api/create-payment-intent", (req, res) => {
  proxyToBackend(req, res, "/api/create-payment-intent");
});

// Route: Create Order
app.post("/api/create-order", (req, res) => {
  proxyToBackend(req, res, "/api/create-order");
});

// Serve static frontend files (after API routes)
const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));

// Serve main HTML for the root path
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend server listening on http://localhost:${PORT}`);
});
