import { useState, useRef, useEffect, FormEvent } from 'react';
import Head from 'next/head';
import { ethers } from 'ethers';
import { uploadToIPFS, createAndUploadMetadata } from '../utils/web3Storage';
import { mintNFT, isContractPaused, getMintPrice } from '../utils/contract';
import { validateImageFile, validateMetadata, sanitizeInput, isValidIPFSUrl, checkWalletSecurity } from '../utils/security';
import WalletConnector from '../components/WalletConnector';
import NFTGallery from '../components/NFTGallery';

export default function Home() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<{
    imageCID?: string;
    metadataCID?: string;
    tokenId?: string;
    transactionHash?: string;
  }>({});
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [contractStatus, setContractStatus] = useState<{
    isPaused: boolean;
    mintPrice: string;
  }>({
    isPaused: false,
    mintPrice: '0',
  });
  const [walletSecurityStatus, setWalletSecurityStatus] = useState<{
    checked: boolean;
    isSafe: boolean;
    message?: string;
  }>({
    checked: false,
    isSafe: true,
  });
  
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch contract status when wallet is connected
  useEffect(() => {
    if (walletAddress) {
      fetchContractStatus();
      performWalletSecurityCheck();
    }
  }, [walletAddress]);
  
  // Fetch contract status (paused state and mint price)
  const fetchContractStatus = async () => {
    try {
      const paused = await isContractPaused();
      const price = await getMintPrice();
      
      setContractStatus({
        isPaused: paused,
        mintPrice: ethers.formatEther(price)
      });
    } catch (error) {
      console.error('Error fetching contract status:', error);
    }
  };
  
  // Perform wallet security check
  const performWalletSecurityCheck = async () => {
    if (!walletAddress) return;
    
    try {
      const securityStatus = await checkWalletSecurity(walletAddress);
      
      setWalletSecurityStatus({
        checked: true,
        isSafe: securityStatus.isSafe,
        message: securityStatus.reason
      });
    } catch (error) {
      console.error('Error checking wallet security:', error);
    }
  };
  
  // Xử lý kết nối ví
  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
  };
  
  // Xử lý upload ảnh lên IPFS với kiểm tra bảo mật
  const handleUploadImage = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      if (!walletAddress) {
        setError('Vui lòng kết nối ví trước khi upload ảnh');
        return;
      }
      
      if (contractStatus.isPaused) {
        setError('Hợp đồng hiện đang tạm dừng hoạt động. Vui lòng thử lại sau.');
        return;
      }
      
      if (!walletSecurityStatus.isSafe) {
        setError(`Phát hiện vấn đề bảo mật với ví: ${walletSecurityStatus.message || 'Vui lòng sử dụng ví khác.'}`);
        return;
      }
      
      if (!fileInputRef.current?.files?.[0]) {
        setError('Vui lòng chọn một file ảnh');
        return;
      }
      
      // Validate image file
      const imageFile = fileInputRef.current.files[0];
      const validationResult = validateImageFile(imageFile);
      
      if (!validationResult.isValid) {
        setError(validationResult.error || 'File ảnh không hợp lệ');
        return;
      }
      
      setIsLoading(true);
      setStep(1);
      setError('');
      
      // Upload ảnh lên IPFS
      const imageUrl = await uploadToIPFS(imageFile);
      
      // Validate returned IPFS URL
      if (!isValidIPFSUrl(imageUrl)) {
        throw new Error('URL IPFS không hợp lệ được trả về từ dịch vụ lưu trữ');
      }
      
      setResult((prev) => ({ ...prev, imageCID: imageUrl }));
      setStep(2);
    } catch (error: any) {
      setError(error.message || 'Lỗi khi upload ảnh');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Xử lý tạo metadata và mint NFT với kiểm tra bảo mật
  const handleMintNFT = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      if (!result.imageCID) {
        setError('Vui lòng upload ảnh trước');
        return;
      }
      
      if (!nameRef.current?.value || !descriptionRef.current?.value) {
        setError('Vui lòng nhập tên và mô tả');
        return;
      }
      
      if (!walletAddress) {
        setError('Vui lòng kết nối ví trước khi mint NFT');
        return;
      }
      
      if (contractStatus.isPaused) {
        setError('Hợp đồng hiện đang tạm dừng hoạt động. Vui lòng thử lại sau.');
        return;
      }
      
      // Validate and sanitize metadata
      const name = sanitizeInput(nameRef.current.value);
      const description = sanitizeInput(descriptionRef.current.value);
      
      const metadataValidation = validateMetadata(name, description);
      if (!metadataValidation.isValid) {
        setError(metadataValidation.error || 'Thông tin metadata không hợp lệ');
        return;
      }
      
      setIsLoading(true);
      setError('');
      
      // Refresh contract status before minting
      await fetchContractStatus();
      
      if (contractStatus.isPaused) {
        setError('Hợp đồng hiện đang tạm dừng hoạt động. Vui lòng thử lại sau.');
        setIsLoading(false);
        return;
      }
      
      // Tạo metadata
      const metadataUrl = await createAndUploadMetadata(
        name,
        description,
        result.imageCID,
        []
      );
      
      // Validate returned IPFS URL
      if (!isValidIPFSUrl(metadataUrl)) {
        throw new Error('URL IPFS metadata không hợp lệ');
      }
      
      setResult((prev) => ({ ...prev, metadataCID: metadataUrl }));
      setStep(3);
      
      // Mint NFT
      const mintResult = await mintNFT(walletAddress, metadataUrl);
      
      setResult((prev) => ({ 
        ...prev, 
        tokenId: mintResult.tokenId.toString(),
        transactionHash: mintResult.transactionHash
      }));
      setStep(4);
    } catch (error: any) {
      setError(error.message || 'Lỗi khi mint NFT');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Security warning banner display
  const SecurityWarningBanner = () => {
    if (contractStatus.isPaused) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Cảnh báo! </strong>
          <span className="block sm:inline">Hợp đồng hiện đang tạm dừng hoạt động. Mint NFT không khả dụng.</span>
        </div>
      );
    }
    
    if (!walletSecurityStatus.isSafe && walletSecurityStatus.checked) {
      return (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Cảnh báo bảo mật! </strong>
          <span className="block sm:inline">{walletSecurityStatus.message || 'Địa chỉ ví có thể không an toàn.'}</span>
        </div>
      );
    }
    
    if (parseFloat(contractStatus.mintPrice) > 0) {
      return (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Thông báo phí: </strong>
          <span className="block sm:inline">Mint NFT sẽ tốn {contractStatus.mintPrice} ETH.</span>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Head>
        <title>NFT Minting Pipeline</title>
        <meta name="description" content="Công cụ đơn giản để mint NFT" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Thêm CSP và security headers */}
        <meta httpEquiv="Content-Security-Policy" content="
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval';
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: w3s.link ipfs.io cloudflare-ipfs.com;
          connect-src 'self' *.infura.io w3s.link ipfs.io api.web3.storage;
        " />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </Head>
      
      <main>
        <h1 className="text-3xl font-bold mb-8 text-center">NFT Minting Pipeline</h1>
        
        {/* Security Warning Banner */}
        <SecurityWarningBanner />
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* Wallet Connector Component */}
        <WalletConnector onConnect={handleWalletConnect} />
        
        <div className="border rounded-lg p-6 bg-white shadow-md">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Bước 1: Upload ảnh lên IPFS</h2>
            <form onSubmit={handleUploadImage}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Chọn file ảnh</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="border rounded w-full p-2"
                  disabled={!walletAddress || contractStatus.isPaused}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Định dạng hỗ trợ: JPEG, PNG, GIF, WebP, SVG. Kích thước tối đa: 10MB
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading || !walletAddress || contractStatus.isPaused}
                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${(!walletAddress || isLoading || contractStatus.isPaused) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading && step === 1 ? 'Đang Upload...' : 'Upload Ảnh'}
              </button>
            </form>
            
            {result.imageCID && (
              <div className="mt-4 p-3 bg-green-100 rounded">
                <p className="font-medium">Upload thành công!</p>
                <div className="text-sm text-gray-800 break-all">
                  <p>IPFS URL: {result.imageCID}</p>
                  {isValidIPFSUrl(result.imageCID) && (
                    <p className="text-green-600 text-xs mt-1">✓ IPFS URL hợp lệ</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Bước 2: Tạo Metadata và Mint NFT</h2>
            <form onSubmit={handleMintNFT}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Tên NFT</label>
                <input
                  type="text"
                  ref={nameRef}
                  disabled={!result.imageCID || isLoading || !walletAddress || contractStatus.isPaused}
                  className="border rounded w-full p-2"
                  placeholder="Nhập tên NFT"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tối đa 100 ký tự
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Mô tả</label>
                <textarea
                  ref={descriptionRef}
                  disabled={!result.imageCID || isLoading || !walletAddress || contractStatus.isPaused}
                  className="border rounded w-full p-2"
                  rows={3}
                  placeholder="Nhập mô tả NFT"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tối đa 1000 ký tự
                </p>
              </div>
              {parseFloat(contractStatus.mintPrice) > 0 && (
                <div className="mb-4 p-2 bg-blue-50 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Phí mint:</strong> {contractStatus.mintPrice} ETH
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={!result.imageCID || isLoading || !walletAddress || contractStatus.isPaused}
                className={`bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded ${(!result.imageCID || isLoading || !walletAddress || contractStatus.isPaused) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading && step > 1 ? 'Đang xử lý...' : 'Tạo Metadata và Mint NFT'}
              </button>
            </form>
            
            {result.metadataCID && (
              <div className="mt-4 p-3 bg-green-100 rounded">
                <p className="font-medium">Tạo metadata thành công!</p>
                <div className="text-sm text-gray-800 break-all">
                  <p>Metadata URL: {result.metadataCID}</p>
                  {isValidIPFSUrl(result.metadataCID) && (
                    <p className="text-green-600 text-xs mt-1">✓ IPFS URL hợp lệ</p>
                  )}
                </div>
              </div>
            )}
            
            {result.tokenId && (
              <div className="mt-4 p-3 bg-green-100 rounded">
                <p className="font-medium">Mint NFT thành công!</p>
                <p className="text-sm text-gray-800">Token ID: {result.tokenId}</p>
                {result.transactionHash && (
                  <p className="text-xs text-blue-600 mt-1">
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${result.transactionHash}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Xem giao dịch trên Etherscan
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* NFT Gallery Component */}
        <NFTGallery walletAddress={walletAddress} mintedTokenId={result.tokenId} />
      </main>
    </div>
  );
}