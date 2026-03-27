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
      certificate_verifications: {
        Row: {
          certificate_id: string
          id: string
          verified_at: string
          verifier_ip: string | null
          verifier_user_agent: string | null
        }
        Insert: {
          certificate_id: string
          id?: string
          verified_at?: string
          verifier_ip?: string | null
          verifier_user_agent?: string | null
        }
        Update: {
          certificate_id?: string
          id?: string
          verified_at?: string
          verifier_ip?: string | null
          verifier_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_verifications_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          cefr_level: Database["public"]["Enums"]["cefr_level"]
          expires_at: string | null
          functional_label: string
          id: string
          issued_at: string
          pdf_storage_path: string | null
          revoked: boolean | null
          session_id: string
          user_id: string
          verification_code: string
        }
        Insert: {
          cefr_level: Database["public"]["Enums"]["cefr_level"]
          expires_at?: string | null
          functional_label: string
          id?: string
          issued_at?: string
          pdf_storage_path?: string | null
          revoked?: boolean | null
          session_id: string
          user_id: string
          verification_code: string
        }
        Update: {
          cefr_level?: Database["public"]["Enums"]["cefr_level"]
          expires_at?: string | null
          functional_label?: string
          id?: string
          issued_at?: string
          pdf_storage_path?: string | null
          revoked?: boolean | null
          session_id?: string
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          guardian_email: string | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted: boolean
          guardian_email?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          guardian_email?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string
          details: Json | null
          flag_type: Database["public"]["Enums"]["fraud_flag_type"]
          id: string
          reviewed: boolean | null
          reviewed_by: string | null
          session_id: string
          severity: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          flag_type: Database["public"]["Enums"]["fraud_flag_type"]
          id?: string
          reviewed?: boolean | null
          reviewed_by?: string | null
          session_id: string
          severity?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          flag_type?: Database["public"]["Enums"]["fraud_flag_type"]
          id?: string
          reviewed?: boolean | null
          reviewed_by?: string | null
          session_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_audio_assets: {
        Row: {
          audio_url: string
          created_at: string
          duration_ms: number | null
          id: string
          item_id: string
          version: number
          voice: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          item_id: string
          version?: number
          voice?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          item_id?: string
          version?: number
          voice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_audio_assets_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      item_bank: {
        Row: {
          active: boolean
          bias_flag: boolean | null
          cefr_target: Database["public"]["Enums"]["cefr_level"]
          content_safety_flag: boolean | null
          correct_answer: string
          created_at: string
          difficulty_score: number | null
          difficulty_tier: Database["public"]["Enums"]["difficulty_tier"]
          distractor_quality: string | null
          explanation: string | null
          family_id: string | null
          grammar_target: string | null
          id: string
          options: Json | null
          question_text: string
          section_type: Database["public"]["Enums"]["test_section_type"]
          topic: string
          updated_at: string
          usage_count: number
          vocabulary_band: string | null
        }
        Insert: {
          active?: boolean
          bias_flag?: boolean | null
          cefr_target: Database["public"]["Enums"]["cefr_level"]
          content_safety_flag?: boolean | null
          correct_answer: string
          created_at?: string
          difficulty_score?: number | null
          difficulty_tier: Database["public"]["Enums"]["difficulty_tier"]
          distractor_quality?: string | null
          explanation?: string | null
          family_id?: string | null
          grammar_target?: string | null
          id?: string
          options?: Json | null
          question_text: string
          section_type: Database["public"]["Enums"]["test_section_type"]
          topic: string
          updated_at?: string
          usage_count?: number
          vocabulary_band?: string | null
        }
        Update: {
          active?: boolean
          bias_flag?: boolean | null
          cefr_target?: Database["public"]["Enums"]["cefr_level"]
          content_safety_flag?: boolean | null
          correct_answer?: string
          created_at?: string
          difficulty_score?: number | null
          difficulty_tier?: Database["public"]["Enums"]["difficulty_tier"]
          distractor_quality?: string | null
          explanation?: string | null
          family_id?: string | null
          grammar_target?: string | null
          id?: string
          options?: Json | null
          question_text?: string
          section_type?: Database["public"]["Enums"]["test_section_type"]
          topic?: string
          updated_at?: string
          usage_count?: number
          vocabulary_band?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          native_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          native_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          native_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          product_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
          voucher_code_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          product_id: string
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
          voucher_code_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          product_id?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
          voucher_code_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "test_products"
            referencedColumns: ["id"]
          },
        ]
      }
      responses_mcq: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          item_id: string
          response_time_ms: number | null
          section_id: string
          selected_answer: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          item_id: string
          response_time_ms?: number | null
          section_id: string
          selected_answer: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          item_id?: string
          response_time_ms?: number | null
          section_id?: string
          selected_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_mcq_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_mcq_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      responses_speaking: {
        Row: {
          audio_storage_path: string
          created_at: string
          duration_ms: number | null
          id: string
          prompt_id: string
          section_id: string
        }
        Insert: {
          audio_storage_path: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          prompt_id: string
          section_id: string
        }
        Update: {
          audio_storage_path?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          prompt_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_speaking_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "speaking_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_speaking_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      responses_writing: {
        Row: {
          copy_paste_events: number | null
          created_at: string
          id: string
          prompt_id: string
          response_text: string
          section_id: string
          time_spent_ms: number | null
          word_count: number | null
        }
        Insert: {
          copy_paste_events?: number | null
          created_at?: string
          id?: string
          prompt_id: string
          response_text: string
          section_id: string
          time_spent_ms?: number | null
          word_count?: number | null
        }
        Update: {
          copy_paste_events?: number | null
          created_at?: string
          id?: string
          prompt_id?: string
          response_text?: string
          section_id?: string
          time_spent_ms?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_writing_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "writing_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_writing_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      score_audits: {
        Row: {
          created_at: string
          id: string
          original_cefr: Database["public"]["Enums"]["cefr_level"] | null
          rationale: string | null
          reviewer_type: string
          revised_cefr: Database["public"]["Enums"]["cefr_level"] | null
          section_score_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          rationale?: string | null
          reviewer_type?: string
          revised_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          section_score_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          rationale?: string | null
          reviewer_type?: string
          revised_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          section_score_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_audits_section_score_id_fkey"
            columns: ["section_score_id"]
            isOneToOne: false
            referencedRelation: "scores_section"
            referencedColumns: ["id"]
          },
        ]
      }
      scores_overall: {
        Row: {
          confidence_band: string | null
          created_at: string
          functional_label: string
          id: string
          listening_cefr: Database["public"]["Enums"]["cefr_level"] | null
          listening_score: number | null
          next_steps: Json | null
          overall_cefr: Database["public"]["Enums"]["cefr_level"]
          overall_score: number | null
          reading_cefr: Database["public"]["Enums"]["cefr_level"] | null
          reading_score: number | null
          retake_recommended: boolean | null
          session_id: string
          speaking_cefr: Database["public"]["Enums"]["cefr_level"] | null
          speaking_score: number | null
          strengths: Json | null
          writing_cefr: Database["public"]["Enums"]["cefr_level"] | null
          writing_score: number | null
        }
        Insert: {
          confidence_band?: string | null
          created_at?: string
          functional_label: string
          id?: string
          listening_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          listening_score?: number | null
          next_steps?: Json | null
          overall_cefr: Database["public"]["Enums"]["cefr_level"]
          overall_score?: number | null
          reading_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          reading_score?: number | null
          retake_recommended?: boolean | null
          session_id: string
          speaking_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          speaking_score?: number | null
          strengths?: Json | null
          writing_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          writing_score?: number | null
        }
        Update: {
          confidence_band?: string | null
          created_at?: string
          functional_label?: string
          id?: string
          listening_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          listening_score?: number | null
          next_steps?: Json | null
          overall_cefr?: Database["public"]["Enums"]["cefr_level"]
          overall_score?: number | null
          reading_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          reading_score?: number | null
          retake_recommended?: boolean | null
          session_id?: string
          speaking_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          speaking_score?: number | null
          strengths?: Json | null
          writing_cefr?: Database["public"]["Enums"]["cefr_level"] | null
          writing_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_overall_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scores_section: {
        Row: {
          cefr_level: Database["public"]["Enums"]["cefr_level"] | null
          confidence: number | null
          created_at: string
          error_tags: Json | null
          evidence: Json | null
          human_review_recommended: boolean | null
          id: string
          model_used: string | null
          pass_type: Database["public"]["Enums"]["score_pass_type"]
          raw_score: number | null
          rubric_scores: Json | null
          section_id: string
          weighted_score: number | null
        }
        Insert: {
          cefr_level?: Database["public"]["Enums"]["cefr_level"] | null
          confidence?: number | null
          created_at?: string
          error_tags?: Json | null
          evidence?: Json | null
          human_review_recommended?: boolean | null
          id?: string
          model_used?: string | null
          pass_type?: Database["public"]["Enums"]["score_pass_type"]
          raw_score?: number | null
          rubric_scores?: Json | null
          section_id: string
          weighted_score?: number | null
        }
        Update: {
          cefr_level?: Database["public"]["Enums"]["cefr_level"] | null
          confidence?: number | null
          created_at?: string
          error_tags?: Json | null
          evidence?: Json | null
          human_review_recommended?: boolean | null
          id?: string
          model_used?: string | null
          pass_type?: Database["public"]["Enums"]["score_pass_type"]
          raw_score?: number | null
          rubric_scores?: Json | null
          section_id?: string
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_section_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_prompts: {
        Row: {
          active: boolean
          cefr_target: Database["public"]["Enums"]["cefr_level"]
          created_at: string
          id: string
          prompt_text: string
          prompt_type: string
          reference_audio_url: string | null
          rubric: Json | null
          usage_count: number
        }
        Insert: {
          active?: boolean
          cefr_target: Database["public"]["Enums"]["cefr_level"]
          created_at?: string
          id?: string
          prompt_text: string
          prompt_type: string
          reference_audio_url?: string | null
          rubric?: Json | null
          usage_count?: number
        }
        Update: {
          active?: boolean
          cefr_target?: Database["public"]["Enums"]["cefr_level"]
          created_at?: string
          id?: string
          prompt_text?: string
          prompt_type?: string
          reference_audio_url?: string | null
          rubric?: Json | null
          usage_count?: number
        }
        Relationships: []
      }
      test_products: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          price_cents: number
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          price_cents?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      test_sections: {
        Row: {
          completed_at: string | null
          created_at: string
          difficulty_tier: Database["public"]["Enums"]["difficulty_tier"]
          id: string
          metadata: Json | null
          section_type: Database["public"]["Enums"]["test_section_type"]
          session_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["section_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          difficulty_tier?: Database["public"]["Enums"]["difficulty_tier"]
          id?: string
          metadata?: Json | null
          section_type: Database["public"]["Enums"]["test_section_type"]
          session_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["section_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          difficulty_tier?: Database["public"]["Enums"]["difficulty_tier"]
          id?: string
          metadata?: Json | null
          section_type?: Database["public"]["Enums"]["test_section_type"]
          session_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["section_status"]
        }
        Relationships: [
          {
            foreignKeyName: "test_sections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          purchase_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          purchase_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          purchase_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
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
      voucher_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          max_uses: number | null
          organization_id: string | null
          product_id: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          organization_id?: string | null
          product_id: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          organization_id?: string | null
          product_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "voucher_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "test_products"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_prompts: {
        Row: {
          active: boolean
          cefr_target: Database["public"]["Enums"]["cefr_level"]
          created_at: string
          id: string
          prompt_text: string
          prompt_type: string
          rubric: Json | null
          usage_count: number
        }
        Insert: {
          active?: boolean
          cefr_target: Database["public"]["Enums"]["cefr_level"]
          created_at?: string
          id?: string
          prompt_text: string
          prompt_type: string
          rubric?: Json | null
          usage_count?: number
        }
        Update: {
          active?: boolean
          cefr_target?: Database["public"]["Enums"]["cefr_level"]
          created_at?: string
          id?: string
          prompt_text?: string
          prompt_type?: string
          rubric?: Json | null
          usage_count?: number
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
      app_role: "admin" | "moderator" | "user"
      attempt_status: "in_progress" | "completed" | "abandoned" | "flagged"
      cefr_level:
        | "Pre-A1"
        | "A1"
        | "A1+"
        | "A2"
        | "A2+"
        | "B1"
        | "B1+"
        | "B2"
        | "B2+"
        | "C1"
        | "C1+"
        | "C2"
      difficulty_tier: "foundation" | "functional" | "professional"
      fraud_flag_type:
        | "copy_paste"
        | "timing_anomaly"
        | "voice_mismatch"
        | "ai_writing_suspicion"
        | "ip_repeat"
        | "device_repeat"
        | "other"
      purchase_status: "pending" | "paid" | "refunded" | "expired"
      score_pass_type: "primary" | "audit" | "adjudication"
      section_status: "not_started" | "in_progress" | "completed"
      test_section_type:
        | "reading"
        | "listening"
        | "writing"
        | "speaking"
        | "conversation"
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
      app_role: ["admin", "moderator", "user"],
      attempt_status: ["in_progress", "completed", "abandoned", "flagged"],
      cefr_level: [
        "Pre-A1",
        "A1",
        "A1+",
        "A2",
        "A2+",
        "B1",
        "B1+",
        "B2",
        "B2+",
        "C1",
        "C1+",
        "C2",
      ],
      difficulty_tier: ["foundation", "functional", "professional"],
      fraud_flag_type: [
        "copy_paste",
        "timing_anomaly",
        "voice_mismatch",
        "ai_writing_suspicion",
        "ip_repeat",
        "device_repeat",
        "other",
      ],
      purchase_status: ["pending", "paid", "refunded", "expired"],
      score_pass_type: ["primary", "audit", "adjudication"],
      section_status: ["not_started", "in_progress", "completed"],
      test_section_type: [
        "reading",
        "listening",
        "writing",
        "speaking",
        "conversation",
      ],
    },
  },
} as const
