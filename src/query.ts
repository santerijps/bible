import { parseQueryString } from "./parser.ts";
import type { Passage, PassageQuery } from "./types.ts";

export function filterPassages(passages: Passage[], query: string) {
    const queries = parseQueryString(query);
    let result: Passage[] = [];
    for (const q of queries) {
        const ps = passages.filter((p) => passagePredicate(p, q));
        result = [...result, ...ps];
    }
    return result;
}

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
