import { Search, Users } from "lucide-react";
import type { PlatformBusiness as Business } from "@linktree/types";
import { BusinessesGrid } from "@/features/platform-admin/components/BusinessesGrid";
import { BusinessesTable } from "@/features/platform-admin/components/BusinessesTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { TablePagination } from "@/components/shared/TablePagination";
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
          data={filteredBusinesses}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAnalytics={onViewAnalytics}
          onManageSessions={onManageSessions}
          onOpenDashboard={onOpenDashboard}
        />
      ) : (
        <BusinessesTable
          data={filteredBusinesses}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAnalytics={onViewAnalytics}
          onManageSessions={onManageSessions}
          onOpenDashboard={onOpenDashboard}
        />
      )}
      <TablePagination
        page={page}
        pageSize={pagination.limit}
        totalItems={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
