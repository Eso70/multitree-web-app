"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Layers, Trash2 } from "lucide-react";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { useTheme } from "@/lib/contexts/ThemeProvider";
import { ModalWizardActions } from "@/components/shared/ModalWizardActions";
import { ModalWizardProgress } from "@/components/shared/ModalWizardProgress";
import { shouldAdvanceModalWizardOnEnter } from "@/components/shared/modal-wizard-keyboard";
import { LinksStep } from "@/features/link-editor/components/LinksStep";
import {
  MiniWebsiteSectionsStep,
  SECTION_ICONS,
} from "./MiniWebsiteSectionsStep";
import { MiniWebsiteProfessionTemplateStep } from "./MiniWebsiteProfessionTemplateStep";
import { MiniWebsiteLocationFields } from "./MiniWebsiteLocationStep";
import { MiniWebsiteHoursFields } from "./MiniWebsiteHoursStep";
import { MiniWebsiteGalleryFields } from "./MiniWebsiteGalleryStep";
import { MiniWebsiteFaqFields } from "./MiniWebsiteFaqStep";
import { MiniWebsiteServicesFields } from "./MiniWebsiteServicesStep";
import { MiniWebsiteBookingFields } from "./MiniWebsiteBookingStep";
import { MiniWebsiteTeamFields } from "./MiniWebsiteTeamStep";
import { MiniWebsiteCertificateFields } from "./MiniWebsiteCertificatesStep";
import {
  MiniWebsiteVideoFields,
  MiniWebsiteYoutubeVideoFields,
} from "./MiniWebsiteVideosStep";
import { MiniWebsitePartnerFields } from "./MiniWebsitePartnersStep";
import { MiniWebsiteReviewsFields } from "./MiniWebsiteReviewsStep";
import { MiniWebsiteBeforeAfterFields } from "./MiniWebsiteBeforeAfterStep";
import { MiniWebsiteCoverageFields } from "./MiniWebsiteCoverageStep";
import {
  MiniWebsiteAdvantageFields,
  MiniWebsiteAudioFields,
  MiniWebsiteDocumentFields,
  MiniWebsiteEventFields,
  MiniWebsiteImpactStatFields,
  MiniWebsiteOfferFields,
  MiniWebsitePaymentFields,
  MiniWebsiteProcessFields,
} from "./MiniWebsiteExtraSectionsStep";
import { MiniWebsiteLeadFormFields } from "./MiniWebsiteLeadFormStep";
import { MiniWebsitePricingFields } from "./MiniWebsitePricingStep";
import { MiniWebsiteOwnedPropertiesFields } from "./MiniWebsiteOwnedPropertiesStep";
import { MiniWebsiteEducationFields } from "./MiniWebsiteEducationStep";
import { MiniWebsiteExperienceFields } from "./MiniWebsiteExperienceStep";
import { MiniWebsiteStoryFields } from "./MiniWebsiteStoriesStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import { getPlatformNameKurdish } from "@/features/link-editor/modal-constants";
import {
  buildSlugFromName,
  generateUrl,
} from "@/features/link-editor/modal-utils";
import {
  modalInputClass,
  modalTextareaClass,
} from "@/features/link-editor/modal-input-styles";
import { createRuntimeId } from "@/lib/utils/random-id";
import { MiniWebsiteHeroMediaFields } from "./MiniWebsiteContentStep";
import {
  MINI_WEBSITE_SECTIONS,
  type MiniWebsiteDraft,
  type MiniWebsiteSectionKey,
} from "./types";
import { ensureEnabledSectionDefaults } from "./section-defaults";
import { getSectionCountLabel } from "./section-count";
import { useTemplateAccess } from "@/hooks/useTemplateAccess";
import {
  validateCompleteMiniWebsite,
  validateMiniWebsiteStep,
  type MiniWebsiteEditorStep as EditorStep,
} from "./validation";

const steps = [
  { id: "identity" as const, label: "ناسنامە و ڕووکار" },
  { id: "template" as const, label: "قالبی پیشەکان" },
  { id: "platforms" as const, label: "بەشەکانی وێبسایت" },
  { id: "socialLinks" as const, label: "ناوەڕۆک و لینکەکان" },
];

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalTextareaClass(
  false,
  "min-h-28 resize-none py-3 leading-6",
);

