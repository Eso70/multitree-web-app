"use client";

import { memo, useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Upload,
  Layout,
  Plus,
  Trash2,
  GripVertical,
  MessageCircle,
  FileText,
} from "lucide-react";
import Image from "next/image";
import { TEMPLATE_OPTIONS, type TemplateKey } from "@/lib/templates/config";
import { TemplateSelector } from "../TemplateSelector";
import type { WhatsAppQuestion } from "@/components/public/WhatsAppQuestionModal";
import { BackgroundColorPicker } from "../BackgroundColorPicker";
import {
  modalChoiceButtonClass,
  modalInputClass,
  modalTextareaClass,
} from "../modal-input-styles";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { AvatarImageUpload } from "@/components/shared/AvatarImageUpload";
import { RequiredMark } from "@/components/shared/RequiredMark";

// ─── Exported Validation Functions ───────────────────────────────────────────

/**
 * Validates linktree name: must be at least 2 characters after trimming.
 * Returns a Kurdish error message if invalid, or undefined if valid.
 */
export function validateLinktreeName(name: string): string | undefined {
  if (name.trim().length < 2) {
    return "ناوی لینکتری دەبێت لانی کەم ٢ پیت بێت";
  }
  return undefined;
}

/**
 * Validates slug: must match /^[a-z0-9-]+$/.
 * Returns a Kurdish error message if invalid, or undefined if valid.
 */
export function validateSlug(slug: string): string | undefined {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return "سلاگ دەبێت تەنها پیتی بچووک، ژمارە و هێڵ بێت";
  }
  return undefined;
}

// ─── Props Interface ─────────────────────────────────────────────────────────

