import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/**
 * Court order PDFs, downloaded once to the phone (cache folder) and opened in the phone's own PDF
 * viewer. Android shows the downloaded file; iOS and web open the order's link instead.
 */

/** Only Android opens the downloaded file itself; elsewhere the link is opened. */
export const opensLocalFile = Platform.OS === 'android';

const dir = () => `${FileSystem.cacheDirectory ?? ''}orders/`;
const fileFor = (orderId: string) => `${dir()}${orderId}.pdf`;

/** The order's PDF if it was downloaded before, else null. */
export async function cachedOrderFile(orderId: string): Promise<string | null> {
  if (!opensLocalFile) return null;
  const info = await FileSystem.getInfoAsync(fileFor(orderId)).catch(() => null);
  return info?.exists && !info.isDirectory && (info.size ?? 0) > 0 ? info.uri : null;
}

/** Downloads the PDF with progress (0..1). `cancel` stops it and removes the partial file. */
export function downloadOrderFile(url: string, orderId: string, onProgress: (fraction: number) => void) {
  const target = fileFor(orderId);
  const part = `${target}.part`;
  const task = FileSystem.createDownloadResumable(url, part, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
  });
  const promise = (async () => {
    await FileSystem.makeDirectoryAsync(dir(), { intermediates: true }).catch(() => undefined);
    const res = await task.downloadAsync();
    if (!res || res.status !== 200) {
      await FileSystem.deleteAsync(part, { idempotent: true });
      throw new Error(`The order didn't download (error ${res?.status ?? 'unknown'}). Please try again.`);
    }
    await FileSystem.moveAsync({ from: part, to: target });
    onProgress(1);
    return target;
  })();
  const cancel = async () => {
    await task.cancelAsync().catch(() => undefined);
    await FileSystem.deleteAsync(part, { idempotent: true });
  };
  return { promise, cancel };
}

/** Shows the PDF: Android hands the downloaded file to the phone's PDF viewer; else the link opens. */
export async function showOrder(file: string | null, url: string | null) {
  if (opensLocalFile && file) {
    try {
      const data = await FileSystem.getContentUriAsync(file);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data, type: 'application/pdf', flags: 1 /* FLAG_GRANT_READ_URI_PERMISSION */ });
      return;
    } catch {
      // No PDF viewer app on the phone: fall back to the browser.
    }
  }
  if (url) await WebBrowser.openBrowserAsync(url);
  else throw new Error('No PDF viewer found on this phone. Install one (e.g. Google Drive) and try again.');
}
