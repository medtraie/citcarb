import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { 
  Vehicle, Driver, Tank, Barrel, 
  FuelFill, BarrelMovement, AppNotification 
} from '../types';

interface DataState {
  vehicles: Vehicle[];
  drivers: Driver[];
  tank: Tank | null;
  barrels: Barrel[];
  fuelFills: FuelFill[];
  barrelMovements: BarrelMovement[];
  notifications: AppNotification[];
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
  fuelFills: [],
  barrelMovements: [],
  notifications: [],
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
        get().fetchNotifications(ownerId)
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
    } catch (err: any) {
      set({ error: err.message });
      throw err;
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

      const mapped: FuelFill[] = (data || []).map(f => ({
        id: f.id,
        vehicleId: f.vehicle_id,
        driverId: f.driver_id,
        quantity: Number(f.quantity),
        mileage: Number(f.mileage),
        distanceTraveled: f.distance_traveled ? Number(f.distance_traveled) : undefined,
        calculatedConsumption: f.calculated_consumption ? Number(f.calculated_consumption) : undefined,
        anomalyDetected: f.anomaly_detected || false,
        anomalyType: f.anomaly_type,
        notes: f.notes,
        photoUrl: f.photo_url,
        performedBy: f.performed_by,
        ownerId: f.owner_id,
        createdAt: f.created_at
      }));

      set({ fuelFills: mapped });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addFuelFill: async ({ vehicleId, driverId, quantity, mileage, notes, photoUrl, performedBy, ownerId, createdAt }) => {
    const nowStr = createdAt || new Date().toISOString();
    const fillId = generateUUID();

    if (ownerId === 'demo_admin_uid') {
      const demo = getDemoData();
      
      // Update vehicle mileage
      demo.vehicles = demo.vehicles.map((v: any) => {
        if (v.id === vehicleId) {
          const oldMileage = v.currentMileage;
          const dist = mileage - oldMileage;
          const calculatedCons = dist > 0 ? (quantity / dist) * 100 : 0;
          return { ...v, currentMileage: mileage };
        }
        return v;
      });

      // Update tank volume
      demo.tank.currentVolume = Math.max(0, demo.tank.currentVolume - quantity);

      const newFill: FuelFill = {
        id: fillId,
        vehicleId,
        driverId,
        quantity,
        mileage,
        distanceTraveled: 350, // mock values
        calculatedConsumption: 7.2,
        anomalyDetected: false,
        notes,
        photoUrl,
        performedBy,
        ownerId,
        createdAt: nowStr
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

          // Check for anomaly (consumption > 150% of average)
          const { data: vehDoc } = await supabase.from('vehicles').select('avg_consumption').eq('id', vehicleId).single();
          if (vehDoc && vehDoc.avg_consumption) {
            const avg = Number(vehDoc.avg_consumption);
            if (calculatedConsumption > avg * 1.5) {
              anomalyDetected = true;
              anomalyType = 'Surconsommation';
            }
          }
        } else if (mileage < prevMileage) {
          // Mileage discrepancy anomaly
          anomalyDetected = true;
          anomalyType = 'Kilométrage invalide';
        }
      }

      // Ensure performed_by won't trigger FK violation in fuel_fills or database triggers
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
        notes: notes || null,
        photo_url: photoUrl || null,
        performed_by: safePerformedBy,
        owner_id: ownerId,
        created_at: nowStr,
      };

      let { error } = await supabase.from('fuel_fills').insert(payload);
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

      // Update vehicle mileage
      await supabase.from('vehicles').update({ current_mileage: mileage }).eq('id', vehicleId);

      // Decrement tank volume
      const currentTank = get().tank;
      if (currentTank) {
        const newVolume = Math.max(0, currentTank.currentVolume - quantity);
        await supabase.from('tanks').update({ current_volume: newVolume }).eq('id', currentTank.id);
        
        // Low Stock tank alert
        if (newVolume <= currentTank.alertThreshold && currentTank.currentVolume > currentTank.alertThreshold) {
          await get().sendNotification({
            ownerId,
            type: 'low_stock',
            title: 'Stock Citerne Critique',
            message: `Le niveau de la citerne de gasoil est bas (${newVolume}L restant).`,
          });
        }
      }

      if (anomalyDetected) {
        await get().sendNotification({
          ownerId,
          type: 'consumption_anomaly',
          title: 'Anomalie de Consommation',
          message: `Anomalie détectée sur le véhicule: ${anomalyType}. Consommation calculée: ${calculatedConsumption?.toFixed(2)} L/100km.`,
        });
      }

      // Promptly send notification to manager about fuel fill
      await get().sendNotification({
        ownerId,
        type: 'fuel_fill',
        title: 'Nouveau plein enregistré',
        message: `Plein de ${quantity}L enregistré pour le véhicule par l'agent.`,
      });

      await get().fetchFuelFills(ownerId);
      await get().fetchTank(ownerId);
      await get().fetchVehicles(ownerId);
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
  }
}));
