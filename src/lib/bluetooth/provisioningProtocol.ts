export const BLE_UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_UART_WRITE_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_UART_NOTIFY_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_WRITE_CHUNK_SIZE = 512;

export function crc16(data: Uint8Array): number {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc;
}

export function encodeConfig(obj: object): Uint8Array {
  const jsonString = JSON.stringify(obj);
  const encoder = new TextEncoder();
  const payload = encoder.encode(jsonString);
  
  const checksum = crc16(payload);
  const buffer = new Uint8Array(payload.length + 2);
  buffer.set(payload);
  buffer[payload.length] = (checksum >> 8) & 0xFF;
  buffer[payload.length + 1] = checksum & 0xFF;
  
  return buffer;
}

export function decodeResponse(buffer: DataView | ArrayBuffer | Uint8Array): { success: boolean; message: string } {
  const bytes = buffer instanceof DataView
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : buffer instanceof Uint8Array
      ? buffer
      : new Uint8Array(buffer);

  if (bytes.length < 3) {
    return { success: false, message: 'Invalid response: payload is too short' };
  }

  const payload = bytes.subarray(0, bytes.length - 2);
  const receivedChecksum = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
  if (crc16(payload) !== receivedChecksum) {
    return { success: false, message: 'Invalid response: checksum verification failed' };
  }

  const message = new TextDecoder().decode(payload);
  return { success: message.includes('SUCCESS'), message };
}
