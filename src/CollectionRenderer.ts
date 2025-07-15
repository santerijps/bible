export type RenderChild<Child, Refs> = {
    element: Child;
    refs: Refs;
};

export default class CollectionRenderer<Item, Child extends HTMLElement, Refs> {
    private cache: RenderChild<Child, Refs>[];
    private garbage: Element[];

    public constructor(
        private readonly parentElement: HTMLElement,
        private readonly createChild: () => RenderChild<Child, Refs>,
        private readonly updateChild: (child: RenderChild<Child, Refs>, item: Item, items: Item[], index: number) => void,
        private readonly beforeUpdateChild?: (
            child: RenderChild<Child, Refs>,
            item: Item,
            items: Item[],
            index: number,
        ) => HTMLElement | undefined,
    ) {
        this.cache = [];
        this.garbage = [];
    }

    private emptyTrash() {
        for (const trash of this.garbage) {
            trash.remove();
        }
    }

    public update(items: Item[]) {
        this.emptyTrash();
        for (let i = 0; i < items.length; i++) {
            let child: RenderChild<Child, Refs>;
            if (i >= this.cache.length) {
                child = this.createChild();
                this.cache.push(child);
                this.parentElement.appendChild(child.element);
            } else {
                child = this.cache[i];
            }
            if (this.beforeUpdateChild) {
                const trash = this.beforeUpdateChild(child, items[i], items, i);
                if (trash) {
                    this.garbage.push(trash);
                }
            }
            this.updateChild(child, items[i], items, i);
            child.element.hidden = false;
        }
        for (let i = items.length; i < this.cache.length; i++) {
            const { element } = this.cache[i];
            element.hidden = true;
        }
    }
}
