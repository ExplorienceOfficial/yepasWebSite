"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface LineChartPoint {
  label: string;
  value: number;
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export function LineChart({
  points,
  height = 260,
  formatValue = (v: number) => v.toLocaleString("tr-TR"),
  animateKey,
}: {
  points: LineChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  /** Değeri değişince çizim animasyonu tekrar oynar (dönem/metrik değişimi) */
  animateKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const padL = 6;
  const padR = 6;
  const padT = 18;
  const padB = 30;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;

  const geom = useMemo(() => {
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.18 || Math.max(1, max * 0.1);
    const lo = min - pad;
    const hi = max + pad;
    const xOf = (i: number) =>
      padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const yOf = (v: number) => padT + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
    const coords = points.map((p, i) => [xOf(i), yOf(p.value)] as [number, number]);
    return { lo, hi, xOf, yOf, coords };
  }, [points, innerW, innerH]);

  if (w === 0) {
    return <div ref={ref} style={{ height }} className="w-full" />;
  }

  const line = smoothPath(geom.coords);
  const bottom = padT + innerH;
  const area = geom.coords.length
    ? `${line} L ${geom.coords[geom.coords.length - 1][0].toFixed(2)} ${bottom} L ${geom.coords[0][0].toFixed(2)} ${bottom} Z`
    : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(points.length / 6);

  const hi = geom.hi;
  const hovered = hover != null ? points[hover] : null;
  const hx = hover != null ? geom.coords[hover][0] : 0;
  const hy = hover != null ? geom.coords[hover][1] : 0;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      <svg width={w} height={height} className="block overflow-visible">
        <defs>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Neredeyse görünmez yatay ızgara */}
        {gridLines.map((g) => {
          const y = padT + innerH * g;
          return (
            <line
              key={g}
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="var(--hairline)"
              strokeWidth={1}
            />
          );
        })}

        {/* Alan dolgusu */}
        <path key={`a-${animateKey}`} d={area} fill={`url(#area-${gid})`} className="yp-fade" />

        {/* Çizgi */}
        <path
          key={`l-${animateKey}`}
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={
            {
              strokeDasharray: 1,
              strokeDashoffset: 1,
              animation: "yp-draw 0.9s cubic-bezier(0.16,1,0.3,1) forwards",
              ["--len" as string]: 1,
            } as React.CSSProperties
          }
        />

        {/* Hover kılavuzu + nokta */}
        {hovered && (
          <g>
            <line
              x1={hx}
              x2={hx}
              y1={padT}
              y2={bottom}
              stroke="var(--hairline-strong)"
              strokeWidth={1}
            />
            <circle cx={hx} cy={hy} r={7} fill="var(--accent)" opacity={0.16} />
            <circle cx={hx} cy={hy} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}

        {/* X ekseni etiketleri (seyrek) */}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text
              key={i}
              x={geom.xOf(i)}
              y={height - 8}
              textAnchor={i === points.length - 1 ? "end" : i === 0 ? "start" : "middle"}
              className="fill-[var(--ink-3)]"
              style={{ fontSize: 11 }}
            >
              {p.label}
            </text>
          ) : null,
        )}

        {/* Yakalama katmanı */}
        <rect
          x={0}
          y={0}
          width={w}
          height={height}
          fill="transparent"
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const rel = (mx - padL) / (innerW || 1);
            const idx = Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1))));
            setHover(idx);
          }}
          onMouseLeave={() => setHover(null)}
        />

        {/* Y ekseni uç değerleri */}
        <text x={w - padR} y={padT - 6} textAnchor="end" className="fill-[var(--ink-3)]" style={{ fontSize: 11 }}>
          {formatValue(Math.round(hi))}
        </text>
      </svg>

      {/* Hover ipucu */}
      {hovered && (
        <div
          className="glass pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 shadow-[var(--shadow-md)] ring-1 ring-hairline"
          style={{ left: hx, top: hy - 14 }}
        >
          <p className="text-[11px] font-medium text-ink-3">{hovered.label}</p>
          <p className="text-sm font-semibold tabular-nums text-ink">{formatValue(hovered.value)}</p>
        </div>
      )}
    </div>
  );
}
