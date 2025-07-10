import { Passage } from "../index.ts";

const src = await Deno.readTextFile("dist/data/fin-33-38.json");
const passages = JSON.parse(src) as Passage[];

const encoder = new TextEncoder();
const file = await Deno.open("dist/data/fin-33-38.txt", { write: true, create: true });
const writeLine = (input: string) => file.write(encoder.encode(input + "\n"));

let book = "";
let chapter = "";

for (const p of passages) {
    if (p.book !== book) {
        await writeLine(";" + p.id + ";" + p.book);
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
