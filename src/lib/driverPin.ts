/** ASCII digits only; PINs are strings so leading zeroes are preserved. */
export function isDriverPin(value: string): boolean {
  return value.length === 2 && /^[0-9]{2}$/.test(value);
}
