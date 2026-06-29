import React, { useMemo, useState } from 'react';
import { Layout } from './components/Layout';
import { Card } from './components/Card';
import { Input } from './components/Input';
import { Select } from './components/Select';
import { Checkbox } from './components/Checkbox';
import { Button } from './components/Button';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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

interface Model2Inputs {
  birth: string;
  dialysis: string;
  arrival: string;
  blood: 'O' | 'A' | 'B' | 'AB';
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  dr1: string;
  dr2: string;
  cpra: number;
  expiration_date: string | null;
}

interface HistogramBin {
  intervalle: string;
  frequence: number;
}

interface ModelTab {
  id: string;
  name: string;
}

const MODEL_TABS: ModelTab[] = [
  { id: 'model-1', name: 'Modèle 1' },
  { id: 'model-2', name: 'Modèle 2' },
  { id: 'model-3', name: 'Modèle 3' },
  { id: 'model-4', name: 'Modèle 4' },
];

const createInitialStats = (): TransplantStats => ({
  KDRI_RAO: 1.0,
  AGE: 45,
  HGT_CM_CALC: 170,
  IMC: 25,
  TIME_ON_DIALYSIS: 0,
  PRA_PRE: 0,
  GENDER_DON: 'Homme',
  TABAC_DON: false,
  COCAINE_DON: false,
  GENDER: 'Homme',
  ETHCAT: 'Blanc',
  DIAG_KI: 'Autre ou inconnu',
  DIAB: false,
  PERIP_VASC: false,
  HCV_REC: false,
  HBV_SUR_ANTIGEN: false,
  MALIG: false,
  MM: '0',
  CMV_MM: 'Faible',
  EBV_MM: false,
});

const createInitialModel2Inputs = (): Model2Inputs => ({
  birth: '',
  dialysis: '',
  arrival: '',
  blood: 'O',
  a1: '',
  a2: '',
  b1: '',
  b2: '',
  dr1: '',
  dr2: '',
  cpra: 0,
  expiration_date: null,
});

const createRandomHistogram = (): HistogramBin[] => {
  const bins = ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'];
  return bins.map((intervalle) => ({
    intervalle,
    frequence: Math.floor(Math.random() * 90) + 10,
  }));
};

