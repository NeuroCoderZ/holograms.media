/**
 * Content Moderation - JavaScript Edition
 */

export function moderateContent(text) {
  const lowerText = text.toLowerCase();
  
  // Spam patterns
  const spamPatterns = [
    /\b(viagra|cialis|casino|lottery|winner)\b/i,
    /\b(click here|buy now|limited offer)\b/i,
    /(http|https):\/\/[^\s]+/g // Multiple URLs
  ];
  
  // Offensive patterns
  const offensivePatterns = [
    /\b(fuck|shit|bitch|asshole)\b/i,
    // Add more as needed
  ];
  
  // Check spam
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: 'Spam detected',
        category: 'spam'
      };
    }
  }
  
  // Check offensive
  for (const pattern of offensivePatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: 'Offensive language detected',
        category: 'offensive'
      };
    }
  }
  
  // Check excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 20) {
    return {
      safe: false,
      reason: 'Excessive caps lock',
      category: 'spam'
    };
  }
  
  return {
    safe: true,
    reason: null,
    category: null
  };
}
