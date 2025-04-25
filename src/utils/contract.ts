import { ethers } from 'ethers';
import { isValidEthereumAddress, isSuspiciousTransaction, generateTransactionNonce } from './security';
import { formatBlockchainError, logErrorDetails, handleError } from './errorHandler';
import MyNFTArtifact from '../artifacts/contracts/MyNFT.sol/MyNFT.json';
import NFTAuctionArtifact from '../artifacts/contracts/NFTAuction.sol/NFTAuction.json';

// Enhanced ABI including new security features from the updated contract
const NFT_ABI = [
  // Read functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function mintPriceWei() view returns (uint256)",
  "function maxTokensPerWallet() view returns (uint256)",
  "function maxMintBatchSize() view returns (uint256)",
  "function paused() view returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  
  // Write functions
  "function mintNFT(address recipient, string memory tokenURI) payable returns (uint256)",
  "function batchMintNFTs(address recipient, string[] memory tokenURIs) payable returns (uint256[])",
  "function setMintPrice(uint256 newPriceWei) external",
  "function pause() external",
  "function unpause() external",
  
  // Events
  "event NFTMinted(address indexed owner, uint256 indexed tokenId, string tokenURI)"
];

// Role constants matching the smart contract
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Get the NFT contract instance with security checks
 * @returns The contract instance and security info
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

  // Validate contract address format
  if (!isValidEthereumAddress(contractAddress)) {
    throw new Error('Invalid NFT contract address format');
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
    
    // Check if contract is deployed
    try {
      await nftContract.name();
    } catch (error) {
      throw new Error('Unable to connect to the NFT contract. It may not be deployed at the provided address.');
    }
    
    // Check if contract is paused
    let isPaused = false;
    try {
      isPaused = await nftContract.paused();
    } catch (error) {
      // If paused() function doesn't exist, continue
      console.warn('Could not check contract pause status');
    }
    
    // Get mint price if available
    let mintPrice = ethers.parseEther("0");
    try {
      mintPrice = await nftContract.mintPriceWei();
    } catch (error) {
      // If the function doesn't exist, continue
    }
    
    return {
      contract: nftContract,
      address: contractAddress,
      isPaused,
      mintPrice,
      signer: signer.address
    };
  } catch (error) {
    logErrorDetails(error, 'getContract');
    throw new Error(formatBlockchainError(error) || 'Failed to connect to the NFT contract');
  }
};

/**
 * Check if user has a specific role (admin, minter, etc.)
 * @param role The role to check (use exported constants)
 * @param userAddress The address to check
 * @returns Whether the address has the specified role
 */
export const hasRole = async (role: string, userAddress: string): Promise<boolean> => {
  try {
    const { contract } = await getContract();
    return await contract.hasRole(role, userAddress);
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
};

/**
 * Get the current mint price
 * @returns Current mint price in wei
 */
export const getMintPrice = async (): Promise<bigint> => {
  try {
    const { contract } = await getContract();
    return await contract.mintPriceWei();
  } catch (error) {
    console.error('Error getting mint price:', error);
    return BigInt(0);
  }
};

/**
 * Check if contract is paused
 * @returns Whether the contract is paused
 */
export const isContractPaused = async (): Promise<boolean> => {
  try {
    const { contract } = await getContract();
    return await contract.paused();
  } catch (error) {
    console.error('Error checking if contract is paused:', error);
    return false;
  }
};

/**
 * Mint an NFT with the given metadata URI with enhanced security
 * @param recipient Address who will own the NFT
 * @param metadataURI URI to the NFT metadata stored on IPFS
 * @returns Object containing the transaction receipt and token ID
 */
export const mintNFT = async (recipient: string, metadataURI: string) => {
  try {
    // Security checks
    if (!isValidEthereumAddress(recipient)) {
      throw new Error('Địa chỉ nhận không hợp lệ');
    }
    
    const { contract, isPaused, mintPrice } = await getContract();
    
    if (isPaused) {
      throw new Error('Hợp đồng hiện đang tạm dừng. Vui lòng thử lại sau.');
    }
    
    console.log(`Minting NFT for ${recipient} with metadata: ${metadataURI}`);
    
    // Generate transaction nonce for security
    const nonce = generateTransactionNonce();
    console.log('Transaction nonce:', nonce);
    
    // Check if this is a suspicious transaction
    if (isSuspiciousTransaction(recipient, mintPrice)) {
      throw new Error('Giao dịch này có vẻ đáng ngờ và đã bị chặn vì lý do bảo mật.');
    }
    
    // Send transaction to mint NFT
    const tx = await contract.mintNFT(recipient, metadataURI, {
      value: mintPrice
    });
    
    // Wait for transaction confirmation
    console.log('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    
    // Parse event logs to get the minted token ID
    const nftMintedEvent = receipt.logs.find(
      (log) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog?.name === 'NFTMinted';
        } catch (e) {
          return false;
        }
      }
    );
    
    // Get token ID from event
    const tokenId = nftMintedEvent
      ? contract.interface.parseLog(nftMintedEvent)?.args[1]
      : null;
    
    console.log(`NFT minted successfully! Token ID: ${tokenId}`);
    
    return {
      receipt,
      tokenId,
      transactionHash: receipt.hash
    };
  } catch (error: any) {
    logErrorDetails(error, 'mintNFT');
    
    // Provide more specific error messages based on common issues
    if (error.message?.includes('user rejected transaction')) {
      throw new Error('Giao dịch đã bị từ chối bởi người dùng.');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Số dư không đủ để hoàn thành giao dịch.');
    } else {
      throw new Error(formatBlockchainError(error) || 'Không thể mint NFT');
    }
  }
};

