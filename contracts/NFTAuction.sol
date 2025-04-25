// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTAuction
 * @dev Contract for managing auctions of NFTs
 */
contract NFTAuction is ReentrancyGuard, Ownable {
    struct Auction {
        address seller;
        address nftAddress;
        uint256 tokenId;
        uint256 startingBid;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool ended;
    }

    // Separate mapping for pending returns to avoid "struct too large" error
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;
    mapping(uint256 => Auction) public auctions;
    uint256 public auctionCounter;
    
    // Service fee percentage (25 = 2.5%)
    uint256 public serviceFeePercentage = 25;
    uint256 public constant MAX_FEE_PERCENTAGE = 1000; // 100% with 1 decimal place precision
    
    // Events
    event AuctionCreated(uint256 indexed auctionId, address indexed seller, address indexed nftAddress, uint256 tokenId, uint256 startingBid, uint256 endTime);
    event NewBid(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event AuctionCancelled(uint256 indexed auctionId);
    event Withdrawn(address indexed bidder, uint256 amount);
    event ServiceFeeUpdated(uint256 oldFee, uint256 newFee);

    /**
     * @dev Constructor sets the contract owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new auction for an NFT
     * @param nftAddress Address of the NFT contract
     * @param tokenId ID of the NFT to auction
     * @param startingBid Minimum initial bid amount (in wei)
     * @param durationSeconds Duration of the auction in seconds
     * @return auctionId The ID of the created auction
     */
    function createAuction(
        address nftAddress,
        uint256 tokenId,
        uint256 startingBid,
        uint256 durationSeconds
    ) public returns (uint256) {
        require(startingBid > 0, "Starting bid must be greater than zero");
        require(durationSeconds > 0, "Auction duration must be greater than zero");
        
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "You are not the owner of this NFT");
        require(nft.isApprovedForAll(msg.sender, address(this)) || 
                nft.getApproved(tokenId) == address(this), "Auction contract not approved to transfer NFT");

        nft.transferFrom(msg.sender, address(this), tokenId);

        auctionCounter++;
        uint256 auctionId = auctionCounter;

        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftAddress: nftAddress,
            tokenId: tokenId,
            startingBid: startingBid,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + durationSeconds,
            ended: false
        });

        emit AuctionCreated(auctionId, msg.sender, nftAddress, tokenId, startingBid, auctions[auctionId].endTime);
        return auctionId;
    }

    /**
     * @notice Place a bid on an auction
     * @param auctionId ID of the auction
     */
    function bid(uint256 auctionId) public payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(!auction.ended, "Auction already ended");
        require(block.timestamp < auction.endTime, "Auction already expired");
        require(auction.seller != msg.sender, "Seller cannot bid on own auction");
        
        if (auction.highestBid == 0) {
            require(msg.value >= auction.startingBid, "Bid must be at least the starting bid");
        } else {
            // Require minimum increment (5%)
            uint256 minIncrement = auction.highestBid * 5 / 100;
            require(msg.value >= auction.highestBid + minIncrement, "Bid must be at least 5% higher than current bid");
        }

        // Refund the previous bidder
        if (auction.highestBidder != address(0)) {
            pendingReturns[auctionId][auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        // Extend auction if bid is made in the last 5 minutes (anti-sniping)
        if (auction.endTime - block.timestamp < 5 minutes) {
            auction.endTime += 5 minutes;
        }

        emit NewBid(auctionId, msg.sender, msg.value);
    }

    /**
     * @notice Withdraw pending returns from unsuccessful bids
     * @param auctionId ID of the auction
     */
    function withdraw(uint256 auctionId) public nonReentrant {
        uint256 amount = pendingReturns[auctionId][msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingReturns[auctionId][msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice End an auction and transfer NFT to winner
     * @param auctionId ID of the auction to end
     */
    function endAuction(uint256 auctionId) public nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(!auction.ended, "Auction already ended");
        require(
            block.timestamp >= auction.endTime || msg.sender == owner(),
            "Auction not yet ended and caller is not owner"
        );
        require(
            msg.sender == auction.seller || msg.sender == owner(),
            "Only seller or contract owner can end auction"
        );

        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            // Calculate service fee
            uint256 serviceFee = auction.highestBid * serviceFeePercentage / 1000;
            uint256 sellerAmount = auction.highestBid - serviceFee;
            
            // Transfer NFT to highest bidder
            IERC721(auction.nftAddress).transferFrom(address(this), auction.highestBidder, auction.tokenId);
            
            // Transfer funds to seller
            (bool sellerTransferSuccess, ) = payable(auction.seller).call{value: sellerAmount}("");
            require(sellerTransferSuccess, "Failed to transfer funds to seller");
            
            emit AuctionEnded(auctionId, auction.highestBidder, auction.highestBid);
        } else {
            // No bids, return NFT to seller
            IERC721(auction.nftAddress).transferFrom(address(this), auction.seller, auction.tokenId);
            emit AuctionCancelled(auctionId);
        }
    }

    /**
     * @notice Cancel an auction if there are no bids
     * @param auctionId ID of the auction to cancel
     */
    function cancelAuction(uint256 auctionId) public nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(!auction.ended, "Auction already ended");
        require(msg.sender == auction.seller || msg.sender == owner(), "Not authorized to cancel");
        require(auction.highestBidder == address(0), "Cannot cancel auction with bids");

        auction.ended = true;
        
        // Return NFT to seller
        IERC721(auction.nftAddress).transferFrom(address(this), auction.seller, auction.tokenId);
        
        emit AuctionCancelled(auctionId);
    }

    /**
     * @notice Check if an auction exists
     * @param auctionId ID of the auction
     * @return exists Whether the auction exists
     */
    function auctionExists(uint256 auctionId) public view returns (bool) {
        return auctions[auctionId].seller != address(0);
    }

    /**
     * @notice Get auction details
     * @param auctionId ID of the auction
     * @return seller The address of the seller
     * @return nftAddress The address of the NFT contract
     * @return tokenId The ID of the token being auctioned
     * @return startingBid The minimum starting bid
     * @return highestBid The current highest bid
     * @return highestBidder The address of the current highest bidder
     * @return endTime The timestamp when the auction ends
     * @return ended Whether the auction has ended
     */
    function getAuction(uint256 auctionId) public view returns (
        address seller,
        address nftAddress,
        uint256 tokenId,
        uint256 startingBid,
        uint256 highestBid,
        address highestBidder,
        uint256 endTime,
        bool ended
    ) {
        Auction storage auction = auctions[auctionId];
        return (
            auction.seller,
            auction.nftAddress,
            auction.tokenId,
            auction.startingBid,
            auction.highestBid,
            auction.highestBidder,
            auction.endTime,
            auction.ended
        );
    }
    
    /**
     * @notice Get pending returns amount
     * @param auctionId ID of the auction
     * @param bidder Address of the bidder
     * @return Amount of pending returns
     */
    function getPendingReturns(uint256 auctionId, address bidder) public view returns (uint256) {
        return pendingReturns[auctionId][bidder];
    }
    
    /**
     * @notice Update service fee percentage (only owner)
     * @param newFeePercentage New fee percentage (25 = 2.5%)
     */
    function updateServiceFeePercentage(uint256 newFeePercentage) public onlyOwner {
        require(newFeePercentage <= MAX_FEE_PERCENTAGE, "Fee too high");
        
        uint256 oldFee = serviceFeePercentage;
        serviceFeePercentage = newFeePercentage;
        
        emit ServiceFeeUpdated(oldFee, newFeePercentage);
    }
    
    /**
     * @notice Withdraw accumulated service fees (only owner)
     */
    function withdrawServiceFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }
}