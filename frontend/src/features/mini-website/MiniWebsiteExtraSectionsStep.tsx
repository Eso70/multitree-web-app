"use client";

import Image from "next/image";
import {
  Award,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  FileDown,
  Headphones,
  ListChecks,
  Sparkles,
} from "lucide-react";
import {
  MINI_WEBSITE_MAX_ADVANTAGES,
  MINI_WEBSITE_MAX_AUDIO_ITEMS,
  MINI_WEBSITE_MAX_DOCUMENTS,
  MINI_WEBSITE_MAX_EVENTS,
  MINI_WEBSITE_MAX_IMPACT_STATS,
  MINI_WEBSITE_MAX_PAYMENT_METHODS,
  MINI_WEBSITE_MAX_PROCESS_STEPS,
  MINI_WEBSITE_MAX_SPECIAL_OFFERS,
  MINI_WEBSITE_PAYMENT_PROVIDERS,
  createMiniWebsiteAdvantage,
  createMiniWebsiteAudio,
  createMiniWebsiteDocument,
  createMiniWebsiteEvent,
  createMiniWebsiteImpactStat,
  createMiniWebsitePaymentMethod,
  createMiniWebsiteProcessStep,
  createMiniWebsiteSpecialOffer,
  type MiniWebsiteAdvantage,
  type MiniWebsiteAdvantageIcon,
  type MiniWebsiteAudio,
  type MiniWebsiteAudioPlatform,
  type MiniWebsiteDocument,
  type MiniWebsiteEvent,
  type MiniWebsiteImpactStat,
  type MiniWebsitePaymentMethod,
  type MiniWebsitePaymentProvider,
  type MiniWebsiteProcessStep,
  type MiniWebsiteSpecialOffer,
} from "@linktree/types";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { DateInput, DateTimeInput } from "@/components/shared/DateTimeInput";
import { MediaUpload } from "./MiniWebsiteContentStep";
import {
  CollectionEditor,
  DescriptionField,
  TextField,
} from "./MiniWebsiteCollectionEditor";
import {
  ADVANTAGE_ICON_LABELS,
  AUDIO_PLATFORM_LABELS,
} from "./extra-section-options";
import {
  hasBuiltInPaymentLogo,
  paymentMethodLogo,
  PAYMENT_PROVIDER_LABELS,
} from "./payment-providers";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

