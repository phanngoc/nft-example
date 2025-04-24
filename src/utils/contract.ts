import { ethers } from 'ethers';

// Khởi tạo provider
export function getProvider() {
  // Kiểm tra xem có window.ethereum không (trường hợp có MetaMask)
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  
  // Nếu không có MetaMask, sử dụng RPC URL từ biến môi trường
  const rpcUrl = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Lấy instance của contract
export async function getContract(withSigner = false) {
  const provider = getProvider();
  const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error('Địa chỉ hợp đồng không được định nghĩa trong biến môi trường');
  }
  
  // Động import ABI từ artifacts sau khi build smart contract
  // Lưu ý: Bạn cần chạy "npx hardhat compile" trước khi sử dụng
  const MyNFTArtifact = await import('../artifacts/contracts/MyNFT.sol/MyNFT.json')
    .catch(() => {
      throw new Error('Chưa compile smart contract, vui lòng chạy "npx hardhat compile"');
    });
  
  // Lấy signer nếu cần
  if (withSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, MyNFTArtifact.abi, signer);
  }
  
  // Trả về contract chỉ đọc nếu không cần signer
  return new ethers.Contract(contractAddress, MyNFTArtifact.abi, provider);
}

// Mint NFT
export async function mintNFT(address: string, tokenURI: string) {
  try {
    const contract = await getContract(true);
    
    // Gọi hàm mintNFT trên smart contract
    const tx = await contract.mintNFT(address, tokenURI);
    
    // Đợi transaction được xác nhận
    const receipt = await tx.wait();
    
    // Tìm event NFTMinted trong receipt
    const event = receipt.logs
      .filter((log: any) => log.fragment && log.fragment.name === 'NFTMinted')
      .map((log: any) => {
        const { tokenId, owner, tokenURI } = log.args;
        return { tokenId, owner, tokenURI };
      })[0];
    
    return event;
  } catch (error) {
    console.error('Lỗi khi mint NFT:', error);
    throw error;
  }
} 