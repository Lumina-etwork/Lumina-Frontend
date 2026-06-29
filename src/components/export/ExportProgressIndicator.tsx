import { useEffect, useState, useRef } from 'react';

interface ExportProgressIndicatorProps {
  progress: number;
  bytesReceived: number;
  bytesTotal: number | null;
  status: 'idle' | 'initializing' | 'downloading' | 'complete' | 'error' | 'aborted';
  onAbort?: () => void;
}

export function ExportProgressIndicator({ 
  progress, 
  bytesReceived, 
  bytesTotal, 
  status, 
  onAbort 
}: ExportProgressIndicatorProps) {
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const lastBytesRef = useRef(bytesReceived);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    if (status === 'downloading' && bytesReceived > lastBytesRef.current) {
      const now = Date.now();
      const timeDiff = (now - lastTimeRef.current) / 1000;
      const byteDiff = bytesReceived - lastBytesRef.current;
      const currentSpeed = byteDiff / timeDiff;

      setSpeedHistory(prev => {
        const newHistory = [...prev, currentSpeed];
        if (newHistory.length > 10) {
          return newHistory.slice(newHistory.length - 10);
        }
        return newHistory;
      });

      lastBytesRef.current = bytesReceived;
      lastTimeRef.current = now;
    }
  }, [bytesReceived, status]);

  const averageSpeed = speedHistory.length > 0 
    ? speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length 
    : 0;

  const remainingBytes = bytesTotal ? Math.max(0, bytesTotal - bytesReceived) : 0;
  const estimatedSeconds = averageSpeed > 0 ? remainingBytes / averageSpeed : 0;
  const estimatedMinutes = Math.floor(estimatedSeconds / 60);
  const remainingSecs = Math.floor(estimatedSeconds % 60);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready to export';
      case 'initializing':
        return 'Initializing export...';
      case 'downloading':
        return 'Downloading data...';
      case 'complete':
        return 'Export complete!';
      case 'error':
        return 'Export failed';
      case 'aborted':
        return 'Export cancelled';
      default:
        return '';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {getStatusText()}
      </h3>

      {status !== 'idle' && (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span>{formatBytes(bytesReceived)}</span>
              {bytesTotal && <span>{formatBytes(bytesTotal)}</span>}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              {progress.toFixed(1)}%
            </div>
          </div>

          {status === 'downloading' && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {averageSpeed > 0 && (
                <div>
                  Speed: {formatBytes(averageSpeed)}/s
                </div>
              )}
              {estimatedSeconds > 0 && (
                <div>
                  Estimated time remaining: {estimatedMinutes}m {remainingSecs}s
                </div>
              )}
            </div>
          )}

          {status === 'downloading' && onAbort && (
            <button
              onClick={onAbort}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Cancel Export
            </button>
          )}
        </>
      )}
    </div>
  );
}
