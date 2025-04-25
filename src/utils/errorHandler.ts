/**
 * Error handling utilities for the NFT minting application
 */

/**
 * Formats blockchain error messages to be more user-friendly
 * @param error - The error object from ethers or other blockchain interactions
 * @returns A user-friendly error message
 */
export const formatBlockchainError = (error: any): string => {
  const errorMessage = error?.message || String(error);
  
  // Common MetaMask / wallet errors
  if (errorMessage.includes('user rejected transaction')) {
    return 'Giao dịch đã bị từ chối. Vui lòng xác nhận giao dịch trong ví của bạn.';
  }
  
  if (errorMessage.includes('insufficient funds')) {
    return 'Số dư tài khoản không đủ để thực hiện giao dịch. Vui lòng nạp thêm ETH.';
  }
  
  if (errorMessage.includes('gas required exceeds allowance')) {
    return 'Phí gas vượt quá giới hạn. Vui lòng tăng giới hạn gas hoặc chờ khi phí gas giảm.';
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại kết nối internet hoặc thử lại sau.';
  }
  
  // Contract errors
  if (errorMessage.includes('execution reverted')) {
    const revertReason = errorMessage.match(/reverted with reason string '(.+?)'/);
    if (revertReason && revertReason[1]) {
      return `Smart contract từ chối giao dịch: ${revertReason[1]}`;
    }
    return 'Smart contract từ chối giao dịch. Vui lòng kiểm tra lại các tham số.';
  }
  
  // Wallet connection errors
  if (errorMessage.includes('provider is disconnected') || errorMessage.includes('no provider')) {
    return 'Không thể kết nối với ví. Vui lòng đảm bảo MetaMask hoặc ví tương thích đã được cài đặt và mở.';
  }
  
  return `Lỗi: ${errorMessage}`;
};

/**
 * Logs detailed error information to console for debugging
 * @param error - The error object
 * @param context - Additional context about where the error occurred
 */
export const logErrorDetails = (error: any, context: string): void => {
  console.error(`=== Error in ${context} ===`);
  console.error('Error message:', error?.message);
  console.error('Error details:', error);
  
  // Log additional transaction details if available
  if (error?.transaction) {
    console.error('Transaction data:', error.transaction);
  }
  
  // Log receipt if available (for transaction failures)
  if (error?.receipt) {
    console.error('Transaction receipt:', error.receipt);
  }
  
  console.error('========================');
};