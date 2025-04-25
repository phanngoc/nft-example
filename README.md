# NFT Minting Pipeline

Dự án mẫu giúp upload ảnh lên IPFS, tạo metadata JSON và mint NFT sử dụng Web3.Storage.

## Tính năng

- 🔁 Upload ảnh lên IPFS sử dụng Web3.Storage
- 📦 Tự động tạo metadata JSON và lưu trữ trên IPFS
- 🔗 Tương tác với smart contract để mint NFT
- 🖼️ Gallery hiển thị NFT đã mint
- 👛 Kết nối với MetaMask và các ví web3 khác

## Cài đặt

1. Clone repository này:

```bash
git clone https://github.com/yourusername/nft-minting-pipeline.git
cd nft-minting-pipeline
```

2. Cài đặt dependencies:

```bash
npm install
```

3. Tạo file `.env.local` từ template `.env.example`:

```bash
cp .env.example .env.local
```

4. Cấu hình các biến môi trường trong file `.env.local`:
   - Lấy API key Web3.Storage từ https://web3.storage
   - Cài đặt RPC URL và private key cho mạng thử nghiệm (Sepolia)
   - Thêm địa chỉ hợp đồng sau khi deploy

## Triển khai Smart Contract

1. Biên dịch smart contract:

```bash
npx hardhat compile
```

2. Triển khai trên mạng thử nghiệm:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

3. Cập nhật `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` trong file `.env` với địa chỉ hợp đồng đã triển khai.

## Khởi chạy ứng dụng

```bash
npm run dev
```

Truy cập ứng dụng tại: http://localhost:3000

## Hướng dẫn sử dụng

1. **Kết nối ví**: Nhấp vào nút "Kết nối ví MetaMask" để kết nối ví của bạn
2. **Upload ảnh**: Chọn một hình ảnh để tải lên IPFS
3. **Tạo metadata**: Điền thông tin tên và mô tả cho NFT của bạn
4. **Mint NFT**: Nhấn nút để mint NFT của bạn vào blockchain
5. **Xem NFT**: NFT đã mint sẽ hiển thị trong gallery phía dưới

## Cấu trúc dự án

```
├── contracts/           # Smart contracts 
│   └── MyNFT.sol        # NFT smart contract
├── scripts/             # Scripts triển khai
│   └── deploy.ts        # Script triển khai smart contract
├── src/
│   ├── artifacts/       # ABI và bytecode của contract
│   ├── components/      # React components
│   ├── pages/           # Next.js pages
│   ├── styles/          # CSS styles
│   └── utils/           # Các utility functions
│       ├── contract.ts  # Tương tác với smart contract
│       └── web3Storage.ts # Tương tác với IPFS qua Web3.Storage
├── test/                # Test files
└── hardhat.config.ts    # Cấu hình Hardhat
```

## Lưu ý

- Đảm bảo bạn có đủ ETH trong ví của mình để trả phí gas khi mint NFT
- Dự án này sử dụng mạng thử nghiệm Sepolia, bạn cần lấy ETH từ faucet
- Web3.Storage có giới hạn lưu trữ, hãy kiểm tra chính sách hiện tại của họ

## Các công nghệ sử dụng

- **Frontend**: Next.js, React, Tailwind CSS
- **Blockchain**: Ethereum, Hardhat, Ethers.js
- **Storage**: IPFS via Web3.Storage
- **Smart Contract**: Solidity, OpenZeppelin
