import { ethers } from "hardhat";

async function main() {
  console.log("\n----- BẮT ĐẦU TRIỂN KHAI NFT SMART CONTRACT -----\n");

  try {
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Triển khai từ địa chỉ: ${deployer.address}`);
    
    // Get the account balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`Số dư tài khoản: ${ethers.formatEther(balance)} ETH\n`);
    
    // Deploy the contract
    console.log("Đang triển khai smart contract MyNFT...");
    const MyNFT = await ethers.deployContract("MyNFT");
    
    await MyNFT.waitForDeployment();
    const contractAddress = await MyNFT.getAddress();
    
    console.log(`\n✅ MyNFT đã được triển khai thành công tại địa chỉ: ${contractAddress}`);
    
    console.log("\n----- THÔNG TIN CẤU HÌNH -----");
    console.log("Hãy cập nhật file .env.local của bạn với địa chỉ hợp đồng:");
    console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\nBạn có thể xem hợp đồng trên blockchain explorer:");
    
    // Check if it's a testnet deployment
    const networkName = (await ethers.provider.getNetwork()).name;
    if (networkName === "sepolia") {
      console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
    } else if (networkName === "mainnet") {
      console.log(`https://etherscan.io/address/${contractAddress}`);
    } else {
      console.log(`Mạng: ${networkName}`);
      console.log(`Địa chỉ hợp đồng: ${contractAddress}`);
    }
  } catch (error) {
    console.error("\n❌ Lỗi khi triển khai smart contract:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});