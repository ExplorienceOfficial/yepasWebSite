export function isCustomerPin(value: string): boolean {
  return value.length === 4 && /^[0-9]{4}$/.test(value);
}

// No Number conversion: tax IDs and PINs can start with zeroes.
export function isCustomerLogin(value: string): boolean {
  return value.length <= 100 && !/\s/u.test(value) &&
    /^[0-9]{10,11}(?:\/[\p{L}\p{N}_.-]+)?$/u.test(value);
}

export function suggestCustomerLogin(taxNumber: string, branchName?: string): string {
  const number = taxNumber.trim();
  if (!/^[0-9]{10,11}$/.test(number)) return "";
  const branch = branchName?.trim().replace(/\s+/gu, "-").replace(/[^\p{L}\p{N}_.-]/gu, "");
  const value = branch ? `${number}/${branch}` : number;
  return isCustomerLogin(value) ? value : "";
}
