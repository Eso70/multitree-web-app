import { SkeletonAuthenticationPage } from "@/components/shared/SkeletonAuthenticationPage";

export default function SignupApplicationLoading() {
  return (
    <SkeletonAuthenticationPage
      content="form"
      brandDescription="هەژماری بزنسەکەت بە پاراستن تەواو بکە"
    />
  );
}
