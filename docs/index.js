// src/IDBManager.ts
var IDBManager = class _IDBManager {
    idb;
    upgradeNeeded;
    constructor(idb, upgradeNeeded) {
        this.idb = idb;
        this.upgradeNeeded = upgradeNeeded;
    }
    static open(databaseName, version) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName, version);
            request.addEventListener("success", () => {
                const output = new _IDBManager(request.result, false);
                resolve(output);
            });
            request.addEventListener("upgradeneeded", () => {
                const output = new _IDBManager(request.result, true);
                resolve(output);
            });
            request.addEventListener("error", (event) => {
                reject(event);
            });
        });
    }
    close() {
        this.idb.close();
    }
    createObjectStore(objectStoreName, options) {
        return new Promise((resolve, reject) => {
            const transaction = this.idb.createObjectStore(objectStoreName, options).transaction;
            transaction.addEventListener("complete", () => resolve());
            transaction.addEventListener("error", (event) => reject(event));
        });
    }
    put(objectStoreName, items) {
        return new Promise((resolve, reject) => {
            const transaction = this.idb.transaction([
                objectStoreName,
            ], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            for (const item of items) {
                objectStore.put(item);
            }
            transaction.addEventListener("complete", () => resolve());
            transaction.addEventListener("error", (event) => reject(event));
        });
    }
    getAll(objectStoreName) {
        return new Promise((resolve, reject) => {
            const transaction = this.idb.transaction([
                objectStoreName,
            ], "readonly");
            const request = transaction.objectStore(objectStoreName).getAll();
            request.addEventListener("success", () => resolve(request.result));
            request.addEventListener("error", (event) => reject(event));
        });
    }
    forEach(objectStoreName, callback) {
        const transaction = this.idb.transaction([
            objectStoreName,
        ], "readonly");
        const request = transaction.objectStore(objectStoreName).openCursor();
        request.addEventListener("success", () => {
            const cursor = request.result;
            if (cursor) {
                callback(cursor.value);
                cursor.continue();
            }
        });
    }
    filter(objectStoreName, predicate) {
        return new Promise((resolve, reject) => {
            const transaction = this.idb.transaction([
                objectStoreName,
            ], "readonly");
            const request = transaction.objectStore(objectStoreName).openCursor();
            const result = [];
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
};

// src/IDBStoreManager.ts
var IDBStoreManager = class _IDBStoreManager {
    idbm;
    objectStoreName;
    constructor(idbm, objectStoreName) {
        this.idbm = idbm;
        this.objectStoreName = objectStoreName;
    }
    static async create(idbm, objectStoreName, options) {
        if (!idbm.idb.objectStoreNames.contains(objectStoreName)) {
            await idbm.createObjectStore(objectStoreName, options);
        }
        return new _IDBStoreManager(idbm, objectStoreName);
    }
    put(items) {
        return this.idbm.put(this.objectStoreName, items);
    }
    getAll() {
        return this.idbm.getAll(this.objectStoreName);
    }
    forEach(callback) {
        this.idbm.forEach(this.objectStoreName, callback);
    }
    filter(predicate) {
        return this.idbm.filter(this.objectStoreName, predicate);
    }
};

// src/util.ts
function getElement(selector) {
    const element = document.querySelector(selector);
    if (element === null) {
        throw Error(`Element not found with selector: ${selector}`);
    }
    return element;
}
async function timeAsync(callback, args, customLabel) {
    const label = customLabel ?? callback.name;
    console.time(label);
    const output = await callback(...args ?? []);
    console.timeEnd(label);
    return output;
}

// src/StringIterator.ts
var StringIterator = class {
    text;
    index;
    savedIndex;
    constructor(text, index = 0, savedIndex = 0) {
        this.text = text;
        this.index = index;
        this.savedIndex = savedIndex;
    }
    eof() {
        return this.index >= this.text.length;
    }
    read() {
        if (!this.eof()) {
            return this.text[this.index++];
        }
        return null;
    }
    peek() {
        if (!this.eof()) {
            return this.text[this.index];
        }
        return null;
    }
    next() {
        if (!this.eof()) {
            this.index += 1;
        }
    }
    save() {
        this.savedIndex = this.index;
    }
    load() {
        return this.text.slice(this.savedIndex, this.index);
    }
};

// src/parser.ts
function readQuery(iter) {
    const query = {};
    const book = readBook(iter).trim();
    readSpaces(iter);
    if (book.length > 0) {
        query.book = book;
    }
    const chapter = readChapter(iter).trim();
    readSpaces(iter);
    if (chapter.length > 0) {
        query.chapter = chapter;
    }
    const verseQueries = Array();
    while (!iter.eof()) {
        const verseQuery = readVerse(iter);
        if (verseQuery === null) {
            break;
        }
        verseQueries.push(verseQuery);
    }
    if (verseQueries.length > 0) {
        query.verses = verseQueries;
    }
    readSpaces(iter);
    const text = readText(iter);
    if (text.length > 0) {
        query.text = text;
    }
    return query;
}
function readText(iter) {
    let quote = false;
    iter.save();
    while (!iter.eof()) {
        const char = iter.peek();
        if (quote && char === '"') {
            break;
        }
        if (!quote) {
            if (char === '"') {
                quote = true;
                iter.next();
                iter.save();
                continue;
            } else {
                break;
            }
        }
        iter.next();
    }
    return iter.load();
}
function readBook(iter) {
    iter.save();
    while (!iter.eof()) {
        const char = iter.peek();
        const byte = char.charCodeAt(0);
        if (isDigit(byte) && iter.load().length > 0) {
            break;
        }
        if (!isAlpha(byte) && !isDigit(byte) && !isSpace(byte)) {
            break;
        }
        iter.next();
    }
    return iter.load();
}
function readChapter(iter) {
    iter.save();
    while (!iter.eof()) {
        const char = iter.peek();
        const byte = char.charCodeAt(0);
        if (isColon(byte)) {
            const chapter = iter.load();
            iter.next();
            return chapter;
        }
        if (!isDigit(byte)) {
            break;
        }
        iter.next();
    }
    return iter.load();
}
function readVerse(iter) {
    const verseQuery = {};
    iter.save();
    while (!iter.eof()) {
        const char = iter.peek();
        const byte = char.charCodeAt(0);
        if (isDigit(byte) || isSpace(byte)) {
            iter.next();
            continue;
        }
        if (isDash(byte)) {
            verseQuery.from = parseInt(iter.load().trim());
            iter.next();
            iter.save();
            continue;
        }
        if (isComma(byte)) {
            verseQuery.to = parseInt(iter.load().trim());
            iter.next();
            break;
        }
        if (verseQuery.from === void 0) {
            return null;
        } else {
            break;
        }
    }
    if (verseQuery.from === void 0) {
        const value = parseInt(iter.load().trim());
        verseQuery.from = value;
    } else if (verseQuery.to === void 0) {
        const value = parseInt(iter.load().trim());
        verseQuery.to = value;
    }
    return verseQuery;
}
function readSpaces(iter) {
    while (!iter.eof()) {
        const char = iter.peek();
        const byte = char.charCodeAt(0);
        if (!isSpace(byte)) {
            break;
        }
        iter.next();
    }
}
var isAlpha = (byte) => 97 <= byte && byte <= 122 || byte === 196 || byte === 214 || byte === 228 || byte === 246;
var isDigit = (byte) => 48 <= byte && byte <= 57;
var isSpace = (byte) => byte === 32;
var isColon = (byte) => byte === 58;
var isDash = (byte) => byte === 45;
var isComma = (byte) => byte === 44;
function parseQueryString(input) {
    const inputs = input.toLowerCase().split(";").map((x) => x.trim());
    const queries = Array();
    for (const input2 of inputs) {
        const iter = new StringIterator(input2);
        const query = readQuery(iter);
        if (query === null) {
            break;
        }
        queries.push(query);
    }
    return queries;
}

// src/main.ts
async function fetchPassagesFromServer(translation) {
    const response = await fetch(`data/${translation}.txt`);
    const text = await response.text();
    return customToJSON(text);
}
function customToJSON(input) {
    const lines = input.split("\n");
    const passages = [];
    lines.pop();
    let id = "";
    let book = "";
    let alias = "";
    let chapter = 1;
    let verse = 1;
    for (const line of lines) {
        if (line.startsWith(";")) {
            const [_, nextId, nextBook, nextAlias] = line.split(";");
            id = nextId;
            book = nextBook;
            alias = nextAlias;
            chapter = 1;
            verse = 1;
        } else if (line.startsWith("+")) {
            chapter += 1;
            verse = 1;
        } else {
            passages.push({
                id,
                alias,
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
function renderPassages(tableElement, passages) {
    return new Promise((resolve) => {
        let currentBook = "";
        let currentChapter = "";
        for (let i = 0; i < passages.length; i++) {
            const p = passages[i];
            if (p.book !== currentBook || p.chapter !== currentChapter) {
                const tr2 = document.createElement("tr");
                const th = document.createElement("th");
                th.colSpan = 2;
                th.innerText = formatHeaderRowText("fi", p);
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
        resolve();
    });
}
function formatHeaderRowText(language, p) {
    switch (language) {
        case "en":
            return `${p.book}, chapter ${p.chapter}`;
        case "fi":
            return `${p.book}, ${p.chapter}. luku`;
    }
}
async function main() {
    const queryInput = getElement("#query-input");
    const queryOutput = getElement("#query-output");
    const passageDb = await timeAsync(IDBManager.open, [
        "PassageDB",
    ], "open");
    const passageStore = await IDBStoreManager.create(passageDb, "fin-33-38", {
        autoIncrement: true,
    });
    let passages = [];
    if (passageDb.upgradeNeeded) {
        passages = await timeAsync(fetchPassagesFromServer, [
            "fin-33-38",
        ], "fetch");
        await timeAsync(passageStore.put.bind(passageStore), [
            passages,
        ], "put");
    } else {
        passages = await timeAsync(passageStore.getAll.bind(passageStore), [], "load");
    }
    timeAsync(renderPassages, [
        queryOutput,
        passages.slice(0, 100),
    ], "render");
    queryInput.addEventListener("input", () => {
        const queries = parseQueryString(queryInput.value);
        console.log(queries);
        let result = [];
        for (const q of queries) {
            const ps = passages.filter((p) => passagePredicate(p, q));
            result = [
                ...result,
                ...ps,
            ];
        }
        console.log(result);
    });
}
main();
function passagePredicate(p, q) {
    if (q.book) {
        if (!(p.book.toLowerCase().startsWith(q.book) || p.alias.toLowerCase().startsWith(q.book))) {
            return false;
        }
    }
    if (q.chapter) {
        if (p.chapter !== q.chapter) {
            return false;
        }
    }
    if (q.verses) {
        let match = false;
        for (const v of q.verses) {
            const verse = parseInt(p.verse);
            if (v.to) {
                if (v.from <= verse && verse <= v.to) {
                    match = true;
                    break;
                }
            } else {
                if (verse === v.from) {
                    match = true;
                    break;
                }
            }
        }
        if (!match) {
            return false;
        }
    }
    if (q.text) {
        if (!p.text.toLowerCase().includes(q.text)) {
            return false;
        }
    }
    return true;
}
export { customToJSON, fetchPassagesFromServer, formatHeaderRowText, passagePredicate, renderPassages };
