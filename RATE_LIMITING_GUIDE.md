/**
 * RATE LIMITING FEATURE - Testing & Configuration Guide
 * 
 * Rate limiting protects your server from abuse and ensures fair resource distribution.
 */

// ============================================
// 1. DEFAULT RATE LIMIT SETTINGS
// ============================================

// POST /api/jobs (Job Creation - MOST LIMITED)
// Default: 5 requests per 15 minutes per IP
// Why: Each job is resource-intensive (download + transcribe + summarize)
// Recovery time: 3 minutes between jobs on average

// GET /api/jobs/:id (Status Query - LIGHTER LIMIT)
// Default: 30 requests per 15 minutes per IP
// Why: Read-only, cheap operation (just returns data)
// Use case: Checking job progress every few seconds is fine

// POST /api/jobs/:id/cancel (Job Cancellation - SAME AS CREATION)
// Default: 5 requests per 15 minutes per IP
// Why: State-modifying operation, should be limited like creation

// ============================================
// 2. ENVIRONMENT VARIABLES (CONFIGURATION)
// ============================================

// Configure rate limits via environment variables:
// Format: "max_requests/time_window"
// Time windows: s (seconds), m (minutes), h (hours), d (days)

// Examples:
// RATE_LIMIT_JOBS=5/15m      (5 requests per 15 minutes)
// RATE_LIMIT_JOBS=10/1h      (10 requests per 1 hour)
// RATE_LIMIT_JOBS=2/10m      (2 requests per 10 minutes)
// RATE_LIMIT_QUERY=30/15m    (30 requests per 15 minutes)

// Set in .env file:
// RATE_LIMIT_JOBS=5/15m
// RATE_LIMIT_QUERY=30/15m

// ============================================
// 3. HTTP RESPONSE ON RATE LIMIT
// ============================================

// When rate limit is exceeded, you get HTTP 429:
// {
//   "error": "Too many requests",
//   "message": "Rate limit exceeded. Maximum 5 requests per 15 minutes.",
//   "retryAfter": 900  // seconds to wait before retry
// }

// Headers are also returned:
// RateLimit-Limit: 5
// RateLimit-Remaining: 0
// RateLimit-Reset: 1705265400 (Unix timestamp)

// ============================================
// 4. TESTING RATE LIMITING
// ============================================

// Test 1: Basic Rate Limit Test
// 1. Open terminal
// 2. Run this command 6 times:
//
//    curl -X POST http://localhost:3000/api/jobs \
//      -H "Content-Type: application/json" \
//      -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
//
// Expected:
// - Requests 1-5: Success (201 or 200)
// - Request 6: HTTP 429 Too Many Requests
// - Error message: "Maximum 5 requests per 15 minutes"

// Test 2: Query Rate Limit (Should be higher)
// 1. Get a valid job ID from Test 1
// 2. Run this command 31 times:
//
//    curl http://localhost:3000/api/jobs/{jobId}
//
// Expected:
// - Requests 1-30: Success (200)
// - Request 31: HTTP 429
// - Message: "Maximum 30 requests per 15 minutes"

// Test 3: Rate Limit Reset
// 1. Hit rate limit (submit 5 jobs)
// 2. Try to submit another job → 429
// 3. Wait 15 minutes
// 4. Submit job again → Success
// Expected: After time window expires, counter resets

// Test 4: Multiple IPs (if testing with multiple machines)
// 1. From IP 192.168.1.100 → Submit 5 jobs → 6th blocked
// 2. From IP 192.168.1.101 → Submit 5 jobs → All succeed
// Expected: Each IP has independent rate limit counter

// ============================================
// 5. SCRIPTED TESTING
// ============================================

// Test script (Node.js):
/*
const http = require('http');

async function testRateLimit() {
  for (let i = 1; i <= 7; i++) {
    try {
      const response = await fetch('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' 
        })
      });

      const data = await response.json();
      console.log(`Request ${i}: ${response.status}`, 
        response.status === 429 ? `- RATE LIMITED! ${data.message}` : 
        `- Success! Job ID: ${data.id}`
      );

      // Show rate limit headers
      console.log(`  RateLimit-Remaining: ${response.headers.get('RateLimit-Remaining')}`);
      console.log(`  RateLimit-Reset: ${response.headers.get('RateLimit-Reset')}`);
    } catch (err) {
      console.error(`Request ${i}: ERROR -`, err.message);
    }

    // Wait 1 second between requests
    await new Promise(r => setTimeout(r, 1000));
  }
}

testRateLimit();
*/

// Run with: node test-rate-limit.js

// ============================================
// 6. MONITORING RATE LIMIT EVENTS
// ============================================

// Check server logs for rate limit events:
// 
// When limit is exceeded, you'll see:
// logger.warn("rateLimit:exceeded", {
//   ip: "192.168.1.100",
//   endpoint: "/api/jobs",
//   method: "POST"
// })
//
// Watch logs to see:
// - Which IPs are hitting limits
// - Which endpoints are most limited
// - Patterns of potential abuse

// ============================================
// 7. ADJUSTING LIMITS FOR YOUR NEEDS
// ============================================

// Development:
// RATE_LIMIT_JOBS=100/1h    (More relaxed for testing)
// RATE_LIMIT_QUERY=100/1h

// Small Deployment (few users):
// RATE_LIMIT_JOBS=10/1h     (10 jobs per hour per user)
// RATE_LIMIT_QUERY=60/1h    (60 status checks per hour)

