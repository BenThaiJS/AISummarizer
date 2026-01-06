const http = require('http');

function postSummarize(url) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ url });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/summarize',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed);
            } catch (e) {
              reject(new Error('Failed to parse response: ' + e.message));
            }
          } else {
            reject(new Error('Summarize POST failed: ' + res.statusCode + ' ' + body));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function listenProgress(jobId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/progress/${jobId}`,
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
    };

    const req = http.request(options, (res) => {
      res.setEncoding('utf8');
      let buffer = '';
      console.log('Connected to progress stream for job', jobId);

      res.on('data', (chunk) => {
        buffer += chunk;
        // process complete SSE messages
        let parts = buffer.split('\n\n');
        while (parts.length > 1) {
          const msg = parts.shift();
          buffer = parts.join('\n\n');

          const lines = msg.split('\n').map(l => l.trim());
          let ev = null;
          let data = null;
          lines.forEach((l) => {
            if (l.startsWith('event:')) ev = l.replace(/^event:\s*/, '');
            else if (l.startsWith('data:')) data = l.replace(/^data:\s*/, '');
          });

          if (data) {
            try {
              const obj = JSON.parse(data);
              console.log('EVENT', ev, JSON.stringify(obj));
              if (ev === 'done') {
                resolve(obj);
              }
            } catch (e) {
              console.log('EVENT', ev, data);
            }
          }
        }
      });

      res.on('end', () => reject(new Error('Progress connection ended')));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const target = process.argv[2] || 'https://www.youtube.com/watch?v=dxpoZszI-9I';
    console.log('Posting summarize for', target);
    const resp = await postSummarize(target);
    console.log('Server response:', resp);
    const jobId = resp.jobId;
    const done = await listenProgress(jobId);
    console.log('Final result:', done);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
