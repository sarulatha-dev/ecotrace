import React from "react";
import { Car, Bus, Train, Plane, Drumstick, Utensils, Leaf, Zap, Flame, Shirt, Smartphone, ShoppingCart } from "lucide-react";

export type ActivityCategory = "transport" | "food" | "energy" | "shopping";

export const CATEGORY_COLORS: Record<string, string> = {
  transport: "text-blue-500",
  food: "text-amber-500",
  energy: "text-yellow-500",
  shopping: "text-purple-500",
};

export const CATEGORY_LABELS: Record<string, string> = {
  transport: "Transport",
  food: "Food",
  energy: "Energy",
  shopping: "Shopping",
};

export const ACTIVITY_TYPES: Record<string, Array<{ id: string; label: string; unit: string; icon: React.ComponentType<{ className?: string }> }>> = {
  transport: [
    { id: "car_km", label: "Car", unit: "km", icon: Car },
    { id: "bus_km", label: "Bus", unit: "km", icon: Bus },
    { id: "train_km", label: "Train", unit: "km", icon: Train },
    { id: "flight_km", label: "Flight", unit: "km", icon: Plane },
  ],
  food: [
    { id: "beef_meal", label: "Beef Meal", unit: "meals", icon: Drumstick },
    { id: "chicken_meal", label: "Chicken Meal", unit: "meals", icon: Drumstick },
    { id: "vegetarian_meal", label: "Vegetarian Meal", unit: "meals", icon: Utensils },
    { id: "vegan_meal", label: "Vegan Meal", unit: "meals", icon: Leaf },
  ],
  energy: [
    { id: "electricity_kwh", label: "Electricity", unit: "kWh", icon: Zap },
    { id: "natural_gas_m3", label: "Natural Gas", unit: "m³", icon: Flame },
  ],
  shopping: [
    { id: "new_clothing", label: "New Clothing", unit: "items", icon: Shirt },
    { id: "electronics_device", label: "Electronics", unit: "devices", icon: Smartphone },
    { id: "online_purchase", label: "Online Purchase", unit: "deliveries", icon: ShoppingCart },
  ],
};
