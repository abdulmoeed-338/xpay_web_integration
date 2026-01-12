const crypto = require('crypto');

const secretHex = "b5439d231da9463f710528542d56e7625793d05b77a9bf1020f9842507af2e89";
const payload = { "amount": 100, "currency": "PKR", "payment_method_types": "card", "customer": { "name": "", "email": "", "phone": "" }, "shipping": { "address1": "", "city": "", "country": "", "province": "", "zip": "" }, "metadata": { "order_reference": "", "rule_attribute": "", "continue_payment": true, "attachBinDiscountIdToToken": true }, "gateway_instance_id": "", "capture_method": "automatic" };

const payloadString = JSON.stringify(payload);

// Variation 1: Key as a literal string
const sigString = crypto.createHmac('sha256', secretHex).update(payloadString).digest('hex');

// Variation 2: Key as a hex-decoded Buffer (Treating the 64-char string as raw bytes)
const sigHex = crypto.createHmac('sha256', Buffer.from(secretHex, 'hex')).update(payloadString).digest('hex');

const fs = require('fs');
const results = `
1. Key as String: ${sigString}
2. Key decoded as Hex: ${sigHex}
`;
console.log(results);
fs.writeFileSync('signatures.txt', results);
