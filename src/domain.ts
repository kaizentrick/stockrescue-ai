export type Port = {
  connector: "HDMI" | "USB-C";
  protocol: "HDMI" | "DP_ALT" | "DATA_ONLY" | "UNKNOWN";
  maxHz4k: number;
};
export type Accessory = {
  id: string;
  name: string;
  input: "USB-C";
  output: "HDMI";
  protocol: "DP_ALT";
  maxHz4k: number;
  assignedTo?: string;
};
export type Workplace = {
  id: string;
  name: string;
  laptop: string;
  monitor: string;
  outputs: Port[];
  inputs: Port[];
  cable: string;
  cableSpec?: {
    input: "HDMI" | "USB-C";
    output: "HDMI" | "USB-C";
    protocol: "HDMI" | "DATA_ONLY" | "UNKNOWN";
    maxHz4k: number;
  };
  requiredHz4k: number;
};
export type Diagnosis = {
  decision: "NO_PURCHASE" | "BUY" | "NEEDS_INFO";
  title: string;
  reasons: string[];
  alternatives: { name: string; result: string }[];
  accessoryId?: string;
};
export type Product = Accessory & {
  merchant: string;
  price: number;
  shipping: number;
  tax: number;
  available: boolean;
  fixture: true;
};
export type Quote = {
  id: string;
  evidenceHash: string;
  workplaceId: string;
  variantId: string;
  product: string;
  merchant: string;
  quantity: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: "MXN";
  delivery: string;
  destination: string;
  expiresAt: string;
  fixture: true;
};
export type Audit = { at: string; event: string; detail: string };
export type Operation = {
  key: string;
  createdAt: string;
  mockOutcome?: "completed" | "timeout" | "failed" | "expired";
  quote: Quote;
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  checkoutId?: string;
  orderId?: string;
  finalAmount?: number;
  note: string;
};
export type Case = {
  id: string;
  workplace: Workplace;
  scenario: "normal" | "unknown";
  budget: number;
  diagnosis?: Diagnosis;
  quote?: Quote;
  approval?: { hash: string; at: string; by: string };
  canceled: boolean;
  operation?: Operation;
  attempts?: Operation[];
  quoteHistory?: Quote[];
  approvalHistory?: { hash: string; at: string; by: string }[];
  audit: Audit[];
};
export const workplaces: Workplace[] = [
  {
    id: "P-01",
    name: "Administración",
    laptop: "Fixture L1 · HDMI 2.0",
    monitor: "Fixture M1 · HDMI 2.0",
    outputs: [
      { connector: "HDMI", protocol: "HDMI", maxHz4k: 60 },
      { connector: "USB-C", protocol: "DATA_ONLY", maxHz4k: 0 },
    ],
    inputs: [{ connector: "HDMI", protocol: "HDMI", maxHz4k: 60 }],
    cable: "HDMI 2.0 · 4K/60 Hz",
    cableSpec: { input: "HDMI", output: "HDMI", protocol: "HDMI", maxHz4k: 60 },
    requiredHz4k: 60,
  },
  {
    id: "P-02",
    name: "Operaciones",
    laptop: "Fixture L2 · USB-C con DP Alt",
    monitor: "Fixture M2 · HDMI 2.0",
    outputs: [{ connector: "USB-C", protocol: "DP_ALT", maxHz4k: 60 }],
    inputs: [{ connector: "HDMI", protocol: "HDMI", maxHz4k: 60 }],
    cable: "HDMI 2.0 · 4K/60 Hz",
    cableSpec: { input: "HDMI", output: "HDMI", protocol: "HDMI", maxHz4k: 60 },
    requiredHz4k: 60,
  },
  {
    id: "P-03",
    name: "Diseño",
    laptop: "Fixture L3 · USB-C con DP Alt",
    monitor: "Fixture M3 · HDMI 2.0",
    outputs: [{ connector: "USB-C", protocol: "DP_ALT", maxHz4k: 60 }],
    inputs: [{ connector: "HDMI", protocol: "HDMI", maxHz4k: 60 }],
    cable: "HDMI 2.0 · 4K/60 Hz",
    cableSpec: { input: "HDMI", output: "HDMI", protocol: "HDMI", maxHz4k: 60 },
    requiredHz4k: 60,
  },
];
export const accessories: Accessory[] = [
  {
    id: "A-01",
    name: "Adaptador existente · 4K/60 Hz",
    input: "USB-C",
    output: "HDMI",
    protocol: "DP_ALT",
    maxHz4k: 60,
    assignedTo: "P-02",
  },
  {
    id: "A-02",
    name: "Adaptador libre · 4K/30 Hz",
    input: "USB-C",
    output: "HDMI",
    protocol: "DP_ALT",
    maxHz4k: 30,
  },
];
export const catalog: Product[] = [
  {
    id: "FIX-ADAPTER-60",
    name: "Adaptador USB-C DP Alt a HDMI · 4K/60 Hz",
    input: "USB-C",
    output: "HDMI",
    protocol: "DP_ALT",
    maxHz4k: 60,
    merchant: "fixture-office",
    price: 24900,
    shipping: 4900,
    tax: 3984,
    available: true,
    fixture: true,
  },
  {
    id: "FIX-CABLE-60",
    name: "Cable directo USB-C DP Alt a HDMI · 4K/60 Hz",
    input: "USB-C",
    output: "HDMI",
    protocol: "DP_ALT",
    maxHz4k: 60,
    merchant: "fixture-office",
    price: 32900,
    shipping: 4900,
    tax: 5264,
    available: true,
    fixture: true,
  },
  {
    id: "FIX-ADAPTER-30",
    name: "Adaptador USB-C a HDMI · 4K/30 Hz",
    input: "USB-C",
    output: "HDMI",
    protocol: "DP_ALT",
    maxHz4k: 30,
    merchant: "fixture-office",
    price: 9900,
    shipping: 4900,
    tax: 1584,
    available: true,
    fixture: true,
  },
];
export function usableHdmiCable(w: Workplace): boolean {
  const cable = w.cableSpec;
  return (
    !!cable &&
    cable.input === "HDMI" &&
    cable.output === "HDMI" &&
    cable.protocol === "HDMI" &&
    cable.maxHz4k >= w.requiredHz4k
  );
}
export function compatible(w: Workplace, a: Accessory): boolean {
  return (
    w.outputs.some(
      (p) =>
        p.connector === a.input &&
        p.protocol === a.protocol &&
        p.maxHz4k >= w.requiredHz4k,
    ) &&
    w.inputs.some(
      (p) =>
        p.connector === a.output &&
        p.protocol === "HDMI" &&
        p.maxHz4k >= w.requiredHz4k,
    ) &&
    a.maxHz4k >= w.requiredHz4k &&
    usableHdmiCable(w)
  );
}
export function diagnose(w: Workplace): Diagnosis {
  const direct =
    w.outputs.some(
      (p) => p.protocol === "HDMI" && p.maxHz4k >= w.requiredHz4k,
    ) &&
    w.inputs.some(
      (p) => p.protocol === "HDMI" && p.maxHz4k >= w.requiredHz4k,
    ) &&
    usableHdmiCable(w);
  const alternatives = [
    {
      name: "Conexión directa con cable existente",
      result: direct
        ? "Compatible: HDMI 2.0 a HDMI 2.0; 4K/60 Hz."
        : "No hay una ruta HDMI directa completa que alcance la capacidad requerida.",
    },
    ...accessories.map((a) => ({
      name: a.id + " · " + a.name,
      result:
        a.assignedTo && a.assignedTo !== w.id
          ? "Asignado a otro puesto; no se retira."
          : compatible(w, a)
            ? "Compatible con los puertos y 4K/60 Hz."
            : "Incompatible o no verificable: no alcanza la capacidad requerida.",
    })),
  ];
  if (direct)
    return {
      decision: "NO_PURCHASE",
      title: "No hace falta comprar",
      reasons: [
        "Conecta el cable HDMI existente directamente. Verifica imagen y frecuencia en el puesto.",
      ],
      alternatives,
    };
  if (w.outputs.some((p) => p.protocol === "UNKNOWN") || !usableHdmiCable(w))
    return {
      decision: "NEEDS_INFO",
      title: "Falta información para decidir",
      reasons: [
        "Verifica salida de vídeo, protocolo y cable: conectores HDMI en ambos extremos y capacidad 4K/60 Hz. Para USB-C confirma DisplayPort Alt Mode; la forma del conector no prueba vídeo. Si el cable es incompatible, documenta una ruta completa alternativa antes de cotizar.",
      ],
      alternatives,
    };
  const reusable = accessories.find(
    (a) => (!a.assignedTo || a.assignedTo === w.id) && compatible(w, a),
  );
  if (reusable)
    return {
      decision: "NO_PURCHASE",
      title: "No hace falta comprar",
      reasons: [
        `Reutiliza ${reusable.id}, disponible para este puesto, con el cable HDMI existente.`,
      ],
      alternatives,
      accessoryId: reusable.id,
    };
  if (!catalog.some((p) => compatible(w, p)))
    return {
      decision: "NEEDS_INFO",
      title: "No hay ruta compatible verificada",
      reasons: [
        "Documenta una salida de vídeo compatible antes de buscar un componente.",
      ],
      alternatives,
    };
  return {
    decision: "BUY",
    title: "Se necesita un componente compatible",
    reasons: [
      "A-01 permanece en P-02; A-02 solo alcanza 4K/30 Hz. El puesto requiere 4K/60 Hz.",
      "La compra mínima es un adaptador; un cable directo USB-C a HDMI también funciona, con mayor total en este fixture.",
    ],
    alternatives,
  };
}
export function selectProduct(
  w: Workplace,
  products: Product[] = catalog,
): Product {
  const sorted = products
    .filter(
      (p) => p.merchant === "fixture-office" && p.available && compatible(w, p),
    )
    .sort(
      (a, b) =>
        a.price + a.shipping + a.tax - (b.price + b.shipping + b.tax) ||
        a.id.localeCompare(b.id),
    );
  if (!sorted[0])
    throw new Error("No hay variante compatible en un proveedor admitido.");
  return sorted[0];
}
