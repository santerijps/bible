// deno-lint-ignore-file no-explicit-any
import type { AnyAsyncFunction, AnyAsyncVoidFunction, AnySyncFunction, AnySyncVoidFunction } from "./types.ts";

export function getElement<T extends HTMLElement>(selector: string) {
    const element = document.querySelector(selector);
    if (element === null) {
        throw Error(`Element not found with selector: ${selector}`);
    }
    return element as T;
}

export function timeSync<T extends AnySyncFunction>(
    callback: T,
    args?: Parameters<T>,
    customLabel?: string,
): ReturnType<T> {
    const label = customLabel ?? callback.name;
    console.time(label);
    const output = callback(...(args ?? []));
    console.timeEnd(label);
    return output;
}

export async function timeAsync<T extends AnyAsyncFunction>(
    callback: T,
    args?: Parameters<T>,
    customLabel?: string,
): Promise<ReturnType<T>> {
    const label = customLabel ?? callback.name;
    console.time(label);
    const output = await callback(...(args ?? []));
    console.timeEnd(label);
    return output;
}

export function debounce(
    callback: AnySyncVoidFunction | AnyAsyncVoidFunction,
    timeoutMs: number,
) {
    let timeoutId: number | undefined = undefined;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(
            () => callback(...args),
            timeoutMs,
        );
    };
}
