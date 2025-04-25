/**
 * Security utility functions for the NFT minting application
 * Provides input validation, transaction security checks, and other security-related utilities
 */

// Maximum size for NFT image files (10MB)
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// Allowed image MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

// Metadata content security constraints
export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Validate image file before uploading
 * @param file - The file to validate
 * @returns Object containing validation result and any error message
 */
export const validateImageFile = (file: File) => {
  // Check if file exists
  if (!file) {
    return { isValid: false, error: "Không tìm thấy file" };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { 
      isValid: false, 
      error: `File quá lớn. Kích thước tối đa là ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB` 
    };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: "Định dạng file không được hỗ trợ. Vui lòng sử dụng JPEG, PNG, GIF, WebP, hoặc SVG" 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Sanitize text input to prevent XSS attacks
 * @param input - The input text to sanitize
 * @returns Sanitized text
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validate NFT metadata before submission
 * @param name - NFT name
 * @param description - NFT description
 * @returns Object containing validation result and any error message
 */
export const validateMetadata = (name: string, description: string) => {
  // Check name
  if (!name || name.trim() === '') {
    return { isValid: false, error: "Tên NFT không được để trống" };
  }
  
  if (name.length > MAX_NAME_LENGTH) {
    return { 
      isValid: false, 
      error: `Tên NFT không được vượt quá ${MAX_NAME_LENGTH} ký tự` 
    };
  }
  
  // Check description
  if (!description || description.trim() === '') {
    return { isValid: false, error: "Mô tả NFT không được để trống" };
  }
  
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { 
      isValid: false, 
      error: `Mô tả NFT không được vượt quá ${MAX_DESCRIPTION_LENGTH} ký tự` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Check if an Ethereum address is valid
 * @param address - Ethereum address to check
 * @returns Whether the address is valid
 */
export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Check if a wallet is potentially compromised or on a blocklist
 * Note: In a production system, this would connect to a real-time API service
 * @param address - Ethereum address to check
 * @returns Promise resolving to whether the wallet is safe
 */
export const checkWalletSecurity = async (address: string): Promise<{ isSafe: boolean, reason?: string }> => {
  try {
    // For a real implementation, you would call a security API service here
    // This is a placeholder that always returns safe for demo purposes
    
    // Example of how this would work with an API:
    // const response = await fetch(`https://api.securityservice.com/check/${address}`);
    // const data = await response.json();
    // return { isSafe: data.isSafe, reason: data.reason };
    
    return { isSafe: true };
  } catch (error) {
    console.error("Error checking wallet security:", error);
    return { isSafe: true }; // Fail open for demo purposes, but consider failing closed in production
  }
};

/**
 * Check transaction parameters for suspicious activity
 * @param recipientAddress - Transaction recipient
 * @param value - Transaction value
 * @returns Whether the transaction seems safe
 */
export const isSuspiciousTransaction = (recipientAddress: string, value: bigint): boolean => {
  // In a real security system, you would have more complex rules,
  // possibly integrating with external APIs
  
  // For demo purposes, we'll just check if the address is valid
  if (!isValidEthereumAddress(recipientAddress)) {
    return true; // Suspicious if invalid address
  }
  
  // For demo purposes we'll assume all other transactions are safe
  return false;
};

/**
 * Generate a secure nonce for transaction validation
 * @returns A secure random nonce
 */
export const generateTransactionNonce = (): string => {
  // Generate a random string for transaction nonce
  const randomArray = new Uint8Array(16);
  window.crypto.getRandomValues(randomArray);
  return Array.from(randomArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Verify IPFS URL integrity by checking hash format
 * @param ipfsUrl - IPFS URL to verify
 * @returns Whether the IPFS URL appears valid
 */
export const isValidIPFSUrl = (ipfsUrl: string): boolean => {
  if (!ipfsUrl) return false;
  
  // Check if it's in ipfs:// format
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.substring(7);
    // Simple check for CID format - in a real app you might want more sophisticated validation
    return cid.length >= 40;
  }
  
  // Check for IPFS gateway URLs
  if (
    ipfsUrl.includes('ipfs.io/ipfs/') || 
    ipfsUrl.includes('w3s.link/ipfs/') ||
    ipfsUrl.includes('cloudflare-ipfs.com/ipfs/')
  ) {
    const parts = ipfsUrl.split('/ipfs/');
    return parts.length === 2 && parts[1].length >= 40;
  }
  
  return false;
};

/**
 * Create Content Security Policy headers for frontend
 * @returns CSP header string
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: w3s.link ipfs.io cloudflare-ipfs.com; " +
      "connect-src 'self' *.infura.io w3s.link ipfs.io api.web3.storage; " +
      "frame-ancestors 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self';",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
};