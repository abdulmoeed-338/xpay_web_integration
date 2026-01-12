const express = require("express");
const crypto = require("crypto");
const cors = require('cors');

const app = express();
const PORT = process.env.GATEWAY_PORT || 4002;

app.use(cors());
app.use(express.json());

// In-memory "Database" for Payment Intents
const paymentIntents = new Map();

// --- XPay API Endpoints ---

// 1. Create Payment Intent API (Called by Merchant Backend)
app.post("/api/v1/payment_intents", (req, res) => {
  try {
    const { amount, currency } = req.body;

    // Validate request
    if (!amount || !currency) {
      return res.status(400).json({ error: "Missing amount or currency" });
    }

    const paymentIntentId = "pi_" + crypto.randomBytes(12).toString("hex");
    const clientSecret = "seti_" + crypto.randomBytes(12).toString("hex"); // Simulated secret for SDK

    const intent = {
      id: paymentIntentId,
      amount,
      currency,
      status: "requires_payment_method",
      client_secret: clientSecret,
      created_at: new Date().toISOString()
    };

    paymentIntents.set(paymentIntentId, intent);

    console.log(`[XPay] Created Intent: ${paymentIntentId} (${amount} ${currency})`);

    res.json({
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      client_secret: intent.client_secret
    });
  } catch (err) {
    console.error("[XPay] Error creating intent:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. Retrieve Payment Intent API (Called by Merchant Backend to verify)
app.get("/api/v1/payment_intents/:id", (req, res) => {
  const { id } = req.params;
  const intent = paymentIntents.get(id);

  if (!intent) {
    return res.status(404).json({ error: "Payment Intent not found" });
  }

  res.json(intent);
});

// 3. Confirm Payment API (Called by Client SDK / Frontend)
app.post("/api/v1/payment_intents/:id/confirm", (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method_data } = req.body; // e.g., card details

    const intent = paymentIntents.get(id);

    if (!intent) {
      return res.status(404).json({ error: "Payment Intent not found" });
    }

    if (intent.status === "succeeded") {
      return res.status(400).json({ error: "Payment Intent already succeeded" });
    }

    console.log(`[XPay] Confirming Intent ${id} with card ending ${payment_method_data?.card?.number?.slice(-4)}`);

    // Simulate Processing
    // In a real scenario, this would contact Visa/Mastercard networks

    // Simulate Success
    intent.status = "succeeded";
    intent.payment_method = payment_method_data;
    intent.updated_at = new Date().toISOString();

    paymentIntents.set(id, intent);

    res.json({
      id: intent.id,
      status: "succeeded",
      amount: intent.amount,
      currency: intent.currency
    });

  } catch (err) {
    console.error("[XPay] Error confirming intent:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`XPay Service (Gateway) listening on http://localhost:${PORT}`);
});

