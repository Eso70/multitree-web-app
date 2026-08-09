import type {
  MiniWebsiteProfessionTemplateKey,
  MiniWebsiteSectionKey,
} from "@linktree/types";
import { MINI_WEBSITE_SECTIONS, type MiniWebsiteDraft } from "./types";

export type ProfessionTemplateCategoryKey =
  | "custom"
  | "education"
  | "healthcare"
  | "engineeringTechnology"
  | "businessProfessional"
  | "tradesServices"
  | "creativeMedia"
  | "hospitalityLifestyle"
  | "transportAgriculture"
  | "sports"
  | "publicCommunity"
  | "organizations";

export const PROFESSION_TEMPLATE_CATEGORIES: ReadonlyArray<{
  key: ProfessionTemplateCategoryKey;
  label: string;
}> = [
  { key: "custom", label: "تایبەت" },
  { key: "education", label: "خوێندن و ئەکادیمی" },
  { key: "healthcare", label: "تەندروستی" },
  { key: "engineeringTechnology", label: "ئەندازیاری و تەکنەلۆژیا" },
  { key: "businessProfessional", label: "بازرگانی و پیشەیی" },
  { key: "tradesServices", label: "پیشە و خزمەتگوزاری" },
  { key: "creativeMedia", label: "داهێنان و میدیا" },
  { key: "hospitalityLifestyle", label: "میوانداری و ژیان" },
  { key: "transportAgriculture", label: "گواستنەوە و کشتوکاڵ" },
  { key: "sports", label: "وەرزش" },
  { key: "publicCommunity", label: "ڕێبەرایەتی و کۆمەڵگا" },
  { key: "organizations", label: "دامەزراوەکان" },
];

const SECTION_PRESETS = {
  custom: [],
  student: ["socials", "whyChooseUs", "education", "gallery", "documents"],
  academic: [
    "socials",
    "whyChooseUs",
    "experience",
    "education",
    "credentials",
    "documents",
    "events",
    "youtubeVideos",
  ],
  academicLeader: [
    "socials",
    "whyChooseUs",
    "impactStats",
    "experience",
    "education",
    "team",
    "credentials",
    "events",
    "documents",
  ],
  healthcare: [
    "socials",
    "whyChooseUs",
    "services",
    "booking",
    "experience",
    "education",
    "credentials",
    "reviews",
    "hours",
    "faq",
    "location",
  ],
  healthcareOrganization: [
    "socials",
    "whyChooseUs",
    "services",
    "booking",
    "team",
    "credentials",
    "reviews",
    "hours",
    "faq",
    "location",
  ],
  technical: [
    "socials",
    "whyChooseUs",
    "services",
    "experience",
    "education",
    "credentials",
    "gallery",
    "documents",
    "booking",
  ],
  business: [
    "socials",
    "whyChooseUs",
    "services",
    "team",
    "reviews",
    "partners",
    "ownedProperties",
    "booking",
    "location",
  ],
  professional: [
    "socials",
    "whyChooseUs",
    "services",
    "experience",
    "education",
    "credentials",
    "reviews",
    "booking",
    "documents",
  ],
  portfolio: [
    "socials",
    "whyChooseUs",
    "services",
    "gallery",
    "beforeAfter",
    "reviews",
    "booking",
  ],
  trade: [
    "socials",
    "whyChooseUs",
    "services",
    "gallery",
    "beforeAfter",
    "reviews",
    "booking",
    "hours",
    "location",
  ],
  creator: [
    "socials",
    "whyChooseUs",
    "gallery",
    "shortVideos",
    "youtubeVideos",
    "services",
    "reviews",
    "partners",
    "booking",
  ],
  hospitality: [
    "socials",
    "services",
    "gallery",
    "offers",
    "reviews",
    "payments",
    "hours",
    "faq",
    "location",
  ],
  transport: [
    "socials",
    "whyChooseUs",
    "services",
    "serviceAreas",
    "reviews",
    "booking",
    "hours",
    "location",
  ],
  athlete: [
    "socials",
    "whyChooseUs",
    "impactStats",
    "experience",
    "gallery",
    "shortVideos",
    "events",
    "partners",
  ],
  coach: [
    "socials",
    "whyChooseUs",
    "services",
    "booking",
    "reviews",
    "shortVideos",
    "hours",
    "location",
  ],
  publicLeader: [
    "socials",
    "whyChooseUs",
    "impactStats",
    "experience",
    "team",
    "events",
    "documents",
    "shortVideos",
    "youtubeVideos",
  ],
  community: [
    "socials",
    "whyChooseUs",
    "impactStats",
    "services",
    "team",
    "partners",
    "events",
    "documents",
    "location",
  ],
  organization: [
    "socials",
    "whyChooseUs",
    "impactStats",
    "services",
    "team",
    "partners",
    "events",
    "documents",
    "reviews",
    "location",
  ],
  commerce: [
    "socials",
    "services",
    "offers",
    "gallery",
    "reviews",
    "payments",
    "hours",
    "faq",
    "location",
  ],
} as const satisfies Record<string, readonly MiniWebsiteSectionKey[]>;

