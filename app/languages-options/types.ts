export type LangVendor = { name: string; slug: string; cover?: string; discipline: string };

export type LangRow = {
  name: string;
  native: string;
  lang: string;
  count: number;
  vendors: LangVendor[];
};

export const ease = [0.16, 1, 0.3, 1] as const;
