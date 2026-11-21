export interface HomeStat {
  id: string;
  icon: string;
  label: string;
  value: number;
}

export interface HomeGuide {
  id: string;
  icon: string;
  name: string;
  summary: string;
  needs: string[];
}
