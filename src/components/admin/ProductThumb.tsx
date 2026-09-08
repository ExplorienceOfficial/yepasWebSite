"use client";

import { useState } from "react";

import { cn, initials } from "@/lib/format";

export function ProductThumb({
  src,
  name,
  className,
}: {
  src: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] ring-1 ring-hairline bg-surface-2",
        className ?? "size-10",
      )}
    >
      {showImage ? (
        // Fotoğraf URL alanı serbest metin olduğu için next/image yerine img kullanılıyor.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span className="text-[11px] font-semibold text-ink-3">{initials(name)}</span>
      )}
    </span>
  );
}
