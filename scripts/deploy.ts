import { ethers } from "hardhat";

async function main() {
  console.log("Bắt đầu triển khai smart contract...");

  const MyNFT = await ethers.deployContract("MyNFT");
  await MyNFT.waitForDeployment();

  console.log("MyNFT đã được triển khai tại:", await MyNFT.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 