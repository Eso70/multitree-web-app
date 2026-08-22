import { Search, Users } from "lucide-react";
import type { PlatformBusiness as Business } from "@linktree/types";
import { BusinessesGrid } from "@/features/platform-admin/components/BusinessesGrid";
import { BusinessesTable } from "@/features/platform-admin/components/BusinessesTable";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ManagementTablePagination } from "@/components/shared/ManagementTable";
import type { BusinessPagination } from "@/features/platform-admin/hooks/useBusinesses";

interface PlatformBusinessDirectoryContentProps {
  businesses: Business[];
  filteredBusinesses: Business[];
  viewMode: "grid" | "table";
  page: number;
  pagination: BusinessPagination;
  onPageChange: (page: number) => void;
  onEdit: (business: Business) => void;
  onDelete: (id: string) => void;
  onViewAnalytics: (business: Business) => void;
  onManageSessions: (business: Business) => void;
  onOpenDashboard: (business: Business) => void;
}

export function PlatformBusinessDirectoryContent({
  businesses,
  filteredBusinesses,
  viewMode,
  page,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
  onOpenDashboard,
}: PlatformBusinessDirectoryContentProps) {
  // The server pages this list, so both views take the same page number rather
  // than each drawing its own footer.
  const listPagination: ManagementTablePagination = {
    mode: "server",
    page,
    pageSize: pagination.limit,
    totalItems: pagination.total,
    totalPages: pagination.totalPages,
    onPageChange: onPageChange,
  };

  return (
    <div>
      {businesses.length === 0 ? (
        <EmptyState
          icon={Users}
          title="هیچ بزنسێک نییە"
          description="بانگهێشتنامەیەکی نوێ دروست بکە بۆ دەستپێکردنی تۆمارکردنی یەکەم بزنس."
        />
      ) : filteredBusinesses.length === 0 ? (
        <EmptyState
          icon={Search}
          title="هیچ ئەنجامێک نەدۆزرایەوە"
          description="دووبارە گەڕان بکەرەوە بە وشەیەکی تر"
        />
      ) : viewMode === "grid" ? (
        <BusinessesGrid
          pagination={listPagination}
          data={filteredBusinesses}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAnalytics={onViewAnalytics}
          onManageSessions={onManageSessions}
          onOpenDashboard={onOpenDashboard}
        />
      ) : (
        <BusinessesTable
          pagination={listPagination}
          data={filteredBusinesses}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAnalytics={onViewAnalytics}
          onManageSessions={onManageSessions}
          onOpenDashboard={onOpenDashboard}
        />
      )}
    </div>
  );
}
