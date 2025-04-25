import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { handleError } from '../utils/errorHandler';

interface Auction {
  auctionId: string;
  seller: string;
  tokenId: string;
  highestBid: string;
  endTime: Date;
  ended: boolean;
}

interface AuctionListProps {
  limit?: number;
}

const AuctionList: React.FC<AuctionListProps> = ({ limit }) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format time remaining
  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Đã kết thúc';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
  };

  // Format address
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Fetch all auctions
  const fetchAuctions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.ethereum) {
        throw new Error('Không tìm thấy ví Ethereum. Vui lòng cài đặt MetaMask.');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const auctionAddress = process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS;
      
      if (!auctionAddress) {
        throw new Error('Không tìm thấy địa chỉ hợp đồng đấu giá');
      }
      
      const auctionContract = new ethers.Contract(
        auctionAddress,
        [
          'function auctionCounter() view returns (uint256)',
          'function getAuction(uint256 auctionId) view returns (address seller, address nftAddress, uint256 tokenId, uint256 startingBid, uint256 highestBid, address highestBidder, uint256 endTime, bool ended)'
        ],
        provider
      );
      
      // Get total number of auctions
      const auctionCounter = await auctionContract.auctionCounter();
      const totalAuctions = Number(auctionCounter);
      
      // Fetch auctions from newest to oldest
      const fetchedAuctions: Auction[] = [];
      const startIndex = totalAuctions;
      const endIndex = Math.max(1, startIndex - (limit || 100)); // Default to 100 auctions max
      
      for (let i = startIndex; i >= endIndex; i--) {
        try {
          const auction = await auctionContract.getAuction(i);
          
          fetchedAuctions.push({
            auctionId: i.toString(),
            seller: auction[0],
            tokenId: auction[2].toString(),
            highestBid: ethers.formatEther(auction[4]),
            endTime: new Date(Number(auction[6]) * 1000),
            ended: auction[7]
          });
        } catch (err) {
          console.error(`Error fetching auction ${i}:`, err);
        }
      }
      
      setAuctions(fetchedAuctions);
    } catch (err) {
      const errorMessage = handleError('Không thể tải danh sách đấu giá', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [limit]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        <p className="ml-2">Đang tải danh sách đấu giá...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4" role="alert">
        <p className="font-bold">Lỗi</p>
        <p>{error}</p>
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-gray-600">Không tìm thấy cuộc đấu giá nào.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Danh sách đấu giá</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {auctions.map((auction) => (
          <Link href={`/auctions/${auction.auctionId}`} key={auction.auctionId}>
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Đấu giá #{auction.auctionId}</h3>
                  <p className="text-sm text-gray-600">Token ID: {auction.tokenId}</p>
                </div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs ${auction.ended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {auction.ended ? 'Đã kết thúc' : 'Đang diễn ra'}
                </span>
              </div>
              
              <div className="mb-2">
                <p className="text-sm text-gray-600">Người bán:</p>
                <p className="font-medium">{formatAddress(auction.seller)}</p>
              </div>
              
              <div className="mb-2">
                <p className="text-sm text-gray-600">Giá cao nhất:</p>
                <p className="font-medium">{auction.highestBid} ETH</p>
              </div>
              
              {!auction.ended && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Thời gian còn lại:</p>
                  <p className="font-medium">{formatTimeRemaining(auction.endTime)}</p>
                </div>
              )}
              
              <div className="mt-4 text-right">
                <span className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm">
                  Xem chi tiết
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AuctionList;