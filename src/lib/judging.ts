export type CriterionDef = {
  key: string;
  label: string;
  max: number;
  hints?: string[];
};

export type RubricDef = {
  phaseNumber: number;
  title: string;
  question?: string;
  criteria: CriterionDef[];
};

/** Critères universels (présentation / défaut) */
export const UNIVERSAL_RUBRIC: RubricDef = {
  phaseNumber: 0,
  title: "Critères universels",
  question: "Est-ce que cet artiste possède déjà une identité ?",
  criteria: [
    {
      key: "technique",
      label: "Technique",
      max: 20,
      hints: ["Placement", "Respiration", "Maîtrise du rythme", "Fluidité"],
    },
    {
      key: "flow",
      label: "Flow",
      max: 20,
      hints: ["Variations", "Énergie", "Musicalité", "Maîtrise de la prod"],
    },
    {
      key: "ecriture",
      label: "Écriture",
      max: 20,
      hints: ["Richesse des rimes", "Punchlines", "Construction", "Originalité"],
    },
    {
      key: "interpretation",
      label: "Interprétation",
      max: 20,
      hints: ["Émotions", "Présence vocale", "Intentions", "Conviction"],
    },
    {
      key: "impact",
      label: "Impact artistique",
      max: 20,
      hints: ["Identité", "Charisme", "Rejouabilité", "Impression générale"],
    },
  ],
};

const RUBRICS: RubricDef[] = [
  UNIVERSAL_RUBRIC,
  {
    phaseNumber: 1,
    title: "Freestyle libre",
    question: "Est-ce que cet artiste possède déjà une identité ?",
    criteria: [
      { key: "technique", label: "Technique", max: 20 },
      { key: "flow", label: "Flow", max: 25 },
      { key: "originalite", label: "Originalité", max: 20 },
      { key: "presence", label: "Présence", max: 20 },
      { key: "impact", label: "Impact", max: 15 },
    ],
  },
  {
    phaseNumber: 2,
    title: "Thème imposé",
    question: "A-t-il réellement raconté quelque chose ?",
    criteria: [
      { key: "ecriture", label: "Écriture", max: 35 },
      { key: "theme", label: "Respect du thème", max: 20 },
      { key: "technique", label: "Technique", max: 15 },
      { key: "flow", label: "Flow", max: 15 },
      { key: "emotions", label: "Émotions", max: 15 },
    ],
  },
  {
    phaseNumber: 3,
    title: "Hors zone de confort",
    question: "Est-il capable d'être bon partout ?",
    criteria: [
      { key: "adaptation", label: "Adaptation", max: 30 },
      { key: "technique", label: "Technique", max: 20 },
      { key: "flow", label: "Flow", max: 20 },
      { key: "creativite", label: "Créativité", max: 15 },
      { key: "interpretation", label: "Interprétation", max: 15 },
    ],
  },
  {
    phaseNumber: 4,
    title: "Feat tiré au sort",
    question: "Les deux artistes forment-ils un vrai duo ?",
    criteria: [
      { key: "complementarite", label: "Complémentarité", max: 30 },
      { key: "transitions", label: "Transitions", max: 20 },
      { key: "qualite", label: "Qualité musicale", max: 20 },
      { key: "technique", label: "Technique individuelle", max: 15 },
      { key: "creativite", label: "Créativité", max: 15 },
    ],
  },
  {
    phaseNumber: 5,
    title: "Feat surprise",
    question: "Les deux artistes forment-ils un vrai duo malgré la contrainte ?",
    criteria: [
      { key: "complementarite", label: "Complémentarité", max: 25 },
      { key: "transitions", label: "Transitions", max: 15 },
      { key: "qualite", label: "Qualité musicale", max: 15 },
      { key: "technique", label: "Technique individuelle", max: 10 },
      { key: "creativite", label: "Créativité", max: 5 },
      { key: "adaptation", label: "Capacité d'adaptation", max: 20 },
      { key: "communication", label: "Communication", max: 10 },
    ],
  },
  {
    phaseNumber: 6,
    title: "Remix",
    question: "Ont-ils créé une nouvelle version ou seulement copié ?",
    criteria: [
      { key: "respect", label: "Respect de l'œuvre", max: 20 },
      { key: "originalite", label: "Originalité", max: 30 },
      { key: "technique", label: "Technique", max: 15 },
      { key: "modernisation", label: "Modernisation", max: 20 },
      { key: "impact", label: "Impact", max: 15 },
    ],
  },
  {
    phaseNumber: 7,
    title: "Clash",
    criteria: [
      { key: "punchlines", label: "Punchlines", max: 30 },
      { key: "repartee", label: "Répartie", max: 20 },
      { key: "technique", label: "Technique", max: 20 },
      { key: "humour", label: "Humour", max: 15 },
      { key: "impact", label: "Impact", max: 15 },
    ],
  },
  {
    phaseNumber: 8,
    title: "Storytelling",
    question: "Ai-je eu l'impression d'écouter un film ?",
    criteria: [
      { key: "recit", label: "Construction du récit", max: 30 },
      { key: "emotions", label: "Émotions", max: 20 },
      { key: "ecriture", label: "Écriture", max: 20 },
      { key: "interpretation", label: "Interprétation", max: 20 },
      { key: "originalite", label: "Originalité", max: 10 },
    ],
  },
  {
    phaseNumber: 9,
    title: "Le Hit",
    question: "Ce morceau peut-il conquérir le public ?",
    criteria: [
      { key: "commercial", label: "Potentiel commercial", max: 30 },
      { key: "refrain", label: "Refrain", max: 25 },
      { key: "replay", label: "Replay value", max: 20 },
      { key: "technique", label: "Technique", max: 15 },
      { key: "impact", label: "Impact", max: 10 },
    ],
  },
  {
    phaseNumber: 10,
    title: "Clip flash",
    criteria: [
      { key: "realisation", label: "Réalisation", max: 30 },
      { key: "creativite", label: "Créativité", max: 25 },
      { key: "coherence", label: "Cohérence clip / musique", max: 25 },
      { key: "montage", label: "Montage", max: 20 },
    ],
  },
  {
    phaseNumber: 11,
    title: "Sample classique",
    criteria: [
      { key: "sample", label: "Respect du sample", max: 20 },
      { key: "modernite", label: "Modernité", max: 20 },
      { key: "ecriture", label: "Écriture", max: 20 },
      { key: "technique", label: "Technique", max: 20 },
      { key: "creativite", label: "Créativité", max: 20 },
    ],
  },
  {
    phaseNumber: 12,
    title: "Grande finale · L'œuvre ultime",
    question: "Ce morceau représente-t-il vraiment l'artiste ?",
    criteria: [
      { key: "authenticite", label: "Authenticité", max: 20 },
      { key: "ecriture", label: "Écriture", max: 20 },
      { key: "da", label: "Direction artistique", max: 15 },
      { key: "technique", label: "Technique", max: 15 },
      { key: "flow", label: "Flow", max: 10 },
      { key: "interpretation", label: "Interprétation", max: 10 },
      { key: "emotion", label: "Impact émotionnel", max: 10 },
    ],
  },
];

