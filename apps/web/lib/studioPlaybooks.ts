export type PlaybookId =
  "video-campaign" | "brand-identity" | "crisis-control" | "performance-growth";

export interface StudioStep {
  id: string;
  stepIndex: number;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  agentId: string;
  agentNameAr: string;
  agentNameEn: string;
  agentRoleAr: string;
  agentRoleEn: string;
  agentAvatar: string;
  defaultPromptAr: string;
  defaultPromptEn: string;
  deliverableType: "script" | "design" | "press" | "strategy";
}

export interface StudioPlaybook {
  id: PlaybookId;
  titleAr: string;
  titleEn: string;
  badgeAr: string;
  badgeEn: string;
  color: string;
  accentBg: string;
  borderClass: string;
  descAr: string;
  descEn: string;
  defaultClient: string;
  defaultAudience: string;
  defaultTone: string;
  steps: StudioStep[];
}

export const STUDIO_PLAYBOOKS: StudioPlaybook[] = [
  {
    id: "video-campaign",
    titleAr: "استوديو إنتاج الفيديو وسيناريو الإعلانات",
    titleEn: "Cinematic Video & Ad Script Studio",
    badgeAr: "إنتاج سينمائي وفيروسي",
    badgeEn: "Cinematic & Viral Ad Suite",
    color: "#8b5cf6",
    accentBg: "from-purple-900/40 via-indigo-950/30 to-black",
    borderClass: "border-purple-500/40",
    descAr:
      "مسار متكامل لتحويل الفكرة الإعلانية إلى سكريبت دقيق ثنائي العمود، لوحة مشاهد بصرية مولدة بالذكاء الاصطناعي، وتوزيع المؤثرات الصوتية.",
    descEn:
      "End-to-end video pipeline: Hook variations, two-column audio-visual script, AI storyboard artwork, and sound design plan.",
    defaultClient: "تطبيق زاد الفاخر / ZAD Luxury App",
    defaultAudience: "الشباب ورواد الأعمال وأصحاب الذوق الرفيع (22 - 40 سنة)",
    defaultTone: "Bold & Viral",
    steps: [
      {
        id: "step-hook-angles",
        stepIndex: 1,
        titleAr: "زوايا الجذب والفكرة الفيروسية (Hooks)",
        titleEn: "Viral Angles & Hook Variations",
        descAr: "صياغة 5 خطافات بصرية ونصية تمنع تخطي الإعلان في أول 3 ثوانٍ.",
        descEn:
          "Formulate 5 high-converting scroll-stopping hooks for TikTok & Reels.",
        agentId: "scriptwriter",
        agentNameAr: "كاتب السيناريو (Scriptwriter)",
        agentNameEn: "Scriptwriter",
        agentRoleAr: "كتابة السيناريو الإعلاني والدرامي",
        agentRoleEn: "Cinematic Scriptwriting",
        agentAvatar: "bot",
        defaultPromptAr:
          "اكتب 5 خطافات إعلانية ذكية (Hook Variations) لفيديو مدته 30 ثانية لتطبيق زاد الفاخر، تركز على حل مشكلة ضياع الوقت وجودة الخدمة الحصرية.",
        defaultPromptEn:
          "Develop 5 high-converting hook variations for a 30s premium app commercial highlighting luxury time saving.",
        deliverableType: "script",
      },
      {
        id: "step-two-column-script",
        stepIndex: 2,
        titleAr: "السيناريو ثنائي العمود (Audio/Visual Script)",
        titleEn: "Two-Column AV Production Script",
        descAr:
          "تقسيم المشاهد بالتوقيت الدقيق، حركة الكاميرا، والتعليق الصوتي الموزون.",
        descEn:
          "Timestamped visual cue table paired with vocal narration & SFX cues.",
        agentId: "scriptwriter",
        agentNameAr: "كاتب السيناريو (Scriptwriter)",
        agentNameEn: "Scriptwriter",
        agentRoleAr: "كتابة السيناريو الإعلاني والدرامي",
        agentRoleEn: "Cinematic Scriptwriting",
        agentAvatar: "bot",
        defaultPromptAr:
          "اكتب السيناريو الكامل ثنائي العمود (Two-Column Script) للإعلان مدته 30 ثانية موزع على 4 مشاهد مع حركة الكاميرا السينمائية والتعليق الصوتي.",
        defaultPromptEn:
          "Generate the full 30s two-column production script with visual cue, audio VO, and camera instructions across 4 scenes.",
        deliverableType: "script",
      },
      {
        id: "step-visual-storyboard",
        stepIndex: 3,
        titleAr: "المشهد البصري المولد بالذكاء الاصطناعي (DALL-E 3)",
        titleEn: "AI Storyboard Concept Artwork",
        descAr:
          "توليد صورة سينمائية فائقة الدقة تمثل المشهد البطل (Hero Scene) للإعلان.",
        descEn:
          "Photorealistic DALL-E 3 hero frame showing lighting, set design & actors.",
        agentId: "fawzyia",
        agentNameAr: "فوزية (Fawzyia)",
        agentNameEn: "Fawzyia",
        agentRoleAr: "المخرجة الفنية والمصممة الإبداعية",
        agentRoleEn: "Art Director & Visual Designer",
        agentAvatar: "bot",
        defaultPromptAr:
          "صورة سينمائية عالية الفخامة لشاب عربي ناجح في برج حديث يطل على مدينة دبي ليلاً يستخدم تطبيق الهاتف الفاخر، إضاءة نيون وأزرق ملكي.",
        defaultPromptEn:
          "Cinematic photorealistic shot of an elegant modern executive in Dubai penthouse using luxury mobile app, anamorphic lens, 8k.",
        deliverableType: "design",
      },
      {
        id: "step-audio-direction",
        stepIndex: 4,
        titleAr: "خطة المؤثرات الصوتية والموسيقى (Sound Design)",
        titleEn: "Soundtrack & Audio SFX Architecture",
        descAr:
          "تحديد مسار الموسيقى الخلفية، نبرة المعلق الصوتي، وفواصل الـ Whoosh وRiser.",
        descEn:
          "Complete audio cues, emotional tempo arc, and voiceover resonance guidance.",
        agentId: "sound-designer",
        agentNameAr: "مهندس الصوت (Sound Designer)",
        agentNameEn: "Sound Designer",
        agentRoleAr: "الهندسة الصوتية والمؤثرات",
        agentRoleEn: "Audio & Sonic Branding",
        agentAvatar: "bot",
        defaultPromptAr:
          "حدد خطة المؤثرات الصوتية والموسيقى الخلفية للإعلان: نوع التراك الإيقاعي، التوقيتات الدقيقة للمؤثرات، ومواصفات طبقة صوت المعلق.",
        defaultPromptEn:
          "Create the sound design cue sheet specifying cinematic rhythm track, whooshes, risers, and voiceover EQ treatment.",
        deliverableType: "strategy",
      },
    ],
  },
  {
    id: "brand-identity",
    titleAr: "استوديو إطلاق وتطوير الهوية البصرية المتكاملة",
    titleEn: "Brand Identity & Launch Studio",
    badgeAr: "تصميم وهوية استراتيجية",
    badgeEn: "Brand Architecture & Visual Assets",
    color: "#f59e0b",
    accentBg: "from-amber-950/40 via-yellow-950/20 to-black",
    borderClass: "border-amber-500/40",
    descAr:
      "بناء متكامل للعلامة التجارية: صياغة الموقف الاستراتيجي، توليد الشعار بالذكاء الاصطناعي، دليل الألوان والخطوط، والبيان الصحفي الرسمي للإطلاق.",
    descEn:
      "Comprehensive brand inception: Positioning narrative, AI logo generation, design system hierarchy, and inaugural launch PR.",
    defaultClient: "نخبة العود / Elite Oud Perfumery",
    defaultAudience: "محبو العطور الفاخرة والنخبة في الخليج والشرق الأوسط",
    defaultTone: "Luxury",
    steps: [
      {
        id: "step-brand-narrative",
        stepIndex: 1,
        titleAr: "التموضع الاستراتيجي والسردية (Brand Positioning)",
        titleEn: "Strategic Narrative & Positioning",
        descAr:
          "تحديد الوعد الأساسي للعلامة، مصفوفة التنافسية، ونبرة الصوت المعتمدة.",
        descEn:
          "Establish brand mission, competitive differentiation, and tonal ethos.",
        agentId: "brand-identity-designer",
        agentNameAr: "مصمم الهوية الاستراتيجية",
        agentNameEn: "Brand Identity Designer",
        agentRoleAr: "تصميم وتموضع العلامات التجارية",
        agentRoleEn: "Brand Strategy & Architecture",
        agentAvatar: "bot",
        defaultPromptAr:
          "صغ السردية الاستراتيجية لعلامة 'نخبة العود' الفاخرة: وعد العلامة، ركائز الفخامة الثلاث، والموقع التنافسي المتميز.",
        defaultPromptEn:
          "Formulate strategic brand manifesto for Elite Oud including brand promise, 3 luxury pillars, and competitive niche.",
        deliverableType: "strategy",
      },
      {
        id: "step-ai-logo",
        stepIndex: 2,
        titleAr: "تصميم الشعار البصري بـ DALL-E 3 (Brand Artwork)",
        titleEn: "AI Brand Emblem & Logo Design",
        descAr:
          "توليد شعار ملكي أيقوني يجمع بين الأصالة العربية والحداثة العالمية.",
        descEn:
          "Generate vector-grade luxury emblem with royal navy and gold foil aesthetics.",
        agentId: "fawzyia",
        agentNameAr: "فوزية (Fawzyia)",
        agentNameEn: "Fawzyia",
        agentRoleAr: "المخرجة الفنية والمصممة الإبداعية",
        agentRoleEn: "Art Director & Visual Designer",
        agentAvatar: "bot",
        defaultPromptAr:
          "تصميم شعار أيقوني لعلامة عطور فاخرة 'نخبة العود': رمز تجريدي مستوحى من قطرة العود والخط العربي، خلفية كحلية داكنة مع ذهبي نقي ثلاثي الأبعاد.",
        defaultPromptEn:
          "Minimalist luxury brand logo for Elite Oud Arabian perfumery, abstract oud droplet with royal typography, gold leaf on deep obsidian.",
        deliverableType: "design",
      },
      {
        id: "step-visual-guidelines",
        stepIndex: 3,
        titleAr: "دليل الألوان والخطوط (Design System)",
        titleEn: "Palette & Typography Specifications",
        descAr:
          "كود الألوان الهيكلية، درجات الذهب والداكن، وتوصيات الخطوط العربية والإنجليزية.",
        descEn:
          "Full color HEX codes, contrast ratios, and Arabic/English typographic hierarchy.",
        agentId: "fawzyia",
        agentNameAr: "فوزية (Fawzyia)",
        agentNameEn: "Fawzyia",
        agentRoleAr: "المخرجة الفنية والمصممة الإبداعية",
        agentRoleEn: "Art Director & Visual Designer",
        agentAvatar: "bot",
        defaultPromptAr:
          "حدد نظام الألوان الكامل لهوية نخبة العود (درجات HEX، الاستخدام) ودليل التيبوغرافي للخطوط العربية واللاتينية مع مقاسات العناوين.",
        defaultPromptEn:
          "Define full color specification (Hex codes, panels) and font hierarchy (Display, H1, Body) for digital & print.",
        deliverableType: "design",
      },
      {
        id: "step-press-release",
        stepIndex: 4,
        titleAr: "بيان الإطلاق الصحفي المعتمد (Press Release)",
        titleEn: "Official Launch Press Statement",
        descAr:
          "صياغة بيان رسمي موجه لوسائل الإعلام الاقتصادية وأسلوب الحياة في الشرق الأوسط.",
        descEn:
          "Editorial-standard press release ready for wire distribution with quotes.",
        agentId: "ragaa",
        agentNameAr: "رجاء (Ragaa)",
        agentNameEn: "Ragaa",
        agentRoleAr: "مديرة العلاقات العامة والبيانات الصحفية",
        agentRoleEn: "Public Relations Specialist",
        agentAvatar: "bot",
        defaultPromptAr:
          "اكتبي بياناً صحفياً رسمياً بعنوان جذاب يعلن تدشين هوية 'نخبة العود' الفاخرة، متضمناً تصريحاً للمدير التنفيذي وموعد الإطلاق في الأسواق.",
        defaultPromptEn:
          "Author official press release announcing the inauguration of Elite Oud luxury identity with CEO statement.",
        deliverableType: "press",
      },
    ],
  },
  {
    id: "crisis-control",
    titleAr: "غرفة عمليات إدارة الأزمات والرد الصحفي العاجل",
    titleEn: "Crisis Control & PR Response War Room",
    badgeAr: "استجابة سريعة للطوارئ",
    badgeEn: "Emergency PR Mitigation Protocol",
    color: "#ef4444",
    accentBg: "from-rose-950/40 via-red-950/20 to-black",
    borderClass: "border-rose-500/40",
    descAr:
      "بروتوكول دفاعي سريع: تقييم المخاطر، صياغة بيان الموقف المعتمد، مصفوفة الرد على استفسارات الصحفيين، وخطة السيطرة على وسائل التواصل.",
    descEn:
      "Rapid crisis protocol: Incident audit, official holding statement, critical Q&A matrix, and social media firefighting.",
    defaultClient: "مجموعة المشرق الاستثمارية / Mashreq Group",
    defaultAudience: "الصحافة الاقتصادية، المستثمرون، وعامة الجمهور المتأثر",
    defaultTone: "Authoritative",
    steps: [
      {
        id: "step-incident-audit",
        stepIndex: 1,
        titleAr: "تقييم المخاطر والأثر الإعلامي (Severity Audit)",
        titleEn: "Incident Severity & Risk Assessment",
        descAr:
          "تحليل مستوى الأزمة (Tier 1/2/3) وتحديد نقاط الضعف والفئات الأكثر تأثراً.",
        descEn:
          "Grade the crisis severity level and isolate vulnerable touchpoints.",
        agentId: "compliance-officer",
        agentNameAr: "مسؤول الامتثال والمخاطر",
        agentNameEn: "Compliance Officer",
        agentRoleAr: "إدارة المخاطر والامتثال المؤسسي",
        agentRoleEn: "Regulatory & Risk Compliance",
        agentAvatar: "bot",
        defaultPromptAr:
          "قم بتقييم الأزمة الحالية لمجموعة المشرق وحدد مستوى الخطر (Tier 1)، الأطراف المتضررة، والتوصيات القانونية والإعلامية الفورية.",
        defaultPromptEn:
          "Conduct incident severity audit, define regulatory risks, and state mandatory containment guardrails.",
        deliverableType: "strategy",
      },
      {
        id: "step-holding-statement",
        stepIndex: 2,
        titleAr: "البيان الصحفي المعتمد للمتحدث (Holding Statement)",
        titleEn: "Official Spokesperson Holding Statement",
        descAr: "صياغة بيان متزن يمتص الغضب ويوضح الإجراءات التصحيحية المتخذة.",
        descEn:
          "Clear, empathetic, and legally-vetted corporate statement for immediate publishing.",
        agentId: "ragaa",
        agentNameAr: "رجاء (Ragaa)",
        agentNameEn: "Ragaa",
        agentRoleAr: "مديرة العلاقات العامة والبيانات الصحفية",
        agentRoleEn: "Public Relations Specialist",
        agentAvatar: "bot",
        defaultPromptAr:
          "اكتبي بياناً صحفياً رسمياً عاجلاً للمتحدث الرسمي باسم المجموعة يؤكد السيطرة على الموقف، ويعتذر عن أي إزعاج مع إيضاح خطة الحل في 48 ساعة.",
        defaultPromptEn:
          "Draft holding statement from the official spokesperson addressing the disruption with clear 48-hour resolution steps.",
        deliverableType: "press",
      },
      {
        id: "step-qa-matrix",
        stepIndex: 3,
        titleAr: "مصفوفة الأسئلة الحرجة والردود (Q&A Matrix)",
        titleEn: "Critical Q&A & Media Briefing Matrix",
        descAr:
          "تجهيز 5 أسئلة هجومية محتملة من الإعلام والإجابات الدقيقة المحكمة عليها.",
        descEn:
          "Prepare answers for 5 aggressive investigative questions from top-tier media.",
        agentId: "dr-ibrahim",
        agentNameAr: "د. إبراهيم (Dr. Ibrahim)",
        agentNameEn: "Dr. Ibrahim",
        agentRoleAr: "كبير مستشاري السوق والتحليل الاستراتيجي",
        agentRoleEn: "Chief Market & Intelligence Strategist",
        agentAvatar: "bot",
        defaultPromptAr:
          "ضع مصفوفة أسئلة وأجوبة (Q&A Matrix) تتضمن أصعب 5 أسئلة متوقعة من الصحفيين حول الواقعة مع الردود الدبلوماسية المعتمدة لكل منها.",
        defaultPromptEn:
          "Generate Q&A media matrix with 5 toughest anticipated questions and strategically formulated talking points.",
        deliverableType: "strategy",
      },
      {
        id: "step-social-firefighting",
        stepIndex: 4,
        titleAr: "خطة السيطرة على السوشيال ميديا (Social Media Mitigation)",
        titleEn: "Social Media Firefighting Protocol",
        descAr:
          "تعليمات الرد على التعليقات الغاضبة وتوجيه المستخدمين لقنوات الدعم المباشرة.",
        descEn:
          "Community moderation rules, canned responses, and sentiment recovery roadmap.",
        agentId: "social-media-manager",
        agentNameAr: "مدير السوشيال ميديا",
        agentNameEn: "Social Media Manager",
        agentRoleAr: "إدارة وتوزيع المحتوى الرقمي",
        agentRoleEn: "Social Community Management",
        agentAvatar: "bot",
        defaultPromptAr:
          "اكتب بروتوكول التعامل الفوري مع حملة السوشيال ميديا: قوالب الردود على التعليقات الغاضبة، متى نحيل للدعم الخاص، ورسالة الحساب الرسمية الموحدة.",
        defaultPromptEn:
          "Detail social media response playbook: canned replies for angry comments, escalation threshold, and pinned status update.",
        deliverableType: "strategy",
      },
    ],
  },
  {
    id: "performance-growth",
    titleAr: "استوديو إطلاق الحملات التسويقية والنمو السريع",
    titleEn: "360° Growth & Performance Campaign Studio",
    badgeAr: "مبيعات واكتساب عملاء",
    badgeEn: "Customer Acquisition & Ad Performance",
    color: "#10b981",
    accentBg: "from-emerald-950/40 via-teal-950/20 to-black",
    borderClass: "border-emerald-500/40",
    descAr:
      "ماكينة اكتساب عملاء متكاملة: استراتيجية الجمهور المستهدف، باقة الإعلانات الرقمية (Ad Copy)، خطة توزيع الميزانية، وتهيئة صفحات الهبوط.",
    descEn:
      "Full-funnel acquisition engine: Audience persona architecture, multi-platform ad copy suite, media budget allocation, and SEO hooks.",
    defaultClient: "منصة أكاديميا لتعليم الذكاء الاصطناعي",
    defaultAudience:
      "المهندسون، التقنيون، ومدراء الشركات الراغبون في التحول الرقمي",
    defaultTone: "Bold & Viral",
    steps: [
      {
        id: "step-growth-strategy",
        stepIndex: 1,
        titleAr: "استراتيجية الجمهور وعرض القيمة (Value Proposition)",
        titleEn: "Target Audience & Value Architecture",
        descAr:
          "تحليل نقاط الألم للعميل، وتصميم عرض القيمة الذي لا يقاوم (Irresistible Offer).",
        descEn:
          "Customer pain points, hook angles, and compelling conversion incentives.",
        agentId: "growth-hacker",
        agentNameAr: "خبير النمو (Growth Hacker)",
        agentNameEn: "Growth Hacker",
        agentRoleAr: "استراتيجيات النمو واكتساب المستخدمين",
        agentRoleEn: "Growth & Viral Funnels",
        agentAvatar: "bot",
        defaultPromptAr:
          "حدد استراتيجية النمو وعرض القيمة (Value Proposition) لحملة منصة أكاديميا: شرائح الجمهور الثلاث الرئيسية، ونقاط التحفيز للشراء الفوري.",
        defaultPromptEn:
          "Formulate growth architecture and core value prop highlighting 3 specific buyer personas and urgency triggers.",
        deliverableType: "strategy",
      },
      {
        id: "step-ad-copy-suite",
        stepIndex: 2,
        titleAr: "باقة نصوص الإعلانات (Meta / TikTok / LinkedIn Ad Copy)",
        titleEn: "High-Converting Ad Copy Suite",
        descAr:
          "صياغة 3 نسخ إعلانية مختلفة (نسخة قصيرة لتيك توك، متوسطة لإنستغرام، ومؤسسية للينكدإن).",
        descEn:
          "Craft 3 tailored ad variants with scroll-stopping hooks and clear calls-to-action.",
        agentId: "copywriter",
        agentNameAr: "كاتب الإعلانات (Copywriter)",
        agentNameEn: "Copywriter",
        agentRoleAr: "كتابة الإعلانات التسويقية الموجهة",
        agentRoleEn: "Direct Response Copywriting",
        agentAvatar: "bot",
        defaultPromptAr:
          "اكتب 3 نصوص إعلانية موجهة للحملة: نسخة سريعة لتيك توك، نسخة عاطفية لإنستغرام، ونسخة احترافية للينكدإن مع عناوين قوية ودعوة لاتخاذ إجراء (CTA).",
        defaultPromptEn:
          "Write 3 multi-platform direct-response ad copies: snappy TikTok reel copy, Instagram carousel caption, and LinkedIn thought-leadership copy.",
        deliverableType: "strategy",
      },
      {
        id: "step-media-budget",
        stepIndex: 3,
        titleAr: "خطة الميزانية وتوزيع المنصات (Media Buying Matrix)",
        titleEn: "Media Spend & Channel Allocation",
        descAr:
          "توزيع ميزانية الحملة على المنصات الرقمية وتحديد تكلفة الاكتساب المستهدفة (CPA).",
        descEn:
          "Channel spend breakdown, target CAC, projected ROAS, and testing pacing.",
        agentId: "media-buyer",
        agentNameAr: "مسؤول الميديا والتمويل الإعلاني",
        agentNameEn: "Media Buyer",
        agentRoleAr: "إدارة الحملات الإعلانية والميزانيات",
        agentRoleEn: "Performance Marketing & Media Spend",
        agentAvatar: "bot",
        defaultPromptAr:
          "ضع خطة توزيع ميزانية بقيمة 30,000 دولار موزعة على ميتا، تيك توك، وجوجل مع تحديد تكلفة الاكتساب المستهدفة (Target CPA) والتوقعات المالية.",
        defaultPromptEn:
          "Design $30,000 media budget allocation matrix across Meta, TikTok, and Google Ads with target CPA and ROAS forecast.",
        deliverableType: "strategy",
      },
      {
        id: "step-seo-landing",
        stepIndex: 4,
        titleAr: "تهيئة صفحة الهبوط ومحركات البحث (Landing Page SEO)",
        titleEn: "Landing Page SEO & Conversion Hooks",
        descAr:
          "الكلمات المفتاحية الأكثر ربحية، العناوين الجاذبة (H1/H2)، والأسئلة الشائعة للتحويل.",
        descEn:
          "Target high-intent keywords, meta tags, and on-page conversion layout.",
        agentId: "seo-specialist",
        agentNameAr: "خبير محركات البحث (SEO)",
        agentNameEn: "SEO Specialist",
        agentRoleAr: "تحسين محركات البحث والكلمات المفتاحية",
        agentRoleEn: "Search Engine Optimization",
        agentAvatar: "bot",
        defaultPromptAr:
          "حدد خطة الكلمات المفتاحية لصفحة الهبوط (Landing Page SEO): العنوان الرئيسي H1، خمسة أسئلة شائعة ترفع معدل التحويل، والـ Meta Description الجاذب.",
        defaultPromptEn:
          "Build SEO landing page blueprint with high-intent keyword targets, conversion FAQ schema, and compelling Meta tags.",
        deliverableType: "strategy",
      },
    ],
  },
];
