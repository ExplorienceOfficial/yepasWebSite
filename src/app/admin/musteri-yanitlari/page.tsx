"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  MessageSquare,
  MessageSquareQuote,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Truck,
  UserCheck,
  X,
} from "lucide-react";

import { PageHeading, Panel } from "@/components/admin/Panel";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useOperations } from "@/context/OperationsContext";
import { cn, initials } from "@/lib/format";

type MessageCategory =
  | "all"
  | "unread"
  | "order_note"
  | "decline_reason"
  | "delivery_feedback"
  | "special_request"
  | "urgent";

interface MobileMessage {
  id: string;
  customerId: string;
  customerName: string;
  district: string;
  category: "order_note" | "decline_reason" | "delivery_feedback" | "special_request" | "urgent";
  device: "iOS Mobile" | "Android Mobile";
  message: string;
  timestamp: string;
  status: "unread" | "replied" | "read";
  replyText?: string;
  repliedAt?: string;
}

const initialMessages: MobileMessage[] = [
  {
    id: "msg-1",
    customerId: "c05",
    customerName: "Kuğulu Kafe",
    district: "Kavaklıdere",
    category: "decline_reason",
    device: "Android Mobile",
    message: "Yarın dükkanda planlı tadilat yapılacağı için kapalı olacağız. Bu yüzden sipariş vermek istemiyoruz.",
    timestamp: "09:30 · Bugün",
    status: "unread",
  },
  {
    id: "msg-2",
    customerId: "c01",
    customerName: "Bereket Market Kızılay",
    district: "Kızılay",
    category: "order_note",
    device: "iOS Mobile",
    message: "Kapanış saatinden önce Sade Roll siparişimizi 60 adetten 100 adede çıkardık, sistemde güncellendi mi acaba?",
    timestamp: "10:15 · Bugün",
    status: "unread",
  },
  {
    id: "msg-3",
    customerId: "c19",
    customerName: "Elvankent Kebap Salonu",
    district: "Elvankent",
    category: "delivery_feedback",
    device: "Android Mobile",
    message: "Sabah teslimatını yapan şoförünüz Hakan Bey'e teşekkür ederiz. Ekmekler çok taze ve tam zamanında ulaştı.",
    timestamp: "08:40 · Bugün",
    status: "read",
  },
  {
    id: "msg-4",
    customerId: "c03",
    customerName: "Grand Ankara Otel",
    district: "Kızılay",
    category: "special_request",
    device: "iOS Mobile",
    message: "Hafta sonu büfe organizasyonu için ekstra 50 adet Zeytinli Ciabatta rezervasyonu rica ediyoruz.",
    timestamp: "07:55 · Bugün",
    status: "replied",
    replyText: "Talebiniz alındı, hafta sonıı teslimat listesine eklendi. Teşekkür ederiz.",
    repliedAt: "08:15 · Bugün",
  },
  {
    id: "msg-5",
    customerId: "c18",
    customerName: "Eryaman Catering Hizmetleri",
    district: "Eryaman",
    category: "order_note",
    device: "Android Mobile",
    message: "Sabah 06:30 erkenci teslimat ricası ile siparişimizi onayladık. Şoför arkadaşımız tam 06:30'da arka kapıda olabilir mi?",
    timestamp: "06:45 · Bugün",
    status: "read",
  },
  {
    id: "msg-6",
    customerId: "c09",
    customerName: "Balgat Burger House",
    district: "Balgat",
    category: "urgent",
    device: "iOS Mobile",
    message: "Akşam burger yoğunluğu nedeniyle stoklarımız bitmek üzere! Akşamüstü ara servis imkanı var mıdır?",
    timestamp: "Dün 17:10",
    status: "replied",
    replyText: "Mustafa Bey (Şoför) ara servis için aracına ek siparişinizi yükledi, 20 dk içinde yanınızda.",
    repliedAt: "Dün 17:25",
  },
];

const categoryMeta: Record<
  MobileMessage["category"],
  { label: string; bg: string; text: string; icon: any }
