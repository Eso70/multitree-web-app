"use client";

import { memo, useState, useMemo } from "react";
import {
  Layout,
  Plus,
  Trash2,
  GripVertical,
  MessageCircle,
  Sparkles,
  Palette,
  RotateCcw,
} from "lucide-react";
import { ColorGradientModal } from "../ColorGradientModal";
import { DEFAULT_FOOTER_PHONE } from "../modal-constants";
import {
  modalChoiceButtonClass,
  modalInputClass,
  modalTextareaClass,
} from "../modal-input-styles";
import { LINKTREE_NAME_MAX_LENGTH } from "./validation";
import { TEMPLATE_OPTIONS } from "@/lib/templates/config";
import { TemplateSelector } from "../TemplateSelector";
import { BackgroundPatternModal } from "@/components/shared/BackgroundPatternModal";
import { backgroundPatternLabel } from "@/lib/templates/background-pattern";
import {
  BACKGROUND_PATTERN_DEFAULT,
  type BackgroundPatternStyle,
} from "@linktree/types";
import type { WhatsAppQuestion } from "@/components/public/WhatsAppQuestionModal";
import { BackgroundColorPicker } from "../BackgroundColorPicker";
import { AvatarImageUpload } from "@/components/shared/AvatarImageUpload";
import { EditorField } from "@/components/shared/EditorField";
import { Tooltip } from "@/components/shared/Tooltip";

interface BasicInfoStepProps {
  profileImagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  name: string;
  subtitle: string;
  subtitleColor?: string;
  description: string;
  slug: string;
  backgroundColor: string;
  /** An uploaded background image, which replaces the background colour. */
  backgroundImagePreview?: string | null;
  onBackgroundImageChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onBackgroundImageRemove?: () => void;
  templateKey: string;
  /**
   * The repeating pattern drawn over the page background. Omitted by surfaces
   * that do not offer one, which keeps their layout as it was.
   */
  backgroundPattern?: BackgroundPatternStyle;
  onBackgroundPatternChange?: (value: BackgroundPatternStyle) => void;
  footerText: string;
  footerPhone: string;
  footerHidden: boolean;
  whatsappModalEnabled: boolean;
  onWhatsappModalEnabledChange: (value: boolean) => void;
  whatsappModalTitle: string;
  whatsappModalSubtitle: string;
  whatsappQuestions: WhatsAppQuestion[];
  errors: {
    name?: string;
    slug?: string;
    backgroundColor?: string;
    templateKey?: string;
    footerPhone?: string;
    image?: string;
  };
  /** Advisory, not blocking: another page already uses this display name. */
  nameWarning?: string | null;
  checkingName?: boolean;
  checkingSlug?: boolean;
  /** Per-question errors, keyed by question id. */
  questionErrors?: Record<string, { text?: string; message?: string }>;
  touched: {
    name?: boolean;
    slug?: boolean;
    backgroundColor?: boolean;
    templateKey?: boolean;
    footerPhone?: boolean;
  };
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  onSubtitleChange: (value: string) => void;
  onSubtitleColorChange?: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onBackgroundColorChange: (value: string) => void;
  onBackgroundColorBlur: () => void;
  onTemplateKeyChange: (value: string) => void;
  onFooterTextChange: (value: string) => void;
  onFooterPhoneChange: (value: string) => void;
  onFooterHiddenChange: (value: boolean) => void;
  onWhatsappModalTitleChange: (value: string) => void;
  onWhatsappModalSubtitleChange: (value: string) => void;
  onWhatsappQuestionsChange: (questions: WhatsAppQuestion[]) => void;
  hideFooterHidden?: boolean;
  hideWhatsappQuestions?: boolean;
  hideFooterSection?: boolean;
  onUploadClick?: () => void;
  username?: string;
  onUsernameChange?: (value: string) => void;
  isEditMode?: boolean;
  hideRemoveImage?: boolean;
  hideImageUploads?: boolean;
  allowedTemplateKeys?: readonly string[];
}

