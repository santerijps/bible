import { fetchPassagesFromServer } from "./api.ts";
import IDBManager from "./IDBManager.ts";
import IDBStoreManager from "./IDBStoreManager.ts";
import { filterPassages } from "./query.ts";
import { Passage } from "./types.ts";
import { timeAsync } from "./util.ts";

self.postMessage({ type: "loader", isLoading: true });

const passageDb = await timeAsync(IDBManager.open, ["PassageDB"], "open");
const passageStore = await IDBStoreManager.create<Passage>(passageDb, "fin-33-38", { autoIncrement: true });
let passages: Passage[] = [];

if (passageDb.upgradeNeeded) {
    passages = await timeAsync(fetchPassagesFromServer, ["fin-33-38"], "fetch");
    await timeAsync(passageStore.put.bind(passageStore), [passages], "put");
} else {
    passages = await timeAsync(passageStore.getAll.bind(passageStore), [], "load");
}

self.postMessage({ type: "loader", isLoading: false });
self.postMessage({ type: "query", results: filterPassages(passages, "genesis") });

self.addEventListener("message", (event: MessageEvent<{ query: string }>) => {
    const results = filterPassages(passages, event.data.query);
    self.postMessage({ type: "query", results });
});
