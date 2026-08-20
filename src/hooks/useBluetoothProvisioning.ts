import { useState, useCallback } from 'react';
import { BLE_UART_SERVICE_UUID, BLE_UART_WRITE_UUID, BLE_UART_NOTIFY_UUID } from '../lib/bluetooth/provisioningProtocol';

const CONNECTION_TIMEOUT_MS = 10_000;
let activeDevice: BluetoothDevice | null = null;

interface BluetoothState {
  device: BluetoothDevice | null;
  server: BluetoothRemoteGATTServer | null;
  service: BluetoothRemoteGATTService | null;
  writeChar: BluetoothRemoteGATTCharacteristic | null;
  notifyChar: BluetoothRemoteGATTCharacteristic | null;
  isConnected: boolean;
  error: string | null;
}

export function useBluetoothProvisioning() {
  const [state, setState] = useState<BluetoothState>({
    device: null,
    server: null,
    service: null,
    writeChar: null,
    notifyChar: null,
    isConnected: false,
    error: null,
  });

  const connect = useCallback(async () => {
    let connectingDevice: BluetoothDevice | null = null;
    try {
      setState(prev => ({ ...prev, error: null }));

      if (!('bluetooth' in navigator)) {
        throw new Error('Web Bluetooth is unavailable. Use a supported browser over HTTPS.');
      }
      if (activeDevice?.gatt.connected) {
        throw new Error('Another BLE device is already connected. Disconnect it before scanning again.');
      }

      const bluetooth = (navigator as NavigatorWithBluetooth).bluetooth;
      const withTimeout = <T,>(promise: Promise<T>): Promise<T> => new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('BLE connection timed out after 10 seconds')), CONNECTION_TIMEOUT_MS);
        promise.then(
          value => {
            clearTimeout(timeoutId);
            resolve(value);
          },
          error => {
            clearTimeout(timeoutId);
            reject(error);
          },
        );
      });

      const device = await withTimeout(bluetooth.requestDevice({
        filters: [{ services: [BLE_UART_SERVICE_UUID] }],
      }));
      connectingDevice = device;

      const server = await withTimeout(device.gatt.connect());
      const service = await withTimeout(server.getPrimaryService(BLE_UART_SERVICE_UUID));
      const writeChar = await withTimeout(service.getCharacteristic(BLE_UART_WRITE_UUID));
      const notifyChar = await withTimeout(service.getCharacteristic(BLE_UART_NOTIFY_UUID));

      activeDevice = device;

      setState({
        device,
        server,
        service,
        writeChar,
        notifyChar,
        isConnected: true,
        error: null,
      });

      return { device, server, service, writeChar, notifyChar };
    } catch (error) {
      if (connectingDevice?.gatt.connected) {
        await connectingDevice.gatt.disconnect().catch(() => {});
      }
      if (activeDevice === connectingDevice) {
        activeDevice = null;
      }
      const errMsg = error instanceof Error ? error.message : 'Failed to connect to BLE device';
      setState(prev => ({ ...prev, error: errMsg, isConnected: false }));
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (state.device && state.device.gatt.connected) {
      await state.device.gatt.disconnect();
    }
    if (activeDevice === state.device) {
      activeDevice = null;
    }
    setState({
      device: null,
      server: null,
      service: null,
      writeChar: null,
      notifyChar: null,
      isConnected: false,
      error: null,
    });
  }, [state.device]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
