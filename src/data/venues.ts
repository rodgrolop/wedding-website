// Shared venue data used by both the map markers/tooltips (MapSection) and the
// transport info section (TransportInfoSection), so the info stays in sync.

export interface Venue {
  key: string;
  name: string;
  address: string;
  time?: string;
  // optional extra info shown in the tooltip / info block (fill in as needed)
  description?: string;
  phone?: string;
  website?: string;
}

// Google Maps "get directions" deep link built from the address.
export const directionsUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address,
  )}`;

// Addresses are geocoded at runtime (results cached in localStorage), so the
// pins always match the real addresses.
export const VENUES: Venue[] = [
  {
    key: "condestable-iranzo",
    name: "Hotel Condestable Iranzo",
    address: "P.\u00ba de la Estaci\u00f3n, 32, 23008 Ja\u00e9n",
    time: "19:15",
  },
  {
    key: "hotel-twist",
    name: "Hotel Twist",
    address: "Av. de Ja\u00e9n, 132, 23650 Torredonjimeno, Ja\u00e9n",
    time: "19:30",
  },
  {
    key: "salones-maria-luisa",
    name: "Salones Mar\u00eda Luisa",
    address: "Ctra. C\u00f3rdoba, 23650 Torredonjimeno, Ja\u00e9n",
    time: "19:45",
  },
];
