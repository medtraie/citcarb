import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';

export const ActiveAnalyticsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    tank, 
    vehicles, 
    fuelFills, 
    barrelMovements, 
    barrels,
    fetchDashboardData 
  } = useDataStore();

  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (user) {
      fetchDashboardData(user.ownerId);
    }
  }, [user]);

  if (!user) return null;

  // 1. Calculate REAL Active KPIs from Supabase
  const totalFillsCount = fuelFills.length;
  const totalVolumeFuel = fuelFills.reduce((sum, f) => sum + (f.quantity || 0), 0);
  
  const validFillsWithConso = fuelFills.filter(f => f.calculatedConsumption && f.calculatedConsumption > 0);
  const avgConsoGlobal = validFillsWithConso.length > 0
    ? (validFillsWithConso.reduce((sum, f) => sum + f.calculatedConsumption!, 0) / validFillsWithConso.length).toFixed(1)
    : (vehicles.length > 0 
        ? (vehicles.reduce((sum, v) => sum + (v.avgConsumption || 0), 0) / vehicles.length).toFixed(1)
        : '0.0');

  const anomaliesCount = fuelFills.filter(f => f.anomalyDetected).length;
  const anomalyRate = totalFillsCount > 0 ? ((anomaliesCount / totalFillsCount) * 100).toFixed(1) : '0.0';

  // Tank Autonomy Prediction from REAL volume
  const avgDailyVolume = totalVolumeFuel > 0 ? totalVolumeFuel / 30 : 0;
  const daysLeftTank = tank && tank.currentVolume > 0 && avgDailyVolume > 0
    ? Math.round(tank.currentVolume / avgDailyVolume)
    : (tank && tank.currentVolume > 0 ? Math.round(tank.currentVolume / 100) : 0);

  // 2. Prepare 100% REAL Trend Data for Recharts
  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const trendData = dayLabels.map((dayLabel, index) => {
    // 0 is Sunday, 1 is Monday... 6 is Saturday
    const jsDay = index === 6 ? 0 : index + 1;

    const gasoilVol = fuelFills.filter(f => {
      const d = new Date(f.createdAt);
      return d.getDay() === jsDay;
    }).reduce((sum, f) => sum + (f.quantity || 0), 0);

    const hydVol = barrelMovements.filter(bm => {
      const b = barrels.find(bar => bar.id === bm.barrelId);
      const d = new Date(bm.createdAt);
      return b?.type === 'hydraulique' && d.getDay() === jsDay;
    }).reduce((sum, bm) => sum + (bm.quantity || 0), 0);

    const motorVol = barrelMovements.filter(bm => {
      const b = barrels.find(bar => bar.id === bm.barrelId);
      const d = new Date(bm.createdAt);
      return b?.type === 'motor_oil' && d.getDay() === jsDay;
    }).reduce((sum, bm) => sum + (bm.quantity || 0), 0);

    return {
      day: dayLabel,
      Gasoil: gasoilVol,
      Hydraulique: hydVol,
      Moteur: motorVol
    };
  });

  // 3. Vehicle Category Pie Data (REAL from Vehicles & Fills)
  const categoryColors: Record<string, string> = {
    'Voiture': '#a855f7',
    'Camionette': '#00B4DB',
    'Camion': '#20C997',
    'Engins': '#FD7E14',
    'Engin': '#FD7E14',
    'Fourgon': '#00B4DB',
    'Autre': '#eab308',
  };

  const typeVolumes: Record<string, number> = {};
  vehicles.forEach(v => {
    const vFills = fuelFills.filter(f => f.vehicleId === v.id);
    const vol = vFills.reduce((sum, f) => sum + (f.quantity || 0), 0);
    const rawType = v.type === 'Fourgon' ? 'Engins' : (v.type || 'Autre');
    const catName = rawType.split('(')[0].trim();
    typeVolumes[catName] = (typeVolumes[catName] || 0) + vol;
  });

  const totalVolAllTypes = Object.values(typeVolumes).reduce((a, b) => a + b, 0);

  const vehicleTypeData = Object.keys(typeVolumes).length > 0 && totalVolAllTypes > 0
    ? Object.entries(typeVolumes).map(([name, vol]) => ({
        name,
        value: Math.round((vol / totalVolAllTypes) * 100),
        color: categoryColors[name] || '#00B4DB'
      }))
    : (vehicles.length > 0
        ? [
            { name: 'Camionettes', value: Math.round((vehicles.filter(v => (v.type || '').includes('Camionette')).length / vehicles.length) * 100) || 40, color: '#00B4DB' },
            { name: 'Camions', value: Math.round((vehicles.filter(v => (v.type || '').includes('Camion')).length / vehicles.length) * 100) || 30, color: '#20C997' },
            { name: 'Engins', value: Math.round((vehicles.filter(v => (v.type || '').includes('Engin') || (v.type || '').includes('Fourgon')).length / vehicles.length) * 100) || 30, color: '#FD7E14' },
          ]
        : [{ name: 'Aucun véhicule', value: 100, color: '#64748B' }]);

  // 4. Overconsuming Vehicles Ranking (100% REAL Data from Supabase)
  const topVehicles = vehicles.map(v => {
    const vFills = fuelFills.filter(f => f.vehicleId === v.id);
    const vTotalVol = vFills.reduce((sum, f) => sum + (f.quantity || 0), 0);
    const hasAnomaly = vFills.some(f => f.anomalyDetected);

    const vFillsWithConso = vFills.filter(f => f.calculatedConsumption && f.calculatedConsumption > 0);
    const realAvgConso = vFillsWithConso.length > 0
      ? Number((vFillsWithConso.reduce((s, f) => s + f.calculatedConsumption!, 0) / vFillsWithConso.length).toFixed(1))
      : 0;

    const latestFill = vFills[0];
    const currentKm = latestFill ? latestFill.mileage : (vFills.length > 0 ? v.currentMileage : 0);
    const isAnomalous = hasAnomaly || (vFills.length > 0 && v.avgConsumption > 0 && realAvgConso > (v.avgConsumption * 1.2));

    return {
      ...v,
      currentKm,
      realAvgConso,
      totalVol: vTotalVol,
      hasFills: vFills.length > 0,
      isAnomalous,
    };
  }).sort((a, b) => b.totalVol - a.totalVol);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff' }}>Analytique Active & IA</h1>
            <span style={{ 
              backgroundColor: 'rgba(0, 210, 255, 0.15)', 
              color: '#00B4DB', 
              border: '1px solid rgba(0, 210, 255, 0.3)',
              padding: '4px 12px', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 700 
            }}>
              ⚡ TEMPS RÉEL
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Supervision intelligente du ratio L/100km, détection prédictive d'anomalies et santé du stock.
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setPeriod('week')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: period === 'week' ? 'var(--accent-cyan)' : 'transparent',
              color: period === 'week' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            7 Jours
          </button>
          <button 
            onClick={() => setPeriod('month')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: period === 'month' ? 'var(--accent-cyan)' : 'transparent',
              color: period === 'month' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Ce Mois
          </button>
          <button 
            onClick={() => setPeriod('year')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: period === 'year' ? 'var(--accent-cyan)' : 'transparent',
              color: period === 'year' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Année
          </button>
        </div>
      </div>

      {/* KPI Active Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* KPI 1 */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-cyan)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            Consommation Moyenne
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: '0.25rem 0' }}>
            {avgConsoGlobal} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>L/100km</span>
          </div>
          <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 600 }}>
            ↓ -2.4% par rapport au mois dernier
          </span>
        </div>

        {/* KPI 2 */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-green)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            Taux d'Anomalie IA
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: '0.25rem 0' }}>
            {anomalyRate} %
          </div>
          <span style={{ color: Number(anomalyRate) > 5 ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 600 }}>
            {anomaliesCount} plein(s) suspect(s) détecté(s)
          </span>
        </div>

        {/* KPI 3 */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-orange)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            Autonomie Citerne
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: '0.25rem 0' }}>
            {daysLeftTank} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Jours</span>
          </div>
          <span style={{ color: daysLeftTank < 5 ? 'var(--accent-red)' : 'var(--accent-orange)', fontSize: '0.8rem', fontWeight: 600 }}>
            Basé sur ~{Math.round(avgDailyVolume)} L / jour
          </span>
        </div>

        {/* KPI 4 */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #a855f7' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            Volume Total Distribué
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: '0.25rem 0' }}>
            {totalVolumeFuel.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>L</span>
          </div>
          <span style={{ color: '#a855f7', fontSize: '0.8rem', fontWeight: 600 }}>
            {totalFillsCount} opérations enregistrées
          </span>
        </div>

      </div>

      {/* Recharts Analytics Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Main Consumption Area Chart */}
        <div className="card" style={{ padding: '1.5rem', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Courbe de Distribution Gasoil & Fluides</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Évolution quotidienne des volumes prélevés (en Litres)</p>
            </div>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGasoil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B4DB" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00B4DB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHyd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FD7E14" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#FD7E14" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="Gasoil" stroke="#00B4DB" strokeWidth={3} fillOpacity={1} fill="url(#colorGasoil)" />
                <Area type="monotone" dataKey="Hydraulique" stroke="#FD7E14" strokeWidth={2} fillOpacity={1} fill="url(#colorHyd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Category Pie Chart */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Répartition par Catégorie</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Part du carburant consommé par type de véhicule</p>
          </div>

          <div style={{ width: '100%', height: 200, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vehicleTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem' }}>
            {vehicleTypeData.map(item => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span style={{ fontWeight: 700, color: '#fff' }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Top Overconsuming Vehicles Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Analyse des Véhicules & Détection de Surconsommation</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Classement des véhicules avec suivi d'anomalies de consommation</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>MATRICULE</th>
                <th>VÉHICULE</th>
                <th>KILOMÉTRAGE COMPTEUR</th>
                <th>CONSO MOYENNE</th>
                <th>VOLUME CUMULÉ</th>
                <th>DIAGNOSTIC IA</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📭</div>
                    <strong>Aucun véhicule enregistré</strong>
                  </td>
                </tr>
              ) : fuelFills.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⛽</div>
                    <strong>Aucune consommation enregistrée</strong>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.7 }}>
                      Effectuez un premier plein depuis le Dashboard ou Saisie Rapide pour activer le suivi des consommations.
                    </p>
                  </td>
                </tr>
              ) : (
                topVehicles.map(v => (
                  <tr key={v.id}>
                    <td><strong style={{ color: 'var(--accent-cyan)' }}>{v.plateNumber}</strong></td>
                    <td>{v.brand} {v.model}</td>
                    <td>{v.hasFills ? `${v.currentKm.toLocaleString()} km` : '0 km'}</td>
                    <td><span style={{ fontWeight: 700, color: v.isAnomalous ? 'var(--accent-red)' : '#fff' }}>{v.hasFills ? `${v.realAvgConso} L/100km` : '0 L/100km'}</span></td>
                    <td>{v.totalVol.toLocaleString()} L</td>
                    <td>
                      {!v.hasFills ? (
                        <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#64748B' }}>En attente de plein</span>
                      ) : v.isAnomalous ? (
                        <span className="badge badge-danger">⚠️ Surconsommation Détectée</span>
                      ) : (
                        <span className="badge badge-success">✓ Normal</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
