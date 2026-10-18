interface CacheReply { type: 'progress' | 'complete' | 'error'; progress?: number; message?: string }

let registration: Promise<ServiceWorkerRegistration | null> | null = null;
export function registerOffline(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return Promise.resolve(null);
  registration ??= navigator.serviceWorker.register('./sw.js', { scope: './' }).then(async r => {
    await navigator.serviceWorker.ready;
    return r;
  }).catch(error => { console.warn('Offline registration failed:', error); return null; });
  return registration;
}

export async function downloadAllEras(progress: (value: number) => void): Promise<void> {
  const reg = await registerOffline();
  if (!reg) throw new Error('Offline downloads are available in the production build on localhost or HTTPS.');
  const worker = reg.active;
  if (!worker) throw new Error('Offline worker is still activating. Try again shortly.');
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => { channel.port1.close(); reject(new Error('Download timed out; cached files were retained.')); }, 90000);
    channel.port1.onmessage = (event: MessageEvent<CacheReply>) => {
      const message = event.data;
      if (message.type === 'progress') progress(message.progress ?? 0);
      else if (message.type === 'complete') { clearTimeout(timeout); channel.port1.close(); progress(100); resolve(); }
      else { clearTimeout(timeout); channel.port1.close(); reject(new Error(message.message ?? 'Offline download failed.')); }
    };
    worker.postMessage({ type: 'download-all' }, [channel.port2]);
  });
}
