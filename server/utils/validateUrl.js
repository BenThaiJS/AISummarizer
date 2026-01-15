/**
 * Validates if a string is a valid YouTube URL
 * @param {string} url - The URL to validate
 * @returns {object} { isValid: boolean, error: string|null }
 */
function validateYouTubeURL(url) {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();

  if (!trimmed) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  // YouTube URL patterns
  const youtubePatterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]{11}/i,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]{11}/i,
    /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+/i,
    /^(https?:\/\/)?(www\.)?youtube\.com\/channel\/[\w-]+/i,
    /^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i,
  ];

  const isValid = youtubePatterns.some((pattern) => pattern.test(trimmed));

  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid YouTube URL. Please use youtube.com or youtu.be link',
    };
  }

  // Additional check: try to parse as URL to catch malformed URLs
  // Add protocol if missing for parsing
  try {
    const urlWithProtocol = trimmed.startsWith('http') ? trimmed : 'https://' + trimmed;
    const urlObj = new URL(urlWithProtocol);
    if (!['youtube.com', 'youtu.be', 'www.youtube.com'].includes(urlObj.hostname)) {
      return {
        isValid: false,
        error: 'URL must be from youtube.com or youtu.be',
      };
    }
  } catch (e) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  return { isValid: true, error: null };
}

module.exports = { validateYouTubeURL };
