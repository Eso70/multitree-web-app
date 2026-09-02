import { SkeletonAuthenticationPage } from "@/components/shared/SkeletonAuthenticationPage";

export default function CreatorLoginLoading() {
  return (
    <SkeletonAuthenticationPage
      content="google"
      brandDescription="بگەڕێوە بۆ بەڕێوەبردنی پەڕەکەت"
    />
  );
}
