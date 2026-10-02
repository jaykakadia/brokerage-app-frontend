export type NavigateParam = Record<string, string> | string | number | null | any;

export type NavigateFunction = (page: string, params?: NavigateParam) => void;
