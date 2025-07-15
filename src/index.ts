import type { Passage, WorkerEvent } from "./types.ts";
import { debounce, getElement, timeAsync } from "./util.ts";
import { formatHeaderRowText } from "./render.ts";
import CollectionRenderer from "./CollectionRenderer.ts";

function main() {
    const queryInput = getElement<HTMLInputElement>("#query-input");
    const queryOutput = getElement<HTMLTableElement>("#query-output");
    const loader = getElement(".loader");

    const worker = new Worker("./worker.js", { type: "module" });
    worker.addEventListener("message", (event: MessageEvent<WorkerEvent>) => {
        switch (event.data.type) {
            case "loader":
                if (event.data.isLoading) {
                    loader.hidden = false;
                } else {
                    loader.hidden = true;
                }
                break;
            case "query":
                timeAsync(render, [event.data.results], "render");
                break;
        }
    });

    const renderer = new CollectionRenderer<
        Passage,
        HTMLTableRowElement,
        { refTd: HTMLTableCellElement; txtTd: HTMLTableCellElement }
    >(
        queryOutput,
        () => {
            const tr = document.createElement("tr");
            const refTd = document.createElement("td");
            const txtTd = document.createElement("td");
            tr.append(refTd, txtTd);
            return { element: tr, refs: { refTd, txtTd } };
        },
        (child, item) => {
            child.refs.refTd.innerText = item.chapter + ":" + item.verse;
            child.refs.txtTd.innerText = item.text;
        },
        (child, item, items, index) => {
            const prevBook = index === 0 ? "" : items[index - 1].book;
            const prevChapter = index === 0 ? "" : items[index - 1].chapter;
            if (item.book !== prevBook || item.chapter !== prevChapter) {
                const tr = document.createElement("tr");
                const th = document.createElement("th");
                th.colSpan = 2;
                th.role = "rowheader";
                th.innerText = formatHeaderRowText("fi", item);
                tr.appendChild(th);
                child.element.insertAdjacentElement("beforebegin", tr);
                return tr;
            }
        },
    );

    const render = (passages: Passage[]) =>
        new Promise<void>((resolve) => {
            renderer.update(passages);
            resolve();
        });

    queryInput.addEventListener(
        "input",
        debounce(() => {
            worker.postMessage({ query: queryInput.value });
        }, 100),
    );
}

main();