export function MiniWebsitePaymentFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (paymentMethods: MiniWebsitePaymentMethod[]) =>
    onChange({ ...draft, paymentMethods });
  return (
    <CollectionEditor
      items={draft.paymentMethods}
      max={MINI_WEBSITE_MAX_PAYMENT_METHODS}
      singular="شێوازی پارەدان"
      emptyText="یەکەم شێوازی پارەدانی پەسەندکراو زیاد بکە."
      icon={CreditCard}
      error={errors.paymentMethods}
      setItems={setItems}
      createItem={createMiniWebsitePaymentMethod}
    >
      {(method, index, patch) => {
        const logo = paymentMethodLogo(method);
        const builtInLogo = hasBuiltInPaymentLogo(method.provider);
        return (
          <>
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <CustomSelect<MiniWebsitePaymentProvider>
                  label="دابینکەر"
                  required
                  showRequirement
                  value={method.provider}
                  onChange={(provider) =>
                    patch({
                      provider,
                      name:
                        provider === "custom"
                          ? ""
                          : PAYMENT_PROVIDER_LABELS[provider],
                      image: "",
                    })
                  }
                  options={MINI_WEBSITE_PAYMENT_PROVIDERS.map((provider) => ({
                    value: provider,
                    label: PAYMENT_PROVIDER_LABELS[provider],
                  }))}
                  triggerClassName="h-11"
                  labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
                />
              </div>
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5">
                {logo ? (
                  <Image
                    src={logo}
                    alt=""
                    fill
                    className={
                      builtInLogo ? "object-cover" : "object-contain p-1"
                    }
                    unoptimized
                  />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
              </span>
            </div>

            {method.provider === "custom" && (
              <>
                <TextField
                  label="ناوی شێوازی پارەدان"
                  required
                  value={method.name}
                  onChange={(name) => patch({ name })}
                />
                <MediaUpload
                  label="لۆگۆی شێوازی پارەدان"
                  wide
                  value={method.image ? [method.image] : []}
                  onChange={(value) => patch({ image: value[0] ?? "" })}
                />
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="ناوی هەژمار یان وەرگر"
                value={method.accountName}
                onChange={(accountName) => patch({ accountName })}
                placeholder="ئارەزوومەندانە"
              />
              <TextField
                label="ژمارەی جزدان، تەلەفۆن یان هەژمار"
                value={method.accountNumber}
                onChange={(accountNumber) => patch({ accountNumber })}
                placeholder="ئارەزوومەندانە"
                dir="ltr"
              />
            </div>
            <DescriptionField
              label="ڕێنمایی پارەدان"
              value={method.instructions}
              onChange={(instructions) => patch({ instructions })}
              placeholder="ڕێنمایی پارەدان (ئارەزوومەندانە)"
            />
            {errors[`paymentMethod.${index}`] && (
              <p className="text-[10px] font-bold text-red-500">
                {errors[`paymentMethod.${index}`]}
              </p>
            )}
          </>
        );
      }}
    </CollectionEditor>
  );
}

export function MiniWebsiteOfferFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (specialOffers: MiniWebsiteSpecialOffer[]) =>
    onChange({ ...draft, specialOffers });
  return (
    <CollectionEditor
      items={draft.specialOffers}
      max={MINI_WEBSITE_MAX_SPECIAL_OFFERS}
      singular="ئۆفەر"
      emptyText="یەکەم داشکاندن، ئۆفەری وەرزی یان کۆدی کوپۆن زیاد بکە."
      icon={Sparkles}
      error={errors.specialOffers}
      setItems={setItems}
      createItem={createMiniWebsiteSpecialOffer}
    >
      {(offer, index, patch) => (
        <>
          <TextField
            label="ناونیشانی ئۆفەر"
            required
            value={offer.title}
            onChange={(title) => patch({ title })}
            placeholder="ئۆفەری هاوین"
          />
          <DescriptionField
            value={offer.description}
            onChange={(description) => patch({ description })}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              label="نرخی سەرەتایی"
              value={offer.originalPrice}
              onChange={(originalPrice) => patch({ originalPrice })}
              placeholder="50,000 IQD"
            />
            <TextField
              label="نرخی ئۆفەر"
              value={offer.offerPrice}
              onChange={(offerPrice) => patch({ offerPrice })}
              placeholder="35,000 IQD"
            />
            <TextField
              label="کۆدی کوپۆن"
              value={offer.couponCode}
              onChange={(couponCode) => patch({ couponCode })}
              placeholder="بۆ نموونە: SUMMER25"
              dir="ltr"
            />
            <DateInput
              label="بەسەرچوون"
              value={offer.expiresAt}
              onChange={(expiresAt) => patch({ expiresAt })}
            />
          </div>
          <TextField
            label="لینکی ئۆفەر"
            value={offer.url}
            onChange={(url) => patch({ url })}
            placeholder="https://..."
            type="url"
            dir="ltr"
          />
          <MediaUpload
            label="وێنەی ئۆفەر"
            wide
            value={offer.image ? [offer.image] : []}
            onChange={(value) => patch({ image: value[0] ?? "" })}
          />
          {errors[`specialOffer.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`specialOffer.${index}`]}
            </p>
          )}
        </>
      )}
    </CollectionEditor>
  );
}

export function MiniWebsiteEventFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (events: MiniWebsiteEvent[]) =>
    onChange({ ...draft, events });
  return (
    <CollectionEditor
      items={draft.events}
      max={MINI_WEBSITE_MAX_EVENTS}
      singular="ڕووداو"
      emptyText="یەکەم ڕووداو، کۆرس، سیمینار یان وۆرکشۆپ زیاد بکە."
      icon={CalendarDays}
      error={errors.events}
      setItems={setItems}
      createItem={createMiniWebsiteEvent}
    >
      {(event, index, patch) => (
        <>
          <TextField
            label="ناونیشانی ڕووداو"
            required
            value={event.title}
            onChange={(title) => patch({ title })}
          />
          <DescriptionField
            value={event.description}
            onChange={(description) => patch({ description })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeInput
              label="بەروار و کات"
              required
              value={event.startsAt}
              onChange={(startsAt) => patch({ startsAt })}
            />
            <TextField
              label="شوێن یان پلاتفۆرمی ئۆنلاین"
              value={event.location}
              onChange={(location) => patch({ location })}
              placeholder="هەولێر یان Zoom"
            />
          </div>
          <TextField
            label="لینکی تۆمارکردن"
            value={event.registrationUrl}
            onChange={(registrationUrl) => patch({ registrationUrl })}
            placeholder="https://..."
            type="url"
            dir="ltr"
          />
          <MediaUpload
            label="وێنەی ڕووداو"
            wide
            value={event.image ? [event.image] : []}
            onChange={(value) => patch({ image: value[0] ?? "" })}
          />
          {errors[`event.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`event.${index}`]}
            </p>
          )}
        </>
      )}
    </CollectionEditor>
  );
}

