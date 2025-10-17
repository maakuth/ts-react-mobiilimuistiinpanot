export interface Note {
  id: string;
  text: string;
  timestamp: number;
  location: GeolocationCoordinates | null;
  summary?: string;
  isSummarizing?: boolean;
}
