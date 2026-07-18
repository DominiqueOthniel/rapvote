export type EpisodeStage = "episode" | "demi" | "finale";

export type EpisodeDef = {
  number: number;
  code: string;
  title: string;
  slogan?: string;
  stage: EpisodeStage;
  objective: string;
  flow?: string[];
  conditions?: string[];
  juryCriteria?: string[];
  notes?: string[];
  examples?: string[];
};

export const COMPETITION_BRAND = "N£₩ St@r ₽uN€h";
export const COMPETITION_NAME = "New Star Punch";

export const COMPETITION_CONCLUSION =
  "N£₩ St@r ₽uN€h n'est pas seulement un concours de rap.";

export const EPISODES: EpisodeDef[] = [
  {
    number: 0,
    code: "E0",
    title: "Présentation",
    stage: "episode",
    objective: "Faire découvrir votre identité artistique.",
    flow: [
      "Son nom de scène",
      "Son univers artistique (DA)",
      "Un extrait démontrant son style",
    ],
    notes: [
      "Cette étape permet au jury ainsi qu'au public de découvrir l'artiste avant le début officiel de la compétition.",
    ],
  },
  {
    number: 1,
    code: "E1",
    title: "Freestyle libre",
    slogan: "Laissez parler votre instinct.",
    stage: "episode",
    objective:
      "Exprimer librement sa personnalité sans aucune contrainte artistique.",
    conditions: [
      "Même instrumentale pour tous",
      "Instrumentale imposée par le jury",
      "Aucun thème imposé",
    ],
    juryCriteria: [
      "Technique",
      "Flow",
      "Placement",
      "Présence",
      "Originalité",
      "Impact artistique",
    ],
  },
  {
    number: 2,
    code: "E2",
    title: "Thème imposé",
    slogan: "Les mots doivent servir une idée.",
    stage: "episode",
    objective: "Démontrer votre qualité d'écriture.",
    conditions: [
      "Même instrumentale pour tous",
      "Même thème imposé par le jury",
    ],
    examples: [
      "La rue",
      "La famille",
      "La solitude",
      "L'immigration",
      "L'espoir",
      "La réussite",
    ],
    juryCriteria: [
      "Profondeur du texte",
      "Cohérence",
      "Images",
      "Émotions",
    ],
  },
  {
    number: 3,
    code: "E3",
    title: "Hors de votre zone de confort",
    slogan: "Les grands artistes savent tout faire.",
    stage: "episode",
    objective: "Prouver votre capacité d'adaptation.",
    examples: [
      "Un rappeur Trap pourra recevoir une Boom Bap",
      "Un artiste Boom Bap pourra recevoir une Afro ou une Drill",
    ],
    conditions: ["Instrumentale imposée", "Thème libre"],
    juryCriteria: [
      "Polyvalence",
      "Adaptation",
      "Créativité",
      "Qualité musicale",
    ],
  },
  {
    number: 4,
    code: "E4",
    title: "Feat tiré au sort",
    slogan: "Deux artistes. Une seule vision.",
    stage: "episode",
    objective: "Créer un morceau à deux après tirage au sort des binômes.",
    conditions: [
      "Binômes désignés par tirage au sort",
      "Instrumentale attribuée au hasard",
      "Thème libre choisi par chaque duo",
    ],
    juryCriteria: [
      "Cohésion",
      "Complémentarité",
      "Transitions",
      "Alchimie",
      "Qualité globale du morceau",
    ],
  },
  {
    number: 5,
    code: "E5",
    title: "Feat surprise",
    slogan: "Créer avec l'inattendu.",
    stage: "episode",
    objective:
      "Créer une véritable connexion artistique malgré des contraintes imposées.",
    conditions: [
      "Le jury décide des binômes",
      "Le jury décide des instrumentales",
      "Le thème est imposé ou tiré au sort par le jury",
    ],
  },
  {
    number: 6,
    code: "E6",
    title: "Remix",
    slogan: "Soit le classique vous dévore… Soit vous lui redonnez vie.",
    stage: "episode",
    objective:
      "Créer une version totalement réinventée d'un morceau emblématique choisi par le jury.",
    juryCriteria: [
      "Originalité",
      "Respect de l'œuvre",
      "Identité artistique",
      "Qualité de la réinterprétation",
    ],
  },
  {
    number: 7,
    code: "E7",
    title: "Clash",
    slogan: "Les mots sont vos seules armes.",
    stage: "episode",
    objective: "S'affronter par les mots, dans les limites imposées.",
    conditions: [
      "Tout est permis sauf attaques familiales",
      "Propos discriminatoires interdits",
      "Menaces réelles interdites",
      "Production libre",
    ],
    juryCriteria: [
      "Punchlines",
      "Humour",
      "Répartie",
      "Flow",
      "Technique",
      "Impact",
    ],
  },
  {
    number: 8,
    code: "E8",
    title: "Storytelling",
    slogan: "Faites vivre une histoire.",
    stage: "episode",
    objective: "Raconter une histoire complète avec début, développement et fin.",
    conditions: [
      "Thème libre",
      "Histoire libre",
      "Instrumentale libre",
      "Textes entièrement inédits",
    ],
    notes: [
      "Tout plagiat confirmé entraînera une pénalité.",
    ],
  },
  {
    number: 9,
    code: "E9",
    title: "Le Hit",
    slogan: "Le morceau qui peut conquérir le public.",
    stage: "episode",
    objective:
      "Imaginer le morceau qui pourrait tourner en radio ou exploser sur les plateformes.",
    notes: [
      "Le public vote pour son Hit préféré.",
      "Le vote du public n'ajoute aucun point.",
      "Il sert uniquement à départager des candidats à égalité de moyenne jury.",
      "Le jury reste le seul décisionnaire de la notation.",
    ],
  },
  {
    number: 10,
    code: "DF1",
    title: "Demi-finale · Clip flash",
    slogan: "48 heures. Un smartphone. Zéro budget.",
    stage: "demi",
    objective:
      "Réaliser un clip du couplet et du refrain de leur Hit.",
    conditions: [
      "48 heures maximum",
      "Smartphone uniquement",
      "Zéro budget",
    ],
    juryCriteria: [
      "Réalisation",
      "Créativité",
      "Mise en scène",
      "Cohérence image / musique",
    ],
  },
  {
    number: 11,
    code: "DF2",
    title: "Demi-finale · Le sample classique",
    slogan: "Soit vous entrez dans l'histoire… Soit le classique vous dévore.",
    stage: "demi",
    objective:
      "Créer un morceau inédit en 24 heures sur une production moderne intégrant le sample d'un classique du rap.",
    conditions: [
      "Sample classique imposé",
      "Production moderne imposée",
      "24 heures maximum",
    ],
    juryCriteria: [
      "Respect du classique",
      "Modernité",
      "Technique",
      "Écriture",
      "Flow",
      "Créativité",
    ],
  },
  {
    number: 12,
    code: "GF",
    title: "Grande finale · L'œuvre ultime",
    slogan: "Le morceau d'une vie.",
    stage: "finale",
    objective:
      "Livrer le morceau qui vous représente le mieux, celui dont vous serez fier dans dix ans.",
    conditions: [
      "Aucune limite",
      "Aucune contrainte",
      "Production libre",
      "Thème libre",
      "Univers et direction artistique libres",
    ],
    notes: [
      "Le public intervient exceptionnellement dans le résultat final.",
      "Des points bonus pourront être attribués selon un système de vote communiqué avant la finale.",
      "Cette ultime prestation devra convaincre à la fois le jury et le public.",
    ],
  },
];

export function getEpisodeByNumber(number: number) {
  return EPISODES.find((episode) => episode.number === number) ?? null;
}

export function getEpisodeLabel(episode: EpisodeDef) {
  if (episode.stage === "finale") return "Finale";
  if (episode.stage === "demi") return "Demi-finale";
  return `Épisode ${episode.number}`;
}

export function formatEpisodeCode(episode: EpisodeDef) {
  return episode.code;
}

/** Compat seed / admin : thèmes courts dérivés du parcours. */
export const PHASE_THEMES = EPISODES.map((episode) => episode.title);
