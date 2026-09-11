import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import {
  LinktreesManagementPage,
  type LinktreesManagementPageProps,
} from "@/features/link-editor/components/LinktreesManagementPage";

export type BusinessLinktreesPageProps = LinktreesManagementPageProps;

export function BusinessLinktreesPage(props: BusinessLinktreesPageProps) {
  useRegisterBusinessDashboardRefresh("linktrees", () => props.onRefresh(true));
  return <LinktreesManagementPage {...props} />;
}
