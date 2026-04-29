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
      attendance: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          marked_by: string | null
          session_date: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          marked_by?: string | null
          session_date: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          marked_by?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          capacity: number
          center_id: string
          course_id: string
          created_at: string
          end_date: string
          id: string
          instructor_id: string | null
          name: string
          published_to_ami_probashi: boolean
          schedule_notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["batch_status"]
        }
        Insert: {
          capacity?: number
          center_id: string
          course_id: string
          created_at?: string
          end_date: string
          id?: string
          instructor_id?: string | null
          name: string
          published_to_ami_probashi?: boolean
          schedule_notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["batch_status"]
        }
        Update: {
          capacity?: number
          center_id?: string
          course_id?: string
          created_at?: string
          end_date?: string
          id?: string
          instructor_id?: string | null
          name?: string
          published_to_ami_probashi?: boolean
          schedule_notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["batch_status"]
        }
        Relationships: [
          {
            foreignKeyName: "batches_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "training_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          center_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_hours: number
          id: string
          price: number | null
          title: string
          trade_id: string
        }
        Insert: {
          center_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          price?: number | null
          title: string
          trade_id: string
        }
        Update: {
          center_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          price?: number | null
          title?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "training_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          applied_at: string
          batch_id: string
          certificate_issued_at: string | null
          id: string
          performance_notes: string | null
          performance_score: number | null
          pipeline_status: Database["public"]["Enums"]["pipeline_status"]
          source: Database["public"]["Enums"]["student_source"]
          student_id: string
        }
        Insert: {
          applied_at?: string
          batch_id: string
          certificate_issued_at?: string | null
          id?: string
          performance_notes?: string | null
          performance_score?: number | null
          pipeline_status?: Database["public"]["Enums"]["pipeline_status"]
          source?: Database["public"]["Enums"]["student_source"]
          student_id: string
        }
        Update: {
          applied_at?: string
          batch_id?: string
          certificate_issued_at?: string | null
          id?: string
          performance_notes?: string | null
          performance_score?: number | null
          pipeline_status?: Database["public"]["Enums"]["pipeline_status"]
          source?: Database["public"]["Enums"]["student_source"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          instructor_id: string | null
          is_live: boolean
          jitsi_room: string
          scheduled_at: string
          title: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          instructor_id?: string | null
          is_live?: boolean
          jitsi_room: string
          scheduled_at: string
          title: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          instructor_id?: string | null
          is_live?: boolean
          jitsi_room?: string
          scheduled_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          center_id: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          center_id?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          center_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "training_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          center_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          nid: string | null
          phone: string | null
          photo_url: string | null
        }
        Insert: {
          address?: string | null
          center_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          nid?: string | null
          phone?: string | null
          photo_url?: string | null
        }
        Update: {
          address?: string | null
          center_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          nid?: string | null
          phone?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "training_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          center_id: string
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          center_id: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          center_id?: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "training_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      training_centers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          center_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          center_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          center_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "training_centers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_center: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "center_admin" | "instructor"
      attendance_status: "present" | "absent" | "late"
      batch_status:
        | "draft"
        | "published"
        | "in_progress"
        | "completed"
        | "archived"
      pipeline_status:
        | "applied"
        | "shortlisted"
        | "training_started"
        | "ongoing"
        | "completed"
        | "certified"
      student_source: "ami_probashi" | "manual"
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
      app_role: ["center_admin", "instructor"],
      attendance_status: ["present", "absent", "late"],
      batch_status: [
        "draft",
        "published",
        "in_progress",
        "completed",
        "archived",
      ],
      pipeline_status: [
        "applied",
        "shortlisted",
        "training_started",
        "ongoing",
        "completed",
        "certified",
      ],
      student_source: ["ami_probashi", "manual"],
    },
  },
} as const
