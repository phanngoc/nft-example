import React, { useState } from 'react';
import { ethers } from 'ethers';
import { createAuction } from '../utils/contract';
import { handleError } from '../utils/errorHandler';

interface AuctionCreateProps {
  tokenId: string;
  nftAddress: string;
  onAuctionCreated: (auctionId: string) => void;
}

const AuctionCreate: React.FC<AuctionCreateProps> = ({ tokenId, nftAddress, onAuctionCreated }) => {
  const [startingBid, setStartingBid] = useState<string>('0.01');
  const [duration, setDuration] = useState<number>(7); // days
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.ethereum) {
        throw new Error('Không tìm thấy ví Ethereum. Vui lòng cài đặt MetaMask.');
      }

      if (parseFloat(startingBid) <= 0) {
        throw new Error('Giá khởi điểm phải lớn hơn 0');
      }

      if (duration <= 0) {
        throw new Error('Thời gian đấu giá phải lớn hơn 0');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Approve the NFT to be transferred by the auction contract
      const nftContract = new ethers.Contract(
        nftAddress,
        ['function approve(address to, uint256 tokenId) public'],
        await provider.getSigner()
      );

      const auctionAddress = process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS;
      if (!auctionAddress) {
        throw new Error('Không tìm thấy địa chỉ hợp đồng đấu giá');
      }

      // First approve the NFT transfer
      const approveTx = await nftContract.approve(auctionAddress, tokenId);
      await approveTx.wait();

      // Create the auction
      const result = await createAuction(
        provider,
        nftAddress,
        tokenId,
        startingBid,
        duration
      );

      setSuccess(`Đã tạo đấu giá thành công! ID Đấu giá: ${result.auctionId}`);
      onAuctionCreated(result.auctionId);
    } catch (err) {
      const errorMessage = handleError('Không thể tạo đấu giá', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Tạo đấu giá NFT</h2>

      <form onSubmit={handleCreateAuction}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startingBid">
            Giá khởi điểm (ETH)
          </label>
          <input
            id="startingBid"
            type="number"
            step="0.001"
            min="0.001"
            value={startingBid}
            onChange={(e) => setStartingBid(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="duration">
            Thời gian đấu giá (ngày)
          </label>
          <input
            id="duration"
            type="number"
            step="1"
            min="1"
            max="30"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>}

        {success && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
          <p>{success}</p>
        </div>}

        <div className="flex items-center justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Đang xử lý...' : 'Tạo đấu giá'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuctionCreate;