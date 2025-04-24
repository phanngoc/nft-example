import { create } from '@web3-storage/w3up-client';

// Create Web3.Storage client
const getClient = async () => {
  if (!process.env.NEXT_PUBLIC_WEB3_STORAGE_KEY) {
    throw new Error('Web3.Storage API key is required. Please add it to .env.local');
  }
  
  const client = await create();
  await client.login(process.env.NEXT_PUBLIC_WEB3_STORAGE_KEY);
  return client;
};

/**
 * Upload a file to IPFS using Web3.Storage
 * @param file - The file to upload
 * @returns The IPFS URL for the uploaded file
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  try {
    const client = await getClient();
    const fileObject = new Blob([await file.arrayBuffer()]);
    
    // Create a CAR file and upload
    const upload = await client.uploadFile(fileObject);
    
    // Return the IPFS URL
    return `ipfs://${upload.root.toString()}`;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw new Error('Failed to upload file to IPFS');
  }
};

/**
 * Create metadata JSON and upload to IPFS
 * @param name - The name of the NFT
 * @param description - The description of the NFT
 * @param imageUrl - The IPFS URL of the NFT image
 * @param attributes - The attributes of the NFT
 * @returns The IPFS URL for the metadata JSON
 */
export const createAndUploadMetadata = async (
  name: string,
  description: string,
  imageUrl: string,
  attributes: Array<{ trait_type: string; value: string }>
): Promise<string> => {
  try {
    // Create metadata object according to OpenSea metadata standards
    const metadata = {
      name,
      description,
      image: imageUrl,
      attributes: attributes || []
    };

    // Convert to JSON
    const metadataJSON = JSON.stringify(metadata);
    
    // Upload JSON to IPFS
    const client = await getClient();
    const metadataBlob = new Blob([metadataJSON], { type: 'application/json' });
    const upload = await client.uploadFile(metadataBlob);
    
    return `ipfs://${upload.root.toString()}`;
  } catch (error) {
    console.error('Error creating and uploading metadata:', error);
    throw new Error('Failed to create and upload metadata');
  }
};