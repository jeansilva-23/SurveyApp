export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          org_id: string
          push_token: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          org_id: string
          push_token?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          org_id?: string
          push_token?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          answer_value: Json
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_value: Json
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_value?: Json
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          order_index: number
          required: boolean
          survey_id: string
          title: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          required?: boolean
          survey_id: string
          title: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          required?: boolean
          survey_id?: string
          title?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          id: string
          respondent_email: string | null
          respondent_id: string | null
          respondent_name: string | null
          source: Database["public"]["Enums"]["response_source"]
          submitted_at: string | null
          survey_id: string
        }
        Insert: {
          id?: string
          respondent_email?: string | null
          respondent_id?: string | null
          respondent_name?: string | null
          source?: Database["public"]["Enums"]["response_source"]
          submitted_at?: string | null
          survey_id: string
        }
        Update: {
          id?: string
          respondent_email?: string | null
          respondent_id?: string | null
          respondent_name?: string | null
          source?: Database["public"]["Enums"]["response_source"]
          submitted_at?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          allow_public_access: boolean
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          is_anonymous: boolean
          org_id: string
          public_slug: string | null
          require_identification: boolean
          response_count: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["survey_status"]
          title: string
          type: Database["public"]["Enums"]["survey_type"]
          updated_at: string | null
        }
        Insert: {
          allow_public_access?: boolean
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean
          org_id: string
          public_slug?: string | null
          require_identification?: boolean
          response_count?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          title: string
          type?: Database["public"]["Enums"]["survey_type"]
          updated_at?: string | null
        }
        Update: {
          allow_public_access?: boolean
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean
          org_id?: string
          public_slug?: string | null
          require_identification?: boolean
          response_count?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          title?: string
          type?: Database["public"]["Enums"]["survey_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      question_type:
        | "multipla_escolha"
        | "unica_escolha"
        | "escala"
        | "texto_curto"
        | "texto_longo"
        | "nps"
      response_source: "app" | "web"
      survey_status: "rascunho" | "ativa" | "encerrada" | "arquivada"
      survey_type: "satisfacao" | "formulario" | "censo"
      user_role: "admin" | "editor" | "respondent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]

// Convenience aliases
export type Organization = Tables<"organizations">
export type Profile = Tables<"profiles">
export type Survey = Tables<"surveys">
export type SurveyQuestion = Tables<"survey_questions">
export type SurveyResponse = Tables<"survey_responses">
export type SurveyAnswer = Tables<"survey_answers">

export type UserRole = Enums<"user_role">
export type SurveyType = Enums<"survey_type">
export type SurveyStatus = Enums<"survey_status">
export type QuestionType = Enums<"question_type">
export type ResponseSource = Enums<"response_source">
