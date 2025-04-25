import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletConnectorProps {
  onConnect: (address: string) => void;
}

export default function WalletConnector({ onConnect }: WalletConnectorProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Check if wallet is already connected
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);
  
  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          onConnect(accounts[0]);
        } else {
          setAccount(null);
        }
      });
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, [onConnect]);

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        setError('Hãy cài đặt MetaMask hoặc ví tương thích!');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        setAccount(accounts[0].address);
        onConnect(accounts[0].address);
      }
    } catch (error) {
      console.error('Lỗi kiểm tra kết nối ví:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!window.ethereum) {
        setError('Hãy cài đặt MetaMask hoặc ví tương thích!');
        return;
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        onConnect(accounts[0]);
      }
    } catch (error: any) {
      console.error('Lỗi kết nối ví:', error);
      if (error.code === 4001) {
        setError('Bạn đã từ chối kết nối ví.');
      } else {
        setError('Lỗi khi kết nối ví. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 p-4 border rounded-lg bg-white">
      <h2 className="text-xl font-bold mb-2">Kết nối ví</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {account ? (
        <div className="flex flex-col items-start">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm mb-2">
            Đã kết nối
          </div>
          <p className="text-gray-700 break-all">
            <span className="font-medium">Địa chỉ ví:</span> {account.substring(0, 6)}...{account.substring(account.length - 4)}
            <button 
              className="ml-2 text-blue-500 underline text-sm"
              onClick={() => {navigator.clipboard.writeText(account)}}
            >
              Copy
            </button>
          </p>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {isLoading ? 'Đang kết nối...' : 'Kết nối ví MetaMask'}
        </button>
      )}
    </div>
  );
}