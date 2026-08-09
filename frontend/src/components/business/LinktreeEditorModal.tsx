"use client";

import { memo, useState, useEffect, useMemo, useCallback, useRef, startTransition } from "react";
import { BasicInfoStep } from "@/features/link-editor/components/BasicInfoStep";
import { PlatformSelectionStep } from "@/features/link-editor/components/PlatformSelectionStep";
import { LinksStep } from "@/features/link-editor/components/LinksStep";
import {
  BACKGROUND_COLORS,
  DEFAULT_SUBTITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_FOOTER_TEXT,
  DEFAULT_FOOTER_PHONE,
  getPlatformNameKurdish
} from "@/features/link-editor/modal-constants";
import { buildSlugFromName, generateUrl, extractValueFromUrl } from "@/features/link-editor/modal-utils";
import { validateSingleLink } from "@/features/link-editor/components/validation";
import { TEMPLATE_DEFAULT_ID, isTemplateKey, normalizeTemplateConfig, type TemplateKey } from "@/lib/templates/config";
import { debounce } from "@/lib/utils/debounce";
import type { WhatsAppQuestion } from "@/components/public/WhatsAppQuestionModal";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { ModalWizardProgress } from "@/components/shared/ModalWizardProgress";
import { ModalWizardActions } from "@/components/shared/ModalWizardActions";
import { shouldAdvanceModalWizardOnEnter } from "@/components/shared/modal-wizard-keyboard";
import { useSubmissionLock } from "@/hooks/useSubmissionLock";
import type { SocialLink } from "@/features/link-editor/types";
import { groupSocialLinksByPlatform, normalizeSelectedSocialLinks } from "@/features/link-editor/link-payload";
import { useTheme } from "@/lib/contexts/ThemeProvider";
import { InlineRequestError } from "@/components/shared/InlineRequestError";
import { SkeletonForm } from "@/components/shared/Skeleton";
import {
  createUploadFailureError,
  inlineRequestErrorFromResponse,
  type InlineRequestErrorData,
  validateUploadFile,
} from "@/lib/api/inline-request-error";
import { enqueueImageUpload } from "@/lib/api/enqueue-image-upload";

interface EditLinkData {
  linktree: {
    id: string;
    name: string;
    subtitle?: string | null;
    description?: string | null;
    seo_name?: string | null;
    uid: string;
    image?: string | null;
    background_color: string;
    template_config?: Record<string, unknown> | null;
    footer_text?: string | null;
    footer_phone?: string | null;
    footer_hidden?: boolean | null;
    status?: string;
  };
  links: Array<{
    id: string;
    platform: string;
    url: string;
    display_name?: string | null;
    description?: string | null;
    default_message?: string | null;
    display_order: number;
    metadata?: Record<string, unknown> | null;
  }>;
}

interface LinktreeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDefault?: boolean;
  onSubmit: (data: {
    is_default?: boolean;
    name: string;
    subtitle?: string;
    description?: string;
    slug: string;
    image: string | null;
    background_color: string;
    templateKey: TemplateKey;
    templateConfig: Record<string, unknown>;
    footer_text?: string;
    footer_phone?: string;
    footer_hidden?: boolean;
    platforms: string[];
    links: Record<string, string[]>;
    linkMetadata?: Record<string, Array<{display_name?: string; description?: string; default_message?: string; metadata?: Record<string, unknown>}>>;
  }, editId?: string) => void;
  editData?: EditLinkData | null;
  isLoadingEditData?: boolean;
  /** Business defaults set by the platform administrator. */
  businessDefaults?: {
    default_footer_text?: string | null;
    default_footer_phone?: string | null;
    default_template?: string | null;
    default_background_color?: string | null;
    default_footer_hidden?: boolean;
    default_whatsapp_enabled?: boolean;
    default_avatar?: string | null;
  } | null;
  businessIdentity?: {
    name?: string | null;
    phone?: string | null;
  } | null;
}

/**
 * What a new page's canvas starts as when the business has set no page default.
 *
 * White, and never the tenant colour — `website_color` themes the dashboard and
 * the public shell, and presetting it here made every new page open on the
 * brand colour. Mirrors DEFAULT_LINKTREE_BACKGROUND_COLOR in
 * backend/src/common/linktree-defaults.ts.
 */
const DEFAULT_BACKGROUND_COLOR = "#ffffff";

function resolveDefaultBackgroundColor(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_BACKGROUND_COLOR;
  }

  const preset = BACKGROUND_COLORS.find((color) => {
    return color.id === trimmed || color.value.toLowerCase() === trimmed.toLowerCase();
  });

  return preset?.value ?? trimmed;
}

function resolveDefaultTemplateKey(value?: string | null): TemplateKey {
  return value && isTemplateKey(value) ? value : TEMPLATE_DEFAULT_ID;
}

function normalizeBusinessPhone(value?: string | null): {
  value: string;
  countryCode: string;
} {
  const digits = value?.replace(/\D/g, "") || "";
  if (!digits) return { value: "", countryCode: "964" };
  return extractValueFromUrl("phone", `tel:+${digits}`);
}

