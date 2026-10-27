// Ristisanan generointilogiikka (portattu Java-toteutuksesta)
const H = 'H';
const V = 'V';

class Word {
	constructor(x, y, d, word) {
		this.x = x;
		this.y = y;
		this.d = d;
		this.word = word;
	}
	get length() { return this.word.length; }
	maxX() { return this.d === V ? this.x : this.x + this.length - 1; }
	maxY() { return this.d === H ? this.y : this.y + this.length - 1; }
	xBeforeStart() { return this.d === V ? this.x : this.x - 1; }
	yBeforeStart() { return this.d === H ? this.y : this.y - 1; }
	xAfterEnd() { return this.d === V ? this.x : this.x + this.length; }
	yAfterEnd() { return this.d === H ? this.y : this.y + this.length; }
	xIncrement() { return this.d === H ? 1 : 0; }
	yIncrement() { return this.d === V ? 1 : 0; }
	contains(x, y) {
		if (this.d === H) {
			return this.y === y && x >= this.x && x <= this.x + this.length - 1;
		}
		return this.x === x && y >= this.y && y <= this.y + this.length - 1;
	}
	charAt(x, y) {
		return this.d === H ? this.word.charAt(x - this.x) : this.word.charAt(y - this.y);
	}
}

class CrosswordPuzzle {
	constructor(maxWords) {
		this.maxWords = maxWords;
		this.words = [];
		this.tips = {};
	}
	add(word) { this.words.push(word); }
	maxDiameter() { return Math.max(...this.words.map(w => Math.max(w.maxX(), w.maxY()))); }
	maxX() { return Math.max(...this.words.map(w => w.maxX())); }
	maxY() { return Math.max(...this.words.map(w => w.maxY())); }
	minX() { return Math.min(...this.words.map(w => w.x)); }
	minY() { return Math.min(...this.words.map(w => w.y)); }

	withinWidthAndHeightThreshold(threshold) {
		return this.maxDiameter() <= threshold;
	}

	canPlace(word) {
		let intersects = false;
		const xIncr = word.xIncrement();
		const yIncr = word.yIncrement();

		for (const w of this.words) {
			if (w.contains(word.xBeforeStart(), word.yBeforeStart())
					|| w.contains(word.xAfterEnd(), word.yAfterEnd())) {
				return false;
			}
			for (let x = word.x; x <= word.maxX(); x++) {
				for (let y = word.y; y <= word.maxY(); y++) {
					if (w.contains(x, y)) {
						if (w.charAt(x, y) === word.charAt(x, y)
								&& w.d !== word.d
								&& !w.contains(word.xBeforeStart(), word.yBeforeStart())
								&& !w.contains(word.xBeforeStart() - xIncr, word.yBeforeStart() - yIncr)
								&& !w.contains(word.xBeforeStart() - xIncr * 2, word.yBeforeStart() - yIncr * 2)
								&& !w.contains(word.xAfterEnd(), word.yAfterEnd())) {
							intersects = true;
						} else {
							return false;
						}
					} else if (word.d === H
							&& (w.contains(x, y - 1) || w.contains(x, y + 1)
								|| w.contains(word.x - 1, y - 1) || w.contains(word.x - 1, y + 1))) {
						return false;
					} else if (word.d === V
							&& (w.contains(x - 1, y) || w.contains(x + 1, y)
								|| w.contains(x + 1, word.y - 1) || w.contains(x - 1, word.y - 1))) {
						return false;
					}
				}
			}
		}
		return intersects;
	}

	findNextPosition(wordValues, directions) {
		const candidates = [];
		const dir = directions.shift();
		for (const value of wordValues) {
			for (const word of this.words) {
				if (word.d === dir) {
					continue;
				}
				for (let wi = 0; wi < word.length; wi++) {
					for (let vi = 0; vi < value.length; vi++) {
						const x = word.d === H ? word.x + wi : word.x - vi;
						const y = word.d === H ? word.y - vi : word.y + wi;
						const w = new Word(x, y, dir, value);
						if (this.canPlace(w)) {
							candidates.push(w);
						}
					}
				}
			}
		}
		if (candidates.length === 0) {
			throw new Error("Cannot find next position");
		}
		const score = w => Math.max(Math.abs(w.x), Math.abs(w.y));
		return candidates.reduce((a, b) => score(b) < score(a) ? b : a);
	}

	translateCoordinates() {
		const dx = -this.minX();
		const dy = -this.minY();
		for (const w of this.words) {
			w.x += dx;
			w.y += dy;
		}
	}

	toPuzzle() {
		return {
			words: this.words.map(w => ({ x: w.x, y: w.y, d: w.d, word: w.word, tip: this.tips[w.word] })),
			maxX: this.maxX(),
			maxY: this.maxY()
		};
	}

	static shuffle(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	static generateFromWords(size, wordMap) {
		const cw = new CrosswordPuzzle(size);
		const keys = [];
		for (const key of Object.keys(wordMap)) {
			const upper = key.toUpperCase();
			keys.push(upper);
			cw.tips[upper] = wordMap[key];
		}
		CrosswordPuzzle.shuffle(keys);
		const list = keys.slice(0, size);
		cw.add(new Word(0, 0, H, list.shift()));

		const directions = [];
		const firstHalf = Math.floor(size / 2);
		for (let i = 0; i < firstHalf; i++) directions.push(H);
		for (let i = 0; i < size - firstHalf; i++) directions.push(V);
		CrosswordPuzzle.shuffle(directions);

		while (cw.words.length < size) {
			const word = cw.findNextPosition(list, directions);
			cw.add(word);
			list.splice(list.indexOf(word.word), 1);
		}
		cw.translateCoordinates();
		return cw;
	}
}

const KNOWN_TYPES = ["elaimet", "vastakohdat"];

function createCrosswordPuzzle(type) {
	if (!KNOWN_TYPES.includes(type)) {
		throw new Error("Unknown crossword type " + type);
	}
	const thresholdLength = 16;
	const sanityCheck = 1000;
	let cw = null;
	for (let i = 0; i < sanityCheck; i++) {
		try {
			cw = CrosswordPuzzle.generateFromWords(10, WORDS[type]);
			if (cw.withinWidthAndHeightThreshold(thresholdLength)) {
				return cw.toPuzzle();
			}
		} catch (e) {
			// yritetään uudelleen
		}
	}
	return cw.toPuzzle();
}
