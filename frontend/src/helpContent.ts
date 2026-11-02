export type FeatureStatus = "available" | "alpha" | "soon";

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, { icon: string; label: string; tone: string }> = {
  available: { icon: "✅", label: "Available Now", tone: "text-emerald-300" },
  alpha: { icon: "🧪", label: "Alpha", tone: "text-amber-300" },
  soon: { icon: "🚧", label: "Coming Soon", tone: "text-sky-300" },
};

export const QUICK_START_STEPS = [
  "Create a job manually or import from MakerWorld.  Coming soon: Printables, Thingiverse, Cults3D",
  "Enter print time, materials and customer details.",
  "Save the job to calculate costs automatically.",
  "Move the job through Quote, Production and Completed stages.",
  "Create an invoice when work is finished.",
];

// Add new releases at the top. Each entry is shown under "What's New"; the newest entry is labelled with the running version.
export interface ReleaseHighlight {
  text: string;
  status?: FeatureStatus;
}

export const WHATS_NEW: ReleaseHighlight[] = [
  { text: "Redesigned Materials page with collapsible type groups, search, sorting and stock health status", status: "available" },
  { text: "MakerFlow User Guide with Quick Start, support card and collapsible help topics", status: "available" },
  { text: "MakerWorld import fills print time, materials and creator from the first print profile", status: "available" },
  { text: "Model previews are cached as small thumbnail links to keep storage low", status: "available" },
  { text: "Custom branding and business logo support", status: "available" },
  { text: "Reporting improvements", status: "available" },
  { text: "Enhanced billing configuration", status: "available" },
  { text: "Improved backup and restore features", status: "available" },
];

export const CHANGELOG_URL = "https://github.com/bloodygoodbloke/laser-and-3dprint-tracker/blob/main/docs/CHANGELOG.md";
export const DEFAULT_ISSUES_REPOSITORY = "bloodygoodbloke/laser-and-3dprint-tracker";

export type HelpRequestType = "Bug" | "Feature Request" | "Integration Request" | "Improvement Suggestion";
export type HelpPriority = "P1 Critical" | "P1 High" | "P2 Medium" | "P3 Low";

export const REQUEST_TYPES: { value: HelpRequestType; label: string; hint: string; placeholder: string }[] = [
  { value: "Bug", label: "Bug Report", hint: "Something is broken or not working as expected.", placeholder: "What happened, what did you expect, and how can we reproduce it?" },
  { value: "Feature Request", label: "Feature Request", hint: "Something new you would like MakerFlow to do.", placeholder: "What problem should this solve, and what outcome would you like?" },
  { value: "Integration Request", label: "Integration Request", hint: "Connect MakerFlow to another site, printer or service.", placeholder: "Which site, printer or service, and what should MakerFlow do with it?" },
  { value: "Improvement Suggestion", label: "Improvement Suggestion", hint: "Make something that already exists easier or clearer.", placeholder: "What is awkward today, and how could it work better?" },
];

export const PRIORITIES: { value: HelpPriority; label: string; hint: string }[] = [
  { value: "P1 Critical", label: "Critical", hint: "Blocks you from working." },
  { value: "P1 High", label: "High", hint: "A major problem with no easy workaround." },
  { value: "P2 Medium", label: "Medium", hint: "Affects you, but you can work around it." },
  { value: "P3 Low", label: "Low", hint: "Nice to have." },
];