export const LinktreeEditorModal = memo(function LinktreeEditorModal({
  isOpen,
  onClose,
  onSubmit,
  editData,
  isLoadingEditData = false,
  businessDefaults,
  businessIdentity,
  isDefault = false,
}: LinktreeEditorModalProps) {
  const { color: businessTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState<"basic" | "select" | "links">("basic");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(businessDefaults?.default_avatar || null);
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [slug, setSlug] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(() => resolveDefaultBackgroundColor(businessDefaults?.default_background_color));
  const [templateKey, setTemplateKey] = useState<TemplateKey>(() => resolveDefaultTemplateKey(businessDefaults?.default_template));
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const selectedPlatforms = useMemo(
    () =>
      [...socialLinks]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((link) => link.id),
    [socialLinks],
  );
  const { isSubmitting, beginSubmission, resetSubmission } = useSubmissionLock();
  const [footerText, setFooterText] = useState(businessDefaults?.default_footer_text || DEFAULT_FOOTER_TEXT);
  const [footerPhone, setFooterPhone] = useState(businessDefaults?.default_footer_phone || DEFAULT_FOOTER_PHONE);
  const [footerHidden, setFooterHidden] = useState(businessDefaults?.default_footer_hidden ?? false);
  const [templateConfig, setTemplateConfig] = useState<Record<string, unknown>>(() => normalizeTemplateConfig(resolveDefaultTemplateKey(businessDefaults?.default_template), null));
  
  // WhatsApp modal questions state
  const [whatsappModalEnabled, setWhatsappModalEnabled] = useState(businessDefaults?.default_whatsapp_enabled ?? false);
  const [whatsappModalTitle, setWhatsappModalTitle] = useState("پەیوەندی کردن");
  const [whatsappModalSubtitle, setWhatsappModalSubtitle] = useState("پرسیارێک هەڵبژێرە");
  const [whatsappQuestions, setWhatsappQuestions] = useState<WhatsAppQuestion[]>([
    { id: "order", text: "داواکردن", message: "سڵاو بەڕێز دەمەوێت داوا بکەم." },
    { id: "price", text: "زانینی نرخ", message: "سڵاو بەڕێز، نرخی چەندە ؟" },
    { id: "other", text: "پرسیارێکی تر", message: "سڵاو" },
  ]);
  
  // Dark Card template-specific state
  const [darkCardDescTitle, setDarkCardDescTitle] = useState("");
  const [darkCardDescText, setDarkCardDescText] = useState("");
  const [darkCardDescImage, setDarkCardDescImage] = useState<File | null>(null);
  const [darkCardDescImagePreview, setDarkCardDescImagePreview] = useState<string | null>(null);
  const [darkCardTiktokUsername, setDarkCardTiktokUsername] = useState("");
  const [darkCardTiktokLink, setDarkCardTiktokLink] = useState("");
  const darkCardDescImageInputRef = useRef<HTMLInputElement>(null);

  // Validation errors state
  const [errors, setErrors] = useState<{
    name?: string;
    slug?: string;
    backgroundColor?: string;
    templateKey?: string;
    platforms?: string;
    links?: string;
    footerPhone?: string;
    image?: string;
  }>({});
  
  // Per-link validation errors: { platformId_linkIndex: errorMessage }
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    slug?: boolean;
    backgroundColor?: boolean;
    templateKey?: boolean;
    platforms?: boolean;
    links?: boolean;
    footerPhone?: boolean;
  }>({});
  
  const [slugApiError, setSlugApiError] = useState<string | null>(null);
  const [uploadError, setUploadError] =
    useState<InlineRequestErrorData | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!editData;
  const initializedLinktreeIdRef = useRef<string | null>(null);

  // Generate unique ID for links - memoized to prevent dependency issues
  const generateLinkId = useCallback((platformId: string): string => {
    return `${platformId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Real-time validation functions
  const validateName = useCallback((value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 1) {
      return "تکایە ناو بنووسە";
    }
    if (trimmed.length > 100) {
      return "ناو دەبێت کەمتر لە ١٠٠ پیت بێت";
    }
    return undefined;
  }, []);

  const validateSlug = useCallback((value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 1) {
      return "تکایە slug بنووسە";
    }
    if (trimmed.length > 100) {
      return "Slug دەبێت کەمتر لە ١٠٠ پیت بێت";
    }
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      return "Slug دەبێت تەنها پیتی بچووک، ژمارە و هێڵ بێت";
    }
    return undefined;
  }, []);

  const validateBackgroundColor = useCallback((value: string): string | undefined => {
    const selectedBgColor = BACKGROUND_COLORS.find(c => c.id === value)?.value || value;
    if (!selectedBgColor) {
      return "تکایە ڕەنگی باکگڕاوند هەڵبژێرە";
    }
    return undefined;
  }, []);

  const validateTemplateKey = useCallback((value: string): string | undefined => {
    if (!value || !isTemplateKey(value)) {
      return "تکایە شێوازی پەڕە هەڵبژێرە";
    }
    return undefined;
  }, []);

  const validatePlatforms = useCallback((platforms: string[]): string | undefined => {
    if (!platforms || platforms.length === 0) {
      return "لانیکەم یەک پلاتفۆڕمەکان هەڵبژێرە";
    }
    return undefined;
  }, []);

  const validateLinks = useCallback((links: SocialLink[], selected: string[]): string | undefined => {
    if (!selected || selected.length === 0) {
      return "لانیکەم یەک پلاتفۆڕمەکان هەڵبژێرە";
    }
    
    let hasError = false;
    const newLinkErrors: Record<string, string> = {};
    
    // Validate each link
    for (const linkId of selected) {
      const link = links.find(l => l.id === linkId);
      if (!link) continue;
      
      const linkValue = link.value?.trim() || "";
      const linkUrl = link.url?.trim() || "";
      
      // Must have either value or URL
      if (!linkValue && !linkUrl) {
        newLinkErrors[linkId] = "تکایە بەهای لینکەکە بنووسە";
        hasError = true;
        continue;
      }

      const error = validateSingleLink(link.platform, linkValue, link.countryCode);
      if (error) {
        newLinkErrors[linkId] = error;
        hasError = true;
      }
    }
    
    if (hasError) {
      setLinkErrors(newLinkErrors);
      return "تکایە هەڵەی لینکەکان چاک بکەرەوە";
    } else {
      setLinkErrors({});
    }
    
    return undefined;
  }, []);

  const validateFooterPhone = useCallback((value: string): string | undefined => {
    const trimmed = value.trim();
    if (trimmed && !/^\+?\d{10,15}$/.test(trimmed)) {
      return "ژمارەی مۆبایلی دەستپێکردن نادروستە (دەبێت ١٠-١٥ ژمارە بێت)";
    }
    return undefined;
  }, []);

  // Validate all fields before submission
  const validateAllFields = useCallback((): boolean => {
    const newErrors: typeof errors = {};
    
    newErrors.name = validateName(name);
    newErrors.slug = validateSlug(slug) || slugApiError || undefined;
    newErrors.backgroundColor = validateBackgroundColor(backgroundColor);
    newErrors.templateKey = validateTemplateKey(templateKey);
    newErrors.platforms = validatePlatforms(selectedPlatforms);
    newErrors.links = validateLinks(socialLinks, selectedPlatforms);
    if (footerPhone.trim()) {
      newErrors.footerPhone = validateFooterPhone(footerPhone);
    }
    
    setErrors(newErrors);
    setTouched({
      name: true,
      slug: true,
      backgroundColor: true,
      templateKey: true,
      platforms: true,
      links: true,
      footerPhone: true,
    });
    
    return !Object.values(newErrors).some(error => error !== undefined);
  }, [name, slug, slugApiError, backgroundColor, templateKey, selectedPlatforms, socialLinks, footerPhone, validateName, validateSlug, validateBackgroundColor, validateTemplateKey, validatePlatforms, validateLinks, validateFooterPhone]);

  // Debounced name validation
  const debouncedNameValidation = useMemo(
    () => debounce((value: unknown) => {
      if (touched.name && typeof value === 'string') {
        setErrors(prev => ({ ...prev, name: validateName(value) }));
      }
    }, 200),
    [touched.name, validateName]
  );

  // Update validation on field changes - optimized
  const handleNameChange = useCallback((value: string) => {
    setName(value);
    debouncedNameValidation(value);
  }, [debouncedNameValidation]);

  const handleNameBlur = useCallback(() => {
    setTouched(prev => ({ ...prev, name: true }));
    setErrors(prev => ({ ...prev, name: validateName(name) }));
  }, [name, validateName]);

  const handleBackgroundColorChange = useCallback((value: string) => {
    setBackgroundColor(value);
    if (touched.backgroundColor) {
      setErrors(prev => ({ ...prev, backgroundColor: validateBackgroundColor(value) }));
    }
  }, [touched.backgroundColor, validateBackgroundColor]);

  const handleBackgroundColorBlur = useCallback(() => {
    setTouched(prev => ({ ...prev, backgroundColor: true }));
    setErrors(prev => ({ ...prev, backgroundColor: validateBackgroundColor(backgroundColor) }));
  }, [backgroundColor, validateBackgroundColor]);

  const handleTemplateKeyChange = useCallback((value: TemplateKey) => {
    setTemplateKey(value);
    setTemplateConfig((prev) => normalizeTemplateConfig(value, prev));
    setTouched(prev => ({ ...prev, templateKey: true }));
    setErrors(prev => ({ ...prev, templateKey: validateTemplateKey(value) }));
  }, [validateTemplateKey]);

  // Handle image upload - memoized for performance
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateUploadFile(file, {
        allowedMimeTypes: ["image/png", "image/jpeg"],
        maxBytes: 10 * 1024 * 1024,
      });
      if (validationError) {
        setUploadError(validationError);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      setUploadError(null);
      
      // Clear any previous image errors
      setErrors(prev => ({ ...prev, image: undefined }));
      
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setProfileImage(null);
    // Reset to business's default avatar instead of null
    setProfileImagePreview(businessDefaults?.default_avatar || null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [businessDefaults]);

  // Dark Card description image handlers
  const handleDarkCardDescImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateUploadFile(file, {
        allowedMimeTypes: ["image/png", "image/jpeg"],
        maxBytes: 10 * 1024 * 1024,
      });
      if (validationError) {
        setUploadError(validationError);
        return;
      }
      setUploadError(null);
      setDarkCardDescImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDarkCardDescImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDarkCardDescImageRemove = useCallback(() => {
    setDarkCardDescImage(null);
    setDarkCardDescImagePreview(null);
    if (darkCardDescImageInputRef.current) {
      darkCardDescImageInputRef.current.value = "";
    }
  }, []);

  // Upload image to local file system storage
  const uploadImage = async (file: File, assetType: "profile-image" | "dark-card-description"): Promise<string | null> => {
    return enqueueImageUpload(async () => {
      setUploadError(null);
      try {
        const formData = new FormData();
        const linktreeKey = (editData?.linktree.id || slug || name || "draft").trim().toLowerCase();
        formData.append("file", file);
        formData.append("linktreeKey", linktreeKey);
        formData.append("assetType", assetType);

        const response = await fetch("/api/linktrees/upload", {
          method: "POST",
          cache: 'no-store', // Always fetch fresh data
          credentials: 'include', // Include cookies for authentication
          body: formData,
        });

        if (!response.ok) {
          setUploadError(inlineRequestErrorFromResponse(response));
          return null;
        }

        const result = await response.json();
        return result.url || null;
      } catch {
        setUploadError(createUploadFailureError());
        return null;
      }
    });
  };

  // Removed processedLinks memo - now computed inline in useEffect to avoid dependency issues

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      initializedLinktreeIdRef.current = null;
      setUploadError(null);
      resetSubmission();
      setLinkErrors({});
      const defaultTemplate = resolveDefaultTemplateKey(businessDefaults?.default_template);
      setBackgroundColor(resolveDefaultBackgroundColor(businessDefaults?.default_background_color));
      setTemplateKey(defaultTemplate);
      setTemplateConfig(normalizeTemplateConfig(defaultTemplate, null));
    }
  }, [isOpen, businessDefaults?.default_background_color, businessDefaults?.default_template, resetSubmission]);

  // Initialize form data when editing (optimized - only runs when editData changes)
  useEffect(() => {
    if (!isOpen || isLoadingEditData) {
      return;
    }

    // Initialize only once when editData is first loaded or when switching between edit/create modes
    const shouldInitialize = editData 
      ? (initializedLinktreeIdRef.current !== editData.linktree.id)
      : (initializedLinktreeIdRef.current !== "create");

    if (!shouldInitialize) {
      return;
    }

    if (editData) {
      // ============================================
      // VALIDATE AND SANITIZE EDIT DATA
      // ============================================
      const linktree = editData.linktree;
      
      // Validate linktree ID
      if (!linktree.id || typeof linktree.id !== "string") {
        console.error("Invalid linktree ID in edit data");
        console.error("Invalid linktree data");
        return;
      }
      
      // Sanitize and set name (max 100 chars)
      const sanitizedName = (linktree.name || "").trim().slice(0, 100);
      if (!sanitizedName) {
        setName("Untitled Linktree");
      } else {
        setName(sanitizedName);
      }
      
      // Sanitize and set subtitle (max 200 chars)
      const sanitizedSubtitle = (linktree.subtitle || "").trim().slice(0, 200);
      setSubtitle(sanitizedSubtitle || DEFAULT_SUBTITLE);

      // Sanitize and set description (max 500 chars)
      const sanitizedDescription = (linktree.description || "").trim().slice(0, 500);
      setDescription(sanitizedDescription || DEFAULT_DESCRIPTION);
      
      // Sanitize and set slug (max 100 chars, validate format)
      const sanitizedSlug = (linktree.seo_name || buildSlugFromName(sanitizedName)).trim().slice(0, 100);
      setSlug(sanitizedSlug || buildSlugFromName(sanitizedName));
      
      // Validate and set background color
      const bgColor = linktree.background_color || "#eab308";
      setBackgroundColor(resolveDefaultBackgroundColor(bgColor));

      const normalizedConfig = normalizeTemplateConfig(undefined, (linktree.template_config as Record<string, unknown> | null) ?? null);
      const configTemplateKey = normalizedConfig["templateKey"];
      const sanitizedTemplate = (typeof configTemplateKey === "string" && isTemplateKey(configTemplateKey))
        ? configTemplateKey
        : TEMPLATE_DEFAULT_ID;
      setTemplateKey(sanitizedTemplate);
      setTemplateConfig(normalizedConfig);
      
      // Load WhatsApp modal config from template_config
      const whatsappModal = (linktree.template_config as Record<string, unknown> | null)?.whatsapp_modal;
      if (whatsappModal && typeof whatsappModal === 'object' && !Array.isArray(whatsappModal)) {
        const modal = whatsappModal as Record<string, unknown>;
        // Load enabled flag, default to false if not found
        const enabled = typeof modal.enabled === 'boolean' ? modal.enabled : false;
        setWhatsappModalEnabled(enabled);
        if (typeof modal.title === 'string') setWhatsappModalTitle(modal.title);
        if (typeof modal.subtitle === 'string') setWhatsappModalSubtitle(modal.subtitle);
        if (Array.isArray(modal.questions)) {
          const questions = modal.questions
            .filter((q): q is WhatsAppQuestion => {
              if (!q || typeof q !== 'object') return false;
              const obj = q as unknown as Record<string, unknown>;
              return (
                typeof obj.id === 'string' &&
                typeof obj.text === 'string' &&
                typeof obj.message === 'string'
              );
            })
            .map(q => {
              const obj = q as unknown as Record<string, unknown>;
              return {
                id: obj.id as string,
                text: obj.text as string,
                message: obj.message as string,
              };
            });
          if (questions.length > 0) setWhatsappQuestions(questions);
        }
      }

      // Load Dark Card config from template_config
      const darkCard = (linktree.template_config as Record<string, unknown> | null)?.dark_card;
      if (darkCard && typeof darkCard === 'object' && !Array.isArray(darkCard)) {
        const dc = darkCard as Record<string, unknown>;
        if (typeof dc.desc_title === 'string') setDarkCardDescTitle(dc.desc_title);
        if (typeof dc.desc_text === 'string') setDarkCardDescText(dc.desc_text);
        if (typeof dc.desc_image === 'string' && dc.desc_image) setDarkCardDescImagePreview(dc.desc_image);
        if (typeof dc.tiktok_username === 'string') setDarkCardTiktokUsername(dc.tiktok_username);
        if (typeof dc.tiktok_link === 'string') setDarkCardTiktokLink(dc.tiktok_link);
      }

      // Sanitize footer text (max 200 chars)
      const sanitizedFooterText = (linktree.footer_text || "").trim().slice(0, 200);
      // Always default to "MultiTree" if empty
      setFooterText(sanitizedFooterText || DEFAULT_FOOTER_TEXT);
      
      // Validate and sanitize footer phone
      const footerPhoneValue = (linktree.footer_phone || "").trim();
      if (footerPhoneValue && /^\+?\d{10,15}$/.test(footerPhoneValue)) {
        setFooterPhone(footerPhoneValue);
      } else {
        setFooterPhone(DEFAULT_FOOTER_PHONE);
      }

      // Set footer hidden
      setFooterHidden(linktree.footer_hidden ?? false);

      
      // Validate and set image
      if (linktree.image && typeof linktree.image === "string") {
        const imageUrl = linktree.image.trim();
        // Accept valid URLs (absolute or relative) and data URLs
        if (
          imageUrl.startsWith("http://") ||
          imageUrl.startsWith("https://") ||
          imageUrl.startsWith("/") ||
          imageUrl.startsWith("data:image/")
        ) {
          setProfileImagePreview(imageUrl);
        } else {
          // Silently handle invalid URLs - don't log warnings for edge cases
          setProfileImagePreview(null);
        }
      } else {
        setProfileImagePreview(null);
      }
      
      // Use memoized processed links (already validated in useMemo)
      // Access processedLinks directly from the memoized value
      const currentProcessedLinks = editData.links && editData.links.length > 0
        ? (() => {
            const sortedLinks = [...editData.links].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            return sortedLinks.map((link, index) => {
              const linkId = `${link.platform}-${link.id}-${index}`;
              const extracted = extractValueFromUrl(link.platform, link.url, link.metadata || null);
              return {
                id: linkId,
                platform: link.platform,
                url: link.url,
                value: extracted.value,
                countryCode: extracted.countryCode,
                displayName: link.display_name || getPlatformNameKurdish(link.platform), // Pre-fill with Kurdish if not set
                customColor: (link.metadata as Record<string, string>)?.custom_color,
                customIcon: (link.metadata as Record<string, string>)?.custom_icon,
                enabled: true,
                order: link.display_order || index,
              };
            });
          })()
        : [];
      
      if (currentProcessedLinks.length > 0) {
        setSocialLinks(currentProcessedLinks);
      } else {
        setSocialLinks([]);
      }
      
      // Only reset to first step when first opening edit mode, not on subsequent renders
      if (initializedLinktreeIdRef.current === null) {
        setCurrentStep("basic");
        resetSubmission();
      }
      
      initializedLinktreeIdRef.current = editData.linktree.id;
    } else if (!editData) {
      // Reset form for create mode - use business defaults if available
      const defaultTemplate = resolveDefaultTemplateKey(businessDefaults?.default_template);
      const defaultBusinessName = businessIdentity?.name?.trim() || "";
      const defaultBusinessPhone =
        businessIdentity?.phone?.trim() ||
        businessDefaults?.default_footer_phone?.trim() ||
        "";
      setName(isDefault ? defaultBusinessName : "");
      setSubtitle(DEFAULT_SUBTITLE);
      setDescription(DEFAULT_DESCRIPTION);
      setSlug("");
      setBackgroundColor(resolveDefaultBackgroundColor(businessDefaults?.default_background_color));
      setTemplateKey(defaultTemplate);
      setTemplateConfig(normalizeTemplateConfig(defaultTemplate, null));
      setProfileImage(null);
      setProfileImagePreview(businessDefaults?.default_avatar || null);
      if (isDefault) {
        const normalizedPhone = normalizeBusinessPhone(defaultBusinessPhone);
        setSocialLinks(
          ["whatsapp", "phone"].map((platform, order) => ({
            id: generateLinkId(platform),
            platform,
            url: generateUrl(
              platform,
              normalizedPhone.value,
              normalizedPhone.countryCode,
            ),
            value: normalizedPhone.value,
            countryCode: normalizedPhone.countryCode,
            displayName: getPlatformNameKurdish(platform),
            enabled: true,
            order,
          })),
        );
      } else {
        setSocialLinks([]);
      }
      setFooterText(businessDefaults?.default_footer_text || DEFAULT_FOOTER_TEXT);
      setFooterPhone(businessDefaults?.default_footer_phone || DEFAULT_FOOTER_PHONE);
      setFooterHidden(businessDefaults?.default_footer_hidden ?? false);
      setWhatsappModalEnabled(businessDefaults?.default_whatsapp_enabled ?? false);
      setWhatsappModalTitle("پەیوەندی کردن");
      setWhatsappModalSubtitle("پرسیارێک هەڵبژێرە");
      setWhatsappQuestions([
        { id: "order", text: "داواکردن", message: "سڵاو بەڕێز دەمەوێت داوا بکەم." },
        { id: "price", text: "زانینی نرخ", message: "سڵاو بەڕێز، نرخی چەندە ؟" },
        { id: "other", text: "پرسیارێکی تر", message: "سڵاو" },
      ]);
      // Reset dark card fields
      setDarkCardDescTitle("");
      setDarkCardDescText("");
      setDarkCardDescImage(null);
      setDarkCardDescImagePreview(null);
      setDarkCardTiktokUsername("");
      setDarkCardTiktokLink("");
      setCurrentStep("basic");
      resetSubmission();
      initializedLinktreeIdRef.current = "create";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData?.linktree.id, isOpen, isLoadingEditData]);

  // Debounced slug generation - optimized for performance
  const debouncedSlugUpdate = useMemo(
    () => debounce((newName: unknown) => {
      if (typeof newName === 'string' && newName && !isEditMode) {
        const generatedSlug = buildSlugFromName(newName);
        startTransition(() => {
          setSlug(generatedSlug);
          // Validate auto-generated slug
          if (touched.slug) {
            setErrors(prev => ({ ...prev, slug: validateSlug(generatedSlug) }));
          }
        });
      }
    }, 300),
    [isEditMode, touched.slug, validateSlug]
  );

  // Auto-generate slug from name
  useEffect(() => {
    debouncedSlugUpdate(name);
  }, [name, debouncedSlugUpdate]);

  // Debounced slug availability API check
  useEffect(() => {
    const s = slug.trim();
    if (!s) {
      setSlugApiError(null);
      setCheckingSlug(false);
      return;
    }
    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug: s });
        if (isEditMode && editData?.linktree?.id) params.set('excludeId', editData.linktree.id);
        const res = await fetch(`/api/linktrees/check-slug?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) {
          setSlugApiError(json.data ? null : 'ئەم سلاگە پێشتر بەکارهاتووە');
          if (!json.data) setTouched(prev => ({ ...prev, slug: true }));
        }
      } catch {
        // network error — don't block
      } finally {
        setCheckingSlug(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [slug, isEditMode, editData?.linktree?.id]);

  // Merge API slug error into displayed errors
  const displayErrors = useMemo(() => {
    if (!slugApiError) return errors;
    return { ...errors, slug: slugApiError };
  }, [errors, slugApiError]);

  // Note: platformMap removed - using functional state updates instead for better reliability

  useEffect(() => {
    if (!touched.platforms) return;
    setErrors((previous) => ({
      ...previous,
      platforms: validatePlatforms(selectedPlatforms),
    }));
  }, [selectedPlatforms, touched.platforms, validatePlatforms]);

  // Toggle a platform by updating the canonical link list. Selected IDs are
  // derived from this list so the selection and links steps cannot drift.
  const togglePlatform = useCallback((platformId: string) => {
    startTransition(() => {
      setSocialLinks(prevLinks => {
        const existingLinks = prevLinks.filter(l => l.platform === platformId);
        const isSelected = existingLinks.length > 0;
        
        if (isSelected) {
          return prevLinks
            .filter(l => l.platform !== platformId)
            .map((link, index) => ({ ...link, order: index }));
        }

        const newLink: SocialLink = {
          id: generateLinkId(platformId),
          platform: platformId,
          url: "",
          value: "",
          displayName: getPlatformNameKurdish(platformId),
          enabled: true,
          order: prevLinks.length,
        };
        const nonGpsLinks = prevLinks.filter(link => link.platform !== "gps");
        const gpsLinks = prevLinks.filter(link => link.platform === "gps");
        const nextLinks = platformId === "gps"
          ? [...nonGpsLinks, newLink]
          : [...nonGpsLinks, newLink, ...gpsLinks];

        return nextLinks.map((link, index) => ({ ...link, order: index }));
      });
    });
  }, [generateLinkId]);

  // Add another instance of a platform - memoized for performance
  const addPlatformInstance = useCallback((platformId: string) => {
    if (platformId === "gps") {
      return;
    }
    const newLinkId = generateLinkId(platformId);
    setSocialLinks(prev => {
      const newLink: SocialLink = {
        id: newLinkId,
        platform: platformId,
        url: "",
        value: "",
        displayName: getPlatformNameKurdish(platformId), // Pre-fill with Kurdish
        enabled: true,
        order: prev.length,
      };
      const nonGpsLinks = prev.filter(link => link.platform !== "gps");
      const gpsLinks = prev.filter(link => link.platform === "gps");
      const nextLinks = [...nonGpsLinks, newLink, ...gpsLinks];
      return nextLinks.map((link, index) => ({ ...link, order: index }));
    });
  }, [generateLinkId]);

  // Remove a link instance - memoized for performance
  const removeLinkInstance = useCallback((linkId: string) => {
    setSocialLinks(prev =>
      prev
        .filter(link => link.id !== linkId)
        .map((link, index) => ({ ...link, order: index })),
    );
    setLinkErrors((previous) => {
      const next = { ...previous };
      delete next[linkId];
      return next;
    });
  }, []);

  // Update social link
  const updateSocialLink = useCallback((id: string, value: string) => {
    setSocialLinks(prev => {
      const existing = prev.find(link => link.id === id);
      const platformId = existing ? existing.platform : (id.includes('-') ? id.split('-')[0] : id);
      const isPhoneBased = platformId === "whatsapp" || platformId === "phone" || platformId === "viber";
      const code = isPhoneBased ? (existing?.countryCode || "964") : "";
      const url = generateUrl(platformId, value || "", isPhoneBased ? code : undefined);

      // If this link already has an error, re-validate it in real-time
      if (linkErrors[id]) {
        const error = validateSingleLink(platformId, value || "", code);
        setLinkErrors(prevErrors => {
          if (error) {
            return { ...prevErrors, [id]: error };
          } else {
            const nextErrors = { ...prevErrors };
            delete nextErrors[id];
            return nextErrors;
          }
        });
      }

      if (!existing) {
        // Create new link if it doesn't exist
        const newLink: SocialLink = {
          id,
          platform: platformId,
          url,
          value: value || "",
          countryCode: code,
          displayName: getPlatformNameKurdish(platformId), // Pre-fill with Kurdish
          enabled: true,
          order: prev.length,
        };
        return [...prev, newLink];
      }

      // Update existing link
      const updatedLink: SocialLink = {
        ...existing,
        url,
        value: value || "",
        countryCode: code,
      };

      // Return new array with updated link
      return prev.map(link => (link.id === id ? updatedLink : link));
    });
  }, [linkErrors]);

  // Update display name for a link
  const updateDisplayName = useCallback((id: string, displayName: string) => {
    setSocialLinks(prev => {
      const existing = prev.find(link => link.id === id);
      if (!existing) {
        return prev; // Link doesn't exist
      }

      // Create updated link object
      const updatedLink: SocialLink = {
        ...existing,
        displayName: displayName.trim() || undefined,
      };

      // Return new array with updated link
      return prev.map(link => (link.id === id ? updatedLink : link));
    });
  }, []);

  // Update custom color for a link
  const updateCustomColor = useCallback((id: string, customColor: string) => {
    setSocialLinks(prev => {
      const existing = prev.find(link => link.id === id);
      if (!existing) {
        return prev;
      }
      return prev.map(link => (link.id === id ? { ...existing, customColor } : link));
    });
  }, []);

  // Update custom icon for a link
  const updateCustomIcon = useCallback((id: string, customIcon: string) => {
    setSocialLinks(prev => {
      const existing = prev.find(link => link.id === id);
      if (!existing) {
        return prev;
      }
      return prev.map(link => (link.id === id ? { ...existing, customIcon } : link));
    });
  }, []);

  const updateCountryCode = useCallback((id: string, countryCode: string) => {
    if (!countryCode || !/^\d{1,3}$/.test(countryCode.trim())) {
      return;
    }

    const trimmedCode = countryCode.trim();

    // Update the link with new country code
    setSocialLinks(prev => {
      const existing = prev.find(link => link.id === id);
      if (!existing) {
        return prev; // Link doesn't exist
      }

      // Only update country code for phone-based platforms
      const isPhoneBased = existing.platform === "whatsapp" || existing.platform === "phone" || existing.platform === "viber";
      if (!isPhoneBased) {
        return prev; // Not a phone-based platform
      }

      // Generate new URL with updated country code and current value
      const newUrl = generateUrl(existing.platform, existing.value || "", trimmedCode);

      // Create updated link object
      const updatedLink: SocialLink = {
        ...existing,
        url: newUrl,
        countryCode: trimmedCode,
      };

      // Run validation with the new country code and current value
      const error = validateSingleLink(existing.platform, existing.value || "", trimmedCode);
      setLinkErrors(prevErrors => {
        if (error) {
          return { ...prevErrors, [id]: error };
        } else {
          const nextErrors = { ...prevErrors };
          delete nextErrors[id];
          return nextErrors;
        }
      });

      // Return new array with updated link
      return prev.map(link => (link.id === id ? updatedLink : link));
    });
  }, []);

  const handleLinkBlur = useCallback((id: string) => {
    const link = socialLinks.find(l => l.id === id);
    if (!link) return;

    const error = validateSingleLink(link.platform, link.value || "", link.countryCode);
    setLinkErrors(prev => {
      if (error) {
        return { ...prev, [id]: error };
      } else {
        const next = { ...prev };
        delete next[id];
        return next;
      }
    });
  }, [socialLinks]);

  // Handle next step with validation - memoized for performance
  const handleNextStep = useCallback(() => {
    if (currentStep === "basic") {
      // Validate basic fields before moving to next step
      const nameError = validateName(name);
      const slugError = slug.trim() ? validateSlug(slug) : undefined;
      const bgError = validateBackgroundColor(backgroundColor);
      const templateError = validateTemplateKey(templateKey);
      
      if (nameError || slugError || slugApiError || bgError || templateError) {
        setErrors(prev => ({
          ...prev,
          name: nameError,
          slug: slugError || slugApiError || undefined,
          backgroundColor: bgError,
          templateKey: templateError,
        }));
        setTouched(prev => ({
          ...prev,
          name: true,
          slug: slug.trim() ? true : false,
          backgroundColor: true,
          templateKey: true,
        }));
        
        if (nameError) {
          console.error(nameError);
          document.getElementById("name")?.focus();
        } else if (slugError || slugApiError) {
          console.error(slugError || slugApiError);
          document.getElementById("slug")?.focus();
        } else if (bgError) {
          console.error(bgError);
        } else if (templateError) {
          console.error(templateError);
        }
        return;
      }
      
      // Clear errors if validation passes
      setErrors(prev => ({ ...prev, name: undefined, slug: slugApiError || undefined, backgroundColor: undefined, templateKey: undefined }));
      setCurrentStep("select");
    } else if (currentStep === "select") {
      // Validate platforms before moving to links step
      const platformsError = validatePlatforms(selectedPlatforms);
      
      if (platformsError) {
        setErrors(prev => ({ ...prev, platforms: platformsError }));
        setTouched(prev => ({ ...prev, platforms: true }));
        console.error(platformsError);
        return;
      }
      
      // Clear errors if validation passes
      setErrors(prev => ({ ...prev, platforms: undefined }));
      setCurrentStep("links");
    }
  }, [currentStep, name, slug, slugApiError, backgroundColor, templateKey, selectedPlatforms, validateName, validateSlug, validateBackgroundColor, validateTemplateKey, validatePlatforms]);

  // Handle back step - memoized for performance
  const handleBackStep = useCallback(() => {
    if (currentStep === "select") {
      setCurrentStep("basic");
    } else if (currentStep === "links") {
      setCurrentStep("select");
    }
  }, [currentStep]);

  // Handle submit - ONLY called when "پاشەکەوتکردن" button is clicked,
  // or by "تۆمارکردنەوە" save-current on edit mode (which allows saving
  // without advancing to the final step, mirroring the mini website editor).
  const handleSubmit = async (
    e: React.FormEvent,
    opts?: { allowNonFinalStep?: boolean },
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    // CRITICAL: Prevent duplicate submissions
    // CRITICAL: Only allow submission on the links step
    if (currentStep !== "links" && !opts?.allowNonFinalStep) {
      return;
    }
    if (!beginSubmission()) return;
    
    try {
      // ============================================
      // VALIDATION CHECKS
      // ============================================
      
      // Validate all fields before submission
      if (!validateAllFields()) {
        // Focus first invalid field
        if (errors.name) {
          document.getElementById("name")?.focus();
        } else if (errors.slug) {
          document.getElementById("slug")?.focus();
        } else if (errors.backgroundColor) {
          // Scroll to background color section
          document.querySelector('[data-bg-color-section]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (errors.templateKey || !templateKey || !isTemplateKey(templateKey)) {
          document.querySelector('[data-template-section]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (errors.platforms) {
          // Scroll to platforms section
          if (currentStep === "links") {
            setCurrentStep("select");
          }
        } else if (errors.links) {
          // Already on links step - validation will show inline
        }
        throw new Error("Validation failed");
      }
      
      // Validate name
      const sanitizedName = name.trim();
      
      // Validate slug
      const sanitizedSlug = slug.trim() || buildSlugFromName(sanitizedName);
      
      // Validate background color
      const selectedBgColor = BACKGROUND_COLORS.find(c => c.id === backgroundColor)?.value || backgroundColor;

      const selectedTemplateKey = isTemplateKey(templateKey) ? templateKey : TEMPLATE_DEFAULT_ID;
      
      // Validate links
      if (!selectedPlatforms || selectedPlatforms.length === 0) {
        console.error("لانیکەم یەک پلاتفۆڕمەکان هەڵبژێرە");
        throw new Error("No platforms selected");
      }
      
      // ============================================
      // IMAGE UPLOAD
      // ============================================
      let imageUrl: string | null = null;
      if (profileImage) {
        try {
          imageUrl = await uploadImage(profileImage, "profile-image");
          if (!imageUrl) {
            console.error("هەڵە لە بارکردنی وێنە");
            throw new Error("Image upload failed");
          }
        } catch (imageError) {
          console.error("Image upload error:", imageError);
          console.error("هەڵە لە بارکردنی وێنە");
          throw imageError;
        }
      } else if (profileImagePreview && !profileImage) {
        // Use existing image URL (only if it's not the default avatar)
        // Don't store default avatar in database - UI will handle it
        if (profileImagePreview !== "/images/DefaultAvatar.png") {
          imageUrl = profileImagePreview;
        }
        // If preview is default avatar, leave imageUrl as null
      }
      // If no image provided, imageUrl stays null - UI will show default avatar

      // ============================================
      // UPLOAD DARK CARD DESCRIPTION IMAGE
      // ============================================
      let darkCardDescImageUrl: string | null = null;
      if (darkCardDescImage) {
        try {
          darkCardDescImageUrl = await uploadImage(darkCardDescImage, "dark-card-description");
        } catch {
          // Non-critical - continue without desc image
        }
      } else if (darkCardDescImagePreview && !darkCardDescImage) {
        darkCardDescImageUrl = darkCardDescImagePreview;
      }

      // ============================================
      // PROCESS LINKS DATA
      // ============================================
      const normalizedLinks = normalizeSelectedSocialLinks(socialLinks, selectedPlatforms);
      const {
        urls: processedLinks,
        metadata: linkMetadata,
      } = groupSocialLinksByPlatform(normalizedLinks);
      // Final validation: ensure we have at least one link
      if (Object.keys(processedLinks).length === 0) {
        const hasSelectedPlatforms = selectedPlatforms.length > 0;
        if (hasSelectedPlatforms) {
          console.error("تکایە بەروارەکان بۆ لینکەکان بنووسە");
        } else {
          console.error("لانیکەم یەک پلاتفۆڕمەکان هەڵبژێرە");
        }
        throw new Error("No valid links provided");
      }

      // ============================================
      // SANITIZE TEXT FIELDS
      // ============================================
      const sanitizedSubtitle = subtitle.trim();
      const sanitizedDescription = description.trim() || DEFAULT_DESCRIPTION;
      const sanitizedFooterText = footerText.trim() || undefined;
      const sanitizedFooterPhone = footerPhone.trim() || undefined;
      
      // Validate footer phone format if provided
      if (sanitizedFooterPhone) {
        const phoneError = validateFooterPhone(sanitizedFooterPhone);
        if (phoneError) {
          setErrors(prev => ({ ...prev, footerPhone: phoneError }));
          setTouched(prev => ({ ...prev, footerPhone: true }));
          console.error(phoneError);
          throw new Error(phoneError);
        }
      }

      // ============================================
      // PREPARE PLATFORMS ARRAY
      // ============================================
      const platforms = Array.from(
        new Set(
          socialLinks
            .filter(l => selectedPlatforms.includes(l.id))
            .map(l => l.platform)
        )
      );

      // ============================================
      // CALL PARENT SUBMIT HANDLER (AWAIT IT)
      // ============================================
      // Store WhatsApp modal config in template_config before normalization
      const templateConfigWithMessage = {
        ...templateConfig,
        // Include whatsapp_modal with enabled flag
        whatsapp_modal: {
          enabled: whatsappModalEnabled,
          ...(whatsappModalEnabled && whatsappQuestions.length > 0 ? {
            title: whatsappModalTitle.trim() || "پەیوەندی کردن",
            subtitle: whatsappModalSubtitle.trim() || "پرسیارێک هەڵبژێرە",
            questions: whatsappQuestions.filter(q => q.text.trim() && q.message.trim()),
          } : {}),
        },
        // Include dark_card config
        dark_card: {
          desc_title: darkCardDescTitle.trim() || null,
          desc_text: darkCardDescText.trim() || null,
          desc_image: darkCardDescImageUrl || null,
          tiktok_username: darkCardTiktokUsername.trim() || null,
          tiktok_link: darkCardTiktokLink.trim() || null,
        },
      };
      const normalizedTemplateConfig = normalizeTemplateConfig(selectedTemplateKey, templateConfigWithMessage);

      await onSubmit({
        name: sanitizedName,
        subtitle: sanitizedSubtitle,
        description: sanitizedDescription,
        slug: sanitizedSlug,
        image: imageUrl,
        background_color: selectedBgColor,
        templateKey: selectedTemplateKey,
        templateConfig: normalizedTemplateConfig,
        footer_text: sanitizedFooterText,
        footer_phone: sanitizedFooterPhone,
        footer_hidden: footerHidden,
        platforms: platforms,
        links: processedLinks,
        linkMetadata: Object.keys(linkMetadata).length > 0 ? linkMetadata : undefined,
        ...(isDefault ? { is_default: true } : {}),
      }, editData?.linktree.id);

      // Note: Modal closing is handled by parent component after successful submission
      // Don't reset isSubmitting here - let the modal close naturally reset the state
      // This keeps the button disabled with spinner until modal closes
      
    } catch (error) {
      console.error("Error submitting:", error);
      
      // Check if error has link-specific errors
      if (error && typeof error === 'object' && 'linkErrors' in error) {
        const linkErrorsData = (error as Error & { linkErrors?: Record<string, string> }).linkErrors;
        if (linkErrorsData && Object.keys(linkErrorsData).length > 0) {
          // Map link errors to display format
          // The key format from API is: platform_index (where index is position in linksToCreate)
          // We need to map this to our linkId format
          const mappedErrors: Record<string, string> = {};
          
          // Build a map of platform+index to linkId
          // We need to match the order in which links were processed
          const platformLinkCounts = new Map<string, number>();
          selectedPlatforms.forEach(linkId => {
            const link = socialLinks.find(l => l.id === linkId);
            if (!link) return;
            
            const count = platformLinkCounts.get(link.platform) || 0;
            const errorKey = `${link.platform}_${count}`;
            
            if (linkErrorsData[errorKey]) {
              mappedErrors[linkId] = linkErrorsData[errorKey];
            }
            
            platformLinkCounts.set(link.platform, count + 1);
          });
          
          if (Object.keys(mappedErrors).length > 0) {
            setLinkErrors(mappedErrors);
            console.error("هەندێک لینک هەڵەیەک هەیە. تکایە چاکی بکەوە");
          } else {
            // Fallback: show general error if mapping failed
            if (!(error instanceof Error && error.message === "Validation failed")) {
              console.error("هەڵە لە پاشەکەوتکردن");
            }
          }
        } else {
          // No link-specific errors, show general error
          if (!(error instanceof Error && error.message === "Validation failed")) {
            console.error("هەڵە لە پاشەکەوتکردن");
          }
        }
      } else {
        // No link-specific errors, show general error
        if (!(error instanceof Error && error.message === "Validation failed")) {
          console.error("هەڵە لە پاشەکەوتکردن");
        }
      }
      
      // ALWAYS reset submission flag on error so user can retry
      resetSubmission();
    }
  };

  // Handle reorder links - move up or down
  const handleMoveLink = useCallback((linkId: string, direction: 'up' | 'down') => {
    // Get current sorted links for reordering
    const currentSorted = selectedPlatforms
      .map(linkId => {
        const link = socialLinks.find(l => l.id === linkId);
        if (!link) return null;
        return { linkId, link };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => (a.link.order ?? 0) - (b.link.order ?? 0));

    const currentIndex = currentSorted.findIndex((item) => item.linkId === linkId);
    
    if (currentIndex === -1) return;

    const currentItem = currentSorted[currentIndex];
    if (currentItem.link.platform === "gps") return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= currentSorted.length) return;

    // Swap items
    const reorderedLinks = [...currentSorted];
    [reorderedLinks[currentIndex], reorderedLinks[newIndex]] = [reorderedLinks[newIndex], reorderedLinks[currentIndex]];
    
    const gpsItems = reorderedLinks.filter((item) => item.link.platform === "gps");
    const nonGpsItems = reorderedLinks.filter((item) => item.link.platform !== "gps");
    const orderedItems = [...nonGpsItems, ...gpsItems];

    const newSelectedPlatforms = orderedItems.map((item: { linkId: string }) => item.linkId);

    setSocialLinks((prev) =>
      prev.map((link) => {
        const index = newSelectedPlatforms.indexOf(link.id);
        return index !== -1 ? { ...link, order: index } : link;
      })
    );
  }, [selectedPlatforms, socialLinks]);

  // Check if there are any valid links (with values filled in) - optimized
  const hasValidLinks = useMemo(() => {
    if (selectedPlatforms.length === 0) return false;
    
    // Create a map for O(1) lookup instead of O(n) find
    const linksMap = new Map(socialLinks.map(link => [link.id, link]));
    
    // Every selected platform must have a completed, valid link.
    for (const linkId of selectedPlatforms) {
      const link = linksMap.get(linkId);
      if (!link) return false;
      
      // Check if link has a value (user has filled in the input)
      const hasValue = link.value && link.value.trim();
      if (!hasValue) return false;

      if (validateSingleLink(link.platform, link.value || "", link.countryCode)) {
        return false;
      }
      
      // Generate URL to verify it's valid
      const linkUrl = link.url && link.url.trim() 
        ? link.url 
        : generateUrl(link.platform, link.value || "", link.countryCode);
      
      if (!linkUrl || !linkUrl.trim()) return false;
    }
    
    return true;
  }, [selectedPlatforms, socialLinks]);

  const canContinueToNextStep = useMemo(() => {
    if (isLoadingEditData) return false;

    if (currentStep === "basic") {
      const slugError = slug.trim() ? validateSlug(slug) : undefined;
      return !checkingSlug
        && !slugApiError
        && !validateName(name)
        && !slugError
        && !validateBackgroundColor(backgroundColor)
        && !validateTemplateKey(templateKey);
    }

    if (currentStep === "select") {
      return selectedPlatforms.length > 0;
    }

    return false;
  }, [
    isLoadingEditData,
    currentStep,
    checkingSlug,
    slugApiError,
    name,
    slug,
    backgroundColor,
    templateKey,
    selectedPlatforms.length,
    validateName,
    validateSlug,
    validateBackgroundColor,
    validateTemplateKey,
  ]);

if (!isOpen) return null;

  return (
    <ManagementModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditMode
          ? "دەستکاریکردنی پەڕە"
          : isDefault
            ? "دروستکردنی پەڕەی بنەڕەتی"
            : "پەڕەی نوێ دروست بکە"
      }
      description={
        currentStep === "basic"
          ? "زانیارییە سەرەکییەکان"
          : currentStep === "select"
            ? "پلاتفۆڕمەکان هەڵبژێرە"
            : "لینکەکان زیاد بکە"
      }
      createBusinessStyle
      multiTreeTheme={false}
      // The page being designed owns the modal's colour, so a checkbox or a
      // required marker in here matches what the visitor will actually see.
      accentColor={businessTheme.primary}
      progress={
        <ModalWizardProgress
          currentStep={currentStep}
          steps={[
            { id: "basic", label: "زانیارییەکان" },
            { id: "select", label: "پلاتفۆڕمەکان" },
            { id: "links", label: "لینکەکان" },
          ]}
        />
      }
      flushFooter
      footer={
        <ModalWizardActions
          isFirstStep={currentStep === "basic"}
          isFinalStep={currentStep === "links"}
          isLoadingData={isLoadingEditData}
          isSubmitting={isSubmitting}
          canContinue={currentStep === "links" ? hasValidLinks : canContinueToNextStep}
          disableWhenInvalid={false}
          submitLabel={
            isEditMode
              ? "پاشەکەوتکردن"
              : isDefault
                ? "دروستکردنی پەڕەی بنەڕەتی"
                : "دروستکردن"
          }
          saveCurrentLabel="ئێستا پاشەکەوت بکە"
          onSaveCurrent={
            isEditMode && currentStep !== "links"
              ? () => {
                  if (isSubmitting) return;
                  handleSubmit(
                    {
                      preventDefault: () => {},
                      stopPropagation: () => {},
                    } as React.FormEvent<HTMLFormElement>,
                    { allowNonFinalStep: true },
                  );
                }
              : undefined
          }
          onBack={handleBackStep}
          onCancel={onClose}
          onNext={handleNextStep}
          onSubmit={() => {
            if (currentStep !== "links" || isSubmitting) return;
            handleSubmit({
              preventDefault: () => {},
              stopPropagation: () => {},
            } as React.FormEvent<HTMLFormElement>);
          }}
        />
      }
    >
      <div
        dir="ltr"
        onKeyDown={(e) => {
          if (!shouldAdvanceModalWizardOnEnter(e)) return;
          e.preventDefault();
          e.stopPropagation();

          if (currentStep === "basic" || currentStep === "select") {
            handleNextStep();
          } else if (currentStep === "links" && !isSubmitting) {
            const syntheticEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
            } as React.FormEvent<HTMLFormElement>;
            handleSubmit(syntheticEvent);
          }
        }}
      >
        {uploadError && (
          <InlineRequestError className="mb-4" error={uploadError} />
        )}
        {/* Loading state mirrors the first editor step to prevent layout shift. */}
        {isLoadingEditData && (
          <SkeletonForm fields={5} />
        )}

        {/* Step 1: Basic Info */}
        {!isLoadingEditData && currentStep === "basic" && (
          <BasicInfoStep
            profileImagePreview={profileImagePreview}
            hideRemoveImage={!profileImage && !!businessDefaults?.default_avatar}
            fileInputRef={fileInputRef}
            name={name}
            subtitle={subtitle}
            description={description}
            slug={slug}
            backgroundColor={backgroundColor}
            templateKey={templateKey}
            footerText={footerText}
            footerPhone={footerPhone}
            footerHidden={footerHidden}
            errors={displayErrors}
            touched={touched}
            onImageChange={handleImageChange}
            onRemoveImage={handleRemoveImage}
            onNameChange={handleNameChange}
            onNameBlur={handleNameBlur}
            onSubtitleChange={setSubtitle}
            onDescriptionChange={setDescription}
            onSlugChange={setSlug}
            onBackgroundColorChange={handleBackgroundColorChange}
            onBackgroundColorBlur={handleBackgroundColorBlur}
            onTemplateKeyChange={handleTemplateKeyChange}
            onFooterTextChange={setFooterText}
            onFooterPhoneChange={setFooterPhone}
            onFooterHiddenChange={setFooterHidden}
            whatsappModalEnabled={whatsappModalEnabled}
            onWhatsappModalEnabledChange={setWhatsappModalEnabled}
            whatsappModalTitle={whatsappModalTitle}
            whatsappModalSubtitle={whatsappModalSubtitle}
            whatsappQuestions={whatsappQuestions}
            onWhatsappModalTitleChange={setWhatsappModalTitle}
            onWhatsappModalSubtitleChange={setWhatsappModalSubtitle}
            onWhatsappQuestionsChange={setWhatsappQuestions}
            darkCardDescTitle={darkCardDescTitle}
            darkCardDescText={darkCardDescText}
            darkCardDescImagePreview={darkCardDescImagePreview}
            darkCardTiktokUsername={darkCardTiktokUsername}
            darkCardTiktokLink={darkCardTiktokLink}
            darkCardDescImageInputRef={darkCardDescImageInputRef}
            onDarkCardDescTitleChange={setDarkCardDescTitle}
            onDarkCardDescTextChange={setDarkCardDescText}
            onDarkCardDescImageChange={handleDarkCardDescImageChange}
            onDarkCardDescImageRemove={handleDarkCardDescImageRemove}
            onDarkCardTiktokUsernameChange={setDarkCardTiktokUsername}
            onDarkCardTiktokLinkChange={setDarkCardTiktokLink}
          />
        )}

        {/* Step 2: Select Platforms */}
        {!isLoadingEditData && currentStep === "select" && (
          <PlatformSelectionStep
            socialLinks={socialLinks}
            error={errors.platforms}
            touched={touched.platforms}
            onTogglePlatform={togglePlatform}
          />
        )}

        {/* Step 3: Add Links */}
        {!isLoadingEditData && currentStep === "links" && (
          <LinksStep
            selectedPlatforms={selectedPlatforms}
            socialLinks={socialLinks}
            linkErrors={linkErrors}
            error={errors.links}
            touched={touched.links}
            onUpdateLink={updateSocialLink}
            onUpdateCountryCode={updateCountryCode}
            onUpdateDisplayName={updateDisplayName}
            onUpdateCustomColor={updateCustomColor}
            onUpdateCustomIcon={updateCustomIcon}
            onRemoveLink={removeLinkInstance}
            onAddPlatformInstance={addPlatformInstance}
            onMoveLink={handleMoveLink}
            onBlurLink={handleLinkBlur}
          />
        )}
      </div>
    </ManagementModal>
  );
});
