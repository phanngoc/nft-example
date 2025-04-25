import { useState, useEffect } from 'react';
import { getNFTMetadata } from '../utils/contract';

interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
}

interface NFTGalleryProps {
  walletAddress?: string;
  mintedTokenId?: string;
}

export default function NFTGallery({ walletAddress, mintedTokenId }: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mintedTokenId) {
      fetchNFT(mintedTokenId);
    }
  }, [mintedTokenId]);

  const fetchNFT = async (tokenId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the token's metadata URI
      const metadataURI = await getNFTMetadata(Number(tokenId));
      
      // Fetch metadata from IPFS
      const ipfsURL = ipfsToHTTP(metadataURI);
      const response = await fetch(ipfsURL);
      
      if (!response.ok) {
        throw new Error('Không thể lấy thông tin metadata');
      }
      
      const metadata = await response.json();
      
      const newNFT: NFT = {
        id: tokenId,
        name: metadata.name || `NFT #${tokenId}`,
        description: metadata.description || 'Không có mô tả',
        image: ipfsToHTTP(metadata.image) || '',
      };
      
      // Check if NFT already exists in the list
      setNfts((prevNfts) => {
        const exists = prevNfts.some((nft) => nft.id === tokenId);
        if (exists) return prevNfts;
        return [...prevNfts, newNFT];
      });
      
    } catch (error) {
      console.error('Lỗi lấy thông tin NFT:', error);
      setError('Không thể lấy thông tin NFT. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert IPFS URL to HTTP URL for display
  const ipfsToHTTP = (ipfsUrl: string): string => {
    if (!ipfsUrl) return '';
    
    // Convert ipfs:// URLs to public gateway URLs
    if (ipfsUrl.startsWith('ipfs://')) {
      return ipfsUrl.replace('ipfs://', 'https://w3s.link/ipfs/');
    }
    return ipfsUrl;
  };

  if (nfts.length === 0 && !isLoading && !error) {
    return (
      <div className="mt-8 p-6 border rounded-lg bg-white">
        <h2 className="text-xl font-bold mb-4">NFT Gallery</h2>
        <p className="text-gray-500 text-center">
          {!walletAddress 
            ? 'Hãy kết nối ví để xem bộ sưu tập NFT của bạn' 
            : 'Bạn chưa có NFT nào. Hãy mint NFT đầu tiên!'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 border rounded-lg bg-white">
      <h2 className="text-xl font-bold mb-4">NFT Gallery</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <p className="text-center py-4">Đang tải thông tin NFT...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {nfts.map((nft) => (
            <div key={nft.id} className="border rounded-lg overflow-hidden">
              <div className="relative pb-[100%]">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Image+Not+Available';
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold">{nft.name}</h3>
                <p className="text-gray-600 text-sm mt-1">{nft.description}</p>
                <div className="mt-2 text-xs text-gray-500">
                  Token ID: {nft.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}