/**
 * Batch mint multiple NFTs at once with security checks
 * @param recipient Address who will own the NFTs
 * @param metadataURIs Array of metadata URIs
 * @returns Object with receipt and token IDs
 */
export const batchMintNFTs = async (recipient: string, metadataURIs: string[]) => {
  try {
    // Security checks
    if (!isValidEthereumAddress(recipient)) {
      throw new Error('Địa chỉ nhận không hợp lệ');
    }
    
    if (!metadataURIs || metadataURIs.length === 0) {
      throw new Error('Vui lòng cung cấp ít nhất một URI metadata');
    }
    
    const { contract, isPaused, mintPrice } = await getContract();
    
    if (isPaused) {
      throw new Error('Hợp đồng hiện đang tạm dừng. Vui lòng thử lại sau.');
    }
    
    // Get maximum batch size
    let maxBatchSize = 5; // Default
    try {
      maxBatchSize = Number(await contract.maxMintBatchSize());
    } catch (error) {
      console.warn('Could not fetch maxMintBatchSize, using default of 5');
    }
    
    if (metadataURIs.length > maxBatchSize) {
      throw new Error(`Số lượng NFT vượt quá giới hạn tối đa (${maxBatchSize})`);
    }
    
    // Calculate total price
    const totalPrice = mintPrice * BigInt(metadataURIs.length);
    
    // Check if this is a suspicious transaction
    if (isSuspiciousTransaction(recipient, totalPrice)) {
      throw new Error('Giao dịch này có vẻ đáng ngờ và đã bị chặn vì lý do bảo mật.');
    }
    
    console.log(`Batch minting ${metadataURIs.length} NFTs for ${recipient}`);
    
    // Send transaction
    const tx = await contract.batchMintNFTs(recipient, metadataURIs, {
      value: totalPrice
    });
    
    console.log('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    
    // For batch minting, we need to process multiple events
    const tokenIds: bigint[] = [];
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog?.name === 'NFTMinted') {
          tokenIds.push(parsedLog.args[1]);
        }
      } catch (e) {
        // Skip logs that can't be parsed
      }
    }
    
    console.log(`Successfully minted ${tokenIds.length} NFTs!`);
    
    return {
      receipt,
      tokenIds,
      transactionHash: receipt.hash
    };
  } catch (error: any) {
    logErrorDetails(error, 'batchMintNFTs');
    throw new Error(formatBlockchainError(error) || 'Không thể mint NFTs theo lô');
  }
};

/**
 * Get the URI of an existing NFT
 * @param tokenId The ID of the NFT
 * @returns The metadata URI of the NFT
 */
export const getNFTMetadata = async (tokenId: number): Promise<string> => {
  try {
    const { contract } = await getContract();
    return await contract.tokenURI(tokenId);
  } catch (error) {
    logErrorDetails(error, 'getNFTMetadata');
    throw new Error('Không thể lấy metadata NFT');
  }
};

/**
 * Get the owner of an existing NFT
 * @param tokenId The ID of the NFT
 * @returns The address of the owner
 */
export const getNFTOwner = async (tokenId: number): Promise<string> => {
  try {
    const { contract } = await getContract();
    return await contract.ownerOf(tokenId);
  } catch (error) {
    logErrorDetails(error, 'getNFTOwner');
    throw new Error('Không thể lấy chủ sở hữu NFT');
  }
};

// NFT Contract Functions
export const getNFTContract = async (provider) => {
  try {
    if (!provider) return null;
    
    const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
    if (!address) throw new Error("NFT contract address not found in environment variables");
    
    const signer = await provider.getSigner();
    return new ethers.Contract(address, MyNFTArtifact.abi, signer);
  } catch (error) {
    handleError("Failed to get NFT contract", error);
    return null;
  }
};

export const mintNFTWithProvider = async (
  provider,
  recipient,
  metadataURI
) => {
  try {
    const nftContract = await getNFTContract(provider);
    if (!nftContract) throw new Error("NFT contract not found");
    
    const tx = await nftContract.mintNFT(recipient, metadataURI);
    const receipt = await tx.wait();
    
    // Find the NFTMinted event
    const event = receipt.logs.find(log => {
      try {
        const parsedLog = nftContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        return parsedLog.name === 'NFTMinted';
      } catch (e) {
        return false;
      }
    });
    
    if (!event) throw new Error("NFTMinted event not found in transaction");
    const parsedEvent = nftContract.interface.parseLog({
      topics: event.topics,
      data: event.data
    });
    
    // Return the token ID
    return {
      tokenId: parsedEvent.args.tokenId.toString(),
      transactionHash: receipt.hash
    };
  } catch (error) {
    handleError("Failed to mint NFT", error);
    throw error;
  }
};

