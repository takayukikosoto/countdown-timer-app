export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          company: string | null
          created_at: string | null
          display_name: string
          id: string
          password_hash: string
          role: string
          staff_level: string | null
          staff_position: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          password_hash: string
          role?: string
          staff_level?: string | null
          staff_position?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          password_hash?: string
          role?: string
          staff_level?: string | null
          staff_position?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      event_status: {
        Row: {
          created_at: string | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      secrets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      staff_login_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          staff_id: string
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          staff_id: string
          token: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          staff_id?: string
          token?: string
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_login_tokens_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_login_tokens_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_status: {
        Row: {
          created_at: string | null
          custom_status: string | null
          id: string
          staff_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_status?: string | null
          id?: string
          staff_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_status?: string | null
          id?: string
          staff_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_status_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_status_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_status_history: {
        Row: {
          custom_status: string | null
          id: string
          staff_id: string
          status: string
          timestamp: string | null
        }
        Insert: {
          custom_status?: string | null
          id?: string
          staff_id: string
          status: string
          timestamp?: string | null
        }
        Update: {
          custom_status?: string | null
          id?: string
          staff_id?: string
          status?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_status_history_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_status_history_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timer_messages: {
        Row: {
          color: string | null
          created_at: string | null
          display_duration_ms: number | null
          flash: boolean | null
          id: string
          text: string
          timer_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_duration_ms?: number | null
          flash?: boolean | null
          id?: string
          text: string
          timer_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_duration_ms?: number | null
          flash?: boolean | null
          id?: string
          text?: string
          timer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timer_messages_timer_id_fkey"
            columns: ["timer_id"]
            isOneToOne: false
            referencedRelation: "timers"
            referencedColumns: ["id"]
          },
        ]
      }
      timers: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number
          id: string
          is_current: boolean | null
          name: string
          overtime_color: string | null
          paused_at: string | null
          show_seconds: boolean | null
          started_at: string | null
          state: string
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms: number
          id?: string
          is_current?: boolean | null
          name: string
          overtime_color?: string | null
          paused_at?: string | null
          show_seconds?: boolean | null
          started_at?: string | null
          state?: string
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number
          id?: string
          is_current?: boolean | null
          name?: string
          overtime_color?: string | null
          paused_at?: string | null
          show_seconds?: boolean | null
          started_at?: string | null
          state?: string
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      visitors: {
        Row: {
          count: number
          id: string
          updated_at: string | null
        }
        Insert: {
          count?: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          count?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      users: {
        Row: {
          company: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          level: string | null
          password: string | null
          position: string | null
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          level?: string | null
          password?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          level?: string | null
          password?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_user_password: {
        Args: { p_username: string; p_password: string }
        Returns: {
          id: string
          username: string
          role: string
          token: string
        }[]
      }
      create_staff_user: {
        Args: { p_username: string; p_password: string; p_name: string }
        Returns: Json
      }
      create_timer: {
        Args: {
          p_name: string
          p_title?: string
          p_type?: string
          p_duration_ms?: number
          p_color?: string
        }
        Returns: string
      }
      delete_staff_user: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      get_all_timers: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          title: string
          type: string
          duration_ms: number
          state: string
          started_at: string
          paused_at: string
          completed_at: string
          show_seconds: boolean
          color: string
          overtime_color: string
          is_current: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_company_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          company: string
          count: number
        }[]
      }
      get_current_status: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_timer: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          title: string
          type: string
          duration_ms: number
          state: string
          started_at: string
          paused_at: string
          completed_at: string
          show_seconds: boolean
          color: string
          overtime_color: string
          is_current: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_role_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          role: string
          count: number
        }[]
      }
      get_staff_status: {
        Args: { p_staff_id: string }
        Returns: {
          id: string
          staff_id: string
          status: string
          custom_status: string
          updated_at: string
        }[]
      }
      get_timer_messages: {
        Args: { p_timer_id: string }
        Returns: {
          id: string
          timer_id: string
          text: string
          color: string
          flash: boolean
          display_duration_ms: number
          created_at: string
        }[]
      }
      increment_visitor_count: {
        Args: { increment_by?: number }
        Returns: number
      }
      list_all_staff_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          staff_id: string
          username: string
          display_name: string
          status: string
          custom_status: string
          updated_at: string
        }[]
      }
      list_staff_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          username: string
          display_name: string
          created_at: string
        }[]
      }
      pause_timer: {
        Args: { p_timer_id: string }
        Returns: Json
      }
      reset_timer: {
        Args: { p_timer_id: string }
        Returns: Json
      }
      reset_visitor_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      send_timer_message: {
        Args: {
          p_timer_id: string
          p_text: string
          p_color?: string
          p_flash?: boolean
          p_display_duration_ms?: number
        }
        Returns: string
      }
      start_timer: {
        Args: { p_timer_id: string }
        Returns: Json
      }
      update_event_status: {
        Args: { new_status: string }
        Returns: string
      }
      update_staff_status: {
        Args: { p_staff_id: string; p_status: string; p_custom_status?: string }
        Returns: Json
      }
      verify_password: {
        Args: { password: string; hash: string }
        Returns: boolean
      }
      verify_password_direct: {
        Args: { p_password: string; p_stored_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

