export function interpolate(str: string, vars: Record<string, any>): string {
  return str.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value !== undefined ? String(value) : "";
  });
}