export interface LinktreePageStepProps {
  profileImagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  name: string;
  subtitle: string;
  description: string;
  slug: string;
  backgroundColor: string;
  templateKey: TemplateKey;
  footerText: string;
  footerPhone: string;
  footerHidden: boolean;
  whatsappModalEnabled: boolean;
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
  onDescriptionChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSlugBlur: () => void;
  onBackgroundColorChange: (value: string) => void;
  onBackgroundColorBlur: () => void;
  onTemplateKeyChange: (value: TemplateKey) => void;
  onFooterTextChange: (value: string) => void;
  onFooterPhoneChange: (value: string) => void;
  onFooterHiddenChange: (value: boolean) => void;
  onWhatsappModalEnabledChange: (value: boolean) => void;
  onWhatsappModalTitleChange: (value: string) => void;
  onWhatsappModalSubtitleChange: (value: string) => void;
  onWhatsappQuestionsChange: (questions: WhatsAppQuestion[]) => void;
  // Dark Card template-specific fields
  darkCardDescTitle: string;
  darkCardDescText: string;
  darkCardDescImagePreview: string | null;
  darkCardTiktokUsername: string;
  darkCardTiktokLink: string;
  darkCardDescImageInputRef: React.RefObject<HTMLInputElement | null>;
  onDarkCardDescTitleChange: (value: string) => void;
  onDarkCardDescTextChange: (value: string) => void;
  onDarkCardDescImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDarkCardDescImageRemove: () => void;
  onDarkCardTiktokUsernameChange: (value: string) => void;
  onDarkCardTiktokLinkChange: (value: string) => void;
  // Defaults from Step 1
  defaultName: string;
  defaultBackgroundColor: string;
  hideRemoveImage?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const LinktreePageStep = memo(function LinktreePageStep({
  profileImagePreview,
  fileInputRef,
  name,
  subtitle,
  description,
  slug,
  backgroundColor,
  templateKey,
  footerText,
  footerPhone,
  footerHidden,
  whatsappModalEnabled,
  whatsappModalTitle,
  whatsappModalSubtitle,
  whatsappQuestions,
  errors,
  touched,
  onImageChange,
  onRemoveImage,
  onNameChange,
  onNameBlur,
  onSubtitleChange,
  onDescriptionChange,
  onSlugChange,
  onSlugBlur,
  onBackgroundColorChange,
  onBackgroundColorBlur,
  onTemplateKeyChange,
  onFooterTextChange,
  onFooterPhoneChange,
  onFooterHiddenChange,
  onWhatsappModalEnabledChange,
  onWhatsappModalTitleChange,
  onWhatsappModalSubtitleChange,
  onWhatsappQuestionsChange,
  darkCardDescTitle,
  darkCardDescText,
  darkCardDescImagePreview,
  darkCardTiktokUsername,
  darkCardTiktokLink,
  darkCardDescImageInputRef,
  onDarkCardDescTitleChange,
  onDarkCardDescTextChange,
  onDarkCardDescImageChange,
  onDarkCardDescImageRemove,
  onDarkCardTiktokUsernameChange,
  onDarkCardTiktokLinkChange,
  defaultName,
  defaultBackgroundColor,
  hideRemoveImage = false,
}: LinktreePageStepProps) {
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [isDarkCardModalOpen, setIsDarkCardModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useModalKeyboard({
    isOpen: isDarkCardModalOpen && mounted,
    onEscape: () => setIsDarkCardModalOpen(false),
    onEnter: () => setIsDarkCardModalOpen(false),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default linktree name to business name from Step 1 if empty
  useEffect(() => {
    if (!name && defaultName) {
      onNameChange(defaultName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultName]);

  // Default background color to websiteColor from Step 1 if empty
  useEffect(() => {
    if (!backgroundColor && defaultBackgroundColor) {
      onBackgroundColorChange(defaultBackgroundColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultBackgroundColor]);

  // Helper functions for managing WhatsApp questions
  const handleAddQuestion = () => {
    const newQuestion: WhatsAppQuestion = {
      id: `question_${Date.now()}`,
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
    return TEMPLATE_OPTIONS.find((t) => t.id === templateKey);
  }, [templateKey]);

  return (
    <>
      <div className="space-y-5">
        {/* Profile Image Upload */}
        <AvatarImageUpload
          imageUrl={profileImagePreview}
          fileInputRef={fileInputRef}
          onFileChange={onImageChange}
          onRemove={onRemoveImage}
          hideRemove={hideRemoveImage}
          error={errors.image}
        />

        {/* Name and Subtitle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="linktree-name"
              className="block text-xs sm:text-sm font-medium text-gray-700"
            >
              ناو <RequiredMark />
            </label>
            <input
              id="linktree-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onNameBlur}
              required
              className={modalInputClass(!!(errors.name && touched.name))}
              placeholder="ناوی لینک"
            />
            {errors.name && touched.name && (
              <p className="text-xs text-red-500 mt-1 font-kurdish">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="linktree-subtitle"
              className="block text-xs sm:text-sm font-medium text-gray-700"
            >
              ناونیشانی کورت
            </label>
            {templateKey === "dark-card" ? (
              <button
                type="button"
                onClick={() => setIsDarkCardModalOpen(true)}
                className="w-full rounded-lg sm:rounded-xl border border-indigo-300 bg-indigo-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-indigo-700 font-medium transition-all hover:bg-indigo-100 hover:border-indigo-400 flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                ڕێکخستنی کارتی وەسف
              </button>
            ) : (
              <input
                id="linktree-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => onSubtitleChange(e.target.value)}
                className={modalInputClass()}
                placeholder="بۆ نموونە: خاوەن براند و بەڕێوەبەری فرۆشتن"
              />
            )}
          </div>
        </div>

        {templateKey !== "dark-card" && (
          <div className="space-y-1.5">
            <label
              htmlFor="linktree-description"
              className="block text-xs sm:text-sm font-medium text-gray-700"
            >
              دەقی ڕوونکردنەوە
            </label>
            <textarea
              id="linktree-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className={modalTextareaClass(false, "min-h-0")}
              placeholder="بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە"
              rows={2}
            />
          </div>
        )}

        {/* Slug and Template Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Slug */}
          <div className="space-y-1.5">
            <label
              htmlFor="linktree-slug"
              className="block text-xs sm:text-sm font-medium text-gray-700"
            >
              Slug (seo_name)
              <RequiredMark />
            </label>
            <div className="relative" dir="ltr">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-xs text-gray-500">
                /linktree/
              </span>
              <input
                id="linktree-slug"
                type="text"
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                onBlur={onSlugBlur}
                className={`${modalInputClass(!!(errors.slug && touched.slug))} pl-23 font-mono`}
                placeholder="ناوی تۆ بنووسە"
                dir="ltr"
              />
            </div>
            {errors.slug && touched.slug && (
              <p className="text-xs text-red-500 mt-1 font-kurdish">
                {errors.slug}
              </p>
            )}
          </div>

          {/* Template Style */}
          <div className="space-y-1.5" data-template-section>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">
              شێوازی پەڕە <RequiredMark />
            </label>
            <button
              type="button"
              onClick={() => setIsTemplateSelectorOpen(true)}
              className={modalChoiceButtonClass(
                !!(errors.templateKey && touched.templateKey),
              )}
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
            {errors.templateKey && touched.templateKey && (
              <p className="text-xs text-red-500 mt-1 font-kurdish">
                {errors.templateKey}
              </p>
            )}
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700">
            ڕەنگی باکگڕاوند
            <RequiredMark />
          </label>

          <BackgroundColorPicker
            value={backgroundColor}
            onChange={onBackgroundColorChange}
            onBlur={onBackgroundColorBlur}
            error={errors.backgroundColor && touched.backgroundColor ? errors.backgroundColor : undefined}
          />
        </div>

        {/* Footer Section */}
        <div className="space-y-3 sm:space-y-4">
          {/* Hide Footer Toggle */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200 dark:border-white/10 bg-linear-to-br from-gray-50 to-white dark:from-[#161B22] dark:to-[#161B22] hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 touch-manipulation">
            <label
              htmlFor="linktree-footerHidden"
              className="text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1 leading-tight sm:leading-normal pr-2 sm:pr-0"
              onClick={() => onFooterHiddenChange(!footerHidden)}
            >
              فوتەر بشارەوە
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={footerHidden}
              aria-label={footerHidden ? "فوتەر شاردراوە" : "فوتەر نیشاندراوە"}
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
                    : "translate-x-0.5 sm:translate-x-0.5 md:translate-x-1"
                }`}
              />
            </button>
          </div>

          {!footerHidden && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="linktree-footerText"
                  className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  ناوی فوتەر
                </label>
                <input
                  id="linktree-footerText"
                  type="text"
                  value={footerText}
                  onChange={(e) => onFooterTextChange(e.target.value)}
                  className={modalInputClass()}
                  placeholder="ناوی فوتەر"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="linktree-footerPhone"
                  className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  ژمارەی مۆبایل
                </label>
                <input
                  id="linktree-footerPhone"
                  type="text"
                  value={footerPhone}
                  onChange={(e) => onFooterPhoneChange(e.target.value)}
                  className={modalInputClass(
                    !!(errors.footerPhone && touched.footerPhone),
                  )}
                  placeholder="ژمارەی مۆبایل"
                />
                {errors.footerPhone && touched.footerPhone && (
                  <p className="text-xs text-red-500 mt-1 font-kurdish">
                    {errors.footerPhone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp Modal Questions Configuration */}
        <div className="space-y-3 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-white/5 bg-linear-to-br from-green-50/30 to-green-50/10 dark:from-[#161B22] dark:to-[#161B22]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-linear-to-br from-green-100 to-green-50 border border-green-200 dark:from-green-950/20 dark:to-green-950/20 dark:border-green-900/30">
                <MessageCircle className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 font-kurdish">
                پرسیارەکانی واتساپ
              </h3>
            </div>
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
          </div>

          {whatsappModalEnabled && (
            <>
              {/* Modal Title and Subtitle */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    سەردێڕی مۆدال
                  </label>
                  <input
                    type="text"
                    value={whatsappModalTitle}
                    onChange={(e) => onWhatsappModalTitleChange(e.target.value)}
                    placeholder="ناونیشانی مۆدالی واتساپ"
                    className={modalInputClass()}
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    ژێر سەردێڕ
                  </label>
                  <input
                    type="text"
                    value={whatsappModalSubtitle}
                    onChange={(e) =>
                      onWhatsappModalSubtitleChange(e.target.value)
                    }
                    placeholder="دەقێکی کورت بۆ مۆدالی واتساپ"
                    className={modalInputClass()}
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    پرسیارەکان ({whatsappQuestions.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>زیادکردنی پرسیار</span>
                  </button>
                </div>

                {whatsappQuestions.length === 0 ? (
                  <div className="text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-[#161B22] rounded-lg border border-dashed border-gray-300 dark:border-white/10">
                    هیچ پرسیارێک نییە. کلیک بکە بۆ زیادکردنی پرسیارێکی نوێ.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {whatsappQuestions.map((question, index) => (
                      <div
                        key={question.id}
                        className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161B22] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                              پرسیار #{index + 1}
                            </span>
                          </div>
                          {whatsappQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(question.id)}
                              className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-500/10 transition-colors"
                              title="سڕینەوەی پرسیار"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Question Text */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            دەقی پرسیار
                          </label>
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
                            placeholder="پرسیارەکە بنووسە"
                            className={modalInputClass(
                              false,
                              "rounded-lg sm:rounded-lg px-3 py-2",
                            )}
                          />
                        </div>

                        {/* Question Message */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            پەیام (دەقی نێردراو بۆ واتساپ)
                          </label>
                          <textarea
                            value={question.message}
                            onChange={(e) =>
                              handleQuestionChange(
                                question.id,
                                "message",
                                e.target.value,
                              )
                            }
                            placeholder="پەیامی واتساپ بنووسە"
                            rows={2}
                            className={modalTextareaClass(
                              false,
                              "rounded-lg sm:rounded-lg px-3 py-2",
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dark Card Description Modal */}
      {isDarkCardModalOpen &&
        mounted &&
        createPortal(
          <>
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 z-100 bg-black/30 backdrop-blur-lg   duration-300"
              onClick={() => setIsDarkCardModalOpen(false)}
              aria-hidden
            />

            {/* Modal container */}
            <div
              className="modal-ltr fixed z-101 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[85vw] md:w-[75vw] max-w-md max-h-[85vh] overflow-hidden rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-100/50 shadow-2xl    duration-300"
              dir="ltr"
            >
              {/* Header */}
              <div className="border-b border-gray-100/50 ">
                <div className="flex items-center justify-between p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className="rounded-xl p-1.5 sm:p-2 shadow-sm border"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)",
                      }}
                    >
                      <FileText
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        style={{ color: "var(--theme-primary, #64748b)" }}
                      />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-700">
                        ڕێکخستنی کارتی وەسف
                      </h2>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                        سەردێڕ، وەسف، وێنە و تیکتۆک
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDarkCardModalOpen(false)}
                    className="shrink-0 rounded-xl p-1.5 sm:p-2 bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-slate-500 hover:text-slate-700 transition-all duration-300 border border-slate-100 shadow-sm hover:shadow"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div
                className="overflow-y-auto p-4 sm:p-5 space-y-4 bg-linear-to-br from-white to-slate-50/20"
                style={{
                  maxHeight: "calc(85vh - 70px)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(156,163,175,0.5) transparent",
                }}
              >
                {/* Description Title */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    سەردێڕی وەسف
                  </label>
                  <input
                    type="text"
                    value={darkCardDescTitle}
                    onChange={(e) => onDarkCardDescTitleChange(e.target.value)}
                    placeholder="باشترین تراکسوود و جلی ماڵەوە تەنها بە جوملە"
                    className={modalInputClass()}
                    dir="ltr"
                  />
                </div>

                {/* Description Text */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    دەقی وەسف
                  </label>
                  <textarea
                    value={darkCardDescText}
                    onChange={(e) => onDarkCardDescTextChange(e.target.value)}
                    placeholder="نوێترین مۆدێلەکان و کوالێتی بەرز..."
                    rows={3}
                    className={modalTextareaClass()}
                    dir="ltr"
                  />
                </div>

                {/* Description Image */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                    وێنەی وەسف
                  </label>
                  <div className="flex items-center gap-3">
                    {darkCardDescImagePreview ? (
                      <div className="relative h-14 w-14 rounded-full overflow-hidden border border-gray-300">
                        <Image
                          src={darkCardDescImagePreview}
                          alt="Description image"
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={onDarkCardDescImageRemove}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-14 w-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                        <Upload className="h-5 w-5 text-gray-400" />
                        <input
                          ref={darkCardDescImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={onDarkCardDescImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                    <span className="text-xs text-gray-500">
                      وێنەیەک بۆ ناو کارتی وەسف
                    </span>
                  </div>
                </div>

                {/* TikTok Section */}
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.1v-3.5a6.37 6.37 0 0 0-.82-.05A6.34 6.34 0 0 0 3.15 15.6a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.4a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.83z" />
                    </svg>
                    تیکتۆک
                  </h4>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      ناوی بەکارهێنەر
                    </label>
                    <input
                      type="text"
                      value={darkCardTiktokUsername}
                      onChange={(e) =>
                        onDarkCardTiktokUsernameChange(e.target.value)
                      }
                      placeholder="@sea_homewear"
                      className={modalInputClass(
                        false,
                        "rounded-lg sm:rounded-lg px-3 py-2",
                      )}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      لینکی تیکتۆک
                    </label>
                    <input
                      type="text"
                      value={darkCardTiktokLink}
                      onChange={(e) =>
                        onDarkCardTiktokLinkChange(e.target.value)
                      }
                      placeholder="https://tiktok.com/@sea_homewear"
                      className={modalInputClass(
                        false,
                        "rounded-lg sm:rounded-lg px-3 py-2",
                      )}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Done Button */}
                <button
                  type="button"
                  onClick={() => setIsDarkCardModalOpen(false)}
                  className="w-full rounded-xl text-white py-2.5 sm:py-3 text-sm font-medium transition-all shadow-sm hover:shadow-md hover:opacity-90"
                  style={{ background: "var(--theme-css, #64748b)" }}
                >
                  تەواو
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}

      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
        selectedTemplate={templateKey}
        onSelectTemplate={onTemplateKeyChange}
      />
    </>
  );
});

LinktreePageStep.displayName = "LinktreePageStep";
