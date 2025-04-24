// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    // Using a uint256 for token ID counter instead of the deprecated Counters library
    uint256 private _nextTokenId;
    
    event NFTMinted(address owner, uint256 tokenId, string tokenURI);

    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}

    /**
     * @notice Mint a new NFT
     * @param recipient Address who will own the NFT
     * @param tokenURI URI to the NFT metadata stored on IPFS
     * @return tokenId The ID of the minted NFT
     */
    function mintNFT(address recipient, string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit NFTMinted(recipient, tokenId, tokenURI);
        
        return tokenId;
    }
}