> = {
  order_note: {
    label: "Sipariş Notu",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    icon: MessageSquare,
  },
  decline_reason: {
    label: "Pas Geçme Açıklaması",
    bg: "bg-[var(--bad)]/10",
    text: "text-[var(--bad)]",
    icon: X,
  },
  delivery_feedback: {
    label: "Teslimat / Şoför",
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    icon: Truck,
  },
  special_request: {
    label: "Özel Talep",
    bg: "bg-[var(--warn)]/10",
    text: "text-[var(--warn)]",
    icon: Sparkles,
  },
  urgent: {
    label: "Acil Mesaj",
    bg: "bg-rose-600/10",
    text: "text-rose-600 dark:text-rose-400",
    icon: AlertTriangle,
  },
};

export default function CustomerResponsesPage() {
  const { customers } = useOperations();
  const [messages, setMessages] = useState<MobileMessage[]>(initialMessages);
  const [categoryFilter, setCategoryFilter] = useState<MessageCategory>("all");
  const [search, setSearch] = useState("");
  const [replyingTo, setReplyingTo] = useState<MobileMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 4000);
  };

  // Simüle edilmiş canlı mobil mesaj ekleme
  const simulateNewMessage = () => {
    const pool = [
      {
        customerName: "Sakarya Çorba & Kebap",
        district: "Sakarya",
        category: "order_note" as const,
        device: "iOS Mobile" as const,
        message: "Çorba ekmeği adetini yarın için 200 adet artırdık, mobil uygulamadan kontrol edebilirsiniz.",
      },
      {
        customerName: "Öz Bahçelievler Market",
        district: "Bahçelievler",
        category: "delivery_feedback" as const,
        device: "Android Mobile" as const,
        message: "Ekmek kasaları çok temiz teslim edildi, şoför Mustafa Bey'e teşekkür ederiz.",
      },
      {
        customerName: "Söğütözü Plaza Kafeterya",
        district: "Söğütözü",
        category: "special_request" as const,
        device: "iOS Mobile" as const,
        message: "Yarın sabah toplantımız için ekstra 30 adet Susamlı Sandviç ricasında bulunduk.",
      },
    ];

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const newMsg: MobileMessage = {
      id: `msg-${Date.now()}`,
      customerId: `c-random-${Date.now()}`,
      customerName: chosen.customerName,
      district: chosen.district,
      category: chosen.category,
      device: chosen.device,
      message: chosen.message,
      timestamp: "Şimdi",
      status: "unread",
    };

    setMessages((prev) => [newMsg, ...prev]);
    showToast(`📱 Müşteri Mobil Uygulamasından Yeni Mesaj Alındı: ${chosen.customerName}`);
  };

  const handleSendReply = () => {
    if (!replyingTo || !replyText.trim()) return;
    const nowTime = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === replyingTo.id
          ? {
              ...msg,
              status: "replied",
              replyText: replyText.trim(),
              repliedAt: `${nowTime} · Bugün`,
            }
          : msg,
      ),
    );

    showToast(`Yanıtınız ${replyingTo.customerName} müşterisinin mobil uygulamasına iletildi.`);
    setReplyingTo(null);
    setReplyText("");
  };

  const markAsRead = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id && msg.status === "unread" ? { ...msg, status: "read" } : msg)),
    );
  };

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return messages.filter((msg) => {
      if (categoryFilter === "unread" && msg.status !== "unread") return false;
      if (categoryFilter !== "all" && categoryFilter !== "unread" && msg.category !== categoryFilter)
        return false;
      if (!term) return true;
      return (
        msg.customerName.toLocaleLowerCase("tr-TR").includes(term) ||
        msg.district.toLocaleLowerCase("tr-TR").includes(term) ||
        msg.message.toLocaleLowerCase("tr-TR").includes(term)
      );
    });
  }, [messages, categoryFilter, search]);

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <div className="yp-rise">
      <PageHeading
        title="Müşteri Yanıtları & Mobil İletişim"
        description="Müşteri mobil uygulamasından gelen canlı mesajlar, talepler ve pas geçme açıklamaları."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[var(--ok)]/10 px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ok)] ring-1 ring-[var(--ok)]/20">
              <span className="size-2 rounded-full bg-[var(--ok)] animate-pulse" />
              Mobil Canlı Bağlı
            </span>
            <Button variant="primary" onClick={simulateNewMessage}>
              <Plus className="size-4" strokeWidth={2} />
              Mobil Test Mesajı Simüle Et
            </Button>
          </div>
        }
      />

      {/* Toast Bildirimi */}
      {toast && (
        <div className="mb-4 flex items-center justify-between rounded-[14px] bg-accent/10 px-4 py-3 text-[13.5px] font-semibold text-accent ring-1 ring-accent/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0" />
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-[12px] opacity-70 hover:opacity-100">
            Kapat
          </button>
        </div>
      )}

      {/* Üst İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[16px] bg-surface p-4 ring-1 ring-hairline shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Toplam Mobil Mesaj</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-ink-2">
              <MessageSquareQuote className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-ink">{messages.length}</p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">müşterilerden gelen bildirimler</p>
        </div>

        <div className="rounded-[16px] bg-surface p-4 ring-1 ring-hairline border-l-4 border-l-[var(--warn)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Okunmamış / Bekleyen</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--warn)]/10 text-[var(--warn)]">
              <Clock className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-[var(--warn)]">{unreadCount}</p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">incelenmeyi bekliyor</p>
        </div>

        <div className="rounded-[16px] bg-surface p-4 ring-1 ring-hairline border-l-4 border-l-[var(--ok)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Yanıtlanan / Tamamlanan</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--ok)]/10 text-[var(--ok)]">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-[var(--ok)]">
            {messages.filter((m) => m.status === "replied").length}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">mobil uygulamaya iletildi</p>
        </div>
      </div>

      {/* Filtre ve Arama Barı */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-all",
              categoryFilter === "all" ? "bg-surface text-ink shadow-2xs" : "text-ink-2 hover:text-ink",
            )}
          >
            Tümü ({messages.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("unread")}
            className={cn(
              "rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-all",
              categoryFilter === "unread"
                ? "bg-surface text-[var(--warn)] shadow-2xs font-semibold"
                : "text-ink-2 hover:text-ink",
            )}
          >
            Okunmamış ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("order_note")}
            className={cn(
              "rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-all",
              categoryFilter === "order_note"
                ? "bg-surface text-blue-600 shadow-2xs"
                : "text-ink-2 hover:text-ink",
            )}
          >
            Sipariş Notları
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("decline_reason")}
            className={cn(
              "rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-all",
              categoryFilter === "decline_reason"
                ? "bg-surface text-[var(--bad)] shadow-2xs"
                : "text-ink-2 hover:text-ink",
            )}
          >
            Pas Geçme Açıklamaları
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("delivery_feedback")}
            className={cn(
              "rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-all",
              categoryFilter === "delivery_feedback"
                ? "bg-surface text-purple-600 shadow-2xs"
                : "text-ink-2 hover:text-ink",
            )}
          >
            Teslimat & Şoför
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mesaj veya bayi ara..."
            className="w-full pl-9 lg:w-64"
          />
        </div>
      </div>

      {/* Mesaj Akışı Listesi */}
      <div className="mt-4 space-y-3.5">
        {filteredMessages.map((msg) => {
          const cat = categoryMeta[msg.category];
          const CategoryIcon = cat.icon;
          const isUnread = msg.status === "unread";

          return (
            <div
              key={msg.id}
              onClick={() => isUnread && markAsRead(msg.id)}
              className={cn(
                "overflow-hidden rounded-[16px] bg-surface ring-1 ring-hairline transition-all duration-150 p-4 sm:p-5",
                isUnread && "ring-2 ring-[var(--warn)]/40 bg-[var(--warn)]/5",
              )}
            >
              {/* Üst Başlık Satırı */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-bold text-ink-2 ring-1 ring-hairline">
                    {initials(msg.customerName)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-semibold text-ink">{msg.customerName}</h3>
                      <span className="text-[12px] text-ink-3">· {msg.district}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
                          cat.bg,
                          cat.text,
                        )}
                      >
                        <CategoryIcon className="size-3" />
                        {cat.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
                        <Smartphone className="size-3 text-ink-3" />
                        {msg.device}
                      </span>
                      <span className="text-[11px] text-ink-3">• {msg.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Durum Rozeti */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {msg.status === "unread" && (
                    <span className="rounded-full bg-[var(--warn)]/15 px-2.5 py-1 text-[11.5px] font-semibold text-[var(--warn)]">
                      Yeni Mesaj
                    </span>
                  )}
                  {msg.status === "read" && (
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-ink-3">
                      Okundu
                    </span>
                  )}
                  {msg.status === "replied" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ok)]/10 px-2.5 py-1 text-[11.5px] font-semibold text-[var(--ok)]">
                      <CheckCircle2 className="size-3" />
                      Yanıtlandı
                    </span>
                  )}
                </div>
              </div>

              {/* Mesaj Metni Box */}
              <div className="mt-3 rounded-[12px] bg-surface-2/60 p-3.5 text-[14px] leading-6 text-ink ring-1 ring-hairline/60">
                &quot;{msg.message}&quot;
              </div>

              {/* Var ise Admin Yanıtı */}
              {msg.replyText && (
                <div className="mt-2.5 ml-4 rounded-[12px] bg-accent/5 p-3.5 border-l-4 border-l-accent ring-1 ring-accent/15">
                  <div className="flex items-center justify-between text-[11.5px] font-semibold text-accent mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Reply className="size-3" />
                      Yönetici Yanıtı (Mobil Uygulamaya İletildi)
                    </span>
                    <span className="text-ink-3 font-normal">{msg.repliedAt}</span>
                  </div>
                  <p className="text-[13.5px] text-ink-2">&quot;{msg.replyText}&quot;</p>
                </div>
              )}

              {/* Alt Butonlar */}
              <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-hairline/60 pt-3">
                {isUnread && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(msg.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                  >
                    <UserCheck className="size-3.5" />
                    Okundu İşaretle
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyingTo(msg);
                    setReplyText("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-white transition-all hover:bg-accent-hover active:scale-[0.98]"
                >
                  <Reply className="size-3.5" />
                  {msg.replyText ? "Yanıtı Güncelle" : "Mobil Uygulamaya Yanıt Gönder"}
                </button>
              </div>
            </div>
          );
        })}

        {filteredMessages.length === 0 && (
          <Panel bodyClassName="px-4 py-14 text-center">
            <MessageSquare className="mx-auto size-6 text-ink-3" />
            <p className="mt-2 text-[15px] font-medium text-ink">Filtrelere uygun mobil mesaj bulunamadı</p>
          </Panel>
        )}
      </div>

      {/* Yanıt Verme Modalı */}
      {replyingTo && (
        <Modal
          open={Boolean(replyingTo)}
          onClose={() => setReplyingTo(null)}
          title={`Mobil Uygulamaya Yanıt Gönder`}
          subtitle={`${replyingTo.customerName} (${replyingTo.district})`}
          width="max-w-lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setReplyingTo(null)}>
                Vazgeç
              </Button>
              <Button variant="primary" onClick={handleSendReply} disabled={!replyText.trim()}>
                <Send className="size-3.5" />
                Yanıtı İlet
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-[12px] bg-surface-2 p-3 text-[13px] text-ink-2 border-l-2 border-l-accent">
              <p className="font-semibold text-ink mb-0.5">Müşteri Mesajı:</p>
              &quot;{replyingTo.message}&quot;
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">
                Müşterinin Mobil Ekranına Gönderilecek Yanıt Metni:
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Örn: Talebiniz kaydedildi. Siparişiniz güncellenmiştir..."
                rows={4}
                className="w-full rounded-[12px] border border-hairline bg-surface-2 p-3 text-[14px] text-ink outline-none transition-all focus:border-transparent focus:ring-4 focus:ring-[var(--ring)]"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
