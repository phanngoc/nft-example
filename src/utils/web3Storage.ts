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

// Lấy metadata từ IPFS
export async function fetchMetadataFromIPFS(metadataUrl: string) {
  try {
    // Chuyển đổi từ ipfs:// thành gateway HTTP
    const httpUrl = metadataUrl.replace('ipfs://', 'https://w3s.link/ipfs/');
    
    const response = await fetch(httpUrl);
    if (!response.ok) {
      throw new Error(`Không thể tải metadata: ${response.statusText}`);
    }
    
    const metadata = await response.json();
    return metadata;
  } catch (error) {
    console.error('Lỗi khi lấy metadata từ IPFS:', error);
    throw error;
  }
}

// Lấy nội dung file từ IPFS
export async function fetchContentFromIPFS(ipfsUrl: string) {
  try {
    // Chuyển đổi từ ipfs:// thành gateway HTTP
    const httpUrl = ipfsUrl.replace('ipfs://', 'https://w3s.link/ipfs/');
    
    const response = await fetch(httpUrl);
    if (!response.ok) {
      throw new Error(`Không thể tải nội dung: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('Lỗi khi lấy nội dung từ IPFS:', error);
    throw error;
  }
}

// Kiểm tra trạng thái của file trên IPFS
export async function checkFileStatus(cid: string) {
  try {
    const client = await createClient();
    
    // Tạo HTTP request để kiểm tra trạng thái qua gateway
    const response = await fetch(`https://w3s.link/ipfs/${cid}`);
    
    return {
      available: response.ok,
      statusCode: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái file:', error);
    throw error;
  }
}

// Upload nhiều file cùng lúc
export async function uploadMultipleFilesToIPFS(files: File[]) {
  try {
    const client = await createClient();
    
    // Tạo space nếu chưa có
    const space = await client.createSpace('nft-space');
    await client.setCurrentSpace(space.did());
    
    // Upload từng file và thu thập các CID
    const results = await Promise.all(
      files.map(async (file) => {
        const cid = await client.uploadFile(file);
        return {
          name: file.name,
          cid,
          url: `ipfs://${cid}`
        };
      })
    );
    
    return results;
  } catch (error) {
    console.error('Lỗi khi upload nhiều file lên IPFS:', error);
    throw error;
  }
}

// Tạo và upload collection metadata (cho bộ sưu tập NFT)
export async function createAndUploadCollectionMetadata(
  name: string, 
  description: string, 
  image: string, 
  externalLink?: string,
  sellerFeeBasisPoints?: number,
  feeRecipient?: string
) {
  try {
    const metadata = {
      name,
      description,
      image,
      external_link: externalLink,
      seller_fee_basis_points: sellerFeeBasisPoints || 0,
      fee_recipient: feeRecipient,
      timestamp: new Date().toISOString()
    };
    
    // Tạo file từ metadata
    const metadataFile = new File(
      [JSON.stringify(metadata, null, 2)],
      'collection-metadata.json',
      { type: 'application/json' }
    );
    
    // Upload metadata lên IPFS
    const metadataUrl = await uploadToIPFS(metadataFile);
    return metadataUrl;
  } catch (error) {
    console.error('Lỗi khi tạo và upload metadata collection:', error);
    throw error;
  }
} 