const CRITERION_HINTS: Record<string, string[]> = {
  technique: ["Placement", "Respiration", "Maîtrise du rythme", "Fluidité"],
  flow: ["Variations", "Énergie", "Musicalité", "Maîtrise de la prod"],
  ecriture: ["Richesse des rimes", "Punchlines", "Construction", "Originalité"],
  interpretation: ["Émotions", "Présence vocale", "Intentions", "Conviction"],
  impact: ["Identité", "Charisme", "Rejouabilité", "Impression générale"],
  originalite: ["Signature", "Prises de risque", "Différenciation"],
  presence: ["Charisme", "Conviction", "Tenue du morceau"],
  theme: ["Clarté du message", "Lien avec le thème", "Profondeur"],
  emotions: ["Sincérité", "Intensité", "Connexion"],
  adaptation: ["Souplesse", "Réactivité", "Sortie de zone"],
  creativite: ["Idées neuves", "Angles inattendus"],
  complementarite: ["Équilibre", "Écoute mutuelle", "Cohésion"],
  transitions: ["Enchaînements", "Continuum musical"],
  qualite: ["Prod", "Mix", "Finition"],
  communication: ["Échanges", "Complicité artistique"],
};

export function getRubricForPhase(phaseNumber: number): RubricDef {
  const base =
    RUBRICS.find((r) => r.phaseNumber === phaseNumber) ?? UNIVERSAL_RUBRIC;
  return {
    ...base,
    criteria: base.criteria.map((criterion) => ({
      ...criterion,
      hints: criterion.hints ?? CRITERION_HINTS[criterion.key],
    })),
  };
}

export function rubricTotalMax(rubric: RubricDef): number {
  return rubric.criteria.reduce((sum, c) => sum + c.max, 0);
}

export function clampCriterion(value: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}

export function computeRubricTotal(
  rubric: RubricDef,
  values: Record<string, number>,
): number {
  return rubric.criteria.reduce((sum, criterion) => {
    return sum + clampCriterion(values[criterion.key] ?? 0, criterion.max);
  }, 0);
}

export function parseBreakdown(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(value);
    if (!Number.isNaN(n)) result[key] = n;
  }
  return result;
}
