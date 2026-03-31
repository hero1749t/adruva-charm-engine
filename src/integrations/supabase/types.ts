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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      coupon_usage: {
        Row: {
          coupon_id: string
          customer_phone: string
          id: string
          order_id: string
          owner_id: string
          used_at: string
        }
        Insert: {
          coupon_id: string
          customer_phone: string
          id?: string
          order_id: string
          owner_id: string
          used_at?: string
        }
        Update: {
          coupon_id?: string
          customer_phone?: string
          id?: string
          order_id?: string
          owner_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          order_id: string
          owner_id: string
          owner_reply: string | null
          rating: number
          replied_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id: string
          owner_id: string
          owner_reply?: string | null
          rating: number
          replied_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id?: string
          owner_id?: string
          owner_reply?: string | null
          rating?: number
          replied_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          city: string | null
          created_at: string
          has_website: boolean | null
          id: string
          name: string
          phone: string
          restaurant_name: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          has_website?: boolean | null
          id?: string
          name: string
          phone: string
          restaurant_name: string
        }
        Update: {
          city?: string | null
          created_at?: string
          has_website?: boolean | null
          id?: string
          name?: string
          phone?: string
          restaurant_name?: string
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses_per_person: number
          min_order_amount: number
          owner_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses_per_person?: number
          min_order_amount?: number
          owner_id: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses_per_person?: number
          min_order_amount?: number
          owner_id?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          notes: string | null
          owner_id: string
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          low_stock_threshold: number
          name: string
          owner_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          owner_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          owner_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_veg: boolean
          name: string
          owner_id: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_veg?: boolean
          name: string
          owner_id: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_veg?: boolean
          name?: string
          owner_id?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          item_price: number
          menu_item_id: string
          order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          item_price: number
          menu_item_id: string
          order_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          item_price?: number
          menu_item_id?: string
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_phone: string | null
          id: string
          notes: string | null
          owner_id: string
          payment_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          table_id: string | null
          table_number: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          table_number?: number | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          table_number?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          manager_name: string | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          closing_hours: string | null
          created_at: string
          full_name: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_range_meters: number
          gst_number: string | null
          gst_percentage: number
          id: string
          opening_hours: string | null
          phone: string | null
          restaurant_logo_url: string | null
          restaurant_name: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          closing_hours?: string | null
          created_at?: string
          full_name?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_range_meters?: number
          gst_number?: string | null
          gst_percentage?: number
          id?: string
          opening_hours?: string | null
          phone?: string | null
          restaurant_logo_url?: string | null
          restaurant_name?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          closing_hours?: string | null
          created_at?: string
          full_name?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gps_range_meters?: number
          gst_number?: string | null
          gst_percentage?: number
          id?: string
          opening_hours?: string | null
          phone?: string | null
          restaurant_logo_url?: string | null
          restaurant_name?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          menu_item_id: string
          owner_id: string
          quantity_used: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          menu_item_id: string
          owner_id: string
          quantity_used?: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          menu_item_id?: string
          owner_id?: string
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_rooms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          owner_id: string
          qr_generated_at: string | null
          room_number: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          owner_id: string
          qr_generated_at?: string | null
          room_number: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          owner_id?: string
          qr_generated_at?: string | null
          room_number?: number
          status?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          owner_id: string
          status: Database["public"]["Enums"]["table_status"]
          table_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["table_status"]
          table_number: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["table_status"]
          table_number?: number
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          restaurant_owner_id: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          restaurant_owner_id: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          restaurant_owner_id?: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          movement_type: string
          note: string | null
          order_id: string | null
          owner_id: string
          quantity_changed: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          movement_type?: string
          note?: string | null
          order_id?: string | null
          owner_id: string
          quantity_changed: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          movement_type?: string
          note?: string | null
          order_id?: string | null
          owner_id?: string
          quantity_changed?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_staff_role: {
        Args: { _owner_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      is_restaurant_staff: {
        Args: { _owner_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      order_status:
        | "new"
        | "accepted"
        | "preparing"
        | "ready"
        | "served"
        | "cancelled"
      staff_role: "owner" | "manager" | "kitchen" | "cashier"
      table_status: "free" | "occupied" | "reserved" | "cleaning"
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
      order_status: [
        "new",
        "accepted",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      staff_role: ["owner", "manager", "kitchen", "cashier"],
      table_status: ["free", "occupied", "reserved", "cleaning"],
    },
  },
} as const
