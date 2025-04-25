import { ethers } from "hardhat";
import * as fs from "fs";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: ".env" });

async function main() {
  console.log("Starting NFTAuction contract deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy NFTAuction contract
  const NFTAuction = await ethers.getContractFactory("NFTAuction");
  const auction = await NFTAuction.deploy();
  await auction.waitForDeployment();

  const auctionAddress = await auction.getAddress();
  console.log("NFTAuction contract deployed to:", auctionAddress);

  // Update env file with the new contract address
  try {
    const envFilePath = path.resolve(__dirname, "../.env");
    let envContent = "";
    
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, "utf8");
    }

    // Check if NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS already exists
    if (envContent.includes("NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=")) {
      // Update existing value
      envContent = envContent.replace(
        /NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=${auctionAddress}`
      );
    } else {
      // Add new entry
      envContent += `\n\n# Địa chỉ hợp đồng đấu giá NFT\nNEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=${auctionAddress}`;
    }

    fs.writeFileSync(envFilePath, envContent);
    console.log("Updated .env with the auction contract address");
  } catch (error) {
    console.error("Failed to update .env file:", error);
  }

  console.log("Deployment complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });