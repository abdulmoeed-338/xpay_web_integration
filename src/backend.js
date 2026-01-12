const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch-commonjs"); // Ensure fetch is available in older Node envs if unrelated to browser context

const crypto = require("crypto");
const app = express();
const PORT = process.env.BACKEND_PORT || 4001;

// XPay Real Credentials (Staging) - Load from environment variables
const XPAY_CONFIG = {
  URL: process.env.XPAY_URL || "https://xstak-pay-stg.xstak.com",
  API_KEY: process.env.XPAY_API_KEY || "",
  ACCOUNT_ID: process.env.XPAY_ACCOUNT_ID || "",
  HMAC_SECRET: process.env.XPAY_HMAC_SECRET || "",
  GATEWAY_ID: process.env.XPAY_GATEWAY_ID || ""
};

/**
 * Generates an HMAC-SHA256 signature for the request body.
 */
function generateSignature(body) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return crypto
    .createHmac("SHA256", XPAY_CONFIG.HMAC_SECRET)
    .update(payload)
    .digest("hex");
}

app.use(cors());
app.use(express.json());

// In-memory Order Database
const orders = [];

// 1. Create Payment Intent (Called by Frontend)
app.post("/api/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency, customer, shipping, metadata, orderId } = req.body;

    console.log(`[Backend] Requesting Real Payment Intent for ${amount} ${currency}`);

    const payload = {
      amount: amount,
      currency: currency || "PKR",
      payment_method_types: "card",
      customer: customer || { name: "", email: "", phone: "" },
      shipping: shipping || { address1: "", city: "", country: "", province: "", zip: "" },
      gateway_instance_id: XPAY_CONFIG.GATEWAY_ID,
      capture_method: "automatic",
      metadata: { ...metadata, order_id: orderId } // Attach our order ID to XPay metadata
    };

    const signature = generateSignature(payload);

    console.log("[Backend] Payload for signing:", JSON.stringify(payload));
    console.log("[Backend] Generated signature:", signature);

    // Call Real XPay Gateway
    const xpayRes = await fetch(`${XPAY_CONFIG.URL}/public/v1/payment/intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": XPAY_CONFIG.API_KEY,
        "x-account-id": XPAY_CONFIG.ACCOUNT_ID,
        "x-signature": signature
      },
      body: JSON.stringify(payload),
    });

    const responseText = await xpayRes.text();
    console.log("[Backend] XPay Raw Response:", responseText);

    let intentData;
    try {
      intentData = JSON.parse(responseText);
    } catch (e) {
      console.error("[Backend] Failed to parse XPay response:", responseText);
      throw new Error(`Invalid JSON from XPay: ${responseText.substring(0, 100)}`);
    }

    if (!xpayRes.ok) {
      console.error("[Backend] XPay API Error Body:", intentData);
      throw new Error(intentData.message || intentData.error || `XPay Error: ${xpayRes.status}`);
    }

    // Return the secret to the frontend - mapping for XPay V1 Response structure
    res.json({
      clientSecret: intentData.data.pi_client_secret,
      id: intentData.data._id,
      orderId: orderId || "ORD-" + Math.random().toString(36).substr(2, 9).toUpperCase(), // Never fallback to XPay ID
      amount: intentData.data.amount,
      currency: intentData.data.currency || "PKR",
      encryptionKey: intentData.data.encryptionKey
    });

  } catch (err) {
    console.error("[Backend] Error creating intent:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Create Order (Called by Frontend after SDK success)
app.post("/api/create-order", async (req, res) => {
  try {
    const { paymentIntentId, orderDetails, paymentMethod, orderId } = req.body;

    console.log(`[Backend] Finalizing order. Method: ${paymentMethod || 'Card'}`);

    let amount = 0;
    let status = "pending";

    // Handle Card Payment (Verification Required with real XPay)
    if (!paymentMethod || paymentMethod === 'Card') {
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Missing payment intent ID" });
      }

      console.log(`[Backend] Verifying Real Intent: ${paymentIntentId}`);

      // Verify with XPay
      const xpayRes = await fetch(`${XPAY_CONFIG.URL}/public/v1/payment/intent/details/${paymentIntentId}`, {
        headers: {
          "x-api-key": XPAY_CONFIG.API_KEY,
          "x-account-id": XPAY_CONFIG.ACCOUNT_ID
        }
      });

      if (!xpayRes.ok) {
        return res.status(400).json({ error: "Failed to verify transaction with XPay" });
      }

      const intentData = await xpayRes.json();
      const pi = intentData.data;

      if (pi.pi_status !== "succeeded") {
        return res.status(400).json({ error: "Payment has not been confirmed yet. Current status: " + pi.pi_status });
      }

      amount = pi.amount;
      status = "paid";
    }
    // Handle COD (Same as before)
    else if (paymentMethod === 'COD') {
      if (orderDetails && orderDetails.items) {
        amount = Math.round(orderDetails.items.reduce((sum, item) => sum + item.price, 0));
      }
      status = "cod_pending";
    }

    // Payment is verified! Create the order.
    const newOrder = {
      orderId: orderId || "ord_" + Date.now(),
      paymentIntentId: paymentIntentId || null,
      paymentMethod: paymentMethod || 'Card',
      amount: amount,
      status: status,
      createdAt: new Date(),
      customer: orderDetails?.customer || "Guest"
    };

    orders.push(newOrder);

    // Log customer details if available
    const customerName = orderDetails?.customer?.name || orderDetails?.customer || "Guest";
    console.log(`[Backend] Order Created: ${newOrder.orderId} for ${customerName} (${newOrder.paymentMethod})`);

    res.json({ success: true, order: newOrder });

  } catch (err) {
    console.error("[Backend] Error processing order:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", backend: "running", ordersCount: orders.length });
});

app.listen(PORT, () => {
  console.log(`Backend Service (Merchant) listening on http://localhost:${PORT}`);
});
