import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import Head from 'next/head';
import { uploadToIPFS, createAndUploadMetadata } from '../utils/web3Storage';
import { mintNFT } from '../utils/contract';

export default function Home() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<{
    imageCID?: string;
    metadataCID?: string;
    tokenId?: string;
  }>({});
  
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Xử lý upload ảnh lên IPFS
  const handleUploadImage = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      if (!fileInputRef.current?.files?.[0]) {
        setError('Vui lòng chọn một file ảnh');
        return;
      }
      
      setIsLoading(true);
      setStep(1);
      setError('');
      
      // Upload ảnh lên IPFS
      const imageFile = fileInputRef.current.files[0];
      const imageUrl = await uploadToIPFS(imageFile);
      
      setResult((prev) => ({ ...prev, imageCID: imageUrl }));
      setStep(2);
    } catch (error: any) {
      setError(error.message || 'Lỗi khi upload ảnh');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Xử lý tạo metadata và mint NFT
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
      
      setIsLoading(true);
      setError('');
      
      // Tạo metadata
      const metadataUrl = await createAndUploadMetadata(
        nameRef.current.value,
        descriptionRef.current.value,
        result.imageCID,
        []
      );
      
      setResult((prev) => ({ ...prev, metadataCID: metadataUrl }));
      setStep(3);
      
      // Mint NFT
      // Lấy địa chỉ ví hiện tại
      const provider = (window as any).ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];
      
      const mintResult = await mintNFT(userAddress, metadataUrl);
      
      setResult((prev) => ({ ...prev, tokenId: mintResult.tokenId.toString() }));
      setStep(4);
    } catch (error: any) {
      setError(error.message || 'Lỗi khi mint NFT');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Head>
        <title>NFT Minting Pipeline</title>
        <meta name="description" content="Công cụ đơn giản để mint NFT" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main>
        <h1 className="text-3xl font-bold mb-8 text-center">NFT Minting Pipeline</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
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
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                {isLoading && step === 1 ? 'Đang Upload...' : 'Upload Ảnh'}
              </button>
            </form>
            
            {result.imageCID && (
              <div className="mt-4 p-3 bg-green-100 rounded">
                <p className="font-medium">Upload thành công!</p>
                <p className="text-sm text-gray-800 break-all">IPFS URL: {result.imageCID}</p>
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
                  disabled={!result.imageCID || isLoading}
                  className="border rounded w-full p-2"
                  placeholder="Nhập tên NFT"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Mô tả</label>
                <textarea
                  ref={descriptionRef}
                  disabled={!result.imageCID || isLoading}
                  className="border rounded w-full p-2"
                  rows={3}
                  placeholder="Nhập mô tả NFT"
                />
              </div>
              <button
                type="submit"
                disabled={!result.imageCID || isLoading}
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                {isLoading && step > 1 ? 'Đang xử lý...' : 'Tạo Metadata và Mint NFT'}
              </button>
            </form>
            
            {result.metadataCID && (
              <div className="mt-4 p-3 bg-green-100 rounded">
                <p className="font-medium">Tạo metadata thành công!</p>
                <p className="text-sm text-gray-800 break-all">Metadata URL: {result.metadataCID}</p>
              </div>
            )}
            
            {result.tokenId && (
              <div className="mt-4 p-3 bg-green-100 rounded">
                <p className="font-medium">Mint NFT thành công!</p>
                <p className="text-sm text-gray-800">Token ID: {result.tokenId}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 