export interface Note {
  id: string;
  text: string;
  timestamp: number;
  location: GeolocationCoordinates | null;
  summary?: string;
  isSummarizing?: boolean;
}

// FIX: `GeolocationCoordinates` is a global DOM type. It's available project-wide
// without needing to be re-exported, which was causing a TypeScript error.
// The unnecessary export has been removed.
