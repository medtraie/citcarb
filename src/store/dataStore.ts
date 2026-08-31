import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { 
  Tank, 
  Barrel, 
  Vehicle, 
  Driver, 
  TankMovement, 
  BarrelMovement, 
  FuelFill, 
  AppNotification,
  Revision,
  Repair,
  RepairType,
  RepairPriority,
  RepairStatus
} from '../types';

interface DataState {
  tank: Tank | null;
  barrels: Barrel[];
  vehicles: Vehicle[];
  drivers: Driver[];
  tankMovements: TankMovement[];
  barrelMovements: BarrelMovement[];
  fuelFills: FuelFill[];
  notifications: AppNotification[];
  revisions: Revision[];
  repairs: Repair[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchDashboardData: (ownerId: string) => Promise<void>;
  
  // Vehicles
  fetchVehicles: (ownerId: string) => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id'> & { id?: string }) => Promise<void>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (vehicleId: string, ownerId: string) => Promise<void>;

  // Drivers
  fetchDrivers: (ownerId: string) => Promise<void>;
  addDriver: (driver: Omit<Driver, 'id'> & { id?: string }) => Promise<void>;
  updateDriver: (driver: Driver) => Promise<void>;
  deleteDriver: (driverId: string, ownerId: string) => Promise<void>;

  // Tank
  fetchTank: (ownerId: string) => Promise<void>;
  updateTank: (tank: Tank) => Promise<void>;
  deleteTank: (tankId: string, ownerId: string) => Promise<void>;
  refillTank: (params: {
    tankId: string;
    quantity: number;
    supplier?: string;
    price?: number;
    notes?: string;
    performedBy: string;
    ownerId: string;
  }) => Promise<void>;
  fetchTankMovements: (ownerId: string) => Promise<void>;

  // Barrels
  fetchBarrels: (ownerId: string) => Promise<void>;
  addBarrel: (barrel: Omit<Barrel, 'id'> & { id?: string }) => Promise<void>;
  updateBarrel: (barrel: Barrel) => Promise<void>;
  deleteBarrel: (barrelId: string, ownerId: string) => Promise<void>;
  fetchBarrelMovements: (ownerId: string) => Promise<void>;
  refillBarrel: (params: {
    barrelId: string;
    quantity: number;
    supplier?: string;
    price?: number;
    notes?: string;
    performedBy: string;
    ownerId: string;
  }) => Promise<void>;
  consumeFromBarrel: (params: {
    barrelId: string;
    quantity: number;
    notes?: string;
    vehicleId?: string;
    performedBy: string;
    ownerId: string;
    createdAt?: string;
  }) => Promise<void>;

  // Fuel fills
  fetchFuelFills: (ownerId: string) => Promise<void>;
  addFuelFill: (params: {
    vehicleId: string;
    driverId: string;
    quantity: number;
    mileage: number;
    notes?: string;
    photoUrl?: string;
    performedBy: string;
    ownerId: string;
    createdAt?: string;
  }) => Promise<void>;
  confirmFuelFill: (fillId: string, ownerId: string) => Promise<void>;
  updateFuelFill: (fill: FuelFill) => Promise<void>;
  deleteFuelFill: (fillId: string, ownerId: string) => Promise<void>;

  // Notifications
  fetchNotifications: (ownerId: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: (ownerId: string) => Promise<void>;
  sendNotification: (params: {
    ownerId: string;
    type: string;
    title: string;
    message: string;
  }) => Promise<void>;

  // Revisions
  fetchRevisions: (ownerId: string) => Promise<void>;
  addRevision: (revision: Omit<Revision, 'id' | 'status'> & { id?: string }) => Promise<void>;
  updateRevision: (revision: Revision) => Promise<void>;
  deleteRevision: (id: string, ownerId: string) => Promise<void>;
  completeRevision: (id: string, ownerId: string) => Promise<void>;

  // Repairs
  fetchRepairs: (ownerId: string) => Promise<void>;
  addRepair: (repair: Omit<Repair, 'id'> & { id?: string }) => Promise<void>;
  updateRepair: (repair: Repair) => Promise<void>;
  deleteRepair: (id: string, ownerId: string) => Promise<void>;
  completeRepair: (id: string, ownerId: string) => Promise<void>;
}

// Generate UUID for browser/demo
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Seed demo data helper
const getDemoData = () => {
  const local = localStorage.getItem('fuel_flow_demo_data');
  if (local) return JSON.parse(local);

  const demoData = {
    tank: {
      id: 'demo_tank_id',
      capacity: 10000,
      currentVolume: 6500,
      alertThreshold: 2000,
      ownerId: 'demo_admin_uid',
    },
    barrels: [
      {
        id: 'demo_barrel_hyd',
        name: 'Baril Hydraulique N°1',
        type: 'hydraulique' as const,
        capacity: 200,
        currentVolume: 120,
        alertThreshold: 40,
        unit: 'L',
        ownerId: 'demo_admin_uid',
      },
      {
        id: 'demo_barrel_mot',
        name: 'Baril Huile Moteur N°1',
        type: 'motor_oil' as const,
        capacity: 200,
        currentVolume: 75,
        alertThreshold: 40,
        unit: 'L',
        ownerId: 'demo_admin_uid',
      }
    ],
    vehicles: [
      {
        id: 'demo_veh_1',
        plateNumber: '12345-A-10',
        brand: 'Dacia',
        model: 'Logan',
        type: 'Camionette',
        year: 2022,
        currentMileage: 85200,
        avgConsumption: 6.5,
        status: 'active' as const,
        ownerId: 'demo_admin_uid',
      },
      {
        id: 'demo_veh_2',
        plateNumber: '98765-B-40',
        brand: 'Renault',
        model: 'Master',
        type: 'Fourgon',
        year: 2021,
        currentMileage: 142100,
        avgConsumption: 8.2,
        status: 'active' as const,
        ownerId: 'demo_admin_uid',
      }
    ],
    drivers: [
      {
        id: 'demo_drv_1',
        fullName: 'Ahmed El Mansouri',
        phone: '0661234567',
        cin: 'AB123456',
        licenseNumber: 'PERM-88991',
        status: 'active' as const,
        ownerId: 'demo_admin_uid',
      },
      {
        id: 'demo_drv_2',
        fullName: 'Yassine Belkacem',
        phone: '0669876543',
        cin: 'CD987654',
        licenseNumber: 'PERM-11223',
        status: 'active' as const,
        ownerId: 'demo_admin_uid',
      }
    ],
    fuelFills: [
      {
        id: 'demo_fill_1',
        vehicleId: 'demo_veh_1',
        driverId: 'demo_drv_1',
        quantity: 45,
        mileage: 85200,
        distanceTraveled: 650,
        calculatedConsumption: 6.9,
        anomalyDetected: false,
        notes: 'Plein régulier',
        performedBy: 'demo_agent_uid',
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      }
    ],
    barrelMovements: [
      {
        id: 'demo_bmov_1',
        barrelId: 'demo_barrel_hyd',
        type: 'consume' as const,
        quantity: 5,
        notes: 'Complément hydraulique',
        performedBy: 'demo_agent_uid',
        vehicleId: 'demo_veh_1',
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      }
    ],
    notifications: [
      {
        id: 'demo_not_1',
        title: 'Niveau d\'huile moteur bas',
        message: 'Le Baril Huile Moteur N°1 est en dessous du seuil d\'alerte.',
        type: 'low_stock',
        isRead: false,
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      }
    ],
    revisions: [
      {
        id: 'rev_1',
        vehicleId: 'demo_veh_1',
        type: 'vidange' as const,
        mode: 'mileage' as const,
        intervalKm: 10000,
        lastKm: 80000,
        nextDueKm: 90000,
        cost: 850,
        invoiceNumber: 'FAC-2024-089',
        provider: 'Garage Auto Express',
        notes: 'Vidange huile moteur 5W30 + changement filtres',
        status: 'due_soon' as const,
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
      },
      {
        id: 'rev_2',
        vehicleId: 'demo_veh_1',
        type: 'visite_technique' as const,
        mode: 'days' as const,
        intervalDays: 365,
        lastDate: '2025-08-20',
        nextDueDate: '2026-08-20',
        cost: 400,
        invoiceNumber: 'VT-9981',
        provider: 'Centre Contrôle Technique',
        notes: 'Visite technique annuelle',
        status: 'due_soon' as const,
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
      },
      {
        id: 'rev_3',
        vehicleId: 'demo_veh_2',
        type: 'tachygraphe' as const,
        mode: 'days' as const,
        intervalDays: 730,
        lastDate: '2024-09-01',
        nextDueDate: '2026-09-01',
        cost: 650,
        invoiceNumber: 'TACH-012',
        provider: 'Centre Agréé Tachygraphe',
        notes: 'Étalonnage et vérification bi-annuelle tachygraphe',
        status: 'up_to_date' as const,
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
      },
      {
        id: 'rev_4',
        vehicleId: 'demo_veh_2',
        type: 'assurance' as const,
        mode: 'days' as const,
        intervalDays: 365,
        lastDate: '2025-08-01',
        nextDueDate: '2026-08-01',
        cost: 4500,
        invoiceNumber: 'ASS-2026-X',
        provider: 'AXA Assurance Fleet',
        notes: 'Renouvellement contrat assurance tous risques',
        status: 'overdue' as const,
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 24 * 120).toISOString(),
      },
      {
        id: 'rev_5',
        vehicleId: 'demo_veh_1',
        type: 'vignette' as const,
        mode: 'days' as const,
        intervalDays: 365,
        lastDate: '2026-01-01',
        nextDueDate: '2027-01-01',
        cost: 1500,
        invoiceNumber: 'VIG-2026-MAR',
        provider: 'DGI Vignette',
        notes: 'Paiement vignette fiscale annuelle',
        status: 'up_to_date' as const,
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 24 * 150).toISOString(),
      }
    ],
    repairs: [
      {
        id: 'rep_1',
        vehicleId: 'demo_veh_1',
        type: 'mecanique' as const,
        priority: 'high' as const,
        status: 'in_progress' as const,
        startDate: '2026-08-10',
        cost: 2400,
        provider: 'Garage Central Pro',
        description: 'Changement kit d\'embrayage et joint de culasse suite à surchauffe moteur.',
        partsReplaced: 'Kit embrayage Valeo, Joint culasse, Liquide de refroidissement',
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
      },
      {
        id: 'rep_2',
        vehicleId: 'demo_veh_2',
        type: 'freinage' as const,
        priority: 'medium' as const,
        status: 'completed' as const,
        startDate: '2026-08-01',
        endDate: '2026-08-03',
        cost: 1100,
        provider: 'Auto-Centre Freins',
        description: 'Remplacement des plaquettes et disques de frein avant.',
        partsReplaced: 'Disques ventilés Bosch, Plaquettes ceramiques',
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 240).toISOString()
      },
      {
        id: 'rep_3',
        vehicleId: 'demo_veh_1',
        type: 'electrique' as const,
        priority: 'low' as const,
        status: 'pending' as const,
        startDate: '2026-08-13',
        cost: 450,
        provider: 'Électro-Auto Service',
        description: 'Diagnostique voyant batterie et remplacement alternateur.',
        partsReplaced: 'Courroie d\'alternateur',
        ownerId: 'demo_admin_uid',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
      }
    ]
  };

  localStorage.setItem('fuel_flow_demo_data', JSON.stringify(demoData));
  return demoData;
};

