export interface WordPressSite {
  siteKey: string;
  label: string;
  baseUrl: string;
  username: string;
  categoryId: number;
  defaultTags: string[];
}

export interface WordPressSiteInput {
  siteKey: string;
  label?: string;
  baseUrl: string;
  username: string;
  applicationPassword: string;
  categoryId: number;
  defaultTags?: string[];
}

export interface WordPressSiteUpdateInput {
  label?: string;
  baseUrl: string;
  username: string;
  applicationPassword?: string;
  categoryId: number;
  defaultTags?: string[];
}
