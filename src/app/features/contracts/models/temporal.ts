export interface PlainDate {
  toLocaleString: (locale: string, options?: Intl.DateTimeFormatOptions) => string;
}

export interface TemporalApi {
  PlainDate: { from: (iso: string) => PlainDate };
}
