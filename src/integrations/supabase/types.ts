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
      disciplinary_actions: {
        Row: {
          created_at: string
          data: string
          descrizione: string
          employee_id: string
          id: string
          penalita: number
        }
        Insert: {
          created_at?: string
          data?: string
          descrizione: string
          employee_id: string
          id?: string
          penalita?: number
        }
        Update: {
          created_at?: string
          data?: string
          descrizione?: string
          employee_id?: string
          id?: string
          penalita?: number
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          attivo: boolean
          codice_accesso: string
          cognome: string
          created_at: string
          data_assunzione: string | null
          device_id: string | null
          escluso_premi: boolean
          foto_url: string | null
          id: string
          mansione: string
          motivo_esclusione: string | null
          negozio: string
          nome: string
          primo_accesso_at: string | null
          session_token: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          codice_accesso: string
          cognome: string
          created_at?: string
          data_assunzione?: string | null
          device_id?: string | null
          escluso_premi?: boolean
          foto_url?: string | null
          id?: string
          mansione: string
          motivo_esclusione?: string | null
          negozio: string
          nome: string
          primo_accesso_at?: string | null
          session_token?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          codice_accesso?: string
          cognome?: string
          created_at?: string
          data_assunzione?: string | null
          device_id?: string | null
          escluso_premi?: boolean
          foto_url?: string | null
          id?: string
          mansione?: string
          motivo_esclusione?: string | null
          negozio?: string
          nome?: string
          primo_accesso_at?: string | null
          session_token?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_winners: {
        Row: {
          categoria: string
          created_at: string
          employee_id: string
          id: string
          period_id: string
          scope_value: string | null
          team_score: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          employee_id: string
          id?: string
          period_id: string
          scope_value?: string | null
          team_score: number
        }
        Update: {
          categoria?: string
          created_at?: string
          employee_id?: string
          id?: string
          period_id?: string
          scope_value?: string | null
          team_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_winners_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_winners_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "voting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vote_audit: {
        Row: {
          created_at: string
          event: string
          id: number
          ip_address: string | null
          meta: Json | null
          period_id: string | null
          user_agent: string | null
          voted_id: string | null
          voter_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          ip_address?: string | null
          meta?: Json | null
          period_id?: string | null
          user_agent?: string | null
          voted_id?: string | null
          voter_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          ip_address?: string | null
          meta?: Json | null
          period_id?: string | null
          user_agent?: string | null
          voted_id?: string | null
          voter_id?: string | null
        }
        Relationships: []
      }
      vote_comments: {
        Row: {
          created_at: string
          id: string
          period_id: string
          punto_forza: string | null
          suggerimento: string | null
          voted_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_id: string
          punto_forza?: string | null
          suggerimento?: string | null
          voted_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_id?: string
          punto_forza?: string | null
          suggerimento?: string | null
          voted_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_comments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "voting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_comments_voted_id_fkey"
            columns: ["voted_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_comments_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_skips: {
        Row: {
          created_at: string
          id: string
          period_id: string
          voted_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_id: string
          voted_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_id?: string
          voted_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_skips_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "voting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_skips_voted_id_fkey"
            columns: ["voted_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_skips_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          criterio: Database["public"]["Enums"]["vote_criterion"]
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          period_id: string
          punteggio: number
          user_agent: string | null
          voted_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          criterio: Database["public"]["Enums"]["vote_criterion"]
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          period_id: string
          punteggio: number
          user_agent?: string | null
          voted_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          criterio?: Database["public"]["Enums"]["vote_criterion"]
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          period_id?: string
          punteggio?: number
          user_agent?: string | null
          voted_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "voting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voted_id_fkey"
            columns: ["voted_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_periods: {
        Row: {
          anno: number
          created_at: string
          id: string
          mese: number
          status: Database["public"]["Enums"]["period_status"]
        }
        Insert: {
          anno: number
          created_at?: string
          id?: string
          mese: number
          status?: Database["public"]["Enums"]["period_status"]
        }
        Update: {
          anno?: number
          created_at?: string
          id?: string
          mese?: number
          status?: Database["public"]["Enums"]["period_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee"
      period_status: "open" | "closed"
      vote_criterion:
        | "collaborazione"
        | "professionalita"
        | "affidabilita"
        | "disponibilita"
        | "atteggiamento_positivo"
        | "comunicazione"
        | "problem_solving"
        | "spirito_aziendale"
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
      app_role: ["admin", "employee"],
      period_status: ["open", "closed"],
      vote_criterion: [
        "collaborazione",
        "professionalita",
        "affidabilita",
        "disponibilita",
        "atteggiamento_positivo",
        "comunicazione",
        "problem_solving",
        "spirito_aziendale",
      ],
    },
  },
} as const
