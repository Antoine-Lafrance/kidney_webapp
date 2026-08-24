import React, { useMemo, useRef, useState } from "react";
import { Layout } from "./components/Layout";
import { Card } from "./components/Card";
import { Input } from "./components/Input";
import { Select } from "./components/Select";
import { Checkbox } from "./components/Checkbox";
import { Button } from "./components/Button";
import { toast } from "sonner";
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
} from "recharts";

interface TransplantStats {
  KDRI_RAO: number | "";
  AGE: number | "";
  HGT_CM_CALC: number | "";
  IMC: number | "";
  TIME_ON_DIALYSIS: number | "";
  PRA_PRE: number | "";
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
  EBV_MM: string;
}

interface Model2Inputs {
  birth: string;
  dialysis: string;
  arrival: string;
  blood: "" | "O" | "A" | "B" | "AB";
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  dr1: string;
  dr2: string;
  cpra: number | "";
}

interface KdriInputs {
  age: number | "";
  height: number | "";
  weight: number | "";
  is_black: boolean;
  is_hypertension: boolean;
  is_diabetes: boolean;
  is_cva: boolean;
  creatinine: number | "";
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

type Language = "fr" | "en";

type SerologyStatus = "" | "positive" | "negative" | "unknown";

interface Model4SerologyInputs {
  donorCmv: SerologyStatus;
  recipientCmv: SerologyStatus;
  donorEbv: SerologyStatus;
  recipientEbv: SerologyStatus;
}

const deriveCmvLevel = (
  donorCmv: SerologyStatus,
  recipientCmv: SerologyStatus,
): string => {
  if (!donorCmv || !recipientCmv) {
    return "";
  }

  if (donorCmv === "positive" && recipientCmv === "negative") {
    return "Élevé";
  }

  if (donorCmv === "negative" && recipientCmv === "negative") {
    return "Faible";
  }

  return "Moyen";
};

const deriveEbvLevel = (
  donorEbv: SerologyStatus,
  recipientEbv: SerologyStatus,
): string => {
  if (!donorEbv || !recipientEbv) {
    return "";
  }

  if (
    recipientEbv === "unknown" ||
    (recipientEbv === "negative" && donorEbv === "unknown")
  ) {
    return "Inconnu";
  }

  if (donorEbv === "positive" && recipientEbv === "negative") {
    return "Élevé";
  }

  if (recipientEbv === "positive") {
    return "Faible";
  }

  return "Moyen";
};

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

const MODEL_TAB_IDS = ["model-2", "model-4"] as const;

const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "")
  : "/api";


const getModelTabs = (language: Language): ModelTab[] => [
  {
    id: "model-2",
    name:
      language === "fr"
        ? "Distribution des temps d'attente"
        : "Waiting Time Distribution",
  },
  {
    id: "model-4",
    name:
      language === "fr"
        ? "Projection de survie post greffe"
        : "Post-Transplant Survival Projection",
  },
];

const createInitialStats = (): TransplantStats => ({
  KDRI_RAO: "",
  AGE: "",
  HGT_CM_CALC: "",
  IMC: "",
  TIME_ON_DIALYSIS: "",
  PRA_PRE: "",
  GENDER_DON: "",
  TABAC_DON: false,
  COCAINE_DON: false,
  GENDER: "",
  ETHCAT: "",
  DIAG_KI: "",
  DIAB: false,
  PERIP_VASC: false,
  HCV_REC: false,
  HBV_SUR_ANTIGEN: false,
  MALIG: false,
  MM: "",
  CMV_MM: "",
  EBV_MM: "",
});

const createInitialModel2Inputs = (): Model2Inputs => ({
  birth: "",
  dialysis: "",
  arrival: "",
  blood: "",
  a1: "",
  a2: "",
  b1: "",
  b2: "",
  dr1: "",
  dr2: "",
  cpra: "",
});

