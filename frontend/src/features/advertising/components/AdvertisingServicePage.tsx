"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import {
  BadgeDollarSign,
  Building2,
  Camera,
  Check,
  CircleHelp,
  CloudUpload,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutDashboard,
  MonitorPlay,
  Pencil,
  Plus,
  Quote,
  Route,
  Tag,
  Trash2,
  Package,
  TrendingUp,
  Wallet,
  User,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarImageUpload } from "@/components/shared/AvatarImageUpload";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { EditorAddButton } from "@/components/shared/EditorAddButton";
import { EditorField } from "@/components/shared/EditorField";
import { EmptyState } from "@/components/shared/EmptyState";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { AccentActionButton } from "@/components/shared/AccentActionButton";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { ModalFooterActions } from "@/components/shared/ModalFooterActions";
import { NumberInput } from "@/components/shared/NumberInput";
import { PageHeaderSection } from "@/components/shared/PageHeaderSection";
import { PhoneMockup } from "@/components/shared/PhoneMockup";
import { SegmentedTabs, type SegmentedTab } from "@/components/shared/SegmentedTabs";
import { TabSaveButton } from "@/components/shared/TabSaveButton";
import { modalInputClass, modalTextareaClass } from "@/features/link-editor/modal-input-styles";
import { BackgroundColorPicker, RAINBOW_BACKGROUND_COLORS } from "@/features/link-editor/BackgroundColorPicker";
import { getSubdomainPageUrl } from "@/lib/utils/app-url";
import { cn } from "@/lib/utils";
import { AdvertisingVideoPlayer } from "./AdvertisingVideoPlayer";
import { PROVIDER_LOGOS as PAYMENT_PROVIDER_LOGOS } from "./AdvertisingPaymentStep";
import {
  AdvertisingPriceTable,
  SPONSOR_CATEGORY_THEME,
  type AdvertisingPriceTableTheme,
} from "./AdvertisingPriceTable";
import {
  TESTIMONIAL_THEME,
  TestimonialStackCard,
} from "./AdvertisingTestimonialStack";
import { RESULT_THEME, ResultCardFan, ResultFanDots } from "./AdvertisingResultsShowcaseSection";
import { FaqCarousel } from "./AdvertisingFaqSection";
import type { AdvertisingPriceRow } from "../pricing-data";
import {
  fetchAdvertisingDraft,
  publishAdvertising,
  saveAndPublishAdvertising,
  unpublishAdvertising,
  uploadAdvertisingImage,
} from "../api";
import type {
  AdvertisingBusinessBranding,
  AdvertisingDraftConfig,
  AdvertisingFaq,
  AdvertisingPackageCategory,
  AdvertisingPaymentProvider,
  AdvertisingResultColor,
  AdvertisingResultItem,
  AdvertisingServiceConfig,
  AdvertisingTestimonial,
  AdvertisingTestimonialColor,
} from "../types";

type AdvertisingTab = "texts" | "journey" | "video" | "results" | "packages" | "testimonials" | "faq";

const tabs: SegmentedTab<AdvertisingTab>[] = [
  // Hero and closing CTA are both plain copy, so they share one tab rather
  // than each getting a near-empty one of their own.
  { id: "texts", label: "دەقی سەرەکی و کۆتایی", icon: LayoutDashboard },
  { id: "journey", label: "قۆناغەکانی سپۆنسەر کردن", icon: Route },
  // Split out from the journey tab: this video is shared by the guide's step 5
  // AND the standalone /advertising/video-code page, so it gets its own tab.
  { id: "video", label: "ڤیدیۆی دەرهێنانی کۆد", icon: MonitorPlay },
  { id: "packages", label: "پاکێجەکان", icon: BadgeDollarSign },
  { id: "results", label: "پێش و دوای", icon: TrendingUp },
  { id: "testimonials", label: "ڕای کڕیاران", icon: Quote },
  { id: "faq", label: "پرسیارە باوەکان", icon: CircleHelp },
];

const TESTIMONIAL_COLORS = Object.keys(TESTIMONIAL_THEME) as AdvertisingTestimonialColor[];

const RESULT_COLORS = Object.keys(RESULT_THEME) as AdvertisingResultColor[];

const PACKAGE_CATEGORY_ICONS: Record<string, LucideIcon> = { personal: User, business: Building2 };

/** Explicit per-category color, chosen in the create/edit modal — stable across reordering and deletion, unlike an index-derived color would be. */
const PACKAGE_CATEGORY_COLOR_THEME = {
  lime: SPONSOR_CATEGORY_THEME.personal,
  violet: SPONSOR_CATEGORY_THEME.business,
  amber: {
    ring: "border-amber-500/30 dark:border-amber-400/40",
    soft: "bg-amber-500/10 dark:bg-amber-400/10",
    text: "text-amber-700 dark:text-amber-300",
    rowBorder: "border-amber-500/15 dark:border-amber-400/15",
    solid: "border-amber-500 bg-amber-500 text-white",
    radioBorder: "border-amber-600 dark:border-amber-400",
    dot: "bg-amber-600 dark:bg-amber-400",
  },
  cyan: {
    ring: "border-cyan-500/30 dark:border-cyan-400/40",
    soft: "bg-cyan-500/10 dark:bg-cyan-400/10",
    text: "text-cyan-700 dark:text-cyan-300",
    rowBorder: "border-cyan-500/15 dark:border-cyan-400/15",
    solid: "border-cyan-500 bg-cyan-500 text-white",
    radioBorder: "border-cyan-600 dark:border-cyan-400",
    dot: "bg-cyan-600 dark:bg-cyan-400",
  },
  rose: {
    ring: "border-rose-500/30 dark:border-rose-400/40",
    soft: "bg-rose-500/10 dark:bg-rose-400/10",
    text: "text-rose-700 dark:text-rose-300",
    rowBorder: "border-rose-500/15 dark:border-rose-400/15",
    solid: "border-rose-500 bg-rose-500 text-white",
    radioBorder: "border-rose-600 dark:border-rose-400",
    dot: "bg-rose-600 dark:bg-rose-400",
  },
  blue: {
    ring: "border-blue-500/30 dark:border-blue-400/40",
    soft: "bg-blue-500/10 dark:bg-blue-400/10",
    text: "text-blue-700 dark:text-blue-300",
    rowBorder: "border-blue-500/15 dark:border-blue-400/15",
    solid: "border-blue-500 bg-blue-500 text-white",
    radioBorder: "border-blue-600 dark:border-blue-400",
    dot: "bg-blue-600 dark:bg-blue-400",
  },
  fuchsia: {
    ring: "border-fuchsia-500/30 dark:border-fuchsia-400/40",
    soft: "bg-fuchsia-500/10 dark:bg-fuchsia-400/10",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    rowBorder: "border-fuchsia-500/15 dark:border-fuchsia-400/15",
    solid: "border-fuchsia-500 bg-fuchsia-500 text-white",
    radioBorder: "border-fuchsia-600 dark:border-fuchsia-400",
    dot: "bg-fuchsia-600 dark:bg-fuchsia-400",
  },
  emerald: {
    ring: "border-emerald-500/30 dark:border-emerald-400/40",
    soft: "bg-emerald-500/10 dark:bg-emerald-400/10",
    text: "text-emerald-700 dark:text-emerald-300",
    rowBorder: "border-emerald-500/15 dark:border-emerald-400/15",
    solid: "border-emerald-500 bg-emerald-500 text-white",
    radioBorder: "border-emerald-600 dark:border-emerald-400",
    dot: "bg-emerald-600 dark:bg-emerald-400",
  },
} satisfies Record<string, AdvertisingPriceTableTheme>;

type PackageCategoryColorId = keyof typeof PACKAGE_CATEGORY_COLOR_THEME;

// A custom hex color (stored as e.g. "#3b82f6") can't map to a fixed preset,
// so its classes reference a CSS variable instead — the literal class text
// is static (Tailwind can see it at build time), only the variable's value
// changes at runtime via `packageCategoryStyle` below.
const CUSTOM_PACKAGE_CATEGORY_THEME: AdvertisingPriceTableTheme = {
  ring: "border-[color-mix(in_srgb,var(--category-color)_40%,transparent)]",
  soft: "bg-[color-mix(in_srgb,var(--category-color)_10%,transparent)]",
  text: "text-[var(--category-color)]",
  rowBorder: "border-[color-mix(in_srgb,var(--category-color)_15%,transparent)]",
  solid: "border-[var(--category-color)] bg-[var(--category-color)] text-white",
  radioBorder: "border-[var(--category-color)]",
  dot: "bg-[var(--category-color)]",
};

