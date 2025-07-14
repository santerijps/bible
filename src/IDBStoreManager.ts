import IDBManager from "./IDBManager.ts";

export default class IDBStoreManager<T> {
    public constructor(
        private readonly idbm: IDBManager,
        public readonly objectStoreName: string,
    ) {}

    public static async create<T>(idbm: IDBManager, objectStoreName: string, options?: IDBObjectStoreParameters) {
        if (!idbm.idb.objectStoreNames.contains(objectStoreName)) {
            await idbm.createObjectStore(objectStoreName, options);
        }
        return new IDBStoreManager<T>(idbm, objectStoreName);
    }

    public put(items: T[]) {
        return this.idbm.put(this.objectStoreName, items);
    }

    public getAll() {
        return this.idbm.getAll<T>(this.objectStoreName);
    }

    public forEach(callback: (item: T) => void) {
        this.idbm.forEach(this.objectStoreName, callback);
    }

    public filter(predicate: (item: T) => boolean) {
        return this.idbm.filter<T>(this.objectStoreName, predicate);
    }
}