type TemplateSeed = readonly [
  key: MiniWebsiteProfessionTemplateKey,
  label: string,
  englishLabel: string,
  searchTerms: string,
];

export type ProfessionTemplate = {
  key: MiniWebsiteProfessionTemplateKey;
  category: ProfessionTemplateCategoryKey;
  label: string;
  englishLabel: string;
  searchTerms: string;
  recommendedSections: readonly MiniWebsiteSectionKey[];
};

function templateGroup(
  category: ProfessionTemplateCategoryKey,
  recommendedSections: readonly MiniWebsiteSectionKey[],
  entries: readonly TemplateSeed[],
): ProfessionTemplate[] {
  return entries.map(([key, label, englishLabel, searchTerms]) => ({
    key,
    category,
    label,
    englishLabel,
    searchTerms,
    recommendedSections,
  }));
}

export const PROFESSION_TEMPLATES: readonly ProfessionTemplate[] = [
  ...templateGroup("custom", SECTION_PRESETS.custom, [
    [
      "custom",
      "پڕۆفایلی تایبەت",
      "Custom / Other",
      "other personal general any profession",
    ],
  ]),
  ...templateGroup("education", SECTION_PRESETS.student, [
    ["student", "خوێندکار", "Student", "pupil learner undergraduate college"],
    ["graduate", "دەرچوو", "Graduate", "alumni recent graduate job seeker"],
  ]),
  ...templateGroup("education", SECTION_PRESETS.academic, [
    ["teacher", "مامۆستا", "Teacher", "educator instructor tutor lecturer"],
    ["professor", "پرۆفیسۆر", "Professor", "faculty academic lecturer"],
    ["researcher", "توێژەر", "Researcher", "scientist scholar laboratory phd"],
  ]),
  ...templateGroup("education", SECTION_PRESETS.academicLeader, [
    [
      "schoolLeader",
      "بەڕێوەبەری قوتابخانە",
      "School Principal",
      "headmaster education director",
    ],
    [
      "universityLeader",
      "سەرۆکی کۆلێژ یان زانکۆ",
      "Dean / University President",
      "rector chancellor head of college department chair",
    ],
  ]),
  ...templateGroup("healthcare", SECTION_PRESETS.healthcare, [
    ["doctor", "پزیشک", "Doctor", "physician surgeon specialist medical"],
    ["dentist", "پزیشکی ددان", "Dentist", "dental orthodontist"],
    ["pharmacist", "دەرمانساز", "Pharmacist", "pharmacy medicine"],
    ["nurse", "پەرستار", "Nurse", "midwife paramedic allied health"],
    [
      "therapist",
      "چارەسەرکار",
      "Therapist / Psychologist",
      "counselor physiotherapist mental health",
    ],
  ]),
  ...templateGroup("healthcare", SECTION_PRESETS.healthcareOrganization, [
    [
      "clinic",
      "کلینیک و نەخۆشخانە",
      "Clinic / Hospital",
      "medical center healthcare practice",
    ],
  ]),
  ...templateGroup("engineeringTechnology", SECTION_PRESETS.technical, [
    [
      "engineer",
      "ئەندازیار",
      "Engineer",
      "civil mechanical electrical chemical petroleum industrial",
    ],
    ["architect", "تەلارساز", "Architect", "architecture urban interior"],
    [
      "softwareDeveloper",
      "گەشەپێدەری سۆفتوێر",
      "Software Developer",
      "programmer web mobile app software engineer",
    ],
    [
      "itCybersecurity",
      "IT و سایبەر سیکیوریتی",
      "IT / Cybersecurity",
      "network system administrator security cloud devops",
    ],
    [
      "dataAi",
      "داتا و زیرەکی دەستکرد",
      "Data / AI",
      "data scientist analyst machine learning artificial intelligence",
    ],
  ]),
  ...templateGroup("businessProfessional", SECTION_PRESETS.business, [
    [
      "entrepreneur",
      "خاوەنکار و کارگێڕ",
      "Entrepreneur / Business Owner",
      "founder startup businessman businesswoman",
    ],
    [
      "executive",
      "بەڕێوەبەری باڵا",
      "Executive",
      "ceo cfo coo director manager leadership",
    ],
  ]),
  ...templateGroup("businessProfessional", SECTION_PRESETS.professional, [
    [
      "consultant",
      "ڕاوێژکار",
      "Consultant",
      "advisor strategy management specialist",
    ],
    [
      "accountant",
      "ژمێریار و دارایی",
      "Accountant / Finance",
      "auditor banker economist tax insurance",
    ],
    ["lawyer", "پارێزەر", "Lawyer / Legal", "attorney advocate legal notary"],
    [
      "marketingSales",
      "مارکێتینگ و فرۆشتن",
      "Marketing / Sales",
      "brand public relations advertising sales agent",
    ],
    [
      "realEstate",
      "خانووبەرە",
      "Real Estate",
      "realtor broker property developer",
    ],
    [
      "freelancer",
      "فریلانسەر",
      "Freelancer",
      "independent remote professional self employed",
    ],
  ]),
  ...templateGroup("tradesServices", SECTION_PRESETS.trade, [
    [
      "craftsman",
      "پیشەوەر و هونەرمەند",
      "Craftsman / Artisan",
      "carpenter welder blacksmith potter handmade woodworker",
    ],
    [
      "technician",
      "تەکنیکی",
      "Technician",
      "electrician plumber hvac repair installer",
    ],
    ["mechanic", "میکانیک", "Mechanic", "automotive car motorcycle garage"],
    [
      "contractor",
      "پیمانکار",
      "Contractor / Construction",
      "builder construction renovation maintenance",
    ],
    [
      "beautyProfessional",
      "جوانکاری و سەرتاش",
      "Beauty / Barber",
      "salon hairstylist makeup nail spa skincare",
    ],
    [
      "fashionDesigner",
      "دیزاینەری فاشن و خەیات",
      "Fashion / Tailor",
      "clothing textile seamstress stylist",
    ],
  ]),
  ...templateGroup("creativeMedia", SECTION_PRESETS.portfolio, [
    [
      "graphicDesigner",
      "دیزاینەر",
      "Designer",
      "graphic ui ux product interior visual brand",
    ],
    [
      "photographer",
      "وێنەگر و ڤیدیۆگرافەر",
      "Photographer / Videographer",
      "filmmaker cinema production editor",
    ],
    [
      "artist",
      "هونەرمەند",
      "Artist",
      "painter sculptor illustrator visual art",
    ],
  ]),
  ...templateGroup("creativeMedia", SECTION_PRESETS.creator, [
    [
      "musician",
      "مۆسیقاژەن",
      "Musician",
      "singer band composer producer dj audio",
    ],
    [
      "writerJournalist",
      "نووسەر و ڕۆژنامەنووس",
      "Writer / Journalist",
      "author editor reporter publisher media",
    ],
    [
      "contentCreator",
      "دروستکەری ناوەڕۆک",
      "Creator / Influencer",
      "blogger youtuber streamer podcaster social media",
    ],
  ]),
  ...templateGroup("hospitalityLifestyle", SECTION_PRESETS.hospitality, [
    [
      "restaurantCafe",
      "چێشتخانە و کافێ",
      "Restaurant / Café",
      "food beverage catering coffee",
    ],
    [
      "chefBaker",
      "شێف و نانەوا",
      "Chef / Baker",
      "cook pastry dessert catering",
    ],
    [
      "hotelTourism",
      "هوتێل و گەشتیاری",
      "Hotel / Tourism",
      "travel agency guide resort hospitality events",
    ],
  ]),
  ...templateGroup("transportAgriculture", SECTION_PRESETS.transport, [
    [
      "agricultureProfessional",
      "کشتوکاڵ و ئاژەڵداری",
      "Agriculture",
      "farmer agronomist veterinarian livestock food production",
    ],
    [
      "logisticsTransport",
      "لۆجستیک و گواستنەوە",
      "Logistics / Transport",
      "driver delivery shipping warehouse supply chain",
    ],
    [
      "aviationProfessional",
      "فڕۆکەوانی",
      "Aviation",
      "pilot cabin crew airport airline aerospace",
    ],
  ]),
  ...templateGroup("sports", SECTION_PRESETS.athlete, [
    [
      "athlete",
      "وەرزشکار",
      "Athlete",
      "football player runner swimmer martial arts esports",
    ],
  ]),
  ...templateGroup("sports", SECTION_PRESETS.coach, [
    [
      "sportsCoach",
      "ڕاهێنەر و جیم",
      "Coach / Gym",
      "trainer fitness nutrition sports club academy",
    ],
  ]),
  ...templateGroup("publicCommunity", SECTION_PRESETS.publicLeader, [
    [
      "governmentLeader",
      "سەرۆک و ڕێبەری حکومەت",
      "President / Government Leader",
      "prime minister governor mayor minister public official",
    ],
    [
      "politicianDiplomat",
      "سیاسەتمەدار و دیپلۆمات",
      "Politician / Diplomat",
      "parliament ambassador consul campaign",
    ],
  ]),
  ...templateGroup("publicCommunity", SECTION_PRESETS.community, [
    [
      "ngoCommunity",
      "ڕێکخراو و چالاکی کۆمەڵایەتی",
      "NGO / Community",
      "nonprofit charity activist humanitarian volunteer",
    ],
    [
      "religiousLeader",
      "ڕێبەری ئایینی",
      "Religious Leader",
      "imam priest pastor scholar mosque church faith",
    ],
    [
      "securityProfessional",
      "ئاسایش و فریاکەوتن",
      "Security / Emergency",
      "police firefighter rescue military safety",
    ],
  ]),
  ...templateGroup("organizations", SECTION_PRESETS.organization, [
    [
      "company",
      "کۆمپانیا و دامەزراوە",
      "Company / Organization",
      "corporation agency firm enterprise office",
    ],
    [
      "educationInstitution",
      "دامەزراوەی پەروەردەیی",
      "School / University",
      "college institute academy training center",
    ],
    [
      "healthcareInstitution",
      "دامەزراوەی تەندروستی",
      "Healthcare Institution",
      "hospital clinic laboratory pharmacy center",
    ],
  ]),
  ...templateGroup("organizations", SECTION_PRESETS.commerce, [
    [
      "ecommerceStore",
      "فرۆشگا و ئیکۆمێرس",
      "Shop / E-commerce",
      "retail store online shop marketplace products",
    ],
  ]),
];

const TEMPLATE_BY_KEY = new Map(
  PROFESSION_TEMPLATES.map((template) => [template.key, template]),
);

export function getProfessionTemplate(
  key: MiniWebsiteProfessionTemplateKey | "",
): ProfessionTemplate | undefined {
  return key ? TEMPLATE_BY_KEY.get(key) : undefined;
}

export function applyProfessionTemplate(
  draft: MiniWebsiteDraft,
  key: MiniWebsiteProfessionTemplateKey,
): MiniWebsiteDraft {
  const template = TEMPLATE_BY_KEY.get(key);
  if (!template) return draft;
  const selected = new Set(template.recommendedSections);
  return {
    ...draft,
    professionTemplate: key,
    sections: MINI_WEBSITE_SECTIONS.filter((section) =>
      selected.has(section.key),
    ).map((section) => ({ key: section.key, enabled: true })),
  };
}
