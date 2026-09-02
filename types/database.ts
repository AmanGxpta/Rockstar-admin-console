/**
 * Shape of the Supabase schema.
 *
 * users and educator_profiles were generated from the live database. The
 * catalog tables below describe supabase/migrations/0001_course_catalog.sql
 * and were written by hand to match it — regenerate this file once that
 * migration has actually been applied.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      courses: {
        Row: {
          accent: string;
          category: Database["public"]["Enums"]["course_category"];
          created_at: string;
          educator_id: string;
          enrolled_count: number;
          id: string;
          is_featured: boolean;
          is_published: boolean;
          lesson_count: number;
          level: Database["public"]["Enums"]["course_level"];
          outcomes: string[];
          overview: string;
          access_months: number | null;
          price_cents: number | null;
          rating: number | null;
          subtitle: string | null;
          title: string;
          total_duration_seconds: number;
          updated_at: string;
        };
        Insert: {
          accent?: string;
          category: Database["public"]["Enums"]["course_category"];
          created_at?: string;
          educator_id: string;
          enrolled_count?: number;
          id?: string;
          is_featured?: boolean;
          is_published?: boolean;
          lesson_count?: number;
          level: Database["public"]["Enums"]["course_level"];
          outcomes?: string[];
          overview?: string;
          access_months?: number | null;
          price_cents?: number | null;
          rating?: number | null;
          subtitle?: string | null;
          title: string;
          total_duration_seconds?: number;
          updated_at?: string;
        };
        Update: {
          accent?: string;
          category?: Database["public"]["Enums"]["course_category"];
          created_at?: string;
          educator_id?: string;
          enrolled_count?: number;
          id?: string;
          is_featured?: boolean;
          is_published?: boolean;
          lesson_count?: number;
          level?: Database["public"]["Enums"]["course_level"];
          outcomes?: string[];
          overview?: string;
          access_months?: number | null;
          price_cents?: number | null;
          rating?: number | null;
          subtitle?: string | null;
          title?: string;
          total_duration_seconds?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_educator_id_fkey";
            columns: ["educator_id"];
            isOneToOne: false;
            referencedRelation: "educator_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      course_modules: {
        Row: {
          course_id: string;
          id: string;
          position: number;
          title: string;
        };
        Insert: {
          course_id: string;
          id?: string;
          position: number;
          title: string;
        };
        Update: {
          course_id?: string;
          id?: string;
          position?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          course_id: string;
          duration_seconds: number;
          id: string;
          is_preview: boolean;
          module_id: string;
          position: number;
          title: string;
        };
        Insert: {
          course_id: string;
          duration_seconds: number;
          id?: string;
          is_preview?: boolean;
          module_id: string;
          position: number;
          title: string;
        };
        Update: {
          course_id?: string;
          duration_seconds?: number;
          id?: string;
          is_preview?: boolean;
          module_id?: string;
          position?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_blocks: {
        Row: {
          body: string | null;
          created_at: string;
          duration_seconds: number | null;
          id: string;
          kind: Database["public"]["Enums"]["lesson_block_kind"];
          lesson_id: string;
          position: number;
          url: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["lesson_block_kind"];
          lesson_id: string;
          position: number;
          url?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["lesson_block_kind"];
          lesson_id?: string;
          position?: number;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          course_id: string;
          enrolled_at: string;
          id: string;
          last_lesson_id: string | null;
          user_id: string;
        };
        Insert: {
          course_id: string;
          enrolled_at?: string;
          id?: string;
          last_lesson_id?: string | null;
          user_id: string;
        };
        Update: {
          course_id?: string;
          enrolled_at?: string;
          id?: string;
          last_lesson_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_completions: {
        Row: {
          completed_at: string;
          enrollment_id: string;
          lesson_id: string;
        };
        Insert: {
          completed_at?: string;
          enrollment_id: string;
          lesson_id: string;
        };
        Update: {
          completed_at?: string;
          enrollment_id?: string;
          lesson_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_completions_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      inbox_messages: {
        Row: {
          body: string | null;
          id: string;
          is_read: boolean;
          kind: Database["public"]["Enums"]["inbox_message_kind"];
          preview: string;
          recipient_id: string;
          sender_id: string | null;
          sent_at: string;
          subject: string;
        };
        Insert: {
          body?: string | null;
          id?: string;
          is_read?: boolean;
          kind: Database["public"]["Enums"]["inbox_message_kind"];
          preview: string;
          recipient_id: string;
          sender_id: string | null;
          sent_at?: string;
          subject: string;
        };
        Update: {
          body?: string | null;
          id?: string;
          is_read?: boolean;
          kind?: Database["public"]["Enums"]["inbox_message_kind"];
          preview?: string;
          recipient_id?: string;
          sender_id?: string | null;
          sent_at?: string;
          subject?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inbox_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbox_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "educator_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      educator_profiles: {
        Row: {
          headline: string | null;
          id: string;
          is_verified: boolean;
          specialization: string | null;
          user_id: string | null;
          years_experience: number | null;
        };
        Insert: {
          headline?: string | null;
          id?: string;
          is_verified?: boolean;
          specialization?: string | null;
          user_id?: string | null;
          years_experience?: number | null;
        };
        Update: {
          headline?: string | null;
          id?: string;
          is_verified?: boolean;
          specialization?: string | null;
          user_id?: string | null;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "educator_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          clerk_id: string;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          is_active: boolean;
          notification_prefs: Json;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          clerk_id: string;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          notification_prefs?: Json;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          clerk_id?: string;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          notification_prefs?: Json;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          course_id: string;
          explanation: string | null;
          id: string;
          module_id: string | null;
          position: number;
          prompt: string;
          topic: string;
        };
        Insert: {
          course_id: string;
          explanation?: string | null;
          id?: string;
          module_id?: string | null;
          position: number;
          prompt: string;
          topic: string;
        };
        Update: {
          course_id?: string;
          explanation?: string | null;
          id?: string;
          module_id?: string | null;
          position?: number;
          prompt?: string;
          topic?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_questions_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_choices: {
        Row: {
          body: string;
          id: string;
          is_correct: boolean;
          label: string;
          position: number;
          question_id: string;
        };
        Insert: {
          body: string;
          id?: string;
          is_correct?: boolean;
          label: string;
          position: number;
          question_id: string;
        };
        Update: {
          body?: string;
          id?: string;
          is_correct?: boolean;
          label?: string;
          position?: number;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_choices_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      exams: {
        Row: {
          attempts_allowed: number;
          course_id: string;
          duration_minutes: number;
          grants_certificate: boolean;
          pass_percent: number;
          question_count: number;
        };
        Insert: {
          attempts_allowed?: number;
          course_id: string;
          duration_minutes: number;
          grants_certificate?: boolean;
          pass_percent: number;
          question_count: number;
        };
        Update: {
          attempts_allowed?: number;
          course_id?: string;
          duration_minutes?: number;
          grants_certificate?: boolean;
          pass_percent?: number;
          question_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: true;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      certificates: {
        Row: {
          attempt_id: string | null;
          course_id: string;
          course_title: string;
          educator_name: string;
          id: string;
          issued_at: string;
          recipient_name: string;
          reference: string;
          user_id: string;
        };
        Insert: {
          attempt_id?: string | null;
          course_id: string;
          course_title: string;
          educator_name: string;
          id?: string;
          issued_at?: string;
          recipient_name: string;
          reference: string;
          user_id: string;
        };
        Update: {
          attempt_id?: string | null;
          course_id?: string;
          course_title?: string;
          educator_name?: string;
          id?: string;
          issued_at?: string;
          recipient_name?: string;
          reference?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_attempts: {
        Row: {
          completed_at: string;
          correct_count: number;
          course_id: string;
          id: string;
          passed: boolean;
          question_count: number;
          score_percent: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          correct_count: number;
          course_id: string;
          id?: string;
          passed: boolean;
          question_count: number;
          score_percent: number;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          correct_count?: number;
          course_id?: string;
          id?: string;
          passed?: boolean;
          question_count?: number;
          score_percent?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_attempts_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      /** quiz_choices without is_correct — see 0002_assessments.sql. */
      quiz_choices_public: {
        Row: {
          body: string;
          id: string;
          label: string;
          position: number;
          question_id: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_choices_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      entitlements: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          source: Database["public"]["Enums"]["entitlement_source"];
          source_purchase_id: string | null;
          status: Database["public"]["Enums"]["entitlement_status"];
          starts_at: string;
          expires_at: string | null;
          granted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          source: Database["public"]["Enums"]["entitlement_source"];
          source_purchase_id?: string | null;
          status?: Database["public"]["Enums"]["entitlement_status"];
          starts_at?: string;
          expires_at?: string | null;
          granted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          source?: Database["public"]["Enums"]["entitlement_source"];
          source_purchase_id?: string | null;
          status?: Database["public"]["Enums"]["entitlement_status"];
          starts_at?: string;
          expires_at?: string | null;
          granted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entitlements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entitlements_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entitlements_source_purchase_id_fkey";
            columns: ["source_purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          provider: string;
          provider_transaction_id: string | null;
          provider_customer_id: string | null;
          amount_cents: number;
          currency: string;
          status: Database["public"]["Enums"]["purchase_status"];
          purchased_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          provider: string;
          provider_transaction_id?: string | null;
          provider_customer_id?: string | null;
          amount_cents: number;
          currency: string;
          status?: Database["public"]["Enums"]["purchase_status"];
          purchased_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          provider?: string;
          provider_transaction_id?: string | null;
          provider_customer_id?: string | null;
          amount_cents?: number;
          currency?: string;
          status?: Database["public"]["Enums"]["purchase_status"];
          purchased_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          provider_event_id: string;
          event_type: string;
          status: string;
          payload: Json | null;
          error: string | null;
          received_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          provider: string;
          provider_event_id: string;
          event_type: string;
          status?: string;
          payload?: Json | null;
          error?: string | null;
          received_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          provider?: string;
          provider_event_id?: string;
          event_type?: string;
          status?: string;
          payload?: Json | null;
          error?: string | null;
          received_at?: string;
          processed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      enroll_in_course: {
        Args: { p_course_id: string };
        Returns: Database["public"]["Tables"]["enrollments"]["Row"];
      };
      has_course_access: {
        Args: { p_course_id: string };
        Returns: boolean;
      };
      submit_exam: {
        Args: { p_course_id: string; p_answers: Json };
        Returns: Database["public"]["Tables"]["exam_attempts"]["Row"];
      };
    };
    Enums: {
      course_category:
        | "color"
        | "cutting"
        | "styling"
        | "editorial"
        | "business";
      course_level: "beginner" | "intermediate" | "advanced";
      entitlement_source: "free" | "purchase" | "admin_grant";
      entitlement_status: "active" | "expired" | "revoked";
      purchase_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "cancelled";
      inbox_message_kind: "feedback" | "announcement" | "review";
      lesson_block_kind: "video" | "text" | "image" | "pdf" | "embed";
      user_role: "student" | "educator" | "admin" | "super-admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type UserRole = Database["public"]["Enums"]["user_role"];
