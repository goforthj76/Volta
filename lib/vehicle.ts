export const vehicles = [
  "Tesla Model 3",
  "Tesla Model Y",
  "Tesla Model S",
  "Tesla Model X",
  "Tesla Cybertruck",
  "Other vehicle",
  "Phone / tablet",
] as const;
export type Vehicle = (typeof vehicles)[number];
export const displays = [
  "Center display (parked)",
  "Rear / passenger display",
  "Phone / tablet",
] as const;
export type Display = (typeof displays)[number];
export function validVehicle(value: unknown): value is Vehicle {
  return (
    typeof value === "string" && (vehicles as readonly string[]).includes(value)
  );
}
