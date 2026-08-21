import React, { useMemo, useRef, useState } from 'react';
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

interface KdriInputs {
  age: number;
  height: number;
  weight: number;
  is_black: boolean;
  is_hypertension: boolean;
  is_diabetes: boolean;
  is_cva: boolean;
  creatinine: number;
  is_hcv_pos: boolean;
  is_dcd: boolean;
}

interface HistogramBin {
  intervalle: string;
  frequence: number;
  months: number;
}

interface SurvivalPoint {
  year: number;
  survival: number;
}

interface SurvivalChartPoint {
  year: number;
  survival: number;
  medianSurvival?: number;
}

interface ModelTab {
  id: string;
  name: string;
}

interface PredictionApiResponse {
  risk_score: number;
  survival_years: number[];
  survival_probabilities: number[];
}

interface Model2SimulationResponse {
  wait_times_months: number[];
  num_simulations: number;
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
  expiration_date: '',
});

const createInitialKdriInputs = (): KdriInputs => ({
  age: 45,
  height: 170,
  weight: 75,
  is_black: false,
  is_hypertension: false,
  is_diabetes: false,
  is_cva: false,
  creatinine: 1,
  is_hcv_pos: false,
  is_dcd: false,
});

const waitTimesToHistogram = (waitTimes: number[]): HistogramBin[] => {
  const bins = Array.from({ length: 100 }, (_, index) => ({
    intervalle: `${index}-${index + 1}`,
    months: index,
    frequence: 0,
  }));

  for (const waitTime of waitTimes) {
    const monthIndex = Math.max(0, Math.min(99, Math.floor(waitTime)));
    bins[monthIndex].frequence += 1;
  }

  return bins;
};

const MEDIAN_PAIR_SURVIVAL_CURVE: SurvivalPoint[] = [
  { year: 1, survival: 98.4 },
  { year: 2, survival: 97.6 },
  { year: 3, survival: 97.5 },
  { year: 4, survival: 96.9 },
  { year: 5, survival: 94.5 },
  { year: 6, survival: 92.8 },
  { year: 7, survival: 92.3 },
  { year: 8, survival: 92.3 },
  { year: 9, survival: 88.6 },
  { year: 10, survival: 83.0 },
];

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getChartSvgPayload = (container: HTMLDivElement | null) => {
  if (!container) {
    return null;
  }

  const svg = container.querySelector('svg');
  if (!svg) {
    return null;
  }

  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));
  if (!clonedSvg.getAttribute('viewBox')) {
    clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  const svgText = new XMLSerializer().serializeToString(clonedSvg);
  return { svgText, width, height };
};

const patientSurvivalModelIds = ['model-1', 'model-3'] as const;

const buildSurvivalPointsFromApi = (data: PredictionApiResponse): SurvivalPoint[] =>
  data.survival_years.map((year, index) => ({
    year,
    survival: Math.max(0, Math.min(100, Number((data.survival_probabilities[index] * 100).toFixed(1)))),
  }));

