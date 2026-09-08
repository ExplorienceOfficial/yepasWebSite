/**
 * DEMO KİMLİK BİLGİLERİ
 *
 * Bu dosya yalnızca veritabanı bağlanana kadar geçerli olan sahte hesapları içerir.
 * Gerçek kurulumda doğrulama sunucu tarafında yapılmalı; parolalar istemci paketine
 * asla dahil edilmemelidir. Şoför PIN'leri `mockData.ts` içindeki sürücü kayıtlarındadır.
 */
export interface AdminAccount {
  username: string;
  password: string;
  name: string;
  title: string;
}

export const adminAccounts: AdminAccount[] = [
  {
    username: "admin",
    password: "yepas2026",
    name: "Kağan Karkı",
    title: "Operasyon Yöneticisi",
  },
  {
    username: "planlama",
    password: "yepas2026",
    name: "Selin Aydoğan",
    title: "Üretim Planlama Sorumlusu",
  },
];