export const BasicInfoStep = memo(function BasicInfoStep({
  profileImagePreview,
  fileInputRef,
  name,
  subtitle,
  subtitleColor,
  description,
  slug,
  backgroundColor,
  backgroundImagePreview,
  onBackgroundImageChange,
  onBackgroundImageRemove,
  templateKey,
  backgroundPattern = BACKGROUND_PATTERN_DEFAULT,
  onBackgroundPatternChange,
  footerText,
  footerPhone,
  footerHidden,
  whatsappModalEnabled,
  onWhatsappModalEnabledChange,
  whatsappModalTitle,
  whatsappModalSubtitle,
  whatsappQuestions,
  errors,
  nameWarning = null,
  checkingName = false,
  checkingSlug = false,
  questionErrors = {},
  touched,
  onImageChange,
  onRemoveImage,
  onNameChange,
  onNameBlur,
  onSubtitleChange,
  onSubtitleColorChange,
  onDescriptionChange,
  onSlugChange,
  onBackgroundColorChange,
  onBackgroundColorBlur,
  onTemplateKeyChange,
  onFooterTextChange,
  onFooterPhoneChange,
  onFooterHiddenChange,
  onWhatsappModalTitleChange,
  onWhatsappModalSubtitleChange,
  onWhatsappQuestionsChange,
  hideFooterHidden = false,
  hideWhatsappQuestions = false,
  hideFooterSection = false,
  onUploadClick,
  username = "",
  onUsernameChange,
  hideRemoveImage = false,
  hideImageUploads = false,
  allowedTemplateKeys,
}: BasicInfoStepProps) {
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [isPatternSelectorOpen, setIsPatternSelectorOpen] = useState(false);
  const [isSubtitleColorPickerOpen, setIsSubtitleColorPickerOpen] = useState(false);

  // Helper functions for managing WhatsApp questions
  const handleAddQuestion = () => {
    const newQuestion: WhatsAppQuestion = {
      id: `question_${Date.now()}`, // Dynamic ID
      text: "",
      message: "",
    };
    onWhatsappQuestionsChange([...whatsappQuestions, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    onWhatsappQuestionsChange(whatsappQuestions.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (
    id: string,
    field: "text" | "message",
    value: string,
  ) => {
    onWhatsappQuestionsChange(
      whatsappQuestions.map((q) =>
        q.id === id ? { ...q, [field]: value } : q,
      ),
    );
  };

  // Memoize selected template lookup
  const selectedTemplate = useMemo(() => {
    return TEMPLATE_OPTIONS.find((template) => template.id === templateKey);
  }, [templateKey]);

  return (
    <>
      <div className="space-y-5">
        {/* Profile Image Upload */}
        {!hideImageUploads && (
          <AvatarImageUpload
            imageUrl={profileImagePreview}
            fileInputRef={fileInputRef}
            onFileChange={onImageChange}
            onUploadClick={onUploadClick}
            onRemove={onRemoveImage}
            hideRemove={hideRemoveImage}
            error={errors.image}
            uploadLabel={
              onUploadClick
                ? "بارکردنی وێنەکانی بڕاند"
                : "وێنەی پڕۆفایل هەڵبژێرە"
            }
          />
        )}

        {/* Name and Subtitle / Username / ExpireDate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <EditorField label={onUploadClick ? "ناوی بزنس" : "ناو"} required>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onNameBlur}
              required
              maxLength={LINKTREE_NAME_MAX_LENGTH}
              aria-invalid={!!(errors.name && touched.name)}
              className={modalInputClass(!!(errors.name && touched.name))}
              placeholder={onUploadClick ? "ناوی بزنس بنووسە" : "ناوی لینک"}
              dir="auto"
            />
            {errors.name && touched.name ? (
              <p className="text-xs text-red-500 mt-1 font-kurdish">
                {errors.name}
              </p>
            ) : checkingName ? (
              <p className="text-xs text-gray-400 mt-1 font-kurdish">
                پشکنینی ناو...
              </p>
            ) : nameWarning ? (
              <p className="text-xs text-amber-600 mt-1 font-kurdish">
                {nameWarning}
              </p>
            ) : null}
          </EditorField>

          {onUploadClick ? (
            <EditorField label="ناوی بەکارهێنەر" required>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => onUsernameChange?.(e.target.value)}
                required
                className={modalInputClass()}
                placeholder="ناوی بەکارهێنەر"
                dir="auto"
              />
            </EditorField>
          ) : (
            <EditorField label="ناونیشانی کورت">
              <div className="flex items-center gap-2">
                <input
                  id="subtitle"
                  type="text"
                  value={subtitle}
                  onChange={(e) => onSubtitleChange(e.target.value)}
                  className={modalInputClass(false, "flex-1")}
                  placeholder="ناونیشانی کورت بنووسە"
                  dir="auto"
                />
                <Tooltip content="ڕەنگی ناونیشانی کورت" side="top">
                  <button
                    type="button"
                    onClick={() => setIsSubtitleColorPickerOpen(true)}
                    className="relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm transition-all duration-200 cursor-pointer group hover:border-gray-400 focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#161B22] dark:hover:border-white/20"
                    title="ڕەنگی ناونیشانی کورت"
                    aria-label="ڕەنگی ناونیشانی کورت"
                  >
                    {subtitleColor ? (
                      <span
                        className="absolute inset-0"
                        style={{ background: subtitleColor }}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-500 transition-colors group-hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:group-hover:bg-white/10">
                        <Palette className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                </Tooltip>
                {subtitleColor && onSubtitleColorChange && (
                  <Tooltip content="سڕینەوەی ڕەنگ" side="top">
                    <button
                      type="button"
                      onClick={() => onSubtitleColorChange("")}
                      className="shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="سڕینەوەی ڕەنگ"
                      aria-label="سڕینەوەی ڕەنگ"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </Tooltip>
                )}
                <ColorGradientModal
                  isOpen={isSubtitleColorPickerOpen}
                  value={subtitleColor || "#ffffff"}
                  onChange={(color) => onSubtitleColorChange?.(color)}
                  onClose={() => setIsSubtitleColorPickerOpen(false)}
                  solidFallback="#ffffff"
                  gradientFallback="#0066ff"
                />
              </div>
            </EditorField>
          )}
        </div>

        {!onUploadClick && (
          <EditorField label="دەقی ڕوونکردنەوە">
            <textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className={modalTextareaClass(false, "min-h-0")}
              placeholder="بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە"
              dir="auto"
              rows={2}
            />
          </EditorField>
        )}

        {onUploadClick && (
          <EditorField label="سەب دۆمەین">
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              className={modalInputClass(!!(errors.slug && touched.slug))}
              placeholder="سەب‌دۆمەین بنووسە"
              dir="ltr"
            />
            {errors.slug && touched.slug && (
              <p className="text-xs text-red-500 mt-1 font-kurdish">
                {errors.slug}
              </p>
            )}
          </EditorField>
        )}

        {/* Slug, template style, and background pattern - one row of three */}
        {!onUploadClick && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Slug */}
            <EditorField label="Slug">
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                disabled
                aria-invalid={!!(errors.slug && touched.slug)}
                className={modalInputClass(
                  !!(errors.slug && touched.slug),
                  "cursor-not-allowed bg-gray-50 text-gray-500",
                )}
                placeholder="Slug بنووسە"
                dir="ltr"
              />
              {errors.slug && touched.slug ? (
                <p className="text-xs text-red-500 mt-1 font-kurdish">
                  {errors.slug}
                </p>
              ) : checkingSlug ? (
                <p className="text-xs text-gray-400 mt-1 font-kurdish">
                  پشکنینی slug...
                </p>
              ) : null}
            </EditorField>

            {/* Template Style */}
            <EditorField label="شێوازی پەڕە" required>
              <Tooltip content="دیاریکردنی قاڵبی ڕووکاری پەڕە" side="top">
                <button
                  type="button"
                  onClick={() => setIsTemplateSelectorOpen(true)}
                  className={`${modalChoiceButtonClass(
                    !!(errors.templateKey && touched.templateKey),
                  )} w-full cursor-pointer`}
                >
                  {selectedTemplate ? (
                    <span className="text-gray-900 truncate">
                      {selectedTemplate.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">شێوازێک هەڵبژێرە</span>
                  )}
                  <Layout className="h-4 w-4 text-gray-500 shrink-0" />
                </button>
              </Tooltip>
              {errors.templateKey && touched.templateKey && (
                <p className="text-xs text-red-500 mt-1 font-kurdish">
                  {errors.templateKey}
                </p>
              )}
            </EditorField>

            {/* Background Pattern — the same picker the mini website uses */}
            {onBackgroundPatternChange && (
              <EditorField label="شێوازی پاشبنەما">
                <Tooltip content="دیاریکردنی نەخشی پاشبنەمای پەڕە" side="top">
                  <button
                    type="button"
                    onClick={() => setIsPatternSelectorOpen(true)}
                    className={`${modalChoiceButtonClass(false)} w-full cursor-pointer`}
                  >
                    <span className="text-gray-900 truncate">
                      {backgroundPatternLabel(backgroundPattern)}
                    </span>
                    <Sparkles className="h-4 w-4 text-gray-500 shrink-0" />
                  </button>
                </Tooltip>
              </EditorField>
            )}
          </div>
        )}

        {/* Background Color */}
        <div className="space-y-2">
          <EditorField
            label={
              onUploadClick
                ? "ڕەنگی وێبسایت (Website Color)"
                : "ڕەنگی باکگڕاوند"
            }
          >
            <BackgroundColorPicker
              value={backgroundColor}
              onChange={onBackgroundColorChange}
              onBlur={onBackgroundColorBlur}
              imagePreview={backgroundImagePreview}
              onImageChange={
                hideImageUploads ? undefined : onBackgroundImageChange
              }
              onImageRemove={
                hideImageUploads ? undefined : onBackgroundImageRemove
              }
              error={
                errors.backgroundColor && touched.backgroundColor
                  ? errors.backgroundColor
                  : undefined
              }
            />
          </EditorField>
        </div>

        {/* Footer Name and Phone */}
        {!hideFooterSection && (
          <div className="space-y-3 sm:space-y-4">
            {/* Hide Footer Toggle - Custom Toggle Switch */}
            {!hideFooterHidden && (
              <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-white/10 bg-linear-to-br from-gray-50 to-white dark:from-[#161B22] dark:to-[#161B22] hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 touch-manipulation">
                <label
                  htmlFor="footerHidden"
                  className="text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1 leading-tight sm:leading-normal pr-2 sm:pr-0"
                  onClick={() => onFooterHiddenChange(!footerHidden)}
                >
                  فوتەر بشارەوە
                </label>
                <Tooltip content={footerHidden ? "فوتەر بشارەوە (شاردراوە)" : "فوتەر پیشان بدە (نیشاندراو)"} side="top">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={footerHidden}
                    aria-label={
                      footerHidden ? "فوتەر شاردراوە" : "فوتەر نیشاندراوە"
                    }
                    onClick={() => onFooterHiddenChange(!footerHidden)}
                    className={`relative inline-flex h-7 w-12 sm:h-8 sm:w-14 md:h-9 md:w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation active:scale-95 ${
                      footerHidden ? "" : "bg-gray-300 dark:bg-gray-750"
                    }`}
                    style={
                      footerHidden
                        ? ({
                            background: "var(--theme-css, #64748b)",
                            "--tw-ring-color": "var(--theme-primary, #64748b)",
                          } as React.CSSProperties)
                        : ({
                            "--tw-ring-color": "var(--theme-primary, #64748b)",
                          } as React.CSSProperties)
                    }
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        footerHidden
                          ? "translate-x-5 sm:translate-x-6 md:translate-x-7"
                          : "translate-x-0.5 sm:translate-x-0.5 md:translate-x-0.5"
                      }`}
                    />
                  </button>
                </Tooltip>
              </div>
            )}

            {!footerHidden && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <EditorField label="ناوی فوتەر">
                  <input
                    id="footerText"
                    type="text"
                    value={footerText}
                    onChange={(e) => onFooterTextChange(e.target.value)}
                    className={modalInputClass()}
                    placeholder="بۆ نموونە: MultiTree"
                    dir="auto"
                  />
                </EditorField>
                <EditorField label="ژمارەی مۆبایل">
                  <input
                    id="footerPhone"
                    type="text"
                    value={footerPhone}
                    onChange={(e) => onFooterPhoneChange(e.target.value)}
                    className={modalInputClass(
                      !!(errors.footerPhone && touched.footerPhone),
                    )}
                    placeholder={DEFAULT_FOOTER_PHONE}
                    dir="ltr"
                  />
                  {errors.footerPhone && touched.footerPhone && (
                    <p className="text-xs text-red-500 mt-1 font-kurdish">
                      {errors.footerPhone}
                    </p>
                  )}
                </EditorField>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Modal Questions Configuration */}
        {!hideWhatsappQuestions && (
          <div className="space-y-3 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-white/5 bg-linear-to-br from-green-50/30 to-green-50/10 dark:from-[#161B22] dark:to-[#161B22]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-linear-to-br from-green-100 to-green-50 border border-green-200 dark:from-green-950/20 dark:to-green-950/20 dark:border-green-900/30">
                  <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 font-kurdish">
                  پرسیارەکانی واتساپ
                </h3>
              </div>
              <Tooltip content={whatsappModalEnabled ? "مۆدالی واتساپ ناچالاک بکە" : "مۆدالی واتساپ چالاک بکە"} side="top">
                <button
                  type="button"
                  role="switch"
                  aria-checked={whatsappModalEnabled}
                  aria-label={
                    whatsappModalEnabled
                      ? "مۆدالی واتساپ چالاکە"
                      : "مۆدالی واتساپ ناچالاکە"
                  }
                  onClick={() =>
                    onWhatsappModalEnabledChange(!whatsappModalEnabled)
                  }
                  className={`relative inline-flex h-7 w-12 sm:h-8 sm:w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation active:scale-95 ${
                    whatsappModalEnabled ? "" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                  style={
                    whatsappModalEnabled
                      ? ({
                          background: "var(--theme-css, #64748b)",
                          "--tw-ring-color": "var(--theme-primary, #64748b)",
                        } as React.CSSProperties)
                      : ({
                          "--tw-ring-color": "var(--theme-primary, #64748b)",
                        } as React.CSSProperties)
                  }
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 sm:h-7 sm:w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      whatsappModalEnabled
                        ? "translate-x-5 sm:translate-x-6"
                        : "translate-x-0.5 sm:translate-x-0.5"
                    }`}
                  />
                </button>
              </Tooltip>
            </div>

            {whatsappModalEnabled && (
              <>
                {/* Modal Title and Subtitle */}
                <div className="space-y-3">
                  <EditorField label="سەردێڕی مۆدال">
                    <input
                      type="text"
                      value={whatsappModalTitle}
                      onChange={(e) =>
                        onWhatsappModalTitleChange(e.target.value)
                      }
                      placeholder="پەیوەندی کردن"
                      className={modalInputClass()}
                      dir="auto"
                    />
                  </EditorField>

                  <EditorField label="ژێر سەردێڕ">
                    <input
                      type="text"
                      value={whatsappModalSubtitle}
                      onChange={(e) =>
                        onWhatsappModalSubtitleChange(e.target.value)
                      }
                      placeholder="پرسیارێک هەڵبژێرە"
                      className={modalInputClass()}
                      dir="auto"
                    />
                  </EditorField>
                </div>

                {/* Questions List */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      پرسیارەکان ({whatsappQuestions.length})
                    </label>
                    <Tooltip content="زیادکردنی پرسیارێکی نوێی واتساپ" side="top">
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md animate-none cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>زیادکردنی پرسیار</span>
                      </button>
                    </Tooltip>
                  </div>

                  {whatsappQuestions.length === 0 ? (
                    <div className="text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-[#161B22] rounded-lg border border-dashed border-gray-300 dark:border-white/10">
                      هیچ پرسیارێک نییە. کلیک بکە بۆ زیادکردنی پرسیارێکی نوێ.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {whatsappQuestions.map((question, index) => {
                        const questionError = questionErrors[question.id];
                        return (
                          <div
                            key={question.id}
                            className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border bg-white dark:bg-[#161B22] space-y-3 ${questionError ? "border-red-300 dark:border-red-500/40" : "border-gray-200 dark:border-white/10"}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                  پرسیار #{index + 1}
                                </span>
                              </div>
                              {whatsappQuestions.length > 1 && (
                                <Tooltip content="سڕینەوەی پرسیار" side="top">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveQuestion(question.id)
                                    }
                                    className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-500/10 transition-colors cursor-pointer"
                                    aria-label="سڕینەوەی پرسیار"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              )}
                            </div>

                            {/* Question Text */}
                            <EditorField label="دەقی پرسیار">
                              <input
                                type="text"
                                value={question.text}
                                onChange={(e) =>
                                  handleQuestionChange(
                                    question.id,
                                    "text",
                                    e.target.value,
                                  )
                                }
                                placeholder="داواکردن"
                                aria-invalid={!!questionError?.text}
                                className={modalInputClass(
                                  !!questionError?.text,
                                )}
                                dir="auto"
                              />
                              {questionError?.text && (
                                <p className="text-xs text-red-500 mt-1 font-kurdish">
                                  {questionError.text}
                                </p>
                              )}
                            </EditorField>

                            {/* Question Message */}
                            <EditorField label="پەیام (دەقی نێردراو بۆ واتساپ)">
                              <textarea
                                value={question.message}
                                onChange={(e) =>
                                  handleQuestionChange(
                                    question.id,
                                    "message",
                                    e.target.value,
                                  )
                                }
                                placeholder="سڵاو بەڕێز دەمەوێت داوا بکەم."
                                rows={2}
                                aria-invalid={!!questionError?.message}
                                className={modalTextareaClass(
                                  !!questionError?.message,
                                  "min-h-0",
                                )}
                                dir="auto"
                              />
                              {questionError?.message && (
                                <p className="text-xs text-red-500 mt-1 font-kurdish">
                                  {questionError.message}
                                </p>
                              )}
                            </EditorField>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {onBackgroundPatternChange && (
        <BackgroundPatternModal
          isOpen={isPatternSelectorOpen}
          value={backgroundPattern}
          onChange={onBackgroundPatternChange}
          onClose={() => setIsPatternSelectorOpen(false)}
        />
      )}

      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
        selectedTemplate={templateKey}
        onSelectTemplate={onTemplateKeyChange}
        allowedTemplateKeys={allowedTemplateKeys}
      />
    </>
  );
});
