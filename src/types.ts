// deno-lint-ignore-file no-explicit-any
export type Translation = "fin-33-38";

export type Passage = {
    id: string;
    alias: string;
    book: string;
    chapter: string;
    verse: string;
    text: string;
};

export type AnySyncFunction = (...args: any[]) => any;
export type AnyAsyncFunction = (...args: any[]) => Promise<any>;

export type AnySyncVoidFunction = (...args: any[]) => void;
export type AnyAsyncVoidFunction = (...args: any[]) => Promise<void>;

export type PassageQuery = {
    book?: string;
    chapter?: string;
    verses?: Array<VerseQuery>;
    text?: string;
};

export type VerseQuery = {
    from: number;
    to?: number;
};

export type WorkerEvent = {
    type: "loader";
    isLoading: boolean;
} | {
    type: "query";
    results: Passage[];
};