function App() {
  const [activeTabId, setActiveTabId] = useState<string>(MODEL_TABS[0].id);
  const [statsByModel, setStatsByModel] = useState<Record<string, TransplantStats>>(() =>
    MODEL_TABS.reduce<Record<string, TransplantStats>>((acc, tab) => {
      acc[tab.id] = createInitialStats();
      return acc;
    }, {}),
  );
  const [model2Inputs, setModel2Inputs] = useState<Model2Inputs>(createInitialModel2Inputs);
  const [kdriByModel, setKdriByModel] = useState<Record<string, KdriInputs>>(() => ({
    'model-1': createInitialKdriInputs(),
    'model-2': createInitialKdriInputs(),
    'model-3': createInitialKdriInputs(),
  }));
  const [predictedRiskByModel, setPredictedRiskByModel] = useState<Record<string, number | null>>({
    'model-1': null,
    'model-3': null,
  });
  const [apiSurvivalByModel, setApiSurvivalByModel] = useState<Record<string, SurvivalPoint[]>>({
    'model-1': [],
    'model-3': [],
  });
  const [isPredictingByModel, setIsPredictingByModel] = useState<Record<string, boolean>>({
    'model-1': false,
    'model-3': false,
  });
  const [predictionErrorByModel, setPredictionErrorByModel] = useState<Record<string, string | null>>({
    'model-1': null,
    'model-3': null,
  });
  const [model2Histogram, setModel2Histogram] = useState<HistogramBin[]>([]);
  const [model2WaitTimes, setModel2WaitTimes] = useState<number[]>([]);
  const [isModel2Simulating, setIsModel2Simulating] = useState<boolean>(false);
  const [model2SimulationError, setModel2SimulationError] = useState<string | null>(null);
  const model1ChartRef = useRef<HTMLDivElement | null>(null);
  const model2ChartRef = useRef<HTMLDivElement | null>(null);

  const activeStats = statsByModel[activeTabId];
  const activeModel = MODEL_TABS.find((tab) => tab.id === activeTabId) ?? MODEL_TABS[0];
  const isModel2 = activeTabId === 'model-2';
  const isModel3 = activeTabId === 'model-3';
  const isKdriEnabledModel = activeTabId === 'model-1' || activeTabId === 'model-2' || activeTabId === 'model-3';
  const isPatientSurvivalModel =
    patientSurvivalModelIds.includes(activeTabId as (typeof patientSurvivalModelIds)[number]);
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

  const handleKdriChange = (modelId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    setKdriByModel((prev) => {
      const nextKdriInputs = {
        ...(prev[modelId] ?? createInitialKdriInputs()),
        [name]: type === 'checkbox' ? checked : (parseFloat(value) || 0),
      };

      if (modelId === 'model-1' || modelId === 'model-3') {
        const nextKdri = computeKdri(nextKdriInputs);
        setStatsByModel((prevStats) => ({
          ...prevStats,
          [modelId]: {
            ...(prevStats[modelId] ?? createInitialStats()),
            KDRI_RAO: nextKdri,
            AGE: nextKdriInputs.age,
            HGT_CM_CALC: nextKdriInputs.height,
          },
        }));
      }

      return {
        ...prev,
        [modelId]: nextKdriInputs,
      };
    });
  };

  const computeKdri = (inputs: KdriInputs): number => {
    const ageRisk = Math.max(0, inputs.age - 40) * 0.012 + Math.max(0, 18 - inputs.age) * 0.01;
    const heightRisk = Math.max(0, 170 - inputs.height) * 0.003;
    const weightRisk = Math.max(0, 80 - inputs.weight) * 0.0025;
    const creatinineRisk = Math.max(0, inputs.creatinine - 1) * 0.18;
    const binaryRisk =
      (inputs.is_black ? 0.18 : 0) +
      (inputs.is_hypertension ? 0.12 : 0) +
      (inputs.is_diabetes ? 0.13 : 0) +
      (inputs.is_cva ? 0.09 : 0) +
      (inputs.is_hcv_pos ? 0.24 : 0) +
      (inputs.is_dcd ? 0.14 : 0);
    const score = Math.exp(ageRisk + heightRisk + weightRisk + creatinineRisk + binaryRisk);
    return Number(score.toFixed(2));
  };

  const handlePatientProjectionUpdate = async () => {
    if (!isPatientSurvivalModel) {
      return;
    }

    const modelId = activeTabId as (typeof patientSurvivalModelIds)[number];
    const payload = statsByModel[modelId];
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

    setIsPredictingByModel((prev) => ({ ...prev, [modelId]: true }));
    setPredictionErrorByModel((prev) => ({ ...prev, [modelId]: null }));

    try {
      const response = await fetch(`${apiBaseUrl}/predict/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Prediction request failed');
      }

      const data = (await response.json()) as PredictionApiResponse;
      setPredictedRiskByModel((prev) => ({ ...prev, [modelId]: data.risk_score }));
      setApiSurvivalByModel((prev) => ({
        ...prev,
        [modelId]: buildSurvivalPointsFromApi(data),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPredictionErrorByModel((prev) => ({ ...prev, [modelId]: message }));
    } finally {
      setIsPredictingByModel((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  const handleModel2Simulation = async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
    setIsModel2Simulating(true);
    setModel2SimulationError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/simulate/model2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...model2Inputs,
          num_simulations: 100,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Simulation request failed');
      }

      const data = (await response.json()) as Model2SimulationResponse;
      setModel2WaitTimes(data.wait_times_months);
      setModel2Histogram(waitTimesToHistogram(data.wait_times_months));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setModel2SimulationError(message);
    } finally {
      setIsModel2Simulating(false);
    }
  };

  const survivalData = useMemo(
    () => {
      if (isPatientSurvivalModel && apiSurvivalByModel[activeTabId]?.length) {
        return apiSurvivalByModel[activeTabId];
      }

      return [
        { year: 1, survival: 95 - activeStats.AGE * 0.1 },
        { year: 3, survival: 90 - activeStats.AGE * 0.15 },
        { year: 5, survival: 85 - activeStats.AGE * 0.2 },
        { year: 10, survival: 75 - activeStats.AGE * 0.3 },
      ];
    },
    [activeStats.AGE, activeTabId, apiSurvivalByModel, isPatientSurvivalModel],
  );
  const survivalChartData = useMemo<SurvivalChartPoint[]>(
    () =>
      survivalData.map((point) => ({
        ...point,
        medianSurvival:
          activeTabId === 'model-1' || activeTabId === 'model-3'
            ? MEDIAN_PAIR_SURVIVAL_CURVE.find((medianPoint) => medianPoint.year === point.year)?.survival
            : undefined,
      })),
    [activeTabId, survivalData],
  );
  const renderModel1Tooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const selectedPair = payload.find((entry: any) => entry.dataKey === 'survival')?.value;
    const medianPair = payload.find((entry: any) => entry.dataKey === 'medianSurvival')?.value;
    const yearLabel = Number(label) === 1 ? 'année' : 'années';

    return (
      <div
        style={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          padding: '0.75rem',
          maxWidth: '280px',
          display: 'grid',
          gap: '0.35rem',
        }}
      >
        <div style={{ fontWeight: 700 }}>{`${label} ${yearLabel} post-greffe`}</div>
        {typeof selectedPair === 'number' && (
          <div>{`Survie estimée après ${label} ${yearLabel} (profil saisi): ${selectedPair.toFixed(1)}%`}</div>
        )}
        {typeof medianPair === 'number' && (
          <div style={{ color: '#dc2626' }}>{`Survie estimée pour la paire médiane: ${medianPair.toFixed(1)}%`}</div>
        )}
        <div style={{ fontSize: '0.82rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>
          Lecture simple: la ligne rouge représente la paire médiane de cohorte, l'autre ligne correspond au profil saisi. Plus le
          pourcentage est élevé, meilleures sont les chances de survie à ce moment.
        </div>
      </div>
    );
  };
  const renderModel2Tooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const freq = payload.find((entry: any) => entry.dataKey === 'frequence')?.value;
    const annotationByBin: Record<string, string> = {
      '10-11': "Après 10 mois, environ 5 % des patients en liste d'attente ont reçu une greffe et environ 2 % sont décédés.",
      '20-21': "Après 20 mois, environ 10 % des patients en liste d'attente ont reçu une greffe et environ 5 % sont décédés.",
      '50-51': "Après 50 mois, environ 28 % des patients en liste d'attente ont reçu une greffe et environ 14 % sont décédés.",
    };

    return (
      <div
        style={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          padding: '0.75rem',
          maxWidth: '320px',
          display: 'grid',
          gap: '0.35rem',
        }}
      >
        <div style={{ fontWeight: 700 }}>{`Intervalle : ${label} mois`}</div>
        {typeof freq === 'number' && <div>{`Fréquence : ${freq}`}</div>}
        {annotationByBin[label as string] && (
          <div style={{ fontSize: '0.82rem', color: 'hsl(var(--muted-foreground))' }}>{annotationByBin[label as string]}</div>
        )}
      </div>
    );
  };
  const twoColumnLayoutStyle: React.CSSProperties = {
    display: 'grid',
    gap: '2rem',
    gridTemplateColumns: '1fr 2fr',
    alignItems: 'start',
  };
  const stickyGraphColumnStyle: React.CSSProperties = {
    display: 'grid',
    gap: '2rem',
    position: 'sticky',
    top: '6.5rem',
    alignSelf: 'start',
  };
  const model3FormGridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '0.85rem 1rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    alignItems: 'end',
  };
  const kdriFieldsGridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '0.75rem 1rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    alignItems: 'end',
  };
  const defaultFormStackStyle: React.CSSProperties = { display: 'grid', gap: '1rem' };
  const exportChartAsSvg = (container: HTMLDivElement | null, fileBaseName: string) => {
    const payload = getChartSvgPayload(container);
    if (!payload) {
      return;
    }

    const svgBlob = new Blob([payload.svgText], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(svgBlob, `${fileBaseName}.svg`);
  };
  const exportChartAsPng = async (container: HTMLDivElement | null, fileBaseName: string) => {
    const payload = getChartSvgPayload(container);
    if (!payload) {
      return;
    }

    const svgBlob = new Blob([payload.svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = payload.width;
        canvas.height = payload.height;

        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas context unavailable'));
          return;
        }

        context.drawImage(image, 0, 0, payload.width, payload.height);
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${fileBaseName}.png`);
          }
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to render SVG into PNG'));
      };

      image.src = url;
    });
  };
  const renderExportMenu = (container: HTMLDivElement | null, fileBaseName: string) => (
    <details style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
      <summary
        style={{
          listStyle: 'none',
          cursor: 'pointer',
          width: '2rem',
          height: '2rem',
          borderRadius: '999px',
          border: '1px solid hsl(var(--border))',
          display: 'grid',
          placeItems: 'center',
          userSelect: 'none',
          fontWeight: 700,
          backgroundColor: 'hsl(var(--background))',
        }}
        aria-label="Exporter le graphique"
      >
        ...
      </summary>
      <div
        style={{
          position: 'absolute',
          top: '2.3rem',
          right: 0,
          zIndex: 20,
          minWidth: '150px',
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          padding: '0.35rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
          display: 'grid',
          gap: '0.25rem',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            void exportChartAsPng(container, fileBaseName);
            const details = e.currentTarget.closest('details') as HTMLDetailsElement | null;
            if (details) {
              details.open = false;
            }
          }}
          style={{
            textAlign: 'left',
            border: 'none',
            background: 'transparent',
            padding: '0.45rem 0.55rem',
            borderRadius: '0.35rem',
            cursor: 'pointer',
            color: 'hsl(var(--foreground))',
          }}
        >
          Export PNG
        </button>
        <button
          type="button"
          onClick={(e) => {
            exportChartAsSvg(container, fileBaseName);
            const details = e.currentTarget.closest('details') as HTMLDetailsElement | null;
            if (details) {
              details.open = false;
            }
          }}
          style={{
            textAlign: 'left',
            border: 'none',
            background: 'transparent',
            padding: '0.45rem 0.55rem',
            borderRadius: '0.35rem',
            cursor: 'pointer',
            color: 'hsl(var(--foreground))',
          }}
        >
          Export SVG
        </button>
      </div>
    </details>
  );
  const renderKdriSubsection = (modelId: string) => {
    const kdriInputs = kdriByModel[modelId] ?? createInitialKdriInputs();
    const kdri = computeKdri(kdriInputs);

    return (
      <div
        style={{
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          display: 'grid',
          gap: '0.85rem',
          backgroundColor: 'hsl(var(--muted) / 0.35)',
        }}
      >
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          <strong>Calcul du KDRI du donneur</strong>
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
            Remplissez les caracteristiques du donneur ci-dessous. Le KDRI estime est calcule automatiquement.
          </span>
        </div>

        <div style={kdriFieldsGridStyle}>
          <Input
            label="Age du donneur (ans)"
            name="age"
            type="number"
            value={kdriInputs.age}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Input
            label="Taille du donneur (cm)"
            name="height"
            type="number"
            value={kdriInputs.height}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Input
            label="Poids du donneur (kg)"
            name="weight"
            type="number"
            value={kdriInputs.weight}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Input
            label="Creatinine serique (mg/dL)"
            name="creatinine"
            type="number"
            step="0.1"
            value={kdriInputs.creatinine}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label="Le donneur est noir"
            name="is_black"
            checked={kdriInputs.is_black}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label="Le donneur est hypertendu"
            name="is_hypertension"
            checked={kdriInputs.is_hypertension}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label="Le donneur est diabetique"
            name="is_diabetes"
            checked={kdriInputs.is_diabetes}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label="Cause de deces: AVC (CVA)"
            name="is_cva"
            checked={kdriInputs.is_cva}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label="Donneur positif au VHC (HCV+)"
            name="is_hcv_pos"
            checked={kdriInputs.is_hcv_pos}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label="Donneur apres deces circulatoire (DCD)"
            name="is_dcd"
            checked={kdriInputs.is_dcd}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
          <strong>{`KDRI estime: ${kdri.toFixed(2)}`}</strong>
        </div>
      </div>
    );
  };

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
        <div style={isModel3 ? { display: 'grid', gap: '1.25rem' } : twoColumnLayoutStyle}>
          <section>
            <Card title="Détails du donneur" description="Entrez les statistiques du donneur.">
              {isKdriEnabledModel && <div style={{ marginBottom: '1rem' }}>{renderKdriSubsection(activeTabId)}</div>}
              <div style={isModel3 ? model3FormGridStyle : defaultFormStackStyle}>
                {!isKdriEnabledModel && (
                  <>
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
                  </>
                )}
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
              <div style={isModel3 ? model3FormGridStyle : defaultFormStackStyle}>
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
                <Button
                  style={{ marginTop: '0.5rem' }}
                  onClick={handlePatientProjectionUpdate}
                  disabled={!isPatientSurvivalModel || isPredictingByModel[activeTabId]}
                >
                  {isPredictingByModel[activeTabId] ? 'Mise à jour...' : 'Mettre à jour les projections'}
                </Button>
                {isPatientSurvivalModel && predictedRiskByModel[activeTabId] !== null && (
                  <div style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>
                    {`Score de risque (API): ${predictedRiskByModel[activeTabId]?.toFixed(3)}`}
                  </div>
                )}
                {isPatientSurvivalModel && predictionErrorByModel[activeTabId] && (
                  <div style={{ fontSize: '0.9rem', color: '#dc2626' }}>
                    {`Erreur API: ${predictionErrorByModel[activeTabId]}`}
                  </div>
                )}
              </div>
            </Card>
          </section>

          <section style={isModel3 ? undefined : stickyGraphColumnStyle}>
            <Card
              title={`Projection de survie post-greffe - ${activeModel.name}`}
              description="Pourcentage de survie estimé au fil du temps."
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {renderExportMenu(model1ChartRef.current, 'modele-1-projection-survie')}
              </div>
              <div ref={model1ChartRef} style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={survivalChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" label={{ value: 'Années post-greffe', position: 'insideBottom', offset: -5 }} />
                    <YAxis domain={[0, 100]} label={{ value: 'Survie %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      content={activeTabId === 'model-1' ? renderModel1Tooltip : undefined}
                      contentStyle={
                        activeTabId === 'model-1'
                          ? undefined
                          : {
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: 'var(--radius)',
                            }
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="survival"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    {(activeTabId === 'model-1' || activeTabId === 'model-3') && (
                      <Line
                        dataKey="medianSurvival"
                        type="monotone"
                        stroke="#dc2626"
                        strokeWidth={2}
                        connectNulls={false}
                        isAnimationActive={false}
                        dot={{ fill: '#dc2626', r: 4 }}
                        activeDot={{ fill: '#dc2626', r: 5 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>
        </div>
      ) : (
        <div style={twoColumnLayoutStyle}>
          <section>
            <Card title="Entrées du modèle 2" description="Entrez les champs du candidat.">
              <div style={{ marginBottom: '1rem' }}>{renderKdriSubsection('model-2')}</div>
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
                <Button onClick={handleModel2Simulation} disabled={isModel2Simulating}>
                  {isModel2Simulating ? 'Simulation en cours...' : 'Lancer 100 simulations'}
                </Button>
                {model2SimulationError && (
                  <div style={{ fontSize: '0.9rem', color: '#dc2626' }}>{`Erreur API: ${model2SimulationError}`}</div>
                )}
                {!model2SimulationError && model2WaitTimes.length > 0 && (
                  <div style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>
                    {`${model2WaitTimes.length} temps d'attente simulés reçus.`}
                  </div>
                )}
              </div>
            </Card>
          </section>

          <section style={stickyGraphColumnStyle}>
            <Card
              title="Distribution (histogramme) - Modèle 2"
              description="Histogramme des temps d'attente simulés (en mois)."
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {renderExportMenu(model2ChartRef.current, 'modele-2-histogramme')}
              </div>
              <div ref={model2ChartRef} style={{ height: '300px', width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model2Histogram}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="intervalle" />
                    <YAxis />
                    <Tooltip
                      content={renderModel2Tooltip}
                    />
                    <Bar dataKey="frequence" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {model2WaitTimes.length === 0 && !isModel2Simulating && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      padding: '0 1.25rem',
                      textAlign: 'center',
                      color: 'hsl(var(--muted-foreground))',
                      pointerEvents: 'none',
                    }}
                  >
                    mettez à jour les données pour voir la distribution des temps d'attente
                  </div>
                )}
              </div>
            </Card>
          </section>
        </div>
      )}
    </Layout>
  );
}

export default App;


