import type { Passage, Translation } from "./types.ts";

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
