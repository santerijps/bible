// deno-lint-ignore-file no-explicit-any
export type Translation = "fin-33-38";

export type Passage = {
    id: string;
    book: string;
    chapter: string;
    verse: string;
    text: string;
};

export type AnySyncFunction = (...args: any[]) => any;
export type AnyAsyncFunction = (...args: any[]) => Promise<any>;

export function timeSync<T extends AnySyncFunction>(
    callback: T,
    args?: Parameters<T>,
): ReturnType<T> {
    console.time(callback.name);
    const output = callback(...(args ?? []));
    console.timeEnd(callback.name);
    return output;
}

export async function timeAsync<T extends AnyAsyncFunction>(
    callback: T,
    args?: Parameters<T>,
): Promise<ReturnType<T>> {
    console.time(callback.name);
    const output = await callback(...(args ?? []));
    console.timeEnd(callback.name);
    return output;
}

export function fetchPassages(): Promise<Passage[]> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("BibleQueryDB");
        let upgradeNeeded = false;

        request.onsuccess = async () => {
            if (!upgradeNeeded) {
                const database = request.result;
                const passages = await fetchPassagesFromIDB(database, "fin-33-38");
                resolve(passages);
            }
        };
        request.onupgradeneeded = () => {
            upgradeNeeded = true;
            const database = request.result;
            database.createObjectStore("fin-33-38", { autoIncrement: true })
                .transaction.oncomplete = async () => {
                    const passages = await timeAsync(fetchPassagesFromServer, ["fin-33-38"]);
                    const readWriteTransaction = request.result.transaction("fin-33-38", "readwrite");
                    const rwStore = readWriteTransaction.objectStore("fin-33-38");

                    for (const passage of passages) {
                        rwStore.add(passage);
                    }

                    readWriteTransaction.oncomplete = () => {
                        resolve(passages);
                    };
                    readWriteTransaction.onerror = (event) => {
                        reject(event);
                    };
                };
        };
        request.onerror = (event) => {
            reject(event);
        };
    });
}

export function fetchPassagesFromIDB(db: IDBDatabase, name: Translation): Promise<Passage[]> {
    return new Promise((resolve, reject) => {
        const readTransaction = db.transaction(name, "readonly");
        const request = readTransaction.objectStore(name).getAll() as IDBRequest<Passage[]>;
        let passages: Passage[] = [];

        readTransaction.oncomplete = () => {
            resolve(passages);
        };
        readTransaction.onerror = (event) => {
            reject(event);
        };
        request.onsuccess = () => {
            passages = request.result;
        };
    });
}

export async function fetchPassagesFromServer(name: Translation): Promise<Passage[]> {
    const response = await fetch(`data/${name}.txt`);
    const text = await response.text();
    return customToJSON(text);
}

export function customToJSON(input: string): Passage[] {
    const lines = input.split("\n");
    const passages: Passage[] = [];

    lines.pop();

    let id = "";
    let book = "";
    let chapter = 1;
    let verse = 1;

    for (const line of lines) {
        if (line.startsWith(";")) {
            const [_, nextId, nextBook] = line.split(";");
            id = nextId;
            book = nextBook;
            chapter = 1;
            verse = 1;
        } else if (line.startsWith("+")) {
            chapter += 1;
            verse = 1;
        } else {
            passages.push({
                id,
                book,
                chapter: chapter.toString(),
                verse: verse.toString(),
                text: line,
            });
            verse += 1;
        }
    }

    return passages;
}

function renderPassages(passages: Passage[]) {
    const tableElement = document.querySelector("table");
    if (tableElement === null) {
        throw Error("Table not found!");
    }

    let currentBook = "";
    let currentChapter = "";

    for (let i = 0; i < passages.length; i++) {
        const p = passages[i];

        if (p.book !== currentBook || p.chapter !== currentChapter) {
            const tr = document.createElement("tr");
            const th = document.createElement("th");
            th.colSpan = 2;
            th.innerText = `${p.book}, Luku ${p.chapter}`;
            th.role = "rowheader";
            tr.appendChild(th);
            tableElement.appendChild(tr);
            currentBook = p.book;
            currentChapter = p.chapter;
        }

        const tr = document.createElement("tr");
        const verseTd = document.createElement("td");
        const textTd = document.createElement("td");
        verseTd.innerText = p.chapter + ":" + p.verse;
        textTd.innerText = p.text;
        tr.append(verseTd, textTd);
        tableElement.appendChild(tr);
    }
}

const passages = await timeAsync(fetchPassages);
timeSync(renderPassages, [passages]);
