"use client";

import { useEffect, useRef, useCallback } from "react";
import { RadarProfile } from "@/types/radar";
import { getRingForDistance } from "@/lib/utils/distance";

const RING_RATIOS = [0.14, 0.26, 0.38, 0.52, 0.66, 0.80];
const RING_LABELS = ["0.5 km", "1 km", "1.5 km", "2 km", "3.5 km", "5 km"];
const TILT        = 0.38;
const GREEN       = "#1B4332";
const GREEN_RGBA  = "27,67,50";
const R_BASE      = 13;
const R_HOV       = 17;

interface PlacedDot {
  profile: RadarProfile;
  groundX: number;
  groundY: number;
  angle: number;
  r: number;
  ringIdx: number;
  phase: number;
}

function buildDots(profiles: RadarProfile[], W: number, H: number): PlacedDot[] {
  const cx   = W / 2;
  const cy   = H / 2;
  const maxR = Math.min(W, H) * 0.44;

  const grouped: Record<number, RadarProfile[]> = {};
  profiles.forEach((p) => {
    const ring = Math.min((p.ring ?? getRingForDistance(p.distance_km)) - 1, 5);
    if (!grouped[ring]) grouped[ring] = [];
    grouped[ring].push(p);
  });

  const dots: PlacedDot[] = [];
  Object.entries(grouped).forEach(([ringIdxStr, items]) => {
    const ringIdx     = Number(ringIdxStr);
    const ratio       = RING_RATIOS[ringIdx];
    const r           = ratio * maxR;
    const angleOffset = ringIdx * 0.65;

    items.forEach((profile, i) => {
      const total = items.length;
      const angle = total === 1
        ? angleOffset + Math.PI / 4
        : (i / total) * Math.PI * 2 + angleOffset;

      const groundX = cx + Math.cos(angle) * r;
      const groundY = cy + Math.sin(angle) * r * TILT;

      dots.push({ profile, groundX, groundY, angle, r, ringIdx, phase: (i / Math.max(total, 1)) * Math.PI * 2 });
    });
  });

  return dots;
}

interface RadarMap3DProps {
  profiles: RadarProfile[];
  onSelect: (p: RadarProfile) => void;
}