function isCustomPackageCategoryColor(color: string | undefined): color is `#${string}` {
  return Boolean(color?.startsWith("#"));
}

function getPackageCategoryTheme(color: string | undefined): AdvertisingPriceTableTheme {
  if (isCustomPackageCategoryColor(color)) return CUSTOM_PACKAGE_CATEGORY_THEME;
  if (color && color in PACKAGE_CATEGORY_COLOR_THEME) {
    return PACKAGE_CATEGORY_COLOR_THEME[color as PackageCategoryColorId];
  }
  return PACKAGE_CATEGORY_COLOR_THEME.lime;
}

/** Sets the CSS variable `CUSTOM_PACKAGE_CATEGORY_THEME` reads from; undefined for preset colors, which need no variable. */
function packageCategoryStyle(color: string | undefined): CSSProperties | undefined {
  return isCustomPackageCategoryColor(color) ? ({ "--category-color": color } as CSSProperties) : undefined;
}

/** Random, but avoids a color already in use while an unused one is still available — only repeats once every color is taken. */
function pickUnusedColor<T extends string>(palette: readonly T[], used: Iterable<T>): T {
  const taken = new Set(used);
  const unused = palette.filter((color) => !taken.has(color));
  const pool = unused.length ? unused : palette;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickTestimonialColor(existing: readonly AdvertisingTestimonial[]): AdvertisingTestimonialColor {
  return pickUnusedColor(
    TESTIMONIAL_COLORS,
    existing.map((item) => item.color),
  );
}

function pickResultColor(existing: readonly AdvertisingResultItem[]): AdvertisingResultColor {
  return pickUnusedColor(
    RESULT_COLORS,
    existing.map((item) => item.color),
  );
}

const inputClass = modalInputClass();
const textareaClass = modalTextareaClass(false, "min-h-28");


type AdvertisingServicePageProps = AdvertisingBusinessBranding & {
  /** Business subdomain where the public `/advertising` page is served. */
  subdomain: string;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Uploads a picked image and hands back its persisted URL.
 *
 * Replaces the `URL.createObjectURL` previews these slots used to keep. A blob
 * URL dies with the tab, so anything "saved" with one pointed at nothing the
 * next morning. Uploading on pick means an abandoned modal can leave an
 * unreferenced asset behind; `platform_media_settings.auto_cleanup_unused`
 * already collects those, which is the same bargain the mini-website editor
 * makes.
 */
async function uploadPickedImage(
  file: File | undefined,
  onUploaded: (url: string) => void,
): Promise<void> {
  if (!file || !file.type.startsWith("image/")) return;
  try {
    onUploaded(await uploadAdvertisingImage(file));
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "نەتوانرا وێنەکە باربکرێت");
  }
}

/**
 * What the page currently holds, counted from the config being edited.
 *
 * Deliberately the draft rather than the published version: this sits above
 * the editor, so it has to describe what the business is working on. A tier
 * count that only moved on publish would read as the editor losing edits.
 *
 * The cards focus on the numbers that decide whether the page can actually
 * take money: payment methods configured, sections that will be visible,
 * and the tier and result counts behind the public pitch.
 */
function AdvertisingStats({ config }: { config: AdvertisingServiceConfig }) {
  const stats = useMemo(() => {
    const tiers = Object.values(config.packageTiers).flat();
    const sections = Object.values(config.sections);
    return {
      packages: tiers.length,
      providers: config.paymentProviders.length,
      results: config.results.length,
      visibleSections: sections.filter(Boolean).length,
      totalSections: sections.length,
    };
  }, [config]);

  return (
    <StatCardGrid columns={4}>
      <StatCard
        icon={Wallet}
        label="شێوازی پارەدان"
        value={stats.providers}
        color="green"
      />
      <StatCard
        icon={Eye}
        label="بەشە دەرکەوتووەکان"
        value={`${stats.visibleSections} / ${stats.totalSections}`}
        color="purple"
      />
      <StatCard
        icon={Package}
        label="پاکێجەکان"
        value={stats.packages}
        color="blue"
      />
      <StatCard
        icon={TrendingUp}
        label="ئەنجامەکان"
        value={stats.results}
        color="orange"
      />
    </StatCardGrid>
  );
}


/** Header switch controlling whether a section is shown on the public page. */
function SectionVisibilityToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "بەشەکە لە پەڕەی گشتی نیشان دەدرێت" : "بەشەکە لە پەڕەی گشتی شاردراوە"}
      onClick={() => onChange(!checked)}
      title={checked ? "شاردنەوە لە پەڕەی گشتی" : "پیشاندان لە پەڕەی گشتی"}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition",
        checked
          ? "border-[color-mix(in_srgb,var(--theme-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--theme-primary)_8%,transparent)] text-[var(--theme-primary)]"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/[0.08]",
      )}
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-[var(--theme-primary)]" : "bg-slate-200 dark:bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      {checked ? "پیشان دەدرێت" : "شاردراوە"}
    </button>
  );
}

/** Video upload for the guide's code-extraction step, previewed in the same rounded card style as the /advertising/video-code page. */
function JourneyVideoUpload({
  videoUrl,
  onVideoUrlChange,
}: {
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Blob URLs come from the file picker and are meaningless to show or save as
  // text — the link field stays blank until the owner pastes a real URL.
  const isBlob = videoUrl.startsWith("blob:");

  // Deliberately does not revoke the previous blob on replace — there is no
  // owning modal here to track "created but unsaved" blobs, so revoking early
  // risks a dead URL if the config was never saved. A leaked blob (dies with
  // the tab) is the safer failure. See ReceiptExampleImageUpload for the same tradeoff.
  const acceptFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("video/")) return;
    onVideoUrlChange(URL.createObjectURL(file));
    toast.success("ڤیدیۆ بۆ پێشبینینی ناو وێبگەڕ هەڵبژێردرا");
  };

  const removeVideo = () => {
    if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    onVideoUrlChange("");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-black/10 shadow-xl dark:border-white/10">
        <div className="aspect-[9/16] w-full">
          <AdvertisingVideoPlayer size="full" src={videoUrl || undefined} />
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(event) => {
          acceptFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          <CloudUpload className="h-3.5 w-3.5" /> گۆڕینی ڤیدیۆ
        </button>
        {videoUrl && (
          <button
            type="button"
            onClick={removeVideo}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-red-500 transition hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> گەڕانەوە بۆ بنەڕەت
          </button>
        )}
      </div>
      <div className="w-full max-w-sm">
        <EditorField label="لینکی ڤیدیۆ">
          <input
            type="url"
            value={isBlob ? "" : videoUrl}
            onChange={(event) => onVideoUrlChange(event.target.value)}
            placeholder="https://example.com/video.mp4"
            className={inputClass}
            dir="ltr"
          />
        </EditorField>
      </div>
    </div>
  );
}