const createInitialKdriInputs = (): KdriInputs => ({
  age: "",
  height: "",
  weight: "",
  is_black: false,
  is_hypertension: false,
  is_diabetes: false,
  is_cva: false,
  creatinine: "",
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
  const link = document.createElement("a");
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

  const svg = container.querySelector("svg");
  if (!svg) {
    return null;
  }

  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clonedSvg.setAttribute("width", String(width));
  clonedSvg.setAttribute("height", String(height));
  if (!clonedSvg.getAttribute("viewBox")) {
    clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  const svgText = new XMLSerializer().serializeToString(clonedSvg);
  return { svgText, width, height };
};

const patientSurvivalModelIds = ["model-4"] as const;

const buildSurvivalPointsFromApi = (
  data: PredictionApiResponse,
): SurvivalPoint[] =>
  data.survival_years.map((year, index) => ({
    year,
    survival: Math.max(
      0,
      Math.min(
        100,
        Number((data.survival_probabilities[index] * 100).toFixed(1)),
      ),
    ),
  }));

function App() {
  const [language, setLanguage] = useState<Language>("fr");
  const modelTabs = useMemo(() => getModelTabs(language), [language]);
  const [activeTabId, setActiveTabId] = useState<string>(MODEL_TAB_IDS[0]);
  const [statsByModel, setStatsByModel] = useState<
    Record<string, TransplantStats>
  >(() =>
    modelTabs.reduce<Record<string, TransplantStats>>((acc, tab) => {
      acc[tab.id] = createInitialStats();
      return acc;
    }, {}),
  );
  const [model2Inputs, setModel2Inputs] = useState<Model2Inputs>(
    createInitialModel2Inputs,
  );
  const [kdriByModel, setKdriByModel] = useState<Record<string, KdriInputs>>(
    () => ({
      "model-2": createInitialKdriInputs(),
      "model-4": createInitialKdriInputs(),
    }),
  );
  const [predictedRiskByModel, setPredictedRiskByModel] = useState<
    Record<string, number | null>
  >({
    "model-4": null,
  });
  const [apiSurvivalByModel, setApiSurvivalByModel] = useState<
    Record<string, SurvivalPoint[]>
  >({
    "model-4": [],
  });
  const [isPredictingByModel, setIsPredictingByModel] = useState<
    Record<string, boolean>
  >({
    "model-4": false,
  });
  const [predictionErrorByModel, setPredictionErrorByModel] = useState<
    Record<string, string | null>
  >({
    "model-4": null,
  });
  const [model2Histogram, setModel2Histogram] = useState<HistogramBin[]>([]);
  const [model2WaitTimes, setModel2WaitTimes] = useState<number[]>([]);
  const [isModel2Simulating, setIsModel2Simulating] = useState<boolean>(false);
  const [model2SimulationError, setModel2SimulationError] = useState<
    string | null
  >(null);
  const [model4Serology, setModel4Serology] = useState<Model4SerologyInputs>({
    donorCmv: "",
    recipientCmv: "",
    donorEbv: "",
    recipientEbv: "",
  });
  const model1ChartRef = useRef<HTMLDivElement | null>(null);
  const model2ChartRef = useRef<HTMLDivElement | null>(null);

  const activeStats = statsByModel[activeTabId];
  const isModel2 = activeTabId === "model-2";
  const isModel3 = activeTabId === "model-3";
  const isKdriEnabledModel =
    activeTabId === "model-2" || activeTabId === "model-4";
  const isPatientSurvivalModel = patientSurvivalModelIds.includes(
    activeTabId as (typeof patientSurvivalModelIds)[number],
  );
  const isFiniteNumber = (value: number | ""): value is number =>
    typeof value === "number" && Number.isFinite(value);
  const isNonEmptyString = (value: string | null | undefined) =>
    typeof value === "string" && value.trim().length > 0;

  const isKdriValid = (modelId: string) => {
    const kdriInputs = kdriByModel[modelId] ?? createInitialKdriInputs();
    return (
      isFiniteNumber(kdriInputs.age) &&
      kdriInputs.age > 0 &&
      isFiniteNumber(kdriInputs.height) &&
      kdriInputs.height > 0 &&
      isFiniteNumber(kdriInputs.weight) &&
      kdriInputs.weight > 0 &&
      isFiniteNumber(kdriInputs.creatinine) &&
      kdriInputs.creatinine > 0
    );
  };

  const isModel4FormValid = useMemo(() => {
    const stats = statsByModel["model-4"] ?? createInitialStats();
    return (
      isFiniteNumber(stats.AGE) &&
      stats.AGE > 0 &&
      isFiniteNumber(stats.HGT_CM_CALC) &&
      stats.HGT_CM_CALC > 0 &&
      isFiniteNumber(stats.TIME_ON_DIALYSIS) &&
      stats.TIME_ON_DIALYSIS >= 0 &&
      isFiniteNumber(stats.PRA_PRE) &&
      stats.PRA_PRE >= 0 &&
      stats.PRA_PRE <= 100 &&
      isNonEmptyString(stats.GENDER_DON) &&
      isNonEmptyString(stats.GENDER) &&
      isNonEmptyString(stats.DIAG_KI) &&
      isNonEmptyString(stats.MM) &&
      isNonEmptyString(stats.CMV_MM) &&
      isNonEmptyString(stats.EBV_MM) &&
      isKdriValid("model-4")
    );
  }, [kdriByModel, statsByModel]);

  const model2SummaryStats = useMemo(() => {
    if (model2WaitTimes.length === 0) {
      return null;
    }

    const sorted = [...model2WaitTimes].sort((a, b) => a - b);
    const quantile = (q: number) => {
      const index = (sorted.length - 1) * q;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) {
        return sorted[lower];
      }
      const weight = index - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    return {
      median: quantile(0.5),
      q1: quantile(0.25),
      q3: quantile(0.75),
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }, [model2WaitTimes]);

  const isModel2FormValid = useMemo(() => {
    return (
      isNonEmptyString(model2Inputs.birth) &&
      isNonEmptyString(model2Inputs.dialysis) &&
      isNonEmptyString(model2Inputs.arrival) &&
      isNonEmptyString(model2Inputs.blood) &&
      isNonEmptyString(model2Inputs.a1) &&
      isNonEmptyString(model2Inputs.a2) &&
      isNonEmptyString(model2Inputs.b1) &&
      isNonEmptyString(model2Inputs.b2) &&
      isNonEmptyString(model2Inputs.dr1) &&
      isNonEmptyString(model2Inputs.dr2) &&
      isFiniteNumber(model2Inputs.cpra) &&
      model2Inputs.cpra >= 0 &&
      model2Inputs.cpra <= 100 &&

      isKdriValid("model-2")
    );
  }, [kdriByModel, model2Inputs]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    setStatsByModel((prev) => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        [name]:
          type === "checkbox"
            ? checked
            : type === "number"
              ? value === ""
                ? ""
                : parseFloat(value)
              : value,
      },
    }));
  };

  const handleModel4SerologyChange = (
    field: keyof Model4SerologyInputs,
    value: SerologyStatus,
  ) => {
    setModel4Serology((prev) => {
      const next = { ...prev, [field]: value };
      const nextCmvLevel = deriveCmvLevel(next.donorCmv, next.recipientCmv);
      const nextEbvLevel = deriveEbvLevel(next.donorEbv, next.recipientEbv);

      setStatsByModel((prevStats) => ({
        ...prevStats,
        "model-4": {
          ...(prevStats["model-4"] ?? createInitialStats()),
          CMV_MM: nextCmvLevel,
          EBV_MM: nextEbvLevel,
        },
      }));

      return next;
    });
  };

  const handleModel4AfroDescendantChange = (checked: boolean) => {
    setStatsByModel((prev) => ({
      ...prev,
      "model-4": {
        ...(prev["model-4"] ?? createInitialStats()),
        ETHCAT: checked ? "Afro-American" : "Other",
      },
    }));
  };

  const handleModel2Change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    setModel2Inputs((prev) => {
      if (name === "cpra") {
        const parsed = parseInt(value, 10);
        const cpra =
          value === "" || Number.isNaN(parsed)
            ? ""
            : Math.max(0, Math.min(100, parsed));
        return { ...prev, cpra };
      }

      if (name === "blood") {
        return { ...prev, blood: value as Model2Inputs["blood"] };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleKdriChange = (
    modelId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, type, checked, value } = e.target;
    setKdriByModel((prev) => {
      const nextKdriInputs = {
        ...(prev[modelId] ?? createInitialKdriInputs()),
        [name]:
          type === "checkbox" ? checked : value === "" ? "" : parseFloat(value),
      };

      if (modelId === "model-4") {
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

  const computeKdri = (inputs: KdriInputs): number | "" => {
    if (
      !isFiniteNumber(inputs.age) ||
      !isFiniteNumber(inputs.height) ||
      !isFiniteNumber(inputs.weight) ||
      !isFiniteNumber(inputs.creatinine)
    ) {
      return "";
    }

    const ageRisk =
      Math.max(0, inputs.age - 40) * 0.012 +
      Math.max(0, 18 - inputs.age) * 0.01;
    const heightRisk = Math.max(0, 170 - inputs.height) * 0.003;
    const weightRisk = Math.max(0, 80 - inputs.weight) * 0.0025;
    const creatinineMgDl = inputs.creatinine / 88;
    const creatinineRisk = Math.max(0, creatinineMgDl - 1) * 0.18;
    const binaryRisk =
      (inputs.is_black ? 0.18 : 0) +
      (inputs.is_hypertension ? 0.12 : 0) +
      (inputs.is_diabetes ? 0.13 : 0) +
      (inputs.is_cva ? 0.09 : 0) +
      (inputs.is_hcv_pos ? 0.24 : 0) +
      (inputs.is_dcd ? 0.14 : 0);
    const score = Math.exp(
      ageRisk + heightRisk + weightRisk + creatinineRisk + binaryRisk,
    );
    return Number(score.toFixed(2));
  };

  const handlePatientProjectionUpdate = async () => {
    if (!isPatientSurvivalModel) {
      return;
    }

    const modelId = activeTabId as (typeof patientSurvivalModelIds)[number];
    const payload = statsByModel[modelId];
    const kdriInputs = kdriByModel["model-4"] ?? createInitialKdriInputs();
    const ebvLevel = deriveEbvLevel(
      model4Serology.donorEbv,
      model4Serology.recipientEbv,
    );
    const payloadForApi = {
      ...payload,
      IMC: isFiniteNumber(payload.IMC)
        ? payload.IMC
        : isFiniteNumber(kdriInputs.weight)
          ? kdriInputs.weight
          : 0,
      EBV_MM: ebvLevel === "Élevé",
    };

    setIsPredictingByModel((prev) => ({ ...prev, [modelId]: true }));
    setPredictionErrorByModel((prev) => ({ ...prev, [modelId]: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/predict/patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadForApi),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Prediction request failed");
      }

      const data = (await response.json()) as PredictionApiResponse;
      setPredictedRiskByModel((prev) => ({
        ...prev,
        [modelId]: data.risk_score,
      }));
      setApiSurvivalByModel((prev) => ({
        ...prev,
        [modelId]: buildSurvivalPointsFromApi(data),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setPredictionErrorByModel((prev) => ({ ...prev, [modelId]: message }));
      toast.error(
        language === "fr"
          ? "Erreur serveur pour la projection."
          : "Server error during projection.",
        { description: message },
      );
    } finally {
      setIsPredictingByModel((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  const handleModel2Simulation = async () => {
    setIsModel2Simulating(true);
    setModel2SimulationError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/simulate/model2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...model2Inputs,
          num_simulations: 100,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Simulation request failed");
      }

      const data = (await response.json()) as Model2SimulationResponse;
      setModel2WaitTimes(data.wait_times_months);
      setModel2Histogram(waitTimesToHistogram(data.wait_times_months));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setModel2SimulationError(message);
      toast.error(
        language === "fr"
          ? "Erreur serveur pour la simulation."
          : "Server error during simulation.",
        { description: message },
      );
    } finally {
      setIsModel2Simulating(false);
    }
  };

  const survivalData = useMemo(() => {
    if (isPatientSurvivalModel && apiSurvivalByModel[activeTabId]?.length) {
      return apiSurvivalByModel[activeTabId];
    }

    return [];
  }, [activeTabId, apiSurvivalByModel, isPatientSurvivalModel]);
  const survivalChartData = useMemo<SurvivalChartPoint[]>(
    () =>
      survivalData.map((point) => ({
        ...point,
        medianSurvival:
          activeTabId === "model-4"
            ? MEDIAN_PAIR_SURVIVAL_CURVE.find(
                (medianPoint) => medianPoint.year === point.year,
              )?.survival
            : undefined,
      })),
    [activeTabId, survivalData],
  );
  const renderModel1Tooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const selectedPair = payload.find(
      (entry: any) => entry.dataKey === "survival",
    )?.value;
    const medianPair = payload.find(
      (entry: any) => entry.dataKey === "medianSurvival",
    )?.value;
    const yearLabel = Number(label) === 1 ? "année" : "années";

    return (
      <div
        style={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "var(--radius)",
          padding: "0.75rem",
          maxWidth: "280px",
          display: "grid",
          gap: "0.35rem",
        }}
      >
        <div
          style={{ fontWeight: 700 }}
        >{`${label} ${yearLabel} post-greffe`}</div>
        {typeof selectedPair === "number" && (
          <div>{`La probabilité d'être vivant avec un rein fonctionnel (profil saisi): ${selectedPair.toFixed(1)}%`}</div>
        )}
        {typeof medianPair === "number" && (
          <div
            style={{ color: "#dc2626" }}
          >{`La probabilité d'être vivant avec un rein fonctionnel (paire médiane): ${medianPair.toFixed(1)}%`}</div>
        )}
        <div
          style={{
            fontSize: "0.82rem",
            color: "hsl(var(--muted-foreground))",
            marginTop: "0.2rem",
          }}
        >
          Lecture simple: la ligne rouge représente la paire médiane de cohorte,
          l'autre ligne correspond au profil saisi. Plus le pourcentage est
          élevé, meilleures sont les chances de survie à ce moment.
        </div>
      </div>
    );
  };
  const renderModel2Tooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const freq = payload.find(
      (entry: any) => entry.dataKey === "frequence",
    )?.value;
    const annotationByBin: Record<string, string> = {
      "10-11":
        "Après 10 mois, environ 5 % des patients en liste d'attente ont reçu une greffe et environ 2 % sont décédés.",
      "20-21":
        "Après 20 mois, environ 10 % des patients en liste d'attente ont reçu une greffe et environ 5 % sont décédés.",
      "50-51":
        "Après 50 mois, environ 28 % des patients en liste d'attente ont reçu une greffe et environ 14 % sont décédés.",
    };

    return (
      <div
        style={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "var(--radius)",
          padding: "0.75rem",
          maxWidth: "320px",
          display: "grid",
          gap: "0.35rem",
        }}
      >
        <div style={{ fontWeight: 700 }}>{`Intervalle : ${label} mois`}</div>
        {typeof freq === "number" && <div>{`Fréquence : ${freq}`}</div>}
        {annotationByBin[label as string] && (
          <div
            style={{
              fontSize: "0.82rem",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            {annotationByBin[label as string]}
          </div>
        )}
      </div>
    );
  };
  const twoColumnLayoutStyle: React.CSSProperties = {
    display: "grid",
    gap: "2rem",
    gridTemplateColumns: "1fr 2fr",
    alignItems: "start",
  };
  const stickyGraphColumnStyle: React.CSSProperties = {
    display: "grid",
    gap: "2rem",
    position: "sticky",
    top: "6.5rem",
    alignSelf: "start",
  };
  const model3FormGridStyle: React.CSSProperties = {
    display: "grid",
    gap: "0.85rem 1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    alignItems: "end",
  };
  const kdriFieldsGridStyle: React.CSSProperties = {
    display: "grid",
    gap: "0.75rem 1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    alignItems: "end",
  };
  const defaultFormStackStyle: React.CSSProperties = {
    display: "grid",
    gap: "1rem",
  };
  const exportChartAsSvg = (
    container: HTMLDivElement | null,
    fileBaseName: string,
  ) => {
    const payload = getChartSvgPayload(container);
    if (!payload) {
      return;
    }

    const svgBlob = new Blob([payload.svgText], {
      type: "image/svg+xml;charset=utf-8",
    });
    downloadBlob(svgBlob, `${fileBaseName}.svg`);
  };
  const exportChartAsPng = async (
    container: HTMLDivElement | null,
    fileBaseName: string,
  ) => {
    const payload = getChartSvgPayload(container);
    if (!payload) {
      return;
    }

    const svgBlob = new Blob([payload.svgText], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = payload.width;
        canvas.height = payload.height;

        const context = canvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas context unavailable"));
          return;
        }

        context.drawImage(image, 0, 0, payload.width, payload.height);
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${fileBaseName}.png`);
          }
          URL.revokeObjectURL(url);
          resolve();
        }, "image/png");
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to render SVG into PNG"));
      };

      image.src = url;
    });
  };
  const renderExportMenu = (
    container: HTMLDivElement | null,
    fileBaseName: string,
  ) => (
    <details
      style={{
        position: "relative",
        display: "inline-block",
        marginBottom: "0.75rem",
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          width: "2rem",
          height: "2rem",
          borderRadius: "999px",
          border: "1px solid hsl(var(--border))",
          display: "grid",
          placeItems: "center",
          userSelect: "none",
          fontWeight: 700,
          backgroundColor: "hsl(var(--background))",
        }}
        aria-label="Exporter le graphique"
      >
        ...
      </summary>
      <div
        style={{
          position: "absolute",
          top: "2.3rem",
          right: 0,
          zIndex: 20,
          minWidth: "150px",
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "var(--radius)",
          padding: "0.35rem",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
          display: "grid",
          gap: "0.25rem",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            void exportChartAsPng(container, fileBaseName);
            const details = e.currentTarget.closest(
              "details",
            ) as HTMLDetailsElement | null;
            if (details) {
              details.open = false;
            }
          }}
          style={{
            textAlign: "left",
            border: "none",
            background: "transparent",
            padding: "0.45rem 0.55rem",
            borderRadius: "0.35rem",
            cursor: "pointer",
            color: "hsl(var(--foreground))",
          }}
        >
          Export PNG
        </button>
        <button
          type="button"
          onClick={(e) => {
            exportChartAsSvg(container, fileBaseName);
            const details = e.currentTarget.closest(
              "details",
            ) as HTMLDetailsElement | null;
            if (details) {
              details.open = false;
            }
          }}
          style={{
            textAlign: "left",
            border: "none",
            background: "transparent",
            padding: "0.45rem 0.55rem",
            borderRadius: "0.35rem",
            cursor: "pointer",
            color: "hsl(var(--foreground))",
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
          border: "1px solid hsl(var(--border))",
          borderRadius: "var(--radius)",
          padding: "1rem",
          display: "grid",
          gap: "0.85rem",
          backgroundColor: "hsl(var(--muted) / 0.35)",
        }}
      >
        <div style={{ display: "grid", gap: "0.25rem" }}>
          <strong>
            {language === "fr"
              ? "Indice de risque du donneur rénal (KDRI)"
              : "Kidney Donor Risk Index (KDRI)"}
          </strong>
          <span
            style={{
              fontSize: "0.85rem",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            {language === "fr"
              ? "Entrez les variables du donneur ci-dessous. La créatinine est saisie en µmol/L et convertie en mg/dL dans le modèle (mg/dL = µmol/L ÷ 88)."
              : "Enter the donor variables below. Serum creatinine is entered in µmol/L and converted to mg/dL in the model (mg/dL = µmol/L ÷ 88)."}
          </span>
        </div>

        <div style={kdriFieldsGridStyle}>
          <Input
            label={language === "fr" ? "Âge" : "Age"}
            name="age"
            type="number"
            value={kdriInputs.age}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Input
            label={language === "fr" ? "Taille (cm)" : "Height (cm)"}
            name="height"
            type="number"
            value={kdriInputs.height}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Input
            label={language === "fr" ? "Poids (kg)" : "Weight (kg)"}
            name="weight"
            type="number"
            value={kdriInputs.weight}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Input
            label={
              language === "fr"
                ? "Créatinine sérique (µmol/L)"
                : "Serum creatinine (µmol/L)"
            }
            name="creatinine"
            type="number"
            step="0.1"
            value={kdriInputs.creatinine}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label={language === "fr" ? "Descendance afro-américaine" : "African-American ancestry"}
            name="is_black"
            checked={kdriInputs.is_black}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label={language === "fr" ? "Hypertension" : "Hypertension"}
            name="is_hypertension"
            checked={kdriInputs.is_hypertension}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label={language === "fr" ? "Diabète" : "Diabetes"}
            name="is_diabetes"
            checked={kdriInputs.is_diabetes}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label={
              language === "fr"
                ? "Décès par accident vasculaire cérébral"
                : "Cause of Death (CVA)"
            }
            name="is_cva"
            checked={kdriInputs.is_cva}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label={
              language === "fr"
                ? "Sérologie pour l'hépatite C positivie"
                : "Hepatitis C Serology"
            }
            name="is_hcv_pos"
            checked={kdriInputs.is_hcv_pos}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
          <Checkbox
            label={
              language === "fr"
                ? "Décès après arrêt cardio-circulatoire"
                : "Death Following Cardiac Arrest"
            }
            name="is_dcd"
            checked={kdriInputs.is_dcd}
            onChange={(e) => handleKdriChange(modelId, e)}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.65rem",
          }}
        >
          <strong>
            {language === "fr"
              ? `KDRI estimé: ${typeof kdri === "number" ? kdri.toFixed(2) : "?"}`
              : `Estimated KDRI: ${typeof kdri === "number" ? kdri.toFixed(2) : "?"}`}
          </strong>
        </div>
      </div>
    );
  };

  return (
    <Layout language={language} onLanguageChange={setLanguage}>
      <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
        <div
          role="tablist"
          aria-label={language === "fr" ? "Fenêtres de modèles" : "Model tabs"}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            borderBottom: "1px solid hsl(var(--border))",
            paddingBottom: "0.75rem",
          }}
        >
          {modelTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  borderRadius: "999px",
                  border: isActive
                    ? "1px solid hsl(var(--primary))"
                    : "1px solid hsl(var(--border))",
                  backgroundColor: isActive
                    ? "hsl(var(--primary))"
                    : "hsl(var(--background))",
                  color: isActive
                    ? "hsl(var(--primary-foreground))"
                    : "hsl(var(--foreground))",
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.9rem",
                  cursor: "pointer",
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
        <div
          style={
            isModel3
              ? { display: "grid", gap: "1.25rem" }
              : twoColumnLayoutStyle
          }
        >
          <section>
            <Card
              title={
                language === "fr"
                  ? "Variables reliées au donneur"
                  : "Donor-Related Variables"
              }
              description={
                language === "fr"
                  ? "Entrez les variables cliniques du donneur."
                  : "Enter donor clinical variables."
              }
            >
              {isKdriEnabledModel && (
                <div style={{ marginBottom: "1rem" }}>
                  {renderKdriSubsection(activeTabId)}
                </div>
              )}
              <div
                style={isModel3 ? model3FormGridStyle : defaultFormStackStyle}
              >
                {!isKdriEnabledModel && (
                  <>
                    <Input
                      label={
                        language === "fr"
                          ? "Indice de risque du donneur rénal (KDRI)"
                          : "Kidney Donor Risk Index (KDRI)"
                      }
                      name="KDRI_RAO"
                      type="number"
                      value={activeStats.KDRI_RAO}
                      onChange={handleInputChange}
                    />
                    <Input
                      label={language === "fr" ? "Âge" : "Age"}
                      name="AGE"
                      type="number"
                      value={activeStats.AGE}
                      onChange={handleInputChange}
                    />
                    <Input
                      label={language === "fr" ? "Taille (cm)" : "Height (cm)"}
                      name="HGT_CM_CALC"
                      type="number"
                      value={activeStats.HGT_CM_CALC}
                      onChange={handleInputChange}
                    />
                  </>
                )}
                <Select
                  label={language === "fr" ? "Sexe" : "Sex"}
                  name="GENDER_DON"
                  required
                  value={activeStats.GENDER_DON}
                  onChange={handleInputChange}
                  options={[
                    {
                      value: "",
                      label: language === "fr" ? "Sélectionner" : "Select",
                    },
                    {
                      value: "Homme",
                      label: language === "fr" ? "Homme" : "Male",
                    },
                    {
                      value: "Femme",
                      label: language === "fr" ? "Femme" : "Female",
                    },
                    {
                      value: "Autre",
                      label: language === "fr" ? "Autre" : "Other",
                    },
                  ]}
                />
                <Checkbox
                  label={language === "fr" ? "Tabagisme" : "Smoking"}
                  name="TABAC_DON"
                  checked={activeStats.TABAC_DON}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label={
                    language === "fr" ? "Utilisation de cocaine" : "Cocaine use"
                  }
                  name="COCAINE_DON"
                  checked={activeStats.COCAINE_DON}
                  onChange={handleInputChange}
                />
                <Select
                  label={
                    language === "fr"
                      ? "Sérologie pour le CMV du donneur (positif/négatif)"
                      : "Donor CMV serology (positive/negative)"
                  }
                  value={model4Serology.donorCmv}
                  onChange={(e) =>
                    handleModel4SerologyChange(
                      "donorCmv",
                      e.target.value as SerologyStatus,
                    )
                  }
                  options={[
                    {
                      value: "",
                      label: language === "fr" ? "Sélectionner…" : "Select…",
                    },
                    {
                      value: "positive",
                      label: language === "fr" ? "Positif" : "Positive",
                    },
                    {
                      value: "negative",
                      label: language === "fr" ? "Négatif" : "Negative",
                    },
                  ]}
                />
                <Select
                  label={
                    language === "fr"
                      ? "Sérologie pour l'EBV du donneur (positif/négatif/inconnu)"
                      : "Donor EBV serology (positive/negative/unknown)"
                  }
                  value={model4Serology.donorEbv}
                  onChange={(e) =>
                    handleModel4SerologyChange(
                      "donorEbv",
                      e.target.value as SerologyStatus,
                    )
                  }
                  options={[
                    {
                      value: "",
                      label: language === "fr" ? "Sélectionner…" : "Select…",
                    },
                    {
                      value: "positive",
                      label: language === "fr" ? "Positif" : "Positive",
                    },
                    {
                      value: "negative",
                      label: language === "fr" ? "Négatif" : "Negative",
                    },
                    {
                      value: "unknown",
                      label: language === "fr" ? "Inconnu" : "Unknown",
                    },
                  ]}
                />
              </div>
            </Card>

            <Card
              title={
                language === "fr"
                  ? "Variables reliées au receveur"
                  : "Recipient-related variables"
              }
              description={
                language === "fr"
                  ? "Entrez les variables cliniques du receveur."
                  : "Enter recipient clinical variables."
              }
            >
              <div
                style={isModel3 ? model3FormGridStyle : defaultFormStackStyle}
              >
                <Select
                  label={language === "fr" ? "Sexe" : "Sex"}
                  name="GENDER"
                  required
                  value={activeStats.GENDER}
                  onChange={handleInputChange}
                  options={[
                    {
                      value: "",
                      label: language === "fr" ? "Sélectionner…" : "Select…",
                    },
                    {
                      value: "Homme",
                      label: language === "fr" ? "Homme" : "Male",
                    },
                    {
                      value: "Femme",
                      label: language === "fr" ? "Femme" : "Female",
                    },
                    {
                      value: "Autre",
                      label: language === "fr" ? "Autre" : "Other",
                    },
                  ]}
                />
                <Checkbox
                  label={
                    language === "fr"
                      ? "Descendance afro-américaine"
                      : "African-American ancestry"
                  }
                  name="ETHCAT_AFRO"
                  checked={activeStats.ETHCAT === "Afro-American"}
                  onChange={(e) =>
                    handleModel4AfroDescendantChange(e.target.checked)
                  }
                />
                <Select
                  label={
                    language === "fr"
                      ? "Cause de la maladie rénale chronique"
                      : "Cause of chronic kidney disease"
                  }
                  name="DIAG_KI"
                  value={activeStats.DIAG_KI}
                  onChange={handleInputChange}
                  options={[
                    {
                      value: "",
                      label: language === "fr" ? "Sélectionner…" : "Select…",
                    },
                    {
                      value: "Autre ou inconnu",
                      label:
                        language === "fr"
                          ? "Autre ou inconnu"
                          : "Other or unknown",
                    },
                    {
                      value: "Néphropathie diabétique",
                      label:
                        language === "fr"
                          ? "Néphropathie diabétique"
                          : "Diabetic nephropathy",
                    },
                    {
                      value: "Néphrosclérose hypertensive",
                      label:
                        language === "fr"
                          ? "Néphrosclérose hypertensive"
                          : "Hypertensive nephrosclerosis",
                    },
                    {
                      value: "Maladie polykystique rénale",
                      label:
                        language === "fr"
                          ? "Maladie polykystique rénale"
                          : "Polycystic kidney disease",
                    },
                    {
                      value: "Glomérulonéphrite",
                      label:
                        language === "fr"
                          ? "Glomérulonéphrite"
                          : "Glomerulonephritis",
                    },
                  ]}
                />
                <Input
                  label={
                    language === "fr"
                      ? "Temps passé en dialyse (mois)"
                      : "Time on dialysis (months)"
                  }
                  name="TIME_ON_DIALYSIS"
                  type="number"
                  value={activeStats.TIME_ON_DIALYSIS}
                  onChange={handleInputChange}
                />
                <Input
                  label={
                    language === "fr"
                      ? "Pourcentage d'anticorps pré-formés le plus récent (cPRA, %)"
                      : "Most recent percentage of pre-formed antibodies (cPRA, %)"
                  }
                  name="PRA_PRE"
                  type="number"
                  value={activeStats.PRA_PRE}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label={language === "fr" ? "Diabète" : "Diabetes"}
                  name="DIAB"
                  checked={activeStats.DIAB}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label={
                    language === "fr"
                      ? "Maladie vasculaire périphérique"
                      : "Peripheral vascular disease"
                  }
                  name="PERIP_VASC"
                  checked={activeStats.PERIP_VASC}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label={
                    language === "fr"
                      ? "Sérologie HCV positive"
                      : "Positive HCV serology"
                  }
                  name="HCV_REC"
                  checked={activeStats.HCV_REC}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label={
                    language === "fr" ? "HBsAg positif" : "Positive HBsAg"
                  }
                  name="HBV_SUR_ANTIGEN"
                  checked={activeStats.HBV_SUR_ANTIGEN}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label={
                    language === "fr"
                      ? "Histoire de néoplasie"
                      : "History of neoplasia"
                  }
                  name="MALIG"
                  checked={activeStats.MALIG}
                  onChange={handleInputChange}
                />
                <Input
                  label={
                    language === "fr"
                      ? "Nombre de mismatch HLA avec le donneur (A, B ou DR)"
                      : "Number of HLA mismatches with the donor (A, B or DR)"
                  }
                  name="MM"
                  type="text"
                  required
                  value={activeStats.MM}
                  onChange={handleInputChange}
                />
                <Select
                  label={
                    language === "fr"
                      ? "Sérologie pour le receveur CMV (positif/négatif)"
                      : "Recipient CMV serology (positive/negative)"
                  }
                  value={model4Serology.recipientCmv}
                  onChange={(e) =>
                    handleModel4SerologyChange(
                      "recipientCmv",
                      e.target.value as SerologyStatus,
                    )
                  }
                  options={[
                    {
                      value: "",
                      label: language === "fr" ? "Sélectionner…" : "Select…",
                    },
                    {
                      value: "positive",
                      label: language === "fr" ? "Positif" : "Positive",
                    },
                    {
                      value: "negative",
                      label: language === "fr" ? "Négatif" : "Negative",
                    },
                  ]}
                />
                <Select
                  label={
                    language === "fr"
                      ? "Sérologie pour le receveur EBV (positif/négatif/inconnu)"
                      : "Recipient EBV serology (positive/negative/unknown)"
                  }
                  value={model4Serology.recipientEbv}
                  onChange={(e) =>
                    handleModel4SerologyChange(
                      "recipientEbv",
                      e.target.value as SerologyStatus,
                    )
                  }
                  options={[
                    {
                      value: "",
                      label: language === "fr" ? "Sélectionner…" : "Select…",
                    },
                    {
                      value: "positive",
                      label: language === "fr" ? "Positif" : "Positive",
                    },
                    {
                      value: "negative",
                      label: language === "fr" ? "Négatif" : "Negative",
                    },
                    {
                      value: "unknown",
                      label: language === "fr" ? "Inconnu" : "Unknown",
                    },
                  ]}
                />
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {language === "fr"
                    ? `Niveau CMV calculé: ${activeStats.CMV_MM || "-"}`
                    : `Computed CMV level: ${activeStats.CMV_MM || "-"}`}
                </div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {language === "fr"
                    ? `Niveau EBV calculé: ${activeStats.EBV_MM || "-"}`
                    : `Computed EBV level: ${activeStats.EBV_MM || "-"}`}
                </div>
                {isPatientSurvivalModel &&
                  predictedRiskByModel[activeTabId] !== null && (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {`Score de risque (API): ${predictedRiskByModel[activeTabId]?.toFixed(3)}`}
                    </div>
                  )}
                {isPatientSurvivalModel &&
                  predictionErrorByModel[activeTabId] && (
                    <div style={{ fontSize: "0.9rem", color: "#dc2626" }}>
                      {`Erreur API: ${predictionErrorByModel[activeTabId]}`}
                    </div>
                  )}
                <Button
                  onClick={handlePatientProjectionUpdate}
                  disabled={
                    !isPatientSurvivalModel ||
                    !isModel4FormValid ||
                    isPredictingByModel[activeTabId]
                  }
                >
                  {isPredictingByModel[activeTabId]
                    ? "Mise à jour..."
                    : "Mettre à jour les projections"}
                </Button>
              </div>
            </Card>
          </section>

          <section style={isModel3 ? undefined : stickyGraphColumnStyle}>
            <Card
              title={language === "fr" ? "Projection de survie du greffon" : "Graft Survival Projection"}
              description={language === "fr" ? "La probabilité d'être vivant avec un rein fonctionnel." : "Probability of being alive with a functioning graft."}
              headerRight={
                <Button
                  onClick={handlePatientProjectionUpdate}
                  disabled={
                    !isPatientSurvivalModel ||
                    !isModel4FormValid ||
                    isPredictingByModel[activeTabId]
                  }
                >
                  {isPredictingByModel[activeTabId]
                    ? "Mise à jour..."
                    : "Mettre à jour les projections"}
                </Button>
              }
            >
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {renderExportMenu(
                  model1ChartRef.current,
                  "modele-1-projection-survie",
                )}
              </div>
              <div
                ref={model1ChartRef}
                style={{ height: "300px", width: "100%", position: "relative" }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={survivalChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="year"
                      label={{
                        value: "Années post-greffe",
                        position: "insideBottom",
                        offset: -5,
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      label={{
                        value: "Survie %",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip content={activeTabId === "model-4" ? renderModel1Tooltip : undefined} />
                    <Line
                      type="monotone"
                      dataKey="survival"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                    {activeTabId === "model-4" && (
                      <Line
                        dataKey="medianSurvival"
                        type="monotone"
                        stroke="#dc2626"
                        strokeWidth={2}
                        connectNulls={false}
                        isAnimationActive={false}
                        dot={{ fill: "#dc2626", r: 4 }}
                        activeDot={{ fill: "#dc2626", r: 5 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                {survivalChartData.length === 0 &&
                  !isPredictingByModel[activeTabId] && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        padding: "0 1.25rem",
                        textAlign: "center",
                        color: "hsl(var(--muted-foreground))",
                        pointerEvents: "none",
                      }}
                    >
                      mettez a jour les donnees pour voir la distribution des
                      temps d'attente
                    </div>
                  )}
              </div>
            </Card>
          </section>
        </div>
      ) : (
        <div style={twoColumnLayoutStyle}>
          <section>
            <Card
              title="Variables pertinentes pour le modèle de temps d'attente"
              description="Entrez les informations cliniques du candidat."
            >
              <div style={{ marginBottom: "1rem" }}>
                {renderKdriSubsection("model-2")}
              </div>
              <div
                style={{
                  borderTop: "1px solid hsl(var(--border))",
                  marginBottom: "1rem",
                  paddingTop: "0.75rem",
                  fontSize: "0.9rem",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Informations cliniques du candidat
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <Input label="Date de naissance" name="birth" type="date" required value={model2Inputs.birth} onChange={handleModel2Change} />
                <Input label="Date de début de dialyse" name="dialysis" type="date" required value={model2Inputs.dialysis} onChange={handleModel2Change} />
                <Input label="Date d'entrée en liste d'attente" name="arrival" type="date" required value={model2Inputs.arrival} onChange={handleModel2Change} />
                <Select
                  label="Groupe sanguin (ABO)"
                  name="blood"
                  required
                  value={model2Inputs.blood}
                  onChange={handleModel2Change}
                  options={[
                    { value: "", label: language === "fr" ? "Sélectionner…" : "Select…" },
                    { value: "O", label: "O" },
                    { value: "A", label: "A" },
                    { value: "B", label: "B" },
                    { value: "AB", label: "AB" },
                  ]}
                />
                <Input label="HLA-A allèle 1" name="a1" type="text" value={model2Inputs.a1} onChange={handleModel2Change} />
                <Input label="HLA-A allèle 2" name="a2" type="text" value={model2Inputs.a2} onChange={handleModel2Change} />
                <Input label="HLA-B allèle 1" name="b1" type="text" value={model2Inputs.b1} onChange={handleModel2Change} />
                <Input label="HLA-B allèle 2" name="b2" type="text" value={model2Inputs.b2} onChange={handleModel2Change} />
                <Input label="HLA-DR allèle 1" name="dr1" type="text" value={model2Inputs.dr1} onChange={handleModel2Change} />
                <Input label="HLA-DR allèle 2" name="dr2" type="text" value={model2Inputs.dr2} onChange={handleModel2Change} />
                <Input label="cPRA (0-100)" name="cpra" type="number" required min={0} max={100} value={model2Inputs.cpra} onChange={handleModel2Change} />
                <Button onClick={handleModel2Simulation} disabled={!isModel2FormValid || isModel2Simulating}>
                  {isModel2Simulating ? "Simulation en cours..." : "Lancer la simulation"}
                </Button>

                {model2SimulationError && (
                  <div style={{ fontSize: "0.9rem", color: "#dc2626" }}>{`Erreur API: ${model2SimulationError}`}</div>
                )}
                {!model2SimulationError && model2WaitTimes.length > 0 && (
                  <div style={{ fontSize: "0.9rem", color: "hsl(var(--muted-foreground))" }}>
                    {`${model2WaitTimes.length} temps d'attente simulés reçus.`}
                  </div>
                )}
              </div>
            </Card>
          </section>

          <section style={stickyGraphColumnStyle}>
            <Card
              title="Distribution simulée des temps d'attente"
              description="Histogramme des temps d'attente simulés (en mois)."
              headerRight={
                <Button onClick={handleModel2Simulation} disabled={!isModel2FormValid || isModel2Simulating}>
                  {isModel2Simulating ? "Simulation en cours..." : "Lancer la simulation"}
                </Button>
              }
            >
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {renderExportMenu(model2ChartRef.current, "modele-2-histogramme")}
              </div>
              <div ref={model2ChartRef} style={{ height: "300px", width: "100%", position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model2Histogram}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="intervalle" />
                    <YAxis />
                    <Tooltip content={renderModel2Tooltip} />
                    <Bar dataKey="frequence" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {model2WaitTimes.length === 0 && !isModel2Simulating && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      padding: "0 1.25rem",
                      textAlign: "center",
                      color: "hsl(var(--muted-foreground))",
                      pointerEvents: "none",
                    }}
                  >
                    mettez a jour les donnees pour voir la distribution des
                    temps d'attente
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.88rem",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Avertissement : la simulation peut prendre jusqu'à 15 secondes.
              </div>
              {model2SummaryStats && (
                <ul
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.9rem",
                    color: "hsl(var(--muted-foreground))",
                    paddingLeft: "1.2rem",
                    display: "grid",
                    gap: "0.35rem",
                  }}
                >
                  <li>
                    Médiane : {model2SummaryStats.median.toFixed(1)} mois — temps d'attente typique attendu pour un candidat moyen.
                  </li>
                  <li>
                    Écart inter-quartiles (Q1-Q3) : {model2SummaryStats.q1.toFixed(1)}-{model2SummaryStats.q3.toFixed(1)} mois — zone où se trouve la moitié centrale des simulations.
                  </li>
                  <li>
                    Étendue (min-max) : {model2SummaryStats.min.toFixed(1)}-{model2SummaryStats.max.toFixed(1)} mois — valeurs extrêmes observées dans les simulations.
                  </li>
                </ul>
              )}
            </Card>
          </section>
        </div>
      )}
    </Layout>
  );
}

export default App;




























