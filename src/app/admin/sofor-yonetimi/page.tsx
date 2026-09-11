"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Shield,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";

import { PageHeading, Panel } from "@/components/admin/Panel";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useOperations } from "@/context/OperationsContext";
import { cn, initials } from "@/lib/format";
import type { Driver } from "@/types";

export default function DriverManagementPage() {
  const { drivers, customers, assignCustomerToDriver, saveDriver } = useOperations();

  const [search, setSearch] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form State for Driver Modal
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [region, setRegion] = useState("");
  const [code, setCode] = useState("");

  const openNewDriver = () => {
    setEditingDriver(null);
    setName("");
    setPhone("");
    setPlate("");
    setRegion("");
    setCode(`SFR-0${drivers.length + 1}`);
    setModalOpen(true);
  };

  const openEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.name);
    setPhone(driver.phone);
    setPlate(driver.plate);
    setRegion(driver.region);
    setCode(driver.code);
    setModalOpen(true);
  };

  const handleSaveDriver = () => {
    if (!name.trim()) return;
    const driverObj: Driver = {
      id: editingDriver ? editingDriver.id : `d${Date.now()}`,
      code: code || "SFR-99",
      name: name.trim(),
      phone: phone.trim() || "0500 000 00 00",
      plate: plate.trim() || "06 YPS 000",
      region: region.trim() || "Ankara",
      pin: editingDriver ? editingDriver.pin : "1234",
    };
    saveDriver(driverObj);
    setModalOpen(false);
  };

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return customers.filter((c) => {
      if (selectedDriverId && c.driverId !== selectedDriverId) return false;
      if (!term) return true;
      return (
        c.name.toLocaleLowerCase("tr-TR").includes(term) ||
        c.district.toLocaleLowerCase("tr-TR").includes(term) ||
        c.type.toLocaleLowerCase("tr-TR").includes(term)
      );
    });
  }, [customers, search, selectedDriverId]);

  return (
    <div className="yp-rise space-y-6">
      <PageHeading
        title="Şoför Yönetimi & Müşteri Tanımlama"
        description="Saha şoförleri, plaka bilgileri, teslimat bölgeleri ve şoför-bayi eşleştirmeleri."
        action={
          <Button variant="primary" onClick={openNewDriver}>
            <Plus className="size-4" strokeWidth={2} />
            Yeni Şoför Ekle
          </Button>
        }
      />

      {/* İstatistik Özet Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[16px] bg-surface p-4 ring-1 ring-hairline shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Aktif Şoför Sayısı</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-ink-2">
              <Truck className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-ink">{drivers.length}</p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">saha dağıtım personeli</p>
        </div>

        <div className="rounded-[16px] bg-surface p-4 ring-1 ring-hairline shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Tanımlı Bayi Sayısı</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--ok)]/10 text-[var(--ok)]">
              <UserCheck className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-[var(--ok)]">{customers.length}</p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">şoförlere atanmış toplam bayi</p>
        </div>

        <div className="rounded-[16px] bg-surface p-4 ring-1 ring-hairline shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Ortalama Rota Yükü</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-ink-2">
              <Users className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-ink">
            {drivers.length === 0 ? 0 : Math.round(customers.length / drivers.length)}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">bayi / şoför başına</p>
        </div>
      </div>

      {/* Şoför Kartları Izgarası */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[15px] font-semibold text-ink">Saha Şoförleri ({drivers.length})</h2>
          {selectedDriverId && (
            <button
              type="button"
              onClick={() => setSelectedDriverId(null)}
              className="text-[12.5px] font-medium text-accent hover:underline"
            >
              Filtreyi Temizle (Tüm Şoförler)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => {
            const assignedCount = customers.filter((c) => c.driverId === driver.id).length;
            const isSelected = selectedDriverId === driver.id;

            return (
              <div
                key={driver.id}
                onClick={() => setSelectedDriverId(isSelected ? null : driver.id)}
                className={cn(
                  "cursor-pointer overflow-hidden rounded-[16px] bg-surface ring-1 transition-all duration-150 p-4 hover:shadow-sm",
                  isSelected
                    ? "ring-2 ring-accent bg-accent/5"
                    : "ring-hairline hover:border-ink-3",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-bold text-ink-2 ring-1 ring-hairline">
                      {initials(driver.name)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-ink text-[15px]">{driver.name}</h3>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-3">
                          {driver.code}
                        </span>
                      </div>
                      <p className="text-[12px] text-ink-3 mt-0.5">Plaka: {driver.plate}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDriver(driver);
                    }}
                    className="flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-ink"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-hairline/60 pt-3 text-[12.5px]">
                  <span className="text-ink-2 flex items-center gap-1">
                    <MapPin className="size-3.5 text-ink-3" />
                    {driver.region}
                  </span>
                  <span className="rounded-full bg-[var(--ok)]/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--ok)]">
                    {assignedCount} Bayi Tanımlı
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Müşteri - Şoför Tanımlama & Atama Tablosu */}
      <Panel
        title="Şoför - Bayi Tanımlama Listesi"
        description="Her bayinin dağıtım yapacak ilgili şoförünü buradan değiştirebilir ve tanımlayabilirsiniz."
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bayi veya bölge ara..."
              className="w-48 pl-9 sm:w-64"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-hairline text-[12px] font-semibold text-ink-3 uppercase tracking-wider">
                <th className="px-4 py-3">Bayi Adı</th>
                <th className="px-4 py-3">Bölge & Tip</th>
                <th className="px-4 py-3">İletişim</th>
                <th className="px-4 py-3 text-right">Atanan Şoför</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredCustomers.map((customer) => {
                const assignedDriver = drivers.find((d) => d.id === customer.driverId);

                return (
                  <tr key={customer.id} className="transition-colors hover:bg-surface-2/40">
                    <td className="px-4 py-3 font-medium text-ink">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink-2">
                          {initials(customer.name)}
                        </span>
                        <div>
                          <p className="text-[14px] font-medium text-ink">{customer.name}</p>
                          <p className="text-[11px] text-ink-3">Kod: {customer.code}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-ink-2">
                      <span className="font-medium text-ink">{customer.district}</span>
                      <span className="block text-[11.5px] text-ink-3">{customer.type}</span>
                    </td>

                    <td className="px-4 py-3 text-ink-2">
                      <span>{customer.contact}</span>
                      <span className="block text-[11.5px] text-ink-3">{customer.phone}</span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <select
                        value={customer.driverId}
                        onChange={(e) => assignCustomerToDriver(customer.id, e.target.value)}
                        aria-label={`${customer.name} için şoför atama`}
                        className="rounded-[10px] border border-hairline bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-[var(--ring)] cursor-pointer"
                      >
                        {drivers.map((drv) => (
                          <option key={drv.id} value={drv.id}>
                            {drv.name} ({drv.plate})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Şoför Ekle / Düzenle Modalı */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDriver ? "Şoför Bilgilerini Düzenle" : "Yeni Şoför Ekle"}
          width="max-w-md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Vazgeç
              </Button>
              <Button variant="primary" onClick={handleSaveDriver}>
                Kaydet
              </Button>
            </>
          }
        >
          <div className="space-y-3.5">
            <div>
              <label className="block text-[12.5px] font-medium text-ink mb-1">Şoför Adı Soyadı</label>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Hakan Demir"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-medium text-ink mb-1">Şoför Kodu</label>
                <TextInput
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="SFR-01"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-ink mb-1">Araç Plakası</label>
                <TextInput
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="06 YPS 401"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-ink mb-1">Telefon Numarası</label>
              <TextInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0532 000 00 00"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-ink mb-1">Teslimat Bölgesi</label>
              <TextInput
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Örn: Kızılay · Ulus"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
