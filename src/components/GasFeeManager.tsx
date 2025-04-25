import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface GasFeeManagerProps {
  onGasSettingsChange: (settings: GasSettings) => void;
  disabled?: boolean;
}

export interface GasSettings {
  maxFeePerGas: string;     // in Gwei
  maxPriorityFeePerGas: string; // in Gwei
  gasLimit: string;         // in units
  customGasEnabled: boolean;
}

export default function GasFeeManager({ onGasSettingsChange, disabled = false }: GasFeeManagerProps) {
  const [gasSettings, setGasSettings] = useState<GasSettings>({
    maxFeePerGas: '0',
    maxPriorityFeePerGas: '0',
    gasLimit: '0',
    customGasEnabled: false
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current gas prices on component mount
  useEffect(() => {
    fetchGasPrices();
  }, []);

  // Fetch current network gas prices
  const fetchGasPrices = async () => {
    try {
      setIsLoading(true);
      
      if (!window.ethereum) {
        throw new Error('No Ethereum provider detected');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get the latest fee data from the network
      const feeData = await provider.getFeeData();
      
      // Convert from Wei to Gwei for better readability
      const maxFeePerGas = feeData.maxFeePerGas ? 
        ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : '30';
      
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? 
        ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : '1.5';
      
      // Set default gas limit for NFT minting (this might need adjustment based on your contract)
      const gasLimit = '250000';
      
      const newSettings = {
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasLimit,
        customGasEnabled: false
      };
      
      setGasSettings(newSettings);
      onGasSettingsChange(newSettings);
      
    } catch (error) {
      console.error('Error fetching gas prices:', error);
      
      // Set fallback values if fetch fails
      const fallbackSettings = {
        maxFeePerGas: '30',
        maxPriorityFeePerGas: '1.5',
        gasLimit: '250000',
        customGasEnabled: false
      };
      
      setGasSettings(fallbackSettings);
      onGasSettingsChange(fallbackSettings);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Handle changes to gas settings inputs
  const handleGasSettingChange = (field: keyof GasSettings, value: string | boolean) => {
    // Only allow numbers for number fields
    if (typeof value === 'string' && field !== 'customGasEnabled') {
      // Remove non-numeric characters, but allow decimal point for Gwei values
      const numericValue = field === 'gasLimit' 
        ? value.replace(/[^0-9]/g, '') 
        : value.replace(/[^0-9.]/g, '');
      
      setGasSettings(prev => {
        const newSettings = { 
          ...prev, 
          [field]: numericValue,
          // If user modifies gas settings manually, enable custom gas
          customGasEnabled: true
        };
        onGasSettingsChange(newSettings);
        return newSettings;
      });
    } 
    else if (field === 'customGasEnabled') {
      setGasSettings(prev => {
        const newSettings = { 
          ...prev, 
          customGasEnabled: value as boolean 
        };
        onGasSettingsChange(newSettings);
        return newSettings;
      });
    }
  };

  // Calculate estimated transaction cost
  const calculateEstimatedCost = (): string => {
    try {
      if (!gasSettings.maxFeePerGas || !gasSettings.gasLimit) return '0';
      
      const maxFeeGwei = parseFloat(gasSettings.maxFeePerGas);
      const gasLimitUnits = parseFloat(gasSettings.gasLimit);
      
      // Gas cost calculation: maxFeePerGas * gasLimit
      const gasCostGwei = maxFeeGwei * gasLimitUnits;
      const gasCostEth = gasCostGwei / 1_000_000_000;
      
      return gasCostEth.toFixed(8);
    } catch (error) {
      console.error('Error calculating gas cost:', error);
      return '0';
    }
  };

  // Reset to default/network gas prices
  const handleResetGasSettings = () => {
    fetchGasPrices();
    setShowAdvanced(false);
  };

  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold">Cấu hình phí Gas</h3>
        <div>
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-500 text-sm hover:text-blue-700"
            disabled={disabled}
          >
            {showAdvanced ? 'Ẩn cấu hình nâng cao' : 'Hiển thị cấu hình nâng cao'}
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <p className="text-sm text-gray-500">Đang tải thông tin phí gas...</p>
      ) : (
        <>
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="customGasEnabled"
              checked={gasSettings.customGasEnabled}
              onChange={(e) => handleGasSettingChange('customGasEnabled', e.target.checked)}
              className="mr-2"
              disabled={disabled}
            />
            <label htmlFor="customGasEnabled" className="text-sm">
              Tùy chỉnh phí gas
            </label>
          </div>
          
          {showAdvanced && (
            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Phí Gas tối đa (Gwei):
                </label>
                <input
                  type="text"
                  value={gasSettings.maxFeePerGas}
                  onChange={(e) => handleGasSettingChange('maxFeePerGas', e.target.value)}
                  className="border rounded w-full p-1 text-sm"
                  disabled={disabled || !gasSettings.customGasEnabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Phí gas tối đa mà bạn muốn trả cho giao dịch này
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Phí ưu tiên (Gwei):
                </label>
                <input
                  type="text"
                  value={gasSettings.maxPriorityFeePerGas}
                  onChange={(e) => handleGasSettingChange('maxPriorityFeePerGas', e.target.value)}
                  className="border rounded w-full p-1 text-sm"
                  disabled={disabled || !gasSettings.customGasEnabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Phần thưởng cho thợ đào để ưu tiên giao dịch của bạn
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Giới hạn Gas:
                </label>
                <input
                  type="text"
                  value={gasSettings.gasLimit}
                  onChange={(e) => handleGasSettingChange('gasLimit', e.target.value)}
                  className="border rounded w-full p-1 text-sm"
                  disabled={disabled || !gasSettings.customGasEnabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Số lượng đơn vị gas tối đa cho giao dịch này
                </p>
              </div>
              
              <button
                type="button"
                onClick={handleResetGasSettings}
                className="text-xs text-blue-500 hover:text-blue-700"
                disabled={disabled}
              >
                Khôi phục giá trị mặc định
              </button>
            </div>
          )}
          
          <div className="bg-blue-50 p-2 rounded">
            <div className="flex justify-between text-sm">
              <span>Ước tính phí giao dịch:</span>
              <span className="font-medium">{calculateEstimatedCost()} ETH</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}