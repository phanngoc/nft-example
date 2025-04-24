import { create } from '@web3-storage/w3up-client';

// Tạo client
export async function createClient() {
  try {
    const client = await create();
    
    if (!process.env.WEB3_STORAGE_KEY) {
      throw new Error('WEB3_STORAGE_KEY không được định nghĩa trong biến môi trường');
    }
    
    // Lưu ý: Hiện tại w3up-client yêu cầu định dạng email@key
    // Đảm bảo WEB3_STORAGE_KEY được định dạng đúng
    await client.login(process.env.WEB3_STORAGE_KEY as `${string}@${string}`);
    
    return client;
  } catch (error) {
    console.error('Lỗi khi tạo Web3.Storage client:', error);
    throw error;
  }
}

// Upload file lên IPFS
export async function uploadToIPFS(file: File) {
  try {
    const client = await createClient();
    
    // Tạo space nếu chưa có
    const space = await client.createSpace('nft-space');
    await client.setCurrentSpace(space.did());
    
    // Upload file và lấy CID
    const cid = await client.uploadFile(file);
    
    // Trả về URL IPFS
    const ipfsUrl = `ipfs://${cid}`;
    return ipfsUrl;
  } catch (error) {
    console.error('Lỗi khi upload file lên IPFS:', error);
    throw error;
  }
}

// Tạo metadata và upload lên IPFS
export async function createAndUploadMetadata(name: string, description: string, imageUrl: string, attributes: any[] = []) {
  try {
    const metadata = {
      name,
      description,
      image: imageUrl,
      attributes
    };
    
    // Tạo file từ metadata
    const metadataFile = new File(
      [JSON.stringify(metadata, null, 2)],
      'metadata.json',
      { type: 'application/json' }
    );
    
    // Upload metadata lên IPFS
    const metadataUrl = await uploadToIPFS(metadataFile);
    return metadataUrl;
  } catch (error) {
    console.error('Lỗi khi tạo và upload metadata:', error);
    throw error;
  }
} 