import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Card } from './components/Card';
import { Input } from './components/Input';
import { Select } from './components/Select';
import { Checkbox } from './components/Checkbox';
import { Button } from './components/Button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface TransplantStats {
  KDRI_RAO: number;
  AGE: number;
  HGT_CM_CALC: number;
  IMC: number;
  TIME_ON_DIALYSIS: number;
  PRA_PRE: number;
  GENDER_DON: string;
  TABAC_DON: boolean;
  COCAINE_DON: boolean;
  GENDER: string;
  ETHCAT: string;
  DIAG_KI: string;
  DIAB: boolean;
  PERIP_VASC: boolean;
  HCV_REC: boolean;
  HBV_SUR_ANTIGEN: boolean;
  MALIG: boolean;
  MM: string;
  CMV_MM: string;
  EBV_MM: boolean;
}

function App() {
  const [stats, setStats] = useState<TransplantStats>({
    KDRI_RAO: 1.0,
    AGE: 45,
    HGT_CM_CALC: 170,
    IMC: 25,
    TIME_ON_DIALYSIS: 0,
    PRA_PRE: 0,
    GENDER_DON: "M",
    TABAC_DON: false,
    COCAINE_DON: false,
    GENDER: "M",
    ETHCAT: "White",
    DIAG_KI: "Other or Unknown",
    DIAB: false,
    PERIP_VASC: false,
    HCV_REC: false,
    HBV_SUR_ANTIGEN: false,
    MALIG: false,
    MM: "0",
    CMV_MM: "LOW",
    EBV_MM: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setStats(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (parseFloat(value) || 0) : value,
    }));
  };

  // Mock data generation based on input
  const survivalData = [
    { year: 1, survival: 95 - (stats.AGE * 0.1) },
    { year: 3, survival: 90 - (stats.AGE * 0.15) },
    { year: 5, survival: 85 - (stats.AGE * 0.2) },
    { year: 10, survival: 75 - (stats.AGE * 0.3) },
  ];

  return (
    <Layout>
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 2fr' }}>
        <section>
          <Card title="Détails du donneur" description="Entrez les statistiques du donneur.">
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Input 
                label="Indice de risque du donneur rénal (RAO)" 
                name="KDRI_RAO" 
                type="number" 
                value={stats.KDRI_RAO} 
                onChange={handleInputChange} 
              />
              <Input 
                label="Age" 
                name="AGE" 
                type="number" 
                value={stats.AGE} 
                onChange={handleInputChange} 
              />
              <Input 
                label="Taille (cm)" 
                name="HGT_CM_CALC" 
                type="number" 
                value={stats.HGT_CM_CALC} 
                onChange={handleInputChange} 
              />
              <Input 
                label="Indice de masse corporelle" 
                name="IMC" 
                type="number" 
                value={stats.IMC} 
                onChange={handleInputChange} 
              />
              <Input 
                label="Durée de dialyse (mois)" 
                name="TIME_ON_DIALYSIS" 
                type="number" 
                value={stats.TIME_ON_DIALYSIS} 
                onChange={handleInputChange} 
              />
              <Input 
                label="PRA pré-transplantation" 
                name="PRA_PRE" 
                type="number" 
                value={stats.PRA_PRE} 
                onChange={handleInputChange} 
              />
<Select
                  label="Donor Gender"
                  name="GENDER_DON"
                  value={stats.GENDER_DON}
                  onChange={handleInputChange}
                  options={[
                    { value: "M", label: "Male" },
                    { value: "F", label: "Female" },
                    { value: "O", label: "Other" },
                  ]}
                />
              <Checkbox 
                label="Tabagisme du donneur" 
                name="TABAC_DON" 
                checked={stats.TABAC_DON} 
                onChange={handleInputChange} 
              />
              <Checkbox 
                label="Consommation de cocaïne du donneur" 
                name="COCAINE_DON" 
                checked={stats.COCAINE_DON} 
                onChange={handleInputChange} 
              />
            </div>
          </Card>
          <Card title="Recipient Details" description="Entrez les statistiques du receveur.">
            <div style={{ display: 'grid', gap: '1rem' }}>
<Select
                  label="Genre du receveur"
                  name="GENDER"
                  value={stats.GENDER}
                  onChange={handleInputChange}
                  options={[
                    { value: "M", label: "Male" },
                    { value: "F", label: "Female" },
                    { value: "O", label: "Other" },
                  ]}
                />
<Select
                  label="Catégorie d'ethnicité"
                  name="ETHCAT"
                  value={stats.ETHCAT}
                  onChange={handleInputChange}
                  options={[
                    { value: "White", label: "White" },
                    { value: "Black", label: "Black" },
                    { value: "Asian", label: "Asian" },
                    { value: "Hispanic", label: "Hispanic" },
                    { value: "Other", label: "Other" },
                  ]}
                />
<Select
                  label="Diagnostic de la maladie rénale"
                  name="DIAG_KI"
                  value={stats.DIAG_KI}
                  onChange={handleInputChange}
                  options={[
                    { value: "Other or Unknown", label: "Other or Unknown" },
                    { value: "Diabetic Nephropathy", label: "Diabetic Nephropathy" },
                    { value: "Hypertensive Nephrosclerosis", label: "Hypertensive Nephrosclerosis" },
                    { value: "Polycystic Kidney Disease", label: "Polycystic Kidney Disease" },
                    { value: "Glomerulonephritis", label: "Glomerulonephritis" },
                  ]}
                />
              <Checkbox 
                label="Diabetes" 
                name="DIAB" 
                checked={stats.DIAB} 
                onChange={handleInputChange} 
              />
              <Checkbox 
                label="Peripheral Vascular Disease" 
                name="PERIP_VASC" 
                checked={stats.PERIP_VASC} 
                onChange={handleInputChange} 
              />
              <Checkbox 
                label="Recipient HCV Positive" 
                name="HCV_REC" 
                checked={stats.HCV_REC} 
                onChange={handleInputChange} 
              />
              <Checkbox 
                label="Recipient HBV Surface Antigen" 
                name="HBV_SUR_ANTIGEN" 
                checked={stats.HBV_SUR_ANTIGEN} 
                onChange={handleInputChange} 
              />
              <Checkbox 
                label="Malignancy History" 
                name="MALIG" 
                checked={stats.MALIG} 
                onChange={handleInputChange} 
              />
              <Input 
                label="MM" 
                name="MM" 
                type="text" 
                value={stats.MM} 
                onChange={handleInputChange} 
              />
<Select
                  label="Correspondance CMV"
                  name="CMV_MM"
                  value={stats.CMV_MM}
                  onChange={handleInputChange}
                  options={[
                    { value: "LOW", label: "Low" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HIGH", label: "High" },
                  ]}
                />
              <Checkbox 
                label="Correspondance EBV" 
                name="EBV_MM" 
                checked={stats.EBV_MM} 
                onChange={handleInputChange} 
              />
              <Button style={{ marginTop: '0.5rem' }}>Mettre à jour les projections</Button>
            </div>
          </Card>
        </section>

        <section style={{ display: 'grid', gap: '2rem' }}>
          <Card title="Post-Transplant Survival Projection" description="Pourcentage de survie estimé au fil du temps.">
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={survivalData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" label={{ value: 'Years Post-Transplant', position: 'insideBottom', offset: -5 }} />
                  <YAxis domain={[0, 100]} label={{ value: 'Survival %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="survival" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={{ fill: 'hsl(var(--primary))' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

        </section>
      </div>
    </Layout>
  );
}

export default App;
