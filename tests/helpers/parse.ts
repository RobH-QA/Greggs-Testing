/* Pulls numbers out of display text so unit formatting doesn't matter: "Fat12g17%" -> [12, 17] */
export function parseNumbers(text: string | null): number[] {
  return (text?.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

export function parseNumber(text: string | null): number {
  const [first] = parseNumbers(text);
  if (first === undefined) throw new Error(`No number found in ${JSON.stringify(text)}`);
  return first;
}

/* The number directly before a unit, for text with several values: "Energy1348kJ321kcal16%" + "kcal" -> 321 */
export function parseNumberWithUnit(text: string | null, unit: string): number {
  /* Not \b: values run together ("283kcal14%"), so only require that no letter follows the unit */
  const match = text?.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}(?![a-z])`, 'i'));
  if (!match) throw new Error(`No "${unit}" value found in ${JSON.stringify(text)}`);
  return Number(match[1]);
}
