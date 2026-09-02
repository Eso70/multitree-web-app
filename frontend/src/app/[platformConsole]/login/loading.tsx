import { SkeletonAuthenticationPage } from "@/components/shared/SkeletonAuthenticationPage";

export default function PlatformLoginLoading() {
  return (
    <SkeletonAuthenticationPage
      rememberDevice
      brandDescription="بڕۆ ژوورەوە بۆ بەڕێوەبردنی پلاتفۆڕم"
    />
  );
}
