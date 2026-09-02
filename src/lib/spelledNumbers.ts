/**
 * Catches phone numbers written as words.
 *
 * A member wrote "Six-one-eight-six-one-five-seven+none-none" and it went
 * straight through, because every digit pattern in maskContacts looks for
 * digits. Spelling them out is the obvious next move once the numeric form is
 * blocked, and it works in any language, so this reads a lexicon rather than a
 * pattern.
 *
 * The rule that keeps it safe is the RUN, not the words. Almost every entry
 * below is also an ordinary word somewhere - "to", "for", "one", "none", "um",
 * "do", "sei", "nil" - so a token only counts when it sits in an unbroken run
 * of number-words long enough to be a phone number. "I have two dogs" is three
 * tokens and one digit; nothing happens. Seven digits in a row is not a
 * sentence.
 *
 * Adding a language means adding ten words. Nothing else changes.
 */

const DIGIT_WORDS: Record<string, string> = {};

function load(language: string[][]) {
  for (const [digit, ...words] of language) {
    for (const word of words) DIGIT_WORDS[word] = digit;
  }
}

// English, including the way people say digits aloud and the near-homophones
// they reach for when a filter starts biting.
load([
  ['0', 'zero', 'oh', 'o', 'nought', 'naught', 'nil', 'zilch'],
  ['1', 'one', 'won', 'wun'],
  ['2', 'two', 'to', 'too', 'tu'],
  ['3', 'three', 'tree', 'thee'],
  ['4', 'four', 'for', 'fore', 'four'],
  ['5', 'five', 'fife'],
  ['6', 'six', 'sics'],
  ['7', 'seven', 'sevn'],
  ['8', 'eight', 'ate', 'ait'],
  ['9', 'nine', 'niner', 'none', 'nyne'],
]);

// French, Spanish, Portuguese, Italian, German - accents are stripped before
// lookup, so "cinq" and "cinco" and "funf" all arrive unaccented.
load([
  ['0', 'zero', 'cero', 'null'],
  ['1', 'un', 'une', 'uno', 'una', 'um', 'eins'],
  ['2', 'deux', 'dos', 'dois', 'due', 'zwei'],
  ['3', 'trois', 'tres', 'tre', 'drei'],
  ['4', 'quatre', 'cuatro', 'quattro', 'vier'],
  ['5', 'cinq', 'cinco', 'cinque', 'funf', 'fuenf'],
  ['6', 'seis', 'sei', 'sechs'],
  ['7', 'sept', 'siete', 'sete', 'sette', 'sieben'],
  ['8', 'huit', 'ocho', 'oito', 'otto', 'acht'],
  ['9', 'neuf', 'nueve', 'nove', 'neun'],
]);

// Yoruba, Igbo, Hausa, Swahili.
load([
  ['0', 'odo', 'efu', 'sifili', 'sifuri'],
  ['1', 'eni', 'okan', 'otu', 'daya', 'moja'],
  ['2', 'eji', 'abuo', 'biyu', 'mbili'],
  ['3', 'eta', 'ato', 'uku', 'tatu'],
  ['4', 'erin', 'ano', 'hudu', 'nne'],
  ['5', 'arun', 'ise', 'biyar', 'tano'],
  ['6', 'efa', 'isii', 'shida', 'sita'],
  ['7', 'eje', 'asaa', 'bakwai', 'saba'],
  ['8', 'ejo', 'asato', 'takwas', 'nane'],
  ['9', 'esan', 'itoolu', 'tara', 'tisa'],
]);

// Arabic, Hindi/Urdu, Tagalog, Russian - as people transliterate them.
load([
  ['0', 'sifr', 'shunya', 'sunya', 'sero', 'nol', 'nul'],
  ['1', 'wahid', 'ek', 'isa', 'odin'],
  ['2', 'ithnayn', 'itnayn', 'do', 'dalawa', 'dva'],
  ['3', 'thalatha', 'talata', 'teen', 'tatlo', 'tri'],
  ['4', 'arbaa', 'arba', 'char', 'chaar', 'apat', 'chetyre'],
  ['5', 'khamsa', 'paanch', 'panch', 'lima', 'pyat'],
  ['6', 'sitta', 'chhah', 'chhe', 'anim', 'shest'],
  ['7', 'sabaa', 'saba', 'saat', 'pito', 'sem'],
  ['8', 'thamania', 'aath', 'walo', 'vosem'],
  ['9', 'tisaa', 'nau', 'siyam', 'devyat'],
]);

/** Digits from other writing systems, mapped to the ones we count with. */
const OTHER_NUMERALS: Record<string, string> = {};
for (let d = 0; d <= 9; d++) {
  OTHER_NUMERALS[String.fromCharCode(0x0660 + d)] = String(d); // Arabic-Indic
  OTHER_NUMERALS[String.fromCharCode(0x06f0 + d)] = String(d); // Persian
  OTHER_NUMERALS[String.fromCharCode(0x0966 + d)] = String(d); // Devanagari
  OTHER_NUMERALS[String.fromCharCode(0xff10 + d)] = String(d); // Fullwidth
}

/** Anything people put between spoken digits. */
const SEPARATORS = /([\s.\-–—_+/\\,:;|~"'()[\]]+)/;

function normalise(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9٠-٩۰-۹०-९０-９]/g, '');
}

/** The digits a token stands for, or null when it is just a word. */
function digitsFor(raw: string): string | null {
  const token = normalise(raw);
  if (!token) return null;

  const converted = [...token].map((c) => OTHER_NUMERALS[c] ?? c).join('');
  if (/^\d+$/.test(converted)) return converted;

  return DIGIT_WORDS[converted] ?? null;
}

/** How many digits a spoken run has to carry before it counts as a number. */
const MIN_DIGITS = 7;

function runs(text: string): Array<{ from: number; to: number; digits: number }> {
  const parts = text.split(SEPARATORS);
  const found: Array<{ from: number; to: number; digits: number }> = [];

  let from = -1;
  let digits = 0;

  const close = (to: number) => {
    if (from >= 0 && digits >= MIN_DIGITS) found.push({ from, to, digits });
    from = -1;
    digits = 0;
  };

  for (let i = 0; i < parts.length; i += 2) {
    const value = digitsFor(parts[i]);
    if (value === null) {
      close(i - 2);
      continue;
    }
    if (from < 0) from = i;
    digits += value.length;
  }
  close(parts.length - 1);

  return found;
}

/** True when the text spells out something long enough to be a phone number. */
export function containsSpelledNumber(text: string): boolean {
  return !!text && runs(text).length > 0;
}

/** Replaces spoken-digit runs with asterisks, leaving the rest of the text. */
export function maskSpelledNumbers(text: string): string {
  if (!text) return text;

  const found = runs(text);
  if (found.length === 0) return text;

  const parts = text.split(SEPARATORS);

  for (const run of found) {
    for (let i = run.from; i <= run.to && i < parts.length; i++) {
      // Blank the separators inside the run as well, so the shape of the
      // number - the hyphens, the grouping - does not survive either.
      parts[i] = i % 2 === 0 ? '' : '';
    }
    parts[run.from] = '*'.repeat(Math.min(Math.max(run.digits, 6), 12));
  }

  return parts.join('').replace(/[ \t]{2,}/g, ' ').trim();
}