/**
 * One configured section in the third step.
 *
 * Gives every block the same compact header so a wall of inputs reads as a
 * clear list of sections in the same fixed order as the public portfolio.
 */
function SectionBlock({
  label,
  icon: Icon,
  countLabel,
  onRemove,
  children,
}: {
  label: string;
  icon: typeof Layers;
  countLabel?: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/75 p-4 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] sm:p-5">
      <header className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-white/5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: "var(--theme-primary, #64748b)" }}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 self-center">
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
            {label}
          </h3>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {countLabel && (
            <span className="mr-1 text-[10px] font-bold tabular-nums text-slate-400">
              {countLabel}
            </span>
          )}
          <IconActionButton
            label="سڕینەوەی بەش"
            tone="danger"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </IconActionButton>
        </span>
      </header>
      {children}
    </section>
  );
}

function normalizeDraftForSave(draft: MiniWebsiteDraft): MiniWebsiteDraft {
  const selected = new Map(
    draft.sections.map((section) => [section.key, section.enabled]),
  );
  return {
    ...draft,
    sections: MINI_WEBSITE_SECTIONS.flatMap((section) =>
      selected.has(section.key)
        ? [{ key: section.key, enabled: selected.get(section.key) !== false }]
        : [],
    ),
    primaryAction: "none",
    whatsappNumber: "",
  };
}

