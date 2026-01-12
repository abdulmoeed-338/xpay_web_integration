const crypto = require('crypto');

/**
 * Generates an HMAC-SHA256 signature for a given payload.
 * 
 * @param {object} payload - The JSON object to sign.
 * @param {string} secretKey - The secret key used for the HMAC.
 * @returns {string} - The hex-encoded signature.
 */
function generateSignature(payload, secretKey) {
    return crypto
        .createHmac("SHA256", secretKey)
        .update(JSON.stringify(payload))
        .digest("hex");
}

/*
// Usage Example from User Request:
const secret = "b5439d231da9463f710528542d56e7625793d05b77a9bf1020f9842507af2e89"; // User provided key
const payload = {
    amount: 1,
    currency: "PKR",
    payment_method_types: "card",
    customer: {
      email: "",
      name: "",
      phone: "",
    },
    shipping: {
      address1: "",
      city: "",
      country: "",
      province: "",
      zip: "",
    },
    "metadata": {
      order_reference: ""
    }
};

const signature = generateSignature(payload, secret);
console.log("Signature:", signature);
*/

module.exports = { generateSignature };
