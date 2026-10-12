const DAY = 86400000;
const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "hoje", "ontem", "há 3 dias", "há 2 meses"… */
export function ago(iso) {
  if (!iso) return null;
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY);
  if (days > -30) return rtf.format(Math.min(0, days), 'day');
  if (days > -365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}
