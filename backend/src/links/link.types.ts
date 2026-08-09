/**
 * Row shapes for the `links` table, shared by the services that read it.
 *
 * Declared as type aliases rather than interfaces on purpose: pg constrains the
 * row generic to `QueryResultRow`, and only type aliases pick up the implicit
 * index signature that constraint needs.
 */
export type LinkRow = {
  id: string;
  linktree_id?: string;
  business_id?: string;
  platform: string;
  url: string;
  display_name: string | null;
  description: string | null;
  default_message: string | null;
  display_order: number;
  original_input: string | null;
  country_code: string | null;
  gps_lat: number | string | null;
  gps_lng: number | string | null;
  custom_color: string | null;
  custom_icon: string | null;
  created_at?: Date;
  updated_at?: Date;
};

/** The subset of link columns the API exposes as a nested `metadata` object. */
export type LinkMetadata = Pick<
  LinkRow,
  | 'original_input'
  | 'country_code'
  | 'gps_lat'
  | 'gps_lng'
  | 'custom_color'
  | 'custom_icon'
>;

export type MappedLink = LinkRow & { metadata: LinkMetadata };

/** One entry of a full link-set replacement sent by a client. */
export type SyncLinkInput = {
  platform: string;
  url: string;
  display_name?: string | null;
  description?: string | null;
  default_message?: string | null;
  metadata?: Partial<LinkMetadata> | null;
};

/** Builds the nested `metadata` object the API returns for a link row. */
export function withLinkMetadata<T extends LinkRow>(
  row: T,
): T & { metadata: LinkMetadata } {
  return {
    ...row,
    metadata: {
      original_input: row.original_input,
      country_code: row.country_code,
      gps_lat: row.gps_lat,
      gps_lng: row.gps_lng,
      custom_color: row.custom_color,
      custom_icon: row.custom_icon,
    },
  };
}