// Medium Deployment (moderate users):
// RATE_LIMIT_JOBS=5/15m     (Default - 20 jobs per hour)
// RATE_LIMIT_QUERY=30/15m   (Default - 120 checks per hour)

// High Load Deployment (many users):
// RATE_LIMIT_JOBS=3/15m     (Stricter - 12 jobs per hour)
// RATE_LIMIT_QUERY=20/15m   (Stricter - 80 checks per hour)

// Very Restrictive (prevent abuse):
// RATE_LIMIT_JOBS=1/1h      (Only 1 job per hour)
// RATE_LIMIT_QUERY=5/1h     (Only 5 checks per hour)

// ============================================
// 8. HANDLING RATE LIMIT IN FRONTEND
// ============================================

// When user hits rate limit, frontend gets 429:
// 
// {
//   "error": "Too many requests",
//   "message": "Rate limit exceeded. Maximum 5 requests per 15 minutes.",
//   "retryAfter": 900
// }
//
// Client should:
// 1. Display error message to user
// 2. Show retry timer (900 seconds = 15 minutes)
// 3. Disable submit button for retryAfter seconds
// 4. Auto-enable button after cooldown expires

// Example implementation:
/*
if (response.status === 429) {
  const data = await response.json();
  const retryAfter = data.retryAfter || 900;
  
  setError(data.message);
  setRetryCountdown(retryAfter);
  
  // Disable button for retryAfter seconds
  const interval = setInterval(() => {
    setRetryCountdown(prev => {
      if (prev <= 1) {
        clearInterval(interval);
        setError(""); // Clear error
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
}
*/

// ============================================
// 9. WHAT GETS RATE LIMITED
// ============================================

// RATE LIMITED (5/15min):
// ✅ POST /api/jobs              - Create new job
// ✅ POST /api/jobs/:id/cancel   - Cancel job

// LIGHTER RATE LIMIT (30/15min):
// ✅ GET /api/jobs/:id           - Get job status

// NOT RATE LIMITED:
// ✅ GET /health                 - Health check (skipped in middleware)

// ============================================
// 10. PRODUCTION BEST PRACTICES
// ============================================

// 1. Set realistic limits based on your capacity
//    - Too strict: Users frustrated
//    - Too relaxed: Vulnerable to abuse

// 2. Monitor hit rates
//    Watch logs for who's hitting limits
//    Adjust if legitimate users are blocked

// 3. Consider IP whitelist for internal services
//    Frontend on same domain shouldn't be limited
//    (Can configure this in middleware if needed)

// 4. Log all rate limit events
//    Helps identify abuse patterns
//    Can use logs to train ML models for detection

// 5. Set rate limit headers in responses
//    Clients can see: Remaining requests, Reset time
//    Helps build better client-side UX

// 6. Consider authenticated users
//    Future: Premium users might have higher limits
//    Anonymous: Strict limits
//    Premium: Relaxed limits

// ============================================
// 11. RATE LIMIT BYPASS (CAUTION!)
// ============================================

// The middleware skips rate limiting for:
// - GET /health (health checks shouldn't be limited)
//
// If you need to bypass rate limiting:
// - Add IP whitelist (internal services)
// - Add authentication check (trusted users)
// - Add API key system (partners)
//
// Example (don't add unless needed):
// skip: (req) => {
//   return req.path === "/health" ||
//          req.ip === "127.0.0.1" ||  // localhost
//          req.headers['x-api-key'] === process.env.INTERNAL_API_KEY;
// }

// ============================================
// 12. TROUBLESHOOTING
// ============================================

// Problem: Getting 429 too often as user
// Solution: Increase RATE_LIMIT_JOBS in .env
//           Check if multiple tabs/devices are submitting
//           Contact admin for higher limits if premium

// Problem: Not seeing rate limit take effect
// Solution: Check server was restarted after .env change
//           Clear browser cache (old responses might be cached)
//           Check IP address - multiple users from same IP share limit

// Problem: Rate limit not resetting
// Solution: Default window is 15 minutes
//           Wait full time window for counter to reset
//           Or check RATE_LIMIT_JOBS env var format

// Problem: Some endpoints not rate limited
// Solution: Only POST /api/jobs and GET /api/jobs/:id are limited
//           Other endpoints can be added if needed

// ============================================
// 13. RATE LIMIT HEADERS EXPLAINED
// ============================================

// RateLimit-Limit: 5
// Total requests allowed in time window

// RateLimit-Remaining: 3
// How many requests left before hitting limit

// RateLimit-Reset: 1705265400
// Unix timestamp when counter resets

// Example curl output:
// $ curl -v http://localhost:3000/api/jobs \
//    -H "Content-Type: application/json" \
//    -d '{"url":"..."}'
//
// ...
// RateLimit-Limit: 5
// RateLimit-Remaining: 4
// RateLimit-Reset: 1705265400
// ...
//
// Shows: Out of 5 requests allowed, 4 remaining, resets at timestamp

// ============================================
// 14. BYPASSING FOR TESTING (DEV ONLY!)
// ============================================

// To disable rate limiting temporarily during development:
// 1. Comment out the rate limiter middleware in routes
// 2. Or set extremely high limits:
//    RATE_LIMIT_JOBS=10000/1h
//    RATE_LIMIT_QUERY=10000/1h
//
// WARNING: Never disable in production!
