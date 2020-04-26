class StorageItem<T> {
    constructor(public readonly key: string, private defaultValue: T) {}
    get() {
        return new Promise<T>(resolve => {
            chrome.storage.local.get(this.key, result => {
                const value = result[this.key];
                resolve(value === undefined ? this.defaultValue : value);
            });
        });
    }
    set(value: T) {
        return new Promise<void>(resolve => {
            chrome.storage.local.set({ [this.key]: value }, resolve);
        });
    }
}

const hosts = new StorageItem<string[]>('hosts', []);

async function checkAds(query: string) {
    const html = await fetch(`/search?q=${encodeURIComponent(query)}`, { credentials: 'omit' }).then(r => r.text());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = Array.from(doc.querySelectorAll<HTMLAnchorElement>('.ads-ad a[href]'));

    const whitelists = await hosts.get();
    for (const host of new Set(nodes.map(n => n.host))) {
        if (!whitelists.includes(host)) {
            const notification = new Notification('New domain found', { body: host });
            notification.addEventListener('click', async function() {
                this.close();
                const whitelists = await hosts.get();
                if (!whitelists.includes(host)) whitelists.push(host);
                await hosts.set(whitelists);
            });
        }
    }
}

async function requestPermission(): Promise<boolean> {
    switch (Notification.permission) {
        case 'granted': return true;
        case 'denied': return false;
        case 'default': return 'granted' === await Notification.requestPermission();
    }
}

async function main() {
    const queries = ['<PLEASE EDIT HERE>'];
    if (await requestPermission()) {
        await checkAds(queries[Math.random() * queries.length | 0]);
    }
}

main().catch(console.error);
