import s from "./campaign.module.css";

interface Props {
  title: string;
  caption: string;
  items: { label: string; km: number }[];
}

const MAX_KM = 10;
const X0 = 70;
const X1 = 1130;
const x = (km: number) => X0 + (Math.min(km, MAX_KM) / MAX_KM) * (X1 - X0);

/**
 * The page's signature: a road from "You" outwards, with example requests
 * placed by distance. Purely illustrative, and labelled as such.
 */
export function RoadStrip({ title, caption, items }: Props) {
  const sorted = [...items].sort((a, b) => a.km - b.km);
  return (
    <section className={s.road} aria-labelledby="road-title">
      <div className={s.wrap}>
        <h2 className={s.roadTitle} id="road-title">
          {title}
        </h2>
        <p className={s.roadCaption}>{caption}</p>

        <svg className={s.roadSvg} viewBox="0 0 1200 230" role="img" aria-label={`Examples by distance: ${sorted.map((i) => `${i.label}, ${i.km} km`).join("; ")}`}>
          {/* road */}
          <rect x="40" y="150" width="1120" height="34" rx="17" fill="#1d4a31" />
          <line x1="80" y1="167" x2="1130" y2="167" stroke="#F4B400" strokeWidth="3" strokeDasharray="18 16" />
          {/* km ticks */}
          {[0, 2, 5, 10].map((km) => (
            <g key={km}>
              <line x1={x(km)} y1="190" x2={x(km)} y2="200" stroke="#a9c2b3" strokeWidth="2" />
              <text x={x(km)} y="222" textAnchor="middle" fill="#a9c2b3" fontSize="18" fontFamily="var(--body)">
                {km === 0 ? "You" : `${km} km`}
              </text>
            </g>
          ))}
          {/* you */}
          <circle cx={x(0)} cy="167" r="14" fill="#F4B400" />
          <circle cx={x(0)} cy="167" r="5" fill="#10301f" />
          {/* pins: alternate heights so labels never overlap */}
          {sorted.map((item, i) => {
            const px = x(item.km);
            const top = i % 2 === 0 ? 24 : 78;
            const w = Math.max(item.label.length * 11 + `${item.km} km`.length * 11 + 48, 160);
            const bx = Math.min(Math.max(px - w / 2, 8), 1192 - w);
            return (
              <g key={item.label}>
                <line x1={px} y1={top + 40} x2={px} y2="152" stroke="#e9f2ec" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="3 4" />
                <rect x={bx} y={top} width={w} height="40" rx="20" fill="#ffffff" />
                <text x={bx + 18} y={top + 26} fill="#10301f" fontSize="18" fontWeight="700" fontFamily="var(--body)">
                  {item.label}
                </text>
                <text x={bx + w - 16} y={top + 26} textAnchor="end" fill="#1e6b43" fontSize="17" fontWeight="800" fontFamily="var(--display)">
                  {item.km} km
                </text>
                <circle cx={px} cy="167" r="7" fill="#ffffff" stroke="#F4B400" strokeWidth="3" />
              </g>
            );
          })}
        </svg>

        {/* Small screens: the same examples as a readable list */}
        <ul className={s.roadList}>
          {sorted.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <b>{item.km} km</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
