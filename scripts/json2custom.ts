import type { Passage } from "../src/types.ts";

const books = JSON.parse(await Deno.readTextFile("books.json")) as Record<string, string>;
const src = await Deno.readTextFile("../docs/data/fin-33-38.json");
const passages = JSON.parse(src) as Passage[];

const encoder = new TextEncoder();
const file = await Deno.open("../docs/data/fin-33-38.txt", { write: true, create: true });
const writeLine = (input: string) => file.write(encoder.encode(input + "\n"));

let book = "";
let chapter = "";

for (const p of passages) {
    if (p.book !== book) {
        await writeLine(";" + p.id + ";" + p.book + ";" + books[p.id]);
        book = p.book;
        chapter = "1";
    }

    if (p.chapter !== chapter) {
        await writeLine("+");
        chapter = p.chapter;
    }

    await writeLine(p.text);
}

file.close();