function App() {
  const [activeTabId, setActiveTabId] = useState<string>(MODEL_TABS[0].id);
  const [statsByModel, setStatsByModel] = useState<Record<string, TransplantStats>>(() =>
    MODEL_TABS.reduce<Record<string, TransplantStats>>((acc, tab) => {
      acc[tab.id] = createInitialStats();
      return acc;
    }, {}),
  );
  const [model2Inputs, setModel2Inputs] = useState<Model2Inputs>(createInitialModel2Inputs);
  const [model2Histogram] = useState<HistogramBin[]>(() => createRandomHistogram());

  const activeStats = statsByModel[activeTabId];
  const activeModel = MODEL_TABS.find((tab) => tab.id === activeTabId) ?? MODEL_TABS[0];
  const isModel2 = activeTabId === 'model-2';
  const isExpirationActive = model2Inputs.expiration_date === null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    setStatsByModel((prev) => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        [name]:
          type === 'checkbox'
            ? checked
            : type === 'number'
              ? (parseFloat(value) || 0)
              : value,
      },
    }));
  };

  const handleModel2Change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    setModel2Inputs((prev) => {
      if (type === 'checkbox' && name === 'expiration_active') {
        return {
          ...prev,
          expiration_date: checked ? null : '',
        };
      }

      if (name === 'cpra') {
        const parsed = parseInt(value, 10);
        const cpra = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
        return { ...prev, cpra };
      }

      if (name === 'blood') {
        return { ...prev, blood: value as Model2Inputs['blood'] };
      }

      if (name === 'expiration_date') {
        return { ...prev, expiration_date: value || '' };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const survivalData = useMemo(
    () => [
      { year: 1, survival: 95 - activeStats.AGE * 0.1 },
      { year: 3, survival: 90 - activeStats.AGE * 0.15 },
      { year: 5, survival: 85 - activeStats.AGE * 0.2 },
      { year: 10, survival: 75 - activeStats.AGE * 0.3 },
    ],
    [activeStats.AGE],
  );

  return (
    <Layout>
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
        <div
          role="tablist"
          aria-label="Fenêtres de modèles"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            borderBottom: '1px solid hsl(var(--border))',
            paddingBottom: '0.75rem',
          }}
        >
          {MODEL_TABS.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  borderRadius: '999px',
                  border: isActive ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                  backgroundColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--background))',
                  color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {!isModel2 ? (
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 2fr' }}>
          <section>
            <Card title="Détails du donneur" description="Entrez les statistiques du donneur.">
              <div style={{ display: 'grid', gap: '1rem' }}>
                <Input
                  label="Indice de risque du donneur rénal (RAO)"
                  name="KDRI_RAO"
                  type="number"
                  value={activeStats.KDRI_RAO}
                  onChange={handleInputChange}
                />
                <Input label="Âge" name="AGE" type="number" value={activeStats.AGE} onChange={handleInputChange} />
                <Input
                  label="Taille (cm)"
                  name="HGT_CM_CALC"
                  type="number"
                  value={activeStats.HGT_CM_CALC}
                  onChange={handleInputChange}
                />
                <Input
                  label="Indice de masse corporelle"
                  name="IMC"
                  type="number"
                  value={activeStats.IMC}
                  onChange={handleInputChange}
                />
                <Input
                  label="Durée de dialyse (mois)"
                  name="TIME_ON_DIALYSIS"
                  type="number"
                  value={activeStats.TIME_ON_DIALYSIS}
                  onChange={handleInputChange}
                />
                <Input
                  label="PRA pré-transplantation"
                  name="PRA_PRE"
                  type="number"
                  value={activeStats.PRA_PRE}
                  onChange={handleInputChange}
                />
                <Select
                  label="Genre du donneur"
                  name="GENDER_DON"
                  value={activeStats.GENDER_DON}
                  onChange={handleInputChange}
                  options={[
                    { value: 'Homme', label: 'Homme' },
                    { value: 'Femme', label: 'Femme' },
                    { value: 'Autre', label: 'Autre' },
                  ]}
                />
                <Checkbox
                  label="Tabagisme du donneur"
                  name="TABAC_DON"
                  checked={activeStats.TABAC_DON}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label="Consommation de cocaïne du donneur"
                  name="COCAINE_DON"
                  checked={activeStats.COCAINE_DON}
                  onChange={handleInputChange}
                />
              </div>
            </Card>

            <Card title="Détails du receveur" description="Entrez les statistiques du receveur.">
              <div style={{ display: 'grid', gap: '1rem' }}>
                <Select
                  label="Genre du receveur"
                  name="GENDER"
                  value={activeStats.GENDER}
                  onChange={handleInputChange}
                  options={[
                    { value: 'Homme', label: 'Homme' },
                    { value: 'Femme', label: 'Femme' },
                    { value: 'Autre', label: 'Autre' },
                  ]}
                />
                <Select
                  label="Catégorie d'ethnicité"
                  name="ETHCAT"
                  value={activeStats.ETHCAT}
                  onChange={handleInputChange}
                  options={[
                    { value: 'Blanc', label: 'Blanc' },
                    { value: 'Noir', label: 'Noir' },
                    { value: 'Asiatique', label: 'Asiatique' },
                    { value: 'Hispanique', label: 'Hispanique' },
                    { value: 'Autre', label: 'Autre' },
                  ]}
                />
                <Select
                  label="Diagnostic de la maladie rénale"
                  name="DIAG_KI"
                  value={activeStats.DIAG_KI}
                  onChange={handleInputChange}
                  options={[
                    { value: 'Autre ou inconnu', label: 'Autre ou inconnu' },
                    { value: 'Néphropathie diabétique', label: 'Néphropathie diabétique' },
                    { value: 'Néphrosclérose hypertensive', label: 'Néphrosclérose hypertensive' },
                    { value: 'Maladie polykystique rénale', label: 'Maladie polykystique rénale' },
                    { value: 'Glomérulonéphrite', label: 'Glomérulonéphrite' },
                  ]}
                />
                <Checkbox label="Diabète" name="DIAB" checked={activeStats.DIAB} onChange={handleInputChange} />
                <Checkbox
                  label="Maladie vasculaire périphérique"
                  name="PERIP_VASC"
                  checked={activeStats.PERIP_VASC}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label="Receveur positif au VHC"
                  name="HCV_REC"
                  checked={activeStats.HCV_REC}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label="Antigène de surface VHB du receveur"
                  name="HBV_SUR_ANTIGEN"
                  checked={activeStats.HBV_SUR_ANTIGEN}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label="Antécédents de malignité"
                  name="MALIG"
                  checked={activeStats.MALIG}
                  onChange={handleInputChange}
                />
                <Input label="MM" name="MM" type="text" value={activeStats.MM} onChange={handleInputChange} />
                <Select
                  label="Correspondance CMV"
                  name="CMV_MM"
                  value={activeStats.CMV_MM}
                  onChange={handleInputChange}
                  options={[
                    { value: 'Faible', label: 'Faible' },
                    { value: 'Moyen', label: 'Moyen' },
                    { value: 'Élevé', label: 'Élevé' },
                  ]}
                />
                <Checkbox
                  label="Correspondance EBV"
                  name="EBV_MM"
                  checked={activeStats.EBV_MM}
                  onChange={handleInputChange}
                />
                <Button style={{ marginTop: '0.5rem' }}>Mettre à jour les projections</Button>
              </div>
            </Card>
          </section>

          <section style={{ display: 'grid', gap: '2rem' }}>
            <Card
              title={`Projection de survie post-greffe - ${activeModel.name}`}
              description="Pourcentage de survie estimé au fil du temps."
            >
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={survivalData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" label={{ value: 'Années post-greffe', position: 'insideBottom', offset: -5 }} />
                    <YAxis domain={[0, 100]} label={{ value: 'Survie %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
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
      ) : (
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 2fr' }}>
          <section>
            <Card title="Entrées du modèle 2" description="Entrez les champs du candidat.">
              <div style={{ display: 'grid', gap: '1rem' }}>
                <Input label="Date de naissance" name="birth" type="date" value={model2Inputs.birth} onChange={handleModel2Change} />
                <Input
                  label="Date de début de dialyse"
                  name="dialysis"
                  type="date"
                  value={model2Inputs.dialysis}
                  onChange={handleModel2Change}
                />
                <Input
                  label="Date d'entrée en liste d'attente"
                  name="arrival"
                  type="date"
                  value={model2Inputs.arrival}
                  onChange={handleModel2Change}
                />
                <Select
                  label="Groupe sanguin (ABO)"
                  name="blood"
                  value={model2Inputs.blood}
                  onChange={handleModel2Change}
                  options={[
                    { value: 'O', label: 'O' },
                    { value: 'A', label: 'A' },
                    { value: 'B', label: 'B' },
                    { value: 'AB', label: 'AB' },
                  ]}
                />
                <Input label="HLA-A allèle 1" name="a1" type="text" value={model2Inputs.a1} onChange={handleModel2Change} />
                <Input label="HLA-A allèle 2" name="a2" type="text" value={model2Inputs.a2} onChange={handleModel2Change} />
                <Input label="HLA-B allèle 1" name="b1" type="text" value={model2Inputs.b1} onChange={handleModel2Change} />
                <Input label="HLA-B allèle 2" name="b2" type="text" value={model2Inputs.b2} onChange={handleModel2Change} />
                <Input label="HLA-DR allèle 1" name="dr1" type="text" value={model2Inputs.dr1} onChange={handleModel2Change} />
                <Input label="HLA-DR allèle 2" name="dr2" type="text" value={model2Inputs.dr2} onChange={handleModel2Change} />
                <Input label="cPRA (0-100)" name="cpra" type="number" min={0} max={100} value={model2Inputs.cpra} onChange={handleModel2Change} />
                <Checkbox
                  label="Toujours actif (expiration_date = rien)"
                  name="expiration_active"
                  checked={isExpirationActive}
                  onChange={handleModel2Change}
                />
                <Input
                  label="Date d'expiration d'éligibilité"
                  name="expiration_date"
                  type="date"
                  value={model2Inputs.expiration_date ?? ''}
                  onChange={handleModel2Change}
                  disabled={isExpirationActive}
                />
              </div>
            </Card>
          </section>

          <section style={{ display: 'grid', gap: '2rem' }}>
            <Card
              title="Distribution (histogramme) - Modèle 2"
              description="Histogramme aléatoire temporaire en attendant le vrai modèle."
            >
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model2Histogram}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="intervalle" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Bar dataKey="frequence" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>
        </div>
      )}
    </Layout>
  );
}

export default App;
