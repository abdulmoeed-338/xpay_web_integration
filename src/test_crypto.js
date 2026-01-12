const crypto = require('crypto');

const secretKey = "bf2526d2a4111e94e865be48794034bb8dce6362d03ae698fd81fc95ad71fce0";
const payload = {
    "order": {
        "id": "testOrder-007",
        "currency": "PKR",
        "order_amount": 20
    },
    "customer": {
        "name": "John",
        "email": "john@gmail.com",
        "phone": "12345678990"
    },
    "metadata": {
        "key": "value"
    },
    "description": "any description"
};

const fs = require('fs');
// Crucial: The string we sign MUST be the exact string sent in the body
const bodyString = JSON.stringify(payload);
const signature = crypto
    .createHmac("SHA256", secretKey)
    .update(bodyString)
    .digest("hex");

console.log("\n--- DEBUG INFO ---");
console.log("HMAC-SHA256 Signature:", signature);
console.log("Signed Body String:", bodyString);
console.log("------------------\n");

fs.writeFileSync('signature.txt', signature);
fs.writeFileSync('body.json', bodyString); // Save the exact body to verify
