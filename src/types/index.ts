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
  type: string; // Category: 'Voiture', 'Camionette', 'Camion', 'Engins', 'Autre'
  tonnage?: number; // 3.5, 7, 10, 14
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

export type FuelFillStatus = 'pending' | 'confirmed' | 'rejected';

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
  status?: FuelFillStatus;
  validatedAt?: string;
  validatedBy?: string;
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

export type RevisionType = 'vidange' | 'tachygraphe' | 'visite_technique' | 'assurance' | 'vignette' | 'autre';
export type RevisionMode = 'days' | 'mileage';
export type RevisionStatus = 'up_to_date' | 'due_soon' | 'overdue';

export interface Revision {
  id: string;
  vehicleId: string;
  type: RevisionType;
  mode: RevisionMode;
  intervalDays?: number;
  lastDate?: string;
  nextDueDate?: string;
  intervalKm?: number;
  lastKm?: number;
  nextDueKm?: number;
  cost?: number;
  invoiceNumber?: string;
  provider?: string;
  notes?: string;
  status: RevisionStatus;
  ownerId: string;
  createdAt: string;
}

export type RepairType = 'mecanique' | 'electrique' | 'carrosserie' | 'pneumatique' | 'freinage' | 'hydraulique' | 'autre';
export type RepairPriority = 'low' | 'medium' | 'high';
export type RepairStatus = 'pending' | 'in_progress' | 'completed';

export interface Repair {
  id: string;
  vehicleId: string;
  type: RepairType;
  priority: RepairPriority;
  status: RepairStatus;
  startDate: string;
  endDate?: string;
  cost: number;
  provider?: string;
  description: string;
  partsReplaced?: string;
  ownerId: string;
  createdAt: string;
}


