/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

test.describe('BLE Provisioning Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockCharacteristicNotify = {
        startNotifications: async () => {},
        stopNotifications: async () => {},
        addEventListener: function (this: { _cb?: (event: unknown) => void }, _event: string, cb: (event: unknown) => void) {
          this._cb = cb;
        },
        removeEventListener: function () {},
        simulateNotification: function (this: { _cb?: (event: unknown) => void; value?: DataView }, val: Uint8Array) {
          this.value = new DataView(val.buffer);
          if (this._cb) this._cb({ target: this });
        },
      };

      const mockCharacteristicWrite = {
        writeValue: async () => Promise.resolve(),
      };

      const matchesUuid = (uuid: string, expected: string) =>
        String(uuid).toLowerCase().replace(/[^a-f0-9]/g, '') ===
        expected.toLowerCase().replace(/[^a-f0-9]/g, '');

      const mockService = {
        getCharacteristic: async (uuid: string) => {
          if (matchesUuid(uuid, '6e400002-b5a3-f393-e0a9-e50e24dcca9e')) {
            return mockCharacteristicWrite;
          }
          if (matchesUuid(uuid, '6e400003-b5a3-f393-e0a9-e50e24dcca9e')) {
            return mockCharacteristicNotify;
          }
          throw new Error(`Characteristic not found: ${uuid}`);
        },
      };

      const mockServer = {
        getPrimaryService: async () => mockService,
        disconnect: async () => {},
      };

      const mockDevice = {
        name: 'Test Node',
        gatt: {
          connected: false,
          connect: async function (this: { connected: boolean }) {
            this.connected = true;
            return mockServer;
          },
        },
      };

      const bluetooth = {
        requestDevice: async () => mockDevice,
      };

      try {
        Object.defineProperty(navigator, 'bluetooth', {
          configurable: true,
          writable: true,
          value: bluetooth,
        });
      } catch {
        (navigator as unknown as { bluetooth: typeof bluetooth }).bluetooth = bluetooth;
      }

      (window as unknown as { _mockNotifyChar: typeof mockCharacteristicNotify })._mockNotifyChar =
        mockCharacteristicNotify;
    });
  });

  test('should complete full provisioning flow', async ({ page }) => {
    await page.goto('/admin/provisioning');

    await page.getByRole('button', { name: 'Open Device Scanner' }).click();
    await page.getByRole('button', { name: 'Scan for Devices' }).click();

    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText('Write Config').click();

    await expect(page.getByText('Verifying Handshake...')).toBeVisible();

    await page.evaluate(() => {
      const encoder = new TextEncoder();
      const data = encoder.encode('PROVISIONING SUCCESS');
      (
        window as unknown as {
          _mockNotifyChar: { simulateNotification: (value: Uint8Array) => void };
        }
      )._mockNotifyChar.simulateNotification(data);
    });

    await expect(page.getByText('Provisioning Successful!')).toBeVisible();
  });
});
