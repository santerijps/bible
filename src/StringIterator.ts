export default class StringIterator {
    public constructor(
        private readonly text: string,
        private index: number = 0,
        private savedIndex: number = 0,
    ) {}

    public eof() {
        return this.index >= this.text.length;
    }

    public read() {
        if (!this.eof()) {
            return this.text[this.index++];
        }
        return null;
    }

    public peek() {
        if (!this.eof()) {
            return this.text[this.index];
        }
        return null;
    }

    public next() {
        if (!this.eof()) {
            this.index += 1;
        }
    }

    public save() {
        this.savedIndex = this.index;
    }

    public load() {
        return this.text.slice(this.savedIndex, this.index);
    }
}
