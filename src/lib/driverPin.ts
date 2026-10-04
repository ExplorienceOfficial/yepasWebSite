/** ASCII digits only; PINs are strings so leading zeroes are preserved. */
export function isDriverPin(value: string): boolean {
  return value.length === 4 && /^[0-9]{4}$/.test(value);
}
