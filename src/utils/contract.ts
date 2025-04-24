import { ethers } from 'ethers';

// ABI (Application Binary Interface) for the NFT contract
// This defines the functions and events the frontend can interact with
const NFT_ABI = [
  // Read functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  
  // Write functions
  "function mintNFT(address recipient, string memory tokenURI) public returns (uint256)",
  
  // Events
  "event NFTMinted(address owner, uint256 tokenId, string tokenURI)"
];

/**
 * Get the NFT contract instance
 * @returns The contract instance
 */
export const getContract = async () => {
  if (typeof window === 'undefined') {
    throw new Error('This function should only be called in the browser');
  }

  // Get contract address from environment variable
  const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('NFT contract address is not configured. Please set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS in .env.local');
  }

  try {
    // Check if MetaMask or similar provider is available
    if (!window.ethereum) {
      throw new Error('Web3 provider not found. Please install MetaMask or a compatible wallet.');
    }
    
    // Create a Web3Provider using the browser's Ethereum provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Get signer (the user's account that will sign transactions)
    const signer = await provider.getSigner();
    
    // Create contract instance
    const nftContract = new ethers.Contract(contractAddress, NFT_ABI, signer);
    
    return nftContract;
  } catch (error) {
    console.error('Error connecting to contract:', error);
    throw new Error('Failed to connect to the NFT contract');
  }
};

/**
 * Mint an NFT with the given metadata URI
 * @param recipient Address who will own the NFT
 * @param metadataURI URI to the NFT metadata stored on IPFS
 * @returns Object containing the transaction receipt and token ID
 */
export const mintNFT = async (recipient: string, metadataURI: string) => {
  try {
    // Get contract instance
    const nftContract = await getContract();
    
    console.log(`Minting NFT for ${recipient} with metadata: ${metadataURI}`);
    
    // Send transaction to mint NFT
    const tx = await nftContract.mintNFT(recipient, metadataURI);
    
    // Wait for transaction confirmation
    console.log('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    
    // Parse event logs to get the minted token ID
    const nftMintedEvent = receipt.logs.find(
      (log) => {
        try {
          const parsedLog = nftContract.interface.parseLog(log);
          return parsedLog?.name === 'NFTMinted';
        } catch (e) {
          return false;
        }
      }
    );
    
    // Get token ID from event
    const tokenId = nftMintedEvent
      ? nftContract.interface.parseLog(nftMintedEvent)?.args[1]
      : null;
    
    console.log(`NFT minted successfully! Token ID: ${tokenId}`);
    
    return {
      receipt,
      tokenId
    };
  } catch (error: any) {
    console.error('Error minting NFT:', error);
    
    // Provide more specific error messages based on common issues
    if (error.message?.includes('user rejected transaction')) {
      throw new Error('Transaction was rejected by the user.');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds to complete the transaction.');
    } else {
      throw new Error(`Failed to mint NFT: ${error.message}`);
    }
  }
};

/**
 * Get the URI of an existing NFT
 * @param tokenId The ID of the NFT
 * @returns The metadata URI of the NFT
 */
export const getNFTMetadata = async (tokenId: number): Promise<string> => {
  try {
    const nftContract = await getContract();
    return await nftContract.tokenURI(tokenId);
  } catch (error) {
    console.error('Error getting NFT metadata:', error);
    throw new Error('Failed to get NFT metadata');
  }
};

/**
 * Get the owner of an existing NFT
 * @param tokenId The ID of the NFT
 * @returns The address of the owner
 */
export const getNFTOwner = async (tokenId: number): Promise<string> => {
  try {
    const nftContract = await getContract();
    return await nftContract.ownerOf(tokenId);
  } catch (error) {
    console.error('Error getting NFT owner:', error);
    throw new Error('Failed to get NFT owner');
  }
};