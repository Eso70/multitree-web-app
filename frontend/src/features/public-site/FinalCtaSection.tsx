import { PublicCallToActionSection } from "@/components/public/PublicCallToActionSection";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";

export function FinalCtaSection() {
  return (
    <PublicCallToActionSection
      accentColor={MULTITREE_ACCENT_COLOR}
      accentInk="#111827"
      eyebrow="دەستپێکردن خێرایە"
      title="ئامادەیت شوێنی خۆت لە ئینتەرنێت دروست بکەیت؟"
      description="هەژمارەکەت پشتڕاست بکەرەوە، پەڕەکەت هەڵبژێرە و بەستەرەکەت لە چەند خولەکێکدا بڵاو بکەرەوە"
      primaryAction={{ label: "هەژمار دروست بکە", href: "/signup" }}
      secondaryAction={{ label: "چوونەژوورەوە", href: "/login" }}
    />
  );
}
