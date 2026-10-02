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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_tasks: {
        Row: {
          conversation_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          generation_id: string | null
          id: string
          input: Json
          kind: string
          output: Json
          project_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          generation_id?: string | null
          id?: string
          input?: Json
          kind: string
          output?: Json
          project_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          generation_id?: string | null
          id?: string
          input?: Json
          kind?: string
          output?: Json
          project_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          project_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          conversation_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          message_id: string | null
          metadata: Json
          model: string | null
          project_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json
          model?: string | null
          project_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json
          model?: string | null
          project_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          project_id: string
          role: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          project_id: string
          role: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          drive_file_id: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          project_id: string
          size_bytes: number | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          project_id: string
          size_bytes?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          size_bytes?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_integrations: {
        Row: {
          config: Json
          created_at: string
          external_ref: string | null
          id: string
          integration_id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          external_ref?: string | null
          id?: string
          integration_id: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          external_ref?: string | null
          id?: string
          integration_id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_integrations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          created_at: string
          id: string
          label: string | null
          metadata: Json
          project_id: string
          snapshot: Json
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          metadata?: Json
          project_id: string
          snapshot?: Json
          updated_at?: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          metadata?: Json
          project_id?: string
          snapshot?: Json
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          current_version: number
          description: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_logs: {
        Row: {
          created_at: string
          id: number
          line: string
          project_id: string
          session_id: string
          stream: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          line: string
          project_id: string
          session_id: string
          stream?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          line?: string
          project_id?: string
          session_id?: string
          stream?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runtime_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "runtime_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          exit_code: number | null
          id: string
          job_id: string | null
          metadata: Json
          project_id: string
          run_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          exit_code?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json
          project_id: string
          run_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          exit_code?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json
          project_id?: string
          run_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runtime_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets: {
        Row: {
          ciphertext: string
          created_at: string
          id: string
          iv: string
          key_version: number
          name: string
          project_id: string | null
          project_integration_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ciphertext: string
          created_at?: string
          id?: string
          iv: string
          key_version?: number
          name: string
          project_id?: string | null
          project_integration_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ciphertext?: string
          created_at?: string
          id?: string
          iv?: string
          key_version?: number
          name?: string
          project_id?: string | null
          project_integration_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secrets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secrets_project_integration_id_fkey"
            columns: ["project_integration_id"]
            isOneToOne: false
            referencedRelation: "project_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_project: { Args: { _project_id: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
