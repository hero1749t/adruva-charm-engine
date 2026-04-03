export const normalizeUnsignedIntegerInput = (value: string) =>
  value.replace(/[^\d]/g, "");

export const normalizeUnsignedDecimalInput = (value: string) => {
  const sanitized = value.replace(/-/g, "").replace(/[^\d.]/g, "");
  const firstDotIndex = sanitized.indexOf(".");

  if (firstDotIndex === -1) {
    return sanitized;
  }

  return (
    sanitized.slice(0, firstDotIndex + 1) +
    sanitized.slice(firstDotIndex + 1).replace(/\./g, "")
  );
};

export const parseNonNegativeNumber = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

export const parsePositiveNumber = (value: string) => {
  const parsed = parseNonNegativeNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
};

export const parsePositiveInteger = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};
