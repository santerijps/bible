import StringIterator from "./StringIterator.ts";
import type { PassageQuery, VerseQuery } from "./types.ts";

function readQuery(iter: StringIterator) {
    const query: PassageQuery = {};

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

    const verseQueries = Array<VerseQuery>();

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

function readText(iter: StringIterator) {
    let quote = false;
    iter.save();

    while (!iter.eof()) {
        const char = iter.peek() as string;

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

function readBook(iter: StringIterator) {
    iter.save();

    while (!iter.eof()) {
        const char = iter.peek() as string;
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

function readChapter(iter: StringIterator) {
    iter.save();

    while (!iter.eof()) {
        const char = iter.peek() as string;
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

function readVerse(iter: StringIterator) {
    const verseQuery: Partial<VerseQuery> = {};
    iter.save();

    while (!iter.eof()) {
        const char = iter.peek() as string;
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

        if (verseQuery.from === undefined) {
            return null;
        } else {
            break;
        }
    }

    if (verseQuery.from === undefined) {
        const value = parseInt(iter.load().trim());
        verseQuery.from = value;
    } else if (verseQuery.to === undefined) {
        const value = parseInt(iter.load().trim());
        verseQuery.to = value;
    }

    return verseQuery as VerseQuery;
}

function readSpaces(iter: StringIterator) {
    while (!iter.eof()) {
        const char = iter.peek() as string;
        const byte = char.charCodeAt(0);

        if (!isSpace(byte)) {
            break;
        }

        iter.next();
    }
}

const isAlpha = (byte: number) => (
    (97 <= byte && byte <= 122) ||
    (byte === 196 || byte === 214 || byte === 228 || byte === 246)
);

const isDigit = (byte: number) => 48 <= byte && byte <= 57;
const isSpace = (byte: number) => byte === 32;
const isColon = (byte: number) => byte === 58;
const isDash = (byte: number) => byte === 45;
const isComma = (byte: number) => byte === 44;

export function parseQueryString(input: string) {
    const inputs = input
        .toLowerCase()
        .split(";")
        .map((it) => it.trim())
        .filter((it) => it.length > 0);

    const queries = Array<PassageQuery>();

    for (const input of inputs) {
        const iter = new StringIterator(input);
        const query = readQuery(iter);

        if (query === null) {
            break;
        }

        queries.push(query);
    }

    return queries;
}
