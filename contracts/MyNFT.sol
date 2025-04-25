// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title MyNFT
 * @dev Enhanced security NFT contract with role-based access control, pausable functionality,
 * and reentrancy protection
 */
contract MyNFT is ERC721URIStorage, Ownable, AccessControl, Pausable, ReentrancyGuard {
    using Strings for uint256;
    
    // Using a uint256 for token ID counter
    uint256 private _nextTokenId;
    
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Mint limitations
    uint256 public mintPriceWei = 0; // Can be set to require payment for minting
    uint256 public maxTokensPerWallet = 10; // Maximum tokens per wallet
    uint256 public maxMintBatchSize = 5; // Maximum tokens to mint at once
    mapping(address => uint256) private _tokensMintedPerWallet; // Tracking minted tokens per address
    
    // URI validation
    string public baseTokenURI;
    bool public requireURIValidation = false; // Can be toggled to enforce URI validation
    
    // Events
    event NFTMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event MaxTokensPerWalletUpdated(uint256 oldLimit, uint256 newLimit);
    event MaxMintBatchSizeUpdated(uint256 oldSize, uint256 newSize);
    event BaseURIUpdated(string newBaseURI);
    event URIValidationToggled(bool requireValidation);

    /**
     * @dev Sets up the contract with roles and initial configuration
     */
    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Initialize with token ID 0
        _nextTokenId = 0;
    }
    
    /**
     * @notice Mint a new NFT with security checks
     * @param recipient Address who will own the NFT
     * @param tokenURI URI to the NFT metadata stored on IPFS
     * @return tokenId The ID of the minted NFT
     */
    function mintNFT(address recipient, string memory tokenURI) 
        public 
        payable 
        whenNotPaused 
        nonReentrant 
        returns (uint256) 
    {
        // Access control check
        require(
            hasRole(MINTER_ROLE, _msgSender()) || _msgSender() == owner(),
            "Must have minter role or be owner"
        );
        
        // Validate recipient
        require(recipient != address(0), "Recipient cannot be zero address");
        
        // Check if payment is required and provided
        if (mintPriceWei > 0) {
            require(msg.value >= mintPriceWei, "Insufficient payment for minting");
        }
        
        // Check token limit per wallet if recipient is not the owner
        if (recipient != owner()) {
            require(
                _tokensMintedPerWallet[recipient] < maxTokensPerWallet,
                "Maximum tokens per wallet reached"
            );
            _tokensMintedPerWallet[recipient]++;
        }
        
        // URI validation if required
        if (requireURIValidation) {
            require(
                bytes(tokenURI).length > 0 && _isValidURI(tokenURI),
                "Invalid token URI format"
            );
        }
        
        // Mint NFT
        uint256 tokenId = _nextTokenId++;
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit NFTMinted(recipient, tokenId, tokenURI);
        
        return tokenId;
    }
    
    /**
     * @notice Mint multiple NFTs at once to a single recipient
     * @param recipient Address who will own the NFTs
     * @param tokenURIs Array of URIs for the NFT metadata
     * @return Array of token IDs minted
     */
    function batchMintNFTs(address recipient, string[] memory tokenURIs) 
        public 
        payable 
        whenNotPaused 
        nonReentrant 
        returns (uint256[] memory) 
    {
        // Access control check
        require(
            hasRole(MINTER_ROLE, _msgSender()) || _msgSender() == owner(),
            "Must have minter role or be owner"
        );
        
        // Check batch size
        require(tokenURIs.length > 0, "Must mint at least one token");
        require(
            tokenURIs.length <= maxMintBatchSize,
            "Batch size exceeds maximum allowed"
        );
        
        // Check recipient
        require(recipient != address(0), "Recipient cannot be zero address");
        
        // Check payment
        require(
            msg.value >= mintPriceWei * tokenURIs.length,
            "Insufficient payment for batch minting"
        );
        
        // Check token limit per wallet if recipient is not the owner
        if (recipient != owner()) {
            require(
                _tokensMintedPerWallet[recipient] + tokenURIs.length <= maxTokensPerWallet,
                "Would exceed maximum tokens per wallet"
            );
            _tokensMintedPerWallet[recipient] += tokenURIs.length;
        }
        
        // Mint tokens
        uint256[] memory tokenIds = new uint256[](tokenURIs.length);
        for (uint256 i = 0; i < tokenURIs.length; i++) {
            if (requireURIValidation) {
                require(
                    bytes(tokenURIs[i]).length > 0 && _isValidURI(tokenURIs[i]),
                    "Invalid token URI format"
                );
            }
            
            uint256 tokenId = _nextTokenId++;
            _mint(recipient, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            tokenIds[i] = tokenId;
            
            emit NFTMinted(recipient, tokenId, tokenURIs[i]);
        }
        
        return tokenIds;
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @notice Pause contract functionality (emergency only)
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract functionality
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Set mint price
     * @param newPriceWei New price in wei
     */
    function setMintPrice(uint256 newPriceWei) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldPrice = mintPriceWei;
        mintPriceWei = newPriceWei;
        emit MintPriceUpdated(oldPrice, newPriceWei);
    }
    
    /**
     * @notice Set maximum tokens per wallet
     * @param maxTokens New maximum tokens per wallet
     */
    function setMaxTokensPerWallet(uint256 maxTokens) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldLimit = maxTokensPerWallet;
        maxTokensPerWallet = maxTokens;
        emit MaxTokensPerWalletUpdated(oldLimit, maxTokens);
    }
    
    /**
     * @notice Set maximum batch mint size
     * @param maxBatchSize New maximum batch size
     */
    function setMaxMintBatchSize(uint256 maxBatchSize) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldSize = maxMintBatchSize;
        maxMintBatchSize = maxBatchSize;
        emit MaxMintBatchSizeUpdated(oldSize, maxBatchSize);
    }
    
    /**
     * @notice Toggle URI validation requirement
     * @param requireValidation Whether to require URI validation
     */
    function setURIValidation(bool requireValidation) public onlyRole(DEFAULT_ADMIN_ROLE) {
        requireURIValidation = requireValidation;
        emit URIValidationToggled(requireValidation);
    }
    
    /**
     * @notice Set base token URI
     * @param newBaseURI New base URI
     */
    function setBaseTokenURI(string memory newBaseURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }
    
    /**
     * @notice Grant minter role to an address
     * @param minter Address to grant role to
     */
    function grantMinterRole(address minter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, minter);
    }
    
    /**
     * @notice Revoke minter role from an address
     * @param minter Address to revoke role from
     */
    function revokeMinterRole(address minter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, minter);
    }
    
    /**
     * @notice Withdraw contract balance to owner
     */
    function withdraw() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    
    /**
     * @dev Validates URI format (IPFS or HTTP)
     * @param uri The URI to validate
     * @return Whether the URI is valid
     */
    function _isValidURI(string memory uri) internal pure returns (bool) {
        bytes memory uriBytes = bytes(uri);
        if (uriBytes.length < 7) return false;
        
        // Check for ipfs:// format
        if (uriBytes[0] == "i" && uriBytes[1] == "p" && uriBytes[2] == "f" && 
            uriBytes[3] == "s" && uriBytes[4] == ":" && uriBytes[5] == "/" && uriBytes[6] == "/") {
            return true;
        }
        
        // Check for http:// or https:// format
        if ((uriBytes[0] == "h" && uriBytes[1] == "t" && uriBytes[2] == "t" && uriBytes[3] == "p" && 
            ((uriBytes[4] == ":" && uriBytes[5] == "/" && uriBytes[6] == "/") || 
             (uriBytes[4] == "s" && uriBytes[5] == ":" && uriBytes[6] == "/" && uriBytes[7] == "/")))) {
            return true;
        }
        
        return false;
    }
    
    // ========== OVERRIDES ==========
    
    /**
     * @dev Override for token transfers to enforce pausability
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override whenNotPaused returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Override for supportsInterface to handle multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}