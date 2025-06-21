
// src/config/countryCodes.ts
export interface CountryCode {
  name: string;
  code: string; // e.g., "+1"
  iso: string;  // e.g., "US"
}

// Updated to only include India.
export const countryCodes: CountryCode[] = [
  { name: "India", code: "+91", iso: "IN" },
];

