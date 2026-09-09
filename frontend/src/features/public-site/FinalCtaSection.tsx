import { PublicCallToActionSection } from "@/components/public/PublicCallToActionSection";
import {
  SPONSOR_KRD_ACCENT_COLOR,
  SPONSOR_KRD_ACCENT_GRADIENT,
} from "@/lib/sponsor-krd-theme";

export function FinalCtaSection() {
  return (
    <PublicCallToActionSection
      accentColor={SPONSOR_KRD_ACCENT_COLOR}
      accentBackground={SPONSOR_KRD_ACCENT_GRADIENT}
      accentInk="#111827"
      eyebrow="دەستپێکردن خێرایە"
      title="ئامادەیت شوێنی خۆت لە ئینتەرنێت دروست بکەیت؟"
      description="هەژمارەکەت پشتڕاست بکەرەوە، پەڕەکەت هەڵبژێرە و بەستەرەکەت لە چەند خولەکێکدا بڵاو بکەرەوە"
      primaryAction={{ label: "هەژمار دروست بکە", href: "/signup" }}
      secondaryAction={{ label: "چوونەژوورەوە", href: "/login" }}
    />
  );
}
