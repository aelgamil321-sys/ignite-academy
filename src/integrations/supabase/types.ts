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
          announcement_topic: string | null
          audience: string | null
          category: string
          content: Json
          created_at: string
          created_by: string | null
          grade: string
          id: string
          image_url: string | null
          published: boolean
          subject_category: string
          target_section: string | null
          title: Json
          unit_slug: string
        }
        Insert: {
          announcement_topic?: string | null
          audience?: string | null
          category?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          grade?: string
          id?: string
          image_url?: string | null
          published?: boolean
          subject_category?: string
          target_section?: string | null
          title?: Json
          unit_slug?: string
        }
        Update: {
          announcement_topic?: string | null
          audience?: string | null
          category?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          grade?: string
          id?: string
          image_url?: string | null
          published?: boolean
          subject_category?: string
          target_section?: string | null
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
          worksheet_url: string | null
          youtube_url: string
          youtube_url_ar: string
          youtube_url_en: string
        }
        Insert: {
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
          worksheet_url?: string | null
          youtube_url?: string
          youtube_url_ar?: string
          youtube_url_en?: string
        }
        Update: {
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
          worksheet_url?: string | null
          youtube_url?: string
          youtube_url_ar?: string
          youtube_url_en?: string
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          cache_key: string
          source_text: string
          source_lang: string
          target_lang: string
          content_type: string | null
          lesson_id: string | null
          field_name: string | null
          translated_text: string
          provider: string
          created_at: string
          updated_at: string
        }
        Insert: {
          cache_key: string
          source_text: string
          source_lang: string
          target_lang: string
          content_type?: string | null
          lesson_id?: string | null
          field_name?: string | null
          translated_text: string
          provider?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          cache_key?: string
          source_text?: string
          source_lang?: string
          target_lang?: string
          content_type?: string | null
          lesson_id?: string | null
          field_name?: string | null
          translated_text?: string
          provider?: string
          created_at?: string
          updated_at?: string
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
          preferred_language: string
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
          preferred_language?: string
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
          preferred_language?: string
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
      teacher_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          created_at: string
          grade: string
          id: string
          islamic_group: string | null
          section: string | null
          teacher_id: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          islamic_group?: string | null
          section?: string | null
          teacher_id: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          islamic_group?: string | null
          section?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
      weekly_plan_master_list_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label_ar: string
          label_en: string
          list_id: string
          metadata: Json
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          list_id: string
          metadata?: Json
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          list_id?: string
          metadata?: Json
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_master_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "weekly_plan_master_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plan_master_lists: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label_ar: string
          label_en: string
          list_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          list_key: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          list_key?: string
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          academic_year: string
          completion_percentage: number
          created_at: string
          cross_curricular_real_life: string | null
          day: string | null
          differentiation_eal: Json
          differentiation_emirati: Json
          differentiation_gt: Json
          differentiation_sod: Json
          domain: string | null
          first_period: Json
          grade: string
          id: string
          islamic_group: string | null
          key_vocabulary: string | null
          learning_outcomes: string | null
          lesson_title: string | null
          p21_skills: Json
          phase: string | null
          plan_date: string | null
          plan_language: string
          resources: string | null
          second_period: Json
          section: string | null
          sections: string[]
          sections_key: string
          status: string
          student_count: number | null
          subject: string
          success_criterion: string | null
          teacher_id: string
          teacher_reflection: string | null
          unit: string | null
          uae_culture: string | null
          updated_at: string
          week_number: number
        }
        Insert: {
          academic_year?: string
          completion_percentage?: number
          created_at?: string
          cross_curricular_real_life?: string | null
          day?: string | null
          differentiation_eal?: Json
          differentiation_emirati?: Json
          differentiation_gt?: Json
          differentiation_sod?: Json
          domain?: string | null
          first_period?: Json
          grade: string
          id?: string
          islamic_group?: string | null
          key_vocabulary?: string | null
          learning_outcomes?: string | null
          lesson_title?: string | null
          p21_skills?: Json
          phase?: string | null
          plan_date?: string | null
          plan_language?: string
          resources?: string | null
          second_period?: Json
          section?: string | null
          sections?: string[]
          sections_key?: string
          status?: string
          student_count?: number | null
          subject?: string
          success_criterion?: string | null
          teacher_id: string
          teacher_reflection?: string | null
          unit?: string | null
          uae_culture?: string | null
          updated_at?: string
          week_number: number
        }
        Update: {
          academic_year?: string
          completion_percentage?: number
          created_at?: string
          cross_curricular_real_life?: string | null
          day?: string | null
          differentiation_eal?: Json
          differentiation_emirati?: Json
          differentiation_gt?: Json
          differentiation_sod?: Json
          domain?: string | null
          first_period?: Json
          grade?: string
          id?: string
          islamic_group?: string | null
          key_vocabulary?: string | null
          learning_outcomes?: string | null
          lesson_title?: string | null
          p21_skills?: Json
          phase?: string | null
          plan_date?: string | null
          plan_language?: string
          resources?: string | null
          second_period?: Json
          section?: string | null
          sections?: string[]
          sections_key?: string
          status?: string
          student_count?: number | null
          subject?: string
          success_criterion?: string | null
          teacher_id?: string
          teacher_reflection?: string | null
          unit?: string | null
          uae_culture?: string | null
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          created_at: string
          is_lead_teacher: boolean
          lead_granted_at: string | null
          lead_granted_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_lead_teacher?: boolean
          lead_granted_at?: string | null
          lead_granted_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_lead_teacher?: boolean
          lead_granted_at?: string | null
          lead_granted_by?: string | null
          updated_at?: string
          user_id?: string
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
          islamic_group: string | null
          parent_link_code: string | null
          preferred_language: string
          profile_photo_path: string | null
          section: string | null
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
          islamic_group?: string | null
          parent_link_code?: string | null
          preferred_language?: string
          profile_photo_path?: string | null
          section?: string | null
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
          islamic_group?: string | null
          parent_link_code?: string | null
          preferred_language?: string
          profile_photo_path?: string | null
          section?: string | null
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
      get_my_parent_link_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_student_peer_rankings: {
        Args: {
          p_student_user_id: string
        }
        Returns: Json
      }
      get_admin_hall_of_fame: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_announcement_creator_display_names: {
        Args: {
          p_user_ids: string[]
        }
        Returns: Json
      }
      get_hall_of_fame: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      teacher_can_read_student: {
        Args: {
          target_student_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "student" | "parent" | "teacher"
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
      app_role: ["admin", "user", "student", "parent", "teacher"],
    },
  },
} as const
