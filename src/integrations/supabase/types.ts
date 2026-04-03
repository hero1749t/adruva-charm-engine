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
      admin_invoices: {
        Row: {
          base_amount: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          last_sent_at: string | null
          notes: string | null
          owner_id: string
          paid_at: string | null
          payment_method: string | null
          pdf_url: string | null
          plan_id: string | null
          status: string
          subscription_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          base_amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          last_sent_at?: string | null
          notes?: string | null
          owner_id: string
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          plan_id?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          base_amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          last_sent_at?: string | null
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          plan_id?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_invoices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "owner_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_logs: {
        Row: {
          action: string
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          ip_device: string | null
          metadata: Json
          module: string
          result: string
          target: string
          target_owner_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_device?: string | null
          metadata?: Json
          module: string
          result?: string
          target: string
          target_owner_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_device?: string | null
          metadata?: Json
          module?: string
          result?: string
          target?: string
          target_owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_logs_target_owner_id_fkey"
            columns: ["target_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json
          owner_id: string | null
          read_at: string | null
          resolved_at: string | null
          severity: string
          status: string
          target_module: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json
          owner_id?: string | null
          read_at?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          target_module?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json
          owner_id?: string | null
          read_at?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          target_module?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_support_tickets: {
        Row: {
          assigned_agent_id: string | null
          assigned_agent_name: string | null
          category: string
          created_at: string
          description: string | null
          escalation_level: number
          id: string
          metadata: Json
          owner_id: string | null
          priority: string
          resolved_at: string | null
          sla_due_at: string | null
          source: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          escalation_level?: number
          id?: string
          metadata?: Json
          owner_id?: string | null
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          source?: string
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          escalation_level?: number
          id?: string
          metadata?: Json
          owner_id?: string | null
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          source?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_support_tickets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contacted_at: string | null
          converted_owner_id: string | null
          created_at: string
          demo_scheduled_at: string | null
          email: string | null
          has_website: boolean | null
          id: string
          lead_status: string
          meeting_notes: string | null
          name: string
          next_follow_up_at: string | null
          phone: string
          priority: string
          proposed_plan_id: string | null
          restaurant_name: string
          source: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contacted_at?: string | null
          converted_owner_id?: string | null
          created_at?: string
          demo_scheduled_at?: string | null
          email?: string | null
          has_website?: boolean | null
          id?: string
          lead_status?: string
          meeting_notes?: string | null
          name: string
          next_follow_up_at?: string | null
          phone: string
          priority?: string
          proposed_plan_id?: string | null
          restaurant_name: string
          source?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contacted_at?: string | null
          converted_owner_id?: string | null
          created_at?: string
          demo_scheduled_at?: string | null
          email?: string | null
          has_website?: boolean | null
          id?: string
          lead_status?: string
          meeting_notes?: string | null
          name?: string
          next_follow_up_at?: string | null
          phone?: string
          priority?: string
          proposed_plan_id?: string | null
          restaurant_name?: string
          source?: string
          updated_at?: string
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
          image_url: string | null
          is_active: boolean
          name: string
          owner_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          owner_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
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
          available_from: string | null
          available_to: string | null
          category_id: string
          created_at: string
          description: string | null
          gst_percentage: number
          id: string
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          is_veg: boolean
          low_stock_threshold: number | null
          name: string
          original_price: number | null
          owner_id: string
          price: number
          sort_order: number
          stock_quantity: number | null
          tax_type: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_to?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          gst_percentage?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_veg?: boolean
          low_stock_threshold?: number | null
          name: string
          original_price?: number | null
          owner_id: string
          price: number
          sort_order?: number
          stock_quantity?: number | null
          tax_type?: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_to?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          gst_percentage?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_veg?: boolean
          low_stock_threshold?: number | null
          name?: string
          original_price?: number | null
          owner_id?: string
          price?: number
          sort_order?: number
          stock_quantity?: number | null
          tax_type?: string
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
          combo_id: string | null
          created_at: string
          id: string
          item_name: string
          item_price: number
          menu_item_id: string | null
          order_id: string
          quantity: number
        }
        Insert: {
          combo_id?: string | null
          created_at?: string
          id?: string
          item_name: string
          item_price: number
          menu_item_id?: string | null
          order_id: string
          quantity?: number
        }
        Update: {
          combo_id?: string | null
          created_at?: string
          id?: string
          item_name?: string
          item_price?: number
          menu_item_id?: string | null
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "menu_combos"
            referencedColumns: ["id"]
          },
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
      order_payment_entries: {
        Row: {
          amount: number
          created_at: string
          gateway_payload: Json
          id: string
          note: string | null
          order_id: string
          owner_id: string
          payment_method: string
          reference: string | null
          source: string
          staff_member_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_payload?: Json
          id?: string
          note?: string | null
          order_id: string
          owner_id: string
          payment_method: string
          reference?: string | null
          source?: string
          staff_member_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_payload?: Json
          id?: string
          note?: string | null
          order_id?: string
          owner_id?: string
          payment_method?: string
          reference?: string | null
          source?: string
          staff_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bill_generated_at: string | null
          bill_number: string | null
          bill_status: string
          billing_notes: string | null
          billing_revert_reason: string | null
          billing_reverted_at: string | null
          billing_void_reason: string | null
          billing_voided_at: string | null
          cancellation_authorized_by_staff_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_phone: string | null
          id: string
          latest_invoice_id: string | null
          notes: string | null
          order_origin: string
          owner_id: string
          payment_method: string | null
          payment_confirmed_at: string | null
          payment_lock_reason: string | null
          payment_locked_at: string | null
          payment_reference: string | null
          payment_status: string
          qr_gateway_reference: string | null
          settled_at: string | null
          settled_by_staff_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          table_id: string | null
          table_number: number | null
          tax_amount: number
          total_amount: number
          updated_at: string
          discount_amount: number
        }
        Insert: {
          bill_generated_at?: string | null
          bill_number?: string | null
          bill_status?: string
          billing_notes?: string | null
          billing_revert_reason?: string | null
          billing_reverted_at?: string | null
          billing_void_reason?: string | null
          billing_voided_at?: string | null
          cancellation_authorized_by_staff_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_phone?: string | null
          id?: string
          latest_invoice_id?: string | null
          notes?: string | null
          order_origin?: string
          owner_id: string
          payment_method?: string | null
          payment_confirmed_at?: string | null
          payment_lock_reason?: string | null
          payment_locked_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          qr_gateway_reference?: string | null
          settled_at?: string | null
          settled_by_staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          table_id?: string | null
          table_number?: number | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          discount_amount?: number
        }
        Update: {
          bill_generated_at?: string | null
          bill_number?: string | null
          bill_status?: string
          billing_notes?: string | null
          billing_revert_reason?: string | null
          billing_reverted_at?: string | null
          billing_void_reason?: string | null
          billing_voided_at?: string | null
          cancellation_authorized_by_staff_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_phone?: string | null
          id?: string
          latest_invoice_id?: string | null
          notes?: string | null
          order_origin?: string
          owner_id?: string
          payment_method?: string | null
          payment_confirmed_at?: string | null
          payment_lock_reason?: string | null
          payment_locked_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          qr_gateway_reference?: string | null
          settled_at?: string | null
          settled_by_staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          table_id?: string | null
          table_number?: number | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          discount_amount?: number
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
      staff_invitations: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          restaurant_owner_id: string
          role: Database["public"]["Enums"]["staff_role"]
          status: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          restaurant_owner_id: string
          role?: Database["public"]["Enums"]["staff_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          restaurant_owner_id?: string
          role?: Database["public"]["Enums"]["staff_role"]
          status?: string
          updated_at?: string
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
          feature_white_label: boolean | null
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
          feature_white_label?: boolean | null
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
          feature_white_label?: boolean | null
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
      acknowledge_admin_notification: {
        Args: { _notification_id: string }
        Returns: string
      }
      can_manage_order_billing: {
        Args: { _owner_id: string }
        Returns: boolean
      }
      create_manual_counter_order: {
        Args: {
          _customer_phone: string
          _items: Json
          _notes: string
          _owner_id: string
          _table_id: string
        }
        Returns: {
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          table_number: number
          total_amount: number
        }[]
      }
      cancel_order_with_reason: {
        Args: { _order_id: string; _reason: string }
        Returns: {
          bill_status: string
          cancellation_reason: string
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_status: string
        }[]
      }
      confirm_order_payment: {
        Args: {
          _billing_notes?: string | null
          _order_id: string
          _payment_method: string
          _payment_reference?: string | null
        }
        Returns: {
          bill_number: string
          bill_status: string
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_method: string
          payment_status: string
        }[]
      }
      assign_admin_support_ticket: {
        Args: {
          _assigned_agent_id?: string | null
          _status?: string | null
          _ticket_id: string
        }
        Returns: string
      }
      get_admin_invoices: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          client_name: string
          contact: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          last_sent_at: string | null
          notes: string | null
          owner_id: string
          payment_method: string | null
          pdf_url: string | null
          plan_name: string
          status: string
          tax: number
          total: number
        }[]
      }
      get_admin_billing_discrepancies: {
        Args: Record<PropertyKey, never>
        Returns: {
          client_name: string
          last_payment_at: string | null
          order_id: string
          order_origin: string
          order_status: Database["public"]["Enums"]["order_status"]
          owner_id: string
          paid_amount: number
          payment_status: string
          remaining_amount: number
          table_number: number | null
          total_amount: number
        }[]
      }
      get_admin_wastage_report: {
        Args: Record<PropertyKey, never>
        Returns: {
          authorised_by: string
          cancellation_reason: string
          client_name: string
          created_at: string
          credit_note_number: string | null
          estimated_loss_amount: number
          id: string
          invoice_number: string | null
          order_id: string
          owner_id: string
          table_number: number | null
        }[]
      }
      get_admin_activity_logs: {
        Args: { _owner_id?: string | null }
        Returns: {
          action: string
          client_name: string
          id: string
          ip_device: string
          module: string
          owner_id: string | null
          result: string
          target: string
          timestamp: string
          user: string
        }[]
      }
      get_admin_notifications: {
        Args: Record<PropertyKey, never>
        Returns: {
          client_name: string
          created_at: string
          id: string
          message: string | null
          owner_id: string | null
          severity: string
          status: string
          target_module: string | null
          title: string
          type: string
        }[]
      }
      get_admin_support_tickets: {
        Args: { _owner_id?: string | null }
        Returns: {
          assigned_agent: string
          category: string
          client_name: string
          contact: string
          created_at: string
          escalation_level: number
          owner_id: string | null
          priority: string
          sla_due_at: string | null
          status: string
          subject: string
          ticket_id: string
          ticket_number: string
          updated_at: string
        }[]
      }
      log_admin_activity: {
        Args: {
          _action: string
          _ip_device?: string | null
          _metadata?: Json
          _module: string
          _result?: string
          _target: string
          _target_owner_id?: string | null
        }
        Returns: string
      }
      mark_admin_invoice_paid: {
        Args: { _invoice_id: string; _payment_method?: string | null }
        Returns: string
      }
      refund_admin_invoice: {
        Args: { _invoice_id: string; _notes?: string | null }
        Returns: string
      }
      resend_admin_invoice: {
        Args: { _invoice_id: string }
        Returns: string
      }
      resolve_admin_notification: {
        Args: { _notification_id: string }
        Returns: string
      }
      resolve_admin_support_ticket: {
        Args: { _status?: string | null; _ticket_id: string }
        Returns: string
      }
      assign_admin_client_plan: {
        Args: {
          _expires_at: string | null
          _notes?: string | null
          _owner_id: string
          _plan_id: string
          _status: string
        }
        Returns: string
      }
      get_admin_client_detail: {
        Args: { _owner_id: string }
        Returns: {
          address: string | null
          billing_period: string | null
          client_name: string
          contact: string
          feature_analytics: boolean
          feature_chain: boolean
          feature_coupons: boolean
          feature_customer_reviews: boolean
          feature_expenses: boolean
          feature_inventory: boolean
          feature_kitchen_display: boolean
          feature_online_orders: boolean
          feature_white_label: boolean
          monthly_revenue: number
          outlets_count: number
          owner_id: string
          owner_name: string
          phone: string | null
          plan_name: string
          restaurant_logo_url: string | null
          rooms_count: number
          staff_count: number
          subscription_expiry: string | null
          subscription_status: string
          tables_count: number
          total_orders: number
        }[]
      }
      get_admin_client_outlets: {
        Args: { _owner_id: string }
        Returns: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          manager_name: string | null
          name: string
          phone: string | null
          updated_at: string
        }[]
      }
      get_admin_client_users: {
        Args: { _owner_id: string }
        Returns: {
          email: string | null
          is_active: boolean
          name: string
          phone: string | null
          role: string
          source: string
          user_id: string
        }[]
      }
      get_admin_clients: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string | null
          client_name: string
          client_status: string
          contact: string
          last_active: string | null
          monthly_revenue: number
          onboarding_status: string
          outlets_count: number
          owner_id: string
          owner_name: string
          phone: string | null
          plan_name: string
          subscription_expiry: string | null
          subscription_status: string
        }[]
      }
      get_admin_onboarding_clients: {
        Args: Record<PropertyKey, never>
        Returns: {
          branding_uploaded: boolean
          business_info_complete: boolean
          client_name: string
          go_live_confirmed: boolean
          menu_imported: boolean
          onboarding_status: string
          owner_id: string
          owner_name: string
          payment_setup_complete: boolean
          printer_connected: boolean
          progress: number
          qr_generated: boolean
          staff_accounts_created: boolean
          tax_configured: boolean
          test_order_completed: boolean
        }[]
      }
      get_admin_outlets_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          city: string
          client_name: string
          contact: string
          manager_name: string
          orders_today: number | null
          outlet_id: string
          outlet_name: string
          outlet_status: string
          owner_id: string
          owner_name: string
          phone: string | null
          qr_status: string
          revenue_today: number | null
          sync_status: string
          updated_at: string
        }[]
      }
      get_admin_platform_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          name: string
          phone: string | null
          role: string
          scope: string
          source: string
          status: string
          user_id: string
        }[]
      }
      get_admin_subscription_catalog: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_clients: number
          billing_period: string | null
          feature_analytics: boolean | null
          feature_chain: boolean | null
          feature_coupons: boolean | null
          feature_customer_reviews: boolean | null
          feature_expenses: boolean | null
          feature_inventory: boolean | null
          feature_kitchen_display: boolean | null
          feature_online_orders: boolean | null
          feature_white_label: boolean | null
          id: string
          is_active: boolean | null
          max_menu_items: number | null
          max_orders_per_month: number | null
          max_rooms: number | null
          max_staff: number | null
          max_tables: number | null
          name: string
          price: number
          total_clients: number
        }[]
      }
      get_admin_subscription_queue: {
        Args: Record<PropertyKey, never>
        Returns: {
          billing_period: string | null
          client_name: string
          contact: string
          created_at: string
          expires_at: string | null
          notes: string | null
          outlets_count: number
          owner_id: string
          owner_name: string
          phone: string | null
          plan_id: string
          plan_name: string
          subscription_id: string
          subscription_status: string
        }[]
      }
      claim_staff_invitation: { Args: { _invitation_id: string }; Returns: string }
      check_white_label: { Args: { _owner_id: string }; Returns: boolean }
      get_public_restaurant_profile: {
        Args: { _owner_id: string }
        Returns: {
          address: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          gps_range_meters: number | null
          gst_number: string | null
          gst_percentage: number | null
          phone: string | null
          restaurant_logo_url: string | null
          restaurant_name: string | null
          upi_id: string | null
        }[]
      }
      get_order_payment_summary: {
        Args: { _order_id: string }
        Returns: {
          is_closed: boolean
          order_total: number
          paid_amount: number
          payment_methods: string[]
          remaining_amount: number
        }[]
      }
      get_public_order_tracking: {
        Args: { _order_id: string }
        Returns: {
          payment_method: string | null
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      get_public_order_receipt: {
        Args: { _order_id: string }
        Returns: {
          created_at: string
          item_name: string
          item_price: number
          quantity: number
          total_amount: number
        }[]
      }
      place_public_order: {
        Args: {
          _coupon_id?: string | null
          _customer_phone?: string | null
          _items: Json
          _notes?: string | null
          _owner_id: string
          _table_number: number
        }
        Returns: string
      }
      get_public_menu_customization: {
        Args: { _owner_id: string }
        Returns: {
          accent_color: string | null
          background_color: string | null
          font_body: string | null
          font_heading: string | null
          primary_color: string | null
          secondary_color: string | null
          text_color: string | null
        }[]
      }
      validate_public_coupon: {
        Args: {
          _code: string
            _customer_phone: string
            _owner_id: string
            _subtotal: number
          }
          Returns: {
            code: string | null
            coupon_id: string | null
            discount_type: string | null
            discount_value: number | null
            error_message: string | null
          }[]
        }
      get_staff_role: {
          Args: { _owner_id: string; _user_id: string }
          Returns: Database["public"]["Enums"]["staff_role"]
        }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_restaurant_staff: {
        Args: { _owner_id: string; _user_id: string }
        Returns: boolean
      }
      revert_order_payment: {
        Args: { _order_id: string; _reason?: string | null }
        Returns: {
          bill_status: string
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_status: string
        }[]
      }
      record_manual_order_payment: {
        Args: {
          _amount: number
          _billing_note?: string | null
          _order_id: string
          _payment_method: string
          _payment_reference?: string | null
        }
        Returns: {
          bill_number: string | null
          bill_status: string
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          paid_amount: number
          payment_status: string
          remaining_amount: number
        }[]
      }
      record_qr_gateway_payment: {
        Args: {
          _amount: number
          _gateway_payload?: Json
          _gateway_reference: string
          _order_id: string
          _payment_method: string
        }
        Returns: {
          bill_number: string | null
          bill_status: string
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          paid_amount: number
          payment_status: string
          remaining_amount: number
        }[]
      }
      void_order_billing: {
        Args: { _order_id: string; _reason?: string | null }
        Returns: {
          bill_status: string
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_status: string
        }[]
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
