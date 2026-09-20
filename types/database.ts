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
      certificates: {
        Row: {
          attempt_id: string | null
          course_id: string
          course_title: string
          educator_name: string
          id: string
          issued_at: string
          recipient_name: string
          reference: string
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          course_id: string
          course_title: string
          educator_name: string
          id?: string
          issued_at?: string
          recipient_name: string
          reference: string
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          course_id?: string
          course_title?: string
          educator_name?: string
          id?: string
          issued_at?: string
          recipient_name?: string
          reference?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          position: number
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          accent: string
          access_months: number | null
          category: Database["public"]["Enums"]["course_category"]
          cover_path: string | null
          created_at: string
          educator_id: string
          enrolled_count: number
          id: string
          is_featured: boolean
          is_published: boolean
          lesson_count: number
          level: Database["public"]["Enums"]["course_level"]
          outcomes: string[]
          overview: string
          price_cents: number | null
          rating: number | null
          subtitle: string | null
          title: string
          total_duration_seconds: number
          updated_at: string
        }
        Insert: {
          accent?: string
          access_months?: number | null
          category: Database["public"]["Enums"]["course_category"]
          cover_path?: string | null
          created_at?: string
          educator_id: string
          enrolled_count?: number
          id?: string
          is_featured?: boolean
          is_published?: boolean
          lesson_count?: number
          level: Database["public"]["Enums"]["course_level"]
          outcomes?: string[]
          overview?: string
          price_cents?: number | null
          rating?: number | null
          subtitle?: string | null
          title: string
          total_duration_seconds?: number
          updated_at?: string
        }
        Update: {
          accent?: string
          access_months?: number | null
          category?: Database["public"]["Enums"]["course_category"]
          cover_path?: string | null
          created_at?: string
          educator_id?: string
          enrolled_count?: number
          id?: string
          is_featured?: boolean
          is_published?: boolean
          lesson_count?: number
          level?: Database["public"]["Enums"]["course_level"]
          outcomes?: string[]
          overview?: string
          price_cents?: number | null
          rating?: number | null
          subtitle?: string | null
          title?: string
          total_duration_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      educator_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          headline: string | null
          id: string
          is_verified: boolean
          specialization: string | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          headline?: string | null
          id?: string
          is_verified?: boolean
          specialization?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          headline?: string | null
          id?: string
          is_verified?: boolean
          specialization?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "educator_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          last_lesson_id: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          source: Database["public"]["Enums"]["entitlement_source"]
          source_purchase_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["entitlement_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          source: Database["public"]["Enums"]["entitlement_source"]
          source_purchase_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          source?: Database["public"]["Enums"]["entitlement_source"]
          source_purchase_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_source_purchase_id_fkey"
            columns: ["source_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          completed_at: string
          correct_count: number
          course_id: string
          id: string
          passed: boolean
          question_count: number
          score_percent: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          correct_count: number
          course_id: string
          id?: string
          passed: boolean
          question_count: number
          score_percent: number
          user_id: string
        }
        Update: {
          completed_at?: string
          correct_count?: number
          course_id?: string
          id?: string
          passed?: boolean
          question_count?: number
          score_percent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          attempts_allowed: number
          course_id: string
          duration_minutes: number
          grants_certificate: boolean
          pass_percent: number
          question_count: number
        }
        Insert: {
          attempts_allowed?: number
          course_id: string
          duration_minutes: number
          grants_certificate?: boolean
          pass_percent: number
          question_count: number
        }
        Update: {
          attempts_allowed?: number
          course_id?: string
          duration_minutes?: number
          grants_certificate?: boolean
          pass_percent?: number
          question_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          body: string | null
          id: string
          is_read: boolean
          kind: Database["public"]["Enums"]["inbox_message_kind"]
          preview: string
          recipient_id: string
          sender_id: string | null
          sent_at: string
          subject: string
        }
        Insert: {
          body?: string | null
          id?: string
          is_read?: boolean
          kind: Database["public"]["Enums"]["inbox_message_kind"]
          preview: string
          recipient_id: string
          sender_id?: string | null
          sent_at?: string
          subject: string
        }
        Update: {
          body?: string | null
          id?: string
          is_read?: boolean
          kind?: Database["public"]["Enums"]["inbox_message_kind"]
          preview?: string
          recipient_id?: string
          sender_id?: string | null
          sent_at?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "educator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_blocks: {
        Row: {
          body: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          kind: Database["public"]["Enums"]["lesson_block_kind"]
          lesson_id: string
          position: number
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind: Database["public"]["Enums"]["lesson_block_kind"]
          lesson_id: string
          position: number
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["lesson_block_kind"]
          lesson_id?: string
          position?: number
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          enrollment_id: string
          lesson_id: string
        }
        Insert: {
          completed_at?: string
          enrollment_id: string
          lesson_id: string
        }
        Update: {
          completed_at?: string
          enrollment_id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          enrollment_id: string
          lesson_id: string
          position_seconds: number
          updated_at: string
        }
        Insert: {
          enrollment_id: string
          lesson_id: string
          position_seconds?: number
          updated_at?: string
        }
        Update: {
          enrollment_id?: string
          lesson_id?: string
          position_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          duration_seconds: number
          id: string
          is_preview: boolean
          module_id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          duration_seconds: number
          id?: string
          is_preview?: boolean
          module_id: string
          position: number
          title: string
        }
        Update: {
          course_id?: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          module_id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_cents: number
          course_id: string
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          provider: string
          provider_customer_id: string | null
          provider_transaction_id: string | null
          purchased_at: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          course_id: string
          created_at?: string
          currency: string
          id?: string
          metadata?: Json | null
          provider: string
          provider_customer_id?: string | null
          provider_transaction_id?: string | null
          purchased_at?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          course_id?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_customer_id?: string | null
          provider_transaction_id?: string | null
          purchased_at?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_choices: {
        Row: {
          body: string
          id: string
          is_correct: boolean
          label: string
          position: number
          question_id: string
        }
        Insert: {
          body: string
          id?: string
          is_correct?: boolean
          label: string
          position: number
          question_id: string
        }
        Update: {
          body?: string
          id?: string
          is_correct?: boolean
          label?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          course_id: string
          explanation: string | null
          hint: string | null
          id: string
          is_required: boolean
          media_url: string | null
          module_id: string | null
          position: number
          prompt: string
          quiz_id: string | null
          topic: string
          type: Database["public"]["Enums"]["quiz_question_type"]
        }
        Insert: {
          course_id: string
          explanation?: string | null
          hint?: string | null
          id?: string
          is_required?: boolean
          media_url?: string | null
          module_id?: string | null
          position: number
          prompt: string
          quiz_id?: string | null
          topic: string
          type?: Database["public"]["Enums"]["quiz_question_type"]
        }
        Update: {
          course_id?: string
          explanation?: string | null
          hint?: string | null
          id?: string
          is_required?: boolean
          media_url?: string | null
          module_id?: string | null
          position?: number
          prompt?: string
          quiz_id?: string | null
          topic?: string
          type?: Database["public"]["Enums"]["quiz_question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          attempts_allowed: number
          course_id: string
          created_at: string
          gates_progress: boolean
          id: string
          module_id: string
          position: number
          show_results: boolean
          title: string
        }
        Insert: {
          attempts_allowed?: number
          course_id: string
          created_at?: string
          gates_progress?: boolean
          id?: string
          module_id: string
          position: number
          show_results?: boolean
          title?: string
        }
        Update: {
          attempts_allowed?: number
          course_id?: string
          created_at?: string
          gates_progress?: boolean
          id?: string
          module_id?: string
          position?: number
          show_results?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_feedback: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          resulting_status: Database["public"]["Enums"]["submission_status"]
          submission_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          resulting_status: Database["public"]["Enums"]["submission_status"]
          submission_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          resulting_status?: Database["public"]["Enums"]["submission_status"]
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_feedback_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_feedback_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_media: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["lesson_block_kind"]
          path: string
          position: number
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["lesson_block_kind"]
          path: string
          position?: number
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["lesson_block_kind"]
          path?: string
          position?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_media_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          course_id: string
          created_at: string
          enrollment_id: string
          id: string
          module_id: string | null
          response: string
          reviewed_at: string | null
          revision_count: number
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          module_id?: string | null
          response?: string
          reviewed_at?: string | null
          revision_count?: number
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          module_id?: string | null
          response?: string
          reviewed_at?: string | null
          revision_count?: number
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          clerk_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          notification_prefs: Json
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          clerk_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          notification_prefs?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          clerk_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          notification_prefs?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          error: string | null
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          status: string
        }
        Insert: {
          error?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      quiz_choices_public: {
        Row: {
          body: string | null
          id: string | null
          label: string | null
          position: number | null
          question_id: string | null
        }
        Insert: {
          body?: string | null
          id?: string | null
          label?: string | null
          position?: number | null
          question_id?: string | null
        }
        Update: {
          body?: string | null
          id?: string | null
          label?: string | null
          position?: number | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_author_course: { Args: { p_course_id: string }; Returns: boolean }
      course_id_from_object_path: { Args: { p_name: string }; Returns: string }
      current_educator_id: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      enroll_in_course: {
        Args: { p_course_id: string }
        Returns: {
          course_id: string
          enrolled_at: string
          id: string
          last_lesson_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_entitlement: {
        Args: {
          p_course_id: string
          p_granted_by?: string
          p_months?: number
          p_purchase_id?: string
          p_source?: Database["public"]["Enums"]["entitlement_source"]
          p_user_id: string
        }
        Returns: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          source: Database["public"]["Enums"]["entitlement_source"]
          source_purchase_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["entitlement_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entitlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_course_access: { Args: { p_course_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      review_submission: {
        Args: {
          p_body?: string
          p_status: Database["public"]["Enums"]["submission_status"]
          p_submission_id: string
        }
        Returns: undefined
      }
      revoke_entitlement: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: undefined
      }
      submission_id_from_object_path: {
        Args: { p_name: string }
        Returns: string
      }
      submit_exam: {
        Args: { p_answers: Json; p_course_id: string }
        Returns: {
          completed_at: string
          correct_count: number
          course_id: string
          id: string
          passed: boolean
          question_count: number
          score_percent: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "exam_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      course_category:
        | "color"
        | "cutting"
        | "styling"
        | "editorial"
        | "business"
      course_level: "beginner" | "intermediate" | "advanced"
      entitlement_source: "free" | "purchase" | "admin_grant"
      entitlement_status: "active" | "expired" | "revoked"
      inbox_message_kind: "feedback" | "announcement" | "review"
      lesson_block_kind: "video" | "text" | "image" | "pdf" | "embed"
      purchase_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      quiz_question_type: "mc" | "multi" | "image" | "order"
      submission_status: "pending" | "approved" | "needs_revision"
      user_role: "student" | "educator" | "admin" | "super-admin"
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
    Enums: {
      course_category: ["color", "cutting", "styling", "editorial", "business"],
      course_level: ["beginner", "intermediate", "advanced"],
      entitlement_source: ["free", "purchase", "admin_grant"],
      entitlement_status: ["active", "expired", "revoked"],
      inbox_message_kind: ["feedback", "announcement", "review"],
      lesson_block_kind: ["video", "text", "image", "pdf", "embed"],
      purchase_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      quiz_question_type: ["mc", "multi", "image", "order"],
      submission_status: ["pending", "approved", "needs_revision"],
      user_role: ["student", "educator", "admin", "super-admin"],
    },
  },
} as const