export function RadarMap3D({ profiles, onSelect }: RadarMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const tRef         = useRef(0);
  const dotsRef      = useRef<PlacedDot[]>([]);
  const hovRef       = useRef<string | null>(null);
  const drawnRef     = useRef<{ id: string; px: number; py: number }[]>([]);
  const imagesRef    = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    profiles.forEach((p) => {
      const url = p.is_company ? p.company_logo_url : p.profile_image_url;
      if (url && !imagesRef.current.has(p.id)) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        imagesRef.current.set(p.id, img);
      }
    });
  }, [profiles]);

  useEffect(() => {
    function build() {
      const el = containerRef.current;
      if (!el) return;
      dotsRef.current = buildDots(profiles, el.offsetWidth, el.offsetHeight);
    }
    build();
    window.addEventListener("resize", build);
    return () => window.removeEventListener("resize", build);
  }, [profiles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const el  = canvas!.parentElement!;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width  = el.offsetWidth  * dpr;
      canvas!.height = el.offsetHeight * dpr;
      canvas!.style.width  = el.offsetWidth  + "px";
      canvas!.style.height = el.offsetHeight + "px";
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const ctx = canvas.getContext("2d")!;

    function drawAvatar(
      id: string,
      profile: RadarProfile,
      px: number,
      py: number,
      radius: number,
      isHov: boolean,
    ) {
      const url  = profile.is_company
        ? (profile.company_logo_url ?? profile.profile_image_url)
        : profile.profile_image_url;
      const img  = url ? imagesRef.current.get(id) : undefined;
      const name = profile.company_name || profile.full_name || "?";
      const init = name.charAt(0).toUpperCase();

      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      if (isHov) {
        ctx.shadowColor = `rgba(${GREEN_RGBA},0.4)`;
        ctx.shadowBlur  = 14;
      }
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, radius - 1, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, px - radius, py - radius, radius * 2, radius * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, radius - 1, 0, Math.PI * 2);
        ctx.fillStyle = profile.is_company ? GREEN : "#F3F4F6";
        ctx.fill();
        ctx.fillStyle    = profile.is_company ? "#fff" : GREEN;
        ctx.font         = `700 ${Math.max(7, Math.floor(radius * 0.5))}px system-ui, sans-serif`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(init, px, py);
        ctx.textBaseline = "alphabetic";
      }

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isHov ? GREEN : "rgba(229,231,235,1)";
      ctx.lineWidth   = isHov ? 2.5 : 1.5;
      ctx.stroke();

      // name label — 15% smaller
      const displayName = profile.company_name || profile.full_name || "?";
      const shortName   = displayName.length > 12 ? displayName.slice(0, 11) + "…" : displayName;
      ctx.fillStyle    = "#111827";
      ctx.font         = `600 ${Math.max(7, Math.floor(radius * 0.47))}px system-ui, sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(shortName, px, py + radius + 11);

      // distance label — 15% smaller
      const dist = profile.distance_km < 1
        ? `${(profile.distance_km * 1000).toFixed(0)}m`
        : `${profile.distance_km.toFixed(1)} km`;
      ctx.fillStyle = "#6B7280";
      ctx.font      = `400 ${Math.max(6, Math.floor(radius * 0.37))}px system-ui, sans-serif`;
      ctx.fillText(dist, px, py + radius + 22);
    }

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const W   = canvas!.width  / dpr;
      const H   = canvas!.height / dpr;
      tRef.current += 0.007;
      const t = tRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx   = W / 2;
      const cy   = H / 2;
      const maxR = Math.min(W, H) * 0.44;

      // background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.1);
      bg.addColorStop(0, "#F9FAFB");
      bg.addColorStop(1, "#F3F4F6");
      ctx.beginPath();
      ctx.ellipse(cx, cy, maxR * 1.05, maxR * 1.05 * TILT, 0, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();

      // 3D elliptical rings
      RING_RATIOS.forEach((ratio, i) => {
        const rx = ratio * maxR;
        const ry = rx * TILT;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GREEN_RGBA},${0.06 + i * 0.015})`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();
        ctx.fillStyle = "rgba(156,163,175,0.9)";
        ctx.font      = "9px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(RING_LABELS[i], cx + rx + 4, cy - ry * 0.05);
      });

      // sweep scaled to ellipse
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t % (Math.PI * 2));
      ctx.scale(1, TILT);
      const sg = ctx.createLinearGradient(0, 0, maxR * 0.92, 0);
      sg.addColorStop(0, `rgba(${GREEN_RGBA},0.14)`);
      sg.addColorStop(1, `rgba(${GREEN_RGBA},0)`);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxR * 0.92, -0.3, 0);
      ctx.closePath();
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.restore();

      // dots — painter's sort back-to-front
      const sorted = [...dotsRef.current].sort((a, b) => a.groundY - b.groundY);
      const drawn: { id: string; px: number; py: number }[] = [];

      sorted.forEach((dp) => {
        const fy     = Math.sin(t * 0.9 + dp.phase) * 2;
        const floatH = 18 + dp.ringIdx * 13;
        const px     = dp.groundX;
        const py     = dp.groundY - floatH + fy;
        const isHov  = dp.profile.id === hovRef.current;
        const radius = isHov ? R_HOV : R_BASE;

        // ground shadow
        ctx.beginPath();
        ctx.ellipse(dp.groundX, dp.groundY, 9, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.05)";
        ctx.fill();

        // stem
        ctx.beginPath();
        ctx.moveTo(dp.groundX, dp.groundY);
        ctx.lineTo(px, py + radius);
        ctx.strokeStyle = `rgba(${GREEN_RGBA},0.13)`;
        ctx.lineWidth   = 1;
        ctx.stroke();

        drawAvatar(dp.profile.id, dp.profile, px, py, radius, isHov);
        drawn.push({ id: dp.profile.id, px, py });
      });
      drawnRef.current = drawn;

      // no "You" dot in 3D mode

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: string | null = null;
    for (const d of drawnRef.current) {
      if (Math.hypot(mx - d.px, my - d.py) < R_HOV + 4) { found = d.id; break; }
    }
    hovRef.current = found;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const d of drawnRef.current) {
      if (Math.hypot(mx - d.px, my - d.py) < R_HOV + 4) {
        const profile = dotsRef.current.find((dot) => dot.profile.id === d.id)?.profile;
        if (profile) onSelect(profile);
        break;
      }
    }
  }, [onSelect]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", aspectRatio: "1 / 1.05" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          cursor: hovRef.current ? "pointer" : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { hovRef.current = null; }}
        onClick={handleClick}
      />
    </div>
  );
}