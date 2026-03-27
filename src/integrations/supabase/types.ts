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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      adaptive_question_logs: {
        Row: {
          confidence_at_question: number | null
          correct_answer: string | null
          created_at: string | null
          id: string
          is_correct: boolean
          level: string
          question_id: string
          response_time_ms: number | null
          section: string
          test_session_id: string
          user_answer: string | null
        }
        Insert: {
          confidence_at_question?: number | null
          correct_answer?: string | null
          created_at?: string | null
          id?: string
          is_correct: boolean
          level: string
          question_id: string
          response_time_ms?: number | null
          section: string
          test_session_id: string
          user_answer?: string | null
        }
        Update: {
          confidence_at_question?: number | null
          correct_answer?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean
          level?: string
          question_id?: string
          response_time_ms?: number | null
          section?: string
          test_session_id?: string
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_question_logs_test_session_id_fkey"
            columns: ["test_session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          content: string
          created_at: string
          id: string
          level: string
          prompt_type: string
          used_count: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          level: string
          prompt_type: string
          used_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          level?: string
          prompt_type?: string
          used_count?: number
        }
        Relationships: []
      }
      cert_cache_events: {
        Row: {
          cache_hit: boolean
          created_at: string | null
          id: string
          language: string
          level: string
          section: string
          test_session_id: string | null
          version: string
        }
        Insert: {
          cache_hit: boolean
          created_at?: string | null
          id?: string
          language: string
          level: string
          section: string
          test_session_id?: string | null
          version: string
        }
        Update: {
          cache_hit?: boolean
          created_at?: string | null
          id?: string
          language?: string
          level?: string
          section?: string
          test_session_id?: string | null
          version?: string
        }
        Relationships: []
      }
      cert_content_pool: {
        Row: {
          base_language: string | null
          created_at: string | null
          generation_cost_usd: number | null
          id: string
          language: string
          last_used_at: string | null
          level: string
          parent_id: string | null
          payload: Json
          section: string
          stem_hash: string | null
          usage_context: string | null
          used_count: number | null
          variation: number | null
          version: string
        }
        Insert: {
          base_language?: string | null
          created_at?: string | null
          generation_cost_usd?: number | null
          id?: string
          language?: string
          last_used_at?: string | null
          level: string
          parent_id?: string | null
          payload: Json
          section: string
          stem_hash?: string | null
          usage_context?: string | null
          used_count?: number | null
          variation?: number | null
          version: string
        }
        Update: {
          base_language?: string | null
          created_at?: string | null
          generation_cost_usd?: number | null
          id?: string
          language?: string
          last_used_at?: string | null
          level?: string
          parent_id?: string | null
          payload?: Json
          section?: string
          stem_hash?: string | null
          usage_context?: string | null
          used_count?: number | null
          variation?: number | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "cert_content_pool_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cert_content_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      cert_item_usage: {
        Row: {
          id: string
          pool_id: string
          section: string
          stem_hash: string | null
          test_session_id: string
          topic_hash: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          pool_id: string
          section: string
          stem_hash?: string | null
          test_session_id: string
          topic_hash?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          pool_id?: string
          section?: string
          stem_hash?: string | null
          test_session_id?: string
          topic_hash?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cert_item_usage_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "cert_content_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cert_item_usage_test_session_id_fkey"
            columns: ["test_session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cert_metrics: {
        Row: {
          created_at: string | null
          estimated_cost_usd: number | null
          id: string
          llm_tokens_in: number | null
          llm_tokens_out: number | null
          model_gen: string | null
          model_grade: string | null
          realtime_seconds: number | null
          stt_seconds: number | null
          test_session_id: string
          tts_characters: number | null
        }
        Insert: {
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          llm_tokens_in?: number | null
          llm_tokens_out?: number | null
          model_gen?: string | null
          model_grade?: string | null
          realtime_seconds?: number | null
          stt_seconds?: number | null
          test_session_id: string
          tts_characters?: number | null
        }
        Update: {
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          llm_tokens_in?: number | null
          llm_tokens_out?: number | null
          model_gen?: string | null
          model_grade?: string | null
          realtime_seconds?: number | null
          stt_seconds?: number | null
          test_session_id?: string
          tts_characters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cert_metrics_test_session_id_fkey"
            columns: ["test_session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_codes: {
        Row: {
          code: string
          expires_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          max_uses: number | null
          notes: string | null
          school_id: string
          student_id: string
          student_name: string | null
        }
        Insert: {
          code: string
          expires_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          school_id: string
          student_id: string
          student_name?: string | null
        }
        Update: {
          code?: string
          expires_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          school_id?: string
          student_id?: string
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      code_usage_log: {
        Row: {
          certification_code_id: string | null
          code: string
          created_at: string
          id: string
          school_id: string
          student_id: string
          test_session_id: string | null
          used_at: string
        }
        Insert: {
          certification_code_id?: string | null
          code: string
          created_at?: string
          id?: string
          school_id: string
          student_id: string
          test_session_id?: string | null
          used_at?: string
        }
        Update: {
          certification_code_id?: string | null
          code?: string
          created_at?: string
          id?: string
          school_id?: string
          student_id?: string
          test_session_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_usage_log_certification_code_id_fkey"
            columns: ["certification_code_id"]
            isOneToOne: false
            referencedRelation: "certification_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          request_type: string
          requester_email: string
          requester_relationship: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          request_type: string
          requester_email: string
          requester_relationship?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          request_type?: string
          requester_email?: string
          requester_relationship?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          status: string | null
          stripe_session_id: string | null
          test_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          status?: string | null
          stripe_session_id?: string | null
          test_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          status?: string | null
          stripe_session_id?: string | null
          test_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parental_consents: {
        Row: {
          consent_date: string
          consent_given: boolean
          consent_ip: unknown
          consent_version: string
          created_at: string | null
          id: string
          parent_email: string
          parent_name: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          consent_date: string
          consent_given: boolean
          consent_ip?: unknown
          consent_version: string
          created_at?: string | null
          id?: string
          parent_email: string
          parent_name?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          consent_date?: string
          consent_given?: boolean
          consent_ip?: unknown
          consent_version?: string
          created_at?: string | null
          id?: string
          parent_email?: string
          parent_name?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: []
      }
      prewarm_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          progress: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          progress?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          progress?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          created_at: string | null
          effective_date: string | null
          id: string
          input_cost_per_1k: number | null
          is_active: boolean | null
          model: string
          output_cost_per_1k: number | null
          unit_cost: number | null
          unit_type: string | null
        }
        Insert: {
          created_at?: string | null
          effective_date?: string | null
          id?: string
          input_cost_per_1k?: number | null
          is_active?: boolean | null
          model: string
          output_cost_per_1k?: number | null
          unit_cost?: number | null
          unit_type?: string | null
        }
        Update: {
          created_at?: string | null
          effective_date?: string | null
          id?: string
          input_cost_per_1k?: number | null
          is_active?: boolean | null
          model?: string
          output_cost_per_1k?: number | null
          unit_cost?: number | null
          unit_type?: string | null
        }
        Relationships: []
      }
      question_analytics: {
        Row: {
          average_response_time: number | null
          correct_responses: number | null
          created_at: string | null
          difficulty_rating: number | null
          id: string
          last_analyzed_at: string | null
          question_id: string | null
          total_responses: number | null
          user_feedback_score: number | null
        }
        Insert: {
          average_response_time?: number | null
          correct_responses?: number | null
          created_at?: string | null
          difficulty_rating?: number | null
          id?: string
          last_analyzed_at?: string | null
          question_id?: string | null
          total_responses?: number | null
          user_feedback_score?: number | null
        }
        Update: {
          average_response_time?: number | null
          correct_responses?: number | null
          created_at?: string | null
          difficulty_rating?: number | null
          id?: string
          last_analyzed_at?: string | null
          question_id?: string | null
          total_responses?: number | null
          user_feedback_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_analytics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_generation_batches: {
        Row: {
          completed_at: string | null
          created_at: string | null
          grammar_focus: string | null
          id: string
          level: string
          questions_generated: number | null
          test_type: string
          theme_seed: string
          topic_focus: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          grammar_focus?: string | null
          id?: string
          level: string
          questions_generated?: number | null
          test_type: string
          theme_seed: string
          topic_focus?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          grammar_focus?: string | null
          id?: string
          level?: string
          questions_generated?: number | null
          test_type?: string
          theme_seed?: string
          topic_focus?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          complexity_score: number | null
          correct_answer: string | null
          created_at: string
          cultural_context: string | null
          difficulty_sublevel: string | null
          expected_response_length: string | null
          formality_level: string | null
          generation_seed: string | null
          grammar_focus: string | null
          id: string
          interaction_type: string | null
          language: string | null
          last_used_at: string | null
          level: string
          options: Json | null
          question_structure: string | null
          region_specific: boolean | null
          text: string
          topic_category: string | null
          type: string
          usage_count: number | null
        }
        Insert: {
          complexity_score?: number | null
          correct_answer?: string | null
          created_at?: string
          cultural_context?: string | null
          difficulty_sublevel?: string | null
          expected_response_length?: string | null
          formality_level?: string | null
          generation_seed?: string | null
          grammar_focus?: string | null
          id?: string
          interaction_type?: string | null
          language?: string | null
          last_used_at?: string | null
          level: string
          options?: Json | null
          question_structure?: string | null
          region_specific?: boolean | null
          text: string
          topic_category?: string | null
          type: string
          usage_count?: number | null
        }
        Update: {
          complexity_score?: number | null
          correct_answer?: string | null
          created_at?: string
          cultural_context?: string | null
          difficulty_sublevel?: string | null
          expected_response_length?: string | null
          formality_level?: string | null
          generation_seed?: string | null
          grammar_focus?: string | null
          id?: string
          interaction_type?: string | null
          language?: string | null
          last_used_at?: string | null
          level?: string
          options?: Json | null
          question_structure?: string | null
          region_specific?: boolean | null
          text?: string
          topic_category?: string | null
          type?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      rubric_scores: {
        Row: {
          created_at: string | null
          id: string
          length_adjustment: number | null
          notes: Json | null
          phase: string
          recommended_cefr: string | null
          test_session_id: string
          traits: Json
          validator_result: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          length_adjustment?: number | null
          notes?: Json | null
          phase: string
          recommended_cefr?: string | null
          test_session_id: string
          traits: Json
          validator_result?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          length_adjustment?: number | null
          notes?: Json | null
          phase?: string
          recommended_cefr?: string | null
          test_session_id?: string
          traits?: Json
          validator_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rubric_scores_test_session_id_fkey"
            columns: ["test_session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          agreement_signed_by: string | null
          agreement_signed_date: string | null
          agreement_version: string | null
          contact_email: string
          contact_name: string | null
          created_at: string | null
          district: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          agreement_signed_by?: string | null
          agreement_signed_date?: string | null
          agreement_version?: string | null
          contact_email: string
          contact_name?: string | null
          created_at?: string | null
          district?: string | null
          id: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          agreement_signed_by?: string | null
          agreement_signed_date?: string | null
          agreement_version?: string | null
          contact_email?: string
          contact_name?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      test_content: {
        Row: {
          audio_url: string | null
          content_type: string
          created_at: string | null
          id: string
          language: string | null
          level: string
          phase_name: string
          prompt_text: string | null
          questions: Json | null
          session_id: string | null
        }
        Insert: {
          audio_url?: string | null
          content_type: string
          created_at?: string | null
          id?: string
          language?: string | null
          level: string
          phase_name: string
          prompt_text?: string | null
          questions?: Json | null
          session_id?: string | null
        }
        Update: {
          audio_url?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          language?: string | null
          level?: string
          phase_name?: string
          prompt_text?: string | null
          questions?: Json | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_content_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_phase_results: {
        Row: {
          completed_at: string | null
          created_at: string | null
          feedback: Json | null
          id: string
          language: string | null
          phase_name: string
          responses: Json | null
          score: number | null
          session_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          feedback?: Json | null
          id?: string
          language?: string | null
          phase_name: string
          responses?: Json | null
          score?: number | null
          session_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          feedback?: Json | null
          id?: string
          language?: string | null
          phase_name?: string
          responses?: Json | null
          score?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_phase_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          actfl_level: string | null
          adaptive_listening_level: string | null
          adaptive_question_count: number | null
          adaptive_reading_level: string | null
          cefr_level: string | null
          certificate_tier: string | null
          created_at: string
          current_phase: string | null
          end_time: string | null
          feedback: Json | null
          id: string
          is_adaptive: boolean | null
          language: string | null
          payment_status: string | null
          phase_scores: Json | null
          phase_weights: Json | null
          route_trace: Json | null
          score: number | null
          start_time: string
          subscription_verified: boolean | null
          test_type: string
          user_id: string | null
        }
        Insert: {
          actfl_level?: string | null
          adaptive_listening_level?: string | null
          adaptive_question_count?: number | null
          adaptive_reading_level?: string | null
          cefr_level?: string | null
          certificate_tier?: string | null
          created_at?: string
          current_phase?: string | null
          end_time?: string | null
          feedback?: Json | null
          id?: string
          is_adaptive?: boolean | null
          language?: string | null
          payment_status?: string | null
          phase_scores?: Json | null
          phase_weights?: Json | null
          route_trace?: Json | null
          score?: number | null
          start_time?: string
          subscription_verified?: boolean | null
          test_type: string
          user_id?: string | null
        }
        Update: {
          actfl_level?: string | null
          adaptive_listening_level?: string | null
          adaptive_question_count?: number | null
          adaptive_reading_level?: string | null
          cefr_level?: string | null
          certificate_tier?: string | null
          created_at?: string
          current_phase?: string | null
          end_time?: string | null
          feedback?: Json | null
          id?: string
          is_adaptive?: boolean | null
          language?: string | null
          payment_status?: string | null
          phase_scores?: Json | null
          phase_weights?: Json | null
          route_trace?: Json | null
          score?: number | null
          start_time?: string
          subscription_verified?: boolean | null
          test_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_ages: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          is_minor: boolean | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          is_minor?: boolean | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          is_minor?: boolean | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string | null
          session_id: string | null
          user_answer: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string | null
          session_id?: string | null
          user_answer?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string | null
          session_id?: string | null
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_least_used_pool_item:
        | {
            Args: {
              p_exclude_hashes?: string[]
              p_exclude_pool_ids?: string[]
              p_language: string
              p_level: string
              p_section: string
              p_version: string
            }
            Returns: {
              id: string
              language: string
              level: string
              payload: Json
              section: string
              stem_hash: string
              used_count: number
              version: string
            }[]
          }
        | {
            Args: {
              p_base_language?: string
              p_exclude_hashes?: string[]
              p_exclude_pool_ids?: string[]
              p_language: string
              p_level: string
              p_section: string
              p_version: string
            }
            Returns: {
              base_language: string
              id: string
              language: string
              level: string
              payload: Json
              section: string
              stem_hash: string
              used_count: number
              version: string
            }[]
          }
      generate_test_questions: {
        Args: { count: number; level: string; test_type: string }
        Returns: {
          complexity_score: number | null
          correct_answer: string | null
          created_at: string
          cultural_context: string | null
          difficulty_sublevel: string | null
          expected_response_length: string | null
          formality_level: string | null
          generation_seed: string | null
          grammar_focus: string | null
          id: string
          interaction_type: string | null
          language: string | null
          last_used_at: string | null
          level: string
          options: Json | null
          question_structure: string | null
          region_specific: boolean | null
          text: string
          topic_category: string | null
          type: string
          usage_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_least_used_pool_item: {
        Args: {
          p_exclude_hashes?: string[]
          p_language: string
          p_level: string
          p_section: string
          p_version: string
        }
        Returns: {
          id: string
          language: string
          level: string
          payload: Json
          section: string
          stem_hash: string
          used_count: number
          version: string
        }[]
      }
      get_recent_topic_hashes: {
        Args: { p_lookback_days?: number; p_section: string; p_user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_pool_usage: { Args: { pool_id: string }; Returns: undefined }
      is_school_admin: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: undefined
      }
      select_diverse_questions: {
        Args: { p_count: number; p_level: string; p_test_type: string }
        Returns: {
          complexity_score: number | null
          correct_answer: string | null
          created_at: string
          cultural_context: string | null
          difficulty_sublevel: string | null
          expected_response_length: string | null
          formality_level: string | null
          generation_seed: string | null
          grammar_focus: string | null
          id: string
          interaction_type: string | null
          language: string | null
          last_used_at: string | null
          level: string
          options: Json | null
          question_structure: string | null
          region_specific: boolean | null
          text: string
          topic_category: string | null
          type: string
          usage_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      select_diverse_questions_enhanced:
        | {
            Args: {
              p_avoid_recent_minutes?: number
              p_count: number
              p_level: string
              p_max_same_grammar?: number
              p_max_same_topic?: number
              p_test_type: string
            }
            Returns: {
              complexity_score: number | null
              correct_answer: string | null
              created_at: string
              cultural_context: string | null
              difficulty_sublevel: string | null
              expected_response_length: string | null
              formality_level: string | null
              generation_seed: string | null
              grammar_focus: string | null
              id: string
              interaction_type: string | null
              language: string | null
              last_used_at: string | null
              level: string
              options: Json | null
              question_structure: string | null
              region_specific: boolean | null
              text: string
              topic_category: string | null
              type: string
              usage_count: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "questions"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              p_avoid_recent_minutes?: number
              p_count: number
              p_language?: string
              p_level: string
              p_max_same_grammar?: number
              p_max_same_topic?: number
              p_test_type: string
            }
            Returns: {
              complexity_score: number | null
              correct_answer: string | null
              created_at: string
              cultural_context: string | null
              difficulty_sublevel: string | null
              expected_response_length: string | null
              formality_level: string | null
              generation_seed: string | null
              grammar_focus: string | null
              id: string
              interaction_type: string | null
              language: string | null
              last_used_at: string | null
              level: string
              options: Json | null
              question_structure: string | null
              region_specific: boolean | null
              text: string
              topic_category: string | null
              type: string
              usage_count: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "questions"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      trigger_question_generation:
        | {
            Args: {
              p_language?: string
              p_level: string
              p_target_count?: number
              p_test_type: string
            }
            Returns: {
              current_count: number
              needs_generation: boolean
              target_count: number
            }[]
          }
        | {
            Args: {
              p_level: string
              p_target_count?: number
              p_test_type: string
            }
            Returns: {
              current_count: number
              needs_generation: boolean
              target_count: number
            }[]
          }
    }
    Enums: {
      app_role: "admin" | "school_admin" | "student"
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
      app_role: ["admin", "school_admin", "student"],
    },
  },
} as const
