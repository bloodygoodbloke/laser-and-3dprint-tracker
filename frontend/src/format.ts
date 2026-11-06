export const formatNumber = (value: number, decimalPlaces = 2) => value.toFixed(decimalPlaces);

export const formatCurrency = (value?: number | null) => `£${formatNumber(value ?? 0)}`;

export const formatDate = (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => (
  (value instanceof Date ? value : new Date(value)).toLocaleDateString(undefined, options)
);

export const formatISODate = (value: Date | string | number) => (
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : typeof value === "string"
      ? value.slice(0, 10)
      : new Date(value).toISOString().slice(0, 10)
);
