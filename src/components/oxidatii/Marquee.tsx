const items = [
  'NOAPTEA ÎNCEPE AICI',
  '★',
  'INTRĂ ÎN HAOS',
  '★',
  'WHERE NIGHTS BECOME LEGENDS',
  '★',
  'ORAȘUL E LIVE',
  '★',
  'REAL LIFE · BUT MULTIPLAYER',
  '★',
];

export function Marquee() {
  const loop = [...items, ...items, ...items, ...items];
  return (
    <div className="relative py-6 border-y border-border overflow-hidden glass">
      <div className="flex marquee whitespace-nowrap">
        {loop.map((t, i) => (
          <span key={i} className="font-display font-black text-3xl md:text-5xl px-8 tracking-tight"
            style={{ color: i % 4 === 0 ? 'var(--neon-purple)' : i % 4 === 2 ? 'var(--neon-green)' : 'transparent',
                     WebkitTextStroke: i % 2 ? '1px oklch(0.7 0 0 / 30%)' : undefined }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
