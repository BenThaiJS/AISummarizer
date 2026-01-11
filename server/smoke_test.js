const http = require('http');

function getHealth() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000/health', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: d }));
    }).on('error', reject).setTimeout(3000, () => reject(new Error('timeout')));
  });
}

function postJobEmpty() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({});
    const opts = { hostname: 'localhost', port: 5000, path: '/api/jobs', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Running smoke tests...');
  try {
    const h = await getHealth();
    console.log('GET /health ->', h.statusCode, h.body);
  } catch (e) {
    console.error('GET /health failed:', e.message);
  }

  try {
    const p = await postJobEmpty();
    console.log('POST /api/jobs (empty body) ->', p.statusCode, p.body);
  } catch (e) {
    console.error('POST /api/jobs failed:', e.message);
  }
})();
