import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletConnectorProps {
  onConnect: (address: string) => void;
  onDisconnect?: () => void; // New prop for disconnect event
}

export default function WalletConnector({ onConnect, onDisconnect }: WalletConnectorProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Kiểm tra nếu provider hiện tại có phải là MetaMask hay không
  const isMetaMask = () => {
    return window.ethereum && window.ethereum.isMetaMask ? true : false;
  };

  // Check if wallet is already connected
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);
  
  // Listen for account changes
  useEffect(() => {
    if (window.ethereum && isMetaMask()) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          onConnect(accounts[0]);
        } else {
          setAccount(null);
          // Call onDisconnect when MetaMask itself disconnects the account
          if (onDisconnect) onDisconnect();
        }
      });
    }
    
    return () => {
      if (window.ethereum && isMetaMask()) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, [onConnect, onDisconnect]);

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        setError('Hãy cài đặt MetaMask!');
        return;
      }

      if (!isMetaMask()) {
        setError('Vui lòng sử dụng ví MetaMask!');
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
        setError('Hãy cài đặt MetaMask!');
        return;
      }
      
      if (!isMetaMask()) {
        setError('Vui lòng sử dụng ví MetaMask! Hãy chắc chắn MetaMask đã được cài đặt và được chọn làm ví mặc định.');
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

  // New disconnect wallet function
  const disconnectWallet = async () => {
    try {
      setAccount(null);
      
      // Clear any stored connection data in localStorage if you have any
      localStorage.removeItem('walletConnected');
      
      // Notify parent component about disconnection
      if (onDisconnect) {
        onDisconnect();
      }
      
      // Note: MetaMask doesn't have a "disconnect" method in its API
      // This is a workaround to simulate disconnection from our app's perspective
      console.log('Wallet disconnected from application');
    } catch (error) {
      console.error('Lỗi ngắt kết nối ví:', error);
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
          
          {/* New disconnect button */}
          <button
            onClick={disconnectWallet}
            className="mt-3 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Ngắt kết nối ví
          </button>
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