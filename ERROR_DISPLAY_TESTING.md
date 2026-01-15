/**
 * ERROR DISPLAY FEATURE - Testing Guide
 * 
 * This document describes how error handling works in the YouTube Summarizer.
 * Errors can occur at different stages and are displayed appropriately to users.
 */

// ============================================
// 1. INPUT VALIDATION ERRORS (Pre-Job)
// ============================================
// These occur before the job is created.
// 
// Test cases:
// - Empty URL: Just show "URL is required"
// - Invalid URL: Show "Please enter a valid YouTube URL..."
// - Network error on POST: Show "Network error: ..."
//
// Location: App.jsx - ErrorMessage component
// UI: Red error box above the Summarize button
// 
// Example:
// Input: "not a url"
// Error: "Please enter a valid YouTube URL (youtube.com or youtu.be)"
// User can retry immediately

// ============================================
// 2. SERVER-SIDE VALIDATION ERRORS (During Job Creation)
// ============================================
// These occur when the server validates the URL.
//
// Test cases:
// - Invalid URL format from validator
// - Missing URL in request body
//
// Location: jobs.controller.js - createJob()
// Response: 400 status with error message
//
// Example:
// POST /api/jobs with { url: "https://malicious.com" }
// Response: { error: "Invalid YouTube URL. Please use youtube.com or youtu.be link" }
// UI: Shows error in red box

// ============================================
// 3. JOB EXECUTION ERRORS (During Processing)
// ============================================
// These occur during download, transcription, or summarization.
//
// Test cases to simulate:
// - Invalid YouTube URL (yt-dlp fails)
// - Network timeout
// - Ollama service not running
// - Whisper script error
//
// Location: job.worker.js - catch block
// Response: Job status set to "failed" with error message
// Broadcast: WebSocket sends { type: "job:update", job: { status: "failed", error: "..." } }
//
// Example:
// If yt-dlp fails: error = "yt-dlp failed (code=1): Video unavailable"
// If Ollama fails: error = "ollama error: 500 connection refused"
//
// UI: 
// - Progress component shows error state
// - Red error box with "⚠️ Job Failed" and error details
// - "← Try Another URL" button appears to reset
// - Cancel button is hidden

// ============================================
// 4. WEBSOCKET MESSAGE HANDLING
// ============================================
// The client receives job updates via WebSocket.
//
// Message format:
// { type: "job:update", job: { id, status, phase, error, ... } }
//
// When error is received:
// 1. Job status = "failed"
// 2. job.error = error message string
// 3. job.phase = "Error" or last phase attempted
// 4. Progress component renders error state
// 5. User sees red error box

// ============================================
// HOW TO TEST ERROR SCENARIOS
// ============================================

// Test 1: Invalid YouTube URL
// 1. Paste "https://google.com"
// 2. See client-side error appear immediately
// 3. Summarize button stays disabled
// Expected: Error message appears in red box

// Test 2: Job Download Failure
// 1. Paste a private or removed YouTube video URL
// 2. Click Summarize
// 3. Progress shows "Downloading"
// 4. After ~5 seconds, error appears
// Expected: 
// - Progress component shows error state (red background)
// - Error message displays: "yt-dlp failed..."
// - "← Try Another URL" button appears

// Test 3: Ollama Service Not Running
// 1. Stop Ollama service
// 2. Paste valid YouTube URL
// 3. Progress: Downloading → Transcribing → Summarizing
// 4. At Summarizing phase, error appears
// Expected:
// - Error message: "ollama error: connection refused"
// - Red error display in progress component

// Test 4: Retry After Error
// 1. Trigger any error
// 2. Click "← Try Another URL" button
// 3. Input field becomes available again
// Expected:
// - Job state cleared
// - Input field ready for new URL
// - Error messages cleared
// - Can submit new URL immediately

// ============================================
// ERROR COMPONENTS
// ============================================

// ErrorMessage (components/ErrorMessage.jsx)
// - Displays validation/network errors
// - Shows during input phase
// - Has dismiss button (optional)
// - Red background (#fee2e2)
// - Icon: ⚠️

// Progress component (components/Progress.jsx)
// - Detects when job.status === "failed"
// - Renders .error-display instead of progress bar
// - Shows error message from job.error
// - Hides cancel button during error state
// - Shows "⚠️ Job Failed" label

// App.jsx
// - Manages overall error flow
// - resetJob() clears state and WebSocket
// - Conditional rendering based on job.error

// ============================================
// CSS CLASSES FOR ERROR STATES
// ============================================

// .error-message - Input validation errors
// .error-container - Container for error message
// .error-header - Header with icon and title
// .error-title - "Error" text
// .error-text - Error message text
// .error-dismiss - Close button for error

// .progress.error-state - Progress component in error state
// .error-display - Error display inside progress
// .error-label - "⚠️ Job Failed" label
// .error-details - Detailed error message

// .retry-button - Button to reset and try again

// ============================================
// LOGGING
// ============================================

// Server-side errors are logged with:
// logger.warn("createJob:invalid_url", { url, error })
// logger.error("Job failed", { err: msg })
// 
// Check server logs to debug:
// - Invalid input validation
// - Job failures during processing
// - Error messages being sent to clients
