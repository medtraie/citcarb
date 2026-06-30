export type UserRole = 'admin' | 'agent' | 'responsable';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  ownerId: string;
  permissions: {
    can_refill: boolean;
    can_add_vehicle: boolean;
    can_add_driver: boolean;
    can_view_reports: boolean;
    can_manage_users: boolean;
  };
  isCompleted: boolean;
}

export type VehicleStatus = 'active' | 'maintenance' | 'outOfService';

export interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  type: string; // 'truck', 'car', 'van', etc.
  year: number;
  currentMileage: number;
  avgConsumption: number; // L/100km théorique
  status: VehicleStatus;
  photoUrl?: string;
  driverId?: string;
  ownerId: string;
}

export type DriverStatus = 'active' | 'suspended' | 'inactive';

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  cin: string;
  licenseNumber: string;
  photoUrl?: string;
  status: DriverStatus;
  ownerId: string;
}

export type BarrelType = 'hydraulique' | 'motor_oil';

export interface Barrel {
  id: string;
  name: string;
  type: BarrelType;
  capacity: number;
  currentVolume: number;
  alertThreshold: number;
  unit: string;
  ownerId: string;
}

export type BarrelMovementType = 'refill' | 'consume';

export interface BarrelMovement {
  id: string;
  barrelId: string;
  type: BarrelMovementType;
  quantity: number;
  supplier?: string;
  price?: number;
  notes?: string;
  performedBy?: string;
  vehicleId?: string;
  ownerId: string;
  createdAt: string;
}

export interface FuelFill {
  id: string;
  vehicleId: string;
  driverId: string;
  quantity: number;
  mileage: number;
  distanceTraveled?: number;
  calculatedConsumption?: number;
  anomalyDetected: boolean;
  anomalyType?: string;
  notes?: string;
  photoUrl?: string;
  performedBy?: string;
  ownerId: string;
  createdAt: string;
}

export interface Tank {
  id: string;
  capacity: number;
  currentVolume: number;
  alertThreshold: number;
  ownerId: string;
}

export type TankMovementType = 'refill' | 'adjustment' | 'fill';

export interface TankMovement {
  id: string;
  tankId: string;
  type: TankMovementType;
  quantity: number;
  supplier?: string;
  price?: number;
  notes?: string;
  performedBy?: string;
  ownerId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string; // 'low_stock' | 'consumption_anomaly' | 'mileage_alert' | 'maintenance'
  isRead: boolean;
  ownerId: string;
  createdAt: string;
}
