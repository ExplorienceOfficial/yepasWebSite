/**
 * Yerel çalışma sunucusu /api çağrılarını bilgisayar içindeki API'ye vekâleten
 * iletir. Böylece localhost ve LAN IP aynı oturum/köken üzerinden çalışır.
 */
export function localApiUrl(path: string): string {
  return path;
}
