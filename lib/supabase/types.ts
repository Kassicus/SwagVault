// Hand-written to match supabase/migrations/0001_init.sql.
// After Supabase is provisioned, regenerate with:
//   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FulfillmentMode = 'shipping' | 'pickup' | 'both';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid';
export type SubscriptionPlan = 'monthly' | 'annual';
export type MemberRole = 'owner' | 'admin' | 'member';

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          fulfillment_mode: FulfillmentMode;
          pickup_location: string | null;
          leaderboard_enabled: boolean;
          stripe_customer_id: string | null;
          subscription_status: SubscriptionStatus;
          subscription_plan: SubscriptionPlan | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          fulfillment_mode?: FulfillmentMode;
          pickup_location?: string | null;
          leaderboard_enabled?: boolean;
          stripe_customer_id?: string | null;
          subscription_status?: SubscriptionStatus;
          subscription_plan?: SubscriptionPlan | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
        Relationships: [];
      };
      organization_currencies: {
        Row: {
          organization_id: string;
          name: string;
          symbol: string;
          icon_url: string | null;
          color_hex: string;
          decimal_places: number;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          name?: string;
          symbol?: string;
          icon_url?: string | null;
          color_hex?: string;
          decimal_places?: number;
          updated_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['organization_currencies']['Insert']
        >;
        Relationships: [];
      };
      memberships: {
        Row: {
          organization_id: string;
          user_id: string;
          role: MemberRole;
          balance_minor_units: number;
          leaderboard_visible: boolean;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: MemberRole;
          balance_minor_units?: number;
          leaderboard_visible?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>;
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: MemberRole;
          token_hash: string;
          expires_at: string;
          accepted_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: MemberRole;
          token_hash: string;
          expires_at: string;
          accepted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invites']['Insert']>;
        Relationships: [];
      };
      subscription_events: {
        Row: {
          id: string;
          organization_id: string | null;
          stripe_event_id: string;
          type: string;
          payload: Json;
          received_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          stripe_event_id: string;
          type: string;
          payload: Json;
          received_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['subscription_events']['Insert']
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      setup_organization: {
        Args: { p_user_id: string; p_slug: string; p_name: string };
        Returns: string;
      };
    };
    Enums: {
      fulfillment_mode: FulfillmentMode;
      subscription_status: SubscriptionStatus;
      subscription_plan: SubscriptionPlan;
      member_role: MemberRole;
    };
  };
};
