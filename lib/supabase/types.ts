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
export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled';
export type FulfillmentMethod = 'shipping' | 'pickup';
export type TransactionKind = 'grant' | 'spend' | 'refund' | 'adjustment';

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
      products: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          image_paths: string[];
          tags: string[];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          image_paths?: string[];
          tags?: string[];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          organization_id: string;
          name: string;
          options: Json;
          price_minor_units: number;
          inventory_count: number;
          position: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          organization_id: string;
          name: string;
          options?: Json;
          price_minor_units?: number;
          inventory_count?: number;
          position?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['product_variants']['Insert']
        >;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          status: OrderStatus;
          fulfillment_method: FulfillmentMethod;
          shipping_address: Json | null;
          total_minor_units: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          status?: OrderStatus;
          fulfillment_method: FulfillmentMethod;
          shipping_address?: Json | null;
          total_minor_units: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          qty: number;
          unit_price_minor_units: number;
          product_name: string;
          variant_name: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          qty: number;
          unit_price_minor_units: number;
          product_name: string;
          variant_name?: string | null;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          kind: TransactionKind;
          amount_minor_units: number;
          order_id: string | null;
          actor_user_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          kind: TransactionKind;
          amount_minor_units: number;
          order_id?: string | null;
          actor_user_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      setup_organization: {
        Args: { p_user_id: string; p_slug: string; p_name: string };
        Returns: string;
      };
      place_order: {
        Args: {
          p_organization_id: string;
          p_user_id: string;
          p_items: Json;
          p_fulfillment: FulfillmentMethod;
          p_shipping_address: Json | null;
        };
        Returns: string;
      };
      cancel_order: {
        Args: { p_order_id: string; p_actor_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      fulfillment_mode: FulfillmentMode;
      subscription_status: SubscriptionStatus;
      subscription_plan: SubscriptionPlan;
      member_role: MemberRole;
      order_status: OrderStatus;
      fulfillment_method: FulfillmentMethod;
      transaction_kind: TransactionKind;
    };
  };
};
