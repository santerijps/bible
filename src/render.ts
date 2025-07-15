import type { Passage } from "./types.ts";

export function formatHeaderRowText(language: "en" | "fi", p: Passage) {
    switch (language) {
        case "en":
            return `${p.book}, chapter ${p.chapter}`;
        case "fi":
            return `${p.book}, ${p.chapter}. luku`;
    }
}