export const batchMintNFTsWithProvider = async (
  provider,
  recipient,
  metadataURIs
) => {
  try {
    const nftContract = await getNFTContract(provider);
    if (!nftContract) throw new Error("NFT contract not found");
    
    const tx = await nftContract.batchMintNFTs(recipient, metadataURIs);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash
    };
  } catch (error) {
    handleError("Failed to batch mint NFTs", error);
    throw error;
  }
};

// Auction Contract Functions
export const getAuctionContract = async (provider) => {
  try {
    if (!provider) return null;
    
    const address = process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS;
    if (!address) throw new Error("Auction contract address not found in environment variables");
    
    const signer = await provider.getSigner();
    return new ethers.Contract(address, NFTAuctionArtifact.abi, signer);
  } catch (error) {
    handleError("Failed to get auction contract", error);
    return null;
  }
};

export const createAuction = async (
  provider,
  nftAddress,
  tokenId,
  startingBid,
  durationInDays
) => {
  try {
    const auctionContract = await getAuctionContract(provider);
    if (!auctionContract) throw new Error("Auction contract not found");
    
    // Convert duration from days to seconds
    const durationInSeconds = durationInDays * 24 * 60 * 60;
    
    // Convert starting bid to wei
    const startingBidWei = ethers.parseEther(startingBid);
    
    const tx = await auctionContract.createAuction(
      nftAddress,
      tokenId,
      startingBidWei,
      durationInSeconds
    );
    
    const receipt = await tx.wait();
    
    // Find the AuctionCreated event
    const event = receipt.logs.find(log => {
      try {
        const parsedLog = auctionContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        return parsedLog.name === 'AuctionCreated';
      } catch (e) {
        return false;
      }
    });
    
    if (!event) throw new Error("AuctionCreated event not found in transaction");
    const parsedEvent = auctionContract.interface.parseLog({
      topics: event.topics,
      data: event.data
    });
    
    return {
      auctionId: parsedEvent.args.auctionId.toString(),
      transactionHash: receipt.hash
    };
  } catch (error) {
    handleError("Failed to create auction", error);
    throw error;
  }
};

export const placeBid = async (
  provider,
  auctionId,
  bidAmount
) => {
  try {
    const auctionContract = await getAuctionContract(provider);
    if (!auctionContract) throw new Error("Auction contract not found");
    
    // Convert bid amount to wei
    const bidAmountWei = ethers.parseEther(bidAmount);
    
    const tx = await auctionContract.bid(auctionId, {
      value: bidAmountWei
    });
    
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash
    };
  } catch (error) {
    handleError("Failed to place bid", error);
    throw error;
  }
};

export const endAuction = async (
  provider,
  auctionId
) => {
  try {
    const auctionContract = await getAuctionContract(provider);
    if (!auctionContract) throw new Error("Auction contract not found");
    
    const tx = await auctionContract.endAuction(auctionId);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash
    };
  } catch (error) {
    handleError("Failed to end auction", error);
    throw error;
  }
};

export const cancelAuction = async (
  provider,
  auctionId
) => {
  try {
    const auctionContract = await getAuctionContract(provider);
    if (!auctionContract) throw new Error("Auction contract not found");
    
    const tx = await auctionContract.cancelAuction(auctionId);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash
    };
  } catch (error) {
    handleError("Failed to cancel auction", error);
    throw error;
  }
};

export const withdrawFunds = async (
  provider,
  auctionId
) => {
  try {
    const auctionContract = await getAuctionContract(provider);
    if (!auctionContract) throw new Error("Auction contract not found");
    
    const tx = await auctionContract.withdraw(auctionId);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash
    };
  } catch (error) {
    handleError("Failed to withdraw funds", error);
    throw error;
  }
};

export const getAuctionDetails = async (
  provider,
  auctionId
) => {
  try {
    const auctionContract = await getAuctionContract(provider);
    if (!auctionContract) throw new Error("Auction contract not found");
    
    const details = await auctionContract.getAuction(auctionId);
    
    return {
      seller: details[0],
      nftAddress: details[1],
      tokenId: details[2].toString(),
      startingBid: ethers.formatEther(details[3]),
      highestBid: ethers.formatEther(details[4]),
      highestBidder: details[5],
      endTime: new Date(Number(details[6]) * 1000),
      ended: details[7]
    };
  } catch (error) {
    handleError("Failed to get auction details", error);
    throw error;
  }
};

export const getPendingReturns = async (
  provider,
  auctionId,
  bidder
) => {
  try {
    const auctionContract = await getAuctionContract(provider);
    if (!auctionContract) throw new Error("Auction contract not found");
    
    const pendingAmount = await auctionContract.getPendingReturns(auctionId, bidder);
    
    return ethers.formatEther(pendingAmount);
  } catch (error) {
    handleError("Failed to get pending returns", error);
    throw error;
  }
};