export function MiniWebsiteEditorModal({
  isOpen,
  initial,
  editorId,
  defaultAvatar,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initial: MiniWebsiteDraft;
  editorId?: string | null;
  defaultAvatar: string;
  onClose: () => void;
  onSave: (draft: MiniWebsiteDraft) => void | Promise<void>;
}) {
  const { color: businessTheme } = useTheme();
  const { isLoading: isTemplateAccessLoading, isTemplateAllowed } =
    useTemplateAccess();
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<EditorStep>("identity");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attemptedSteps, setAttemptedSteps] = useState<Set<EditorStep>>(
    () => new Set(),
  );
  const [touchedFields, setTouchedFields] = useState<Set<string>>(
    () => new Set(),
  );
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setDraft({
        ...initial,
        professionTemplate:
          initial.professionTemplate || (editorId ? "custom" : ""),
        primaryAction: "none",
        whatsappNumber: "",
      });
      setStep("identity");
      setSlugError(null);
      setAttemptedSteps(new Set());
      setTouchedFields(new Set());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editorId, initial, isOpen]);

  useEffect(() => {
    const slug = draft.slug.trim();
    if (slug.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (editorId) params.set("excludeId", editorId);
        const res = await fetch(`/api/mini-websites/check-slug?${params}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setSlugError("پشکنینی لینک سەرکەوتوو نەبوو.");
          return;
        }
        setSlugError(json.data ? null : "ئەم لینکە پێشتر بەکارهاتووە");
      } catch {
        if (!controller.signal.aborted)
          setSlugError("پشکنینی لینک سەرکەوتوو نەبوو.");
      }
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draft.slug, editorId]);

  const setField = <K extends keyof MiniWebsiteDraft>(
    key: K,
    value: MiniWebsiteDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const enabledSections = useMemo(() => {
    const selected = new Set(
      draft.sections
        .filter((section) => section.enabled)
        .map((section) => section.key),
    );
    return MINI_WEBSITE_SECTIONS.filter((section) => selected.has(section.key));
  }, [draft.sections]);
  const removeSection = (key: MiniWebsiteSectionKey) =>
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.key !== key),
      ...(key === "socials" ? { socialLinks: [] } : {}),
    }));
  const selectedPlatforms = useMemo(
    () =>
      [...draft.socialLinks]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((link) => link.id),
    [draft.socialLinks],
  );
  const togglePlatform = (platformId: string) =>
    setDraft((current) => {
      const selected = current.socialLinks.some(
        (link) => link.platform === platformId,
      );
      const socialLinks = selected
        ? current.socialLinks.filter((link) => link.platform !== platformId)
        : [
            ...current.socialLinks,
            {
              id: `${platformId}-${createRuntimeId()}`,
              platform: platformId,
              url: "",
              value: "",
              countryCode: "964",
              displayName: getPlatformNameKurdish(platformId),
              enabled: true,
              order: current.socialLinks.length,
            },
          ];
      return {
        ...current,
        socialLinks: socialLinks.map((link, index) => ({
          ...link,
          order: index,
        })),
      };
    });
  const patchSocialLink = (
    id: string,
    patch: Partial<MiniWebsiteDraft["socialLinks"][number]>,
  ) =>
    setDraft((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link) =>
        link.id === id ? { ...link, ...patch } : link,
      ),
    }));
  const updateSocialLink = (id: string, value: string) =>
    setDraft((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link) =>
        link.id === id
          ? {
              ...link,
              value,
              url: generateUrl(link.platform, value, link.countryCode || "964"),
            }
          : link,
      ),
    }));
  const updateCountryCode = (id: string, countryCode: string) =>
    setDraft((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link) =>
        link.id === id
          ? {
              ...link,
              countryCode,
              url: generateUrl(link.platform, link.value || "", countryCode),
            }
          : link,
      ),
    }));
  const removeSocialLink = (id: string) =>
    setDraft((current) => ({
      ...current,
      socialLinks: current.socialLinks
        .filter((link) => link.id !== id)
        .map((link, index) => ({ ...link, order: index })),
    }));
  const addPlatformInstance = (platformId: string) =>
    setDraft((current) => ({
      ...current,
      socialLinks: [
        ...current.socialLinks,
        {
          id: `${platformId}-${createRuntimeId()}`,
          platform: platformId,
          url: "",
          value: "",
          countryCode: "964",
          displayName: getPlatformNameKurdish(platformId),
          enabled: true,
          order: current.socialLinks.length,
        },
      ],
    }));
  const moveSocialLink = (id: string, direction: "up" | "down") =>
    setDraft((current) => {
      const links = [...current.socialLinks].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      const index = links.findIndex((link) => link.id === id);
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= links.length)
        return current;
      [links[index], links[nextIndex]] = [links[nextIndex], links[index]];
      return {
        ...current,
        socialLinks: links.map((link, order) => ({ ...link, order })),
      };
    });
  const stepIndex = steps.findIndex((item) => item.id === step);
  const isFirstStep = stepIndex === 0;
  const isFinalStep = stepIndex === steps.length - 1;
  const stepErrors = useMemo(() => {
    const errors = isFinalStep
      ? validateCompleteMiniWebsite(draft)
      : validateMiniWebsiteStep(draft, step);
    if (step === "identity" || isFinalStep) {
      if (!draft.slug.trim()) errors.slug = "لینکی تایبەت پێویستە.";
      else if (slugError) errors.slug = slugError;
      if (!isTemplateAccessLoading && !isTemplateAllowed(draft.templateKey)) {
        errors.templateKey = "ئەم قالبە لە پلانی ئێستاتدا بەردەست نییە.";
      }
    }
    return errors;
  }, [
    draft,
    isFinalStep,
    isTemplateAccessLoading,
    isTemplateAllowed,
    slugError,
    step,
  ]);
  const stepValid = Object.keys(stepErrors).length === 0;
  const displayErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(stepErrors).filter(
          ([key]) =>
            attemptedSteps.has(step) ||
            touchedFields.has(key) ||
            (key === "slug" &&
              (touchedFields.has("name") || Boolean(slugError))),
        ),
      ),
    [attemptedSteps, slugError, step, stepErrors, touchedFields],
  );
  const socialLinkErrors = useMemo(
    () =>
      Object.fromEntries(
        draft.socialLinks.flatMap((link) => {
          const error = displayErrors[`social.${link.id}`];
          return error ? [[link.id, error]] : [];
        }),
      ),
    [displayErrors, draft.socialLinks],
  );
  const touchField = (field: string) =>
    setTouchedFields((current) => new Set(current).add(field));
  const goNext = () => {
    if (!stepValid) {
      setAttemptedSteps((current) => new Set(current).add(step));
      return;
    }
    const next = steps[stepIndex + 1];
    if (next) {
      if (next.id === "socialLinks") {
        setDraft((current) => ensureEnabledSectionDefaults(current));
      }
      setStep(next.id);
    }
  };
  const goBack = () => {
    const previous = steps[stepIndex - 1];
    if (previous) setStep(previous.id);
  };
  const submit = async () => {
    if (!stepValid) {
      setAttemptedSteps((current) => new Set(current).add(step));
      return;
    }
    setSaving(true);
    try {
      await onSave(
        normalizeDraftForSave(
          draft.status === "draft"
            ? {
                ...draft,
                status: "published",
              }
            : draft,
        ),
      );
    } finally {
      setSaving(false);
    }
  };
  const saveCurrentEdit = async () => {
    if (!editorId) return;
    if (!stepValid) {
      setAttemptedSteps((current) => new Set(current).add(step));
      return;
    }
    setSaving(true);
    try {
      await onSave(normalizeDraftForSave(draft));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ManagementModal
        isOpen={isOpen}
        onClose={onClose}
        title={
          editorId ? "دەستکاریکردنی مینی وێبسایت" : "دروستکردنی مینی وێبسایت"
        }
        wide
        createBusinessStyle
        multiTreeTheme={false}
        // The editor always uses the business tenant colour so the modal looks
        // the same in create and edit mode — in edit mode the draft carries the
        // saved mini website's own accent, which would repaint the chrome.
        accentColor={businessTheme.primary}
        progress={<ModalWizardProgress currentStep={step} steps={steps} />}
        flushFooter
        footer={
          <ModalWizardActions
            isFirstStep={isFirstStep}
            isFinalStep={isFinalStep}
            isSubmitting={saving}
            canContinue={stepValid}
            disableWhenInvalid={false}
            submitLabel={editorId ? "پاشەکەوتکردن" : "دروستکردن"}
            saveCurrentLabel="ئێستا پاشەکەوت بکە"
            onSaveCurrent={
              editorId && !isFinalStep
                ? () => void saveCurrentEdit()
                : undefined
            }
            onBack={goBack}
            onCancel={onClose}
            onNext={goNext}
            onSubmit={() => void submit()}
          />
        }
      >
        <div
          dir="ltr"
          onKeyDown={(event) => {
            if (!shouldAdvanceModalWizardOnEnter(event)) return;
            event.preventDefault();
            event.stopPropagation();
            if (isFinalStep) void submit();
            else goNext();
          }}
        >
          <div className="min-w-0" dir="ltr">
            {step === "identity" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <MiniWebsiteHeroMediaFields
                    draft={draft}
                    onChange={setDraft}
                    defaultAvatar={defaultAvatar}
                    avatarError={displayErrors.avatar}
                    bannerError={displayErrors.heroBanner}
                    accentError={displayErrors.accentColor}
                  />
                </div>
                <Field
                  label="ناوی مینی وێبسایت"
                  error={displayErrors.name}
                  required
                >
                  <input
                    className={fieldClass(displayErrors.name)}
                    value={draft.name}
                    maxLength={160}
                    onChange={(event) => {
                      const name = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        name,
                        slug: name.trim() ? buildSlugFromName(name) : "",
                      }));
                      setSlugError(null);
                    }}
                    onBlur={() => touchField("name")}
                    aria-invalid={Boolean(displayErrors.name)}
                    placeholder="ناوی مینی وێبسایت"
                  />
                </Field>
                <Field
                  label="لینکی تایبەتی خۆکار"
                  error={displayErrors.slug}
                  required
                >
                  <input
                    className={`${fieldClass(displayErrors.slug)} text-left opacity-60`}
                    dir="ltr"
                    value={draft.slug ? `/bio/${draft.slug}` : ""}
                    placeholder="/bio/link"
                    disabled
                    aria-invalid={Boolean(displayErrors.slug)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="سەردێڕ" error={displayErrors.headline} required>
                    <input
                      className={fieldClass(displayErrors.headline)}
                      value={draft.headline}
                      maxLength={240}
                      onChange={(event) =>
                        setField("headline", event.target.value)
                      }
                      onBlur={() => touchField("headline")}
                      aria-invalid={Boolean(displayErrors.headline)}
                      placeholder="سەردێڕی مینی وێبسایت"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="دەربارە" error={displayErrors.bio} required>
                    <textarea
                      className={`${textareaClass} ${errorClass(displayErrors.bio)}`}
                      value={draft.bio}
                      maxLength={4000}
                      onChange={(event) => setField("bio", event.target.value)}
                      onBlur={() => touchField("bio")}
                      aria-invalid={Boolean(displayErrors.bio)}
                      placeholder="دەربارەی مینی وێبسایت"
                    />
                  </Field>
                </div>
              </div>
            )}
            {step === "template" && (
              <MiniWebsiteProfessionTemplateStep
                draft={draft}
                onChange={setDraft}
                error={displayErrors.professionTemplate}
              />
            )}
            {step === "platforms" && (
              <MiniWebsiteSectionsStep
                draft={draft}
                onChange={setDraft}
                onTogglePlatform={togglePlatform}
                errors={displayErrors}
              />
            )}
            {step === "socialLinks" && (
              <div className="space-y-6">
                {enabledSections.map((section) => (
                  <SectionBlock
                    key={section.key}
                    label={section.label}
                    icon={SECTION_ICONS[section.key] ?? Layers}
                    countLabel={getSectionCountLabel(draft, section.key)}
                    onRemove={() => removeSection(section.key)}
                  >
                    {section.key === "socials" && (
                      <LinksStep
                        selectedPlatforms={selectedPlatforms}
                        socialLinks={draft.socialLinks}
                        linkErrors={socialLinkErrors}
                        error={displayErrors.platforms}
                        touched={attemptedSteps.has("socialLinks")}
                        onUpdateLink={updateSocialLink}
                        onUpdateCountryCode={updateCountryCode}
                        onUpdateDisplayName={(id, displayName) =>
                          patchSocialLink(id, { displayName })
                        }
                        onUpdateCustomColor={(id, customColor) =>
                          patchSocialLink(id, { customColor })
                        }
                        onUpdateCustomIcon={(id, customIcon) =>
                          patchSocialLink(id, { customIcon })
                        }
                        onRemoveLink={removeSocialLink}
                        onAddPlatformInstance={addPlatformInstance}
                        onMoveLink={moveSocialLink}
                        onBlurLink={(id) => touchField(`social.${id}`)}
                        iconUploadUrl="/api/mini-websites/upload/image"
                      />
                    )}
                    {section.key === "location" && (
                      <MiniWebsiteLocationFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "hours" && (
                      <MiniWebsiteHoursFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "gallery" && (
                      <MiniWebsiteGalleryFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "faq" && (
                      <MiniWebsiteFaqFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "services" && (
                      <MiniWebsiteServicesFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "booking" && (
                      <MiniWebsiteBookingFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "team" && (
                      <MiniWebsiteTeamFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "credentials" && (
                      <MiniWebsiteCertificateFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "shortVideos" && (
                      <MiniWebsiteVideoFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "youtubeVideos" && (
                      <MiniWebsiteYoutubeVideoFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "stories" && (
                      <MiniWebsiteStoryFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "partners" && (
                      <MiniWebsitePartnerFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "reviews" && (
                      <MiniWebsiteReviewsFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "beforeAfter" && (
                      <MiniWebsiteBeforeAfterFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "serviceAreas" && (
                      <MiniWebsiteCoverageFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "payments" && (
                      <MiniWebsitePaymentFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "offers" && (
                      <MiniWebsiteOfferFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "events" && (
                      <MiniWebsiteEventFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "audio" && (
                      <MiniWebsiteAudioFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "whyChooseUs" && (
                      <MiniWebsiteAdvantageFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "impactStats" && (
                      <MiniWebsiteImpactStatFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "process" && (
                      <MiniWebsiteProcessFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "documents" && (
                      <MiniWebsiteDocumentFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "ownedProperties" && (
                      <MiniWebsiteOwnedPropertiesFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "education" && (
                      <MiniWebsiteEducationFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "experience" && (
                      <MiniWebsiteExperienceFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "leadForm" && (
                      <MiniWebsiteLeadFormFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                    {section.key === "pricing" && (
                      <MiniWebsitePricingFields
                        draft={draft}
                        onChange={setDraft}
                        errors={displayErrors}
                      />
                    )}
                  </SectionBlock>
                ))}
              </div>
            )}
          </div>
        </div>
      </ManagementModal>
    </>
  );
}

function Field({
  label,
  error,
  required = false,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <MiniWebsiteFieldLabel
        required={required}
        className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400"
      >
        {label}
      </MiniWebsiteFieldLabel>
      {children}
      {error && <InlineError message={error} />}
    </label>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <span className="mt-1.5 flex items-start gap-1.5 text-[10px] font-semibold leading-4 text-rose-500">
      <AlertCircle className="mt-px h-3 w-3 shrink-0" />
      {message}
    </span>
  );
}

function errorClass(error?: string) {
  return error
    ? "border-rose-400 bg-rose-50/40 focus:ring-rose-500/20 dark:border-rose-500/40 dark:bg-rose-500/10"
    : "";
}

function fieldClass(error?: string) {
  return `${inputClass} ${errorClass(error)}`;
}
