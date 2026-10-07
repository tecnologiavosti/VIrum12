export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_product_clicks: {
        Row: {
          clicked_at: string
          destination_url: string | null
          id: string
          product_id: string | null
          source: string | null
          store: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          destination_url?: string | null
          id?: string
          product_id?: string | null
          source?: string | null
          store?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          destination_url?: string | null
          id?: string
          product_id?: string | null
          source?: string | null
          store?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_product_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_products: {
        Row: {
          affiliate_url: string
          audience: string | null
          body_types: string[] | null
          category: string
          click_count: number | null
          colors: string[] | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          price_range: string | null
          sizes: string[] | null
          status: string
          store: string
          styles: string[] | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          affiliate_url: string
          audience?: string | null
          body_types?: string[] | null
          category: string
          click_count?: number | null
          colors?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          price_range?: string | null
          sizes?: string[] | null
          status?: string
          store: string
          styles?: string[] | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_url?: string
          audience?: string | null
          body_types?: string[] | null
          category?: string
          click_count?: number | null
          colors?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          price_range?: string | null
          sizes?: string[] | null
          status?: string
          store?: string
          styles?: string[] | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          created_at: string | null
          diagnosis_id: string | null
          error_message: string | null
          id: string
          model: string
          provider: string
          section: string
          status: string
          tokens_used: number | null
        }
        Insert: {
          created_at?: string | null
          diagnosis_id?: string | null
          error_message?: string | null
          id?: string
          model: string
          provider: string
          section: string
          status: string
          tokens_used?: number | null
        }
        Update: {
          created_at?: string | null
          diagnosis_id?: string | null
          error_message?: string | null
          id?: string
          model?: string
          provider?: string
          section?: string
          status?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_cents: number
          id: string
          payment_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_cents?: number
          id?: string
          payment_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_cents?: number
          id?: string
          payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to_plan_id: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          per_user_limit: number | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          uses_count: number
        }
        Insert: {
          applies_to_plan_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          per_user_limit?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          uses_count?: number
        }
        Update: {
          applies_to_plan_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          per_user_limit?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          uses_count?: number
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          body_analysis: Json | null
          capsule_wardrobe: Json | null
          color_analysis: Json | null
          created_at: string | null
          final_diagnosis: Json | null
          id: string
          modeling_analysis: Json | null
          photo_back_url: string | null
          photo_face_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          processing_step: string | null
          questionnaire: Json | null
          status: string
          style_analysis: Json | null
          updated_at: string | null
          user_id: string
          wardrobe_essentials: Json | null
        }
        Insert: {
          body_analysis?: Json | null
          capsule_wardrobe?: Json | null
          color_analysis?: Json | null
          created_at?: string | null
          final_diagnosis?: Json | null
          id?: string
          modeling_analysis?: Json | null
          photo_back_url?: string | null
          photo_face_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          processing_step?: string | null
          questionnaire?: Json | null
          status?: string
          style_analysis?: Json | null
          updated_at?: string | null
          user_id: string
          wardrobe_essentials?: Json | null
        }
        Update: {
          body_analysis?: Json | null
          capsule_wardrobe?: Json | null
          color_analysis?: Json | null
          created_at?: string | null
          final_diagnosis?: Json | null
          id?: string
          modeling_analysis?: Json | null
          photo_back_url?: string | null
          photo_face_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          processing_step?: string | null
          questionnaire?: Json | null
          status?: string
          style_analysis?: Json | null
          updated_at?: string | null
          user_id?: string
          wardrobe_essentials?: Json | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          interval: string
          is_active: boolean
          is_popular: boolean
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_diagnoses: {
        Args: never
        Returns: {
          created_at: string
          diagnosis_type: string
          email: string
          full_name: string
          id: string
          phone: string
          status: string
          user_id: string
        }[]
      }
      apply_pending_coupon: {
        Args: { _code?: string; _plan_id?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_coupon_public: {
        Args: { _code: string; _plan_id?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
