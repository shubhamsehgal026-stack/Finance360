
import { AnalysisModule, SchoolBranch, SchoolPerformance } from './types';

export const SCHOOL_WINGS: Record<string, string[]> = {
  "Darshan Academy [Ambala]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Amritsar]": ["Main Wing"],
  "Darshan Academy [Bhubaneswar]": ["Main Wing"], // Assuming main wing default
  "Darshan Academy [Dasuya]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Delhi]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Devlali]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Ferozepur]": ["Main Wing"],
  "Darshan Academy [Hisar]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Jagdishpura]": ["Main Wing"],
  "Darshan Academy [Jalandhar (Basti Nau)]": ["Junior Wing"],
  "Darshan Academy [Jalandhar (Kala singha)]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Kaithal]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Kalka]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Lucknow]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Ludhiana]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Meerut]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Modasa]": ["Main Wing"], // Assuming default
  "Darshan Academy [Pune]": ["Main Wing", "Nur Wing"],
  "Darshan Academy [Rathonda]": ["Main Wing"],
  "Darshan Academy [Sundargarh]": ["Main Wing", "Nur Wing"],
  "Darshan Vidhayalaya [Gulleria Bhatt]": ["Main Wing"],
  "Darshan Vidhayalaya [Bigas]": ["Main Wing"],
  "Darshan Vidhayalaya [Jansath]": ["Main Wing"],
  "Darshan Academy [International]": ["Main Wing"],
  "Darshan Academy [Cali]": ["Main Wing"]
};

export const DARSHAN_SCHOOLS = Object.keys(SCHOOL_WINGS) as SchoolBranch[];

export const ANALYSIS_MODULES = Object.values(AnalysisModule);

export const AVAILABLE_YEARS = [
  "2020-21",
  "2021-22",
  "2022-23",
  "2023-24",
  "2024-25",
  "2025-26",
  "2026-27",
  "2027-28",
  "2028-29",
  "2029-30"
];

export const DATABASE_CONFIG = {
  apiKey: "sb_publishable_Q2UEv3eri5Aiq1eX8-PUvw_cSzLRNP7"
};

export const generateMockData = (): SchoolPerformance[] => {
  return [];
};
