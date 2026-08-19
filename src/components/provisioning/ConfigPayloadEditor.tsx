import React, { useState } from 'react';
import { BLE_WRITE_CHUNK_SIZE, encodeConfig } from '../../lib/bluetooth/provisioningProtocol';

interface ConfigPayloadEditorProps {
  writeCharacteristic: BluetoothRemoteGATTCharacteristic | null;
  onWriteSuccess: () => void;
  onWriteError: (error: string) => void;
}

export const ConfigPayloadEditor: React.FC<ConfigPayloadEditorProps> = ({
  writeCharacteristic,
  onWriteSuccess,
  onWriteError,
}) => {
  const [configText, setConfigText] = useState('{\n  "nodeId": "node-01",\n  "interval": 60\n}');
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  const handleWrite = async () => {
    if (!writeCharacteristic) {
      onWriteError('No BLE device connected');
      return;
    }

    setIsWriting(true);
    setWriteError(null);
    try {
      const configObj = JSON.parse(configText);
      const data = encodeConfig(configObj);
      
      for (let i = 0; i < data.length; i += BLE_WRITE_CHUNK_SIZE) {
        const chunk = data.slice(i, i + BLE_WRITE_CHUNK_SIZE);
        await writeCharacteristic.writeValue(chunk);
        if (i + BLE_WRITE_CHUNK_SIZE < data.length) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
      
      onWriteSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to write configuration';
      setWriteError(message);
      onWriteError(message);
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-gray-50">
      <label className="text-sm font-medium text-gray-700">Node Configuration (JSON)</label>
      <textarea
        aria-label="Node configuration JSON"
        className="w-full h-64 p-2 font-mono text-sm border rounded"
        value={configText}
        onChange={(e) => setConfigText(e.target.value)}
        disabled={isWriting}
      />
      {writeError && <p role="alert" className="text-sm text-red-600">{writeError}</p>}
      <button
        onClick={handleWrite}
        disabled={isWriting || !writeCharacteristic}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 transition-colors"
      >
        {isWriting ? 'Writing...' : 'Write Config'}
      </button>
    </div>
  );
};
