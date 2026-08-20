import { test, expect } from '@playwright/test';

test.describe('BLE provisioning', () => {
  test('provisions a node through the scan, configure, and verify steps', async ({ page }) => {
    await page.addInitScript(() => {
      class MockCharacteristic extends EventTarget {
        value: DataView | null = null;
        writes: Uint8Array[] = [];

        async writeValue(value: Uint8Array) {
          this.writes.push(value);
          const payload = new TextEncoder().encode('SUCCESS');
          let checksum = 0xffff;
          for (const byte of payload) {
            checksum ^= byte << 8;
            for (let bit = 0; bit < 8; bit += 1) {
              checksum = ((checksum & 0x8000) ? (checksum << 1) ^ 0x1021 : checksum << 1) & 0xffff;
            }
          }
          const response = new Uint8Array([...payload, checksum >> 8, checksum & 0xff]);
          this.value = new DataView(response.buffer);
          this.dispatchEvent(new Event('characteristicvaluechanged'));
        }

        async startNotifications() {}
        async stopNotifications() {}
      }

      const writeCharacteristic = new MockCharacteristic();
      const notifyCharacteristic = new MockCharacteristic();
      const service = {
        getCharacteristic: async (uuid: string) => uuid.endsWith('002') ? writeCharacteristic : notifyCharacteristic,
      };
      const device = {
        name: 'Mock Sensor Node',
        gatt: {
          connected: false,
          connect: async () => {
            device.gatt.connected = true;
            return device.gatt;
          },
          disconnect: async () => {
            device.gatt.connected = false;
          },
          getPrimaryService: async () => service,
        },
      };

      Object.defineProperty(navigator, 'bluetooth', {
        configurable: true,
        value: {
          requestDevice: async () => device,
          __mocks__: { device, writeCharacteristic, notifyCharacteristic },
        },
      });
    });

    await page.goto('/admin/provisioning');
    await page.getByRole('button', { name: 'Open Device Scanner' }).click();
    await page.getByRole('button', { name: 'Scan for Devices' }).click();
    await expect(page.getByText('Ready for provisioning')).toBeVisible();

    await page.getByRole('button', { name: 'Write Config' }).click();
    await expect(page.getByText('Provisioning Successful!')).toBeVisible();
  });
});