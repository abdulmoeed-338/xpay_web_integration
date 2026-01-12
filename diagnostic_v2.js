const http = require('http');

function check(port, path, method, payload, label) {
    const options = {
        hostname: 'localhost',
        port: port,
        path: path,
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
        console.log(`[${label}] ${port}${path}: ${res.statusCode}`);
        res.resume(); // consume 
    });

    req.on('error', (e) => {
        console.log(`[${label}] ${port}: FAILED (Connection Error)`);
    });

    if (payload) req.write(payload);
    req.end();
}

console.log('--- Checking Services ---');
// 1. Check Frontend (New Route)
check(3000, '/api/create-payment-intent', 'POST', JSON.stringify({ amount: 100, currency: 'USD' }), 'Frontend');

// 2. Check Backend (New Route)
check(4001, '/api/create-payment-intent', 'POST', JSON.stringify({ amount: 100, currency: 'USD' }), 'Backend');

// 3. Check Gateway (New Route)
check(4002, '/api/v1/payment_intents', 'POST', JSON.stringify({ amount: 100, currency: 'USD' }), 'Gateway');
