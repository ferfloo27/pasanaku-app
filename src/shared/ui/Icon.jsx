const paths = {
  plus: <path d="M5 12h14M12 5v14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  check: <path d="m5 12 4 5L20 6" />,
  error: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></>,
  edit: <><path d="m16 3 5 5L8 21l-6 1 1-6ZM14 5l5 5" /></>,
  arrow: <path d="m9 5 7 7-7 7" />,
};

export default function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
