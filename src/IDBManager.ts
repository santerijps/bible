export default class IDBManager {
    private constructor(
        public readonly idb: IDBDatabase,
        public readonly upgradeNeeded: boolean,
    ) {}

    public static open(databaseName: string, version?: number) {
        return new Promise<IDBManager>((resolve, reject) => {
            const request = indexedDB.open(databaseName, version);
            request.addEventListener("success", () => {
                const output = new IDBManager(request.result, false);
                resolve(output);
            });
            request.addEventListener("upgradeneeded", () => {
                const output = new IDBManager(request.result, true);
                resolve(output);
            });
            request.addEventListener("error", (event) => {
                reject(event);
            });
        });
    }

    public close(): void {
        this.idb.close();
    }

    public createObjectStore(objectStoreName: string, options?: IDBObjectStoreParameters) {
        return new Promise<void>((resolve, reject) => {
            const transaction = this.idb.createObjectStore(objectStoreName, options).transaction;
            transaction.addEventListener("complete", () => resolve());
            transaction.addEventListener("error", (event) => reject(event));
        });
    }

    public put<T>(objectStoreName: string, items: T[]) {
        return new Promise<void>((resolve, reject) => {
            const transaction = this.idb.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            for (const item of items) {
                objectStore.put(item);
            }
            transaction.addEventListener("complete", () => resolve());
            transaction.addEventListener("error", (event) => reject(event));
        });
    }

    public getAll<T>(objectStoreName: string) {
        return new Promise<T[]>((resolve, reject) => {
            const transaction = this.idb.transaction([objectStoreName], "readonly");
            const request = transaction.objectStore(objectStoreName).getAll() as IDBRequest<T[]>;
            request.addEventListener("success", () => resolve(request.result));
            request.addEventListener("error", (event) => reject(event));
        });
    }

    public forEach<T>(objectStoreName: string, callback: (item: T) => void) {
        const transaction = this.idb.transaction([objectStoreName], "readonly");
        const request = transaction.objectStore(objectStoreName).openCursor();
        request.addEventListener("success", () => {
            const cursor = request.result;
            if (cursor) {
                callback(cursor.value);
                cursor.continue();
            }
        });
    }

    public filter<T>(objectStoreName: string, predicate: (item: T) => boolean) {
        return new Promise<T[]>((resolve, reject) => {
            const transaction = this.idb.transaction([objectStoreName], "readonly");
            const request = transaction.objectStore(objectStoreName).openCursor();
            const result: T[] = [];
            request.addEventListener("success", () => {
                const cursor = request.result;
                if (cursor) {
                    if (predicate(cursor.value)) {
                        result.push(cursor.value);
                    }
                    cursor.continue();
                }
            });
            transaction.addEventListener("complete", () => resolve(result));
            transaction.addEventListener("error", (event) => reject(event));
        });
    }
}
