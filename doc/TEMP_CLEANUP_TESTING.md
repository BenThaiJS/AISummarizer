/**
 * TEMP FILE & JOB CLEANUP FEATURE
 * 
 * This feature ensures that temporary files and old job records are cleaned up
 * to prevent disk space and memory issues.
 */

// ============================================
// 1. TEMPORARY FILE CLEANUP
// ============================================
// After each job completes (success or failure), the temp directory is deleted.
//
// Process:
// 1. Job starts → creates jobDir = temp/{jobId}/
// 2. Audio file downloaded to temp/{jobId}/audio.wav
// 3. Job completes or fails
// 4. cleanupJobDir() called automatically
// 5. Entire temp/{jobId}/ directory deleted recursively
// 6. Logged with "cleanupJobDir:success"
//
// Benefits:
// - Prevents accumulation of large audio files
// - Each YouTube video can be 50MB-500MB depending on length
// - Cleanup happens immediately after job completion
// - Errors during cleanup don't block job completion
//
// Location: server/workers/job.worker.js - cleanupJobDir()

// ============================================
// 2. JOB MEMORY CLEANUP
// ============================================
// Old job records are removed from memory to prevent memory leaks.
//
// Configuration:
// - Default TTL: 2 hours (7200000 ms)
// - Configurable via JOB_TTL environment variable
// - Cleanup interval: every 10 minutes
//
// Example:
// - Job created at 10:00 AM
// - Job TTL = 2 hours
// - At 12:00 PM, cleanup runs and deletes this job
// - Job stats in /health shows remaining jobs
//
// Location: server/jobs/jobs.store.js - cleanupOldJobs()

// ============================================
// 3. MONITORING & STATISTICS
// ============================================
// GET /health endpoint now includes job statistics.
//
// Response example:
// {
//   "status": "ok",
//   "whisper": "ready",
//   "ollama": "ready",
//   "jobs": {
//     "total": 5,
//     "byStatus": {
//       "completed": 3,
//       "failed": 1,
//       "downloading": 1
//     }
//   }
// }
//
// Check with: curl http://localhost:3000/health

// ============================================
// HOW TO TEST CLEANUP
// ============================================

// Test 1: Temp File Cleanup
// 1. Start server
// 2. Run a job with any YouTube URL
// 3. Wait for completion
// 4. Check: ls temp/ (or dir temp/ on Windows)
// 5. Temp directory should be EMPTY (no jobId folders)
// 6. Check server logs for: "cleanupJobDir:success"
// Expected: All audio files automatically deleted

// Test 2: Failed Job Cleanup
// 1. Submit invalid YouTube URL after URL validation passes
// 2. Job fails during download
// 3. Check temp directory - should still be EMPTY
// 4. Check logs for: "cleanupJobDir:success" even after error
// Expected: Temp files cleaned up even on failure

// Test 3: Multiple Job Cleanup
// 1. Submit 5 different YouTube URLs simultaneously
// 2. Let them all complete
// 3. Check temp/ directory - should be EMPTY
// 4. Check /health endpoint - all jobs should be in completed/failed state
// 5. temp/ should have zero or very few files
// Expected: All temp directories deleted despite concurrent jobs

// Test 4: Job Memory Cleanup (requires waiting)
// 1. Submit a job and let it complete
// 2. Immediately check /health
// 3. You should see 1 job in "completed" status
// 4. Wait 2 hours (or set JOB_TTL=5000 for 5 seconds in .env)
// 5. Wait for cleanup interval (10 minutes, or adjust in server.js)
// 6. Check /health again - job should be gone
// Expected: Job removed from memory after TTL expires

// Test 5: Check Disk Space Savings
// 1. Record disk free space before running jobs
// 2. Process 10 YouTube videos (each ~100MB-500MB)
// 3. Check disk space after all complete
// 4. Disk space should be nearly the same
// Expected: Disk space reclaimed after cleanup

// ============================================
// ENVIRONMENT VARIABLES
// ============================================