export function MiniWebsiteAudioFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (audio: MiniWebsiteAudio[]) => onChange({ ...draft, audio });
  return (
    <CollectionEditor
      items={draft.audio}
      max={MINI_WEBSITE_MAX_AUDIO_ITEMS}
      singular="ناوەڕۆکی دەنگی"
      emptyText="یەکەم پۆدکاست، چاوپێکەوتن، گۆرانی یان نموونەی دەنگ زیاد بکە."
      icon={Headphones}
      error={errors.audio}
      setItems={setItems}
      createItem={createMiniWebsiteAudio}
    >
      {(audio, index, patch) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="ناونیشان"
              required
              value={audio.title}
              onChange={(title) => patch({ title })}
            />
            <CustomSelect<MiniWebsiteAudioPlatform>
              label="پلاتفۆرم"
              required
              showRequirement
              value={audio.platform}
              onChange={(platform) => patch({ platform })}
              options={(
                Object.entries(AUDIO_PLATFORM_LABELS) as [
                  MiniWebsiteAudioPlatform,
                  string,
                ][]
              ).map(([value, label]) => ({ value, label }))}
              triggerClassName="h-11"
              labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
            />
          </div>
          <DescriptionField
            value={audio.description}
            onChange={(description) => patch({ description })}
          />
          <TextField
            label="لینکی دەنگ یان ئەڵقە"
            required
            value={audio.url}
            onChange={(url) => patch({ url })}
            placeholder="https://..."
            type="url"
            dir="ltr"
          />
          <MediaUpload
            label="وێنەی بەرگ"
            wide
            value={audio.image ? [audio.image] : []}
            onChange={(value) => patch({ image: value[0] ?? "" })}
          />
          {errors[`audio.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`audio.${index}`]}
            </p>
          )}
        </>
      )}
    </CollectionEditor>
  );
}

export function MiniWebsiteAdvantageFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (advantages: MiniWebsiteAdvantage[]) =>
    onChange({ ...draft, advantages });
  return (
    <CollectionEditor
      items={draft.advantages}
      max={MINI_WEBSITE_MAX_ADVANTAGES}
      singular="خاڵی بەهێز"
      emptyText="هۆکارێکی ڕوون زیاد بکە کە بۆچی سەردانکەر ئەم بازرگانییە هەڵبژێرێت."
      icon={Award}
      error={errors.advantages}
      setItems={setItems}
      createItem={createMiniWebsiteAdvantage}
    >
      {(advantage, index, patch) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="ناونیشانی خاڵی بەهێز"
              required
              value={advantage.title}
              onChange={(title) => patch({ title })}
            />
            <CustomSelect<MiniWebsiteAdvantageIcon>
              label="ئایکۆن"
              required
              showRequirement
              value={advantage.icon}
              onChange={(icon) => patch({ icon })}
              options={(
                Object.entries(ADVANTAGE_ICON_LABELS) as [
                  MiniWebsiteAdvantageIcon,
                  string,
                ][]
              ).map(([value, label]) => ({ value, label }))}
              triggerClassName="h-11"
              labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
            />
          </div>
          <DescriptionField
            value={advantage.description}
            onChange={(description) => patch({ description })}
          />
          {errors[`advantage.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`advantage.${index}`]}
            </p>
          )}
        </>
      )}
    </CollectionEditor>
  );
}

export function MiniWebsiteImpactStatFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (impactStats: MiniWebsiteImpactStat[]) =>
    onChange({ ...draft, impactStats });
  return (
    <CollectionEditor
      items={draft.impactStats}
      max={MINI_WEBSITE_MAX_IMPACT_STATS}
      singular="ژمارە"
      emptyText="یەک ژمارەی گرنگ وەک ساڵانی ئەزموون یان ژمارەی کڕیار زیاد بکە."
      icon={ChartNoAxesCombined}
      error={errors.impactStats}
      setItems={setItems}
      createItem={createMiniWebsiteImpactStat}
    >
      {(item, index, patch) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="ژمارە"
              required
              value={item.value}
              onChange={(value) => patch({ value })}
              placeholder="1000"
              dir="ltr"
            />
            <TextField
              label="ناونیشان"
              required
              value={item.label}
              onChange={(label) => patch({ label })}
              placeholder="کڕیاری خزمەتکراو"
            />
            <TextField
              label="پاشگر"
              value={item.suffix}
              onChange={(suffix) => patch({ suffix })}
              placeholder="+، %، ساڵ"
            />
            <CustomSelect<MiniWebsiteAdvantageIcon>
              label="ئایکۆن"
              required
              showRequirement
              value={item.icon}
              onChange={(icon) => patch({ icon })}
              options={(
                Object.entries(ADVANTAGE_ICON_LABELS) as [
                  MiniWebsiteAdvantageIcon,
                  string,
                ][]
              ).map(([value, label]) => ({ value, label }))}
              triggerClassName="h-11"
              labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
            />
          </div>
          {errors[`impactStat.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`impactStat.${index}`]}
            </p>
          )}
        </>
      )}
    </CollectionEditor>
  );
}

export function MiniWebsiteProcessFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (processSteps: MiniWebsiteProcessStep[]) =>
    onChange({ ...draft, processSteps });
  return (
    <CollectionEditor
      items={draft.processSteps}
      max={MINI_WEBSITE_MAX_PROCESS_STEPS}
      singular="هەنگاو"
      emptyText="یەکەم هەنگاوی وەرگرتنی خزمەتگوزاری یان تەواوکردنی داواکاری زیاد بکە."
      icon={ListChecks}
      error={errors.processSteps}
      setItems={setItems}
      createItem={createMiniWebsiteProcessStep}
    >
      {(item, index, patch) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="ناونیشان"
              required
              value={item.title}
              onChange={(title) => patch({ title })}
              placeholder="داواکاری بنێرە"
            />
            <CustomSelect<MiniWebsiteAdvantageIcon>
              label="ئایکۆن"
              required
              showRequirement
              value={item.icon}
              onChange={(icon) => patch({ icon })}
              options={(
                Object.entries(ADVANTAGE_ICON_LABELS) as [
                  MiniWebsiteAdvantageIcon,
                  string,
                ][]
              ).map(([value, label]) => ({ value, label }))}
              triggerClassName="h-11"
              labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
            />
          </div>
          <DescriptionField
            value={item.description}
            onChange={(description) => patch({ description })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="دەقی دوگمە"
              value={item.actionLabel}
              onChange={(actionLabel) => patch({ actionLabel })}
              placeholder="دەستپێکردن"
            />
            <TextField
              label="لینک"
              value={item.actionUrl}
              onChange={(actionUrl) => patch({ actionUrl })}
              placeholder="https://..."
              type="url"
              dir="ltr"
            />
          </div>
          {errors[`processStep.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`processStep.${index}`]}
            </p>
          )}
        </>
      )}
    </CollectionEditor>
  );
}

export function MiniWebsiteDocumentFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (documents: MiniWebsiteDocument[]) =>
    onChange({ ...draft, documents });
  return (
    <CollectionEditor
      items={draft.documents}
      max={MINI_WEBSITE_MAX_DOCUMENTS}
      singular="بەڵگەنامە"
      emptyText="یەکەم فۆڕم، ڕاپۆرت، کاتالۆگ، مینیو، بروشور یان فایل زیاد بکە."
      icon={FileDown}
      error={errors.documents}
      setItems={setItems}
      createItem={createMiniWebsiteDocument}
    >
      {(document, index, patch) => (
        <>
          <TextField
            label="ناونیشانی بەڵگەنامە"
            required
            value={document.title}
            onChange={(title) => patch({ title })}
            placeholder="ڕاپۆرت، کاتالۆگ، مینیو، بروشور..."
          />
          <DescriptionField
            label="وردەکاری بەڵگەنامە"
            value={document.description}
            onChange={(description) => patch({ description })}
            placeholder="بنووسە ئەم فایلە چی لەخۆدەگرێت"
          />
          <TextField
            label="لینکی HTTPS بۆ فایل"
            required
            value={document.fileUrl}
            onChange={(fileUrl) => patch({ fileUrl })}
            placeholder="https://..."
            type="url"
            dir="ltr"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="جۆری فایل"
              value={document.fileType}
              onChange={(fileType) => patch({ fileType })}
              placeholder="بۆ نموونە: PDF"
            />
            <TextField
              label="قەبارەی فایل"
              value={document.fileSize}
              onChange={(fileSize) => patch({ fileSize })}
              placeholder="2.4 MB"
              dir="ltr"
            />
          </div>
          {errors[`document.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`document.${index}`]}
            </p>
          )}
        </>
      )}
    </CollectionEditor>
  );
}
