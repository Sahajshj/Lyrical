/**
 * Screen Wake Lock utility to keep the device screen on during performance
 */

let wakeLockSentinel: any = null;

export async function requestWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      return true;
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      return false;
    }
  }
  return false;
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    } catch (err) {
      console.warn('Wake Lock release failed:', err);
    }
  }
}

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}
