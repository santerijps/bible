// index.ts
function timeSync(callback, args) {
    console.time(callback.name);
    const output = callback(...args ?? []);
    console.timeEnd(callback.name);
    return output;
}
async function timeAsync(callback, args) {
    console.time(callback.name);
    const output = await callback(...args ?? []);
    console.timeEnd(callback.name);
    return output;
}
function fetchPassages() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("BibleQueryDB");
        let upgradeNeeded = false;
        request.onsuccess = async () => {
            if (!upgradeNeeded) {
                const database = request.result;
                const passages2 = await fetchPassagesFromIDB(database, "fin-33-38");
                resolve(passages2);
            }
        };
        request.onupgradeneeded = () => {
            upgradeNeeded = true;
            const database = request.result;
            database.createObjectStore("fin-33-38", {
                autoIncrement: true,
            }).transaction.oncomplete = async () => {
                const passages2 = await timeAsync(fetchPassagesFromServer, [
                    "fin-33-38",
                ]);
                const readWriteTransaction = request.result.transaction("fin-33-38", "readwrite");
                const rwStore = readWriteTransaction.objectStore("fin-33-38");
                for (const passage of passages2) {
                    rwStore.add(passage);
                }
                readWriteTransaction.oncomplete = () => {
                    resolve(passages2);
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
function fetchPassagesFromIDB(db, name) {
    return new Promise((resolve, reject) => {
        const readTransaction = db.transaction(name, "readonly");
        const request = readTransaction.objectStore(name).getAll();
        let passages2 = [];
        readTransaction.oncomplete = () => {
            resolve(passages2);
        };
        readTransaction.onerror = (event) => {
            reject(event);
        };
        request.onsuccess = () => {
            passages2 = request.result;
        };
    });
}
async function fetchPassagesFromServer(name) {
    const response = await fetch(`data/${name}.txt`);
    const text = await response.text();
    return customToJSON(text);
}
function customToJSON(input) {
    const lines = input.split("\n");
    const passages2 = [];
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
            passages2.push({
                id,
                book,
                chapter: chapter.toString(),
                verse: verse.toString(),
                text: line,
            });
            verse += 1;
        }
    }
    return passages2;
}
function renderPassages(passages2) {
    const tableElement = document.querySelector("table");
    if (tableElement === null) {
        throw Error("Table not found!");
    }
    let currentBook = "";
    let currentChapter = "";
    for (let i = 0; i < passages2.length; i++) {
        const p = passages2[i];
        if (p.book !== currentBook || p.chapter !== currentChapter) {
            const tr2 = document.createElement("tr");
            const th = document.createElement("th");
            th.colSpan = 2;
            th.innerText = `${p.book}, Luku ${p.chapter}`;
            th.role = "rowheader";
            tr2.appendChild(th);
            tableElement.appendChild(tr2);
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
var passages = await timeAsync(fetchPassages);
timeSync(renderPassages, [
    passages,
]);
export { customToJSON, fetchPassages, fetchPassagesFromIDB, fetchPassagesFromServer, timeAsync, timeSync };
