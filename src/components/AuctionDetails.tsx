import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { getAuctionDetails, placeBid, endAuction, cancelAuction, withdrawFunds } from '../utils/contract';
import { handleError } from '../utils/errorHandler';

interface AuctionDetailsProps {
  auctionId: string;
  userAddress: string | null;
}

interface AuctionData {
  seller: string;
  nftAddress: string;
  tokenId: string;
  startingBid: string;
  highestBid: string;
  highestBidder: string;
  endTime: Date;
  ended: boolean;
}

const AuctionDetails: React.FC<AuctionDetailsProps> = ({ auctionId, userAddress }) => {
  const [auctionData, setAuctionData] = useState<AuctionData | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [pendingReturns, setPendingReturns] = useState<string>('0');

  // Format account address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format time remaining
  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Đã kết thúc';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Fetch auction details
  const fetchAuctionDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.ethereum) {
        throw new Error('Không tìm thấy ví Ethereum. Vui lòng cài đặt MetaMask.');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const details = await getAuctionDetails(provider, Number(auctionId));
      setAuctionData(details);
      
      // Set default bid amount slightly higher than current highest bid or starting bid
      const highestBidEth = parseFloat(details.highestBid);
      const nextBidAmount = highestBidEth > 0 
        ? (highestBidEth * 1.05).toFixed(4) // 5% higher than current bid
        : (parseFloat(details.startingBid) * 1.0).toFixed(4);
      
      setBidAmount(nextBidAmount);
      
      // Check for pending returns if user is connected
      if (userAddress) {
        try {
          const returns = await getPendingReturns(provider, Number(auctionId), userAddress);
          setPendingReturns(returns);
        } catch (err) {
          console.error("Error fetching pending returns:", err);
        }
      }
      
    } catch (err) {
      const errorMessage = handleError('Không thể tải thông tin đấu giá', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Place a bid
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!window.ethereum) {
        throw new Error('Không tìm thấy ví Ethereum. Vui lòng cài đặt MetaMask.');
      }
      
      if (!auctionData) {
        throw new Error('Chưa có dữ liệu đấu giá');
      }
      
      if (parseFloat(bidAmount) <= parseFloat(auctionData.highestBid)) {
        throw new Error('Giá đặt phải cao hơn giá đấu giá hiện tại');
      }
      
      if (auctionData.ended) {
        throw new Error('Đấu giá đã kết thúc');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await placeBid(provider, Number(auctionId), bidAmount);
      
      setSuccess('Đặt giá thành công!');
      
      // Refresh auction details
      await fetchAuctionDetails();
    } catch (err) {
      const errorMessage = handleError('Không thể đặt giá', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // End auction (seller or admin only)
  const handleEndAuction = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!window.ethereum) {
        throw new Error('Không tìm thấy ví Ethereum. Vui lòng cài đặt MetaMask.');
      }
      
      if (!auctionData) {
        throw new Error('Chưa có dữ liệu đấu giá');
      }
      
      if (auctionData.ended) {
        throw new Error('Đấu giá đã kết thúc');
      }
      
      if (!userAddress || userAddress.toLowerCase() !== auctionData.seller.toLowerCase()) {
        throw new Error('Chỉ người bán mới có thể kết thúc đấu giá');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await endAuction(provider, Number(auctionId));
      
      setSuccess('Đấu giá đã kết thúc thành công!');
      
      // Refresh auction details
      await fetchAuctionDetails();
    } catch (err) {
      const errorMessage = handleError('Không thể kết thúc đấu giá', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel auction (seller only, if no bids)
  const handleCancelAuction = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!window.ethereum) {
        throw new Error('Không tìm thấy ví Ethereum. Vui lòng cài đặt MetaMask.');
      }
      
      if (!auctionData) {
        throw new Error('Chưa có dữ liệu đấu giá');
      }
      
      if (auctionData.ended) {
        throw new Error('Đấu giá đã kết thúc');
      }
      
      if (!userAddress || userAddress.toLowerCase() !== auctionData.seller.toLowerCase()) {
        throw new Error('Chỉ người bán mới có thể hủy đấu giá');
      }
      
      if (auctionData.highestBidder !== ethers.ZeroAddress) {
        throw new Error('Không thể hủy đấu giá đã có người đặt giá');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await cancelAuction(provider, Number(auctionId));
      
      setSuccess('Đấu giá đã bị hủy thành công!');
      
      // Refresh auction details
      await fetchAuctionDetails();
    } catch (err) {
      const errorMessage = handleError('Không thể hủy đấu giá', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw funds from previous bids
  const handleWithdraw = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!window.ethereum) {
        throw new Error('Không tìm thấy ví Ethereum. Vui lòng cài đặt MetaMask.');
      }
      
      if (!userAddress) {
        throw new Error('Vui lòng kết nối ví của bạn');
      }
      
      if (parseFloat(pendingReturns) <= 0) {
        throw new Error('Không có tiền để rút');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await withdrawFunds(provider, Number(auctionId));
      
      setSuccess('Rút tiền thành công!');
      setPendingReturns('0');
    } catch (err) {
      const errorMessage = handleError('Không thể rút tiền', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch pending returns
  const getPendingReturns = async (provider: ethers.BrowserProvider, auctionId: number, bidder: string) => {
    try {
      // Import the function dynamically to avoid circular dependencies
      const { getPendingReturns } = await import('../utils/contract');
      return await getPendingReturns(provider, auctionId, bidder);
    } catch (error) {
      console.error('Error getting pending returns:', error);
      return '0';
    }
  };

  // Update time left countdown
  useEffect(() => {
    if (!auctionData || auctionData.ended) return;
    
    const interval = setInterval(() => {
      setTimeLeft(formatTimeRemaining(auctionData.endTime));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [auctionData]);

  // Initial fetch of auction details
  useEffect(() => {
    if (auctionId) {
      fetchAuctionDetails();
    }
  }, [auctionId, userAddress]);

  if (isLoading && !auctionData) {
    return <div className="text-center py-10">Đang tải thông tin đấu giá...</div>;
  }

  if (error && !auctionData) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
        <p className="font-bold">Lỗi</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!auctionData) {
    return <div className="text-center py-10">Không tìm thấy thông tin đấu giá</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Chi tiết đấu giá #{auctionId}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <p className="text-gray-600">Token ID:</p>
            <p className="font-medium">{auctionData.tokenId}</p>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600">Người bán:</p>
            <p className="font-medium">{formatAddress(auctionData.seller)}</p>
            {userAddress && userAddress.toLowerCase() === auctionData.seller.toLowerCase() && (
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Bạn là người bán</span>
            )}
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600">Giá khởi điểm:</p>
            <p className="font-medium">{auctionData.startingBid} ETH</p>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600">Giá đặt cao nhất:</p>
            <p className="font-medium">{auctionData.highestBid} ETH</p>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600">Người đặt giá cao nhất:</p>
            <p className="font-medium">
              {auctionData.highestBidder !== ethers.ZeroAddress 
                ? `${formatAddress(auctionData.highestBidder)}${userAddress && userAddress.toLowerCase() === auctionData.highestBidder.toLowerCase() ? ' (Bạn)' : ''}` 
                : 'Chưa có người đặt giá'}
            </p>
          </div>
        </div>
        
        <div>
          <div className="mb-4">
            <p className="text-gray-600">Trạng thái:</p>
            <p className={`font-medium ${auctionData.ended ? 'text-red-600' : 'text-green-600'}`}>
              {auctionData.ended ? 'Đã kết thúc' : 'Đang diễn ra'}
            </p>
          </div>
          
          {!auctionData.ended && (
            <div className="mb-4">
              <p className="text-gray-600">Thời gian còn lại:</p>
              <p className="font-medium text-lg">{timeLeft}</p>
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-gray-600">Thời gian kết thúc:</p>
            <p className="font-medium">
              {auctionData.endTime.toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          {parseFloat(pendingReturns) > 0 && (
            <div className="mb-6">
              <p className="text-gray-600">Số tiền có thể rút:</p>
              <div className="flex items-center">
                <p className="font-medium text-green-600 mr-2">{pendingReturns} ETH</p>
                <button
                  onClick={handleWithdraw}
                  disabled={isLoading}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-md text-sm"
                >
                  {isLoading ? 'Đang xử lý...' : 'Rút tiền'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Action section */}
      {!auctionData.ended && userAddress && (
        <>
          <hr className="my-6" />
          
          {userAddress.toLowerCase() !== auctionData.seller.toLowerCase() ? (
            <form onSubmit={handlePlaceBid} className="mt-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow">
                  <label htmlFor="bidAmount" className="block text-gray-700 text-sm font-bold mb-2">
                    Đặt giá của bạn (ETH)
                  </label>
                  <input
                    type="number"
                    id="bidAmount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min={parseFloat(auctionData.highestBid) > 0 ? (parseFloat(auctionData.highestBid) * 1.05).toFixed(4) : auctionData.startingBid}
                    step="0.001"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Đang xử lý...' : 'Đặt giá'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={handleEndAuction}
                disabled={isLoading || new Date() < auctionData.endTime}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md ${(isLoading || new Date() < auctionData.endTime) ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={new Date() < auctionData.endTime ? "Phải đợi đến khi đấu giá kết thúc" : ""}
              >
                {isLoading ? 'Đang xử lý...' : 'Kết thúc đấu giá'}
              </button>
              
              {auctionData.highestBidder === ethers.ZeroAddress && (
                <button
                  onClick={handleCancelAuction}
                  disabled={isLoading}
                  className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Đang xử lý...' : 'Hủy đấu giá'}
                </button>
              )}
            </div>
          )}
        </>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-6" role="alert">
          <p className="font-bold">Lỗi</p>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mt-6" role="alert">
          <p className="font-bold">Thành công</p>
          <p>{success}</p>
        </div>
      )}
    </div>
  );
};

export default AuctionDetails;