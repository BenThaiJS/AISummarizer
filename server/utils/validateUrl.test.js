/**
 * Simple test for URL validation
 * Run with: node server/utils/validateUrl.test.js
 */

const { validateYouTubeURL } = require('./validateUrl');

const testCases = [
  // Valid URLs
  { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: true, description: 'Valid YouTube video URL (full)' },
  { url: 'https://youtu.be/dQw4w9WgXcQ', expected: true, description: 'Valid YouTube short URL' },
  { url: 'youtube.com/watch?v=dQw4w9WgXcQ', expected: true, description: 'Valid YouTube URL (no https)' },
  { url: 'www.youtube.com/watch?v=dQw4w9WgXcQ', expected: true, description: 'Valid YouTube URL (with www)' },
  { url: 'https://www.youtube.com/@username', expected: true, description: 'Valid YouTube channel URL' },
  { url: 'https://www.youtube.com/channel/UCxxxxxxxxxxxxxxx', expected: true, description: 'Valid YouTube channel URL (old format)' },
  { url: 'https://www.youtube.com/playlist?list=PLxxxxxxx', expected: true, description: 'Valid YouTube playlist URL' },
  
  // Invalid URLs
  { url: '', expected: false, description: 'Empty string' },
  { url: '   ', expected: false, description: 'Whitespace only' },
  { url: null, expected: false, description: 'Null value' },
  { url: 'https://www.google.com/search?q=test', expected: false, description: 'Google URL' },
  { url: 'https://www.facebook.com/video', expected: false, description: 'Facebook URL' },
  { url: 'not a url at all', expected: false, description: 'Invalid URL format' },
  { url: 'https://youtube.com/watch?v=short', expected: false, description: 'Invalid video ID (too short)' },
];

let passed = 0;
let failed = 0;

console.log('\n🧪 Running URL Validation Tests...\n');

testCases.forEach((testCase, index) => {
  const result = validateYouTubeURL(testCase.url);
  const success = result.isValid === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1} PASSED: ${testCase.description}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1} FAILED: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result.isValid}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

process.exit(failed > 0 ? 1 : 0);
