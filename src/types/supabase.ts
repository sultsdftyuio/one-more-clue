/**
 * Hand-written to match supabase/migrations. Once the project exists you can
 * replace this with generated types: npx supabase gen types typescript --project-id <id>
 */
export type PurchaseStatus = "paid" | "refunded";

export type PurchaseRow = {
  id: string;
  user_id: string;
  case_id: string;
  payment_id: string;
  status: PurchaseStatus;
  amount: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      purchases: {
        Row: PurchaseRow;
        Insert: Omit<PurchaseRow, "id" | "created_at" | "updated_at"> & Partial<Pick<PurchaseRow, "id">>;
        Update: Partial<Omit<PurchaseRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
