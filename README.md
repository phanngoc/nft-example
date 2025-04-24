# NFT Minting Pipeline

Dự án mẫu giúp upload ảnh lên IPFS, tạo metadata JSON và mint NFT sử dụng Web3.Storage thay vì Pinata.

## Tính năng

- 🔁 Upload ảnh lên IPFS sử dụng Web3.Storage
- 📦 Tự động tạo metadata JSON và lưu trữ trên IPFS
- 🔗 Tương tác với smart contract để mint NFT

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

3. Tạo file `.env.local` với nội dung sau:

```
# Cấu hình Web3.Storage - Lấy key tại https://web3.storage
NEXT_PUBLIC_WEB3_STORAGE_KEY=your_web3_storage_email@your_web3_storage_key

# Cấu hình mạng Ethereum (ví dụ: Sepolia)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your_infura_key_here
PRIVATE_KEY=your_wallet_private_key_here

# Địa chỉ hợp đồng NFT sau khi deploy
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=your_deployed_contract_address
```

## Triển khai Smart Contract

1. Biên dịch smart contract:

```bash
npm run compile
```

2. Triển khai trên mạng thử nghiệm:

```bash
npm run deploy
```

3. Cập nhật `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` trong file `.env.local` với địa chỉ hợp đồng đã triển khai.

## Khởi chạy ứng dụng

```bash
npm run dev
```

Truy cập ứng dụng tại: http://localhost:3000

## Sử dụng

1. Kết nối ví MetaMask của bạn
2. Upload ảnh lên IPFS
3. Điền thông tin metadata (tên, mô tả)
4. Mint NFT

## Lưu ý

- Đảm bảo bạn có đủ ETH trong ví của mình để trả phí gas khi mint NFT
- Đây chỉ là dự án mẫu, hãy đảm bảo thực hiện thêm kiểm tra bảo mật trong môi trường sản xuất
- Web3.Storage là dịch vụ miễn phí nhưng có giới hạn lưu trữ, hãy kiểm tra chính sách hiện tại của họ
