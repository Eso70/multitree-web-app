import { AuthenticationCard } from "@/components/shared/AuthenticationCard";
import { GoogleAuthenticationButton } from "@/components/shared/GoogleAuthenticationButton";
import { CreatorAuthenticationModeLink } from "@/features/creator/CreatorAuthenticationModeLink";
import type { CreatorAuthMode } from "@/features/creator/creator-auth.types";

export function CreatorAuthenticationPanel({ mode }: { mode: CreatorAuthMode }) {
  return (
    <AuthenticationCard
      title={
        mode === "signup"
          ? "هەژماری خۆت دروست بکە"
          : "بچۆ ژوورەوە بۆ هەژمارەکەت"
      }
      description={
        mode === "signup"
          ? "بە هەژماری Google خۆت خۆتۆمار بکە و پەڕەی تایبەت بە خۆت دروست بکە"
          : "بە هەمان هەژماری Google کە پێشتر بەکارت هێناوە بچۆ ژوورەوە"
      }
    >
      <GoogleAuthenticationButton
        href={`/api/creator/auth/google/start?intent=${mode}`}
        label={
          mode === "signup"
            ? "بە Google هەژمار دروست بکە"
            : "بە Google بچۆ ژوورەوە"
        }
      />
      <CreatorAuthenticationModeLink mode={mode} />
    </AuthenticationCard>
  );
}
