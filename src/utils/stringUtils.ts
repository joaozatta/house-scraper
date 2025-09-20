// Utilitários para parsing de strings do Tibia

export const stringToNumber = (str: string): number => {
  // Remove vírgulas, pontos e espaços para converter valores monetários
  const cleanStr = str.replace(/[,\s]/g, "");
  return parseInt(cleanStr, 10) || 0;
};

export const sanitizeHtmlString = (str: string): string => {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

// parseHouseId removido - não utilizado

export const parseTimestamp = (dateStr: string): number => {
  try {
    // Converte data do formato do Tibia para timestamp
    // Ex: "Dec 15 2024, 15:30:00 CET"
    const date = new Date(dateStr.replace(" CET", "").replace(" CEST", ""));
    return Math.floor(date.getTime() / 1000);
  } catch {
    return 0;
  }
};