/** Rectangular photo slot for the before/after sides — the shared circular avatar upload isn't the right shape here. */
function ResultImageUpload({
  label,
  imageUrl,
  onImageUrlChange,
}: {
  label: string;
  imageUrl?: string;
  onImageUrlChange: (url: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (file: File | undefined) =>
    void uploadPickedImage(file, onImageUrlChange);

  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={`بارکردنی وێنەی ${label}`}
          className="group/slot relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-[var(--theme-primary)] dark:border-white/15 dark:bg-white/[0.02]"
        >
          {imageUrl ? (
            <>
              <Image src={imageUrl} alt="" fill sizes="12rem" className="object-cover" unoptimized />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover/slot:opacity-100">
                <Camera className="h-5 w-5" />
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-slate-400">
              <CloudUpload className="h-6 w-6" />
              <span className="text-[10px] font-bold">وێنە هەڵبژێرە</span>
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            acceptFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {imageUrl && (
          <button
            type="button"
            onClick={() => onImageUrlChange(undefined)}
            aria-label={`سڕینەوەی وێنەی ${label}`}
            className="absolute -end-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-sm dark:border-[#1c222b]"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

const RECEIPT_EXAMPLE_FALLBACK = "/images/advertising/example-money-send.jpg";

/** Lets a business swap the mockup receipt shown in the guide's step 4; falls back to the bundled screenshot when unset. */
function ReceiptExampleImageUpload({
  imageUrl,
  onImageUrlChange,
}: {
  imageUrl?: string;
  onImageUrlChange: (url: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (file: File | undefined) =>
    void uploadPickedImage(file, onImageUrlChange);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-[150px]">
        <PhoneMockup ariaLabel="پێشبینینی نموونەی وەسڵ" name="Receipt">
          <div className="relative flex h-full w-full items-center justify-center bg-[#f4efe8]">
            <Image
              src={imageUrl || RECEIPT_EXAMPLE_FALLBACK}
              alt="وێنەی نموونەی وەسڵی گواستنەوەی پارە"
              fill
              sizes="150px"
              className="object-contain"
              unoptimized={Boolean(imageUrl)}
            />
          </div>
        </PhoneMockup>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          acceptFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          <CloudUpload className="h-3.5 w-3.5" /> گۆڕینی وێنە
        </button>
        {imageUrl && (
          <button
            type="button"
            onClick={() => onImageUrlChange(undefined)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-red-500 transition hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> گەڕانەوە بۆ بنەڕەت
          </button>
        )}
      </div>
    </div>
  );
}

type FaqModalState = { mode: "create" } | { mode: "edit"; faq: AdvertisingFaq };

function FaqModal({
  state,
  accentColor,
  onClose,
  onSubmit,
}: {
  state: FaqModalState;
  accentColor?: string | null;
  onClose: () => void;
  onSubmit: (values: { question: string; answer: string }) => void;
}) {
  const existing = state.mode === "edit" ? state.faq : null;
  const [question, setQuestion] = useState(existing?.question ?? "");
  const [answer, setAnswer] = useState(existing?.answer ?? "");

  return (
    <ManagementModal
      isOpen
      accentColor={accentColor}
      onClose={onClose}
      title={state.mode === "create" ? "پرسیارێکی نوێ" : "دەستکاریکردنی پرسیار"}
      description="پرسیار و وەڵامەکەی دیاری بکە."
      footer={
        <ModalFooterActions
          submitLabel={state.mode === "create" ? "زیادکردن" : "پاشەکەوتکردن"}
          submitDisabled={!question.trim() || !answer.trim()}
          onCancel={onClose}
          onSubmit={() => onSubmit({ question: question.trim(), answer: answer.trim() })}
        />
      }
    >
      <div className="space-y-5">
        <EditorField label="پرسیار" required>
          <input
            autoFocus
            value={question}
            maxLength={140}
            onChange={(event) => setQuestion(event.target.value)}
            className={inputClass}
            placeholder="پرسیار بنووسە..."
            dir="auto"
          />
        </EditorField>
        <EditorField label="وەڵام" required>
          <textarea
            value={answer}
            maxLength={500}
            onChange={(event) => setAnswer(event.target.value)}
            className={cn(textareaClass, "w-full")}
            placeholder="وەڵام بنووسە..."
            dir="auto"
          />
        </EditorField>
      </div>
    </ManagementModal>
  );
}

type ResultModalState = { mode: "create" } | { mode: "edit"; result: AdvertisingResultItem };

function ResultModal({
  state,
  accentColor,
  onClose,
  onSubmit,
}: {
  state: ResultModalState;
  accentColor?: string | null;
  onClose: () => void;
  onSubmit: (values: {
    category: string;
    before: string;
    after: string;
    price: number;
    beforeImageUrl?: string;
    afterImageUrl?: string;
  }) => void;
}) {
  const existing = state.mode === "edit" ? state.result : null;
  const [category, setCategory] = useState(existing?.category ?? "");
  const [before, setBefore] = useState(existing?.before ?? "");
  const [after, setAfter] = useState(existing?.after ?? "");
  const [price, setPrice] = useState(existing?.price ?? 0);
  const [beforeImageUrl, setBeforeImageUrl] = useState(existing?.beforeImageUrl);
  const [afterImageUrl, setAfterImageUrl] = useState(existing?.afterImageUrl);

  // No blob bookkeeping any more: a picked image is uploaded immediately and
  // these hold the persisted URL, so cancelling costs an unreferenced asset
  // that the platform's media cleanup collects, not a broken preview.
  const submit = () => {
    onSubmit({
      category: category.trim(),
      before: before.trim(),
      after: after.trim(),
      price: Math.max(0, price),
      beforeImageUrl,
      afterImageUrl,
    });
  };

  return (
    <ManagementModal
      isOpen
      accentColor={accentColor}
      onClose={onClose}
      title={state.mode === "create" ? "نموونەیەکی نوێ" : "دەستکاریکردنی نموونە"}
      description="جۆری ناوەڕۆک، بینینی پێش و دوای سپۆنسەر و نرخ دیاری بکە."
      footer={
        <ModalFooterActions
          submitLabel={state.mode === "create" ? "زیادکردن" : "پاشەکەوتکردن"}
          submitDisabled={!category.trim() || !before.trim() || !after.trim()}
          onCancel={onClose}
          onSubmit={submit}
        />
      }
    >
      <div className="space-y-5">
        <div className="mx-auto grid max-w-xs grid-cols-2 gap-3">
          <ResultImageUpload label="پێش" imageUrl={beforeImageUrl} onImageUrlChange={setBeforeImageUrl} />
          <ResultImageUpload label="دوای" imageUrl={afterImageUrl} onImageUrlChange={setAfterImageUrl} />
        </div>
        <EditorField label="جۆری ناوەڕۆک" required>
          <input
            autoFocus
            value={category}
            maxLength={40}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
            dir="auto"
            placeholder="بۆ نموونە: بازرگانی — چێشتخانە"
          />
        </EditorField>
        <div className="grid gap-4 sm:grid-cols-2">
          <EditorField label="بینین — پێش" required>
            <input
              value={before}
              maxLength={12}
              onChange={(event) => setBefore(event.target.value)}
              className={inputClass}
              dir="ltr"
              placeholder="4.1K"
            />
          </EditorField>
          <EditorField label="بینین — دوای" required>
            <input
              value={after}
              maxLength={12}
              onChange={(event) => setAfter(event.target.value)}
              className={inputClass}
              dir="ltr"
              placeholder="132K"
            />
          </EditorField>
        </div>
        <EditorField label="نرخ (IQD)">
          <NumberInput value={price} step={1000} clearOnFocus onValueChange={setPrice} className={inputClass} />
        </EditorField>
      </div>
    </ManagementModal>
  );
}

type TestimonialModalState =
  | { mode: "create" }
  | { mode: "edit"; testimonial: AdvertisingTestimonial };

function TestimonialModal({
  state,
  accentColor,
  onClose,
  onSubmit,
}: {
  state: TestimonialModalState;
  accentColor?: string | null;
  onClose: () => void;
  onSubmit: (values: { name: string; role: string; quote: string; avatarUrl?: string }) => void;
}) {
  const existing = state.mode === "edit" ? state.testimonial : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState(existing?.role ?? "");
  const [quote, setQuote] = useState(existing?.quote ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(existing?.avatarUrl);

  const submit = () => {
    onSubmit({ name: name.trim(), role: role.trim(), quote: quote.trim(), avatarUrl });
  };

  return (
    <ManagementModal
      isOpen
      accentColor={accentColor}
      onClose={onClose}
      title={state.mode === "create" ? "ڕایەکی نوێ" : "دەستکاریکردنی ڕا"}
      description="ناو، پیشە و دەقی ڕای کڕیار دیاری بکە."
      footer={
        <ModalFooterActions
          submitLabel={state.mode === "create" ? "زیادکردن" : "پاشەکەوتکردن"}
          submitDisabled={!name.trim() || !quote.trim()}
          onCancel={onClose}
          onSubmit={submit}
        />
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2">
          <AvatarImageUpload
            imageUrl={avatarUrl}
            onFileChange={(event) => {
              void uploadPickedImage(event.target.files?.[0], setAvatarUrl);
            }}
            onRemove={() => setAvatarUrl(undefined)}
            uploadLabel="وێنەی کڕیار هەڵبژێرە"
          />
          <span className="text-[11px] font-bold text-slate-400">وێنە (ئارەزوومەندانە)</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <EditorField label="ناو" required>
            <input
              autoFocus
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="ناوی کڕیار"
              dir="auto"
            />
          </EditorField>
          <EditorField label="پیشە / ڕۆڵ">
            <input
              value={role}
              maxLength={40}
              onChange={(event) => setRole(event.target.value)}
              className={inputClass}
              placeholder="پیشە یان ڕۆڵی کڕیار"
              dir="auto"
            />
          </EditorField>
        </div>
        <EditorField label="ڕا" required>
          <textarea
            value={quote}
            maxLength={280}
            onChange={(event) => setQuote(event.target.value)}
            className={cn(textareaClass, "w-full")}
            placeholder="ڕای کڕیار لێرە بنووسە..."
            dir="auto"
          />
        </EditorField>
      </div>
    </ManagementModal>
  );
}

type PackageCategoryModalState =
  | { mode: "create" }
  | { mode: "edit"; category: AdvertisingPackageCategory };

/** Legacy preset color IDs resolve to a hex so the shared linktree-style picker can highlight them. */
const PACKAGE_PRESET_COLOR_HEX: Record<string, string> = {
  lime: "#65a30d",
  violet: "#7c3aed",
  amber: "#d97706",
  cyan: "#06b6d4",
  rose: "#f43f5e",
  blue: "#3b82f6",
  fuchsia: "#d946ef",
  emerald: "#10b981",
};

const DEFAULT_PACKAGE_COLOR = "#22c55e";

function PackageCategoryModal({
  state,
  accentColor,
  onClose,
  onSubmit,
}: {
  state: PackageCategoryModalState;
  accentColor?: string | null;
  onClose: () => void;
  onSubmit: (label: string, color: string) => void;
}) {
  const [label, setLabel] = useState(state.mode === "edit" ? state.category.label : "");
  const [color, setColor] = useState<string>(() => {
    const current = state.mode === "edit" ? state.category.color : undefined;
    if (!current) return DEFAULT_PACKAGE_COLOR;
    return PACKAGE_PRESET_COLOR_HEX[current] ?? current;
  });

  return (
    <ManagementModal
      isOpen
      accentColor={accentColor}
      onClose={onClose}
      title={state.mode === "create" ? "جۆرێکی نوێی پاکێج" : "دەستکاریکردنی جۆر"}
      description="ناو و ڕەنگی ئەم جۆرە دیاری بکە."
      footer={
        <ModalFooterActions
          submitLabel={state.mode === "create" ? "زیادکردن" : "پاشەکەوتکردن"}
          submitDisabled={!label.trim()}
          onCancel={onClose}
          onSubmit={() => onSubmit(label.trim(), color)}
        />
      }
    >
      <div className="space-y-5">
        <EditorField label="ناوی جۆر" required>
          <input
            autoFocus
            value={label}
            maxLength={30}
            onChange={(event) => setLabel(event.target.value)}
            className={inputClass}
            dir="auto"
            placeholder="بۆ نموونە: خوێندکار"
          />
        </EditorField>
        <EditorField label="ڕەنگ" required>
          <BackgroundColorPicker
            value={color}
            onChange={setColor}
            colors={RAINBOW_BACKGROUND_COLORS}
            allowGradient={false}
          />
        </EditorField>
      </div>
    </ManagementModal>
  );
}

const KNOWN_PAYMENT_PROVIDER_NAMES = Object.keys(PAYMENT_PROVIDER_LOGOS);
const CUSTOM_PAYMENT_PROVIDER_OPTION = "custom";

/** Square logo upload for a custom payment provider; known providers resolve their logo from PROVIDER_LOGOS instead. */
function PaymentLogoUpload({
  logoUrl,
  onLogoUrlChange,
}: {
  logoUrl?: string;
  onLogoUrlChange: (url: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (file: File | undefined) =>
    void uploadPickedImage(file, onLogoUrlChange);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="بارکردنی لۆگۆ"
        className="group/logo relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-white/[0.02]"
      >
        {logoUrl ? (
          <Image src={logoUrl} alt="" width={64} height={64} className="h-16 w-16 object-contain p-1.5" unoptimized />
        ) : (
          <CloudUpload className="h-5 w-5 text-slate-400" />
        )}
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-white opacity-0 transition group-hover/logo:opacity-100">
          <Camera className="h-5 w-5" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          acceptFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {logoUrl && (
        <button
          type="button"
          onClick={() => onLogoUrlChange(undefined)}
          aria-label="سڕینەوەی لۆگۆ"
          className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-sm dark:border-[#1c222b]"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

type PaymentProviderModalState =
  | { mode: "create" }
  | { mode: "edit"; provider: AdvertisingPaymentProvider };

function PaymentProviderModal({
  state,
  accentColor,
  onClose,
  onSubmit,
}: {
  state: PaymentProviderModalState;
  accentColor?: string | null;
  onClose: () => void;
  onSubmit: (values: { name: string; phone: string; logoUrl?: string }) => void;
}) {
  const existing = state.mode === "edit" ? state.provider : null;
  const isKnownName = (name: string) => KNOWN_PAYMENT_PROVIDER_NAMES.includes(name);
  // Defaults to "custom" rather than auto-picking a known logo — picking one
  // is an explicit choice the business makes by tapping it.
  const [pick, setPick] = useState<string>(() =>
    existing && isKnownName(existing.name) ? existing.name : CUSTOM_PAYMENT_PROVIDER_OPTION,
  );
  const [customName, setCustomName] = useState(existing && !isKnownName(existing.name) ? existing.name : "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(existing?.logoUrl);
  const isCustom = pick === CUSTOM_PAYMENT_PROVIDER_OPTION;
  const name = isCustom ? customName.trim() : pick;

  const submit = () => {
    // A catalog provider resolves its own bundled logo, so an upload made
    // before switching away from "custom" is deliberately not carried over.
    onSubmit({ name, phone, logoUrl: isCustom ? logoUrl : undefined });
  };

  return (
    <ManagementModal
      isOpen
      accentColor={accentColor}
      onClose={onClose}
      title={state.mode === "create" ? "شێوازێکی نوێی پارەدان" : "دەستکاریکردنی شێوازی پارەدان"}
      description="لە پارەدانە بەناوبانگەکان هەڵبژێرە یان ناوێکی تایبەت بنووسە."
      footer={
        <ModalFooterActions
          submitLabel={state.mode === "create" ? "زیادکردن" : "پاشەکەوتکردن"}
          submitDisabled={!name}
          onCancel={onClose}
          onSubmit={submit}
        />
      }
    >
      <div className="space-y-5">
        <EditorField label="جۆری پارەدان" required>
          <div className="flex flex-wrap gap-2.5">
            {KNOWN_PAYMENT_PROVIDER_NAMES.map((known) => {
              const logo = PAYMENT_PROVIDER_LOGOS[known];
              const selected = pick === known;
              return (
                <button
                  key={known}
                  type="button"
                  aria-pressed={selected}
                  title={known}
                  onClick={() => setPick(known)}
                  className={cn(
                    "relative flex h-14 w-14 items-center justify-center rounded-xl border-2 bg-white p-1.5 transition dark:bg-white/[0.03]",
                    selected ? "scale-105 border-slate-700 dark:border-white" : "border-transparent",
                  )}
                >
                  {logo && <Image src={logo} alt={known} width={48} height={48} className="h-full w-full object-contain" />}
                  {selected && (
                    <span className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white dark:border-[#1c222b] dark:bg-white dark:text-slate-900">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={isCustom}
              onClick={() => setPick(CUSTOM_PAYMENT_PROVIDER_OPTION)}
              className={cn(
                "flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-slate-500 transition dark:text-slate-400",
                isCustom ? "border-slate-700 dark:border-white" : "border-slate-200 dark:border-white/15",
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="text-[9px] font-bold">تایبەت</span>
            </button>
          </div>
        </EditorField>

        {isCustom && (
          <>
            <EditorField label="ناو" required>
              <input
                autoFocus
                value={customName}
                maxLength={30}
                onChange={(event) => setCustomName(event.target.value)}
                className={inputClass}
                dir="auto"
                placeholder="بۆ نموونە: ZainCash"
              />
            </EditorField>
            <div className="flex items-center gap-3">
              <PaymentLogoUpload logoUrl={logoUrl} onLogoUrlChange={setLogoUrl} />
              <span className="text-[11px] font-bold text-slate-400">لۆگۆ (ئارەزوومەندانە)</span>
            </div>
          </>
        )}

        <EditorField label="ژمارەی مۆبایل">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\s/g, ""))}
            className={inputClass}
            dir="ltr"
            placeholder="7501112222"
          />
        </EditorField>
      </div>
    </ManagementModal>
  );
}

/**
 * Loads the draft, then hands a non-null config to the editor.
 *
 * Split in two so the editor never has to reason about a config that has not
 * arrived: every handler below it dereferences `config` freely, which is only
 * safe because this component does not render the editor until it exists.
 */
export function AdvertisingServicePage({ accentColor, subdomain }: AdvertisingServicePageProps) {
  const [draft, setDraft] = useState<AdvertisingDraftConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdvertisingDraft()
      .then((loaded) => {
        if (!cancelled) setDraft(loaded);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "نەتوانرا زانیارییەکان باربکرێن",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <DashboardSurface>
        <EmptyState
          icon={CircleHelp}
          title="نەتوانرا خزمەتگوزاری ڕیکلام باربکرێت"
          description={loadError}
        />
      </DashboardSurface>
    );
  }

  if (!draft) {
    return (
      <DashboardSurface>
        <EmptyState
          compact
          icon={LayoutDashboard}
          title="بارکردن..."
          description="چاوەڕێی زانیارییەکانی خزمەتگوزاری ڕیکلام بکە."
        />
      </DashboardSurface>
    );
  }

  return (
    <AdvertisingServiceEditor
      accentColor={accentColor}
      subdomain={subdomain}
      initialDraft={draft}
    />
  );
}

/**
 * The whole draft as a save patch. Shared by the editor's Save and the header
 * Publish toggle, which flushes unsaved edits before publishing so the live
 * page always matches what the editor shows.
 */
function savePatchFor(config: AdvertisingServiceConfig): Record<string, unknown> {
  return {
    title: config.title,
    description: config.description,
    whatsappNumber: config.whatsappNumber,
    sections: config.sections,
    closingCta: config.closingCta,
    packageCategories: config.packageCategories.map((category) => ({
      id: category.id,
      label: category.label,
      color: category.color,
      tiers: config.packageTiers[category.id] ?? [],
    })),
    results: config.results,
    testimonials: config.testimonials,
    faqs: config.faqs,
    paymentProviders: config.paymentProviders,
    videoUrl: config.videoUrl,
    videoTutorialTitle: config.videoTutorialTitle,
    tutorialSteps: config.tutorialSteps,
    receiptExampleImageUrl: config.receiptExampleImageUrl ?? null,
  };
}

function AdvertisingServiceEditor({
  accentColor,
  subdomain,
  initialDraft,
}: {
  accentColor?: string | null;
  subdomain: string;
  initialDraft: AdvertisingDraftConfig;
}) {
  const [activeTab, setActiveTab] = useState<AdvertisingTab>("texts");
  const [packageCategory, setPackageCategory] = useState<string>(
    initialDraft.packageCategories[0]?.id ?? "personal",
  );
  const [config, setConfig] = useState<AdvertisingServiceConfig>(initialDraft);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryModal, setCategoryModal] = useState<PackageCategoryModalState | null>(null);
  const [paymentProviderModal, setPaymentProviderModal] = useState<PaymentProviderModalState | null>(null);
  const [testimonialModal, setTestimonialModal] = useState<TestimonialModalState | null>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [resultModal, setResultModal] = useState<ResultModalState | null>(null);
  const [resultIndex, setResultIndex] = useState(0);
  const [faqModal, setFaqModal] = useState<FaqModalState | null>(null);
  const [faqIndex, setFaqIndex] = useState(0);
  // Every destructive action in this editor routes through the shared
  // ConfirmDeleteModal via this one slot, so none of them delete on first click.
  const [pendingDelete, setPendingDelete] = useState<{
    title: string;
    message: string;
    confirm: () => void;
  } | null>(null);

  // Every mutation goes through here so edits only ever touch local state —
  // nothing persists until Save is pressed.
  const applyChange = (updater: (current: AdvertisingServiceConfig) => AdvertisingServiceConfig) => {
    setConfig(updater);
    setDirty(true);
  };

  const updateConfig = <K extends keyof AdvertisingServiceConfig>(
    key: K,
    value: AdvertisingServiceConfig[K],
  ) => applyChange((current) => ({ ...current, [key]: value }));

  /**
   * Saves the whole draft. Sends every field rather than only the active tab's
   * slice: the tabs edit one shared config object, and a partial body would
   * make "which tab was open" decide what persists.
   */
  const handleSave = async () => {
    setSaving(true);
    try {
      // Saving is publishing: the editor's Save and the page's header toggle
      // can land apart, so the primary path travels in one request and one
      // transaction. The version snapshot is still written every time, so
      // history and rollback data keep accumulating even though nothing in
      // this header exposes them.
      const published = await saveAndPublishAdvertising(savePatchFor(config));
      setConfig(published);
      setDirty(false);
      toast.success("گۆڕانکاریەکان پاشەکەوت کران و بڵاوکرانەوە");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "نەتوانرا پاشەکەوت بکرێت");
    } finally {
      setSaving(false);
    }
  };

  const [publishing, setPublishing] = useState(false);
  const isPublished = config.status === "published";

  /**
   * The header toggle. Publishing a page that is not live is the default
   * action; while the page is live the same button unpublishes it. Unsaved
   * edits are flushed first so what goes live is exactly what the editor
   * shows, matching the Save button's behaviour.
   */
  const handleTogglePublish = async () => {
    const wasPublished = config.status === "published";
    setPublishing(true);
    try {
      const next = wasPublished
        ? await unpublishAdvertising()
        : dirty
          ? await saveAndPublishAdvertising(savePatchFor(config))
          : await publishAdvertising();
      setConfig(next);
      setDirty(false);
      toast.success(wasPublished ? "پەیجەکە وەستێنرا" : "پەیجەکە بڵاوکرایەوە");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "نەتوانرا بڵاوکرایەوە");
    } finally {
      setPublishing(false);
    }
  };

  const updateClosingCta = (patch: Partial<AdvertisingServiceConfig["closingCta"]>) => {
    updateConfig("closingCta", { ...config.closingCta, ...patch });
  };

  const updateTutorialStep = (index: number, value: string) => {
    updateConfig(
      "tutorialSteps",
      config.tutorialSteps.map((step, stepIndex) => (stepIndex === index ? value : step)),
    );
  };

  const removeTutorialStep = (index: number) => {
    updateConfig(
      "tutorialSteps",
      config.tutorialSteps.filter((_, stepIndex) => stepIndex !== index),
    );
  };

  const submitPaymentProviderModal = (values: { name: string; phone: string; logoUrl?: string }) => {
    if (!paymentProviderModal) return;
    if (paymentProviderModal.mode === "create") {
      updateConfig("paymentProviders", [
        ...config.paymentProviders,
        { id: createId("provider"), ...values },
      ]);
    } else {
      const editedId = paymentProviderModal.provider.id;
      updateConfig(
        "paymentProviders",
        config.paymentProviders.map((provider) =>
          provider.id === editedId ? { ...provider, ...values } : provider,
        ),
      );
    }
    setPaymentProviderModal(null);
  };

  const removePaymentProvider = (id: string) => {
    updateConfig(
      "paymentProviders",
      config.paymentProviders.filter((provider) => provider.id !== id),
    );
  };

  const updatePackageTiers = (category: string, tiers: AdvertisingPriceRow[]) => {
    updateConfig("packageTiers", { ...config.packageTiers, [category]: tiers });
  };

  const updatePackageTier = (category: string, id: string, patch: Partial<AdvertisingPriceRow>) => {
    updatePackageTiers(
      category,
      (config.packageTiers[category] ?? []).map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)),
    );
  };

  const addPackageTier = (category: string) => {
    updatePackageTiers(category, [
      ...(config.packageTiers[category] ?? []),
      { id: createId("tier"), price: 0, views: "" },
    ]);
  };

  const removePackageTier = (category: string, id: string) => {
    updatePackageTiers(
      category,
      (config.packageTiers[category] ?? []).filter((tier) => tier.id !== id),
    );
  };

  const submitCategoryModal = (label: string, color: string) => {
    if (!categoryModal) return;
    if (categoryModal.mode === "create") {
      const id = createId("category");
      applyChange((current) => ({
        ...current,
        packageCategories: [...current.packageCategories, { id, label, color }],
        packageTiers: { ...current.packageTiers, [id]: [] },
      }));
      setPackageCategory(id);
    } else {
      const editedId = categoryModal.category.id;
      updateConfig(
        "packageCategories",
        config.packageCategories.map((category) =>
          category.id === editedId ? { ...category, label, color } : category,
        ),
      );
    }
    setCategoryModal(null);
  };

  const removePackageCategory = (id: string) => {
    if (config.packageCategories.length <= 1) return;
    const remaining = config.packageCategories.filter((category) => category.id !== id);
    applyChange((current) => {
      const { [id]: _removedTiers, ...restTiers } = current.packageTiers;
      return {
        ...current,
        packageCategories: current.packageCategories.filter((category) => category.id !== id),
        packageTiers: restTiers,
      };
    });
    if (packageCategory === id) setPackageCategory(remaining[0].id);
  };

  const submitResultModal = (values: {
    category: string;
    before: string;
    after: string;
    price: number;
  }) => {
    if (!resultModal) return;
    if (resultModal.mode === "create") {
      updateConfig("results", [
        ...config.results,
        { id: createId("result"), color: pickResultColor(config.results), ...values },
      ]);
      setResultIndex(config.results.length);
    } else {
      const editedId = resultModal.result.id;
      updateConfig(
        "results",
        config.results.map((item) => (item.id === editedId ? { ...item, ...values } : item)),
      );
    }
    setResultModal(null);
  };

  const removeResult = (id: string) => {
    const remaining = config.results.filter((item) => item.id !== id);
    updateConfig("results", remaining);
    setResultIndex((current) => Math.max(0, Math.min(current, remaining.length - 1)));
  };

  const submitTestimonialModal = (values: {
    name: string;
    role: string;
    quote: string;
    avatarUrl?: string;
  }) => {
    if (!testimonialModal) return;
    if (testimonialModal.mode === "create") {
      updateConfig("testimonials", [
        ...config.testimonials,
        { id: createId("testimonial"), color: pickTestimonialColor(config.testimonials), ...values },
      ]);
      setTestimonialIndex(config.testimonials.length);
    } else {
      const editedId = testimonialModal.testimonial.id;
      updateConfig(
        "testimonials",
        config.testimonials.map((item) => (item.id === editedId ? { ...item, ...values } : item)),
      );
    }
    setTestimonialModal(null);
  };

  const removeTestimonial = (id: string) => {
    const remaining = config.testimonials.filter((item) => item.id !== id);
    updateConfig("testimonials", remaining);
    setTestimonialIndex((current) => Math.max(0, Math.min(current, remaining.length - 1)));
  };

  const submitFaqModal = (values: { question: string; answer: string }) => {
    if (!faqModal) return;
    if (faqModal.mode === "create") {
      updateConfig("faqs", [...config.faqs, { id: createId("faq"), ...values }]);
      setFaqIndex(config.faqs.length);
    } else {
      const editedId = faqModal.faq.id;
      updateConfig(
        "faqs",
        config.faqs.map((item) => (item.id === editedId ? { ...item, ...values } : item)),
      );
    }
    setFaqModal(null);
  };

  const removeFaq = (id: string) => {
    const remaining = config.faqs.filter((item) => item.id !== id);
    updateConfig("faqs", remaining);
    setFaqIndex((current) => Math.max(0, Math.min(current, remaining.length - 1)));
  };

  return (
    <div className="space-y-5" dir="ltr">
      <AdvertisingStats config={config} />

      <SegmentedTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

      <DashboardSurface>
        {activeTab === "texts" && (
          <PageHeaderSection
            icon={LayoutDashboard}
            title="دەقی سەرەکی و کۆتایی"
            description="دەقی سەرەتای پەڕە و بەشی بانگهێشتی کۆتایی."
            action={
              <>
                <a
                  href={getSubdomainPageUrl(subdomain, "/advertising")}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!isPublished}
                  title={isPublished ? "کردنەوەی پەیجی گشتی" : "پەیجەکە نابڵاوکراوە"}
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-black transition",
                    isPublished
                      ? "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                      : "pointer-events-none border-dashed border-slate-200 text-slate-400 dark:border-white/10 dark:text-slate-500",
                  )}
                >
                  <ExternalLink className="h-4 w-4" />
                  کردنەوە
                </a>
                <AccentActionButton
                  onClick={() => void handleTogglePublish()}
                  busy={publishing}
                  title={
                    isPublished
                      ? "کرتە بکە بۆ وەستاندنی پەیج"
                      : "بڵاوکردنەوەی پەیج"
                  }
                >
                  {isPublished ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                  {publishing
                    ? isPublished
                      ? "وەستاندن..."
                      : "بڵاوکردنەوە..."
                    : isPublished
                      ? "بڵاوکراوە"
                      : "بڵاوکردنەوە"}
                </AccentActionButton>
                <TabSaveButton
                  dirty={dirty}
                  saving={saving}
                  onSave={() => void handleSave()}
                />
              </>
            }
          >
            <div className="sm:col-span-2 grid gap-6 sm:grid-cols-2 sm:divide-x sm:divide-slate-100 sm:dark:divide-white/5">
              <div className="space-y-4 sm:pe-6">
                <div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">
                    بەشی سەرەکی (سەرەتای پەڕە)
                  </h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    یەکەم شتێکە سەردانکەر دەیبینێت.
                  </p>
                </div>
                <EditorField label="ناونیشانی سەرەکی">
                  <input
                    value={config.title}
                    maxLength={90}
                    onChange={(event) => updateConfig("title", event.target.value)}
                    className={inputClass}
                    dir="auto"
                  />
                </EditorField>
                <EditorField label="وەسفی خزمەتگوزاری">
                  <textarea
                    value={config.description}
                    maxLength={280}
                    onChange={(event) => updateConfig("description", event.target.value)}
                    className={cn(textareaClass, "w-full")}
                    dir="auto"
                  />
                </EditorField>
              </div>

              <div className="space-y-4 sm:ps-6">
                <div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">
                    بانگهێشتی کۆتایی (کۆتایی پەڕە)
                  </h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    دوا بەشی پەڕە کە داواکاری لە سەردانکەر دەکات.
                  </p>
                </div>
                <EditorField label="ناونیشان">
                  <input
                    value={config.closingCta.title}
                    maxLength={90}
                    onChange={(event) => updateClosingCta({ title: event.target.value })}
                    className={inputClass}
                    dir="auto"
                  />
                </EditorField>
                <EditorField label="دەقی دوگمە">
                  <input
                    value={config.closingCta.buttonLabel}
                    maxLength={40}
                    onChange={(event) => updateClosingCta({ buttonLabel: event.target.value })}
                    className={inputClass}
                    dir="auto"
                  />
                </EditorField>
                <EditorField label="وەسف">
                  <input
                    value={config.closingCta.description}
                    maxLength={160}
                    onChange={(event) => updateClosingCta({ description: event.target.value })}
                    className={inputClass}
                    dir="auto"
                  />
                </EditorField>
                <EditorField label="ژمارەی WhatsApp" hint="دوگمەکە بۆ ئێرە دەبات">
                  <input
                    value={config.whatsappNumber}
                    inputMode="tel"
                    placeholder="9647500000000"
                    dir="ltr"
                    onChange={(event) => updateConfig("whatsappNumber", event.target.value)}
                    className={inputClass}
                  />
                </EditorField>
              </div>
            </div>
          </PageHeaderSection>
        )}

        {activeTab === "journey" && (
          <PageHeaderSection
            icon={Route}
            title="قۆناغەکانی سپۆنسەر کردن"
            description="ئەو بەشانەی ڕاژنماییەکە کە ناوەڕۆکیان دەگۆڕدرێت."
            action={
              <>
                <TabSaveButton dirty={dirty} saving={saving} onSave={() => void handleSave()} />
                <AccentActionButton onClick={() => setPaymentProviderModal({ mode: "create" })}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  شێوازێکی نوێ
                </AccentActionButton>
              </>
            }
          >
            <div className="sm:col-span-2 grid gap-6 sm:grid-cols-2 sm:divide-x sm:divide-slate-100 sm:dark:divide-white/5">
              <div className="min-w-0 space-y-4 sm:pe-6">
                <div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">شێوازی پارەدان</h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    ناو و ژمارەی هەر شێوازێک کە کڕیار پارەکەی بۆ دەنێرێت.
                  </p>
                </div>

                {config.paymentProviders.length === 0 ? (
                  <EmptyState
                    compact
                    icon={CloudUpload}
                    title="هیچ شێوازێکی پارەدان زیاد نەکراوە"
                    description={'"شێوازێکی نوێ"ی سەرەوە کرتە بکە بۆ زیادکردنی یەکەم شێواز.'}
                  />
                ) : (
                  <div className="space-y-2.5">
                    {config.paymentProviders.map((provider) => {
                      const logo = provider.logoUrl || PAYMENT_PROVIDER_LOGOS[provider.name];
                      return (
                        <div
                          key={provider.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-white/10"
                        >
                          {logo && (
                            <Image
                              src={logo}
                              alt=""
                              width={32}
                              height={32}
                              className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain p-1 shadow-sm"
                              unoptimized={Boolean(provider.logoUrl)}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200" dir="auto">
                              {provider.name || "بێ ناو"}
                            </p>
                            <p className="truncate text-[11px] text-slate-400" dir="ltr">
                              {provider.phone || "—"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <IconActionButton
                              label={`دەستکاریکردنی ${provider.name || "شێواز"}`}
                              onClick={() => setPaymentProviderModal({ mode: "edit", provider })}
                            >
                              <Pencil className="h-4 w-4" />
                            </IconActionButton>
                            <IconActionButton
                              label={`سڕینەوەی ${provider.name || "شێواز"}`}
                              tone="danger"
                              onClick={() =>
                                setPendingDelete({
                                  title: "سڕینەوەی شێوازی پارەدان",
                                  message: `دڵنیایت لە سڕینەوەی "${provider.name || "ئەم شێوازە"}"؟`,
                                  confirm: () => removePaymentProvider(provider.id),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconActionButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-4 sm:ps-6">
                <div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">وەسڵی پارەدان</h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    وێنەی نموونەی وەسڵ کە بۆ ڕێنمایی کڕیار پیشان دەدرێت.
                  </p>
                </div>
                <div className="flex justify-center">
                  <ReceiptExampleImageUpload
                    imageUrl={config.receiptExampleImageUrl}
                    onImageUrlChange={(url) => updateConfig("receiptExampleImageUrl", url)}
                  />
                </div>
              </div>
            </div>

            {paymentProviderModal && (
              <PaymentProviderModal
                state={paymentProviderModal}
                accentColor={accentColor}
                onClose={() => setPaymentProviderModal(null)}
                onSubmit={submitPaymentProviderModal}
              />
            )}
          </PageHeaderSection>
        )}

        {activeTab === "video" && (
          <PageHeaderSection
            icon={MonitorPlay}
            title="ڤیدیۆی دەرهێنانی کۆد"
            description="ئەم ڤیدیۆیە هەردوو پەڕەکە بەکاردێنن: هەنگاوی ٥ی ڕاژنمایی و پەڕەی /advertising/video-code."
            action={<TabSaveButton dirty={dirty} saving={saving} onSave={() => void handleSave()} />}
          >
            <div className="sm:col-span-2 grid gap-6 sm:grid-cols-2 sm:divide-x sm:divide-slate-100 sm:dark:divide-white/5">
              <div className="min-w-0 space-y-4 sm:pe-6">
                <div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">ڤیدیۆ</h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    ئەم ڤیدیۆیە لە هەنگاوی ٥ی ڕاژنمایی و پەڕەی /advertising/video-code پیشان دەدرێت.
                  </p>
                </div>
                <div className="flex justify-center">
                  <JourneyVideoUpload
                    videoUrl={config.videoUrl}
                    onVideoUrlChange={(url) => updateConfig("videoUrl", url)}
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-4 sm:ps-6">
                <div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">دەق و هەنگاوەکان</h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    ناونیشان، وەسف و هەنگاوەکانی فێرکاری پەڕەی ڤیدیۆ.
                  </p>
                </div>
                <EditorField label="ناونیشانی فێرکاری">
                  <input
                    value={config.videoTutorialTitle}
                    maxLength={90}
                    onChange={(event) => updateConfig("videoTutorialTitle", event.target.value)}
                    className={inputClass}
                    dir="auto"
                  />
                </EditorField>

                <div className="border-t border-slate-100 pt-4 dark:border-white/5">
                  <h5 className="text-xs font-black text-slate-700 dark:text-slate-200">هەنگاوەکانی فێرکاری</h5>
                  <div className="mt-3 space-y-3">
                    {config.tutorialSteps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/12 text-xs font-black text-cyan-700 dark:text-cyan-300">
                          {index + 1}
                        </span>
                        <input
                          value={step}
                          onChange={(event) => updateTutorialStep(index, event.target.value)}
                          className={cn(inputClass, "min-w-0 flex-1")}
                          dir="auto"
                        />
                        <IconActionButton
                          label={`سڕینەوەی هەنگاوی ${index + 1}`}
                          tone="danger"
                          onClick={() =>
                            setPendingDelete({
                              title: "سڕینەوەی هەنگاو",
                              message: `دڵنیایت لە سڕینەوەی هەنگاوی "${step || index + 1}"؟`,
                              confirm: () => removeTutorialStep(index),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconActionButton>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <EditorAddButton
                      label={config.tutorialSteps.length ? "هەنگاوێکی تر" : "زیادکردنی هەنگاو"}
                      onClick={() => updateConfig("tutorialSteps", [...config.tutorialSteps, ""])}
                    />
                  </div>
                </div>
              </div>
            </div>
          </PageHeaderSection>
        )}

        {activeTab === "results" && (
          <PageHeaderSection
            icon={TrendingUp}
            title="پێش و دوای"
            description="هەمان نموونەکانی پەڕەی گشتی — نموونە زیاد، دەستکاری یان بسڕەوە."
            action={
              <>
                <SectionVisibilityToggle
                  checked={config.sections.results}
                  onChange={(checked) => updateConfig("sections", { ...config.sections, results: checked })}
                />
                <TabSaveButton dirty={dirty} saving={saving} onSave={() => void handleSave()} />
                <AccentActionButton onClick={() => setResultModal({ mode: "create" })}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  نموونەی نوێ
                </AccentActionButton>
              </>
            }
          >
            {config.results.length === 0 ? (
              <div className="sm:col-span-2">
                <EmptyState
                  compact
                  icon={TrendingUp}
                  title="هیچ نموونەیەک نییە"
                  description="نموونەیەکی ئەنجام زیاد بکە تاکو لە پەڕەی گشتیدا دەربکەوێت."
                />
              </div>
            ) : (
              (() => {
                const total = config.results.length;
                const activeIndex = Math.min(resultIndex, total - 1);
                return (
                  // The exact public fan, so the editor previews what visitors get.
                  // No auto-advance here — it would pull a card away mid-interaction.
                  <div className="sm:col-span-2">
                    <ResultCardFan
                      items={config.results}
                      activeIndex={activeIndex}
                      onPrevious={() => setResultIndex((activeIndex - 1 + total) % total)}
                      onNext={() => setResultIndex((activeIndex + 1) % total)}
                      renderActions={(item) => (
                        // Above the card's full-bleed range slider (z-10).
                        <div className="absolute end-2 top-9 z-20 flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`دەستکاریکردنی ${item.category}`}
                            onClick={() => setResultModal({ mode: "edit", result: item })}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:bg-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`سڕینەوەی ${item.category}`}
                            onClick={() =>
                              setPendingDelete({
                                title: "سڕینەوەی نموونە",
                                message: `دڵنیایت لە سڕینەوەی نموونەی "${item.category}"؟`,
                                confirm: () => removeResult(item.id),
                              })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    />

                    <ResultFanDots
                      items={config.results}
                      activeIndex={activeIndex}
                      onSelect={setResultIndex}
                      className="mt-6"
                    />
                  </div>
                );
              })()
            )}

            {resultModal && (
              <ResultModal
                state={resultModal}
                accentColor={accentColor}
                onClose={() => setResultModal(null)}
                onSubmit={submitResultModal}
              />
            )}
          </PageHeaderSection>
        )}

        {activeTab === "packages" && (
          <PageHeaderSection
            icon={BadgeDollarSign}
            title="پاکێجەکان"
            description="هەمان پاکێج و نرخەکانی پەڕەی گشتی — نرخ و ڕەزی بینەر زیاد، دەستکاری یان بسڕەوە."
            action={
              <>
                <TabSaveButton dirty={dirty} saving={saving} onSave={() => void handleSave()} />
                <AccentActionButton onClick={() => setCategoryModal({ mode: "create" })}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  جۆری نوێ
                </AccentActionButton>
              </>
            }
          >
            <div className="sm:col-span-2">
              <div
                role="tablist"
                aria-label="جۆری پاکێج"
                className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                {config.packageCategories.map((category) => {
                  const Icon = PACKAGE_CATEGORY_ICONS[category.id] ?? Tag;
                  const categoryTheme = getPackageCategoryTheme(category.color);
                  const isActive = packageCategory === category.id;
                  const tiers = config.packageTiers[category.id] ?? [];
                  return (
                    <div
                      key={category.id}
                      role="tab"
                      tabIndex={0}
                      aria-selected={isActive}
                      onClick={() => setPackageCategory(category.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setPackageCategory(category.id);
                        }
                      }}
                      style={packageCategoryStyle(category.color)}
                      className={cn(
                        "flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold outline-none transition",
                        isActive
                          ? cn(categoryTheme.ring, categoryTheme.soft, categoryTheme.text)
                          : "border-transparent text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="max-w-24 truncate">{category.label || "بێ ناو"}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-black",
                          isActive ? "bg-black/10 dark:bg-white/10" : "bg-slate-100 dark:bg-white/10",
                        )}
                      >
                        {tiers.length}
                      </span>
                      <span className="ms-0.5 flex items-center gap-0.5 border-s border-current/15 ps-1.5">
                        <button
                          type="button"
                          aria-label={`دەستکاریکردنی ${category.label}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCategoryModal({ mode: "edit", category });
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded-md opacity-70 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {config.packageCategories.length > 1 && (
                          <button
                            type="button"
                            aria-label={`سڕینەوەی ${category.label}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setPendingDelete({
                                title: "سڕینەوەی جۆر",
                                message: `دڵنیایت لە سڕینەوەی جۆری "${category.label}" و هەموو پاکێجەکانی؟`,
                                confirm: () => removePackageCategory(category.id),
                              });
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-red-500 transition hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const activeCategory = config.packageCategories.find((category) => category.id === packageCategory);
                if (!activeCategory) return null;
                const categoryTheme = getPackageCategoryTheme(activeCategory.color);
                const tiers = config.packageTiers[activeCategory.id] ?? [];
                return (
                  <div className="mt-4" style={packageCategoryStyle(activeCategory.color)}>
                    {tiers.length === 0 ? (
                      <div className="mt-4">
                        <EmptyState
                          compact
                          icon={BadgeDollarSign}
                          title="هیچ پاکێجێک نییە"
                          description="پاکێجێک زیاد بکە تاکو لە پەڕەی گشتیدا دەربکەوێت."
                        />
                      </div>
                    ) : (
                      <AdvertisingPriceTable
                        className="mt-4"
                        rows={tiers}
                        theme={categoryTheme}
                        onEditPrice={(id, price) => updatePackageTier(activeCategory.id, id, { price })}
                        onEditViews={(id, views) => updatePackageTier(activeCategory.id, id, { views })}
                        onRemove={(id) =>
                          setPendingDelete({
                            title: "سڕینەوەی پاکێج",
                            message: "دڵنیایت لە سڕینەوەی ئەم پاکێجە؟",
                            confirm: () => removePackageTier(activeCategory.id, id),
                          })
                        }
                      />
                    )}

                    <div className="mt-4">
                      <EditorAddButton
                        label={tiers.length ? "پاکێجێکی تر" : "زیادکردنی پاکێج"}
                        onClick={() => addPackageTier(activeCategory.id)}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {categoryModal && (
              <PackageCategoryModal
                state={categoryModal}
                accentColor={accentColor}
                onClose={() => setCategoryModal(null)}
                onSubmit={submitCategoryModal}
              />
            )}
          </PageHeaderSection>
        )}

        {activeTab === "testimonials" && (
          <PageHeaderSection
            icon={Quote}
            title="ڕای کڕیاران"
            description="هەمان ڕاکانی پەڕەی گشتی — بۆچوون زیاد، دەستکاری یان بسڕەوە."
            action={
              <>
                <SectionVisibilityToggle
                  checked={config.sections.testimonials}
                  onChange={(checked) => updateConfig("sections", { ...config.sections, testimonials: checked })}
                />
                <TabSaveButton dirty={dirty} saving={saving} onSave={() => void handleSave()} />
                <AccentActionButton onClick={() => setTestimonialModal({ mode: "create" })}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  ڕایەکی نوێ
                </AccentActionButton>
              </>
            }
          >
            {config.testimonials.length === 0 ? (
              <div className="sm:col-span-2">
                <EmptyState
                  compact
                  icon={Quote}
                  title="هیچ ڕایەک نییە"
                  description="ڕایەکی کڕیار زیاد بکە تاکو لە پەڕەی گشتیدا دەربکەوێت."
                />
              </div>
            ) : (
              (() => {
                const total = config.testimonials.length;
                const activeIndex = Math.min(testimonialIndex, total - 1);
                return (
                  <div className="sm:col-span-2">
                    {/* Same stacked deck as the public section, but without auto-advance —
                        it would pull a card away mid-edit. Every card stays reachable
                        through the dots/arrows below. */}
                    <TestimonialStackCard
                      items={config.testimonials}
                      activeIndex={activeIndex}
                      onSelect={setTestimonialIndex}
                      onPrevious={() => setTestimonialIndex((activeIndex - 1 + total) % total)}
                      onNext={() => setTestimonialIndex((activeIndex + 1) % total)}
                      renderActions={(item) => (
                        <div className="flex shrink-0 items-center gap-1">
                          <IconActionButton
                            label={`دەستکاریکردنی ${item.name || "ڕا"}`}
                            onClick={() => setTestimonialModal({ mode: "edit", testimonial: item })}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconActionButton>
                          <IconActionButton
                            label={`سڕینەوەی ${item.name || "ڕا"}`}
                            tone="danger"
                            onClick={() =>
                              setPendingDelete({
                                title: "سڕینەوەی ڕا",
                                message: `دڵنیایت لە سڕینەوەی ڕای "${item.name || "بێ ناو"}"؟`,
                                confirm: () => removeTestimonial(item.id),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconActionButton>
                        </div>
                      )}
                    />
                  </div>
                );
              })()
            )}

            {testimonialModal && (
              <TestimonialModal
                state={testimonialModal}
                accentColor={accentColor}
                onClose={() => setTestimonialModal(null)}
                onSubmit={submitTestimonialModal}
              />
            )}
          </PageHeaderSection>
        )}

        {activeTab === "faq" && (
          <PageHeaderSection
            icon={CircleHelp}
            title="پرسیارە باوەکان"
            description="هەمان پرسیارەکانی پەڕەی گشتی — پرسیار زیاد، دەستکاری یان بسڕەوە."
            action={
              <>
                <SectionVisibilityToggle
                  checked={config.sections.faq}
                  onChange={(checked) => updateConfig("sections", { ...config.sections, faq: checked })}
                />
                <TabSaveButton dirty={dirty} saving={saving} onSave={() => void handleSave()} />
                <AccentActionButton onClick={() => setFaqModal({ mode: "create" })}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  پرسیاری نوێ
                </AccentActionButton>
              </>
            }
          >
            {config.faqs.length === 0 ? (
              <div className="sm:col-span-2">
                <EmptyState
                  compact
                  icon={CircleHelp}
                  title="هیچ پرسیارێک نییە"
                  description="پرسیارێک زیاد بکە تاکو لە پەڕەی گشتیدا دەربکەوێت."
                />
              </div>
            ) : (
              (() => {
                const total = config.faqs.length;
                const activeIndex = Math.min(faqIndex, total - 1);
                return (
                  // The public FAQ card, so the editor previews what visitors get.
                  <div className="sm:col-span-2 mx-auto w-full max-w-2xl">
                    <FaqCarousel
                      items={config.faqs}
                      activeIndex={activeIndex}
                      onSelect={setFaqIndex}
                      onPrevious={() => setFaqIndex((activeIndex - 1 + total) % total)}
                      onNext={() => setFaqIndex((activeIndex + 1) % total)}
                      renderActions={(faq) => (
                        <span className="flex items-center gap-1">
                          <IconActionButton
                            label={`دەستکاریکردنی ${faq.question}`}
                            onClick={() => setFaqModal({ mode: "edit", faq })}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconActionButton>
                          <IconActionButton
                            label={`سڕینەوەی ${faq.question}`}
                            tone="danger"
                            onClick={() =>
                              setPendingDelete({
                                title: "سڕینەوەی پرسیار",
                                message: `دڵنیایت لە سڕینەوەی "${faq.question}"؟`,
                                confirm: () => removeFaq(faq.id),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconActionButton>
                        </span>
                      )}
                    />
                  </div>
                );
              })()
            )}

            {faqModal && (
              <FaqModal
                state={faqModal}
                accentColor={accentColor}
                onClose={() => setFaqModal(null)}
                onSubmit={submitFaqModal}
              />
            )}
          </PageHeaderSection>
        )}
      </DashboardSurface>

      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => pendingDelete?.confirm()}
        title={pendingDelete?.title ?? ""}
        message={pendingDelete?.message ?? ""}
      />
    </div>
  );
}
