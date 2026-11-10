import React from "react";
import {
  Brain,
  Target,
  Palette,
  PenTool,
  TrendingUp,
  Briefcase,
  Code,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  FileCode,
  Layers,
  Search,
  Video,
  Film,
  Terminal,
  Database,
  Server,
  Compass,
  BarChart3,
  UserCheck,
  Clock,
  Settings,
  Radio,
  FileText,
  Lock,
} from "lucide-react";

export const AGENT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  // Research & Strategy
  "dr-ibrahim": Brain,
  "data-analyst": BarChart3,
  "ux-researcher": Compass,
  "market-researcher": Search,
  "competitor-analyst": Target,

  // Marketing & Strategy
  ragaa: Target,
  "media-buyer": TrendingUp,
  "seo-specialist": Search,
  "social-media-manager": Radio,
  "content-strategist": FileText,
  "growth-hacker": Sparkles,

  // Creative & Design
  fawzyia: Palette,
  copywriter: PenTool,
  "ui-ux-designer": Layers,
  "brand-identity-designer": Sparkles,
  "motion-designer": Video,
  illustrator: Palette,

  // Video Production
  "video-director": Video,
  scriptwriter: FileCode,
  "storyboard-artist": Layers,
  "video-editor": Film,
  "sound-designer": Radio,

  // Engineering & Tech
  mahmoud: Code,
  "frontend-dev": Terminal,
  "backend-dev": Database,
  "devops-engineer": Server,
  "qa-automation-engineer": CheckCircle2,
  "security-engineer": Lock,

  // Sales & CRM
  "sales-manager": Briefcase,
  "lead-qualifier": UserCheck,
  "account-executive": Briefcase,
  "crm-specialist": Database,

  // Operations
  "operations-lead": Settings,
  "project-manager": Clock,
  "resource-planner": Layers,

  // Quality Assurance
  "qa-lead": ShieldCheck,
  "qa-reviewer": CheckCircle2,
  "compliance-officer": ShieldCheck,
};

export const ORDERED_DEPARTMENTS = [
  "marketing",
  "creative",
  "video",
  "engineering",
  "research",
  "sales",
  "operations",
  "quality",
];

export const DEPARTMENT_CONFIGS: Record<
  string,
  {
    name_en: string;
    name_ar: string;
    icon: React.ComponentType<{ className?: string }>;
    accentBorder: string;
    roomGlow: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  marketing: {
    name_en: "Marketing & Strategy War Room",
    name_ar: "غرفة عمليات التسويق والاستراتيجية",
    icon: Target,
    accentBorder: "border-purple-500/40",
    roomGlow: "from-purple-950/25 to-[#12131c]",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-400",
  },
  creative: {
    name_en: "Creative Direction & Art Studio",
    name_ar: "استوديو الإبداع والتصميم الفني",
    icon: Palette,
    accentBorder: "border-pink-500/40",
    roomGlow: "from-pink-950/25 to-[#12131c]",
    badgeBg: "bg-pink-500/15",
    badgeText: "text-pink-400",
  },
  video: {
    name_en: "Cinematic Video Production Hub",
    name_ar: "مركز الإنتاج السينمائي والفيديو",
    icon: Film,
    accentBorder: "border-red-500/40",
    roomGlow: "from-red-950/25 to-[#12131c]",
    badgeBg: "bg-red-500/15",
    badgeText: "text-red-400",
  },
  engineering: {
    name_en: "Engineering & Systems Lab",
    name_ar: "مختبر الهندسة وتطوير الأنظمة",
    icon: Code,
    accentBorder: "border-cyan-500/40",
    roomGlow: "from-cyan-950/25 to-[#12131c]",
    badgeBg: "bg-cyan-500/15",
    badgeText: "text-cyan-400",
  },
  research: {
    name_en: "Intelligence & Research Center",
    name_ar: "مركز أبحاث السوق واستخبارات الأعمال",
    icon: Brain,
    accentBorder: "border-indigo-500/40",
    roomGlow: "from-indigo-950/25 to-[#12131c]",
    badgeBg: "bg-indigo-500/15",
    badgeText: "text-indigo-400",
  },
  sales: {
    name_en: "Growth & Client Relations Bureau",
    name_ar: "إدارة تطوير الأعمال وعلاقات العملاء",
    icon: Briefcase,
    accentBorder: "border-emerald-500/40",
    roomGlow: "from-emerald-950/25 to-[#12131c]",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
  },
  operations: {
    name_en: "Executive Command & Operations",
    name_ar: "غرفة القيادة التنفيذية وإدارة العمليات",
    icon: Settings,
    accentBorder: "border-amber-500/40",
    roomGlow: "from-amber-950/25 to-[#12131c]",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-400",
  },
  quality: {
    name_en: "Quality Assurance & Standards",
    name_ar: "هيئة تدقيق الجودة والامتثال",
    icon: ShieldCheck,
    accentBorder: "border-teal-500/40",
    roomGlow: "from-teal-950/25 to-[#12131c]",
    badgeBg: "bg-teal-500/15",
    badgeText: "text-teal-400",
  },
};