// JOB_TTL (optional)
// Time-to-live for job records in memory (milliseconds)
// Default: 7200000 (2 hours)
// Example: JOB_TTL=3600000 (1 hour)
// 
// Set in .env:
// JOB_TTL=3600000

// ============================================
// LOG MESSAGES TO WATCH FOR
// ============================================

// Successful temp cleanup:
// "cleanupJobDir:success" { dir: "temp/job-id" }

// Failed temp cleanup (non-blocking):
// "cleanupJobDir:error" { dir: "temp/job-id", err: "..." }

// Job memory cleanup:
// "cleanupOldJobs:deleted" { id: "job-id", age: "7200s" }
// "cleanupOldJobs:summary" { deleted: 5, remaining: 2 }

// Cleanup interval error:
// "Cleanup interval error" { err: "..." }

// ============================================
// FILE STRUCTURE AFTER CLEANUP
// ============================================

// Before cleanup:
// temp/
//   ├── job-id-1/
//   │   ├── audio.wav (150MB)
//   │   └── audio.m4a.ytdl
//   ├── job-id-2/
//   │   ├── audio.wav (200MB)
//   │   └── audio.m4a.ytdl
//   └── job-id-3/
//       ├── audio.wav (100MB)
//       └── audio.m4a.ytdl
//
// After cleanup:
// temp/
//   └── (empty or only active download in progress)

// ============================================
// PERFORMANCE IMPACT
// ============================================

// Positive:
// ✅ Disk space freed immediately after job
// ✅ Memory freed after TTL expires
// ✅ Server stays lean with many jobs
// ✅ No disk space warnings in production
// ✅ Periodic cleanup doesn't block operations

// Minimal negative:
// - Cleanup adds ~100ms per job (fs.rm operation)
// - Cleanup happens asynchronously, doesn't block job completion
// - Periodic cleanup loop runs every 10 minutes

// ============================================
// PRODUCTION BEST PRACTICES
// ============================================

// 1. Monitor /health endpoint regularly
//    curl http://localhost:3000/health
//
// 2. Adjust JOB_TTL based on your needs:
//    - Development: 1 hour
//    - Production: 24 hours (keep logs longer)
//
// 3. Monitor disk space
//    Watch for: du -sh temp/
//
// 4. Set up log rotation for server logs
//    Cleanup messages are logged for audit trail
//
// 5. Consider increasing cleanup interval if:
//    - You have high job throughput (>100/day)
//    - You want to keep old jobs for analytics
//    - Adjust CLEANUP_INTERVAL in server.js

// ============================================
// TROUBLESHOOTING
// ============================================

// Problem: Temp directory not being cleaned
// Solution: Check server logs for "cleanupJobDir:error"
//           Ensure tmp directory is writable: chmod 777 temp/
//           Check disk space isn't full

// Problem: Memory keeps growing
// Solution: Check /health to see job count
//           Reduce JOB_TTL if too many old jobs
//           Check if cleanup interval is running

// Problem: Jobs deleted too quickly
// Solution: Increase JOB_TTL in .env
//           Default 2 hours is reasonable
//           Analytics might need longer retention

// ============================================
// IMPLEMENTATION DETAILS
// ============================================

// Cleanup flow in job.worker.js:
// 1. try { ... process job ... }
// 2. finally or catch: await cleanupJobDir(jobDir)
// 3. cleanupJobDir uses fs.rm with recursive: true
// 4. Cleanup errors are logged but don't throw
// 5. Return Promise that resolves regardless

// Memory cleanup in jobs.store.js:
// 1. cleanupOldJobs() iterates all jobs
// 2. Checks: now - job.createdAt > JOB_TTL
// 3. Deletes job from Map
// 4. Logs each deletion
// 5. Returns count of deleted jobs

// Periodic cleanup in server.js:
// 1. setInterval(cleanupOldJobs, 10 minutes)
// 2. Wrapped in try-catch to prevent blocking
// 3. Errors logged but server continues
// 4. Safe to run even if no jobs exist