const saveDemoData = (data: any) => {
  localStorage.setItem('fuel_flow_demo_data', JSON.stringify(data));
};

let isFetchingBarrelsLock = false;

export const useDataStore = create<DataState>((set, get) => ({
  vehicles: [],
  drivers: [],
  tank: null,
  barrels: [],
  tankMovements: [],
  barrelMovements: [],
  fuelFills: [],
  notifications: [],
  revisions: [],
  repairs: [],
  loading: false,
  error: null,

  fetchDashboardData: async (ownerId) => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().fetchTank(ownerId),
        get().fetchBarrels(ownerId),
        get().fetchBarrelMovements(ownerId),
        get().fetchVehicles(ownerId),
        get().fetchDrivers(ownerId),
        get().fetchFuelFills(ownerId),
        get().fetchNotifications(ownerId),
        get().fetchRevisions(ownerId),
        get().fetchRepairs(ownerId),
        get().fetchTankMovements(ownerId)
      ]);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // Vehicles
  fetchVehicles: async (ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      set({ vehicles: demo.vehicles });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', ownerId)
        .order('plate_number');

      if (error) throw error;
      
      const mapped: Vehicle[] = (data || []).map(v => ({
        id: v.id,
        plateNumber: v.plate_number,
        brand: v.brand,
        model: v.model,
        type: v.type,
        year: v.year,
        currentMileage: Number(v.current_mileage),
        avgConsumption: Number(v.avg_consumption),
        status: v.status,
        photoUrl: v.photo_url,
        driverId: v.driver_id,
        ownerId: v.owner_id
      }));

      set({ vehicles: mapped });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addVehicle: async (vehicle) => {
    const ownerId = vehicle.ownerId;
    const newId = vehicle.id || generateUUID();

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      const newVeh: Vehicle = {
        ...vehicle,
        id: newId,
        currentMileage: Number(vehicle.currentMileage),
        avgConsumption: Number(vehicle.avgConsumption),
      };
      demo.vehicles.push(newVeh);
      saveDemoData(demo);
      set({ vehicles: [...demo.vehicles] });
      return;
    }

    try {
      const payload = {
        id: newId,
        plate_number: vehicle.plateNumber,
        brand: vehicle.brand,
        model: vehicle.model,
        type: vehicle.type,
        year: vehicle.year,
        current_mileage: vehicle.currentMileage,
        avg_consumption: vehicle.avgConsumption,
        status: vehicle.status,
        photo_url: vehicle.photoUrl || null,
        driver_id: vehicle.driverId || null,
        owner_id: vehicle.ownerId,
      };

      const { error } = await supabase.from('vehicles').insert(payload);
      if (error) throw error;
      await get().fetchVehicles(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateVehicle: async (vehicle) => {
    const ownerId = vehicle.ownerId;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.vehicles = demo.vehicles.map((v: any) => v.id === vehicle.id ? vehicle : v);
      saveDemoData(demo);
      set({ vehicles: [...demo.vehicles] });
      return;
    }

    try {
      const payload = {
        plate_number: vehicle.plateNumber,
        brand: vehicle.brand,
        model: vehicle.model,
        type: vehicle.type,
        year: vehicle.year,
        current_mileage: vehicle.currentMileage,
        avg_consumption: vehicle.avgConsumption,
        status: vehicle.status,
        photo_url: vehicle.photoUrl || null,
        driver_id: vehicle.driverId || null,
      };

      const { error } = await supabase.from('vehicles').update(payload).eq('id', vehicle.id);
      if (error) throw error;
      await get().fetchVehicles(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteVehicle: async (vehicleId, ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.vehicles = demo.vehicles.filter((v: any) => v.id !== vehicleId);
      saveDemoData(demo);
      set({ vehicles: [...demo.vehicles] });
      return;
    }

    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) throw error;
      await get().fetchVehicles(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  // Drivers
  fetchDrivers: async (ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      set({ drivers: demo.drivers });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('owner_id', ownerId)
        .order('full_name');

      if (error) throw error;

      const mapped: Driver[] = (data || []).map(d => ({
        id: d.id,
        fullName: d.full_name,
        phone: d.phone,
        cin: d.cin,
        licenseNumber: d.license_number,
        photoUrl: d.photo_url,
        status: d.status,
        ownerId: d.owner_id
      }));

      set({ drivers: mapped });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addDriver: async (driver) => {
    const ownerId = driver.ownerId;
    const newId = driver.id || generateUUID();

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      const newDrv: Driver = {
        ...driver,
        id: newId
      };
      demo.drivers.push(newDrv);
      saveDemoData(demo);
      set({ drivers: [...demo.drivers] });
      return;
    }

    try {
      const payload = {
        id: newId,
        full_name: driver.fullName,
        phone: driver.phone,
        cin: driver.cin,
        license_number: driver.licenseNumber,
        photo_url: driver.photoUrl || null,
        status: driver.status,
        owner_id: driver.ownerId,
      };

      const { error } = await supabase.from('drivers').insert(payload);
      if (error) throw error;
      await get().fetchDrivers(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateDriver: async (driver) => {
    const ownerId = driver.ownerId;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.drivers = demo.drivers.map((d: any) => d.id === driver.id ? driver : d);
      saveDemoData(demo);
      set({ drivers: [...demo.drivers] });
      return;
    }

    try {
      const payload = {
        full_name: driver.fullName,
        phone: driver.phone,
        cin: driver.cin,
        license_number: driver.licenseNumber,
        photo_url: driver.photoUrl || null,
        status: driver.status,
      };

      const { error } = await supabase.from('drivers').update(payload).eq('id', driver.id);
      if (error) throw error;
      await get().fetchDrivers(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteDriver: async (driverId, ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.drivers = demo.drivers.filter((d: any) => d.id !== driverId);
      saveDemoData(demo);
      set({ drivers: [...demo.drivers] });
      return;
    }

    try {
      const { error } = await supabase.from('drivers').delete().eq('id', driverId);
      if (error) throw error;
      await get().fetchDrivers(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  // Tank
  fetchTank: async (ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      set({ tank: demo.tank });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tanks')
        .select('*')
        .eq('owner_id', ownerId)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const tankDoc = data[0];
        set({
          tank: {
            id: tankDoc.id,
            capacity: Number(tankDoc.capacity),
            currentVolume: Number(tankDoc.current_volume),
            alertThreshold: Number(tankDoc.alert_threshold),
            ownerId: tankDoc.owner_id
          }
        });
      } else {
        // Create default tank if none exists
        const defaultTankPayload = {
          id: generateUUID(),
          capacity: 10000,
          current_volume: 5000,
          alert_threshold: 2000,
          owner_id: ownerId
        };
        const { error: insError } = await supabase.from('tanks').insert(defaultTankPayload);
        if (!insError) {
          set({
            tank: {
              id: defaultTankPayload.id,
              capacity: defaultTankPayload.capacity,
              currentVolume: defaultTankPayload.current_volume,
              alertThreshold: defaultTankPayload.alert_threshold,
              ownerId: defaultTankPayload.owner_id
            }
          });
        }
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateTank: async (tank) => {
    const ownerId = tank.ownerId;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.tank = tank;
      saveDemoData(demo);
      set({ tank });
      return;
    }

    try {
      const payload = {
        capacity: tank.capacity,
        current_volume: tank.currentVolume,
        alert_threshold: tank.alertThreshold,
      };

      const { error } = await supabase.from('tanks').update(payload).eq('id', tank.id);
      if (error) throw error;
      set({ tank });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteTank: async (tankId, ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.tank = null;
      saveDemoData(demo);
      set({ tank: null });
      return;
    }

    try {
      const { error } = await supabase.from('tanks').delete().eq('id', tankId);
      if (error) throw error;
      set({ tank: null });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  refillTank: async ({ tankId, quantity, supplier, price, notes, performedBy, ownerId }) => {
    const nowStr = new Date().toISOString();
    const movId = generateUUID();

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.tank.currentVolume = Math.min(demo.tank.capacity, demo.tank.currentVolume + quantity);
      
      const newMov = {
        id: movId,
        tankId,
        type: 'refill' as const,
        quantity,
        supplier,
        price,
        notes,
        performedBy,
        ownerId,
        createdAt: nowStr
      };

      demo.fuelFills.unshift({
        id: generateUUID(),
        vehicleId: 'demo_veh_1',
        driverId: 'demo_drv_1',
        quantity: -quantity, // Represent refill as negative fill for stats if needed
        mileage: 0,
        notes: `Remplissage citerne: ${supplier || ''}`,
        performedBy,
        ownerId,
        createdAt: nowStr
      } as any);

      saveDemoData(demo);
      set({ tank: demo.tank });
      return;
    }

    try {
      const movementPayload: any = {
        id: movId,
        tank_id: tankId,
        type: 'refill',
        quantity,
        supplier: supplier || null,
        price: price || null,
        notes: notes || null,
        performed_by: performedBy,
        owner_id: ownerId,
        created_at: nowStr,
      };

      let { error: movError } = await supabase.from('tank_movements').insert(movementPayload);
      if (movError && (movError.message?.includes('performed_by_fkey') || movError.code === '23503')) {
        movementPayload.performed_by = ownerId;
        const retry1 = await supabase.from('tank_movements').insert(movementPayload);
        if (retry1.error) {
          movementPayload.performed_by = null;
          const retry2 = await supabase.from('tank_movements').insert(movementPayload);
          movError = retry2.error;
        } else {
          movError = null;
        }
      }

      if (movError) throw movError;

      // Update current tank volume
      const currentTank = get().tank;
      if (currentTank) {
        const newVolume = Math.min(currentTank.capacity, currentTank.currentVolume + quantity);
        const { error: tankError } = await supabase
          .from('tanks')
          .update({ current_volume: newVolume })
          .eq('id', tankId);
        
        if (tankError) throw tankError;
        set({ tank: { ...currentTank, currentVolume: newVolume } });
      }

      await get().fetchTankMovements(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchTankMovements: async (ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      set({ tankMovements: demo.tankMovements || [] });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tank_movements')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedMovements: TankMovement[] = data.map((d: any) => ({
          id: d.id,
          tankId: d.tank_id,
          type: d.type,
          quantity: Math.abs(Number(d.quantity)),
          supplier: d.supplier || undefined,
          price: d.price ? Number(d.price) : undefined,
          notes: d.notes || undefined,
          performedBy: d.performed_by,
          ownerId: d.owner_id,
          createdAt: d.created_at
        }));
        set({ tankMovements: mappedMovements });
      }
    } catch (err: any) {
      console.error('Error fetching tank movements:', err);
    }
  },

  fetchBarrels: async (ownerId) => {
    if (isFetchingBarrelsLock) return;
    isFetchingBarrelsLock = true;
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      const uniqueBarrels = (demo.barrels || []).filter(
        (v: any, i: number, a: any[]) => a.findIndex((t: any) => t.id === v.id) === i
      );
      set({ barrels: uniqueBarrels });
      isFetchingBarrelsLock = false;
      return;
    }

    try {
      const { data, error } = await supabase
        .from('barrels')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name');

      if (error) throw error;

      const mapped: Barrel[] = (data || []).map(b => ({
        id: b.id,
        name: b.name,
        type: b.type,
        capacity: Number(b.capacity),
        currentVolume: Number(b.current_volume),
        alertThreshold: Number(b.alert_threshold),
        unit: b.unit || 'L',
        ownerId: b.owner_id
      })).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

      // Seed default barrels if they are missing
      const hasHydro = mapped.some(b => b.type === 'hydraulique');
      const hasMotor = mapped.some(b => b.type === 'motor_oil');

      if (!hasHydro || !hasMotor) {
        const toInsert: any[] = [];
        if (!hasHydro) {
          toInsert.push({
            id: generateUUID(),
            name: 'Huile Hydraulique',
            type: 'hydraulique',
            capacity: 200,
            current_volume: 150,
            alert_threshold: 30,
            unit: 'L',
            owner_id: ownerId
          });
        }
        if (!hasMotor) {
          toInsert.push({
            id: generateUUID(),
            name: 'Huile Moteur',
            type: 'motor_oil',
            capacity: 200,
            current_volume: 120,
            alert_threshold: 30,
            unit: 'L',
            owner_id: ownerId
          });
        }

        const { error: insError } = await supabase.from('barrels').insert(toInsert);
        if (!insError) {
          // Re-fetch barrels immediately
          const { data: newData, error: newError } = await supabase
            .from('barrels')
            .select('*')
            .eq('owner_id', ownerId)
            .order('name');

          if (!newError && newData) {
            const newMapped: Barrel[] = newData.map(b => ({
              id: b.id,
              name: b.name,
              type: b.type,
              capacity: Number(b.capacity),
              currentVolume: Number(b.current_volume),
              alertThreshold: Number(b.alert_threshold),
              unit: b.unit || 'L',
              ownerId: b.owner_id
            })).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            set({ barrels: newMapped });
            return;
          }
        }
      }

      set({ barrels: mapped });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      isFetchingBarrelsLock = false;
    }
  },

  addBarrel: async (barrel) => {
    const ownerId = barrel.ownerId;
    const newId = barrel.id || generateUUID();

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.barrels.push({ ...barrel, id: newId });
      saveDemoData(demo);
      set({ barrels: [...demo.barrels] });
      return;
    }

    try {
      const payload = {
        id: newId,
        name: barrel.name,
        type: barrel.type,
        capacity: barrel.capacity,
        current_volume: barrel.currentVolume,
        alert_threshold: barrel.alertThreshold,
        unit: barrel.unit || 'L',
        owner_id: barrel.ownerId,
      };

      const { error } = await supabase.from('barrels').insert(payload);
      if (error) throw error;
      
      isFetchingBarrelsLock = false;
      await get().fetchBarrels(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateBarrel: async (barrel) => {
    const ownerId = barrel.ownerId;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.barrels = demo.barrels.map((b: any) => b.id === barrel.id ? barrel : b);
      saveDemoData(demo);
      set({ barrels: [...demo.barrels] });
      return;
    }

    try {
      const payload = {
        name: barrel.name,
        type: barrel.type,
        capacity: barrel.capacity,
        current_volume: barrel.currentVolume,
        alert_threshold: barrel.alertThreshold,
        unit: barrel.unit || 'L',
      };

      const { error } = await supabase.from('barrels').update(payload).eq('id', barrel.id);
      if (error) throw error;
      
      isFetchingBarrelsLock = false;
      await get().fetchBarrels(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteBarrel: async (barrelId, ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.barrels = demo.barrels.filter((b: any) => b.id !== barrelId);
      saveDemoData(demo);
      set({ barrels: [...demo.barrels] });
      return;
    }

    try {
      const { error } = await supabase.from('barrels').delete().eq('id', barrelId);
      if (error) throw error;
      
      isFetchingBarrelsLock = false;
      await get().fetchBarrels(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchBarrelMovements: async (ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      set({ barrelMovements: demo.barrelMovements || [] });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('barrel_movements')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: BarrelMovement[] = (data || []).map(m => ({
        id: m.id,
        barrelId: m.barrel_id,
        type: m.type as 'refill' | 'consume',
        quantity: Number(m.quantity),
        supplier: m.supplier,
        price: m.price ? Number(m.price) : undefined,
        notes: m.notes,
        performedBy: m.performed_by,
        vehicleId: m.vehicle_id,
        ownerId: m.owner_id,
        createdAt: m.created_at
      }));

      set({ barrelMovements: mapped });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  refillBarrel: async ({ barrelId, quantity, supplier, price, notes, performedBy, ownerId }) => {
    const nowStr = new Date().toISOString();
    const movId = generateUUID();

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.barrels = demo.barrels.map((b: any) => {
        if (b.id === barrelId) {
          const newVol = Math.min(b.capacity, b.currentVolume + quantity);
          return { ...b, currentVolume: newVol };
        }
        return b;
      });

      const newMov: BarrelMovement = {
        id: movId,
        barrelId,
        type: 'refill',
        quantity,
        supplier,
        price,
        notes,
        performedBy,
        ownerId,
        createdAt: nowStr
      };
      
      demo.barrelMovements = demo.barrelMovements || [];
      demo.barrelMovements.unshift(newMov);
      saveDemoData(demo);
      set({ barrels: demo.barrels, barrelMovements: demo.barrelMovements });
      return;
    }

    try {
      const movementPayload: any = {
        id: movId,
        barrel_id: barrelId,
        type: 'refill',
        quantity,
        supplier: supplier || null,
        price: price || null,
        notes: notes || null,
        performed_by: performedBy,
        owner_id: ownerId,
        created_at: nowStr,
      };

      let { error: movError } = await supabase.from('barrel_movements').insert(movementPayload);
      if (movError && (movError.message?.includes('performed_by_fkey') || movError.code === '23503')) {
        movementPayload.performed_by = ownerId;
        const retry1 = await supabase.from('barrel_movements').insert(movementPayload);
        if (retry1.error) {
          movementPayload.performed_by = null;
          const retry2 = await supabase.from('barrel_movements').insert(movementPayload);
          movError = retry2.error;
        } else {
          movError = null;
        }
      }
      if (movError) throw movError;

      const { data: barrelDoc } = await supabase.from('barrels').select('current_volume, capacity').eq('id', barrelId).single();
      if (barrelDoc) {
        const newVol = Math.min(Number(barrelDoc.capacity), Number(barrelDoc.current_volume) + quantity);
        await supabase.from('barrels').update({ current_volume: newVol }).eq('id', barrelId);
      }

      await get().fetchBarrels(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  consumeFromBarrel: async ({ barrelId, quantity, notes, vehicleId, performedBy, ownerId, createdAt }) => {
    const nowStr = createdAt || new Date().toISOString();
    const movId = generateUUID();

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      let alertTriggered = false;
      let barrelName = '';

      demo.barrels = demo.barrels.map((b: any) => {
        if (b.id === barrelId) {
          const newVol = Math.max(0, b.currentVolume - quantity);
          barrelName = b.name;
          if (newVol <= b.alertThreshold && b.currentVolume > b.alertThreshold) {
            alertTriggered = true;
          }
          return { ...b, currentVolume: newVol };
        }
        return b;
      });

      const newMov: BarrelMovement = {
        id: movId,
        barrelId,
        type: 'consume',
        quantity,
        notes,
        performedBy,
        vehicleId,
        ownerId,
        createdAt: nowStr
      };

      demo.barrelMovements = demo.barrelMovements || [];
      demo.barrelMovements.unshift(newMov);

      if (alertTriggered) {
        demo.notifications.unshift({
          id: generateUUID(),
          title: 'Stock critique baril',
          message: `Le baril ${barrelName} a atteint son seuil d'alerte.`,
          type: 'low_stock',
          isRead: false,
          ownerId,
          createdAt: nowStr
        });
      }

      saveDemoData(demo);
      set({ 
        barrels: demo.barrels, 
        barrelMovements: demo.barrelMovements,
        notifications: demo.notifications 
      });
      return;
    }

    try {
      const movementPayload: any = {
        id: movId,
        barrel_id: barrelId,
        type: 'consume',
        quantity,
        notes: notes || null,
        performed_by: performedBy,
        vehicle_id: vehicleId || null,
        owner_id: ownerId,
        created_at: nowStr,
      };

      let { error: movError } = await supabase.from('barrel_movements').insert(movementPayload);
      if (movError && (movError.message?.includes('performed_by_fkey') || movError.code === '23503')) {
        movementPayload.performed_by = ownerId;
        const retry1 = await supabase.from('barrel_movements').insert(movementPayload);
        if (retry1.error) {
          movementPayload.performed_by = null;
          const retry2 = await supabase.from('barrel_movements').insert(movementPayload);
          movError = retry2.error;
        } else {
          movError = null;
        }
      }
      if (movError) throw movError;

      const { data: barrelDoc } = await supabase.from('barrels').select('*').eq('id', barrelId).single();
      if (barrelDoc) {
        const newVol = Math.max(0, Number(barrelDoc.current_volume) - quantity);
        await supabase.from('barrels').update({ current_volume: newVol }).eq('id', barrelId);

        // Check for low stock trigger
        if (newVol <= Number(barrelDoc.alert_threshold) && Number(barrelDoc.current_volume) > Number(barrelDoc.alert_threshold)) {
          await get().sendNotification({
            ownerId,
            type: 'low_stock',
            title: 'Stock critique baril',
            message: `Le baril ${barrelDoc.name} a atteint son seuil d'alerte.`,
          });
        }
      }

      // Also trigger a notification for the manager
      await get().sendNotification({
        ownerId,
        type: 'barrel_consumption',
        title: 'Consommation d\'huile',
        message: `Consommation de ${quantity}L enregistrée. Rempli par: ${performedBy}.`,
      });

      await get().fetchBarrels(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  // Fuel Fills
  fetchFuelFills: async (ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      set({ fuelFills: demo.fuelFills });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('fuel_fills')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: FuelFill[] = (data || []).map(f => {
        const rawNotes = f.notes || '';
        const isPending = f.status === 'pending' || rawNotes.includes('[STATUS:pending]');
        const cleanNotes = rawNotes.replace('[STATUS:pending]', '').trim() || undefined;

        return {
          id: f.id,
          vehicleId: f.vehicle_id,
          driverId: f.driver_id,
          quantity: Number(f.quantity),
          mileage: Number(f.mileage),
          distanceTraveled: f.distance_traveled ? Number(f.distance_traveled) : undefined,
          calculatedConsumption: f.calculated_consumption ? Number(f.calculated_consumption) : undefined,
          anomalyDetected: f.anomaly_detected || false,
          anomalyType: f.anomaly_type,
          notes: cleanNotes,
          photoUrl: f.photo_url,
          performedBy: f.performed_by,
          ownerId: f.owner_id,
          createdAt: f.created_at,
          status: isPending ? 'pending' : 'confirmed',
          validatedAt: f.validated_at,
          validatedBy: f.validated_by,
        };
      });

      set({ fuelFills: mapped });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addFuelFill: async ({ vehicleId, driverId, quantity, mileage, notes, photoUrl, performedBy, ownerId, createdAt }) => {
    const nowStr = createdAt || new Date().toISOString();
    const fillId = generateUUID();
    const isAgent = performedBy !== ownerId;
    const initialStatus: 'pending' | 'confirmed' = isAgent ? 'pending' : 'confirmed';
    const storedNotes = isAgent 
      ? `[STATUS:pending] ${notes || ''}`.trim() 
      : (notes?.trim() || null);

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      
      // Update vehicle mileage only if Admin, or wait for admin review if agent
      if (initialStatus === 'confirmed') {
        demo.vehicles = demo.vehicles.map((v: any) => {
          if (v.id === vehicleId) {
            return { ...v, currentMileage: mileage };
          }
          return v;
        });
      }

      // Always immediately deduct from physical tank stock
      if (demo.tank) {
        demo.tank.currentVolume = Math.max(0, demo.tank.currentVolume - quantity);
      }

      const newFill: FuelFill = {
        id: fillId,
        vehicleId,
        driverId,
        quantity,
        mileage,
        distanceTraveled: 350,
        calculatedConsumption: 7.2,
        anomalyDetected: false,
        notes: notes?.trim() || undefined,
        photoUrl,
        performedBy,
        ownerId,
        createdAt: nowStr,
        status: initialStatus,
      };

      demo.fuelFills.unshift(newFill);
      saveDemoData(demo);
      set({ 
        fuelFills: demo.fuelFills, 
        vehicles: demo.vehicles,
        tank: demo.tank 
      });
      return;
    }

    try {
      // Calculate distance traveled and average consumption based on previous fill
      const { data: prevFills } = await supabase
        .from('fuel_fills')
        .select('mileage')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(1);

      let distanceTraveled: number | undefined;
      let calculatedConsumption: number | undefined;
      let anomalyDetected = false;
      let anomalyType: string | undefined;

      if (prevFills && prevFills.length > 0) {
        const prevMileage = Number(prevFills[0].mileage);
        if (mileage > prevMileage) {
          distanceTraveled = mileage - prevMileage;
          calculatedConsumption = (quantity / distanceTraveled) * 100;

          const { data: vehDoc } = await supabase.from('vehicles').select('avg_consumption').eq('id', vehicleId).single();
          if (vehDoc && vehDoc.avg_consumption) {
            const avg = Number(vehDoc.avg_consumption);
            if (calculatedConsumption > avg * 1.5) {
              anomalyDetected = true;
              anomalyType = 'Surconsommation';
            }
          }
        } else if (mileage < prevMileage) {
          anomalyDetected = true;
          anomalyType = 'Kilométrage invalide';
        }
      }

      let safePerformedBy: string | null = performedBy;
      if (safePerformedBy) {
        try {
          const { data: prof } = await supabase.from('profiles').select('id').eq('id', safePerformedBy).maybeSingle();
          if (!prof) {
            const { data: ownerProf } = await supabase.from('profiles').select('id').eq('id', ownerId).maybeSingle();
            safePerformedBy = ownerProf ? ownerId : null;
          }
        } catch (_) {
          safePerformedBy = null;
        }
      }

      const payload: any = {
        id: fillId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        quantity,
        mileage,
        distance_traveled: distanceTraveled || null,
        calculated_consumption: calculatedConsumption || null,
        anomaly_detected: anomalyDetected,
        anomaly_type: anomalyType || null,
        notes: storedNotes,
        photo_url: photoUrl || null,
        performed_by: safePerformedBy,
        owner_id: ownerId,
        created_at: nowStr,
        status: initialStatus,
      };

      let { error } = await supabase.from('fuel_fills').insert(payload);
      if (error && (error.message?.includes('status') || error.code === '42703')) {
        delete payload.status;
        const retry = await supabase.from('fuel_fills').insert(payload);
        error = retry.error;
      }

      if (error && (error.message?.includes('performed_by_fkey') || error.code === '23503' || error.message?.includes('foreign key constraint'))) {
        payload.performed_by = ownerId;
        const retry1 = await supabase.from('fuel_fills').insert(payload);
        if (retry1.error) {
          payload.performed_by = null;
          const retry2 = await supabase.from('fuel_fills').insert(payload);
          error = retry2.error;
        } else {
          error = null;
        }
      }
      if (error) throw error;

      // 1. Immediately deduct the quantity from the physical Citerne stock
      const currentTank = get().tank;
      if (currentTank) {
        const newVolume = Math.max(0, currentTank.currentVolume - quantity);
        await supabase.from('tanks').update({ current_volume: newVolume }).eq('id', currentTank.id);
        set({ tank: { ...currentTank, currentVolume: newVolume } });
        
        if (newVolume <= currentTank.alertThreshold && currentTank.currentVolume > currentTank.alertThreshold) {
          await get().sendNotification({
            ownerId,
            type: 'low_stock',
            title: 'Stock Citerne Critique',
            message: `Le niveau de la citerne de gasoil est bas (${newVolume}L restant).`,
          });
        }
      }

      // 2. If entered by Admin, immediately update vehicle mileage
      if (initialStatus === 'confirmed') {
        await supabase.from('vehicles').update({ current_mileage: mileage }).eq('id', vehicleId);
      } else {
        // Send high priority notification to Admin about the pending fuel fill
        await get().sendNotification({
          ownerId,
          type: 'fuel_fill_pending',
          title: '⚡ Plein en attente de validation',
          message: `L'agent a saisi un plein de ${quantity}L (${mileage} km). Quantité déduite de la citerne. En attente de validation du compteur.`,
        });
      }

      await get().fetchFuelFills(ownerId);
      await get().fetchTank(ownerId);
      await get().fetchVehicles(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  confirmFuelFill: async (fillId, ownerId) => {
    const fills = get().fuelFills;
    const target = fills.find(f => f.id === fillId);
    if (!target) return;

    const nowStr = new Date().toISOString();
    const cleanNotes = (target.notes || '').replace('[STATUS:pending]', '').trim() || null;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.fuelFills = (demo.fuelFills || []).map((f: any) => {
        if (f.id === fillId) {
          return { ...f, status: 'confirmed', notes: target.notes, validatedAt: nowStr, validatedBy: ownerId };
        }
        return f;
      });

      // Finalize vehicle mileage upon Admin confirmation
      demo.vehicles = (demo.vehicles || []).map((v: any) => {
        if (v.id === target.vehicleId) {
          return { ...v, currentMileage: target.mileage };
        }
        return v;
      });

      saveDemoData(demo);
      set({ fuelFills: demo.fuelFills, vehicles: demo.vehicles, tank: demo.tank });
      return;
    }

    try {
      // 1. Update fuel_fill status & clean notes
      const payload: any = {
        notes: cleanNotes,
        status: 'confirmed',
        validated_at: nowStr,
        validated_by: ownerId
      };

      const { error: fillErr } = await supabase
        .from('fuel_fills')
        .update(payload)
        .eq('id', fillId);

      if (fillErr && (fillErr.message.includes('status') || fillErr.code === '42703')) {
        await supabase.from('fuel_fills').update({ notes: cleanNotes }).eq('id', fillId);
      }

      // 2. Finalize vehicle mileage
      await supabase.from('vehicles').update({ current_mileage: target.mileage }).eq('id', target.vehicleId);

      await get().fetchFuelFills(ownerId);
      await get().fetchTank(ownerId);
      await get().fetchVehicles(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateFuelFill: async (updatedFill) => {
    const ownerId = updatedFill.ownerId;
    const oldFill = get().fuelFills.find(f => f.id === updatedFill.id);
    const oldQuantity = oldFill ? oldFill.quantity : updatedFill.quantity;
    const nowStr = new Date().toISOString();
    const cleanNotes = (updatedFill.notes || '').replace('[STATUS:pending]', '').trim() || null;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.fuelFills = (demo.fuelFills || []).map((f: any) => {
        if (f.id === updatedFill.id) {
          return { ...f, ...updatedFill, status: 'confirmed', notes: updatedFill.notes, validatedAt: nowStr, validatedBy: ownerId };
        }
        return f;
      });

      // Update vehicle mileage
      demo.vehicles = (demo.vehicles || []).map((v: any) => {
        if (v.id === updatedFill.vehicleId) {
          return { ...v, currentMileage: updatedFill.mileage };
        }
        return v;
      });

      // Adjust tank volume by the difference: newQuantity vs oldQuantity
      if (demo.tank) {
        const diff = updatedFill.quantity - oldQuantity;
        demo.tank.currentVolume = Math.max(0, Math.min(demo.tank.capacity, demo.tank.currentVolume - diff));
      }

      saveDemoData(demo);
      set({ fuelFills: demo.fuelFills, vehicles: demo.vehicles, tank: demo.tank });
      return;
    }

    try {
      const payload: any = {
        vehicle_id: updatedFill.vehicleId,
        driver_id: updatedFill.driverId,
        quantity: updatedFill.quantity,
        mileage: updatedFill.mileage,
        notes: cleanNotes,
        status: 'confirmed',
        validated_at: nowStr,
        validated_by: ownerId,
      };

      const { error } = await supabase.from('fuel_fills').update(payload).eq('id', updatedFill.id);
      if (error && (error.message.includes('status') || error.code === '42703')) {
        delete payload.status;
        delete payload.validated_at;
        delete payload.validated_by;
        await supabase.from('fuel_fills').update(payload).eq('id', updatedFill.id);
      }

      // Update vehicle mileage
      await supabase.from('vehicles').update({ current_mileage: updatedFill.mileage }).eq('id', updatedFill.vehicleId);

      // Adjust tank volume by the difference
      const currentTank = get().tank;
      if (currentTank) {
        const diff = updatedFill.quantity - oldQuantity;
        if (diff !== 0) {
          const newVolume = Math.max(0, Math.min(currentTank.capacity, currentTank.currentVolume - diff));
          await supabase.from('tanks').update({ current_volume: newVolume }).eq('id', currentTank.id);
          set({ tank: { ...currentTank, currentVolume: newVolume } });
        }
      }

      await get().fetchFuelFills(ownerId);
      await get().fetchTank(ownerId);
      await get().fetchVehicles(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteFuelFill: async (fillId, ownerId) => {
    const target = get().fuelFills.find(f => f.id === fillId);
    if (!target) return;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.fuelFills = (demo.fuelFills || []).filter((f: any) => f.id !== fillId);
      
      // Restore quantity back to tank
      if (demo.tank) {
        demo.tank.currentVolume = Math.min(demo.tank.capacity, demo.tank.currentVolume + target.quantity);
      }

      saveDemoData(demo);
      set({ fuelFills: demo.fuelFills, tank: demo.tank });
      return;
    }

    try {
      const { error } = await supabase.from('fuel_fills').delete().eq('id', fillId);
      if (error) throw error;

      // Restore quantity back to tank
      const currentTank = get().tank;
      if (currentTank) {
        const newVolume = Math.min(currentTank.capacity, currentTank.currentVolume + target.quantity);
        await supabase.from('tanks').update({ current_volume: newVolume }).eq('id', currentTank.id);
        set({ tank: { ...currentTank, currentVolume: newVolume } });
      }

      await get().fetchFuelFills(ownerId);
      await get().fetchTank(ownerId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  // Notifications
  fetchNotifications: async (ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      set({ notifications: demo.notifications });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: AppNotification[] = (data || []).map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read || false,
        ownerId: n.owner_id,
        createdAt: n.created_at
      }));

      set({ notifications: mapped });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  markNotificationAsRead: async (id) => {
    // Check if demo mode
    const isDemo = get().vehicles.length > 0 && get().vehicles[0].ownerId === 'demo_admin_uid';

    if (isDemo) {
      const demo = getDemoData();
      demo.notifications = demo.notifications.map((n: any) => n.id === id ? { ...n, isRead: true } : n);
      saveDemoData(demo);
      set({ notifications: demo.notifications });
      return;
    }

    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
      set({
        notifications: get().notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  markAllNotificationsAsRead: async (ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.notifications = demo.notifications.map((n: any) => ({ ...n, isRead: true }));
      saveDemoData(demo);
      set({ notifications: demo.notifications });
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('owner_id', ownerId)
        .eq('is_read', false);

      if (error) throw error;
      set({
        notifications: get().notifications.map(n => ({ ...n, isRead: true }))
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  sendNotification: async ({ ownerId, type, title, message }) => {
    const nowStr = new Date().toISOString();
    const id = generateUUID();

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.notifications.unshift({
        id,
        ownerId,
        type,
        title,
        message,
        isRead: false,
        createdAt: nowStr
      });
      saveDemoData(demo);
      set({ notifications: demo.notifications });
      return;
    }

    try {
      const payload = {
        id,
        owner_id: ownerId,
        type,
        title,
        message,
        is_read: false,
        created_at: nowStr,
      };

      const { error } = await supabase.from('notifications').insert(payload);
      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to send notification:', err);
    }
  },

  // Revisions
  fetchRevisions: async (ownerId) => {
    const vehs = get().vehicles;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      const demoVehs = demo.vehicles || vehs;
      const computed = (demo.revisions || []).map((r: Revision) => {
        let v = demoVehs.find((veh: Vehicle) => veh.id === r.vehicleId);
        if (!v && demoVehs.length > 0) {
          v = demoVehs[0];
          r.vehicleId = v.id;
        }
        let status = r.status;
        if (r.mode === 'days' && r.nextDueDate) {
          const diffDays = Math.ceil((new Date(r.nextDueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          if (diffDays < 0) status = 'overdue';
          else if (diffDays <= 15) status = 'due_soon';
          else status = 'up_to_date';
        } else if (r.mode === 'mileage' && r.nextDueKm && v) {
          const diffKm = r.nextDueKm - v.currentMileage;
          if (diffKm < 0) status = 'overdue';
          else if (diffKm <= 1000) status = 'due_soon';
          else status = 'up_to_date';
        }
        return { ...r, status };
      });
      set({ revisions: computed });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('revisions')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase revisions fetch notice:', error.message);
        const demo = getDemoData();
        const computed = (demo.revisions || []).map((r: Revision) => {
          let v = vehs.find((veh: Vehicle) => veh.id === r.vehicleId);
          if (!v && vehs.length > 0) {
            v = vehs[0];
            r.vehicleId = v.id;
          }
          let status = r.status;
          if (r.mode === 'days' && r.nextDueDate) {
            const diffDays = Math.ceil((new Date(r.nextDueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            if (diffDays < 0) status = 'overdue';
            else if (diffDays <= 15) status = 'due_soon';
            else status = 'up_to_date';
          } else if (r.mode === 'mileage' && r.nextDueKm && v) {
            const diffKm = r.nextDueKm - (v ? v.currentMileage : 0);
            if (diffKm < 0) status = 'overdue';
            else if (diffKm <= 1000) status = 'due_soon';
            else status = 'up_to_date';
          }
          return { ...r, status };
        });
        set({ revisions: computed });
        return;
      }

      const mapped: Revision[] = (data || []).map(r => {
        let v = vehs.find(veh => veh.id === r.vehicle_id);
        if (!v && vehs.length > 0) v = vehs[0];
        let status: 'up_to_date' | 'due_soon' | 'overdue' = r.status || 'up_to_date';
        if (r.mode === 'days' && r.next_due_date) {
          const diffDays = Math.ceil((new Date(r.next_due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          if (diffDays < 0) status = 'overdue';
          else if (diffDays <= 15) status = 'due_soon';
          else status = 'up_to_date';
        } else if (r.mode === 'mileage' && r.next_due_km && v) {
          const diffKm = r.next_due_km - v.currentMileage;
          if (diffKm < 0) status = 'overdue';
          else if (diffKm <= 1000) status = 'due_soon';
          else status = 'up_to_date';
        }

        return {
          id: r.id,
          vehicleId: r.vehicle_id || (v ? v.id : ''),
          type: r.type,
          mode: r.mode,
          intervalDays: r.interval_days ? Number(r.interval_days) : undefined,
          lastDate: r.last_date,
          nextDueDate: r.next_due_date,
          intervalKm: r.interval_km ? Number(r.interval_km) : undefined,
          lastKm: r.last_km ? Number(r.last_km) : undefined,
          nextDueKm: r.next_due_km ? Number(r.next_due_km) : undefined,
          cost: r.cost ? Number(r.cost) : undefined,
          provider: r.provider,
          notes: r.notes,
          status,
          ownerId: r.owner_id,
          createdAt: r.created_at
        };
      });

      set({ revisions: mapped });
    } catch (err: any) {
      console.warn('Fallback to demo revisions:', err.message);
      const demo = getDemoData();
      set({ revisions: demo.revisions || [] });
    }
  },

  addRevision: async (revisionData) => {
    const ownerId = revisionData.ownerId;
    const newId = revisionData.id || generateUUID();
    const nowStr = new Date().toISOString();

    let nextDueDate = revisionData.nextDueDate;
    let nextDueKm = revisionData.nextDueKm;

    if (revisionData.mode === 'days' && revisionData.lastDate && revisionData.intervalDays) {
      const d = new Date(revisionData.lastDate);
      d.setDate(d.getDate() + Number(revisionData.intervalDays));
      nextDueDate = d.toISOString().split('T')[0];
    } else if (revisionData.mode === 'mileage' && revisionData.lastKm !== undefined && revisionData.intervalKm) {
      nextDueKm = Number(revisionData.lastKm) + Number(revisionData.intervalKm);
    }

    const newRev: Revision = {
      ...revisionData,
      id: newId,
      nextDueDate,
      nextDueKm,
      status: 'up_to_date',
      createdAt: nowStr,
    };

    // Update state IMMEDIATELY for instant UI response
    const currentRevisions = get().revisions;
    set({ revisions: [newRev, ...currentRevisions] });

    // Always update demo localstorage as fallback
    const demo = getDemoData();
    demo.revisions = demo.revisions || [];
    demo.revisions.unshift(newRev);
    saveDemoData(demo);

    if (ownerId === 'demo_admin_uid') {
      return;
    }

    try {
      const isUUID = (str?: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const safeVehId = isUUID(revisionData.vehicleId) ? revisionData.vehicleId : null;

      const payload: any = {
        id: isUUID(newId) ? newId : generateUUID(),
        vehicle_id: safeVehId,
        type: revisionData.type,
        mode: revisionData.mode,
        interval_days: revisionData.intervalDays || null,
        last_date: revisionData.lastDate || null,
        next_due_date: nextDueDate || null,
        interval_km: revisionData.intervalKm || null,
        last_km: revisionData.lastKm || null,
        next_due_km: nextDueKm || null,
        cost: revisionData.cost || 0,
        provider: revisionData.provider || null,
        notes: revisionData.notes || null,
        status: 'up_to_date',
        owner_id: ownerId,
        created_at: nowStr,
      };

      let { error } = await supabase.from('revisions').insert(payload);
      if (error) {
        console.warn('Supabase insert notice:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase insert exception:', err.message);
    }
  },

  updateRevision: async (revision) => {
    const ownerId = revision.ownerId;

    let nextDueDate = revision.nextDueDate;
    let nextDueKm = revision.nextDueKm;

    if (revision.mode === 'days' && revision.lastDate && revision.intervalDays) {
      const d = new Date(revision.lastDate);
      d.setDate(d.getDate() + Number(revision.intervalDays));
      nextDueDate = d.toISOString().split('T')[0];
    } else if (revision.mode === 'mileage' && revision.lastKm !== undefined && revision.intervalKm) {
      nextDueKm = Number(revision.lastKm) + Number(revision.intervalKm);
    }

    const updatedRev = { ...revision, nextDueDate, nextDueKm };

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.revisions = (demo.revisions || []).map((r: Revision) => 
        r.id === revision.id ? updatedRev : r
      );
      saveDemoData(demo);
      await get().fetchRevisions(ownerId);
      return;
    }

    try {
      const payload = {
        vehicle_id: revision.vehicleId,
        type: revision.type,
        mode: revision.mode,
        interval_days: revision.intervalDays || null,
        last_date: revision.lastDate || null,
        next_due_date: nextDueDate || null,
        interval_km: revision.intervalKm || null,
        last_km: revision.lastKm || null,
        next_due_km: nextDueKm || null,
        cost: revision.cost || 0,
        provider: revision.provider || null,
        notes: revision.notes || null,
      };

      const { error } = await supabase.from('revisions').update(payload).eq('id', revision.id);
      if (error) {
        if (error.message?.includes('schema cache') || error.code === 'PGRST204' || error.message?.includes('does not exist')) {
          const demo = getDemoData();
          demo.revisions = (demo.revisions || []).map((r: Revision) => r.id === revision.id ? updatedRev : r);
          saveDemoData(demo);
          set({ revisions: get().revisions.map(r => r.id === revision.id ? updatedRev : r) });
          return;
        }
        throw error;
      }
      await get().fetchRevisions(ownerId);
    } catch (err: any) {
      console.warn('Updating revision locally fallback:', err.message);
      const demo = getDemoData();
      demo.revisions = (demo.revisions || []).map((r: Revision) => r.id === revision.id ? updatedRev : r);
      saveDemoData(demo);
      set({ revisions: get().revisions.map(r => r.id === revision.id ? updatedRev : r) });
    }
  },

  deleteRevision: async (id, ownerId) => {
    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      demo.revisions = (demo.revisions || []).filter((r: Revision) => r.id !== id);
      saveDemoData(demo);
      await get().fetchRevisions(ownerId);
      return;
    }

    try {
      const { error } = await supabase.from('revisions').delete().eq('id', id);
      if (error) {
        if (error.message?.includes('schema cache') || error.code === 'PGRST204' || error.message?.includes('does not exist')) {
          const demo = getDemoData();
          demo.revisions = (demo.revisions || []).filter((r: Revision) => r.id !== id);
          saveDemoData(demo);
          set({ revisions: get().revisions.filter(r => r.id !== id) });
          return;
        }
        throw error;
      }
      await get().fetchRevisions(ownerId);
    } catch (err: any) {
      console.warn('Deleting revision locally fallback:', err.message);
      const demo = getDemoData();
      demo.revisions = (demo.revisions || []).filter((r: Revision) => r.id !== id);
      saveDemoData(demo);
      set({ revisions: get().revisions.filter(r => r.id !== id) });
    }
  },

  completeRevision: async (id, ownerId) => {
    const rev = get().revisions.find(r => r.id === id);
    if (!rev) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const vehicle = get().vehicles.find(v => v.id === rev.vehicleId);
    const currentKm = vehicle ? vehicle.currentMileage : (rev.lastKm || 0);

    if (rev.mode === 'days') {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + (rev.intervalDays || 30));
      const nextDueDateStr = nextDue.toISOString().split('T')[0];

      await get().updateRevision({
        ...rev,
        lastDate: todayStr,
        nextDueDate: nextDueDateStr,
        status: 'up_to_date'
      });
    } else {
      const nextDueKm = currentKm + (rev.intervalKm || 10000);

      await get().updateRevision({
        ...rev,
        lastKm: currentKm,
        nextDueKm: nextDueKm,
        status: 'up_to_date'
      });
    }
  },

  // Repairs Management
  fetchRepairs: async (ownerId) => {
    const vehs = get().vehicles;

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      const demoVehs = demo.vehicles || vehs;
      const computed = (demo.repairs || []).map((rep: Repair) => {
        let v = demoVehs.find((veh: Vehicle) => veh.id === rep.vehicleId);
        if (!v && demoVehs.length > 0) {
          v = demoVehs[0];
          rep.vehicleId = v.id;
        }
        return rep;
      });
      set({ repairs: computed });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('repairs')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase repairs fetch notice:', error.message);
        const demo = getDemoData();
        const computed = (demo.repairs || []).map((rep: Repair) => {
          let v = vehs.find((veh: Vehicle) => veh.id === rep.vehicleId);
          if (!v && vehs.length > 0) {
            v = vehs[0];
            rep.vehicleId = v.id;
          }
          return rep;
        });
        set({ repairs: computed });
        return;
      }

      const mapped: Repair[] = (data || []).map(r => {
        let v = vehs.find(veh => veh.id === r.vehicle_id);
        if (!v && vehs.length > 0) v = vehs[0];

        return {
          id: r.id,
          vehicleId: r.vehicle_id || (v ? v.id : ''),
          type: r.type,
          priority: r.priority,
          status: r.status,
          startDate: r.start_date,
          endDate: r.end_date,
          cost: r.cost ? Number(r.cost) : 0,
          provider: r.provider,
          description: r.description || '',
          partsReplaced: r.parts_replaced || '',
          ownerId: r.owner_id,
          createdAt: r.created_at
        };
      });

      set({ repairs: mapped });
    } catch (err: any) {
      console.warn('Fallback to demo repairs:', err.message);
      const demo = getDemoData();
      set({ repairs: demo.repairs || [] });
    }
  },

  addRepair: async (repairData) => {
    const ownerId = repairData.ownerId;
    const newId = repairData.id || generateUUID();
    const nowStr = new Date().toISOString();

    const isUUID = (str?: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const newRepair: Repair = {
      ...repairData,
      id: newId,
      createdAt: nowStr
    };

    // Update state IMMEDIATELY
    const currentRepairs = get().repairs;
    set({ repairs: [newRepair, ...currentRepairs] });

    // Always update demo localStorage as fallback
    const demo = getDemoData();
    demo.repairs = demo.repairs || [];
    demo.repairs.unshift(newRepair);
    saveDemoData(demo);

    if (ownerId === 'demo_admin_uid') {
      return;
    }

    try {
      const safeVehId = isUUID(repairData.vehicleId) ? repairData.vehicleId : null;

      const payload: any = {
        id: isUUID(newId) ? newId : generateUUID(),
        vehicle_id: safeVehId,
        type: repairData.type,
        priority: repairData.priority,
        status: repairData.status,
        start_date: repairData.startDate,
        end_date: repairData.endDate || null,
        cost: repairData.cost || 0,
        provider: repairData.provider || null,
        description: repairData.description || '',
        parts_replaced: repairData.partsReplaced || null,
        owner_id: ownerId,
        created_at: nowStr
      };

      const { error } = await supabase.from('repairs').insert(payload);
      if (error) {
        console.warn('Supabase repair insert notice:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase repair insert exception:', err.message);
    }
  },

  updateRepair: async (repair) => {
    const ownerId = repair.ownerId;
    const isUUID = (str?: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // Update local state IMMEDIATELY
    set({ repairs: get().repairs.map(r => r.id === repair.id ? repair : r) });

    const demo = getDemoData();
    demo.repairs = (demo.repairs || []).map((r: Repair) => r.id === repair.id ? repair : r);
    saveDemoData(demo);

    if (ownerId === 'demo_admin_uid') {
      return;
    }

    try {
      const safeVehId = isUUID(repair.vehicleId) ? repair.vehicleId : null;

      const payload: any = {
        vehicle_id: safeVehId,
        type: repair.type,
        priority: repair.priority,
        status: repair.status,
        start_date: repair.startDate,
        end_date: repair.endDate || null,
        cost: repair.cost || 0,
        provider: repair.provider || null,
        description: repair.description || '',
        parts_replaced: repair.partsReplaced || null,
      };

      const { error } = await supabase.from('repairs').update(payload).eq('id', repair.id);
      if (error) {
        console.warn('Supabase repair update notice:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase repair update exception:', err.message);
    }
  },

  deleteRepair: async (id, ownerId) => {
    // Update local state IMMEDIATELY
    set({ repairs: get().repairs.filter(r => r.id !== id) });

    const demo = getDemoData();
    demo.repairs = (demo.repairs || []).filter((r: Repair) => r.id !== id);
    saveDemoData(demo);

    if (ownerId === 'demo_admin_uid') {
      return;
    }

    try {
      const { error } = await supabase.from('repairs').delete().eq('id', id);
      if (error) {
        console.warn('Supabase repair delete notice:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase repair delete exception:', err.message);
    }
  },

  completeRepair: async (id, ownerId) => {
    const rep = get().repairs.find(r => r.id === id);
    if (!rep) return;
    const todayStr = new Date().toISOString().split('T')[0];

    await get().updateRepair({
      ...rep,
      status: 'completed',
      endDate: todayStr
    });
  }
}));
