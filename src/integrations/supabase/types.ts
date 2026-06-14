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
      articles: {
        Row: {
          category: string
          content: Json
          created_at: string
          grade: string
          id: string
          image_url: string | null
          published: boolean
          subject_category: string
          title: Json
          unit_slug: string
        }
        Insert: {
          category?: string
          content?: Json
          created_at?: string
          grade?: string
          id?: string
          image_url?: string | null
          published?: boolean
          subject_category?: string
          title?: Json
          unit_slug?: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          grade?: string
          id?: string
          image_url?: string | null
          published?: boolean
          subject_category?: string
          title?: Json
          unit_slug?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          grade: string
          id: string
          lesson: string
          published: boolean
          size: string
          subject_category: string
          title: Json
          type: string
          unit: Json
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_url?: string
          grade?: string
          id?: string
          lesson?: string
          published?: boolean
          size?: string
          subject_category?: string
          title?: Json
          type?: string
          unit?: Json
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          grade?: string
          id?: string
          lesson?: string
          published?: boolean
          size?: string
          subject_category?: string
          title?: Json
          type?: string
          unit?: Json
        }
        Relationships: []
      }
      lessons: {
        Row: {
          activity: Json
          created_at: string
          explanation: Json
          grade: string
          id: string
          is_deleted: boolean
          outcome: Json
          pdf_ar_url: string | null
          pdf_en_url: string | null
          pdf_name: string | null
          pdf_url: string | null
          ppt_ar_url: string | null
          ppt_en_url: string | null
          ppt_name: string | null
          ppt_url: string | null
          published: boolean
          quiz: Json
          subject_category: string
          title: Json
          unit: Json
          vocab: Json
          worksheet_ar_url: string | null
          worksheet_en_url: string | null
          worksheet_name: string | null
          worksheet_text: Json
          worksheet_url: string | null
          youtube_url: string
          youtube_url_ar: string
          youtube_url_en: string
        }
        Insert: {
          activity?: Json
          created_at?: string
          explanation?: Json
          grade: string
          id?: string
          is_deleted?: boolean
          outcome?: Json
          pdf_ar_url?: string | null
          pdf_en_url?: string | null
          pdf_name?: string | null
          pdf_url?: string | null
          ppt_ar_url?: string | null
          ppt_en_url?: string | null
          ppt_name?: string | null
          ppt_url?: string | null
          published?: boolean
          quiz?: Json
          subject_category?: string
          title?: Json
          unit?: Json
          vocab?: Json
          worksheet_ar_url?: string | null
          worksheet_en_url?: string | null
          worksheet_name?: string | null
          worksheet_text?: Json
          worksheet_url?: string | null
          youtube_url?: string
          youtube_url_ar?: string
          youtube_url_en?: string
        }
        Update: {
          activity?: Json
          created_at?: string
          explanation?: Json
          grade?: string
          id?: string
          is_deleted?: boolean
          outcome?: Json
          pdf_ar_url?: string | null
          pdf_en_url?: string | null
          pdf_name?: string | null
          pdf_url?: string | null
          ppt_ar_url?: string | null
          ppt_en_url?: string | null
          ppt_name?: string | null
          ppt_url?: string | null
          published?: boolean
          quiz?: Json
          subject_category?: string
          title?: Json
          unit?: Json
          vocab?: Json
          worksheet_ar_url?: string | null
          worksheet_en_url?: string | null
          worksheet_name?: string | null
          worksheet_text?: Json
          worksheet_url?: string | null
          youtube_url?: string
          youtube_url_ar?: string
          youtube_url_en?: string
        }
        Relationships: []
      }
      lesson_quiz_submissions: {
        Row: {
          id: string
          student_id: string
          lesson_id: string
          score: number
          auto_score: number
          essay_score: number
          final_score: number
          total_points: number
          percentage: number
          status: string
          answers: Json
          submitted_at: string
        }
        Insert: {
          id?: string
          student_id: string
          lesson_id: string
          score?: number
          auto_score?: number
          essay_score?: number
          final_score?: number
          total_points?: number
          percentage?: number
          status?: string
          answers?: Json
          submitted_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          lesson_id?: string
          score?: number
          auto_score?: number
          essay_score?: number
          final_score?: number
          total_points?: number
          percentage?: number
          status?: string
          answers?: Json
          submitted_at?: string
        }
        Relationships: []
      }
      quiz_certificates: {
        Row: {
          id: string
          certificate_id: string
          student_id: string
          lesson_id: string
          submission_id: string
          score: number
          percentage: number
          issued_at: string
        }
        Insert: {
          id?: string
          certificate_id: string
          student_id: string
          lesson_id: string
          submission_id: string
          score?: number
          percentage?: number
          issued_at?: string
        }
        Update: {
          id?: string
          certificate_id?: string
          student_id?: string
          lesson_id?: string
          submission_id?: string
          score?: number
          percentage?: number
          issued_at?: string
        }
        Relationships: []
      }
      parent_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          student_name: string
          student_grade: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string
          email?: string
          student_name?: string
          student_grade?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          student_name?: string
          student_grade?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      parent_student_links: {
        Row: {
          id: string
          parent_user_id: string
          student_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_user_id: string
          student_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_user_id?: string
          student_user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          arabic_name: string
          created_at: string
          email: string
          english_name: string
          full_name: string
          grade: string
          id: string
          parent_link_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arabic_name?: string
          created_at?: string
          email?: string
          english_name?: string
          full_name?: string
          grade?: string
          id?: string
          parent_link_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arabic_name?: string
          created_at?: string
          email?: string
          english_name?: string
          full_name?: string
          grade?: string
          id?: string
          parent_link_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unit_information: {
        Row: {
          created_at: string
          description: Json
          grade: string
          id: string
          key_points: Json
          notes: Json
          published: boolean
          title: Json
          unit: Json
          unit_slug: string
        }
        Insert: {
          created_at?: string
          description?: Json
          grade?: string
          id?: string
          key_points?: Json
          notes?: Json
          published?: boolean
          title?: Json
          unit?: Json
          unit_slug?: string
        }
        Update: {
          created_at?: string
          description?: Json
          grade?: string
          id?: string
          key_points?: Json
          notes?: Json
          published?: boolean
          title?: Json
          unit?: Json
          unit_slug?: string
        }
        Relationships: []
      }
      unit_quizzes: {
        Row: {
          created_at: string
          grade: string
          id: string
          published: boolean
          questions: Json
          title: Json
          unit: Json
          unit_slug: string
        }
        Insert: {
          created_at?: string
          grade?: string
          id?: string
          published?: boolean
          questions?: Json
          title?: Json
          unit?: Json
          unit_slug?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          published?: boolean
          questions?: Json
          title?: Json
          unit?: Json
          unit_slug?: string
        }
        Relationships: []
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
      videos: {
        Row: {
          category: string
          created_at: string
          description: Json
          grade: string
          id: string
          published: boolean
          thumbnail_url: string | null
          title: Json
          unit: Json
          youtube_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: Json
          grade?: string
          id?: string
          published?: boolean
          thumbnail_url?: string | null
          title?: Json
          unit?: Json
          youtube_url?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: Json
          grade?: string
          id?: string
          published?: boolean
          thumbnail_url?: string | null
          title?: Json
          unit?: Json
          youtube_url?: string
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
      submit_lesson_quiz: {
        Args: {
          p_lesson_id: string
          p_answers: Json
        }
        Returns: Database["public"]["Tables"]["lesson_quiz_submissions"]["Row"]
      }
      redeem_parent_link_code: {
        Args: {
          p_code: string
        }
        Returns: Json
      }
      admin_regenerate_parent_link_code: {
        Args: {
          p_student_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "student" | "parent"
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
      app_role: ["admin", "user", "student", "parent"],
    },
  },
} as const
