export interface ActivityDef {
  label: string;
  unit: string;
  co2PerUnit: number;
}

export const ACTIVITY_DEFINITIONS: Record<string, Record<string, ActivityDef>> = {
  transport: {
    car_km: { label: "Car", unit: "km", co2PerUnit: 0.21 },
    bus_km: { label: "Bus", unit: "km", co2PerUnit: 0.089 },
    train_km: { label: "Train", unit: "km", co2PerUnit: 0.041 },
    flight_km: { label: "Flight", unit: "km", co2PerUnit: 0.115 },
  },
  food: {
    beef_meal: { label: "Beef meal", unit: "meal", co2PerUnit: 6.61 },
    chicken_meal: { label: "Chicken meal", unit: "meal", co2PerUnit: 0.86 },
    vegetarian_meal: { label: "Vegetarian meal", unit: "meal", co2PerUnit: 0.5 },
    vegan_meal: { label: "Vegan meal", unit: "meal", co2PerUnit: 0.3 },
  },
  energy: {
    electricity_kwh: { label: "Electricity", unit: "kWh", co2PerUnit: 0.233 },
    natural_gas_m3: { label: "Natural gas", unit: "m³", co2PerUnit: 2.0 },
  },
  shopping: {
    new_clothing: { label: "New clothing item", unit: "item", co2PerUnit: 20 },
    electronics_device: { label: "Electronics device", unit: "device", co2PerUnit: 70 },
    online_purchase: { label: "Online purchase", unit: "package", co2PerUnit: 0.5 },
  },
};

export function getActivityDef(category: string, activityType: string): ActivityDef | null {
  return ACTIVITY_DEFINITIONS[category]?.[activityType] ?? null;
}

export function calculateCo2(category: string, activityType: string, value: number): number | null {
  const def = getActivityDef(category, activityType);
  if (!def) return null;
  return Math.round(def.co2PerUnit * value * 1000) / 1000;
}

export const GLOBAL_DAILY_AVERAGE_KG = 19.2;
