const bolivianos = new Intl.NumberFormat('es-BO', { useGrouping: 'always', maximumFractionDigits: 0 });

export function formatMoney(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('El monto debe ser un entero no negativo.');
  return `Bs ${bolivianos.format(amount)}`;
}
