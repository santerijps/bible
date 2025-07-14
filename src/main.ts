import IDBManager from "./IDBManager.ts";
import IDBStoreManager from "./IDBStoreManager.ts";
import type { Passage, PassageQuery, Translation } from "./types.ts";
import { getElement, timeAsync } from "./util.ts";
import { parseQueryString } from "./parser.ts";

export async function fetchPassagesFromServer(translation: Translation): Promise<Passage[]> {
    const response = await fetch(`data/${translation}.txt`);
    const text = await response.text();
    return customToJSON(text);
}

export function customToJSON(input: string): Passage[] {
    const lines = input.split("\n");
    const passages: Passage[] = [];

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

export function renderPassages(tableElement: HTMLTableElement, passages: Passage[]) {
    return new Promise<void>((resolve) => {
        let currentBook = "";
        let currentChapter = "";

        for (let i = 0; i < passages.length; i++) {
            const p = passages[i];

            if (p.book !== currentBook || p.chapter !== currentChapter) {
                const tr = document.createElement("tr");
                const th = document.createElement("th");
                th.colSpan = 2;
                th.innerText = formatHeaderRowText("fi", p);
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

        resolve();
    });
}

export function formatHeaderRowText(language: "en" | "fi", p: Passage) {
    switch (language) {
        case "en":
            return `${p.book}, chapter ${p.chapter}`;
        case "fi":
            return `${p.book}, ${p.chapter}. luku`;
    }
}

async function main() {
    const queryInput = getElement<HTMLInputElement>("#query-input");
    const queryOutput = getElement<HTMLTableElement>("#query-output");

    const passageDb = await timeAsync(IDBManager.open, ["PassageDB"], "open");
    const passageStore = await IDBStoreManager.create<Passage>(passageDb, "fin-33-38", { autoIncrement: true });
    let passages: Passage[] = [];

    if (passageDb.upgradeNeeded) {
        passages = await timeAsync(fetchPassagesFromServer, ["fin-33-38"], "fetch");
        await timeAsync(passageStore.put.bind(passageStore), [passages], "put");
    } else {
        passages = await timeAsync(passageStore.getAll.bind(passageStore), [], "load");
    }

    timeAsync(renderPassages, [queryOutput, passages.slice(0, 100)], "render");

    queryInput.addEventListener("input", () => {
        const queries = parseQueryString(queryInput.value);
        console.log(queries);
        let result: Passage[] = [];
        for (const q of queries) {
            const ps = passages.filter((p) => passagePredicate(p, q));
            result = [...result, ...ps];
        }
        console.log(result);
    });
}

main();

export function passagePredicate(p: Passage, q: PassageQuery) {
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
