// Generated from the Supabase schema (backend/supabase/migrations), then trimmed:
// the Tables<>/TablesInsert<> helper generics are dropped, the computed-field functions
// (search_text, last_outcome) are omitted from Functions because they are used as columns,
// and delete_account is listed even though its migration is applied by hand.
// Regenerate after a schema change:
//   npx supabase gen types typescript --project-id eefcinzxcnrmzlnlfuen > services/database.types.ts

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
      advocates: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          enrolment_no: string | null
          full_name: string
          id: string
          notification_prefs: Json
          onboarded_at: string | null
          practice_areas: string[]
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          enrolment_no?: string | null
          full_name?: string
          id: string
          notification_prefs?: Json
          onboarded_at?: string | null
          practice_areas?: string[]
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          enrolment_no?: string | null
          full_name?: string
          id?: string
          notification_prefs?: Json
          onboarded_at?: string | null
          practice_areas?: string[]
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_clients: {
        Row: {
          advocate_id: string
          case_id: string
          client_id: string
          created_at: string
        }
        Insert: {
          advocate_id?: string
          case_id: string
          client_id: string
          created_at?: string
        }
        Update: {
          advocate_id?: string
          case_id?: string
          client_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_clients_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_clients_case_fkey"
            columns: ["advocate_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["advocate_id", "id"]
          },
          {
            foreignKeyName: "case_clients_client_fkey"
            columns: ["advocate_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["advocate_id", "id"]
          },
        ]
      }
      case_types: {
        Row: {
          advocate_id: string
          created_at: string
          id: string
          is_hidden: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_types_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          advocate_id: string
          archived_at: string | null
          case_number: string | null
          case_type_id: string
          case_year: number | null
          cnr_number: string | null
          court_id: string
          court_room: string | null
          created_at: string
          disposal_date: string | null
          disposal_result: string | null
          filing_date: string | null
          id: string
          judge_name: string | null
          last_hearing_at: string | null
          next_hearing_at: string | null
          opposite_counsel: string | null
          petitioner_name: string | null
          respondent_name: string | null
          stage: string | null
          status: string
          title: string
          updated_at: string
          search_text: string | null
        }
        Insert: {
          advocate_id?: string
          archived_at?: string | null
          case_number?: string | null
          case_type_id: string
          case_year?: number | null
          cnr_number?: string | null
          court_id: string
          court_room?: string | null
          created_at?: string
          disposal_date?: string | null
          disposal_result?: string | null
          filing_date?: string | null
          id?: string
          judge_name?: string | null
          last_hearing_at?: string | null
          next_hearing_at?: string | null
          opposite_counsel?: string | null
          petitioner_name?: string | null
          respondent_name?: string | null
          stage?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          archived_at?: string | null
          case_number?: string | null
          case_type_id?: string
          case_year?: number | null
          cnr_number?: string | null
          court_id?: string
          court_room?: string | null
          created_at?: string
          disposal_date?: string | null
          disposal_result?: string | null
          filing_date?: string | null
          id?: string
          judge_name?: string | null
          last_hearing_at?: string | null
          next_hearing_at?: string | null
          opposite_counsel?: string | null
          petitioner_name?: string | null
          respondent_name?: string | null
          stage?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_case_type_fkey"
            columns: ["advocate_id", "case_type_id"]
            isOneToOne: false
            referencedRelation: "case_types"
            referencedColumns: ["advocate_id", "id"]
          },
          {
            foreignKeyName: "cases_court_fkey"
            columns: ["advocate_id", "court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["advocate_id", "id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          advocate_id: string
          alt_phone: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          advocate_id?: string
          alt_phone?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          advocate_id?: string
          alt_phone?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          advocate_id: string
          city: string
          created_at: string
          id: string
          is_hidden: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          city?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          city?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          advocate_id: string
          created_at: string
          expo_push_token: string
          id: string
          last_seen_at: string
          platform: string
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          created_at?: string
          expo_push_token: string
          id?: string
          last_seen_at?: string
          platform: string
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          created_at?: string
          expo_push_token?: string
          id?: string
          last_seen_at?: string
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          advocate_id: string
          case_id: string
          category: string
          created_at: string
          deleted_at: string | null
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          case_id: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          case_id?: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_case_fkey"
            columns: ["advocate_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["advocate_id", "id"]
          },
        ]
      }
      fees: {
        Row: {
          advocate_id: string
          agreed_amount: number
          case_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          agreed_amount?: number
          case_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          agreed_amount?: number
          case_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_case_fkey"
            columns: ["advocate_id", "case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["advocate_id", "id"]
          },
        ]
      }
      hearings: {
        Row: {
          advocate_id: string
          case_id: string
          completed_at: string | null
          court_room: string | null
          created_at: string
          hearing_date: string
          hearing_time: string | null
          id: string
          outcome: string | null
          outcome_notes: string | null
          purpose: string | null
          updated_at: string
          last_outcome: string | null
        }
        Insert: {
          advocate_id?: string
          case_id: string
          completed_at?: string | null
          court_room?: string | null
          created_at?: string
          hearing_date: string
          hearing_time?: string | null
          id?: string
          outcome?: string | null
          outcome_notes?: string | null
          purpose?: string | null
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          case_id?: string
          completed_at?: string | null
          court_room?: string | null
          created_at?: string
          hearing_date?: string
          hearing_time?: string | null
          id?: string
          outcome?: string | null
          outcome_notes?: string | null
          purpose?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hearings_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_case_fkey"
            columns: ["advocate_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["advocate_id", "id"]
          },
        ]
      }
      notes: {
        Row: {
          advocate_id: string
          body: string
          case_id: string
          created_at: string
          id: string
          is_pinned: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          body: string
          case_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_case_fkey"
            columns: ["advocate_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["advocate_id", "id"]
          },
        ]
      }
      notifications: {
        Row: {
          advocate_id: string
          body: string
          created_at: string
          deep_link: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          body?: string
          created_at?: string
          deep_link?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          body?: string
          created_at?: string
          deep_link?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          advocate_id: string
          amount: number
          case_id: string
          created_at: string
          id: string
          mode: string
          note: string | null
          paid_on: string
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          amount: number
          case_id: string
          created_at?: string
          id?: string
          mode: string
          note?: string | null
          paid_on: string
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          amount?: number
          case_id?: string
          created_at?: string
          id?: string
          mode?: string
          note?: string | null
          paid_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_case_fkey"
            columns: ["advocate_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["advocate_id", "id"]
          },
        ]
      }
      tasks: {
        Row: {
          advocate_id: string
          case_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          advocate_id?: string
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "advocates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_fkey"
            columns: ["advocate_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["advocate_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_case: {
        Args: {
          p_case: Json
          p_client_ids?: string[]
          p_next_hearing_date?: string
          p_next_hearing_purpose?: string
        }
        Returns: string
      }
      dashboard_stats: { Args: never; Returns: Json }
      delete_account: { Args: never; Returns: undefined }
      move_list_item: {
        Args: { p_dir: number; p_id: string; p_list: string }
        Returns: undefined
      }
      record_outcome: {
        Args: {
          p_hearing_id: string
          p_next_date?: string
          p_next_purpose?: string
          p_next_time?: string
          p_notes?: string
          p_outcome: string
        }
        Returns: Json
      }
      search_all: { Args: { p_q: string }; Returns: Json }
      today_ist: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
