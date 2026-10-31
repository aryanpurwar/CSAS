// Small inline icon set so the app ships no icon-font dependency and every glyph is
// crisp and theme-coloured. Decorative by default; pass a `title` to make one meaningful.
const paths = {
  shield: 'M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z',
  dashboard: 'M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h8v8H3v-8Zm10 3h8v5h-8v-5Z',
  mail: 'M3 5h18v14H3V5Zm0 2 9 6 9-6',
  inbox: 'M3 13h5l1.5 3h5L21 13V5H3v8Zm0 0v6h18v-6',
  phone: 'M4 4h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 2 6a2 2 0 0 1 2-2Z',
  quiz: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 13v.01M12 8a2 2 0 0 1 1.5 3.3c-.6.6-1.5 1-1.5 1.7',
  key: 'M14 7a4 4 0 1 0-3.9 5l1.4 1.4H14l1 1 2-1 1 1 2-2-5.5-5.4A4 4 0 0 0 14 7Z',
  trophy: 'M7 4h10v3a5 5 0 0 1-10 0V4Zm0 2H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3m-5 4v4m-3 3h6',
  chart: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm9 3-2 .5.5 2.3-2 1.2-1.6-1.7-2 1 .2 2.3H9.9l.2-2.3-2-1 .6 1.7-2-1.2.5-2.3L5 12l2-.5-.5-2.3 2-1.2L10 9.7l2-1-.2-2.3h2.4l-.2 2.3 2 1-.6-1.7 2 1.2-.5 2.3L21 12Z',
  flag: 'M5 21V4m0 0 9 1-1.5 4L14 13 5 12',
  alert: 'M12 3 2 20h20L12 3Zm0 6v5m0 3v.01',
  check: 'M4 12l5 5L20 6',
  x: 'M6 6l12 12M18 6 6 18',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off': 'M3 3l18 18M10.6 10.6a3 3 0 0 0 4 4M9.9 5.1A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 4M6.3 6.3A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3-.5',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 19h16',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6m5 15a6 6 0 0 0-5-5.9',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm2 13h13',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
  spark: 'M12 2v6m0 8v6M2 12h6m8 0h6M5 5l3 3m8 8 3 3m0-14-3 3m-8 8-3 3',
  link: 'M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1',
};

export default function Icon({ name, size = 18, title, className = '', strokeWidth = 1.8, fill = false }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
