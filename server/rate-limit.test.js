#!/usr/bin/env node

/**
 * Rate Limit Testing Script
 * 
 * This script tests the rate limiting feature by making multiple rapid requests
 * to the /api/jobs endpoint.
 * 
 * Usage: node rate-limit.test.js [numRequests] [delayMs]
 * Examples:
 *   node rate-limit.test.js          # Default: 7 requests, 500ms delay
 *   node rate-limit.test.js 10       # 10 requests
 *   node rate-limit.test.js 10 1000  # 10 requests with 1s delay
 */

const http = require("http");

// Configuration
const SERVER_HOST = process.env.SERVER_HOST || "localhost";
const SERVER_PORT = process.env.SERVER_PORT || 3000;
const NUM_REQUESTS = parseInt(process.argv[2] || "7", 10);
const DELAY_MS = parseInt(process.argv[3] || "500", 10);

// Test URL (valid YouTube URL)
const TEST_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

console.log("\n🧪 Rate Limiting Test\n");
console.log(`Server: http://${SERVER_HOST}:${SERVER_PORT}`);
console.log(`Requests: ${NUM_REQUESTS}`);
console.log(`Delay between requests: ${DELAY_MS}ms`);
console.log(`URL: ${TEST_URL}\n`);
console.log("─".repeat(80));

/**
 * Make a POST request to create a job
 */
async function makeRequest(requestNum) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      url: TEST_URL,
    });

    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: "/api/jobs",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        const isRateLimited = statusCode === 429;

        // Parse response
        let response = {};
        try {
          response = JSON.parse(data);
        } catch (e) {
          response = { raw: data };
        }

        // Determine emoji based on status
        let emoji = "✅";
        if (isRateLimited) emoji = "🚫";
        else if (!isSuccess) emoji = "❌";

        // Display result
        console.log(`\nRequest ${requestNum}:`);
        console.log(`  Status: ${statusCode} ${emoji}`);

        if (isSuccess) {
          console.log(`  Job ID: ${response.id}`);
          console.log(`  Phase: ${response.phase}`);
        } else if (isRateLimited) {
          console.log(`  ⚠️  RATE LIMITED!`);
          console.log(`  Message: ${response.message}`);
          console.log(`  Retry After: ${response.retryAfter} seconds`);
        } else {
          console.log(`  Error: ${response.error || "Unknown error"}`);
          console.log(`  Message: ${response.message || data}`);
        }

        // Show rate limit headers
        const rlLimit = res.headers["ratelimit-limit"];
        const rlRemaining = res.headers["ratelimit-remaining"];
        const rlReset = res.headers["ratelimit-reset"];

        if (rlLimit) {
          console.log(`  Rate Limit Info:`);
          console.log(`    Limit: ${rlLimit} requests`);
          console.log(`    Remaining: ${rlRemaining}`);
          if (rlReset) {
            const resetTime = new Date(parseInt(rlReset) * 1000);
            console.log(`    Reset at: ${resetTime.toLocaleTimeString()}`);
          }
        }

        resolve({ statusCode, isRateLimited, response });
      });
    });

    req.on("error", (err) => {
      console.error(`\nRequest ${requestNum}: ❌ CONNECTION ERROR`);
      console.error(`  ${err.message}`);
      resolve({ statusCode: 0, error: err.message });
    });

    // Set timeout
    req.setTimeout(5000);

    req.write(postData);
    req.end();
  });
}

/**
 * Main test loop
 */
async function runTests() {
  const results = [];

  for (let i = 1; i <= NUM_REQUESTS; i++) {
    const result = await makeRequest(i);
    results.push(result);

    // Delay before next request (except for last one)
    if (i < NUM_REQUESTS) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  // Summary
  console.log("\n" + "─".repeat(80));
  console.log("\n📊 Summary:");

  const successful = results.filter((r) => r.statusCode >= 200 && r.statusCode < 300).length;
  const rateLimited = results.filter((r) => r.isRateLimited).length;
  const failed = results.filter((r) => r.statusCode >= 400 && !r.isRateLimited).length;

  console.log(`  ✅ Successful: ${successful}`);
  console.log(`  🚫 Rate Limited: ${rateLimited}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (rateLimited > 0) {
    console.log("\n✅ Rate limiting is working correctly!");
    console.log(`   Default limit: 5 requests per 15 minutes`);
    console.log(
      `   Configure with RATE_LIMIT_JOBS environment variable`
    );
  } else if (successful === NUM_REQUESTS) {
    console.log("\nℹ️  No rate limit hit (all requests succeeded)");
    console.log("   Try increasing NUM_REQUESTS to hit the limit");
    console.log("   Or reduce DELAY_MS to send requests faster");
  }

  console.log("\n");
}

// Run tests
runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
