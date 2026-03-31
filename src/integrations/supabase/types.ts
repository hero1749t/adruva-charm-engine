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
      addon_groups: {
        Row: {
          created_at: string
          id: string
          max_selections: number | null
          name: string
          owner_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_selections?: number | null
          name: string
          owner_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          max_selections?: number | null
          name?: string
          owner_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      addon_options: {
        Row: {
          addon_group_id: string
          created_at: string
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          addon_group_id: string
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          addon_group_id?: string
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "addon_options_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      combo_items: {
        Row: {
          combo_id: string
          id: string
          menu_item_id: string
          quantity: number
        }
        Insert: {
          combo_id: string
          id?: string
          menu_item_id: string
          quantity?: number
        }
        Update: {
          combo_id?: string
          id?: string
          menu_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "menu_combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
      item_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
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
      menu_combos: {
        Row: {
          combo_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          owner_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          combo_price: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          owner_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          combo_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          owner_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_customization: {
        Row: {
          accent_color: string
          background_color: string
          created_at: string
          font_body: string
          font_heading: string
          id: string
          owner_id: string
          primary_color: string
          secondary_color: string
          text_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          created_at?: string
          font_body?: string
          font_heading?: string
          id?: string
          owner_id: string
          primary_color?: string
          secondary_color?: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          created_at?: string
          font_body?: string
          font_heading?: string
          id?: string
          owner_id?: string
          primary_color?: string
          secondary_color?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_item_addon_groups: {
        Row: {
          addon_group_id: string
          id: string
          menu_item_id: string
        }
        Insert: {
          addon_group_id: string
          id?: string
          menu_item_id: string
        }
        Update: {
          addon_group_id?: string
          id?: string
          menu_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_addon_groups_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_addon_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_tags: {
        Row: {
          id: string
          menu_item_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          tag_id: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_tags_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "item_tags"
            referencedColumns: ["id"]
          },
        ]
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
      owner_subscriptions: {
        Row: {
          assigned_by: string
          created_at: string | null
          expires_at: string | null
          id: string
          notes: string | null
          owner_id: string
          plan_id: string
          starts_at: string | null
          status: string | null
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          plan_id: string
          starts_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          plan_id?: string
          starts_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
      subscription_plans: {
        Row: {
          billing_period: string | null
          created_at: string | null
          feature_analytics: boolean | null
          feature_chain: boolean | null
          feature_coupons: boolean | null
          feature_customer_reviews: boolean | null
          feature_expenses: boolean | null
          feature_inventory: boolean | null
          feature_kitchen_display: boolean | null
          feature_online_orders: boolean | null
          id: string
          is_active: boolean | null
          max_menu_items: number | null
          max_orders_per_month: number | null
          max_rooms: number | null
          max_staff: number | null
          max_tables: number | null
          name: string
          price: number
        }
        Insert: {
          billing_period?: string | null
          created_at?: string | null
          feature_analytics?: boolean | null
          feature_chain?: boolean | null
          feature_coupons?: boolean | null
          feature_customer_reviews?: boolean | null
          feature_expenses?: boolean | null
          feature_inventory?: boolean | null
          feature_kitchen_display?: boolean | null
          feature_online_orders?: boolean | null
          id?: string
          is_active?: boolean | null
          max_menu_items?: number | null
          max_orders_per_month?: number | null
          max_rooms?: number | null
          max_staff?: number | null
          max_tables?: number | null
          name: string
          price?: number
        }
        Update: {
          billing_period?: string | null
          created_at?: string | null
          feature_analytics?: boolean | null
          feature_chain?: boolean | null
          feature_coupons?: boolean | null
          feature_customer_reviews?: boolean | null
          feature_expenses?: boolean | null
          feature_inventory?: boolean | null
          feature_kitchen_display?: boolean | null
          feature_online_orders?: boolean | null
          id?: string
          is_active?: boolean | null
          max_menu_items?: number | null
          max_orders_per_month?: number | null
          max_rooms?: number | null
          max_staff?: number | null
          max_tables?: number | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      variant_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          menu_item_id: string
          name: string
          owner_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          menu_item_id: string
          name: string
          owner_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          menu_item_id?: string
          name?: string
          owner_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "variant_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_options: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          sort_order: number
          variant_group_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          sort_order?: number
          variant_group_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          sort_order?: number
          variant_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_options_variant_group_id_fkey"
            columns: ["variant_group_id"]
            isOneToOne: false
            referencedRelation: "variant_groups"
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
