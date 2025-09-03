/**
 * Utility function to generate unique receipt IDs
 * Centralized to avoid duplication across multiple files
 */
function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

module.exports = generateReceiptId;
