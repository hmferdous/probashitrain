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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          sign_in_time: string | null
          sign_out_time: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          marked_by?: string | null
          session_date: string
          sign_in_time?: string | null
          sign_out_time?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          marked_by?: string | null
          session_date?: string
          sign_in_time?: string | null
          sign_out_time?: string | null
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
      batch_branches: {
        Row: {
          batch_id: string
          branch_id: string
          capacity: number
          created_at: string
          id: string
        }
        Insert: {
          batch_id: string
          branch_id: string
          capacity?: number
          created_at?: string
          id?: string
        }
        Update: {
          batch_id?: string
          branch_id?: string
          capacity?: number
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      batch_document_requirements: {
        Row: {
          batch_id: string
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          mandatory: boolean
        }
        Insert: {
          batch_id: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          mandatory?: boolean
        }
        Update: {
          batch_id?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          mandatory?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "batch_document_requirements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          application_deadline: string | null
          capacity: number
          center_id: string
          course_id: string
          created_at: string
          description: string | null
          description_bn: string | null
          duration_unit: Database["public"]["Enums"]["duration_unit"] | null
          duration_value: number | null
          eligibility_education:
            | Database["public"]["Enums"]["education_level"]
            | null
          eligibility_gender:
            | Database["public"]["Enums"]["eligibility_gender"]
            | null
          eligibility_max_age: number | null
          eligibility_min_age: number | null
          end_date: string
          fee_collection: Database["public"]["Enums"]["fee_collection_method"]
          id: string
          instructor_id: string | null
          name: string
          price: number | null
          published_at: string | null
          published_to_ami_probashi: boolean
          requirements_text: string | null
          schedule_notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["batch_status"]
          tags: string[]
        }
        Insert: {
          application_deadline?: string | null
          capacity?: number
          center_id: string
          course_id: string
          created_at?: string
          description?: string | null
          description_bn?: string | null
          duration_unit?: Database["public"]["Enums"]["duration_unit"] | null
          duration_value?: number | null
          eligibility_education?:
            | Database["public"]["Enums"]["education_level"]
            | null
          eligibility_gender?:
            | Database["public"]["Enums"]["eligibility_gender"]
            | null
          eligibility_max_age?: number | null
          eligibility_min_age?: number | null
          end_date: string
          fee_collection?: Database["public"]["Enums"]["fee_collection_method"]
          id?: string
          instructor_id?: string | null
          name: string
          price?: number | null
          published_at?: string | null
          published_to_ami_probashi?: boolean
          requirements_text?: string | null
          schedule_notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["batch_status"]
          tags?: string[]
        }
        Update: {
          application_deadline?: string | null
          capacity?: number
          center_id?: string
          course_id?: string
          created_at?: string
          description?: string | null
          description_bn?: string | null
          duration_unit?: Database["public"]["Enums"]["duration_unit"] | null
          duration_value?: number | null
          eligibility_education?:
            | Database["public"]["Enums"]["education_level"]
            | null
          eligibility_gender?:
            | Database["public"]["Enums"]["eligibility_gender"]
            | null
          eligibility_max_age?: number | null
          eligibility_min_age?: number | null
          end_date?: string
          fee_collection?: Database["public"]["Enums"]["fee_collection_method"]
          id?: string
          instructor_id?: string | null
          name?: string
          price?: number | null
          published_at?: string | null
          published_to_ami_probashi?: boolean
          requirements_text?: string | null
          schedule_notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["batch_status"]
          tags?: string[]
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
      branches: {
        Row: {
          address_bn: string
          address_en: string
          center_id: string
          created_at: string
          email: string
          id: string
          map_link: string | null
          name_bn: string
          name_en: string
          phone: string
          updated_at: string
        }
        Insert: {
          address_bn: string
          address_en: string
          center_id: string
          created_at?: string
          email: string
          id?: string
          map_link?: string | null
          name_bn: string
          name_en: string
          phone: string
          updated_at?: string
        }
        Update: {
          address_bn?: string
          address_en?: string
          center_id?: string
          created_at?: string
          email?: string
          id?: string
          map_link?: string | null
          name_bn?: string
          name_en?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_document_requirements: {
        Row: {
          course_id: string
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          mandatory: boolean
        }
        Insert: {
          course_id: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          mandatory?: boolean
        }
        Update: {
          course_id?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          mandatory?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "course_document_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          center_id: string
          course_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          center_id: string
          course_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          center_id?: string
          course_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          center_id: string
          code: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          description_bn: string | null
          duration_hours: number
          duration_unit: Database["public"]["Enums"]["duration_unit"] | null
          duration_value: number | null
          eligibility_education:
            | Database["public"]["Enums"]["education_level"]
            | null
          eligibility_gender:
            | Database["public"]["Enums"]["eligibility_gender"]
            | null
          eligibility_max_age: number | null
          eligibility_min_age: number | null
          id: string
          price: number | null
          requirements_text: string | null
          tags: string[]
          title: string
        }
        Insert: {
          category?: string | null
          center_id: string
          code: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          description_bn?: string | null
          duration_hours?: number
          duration_unit?: Database["public"]["Enums"]["duration_unit"] | null
          duration_value?: number | null
          eligibility_education?:
            | Database["public"]["Enums"]["education_level"]
            | null
          eligibility_gender?:
            | Database["public"]["Enums"]["eligibility_gender"]
            | null
          eligibility_max_age?: number | null
          eligibility_min_age?: number | null
          id?: string
          price?: number | null
          requirements_text?: string | null
          tags?: string[]
          title: string
        }
        Update: {
          category?: string | null
          center_id?: string
          code?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          description_bn?: string | null
          duration_hours?: number
          duration_unit?: Database["public"]["Enums"]["duration_unit"] | null
          duration_value?: number | null
          eligibility_education?:
            | Database["public"]["Enums"]["education_level"]
            | null
          eligibility_gender?:
            | Database["public"]["Enums"]["eligibility_gender"]
            | null
          eligibility_max_age?: number | null
          eligibility_min_age?: number | null
          id?: string
          price?: number | null
          requirements_text?: string | null
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "training_centers"
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
      payments: {
        Row: {
          amount: number
          center_id: string
          created_at: string
          enrollment_id: string
          id: string
          invoice_no: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          recorded_by: string | null
        }
        Insert: {
          amount: number
          center_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          invoice_no: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          center_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          invoice_no?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
        }
        Relationships: []
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
      student_documents: {
        Row: {
          center_id: string
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          id: string
          label: string | null
          mime_type: string | null
          size_bytes: number | null
          student_id: string
          uploaded_by: string | null
        }
        Insert: {
          center_id: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          id?: string
          label?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          student_id: string
          uploaded_by?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_path?: string
          id?: string
          label?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          student_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "training_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          center_id: string
          created_at: string
          date_of_birth: string | null
          education_level: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          nid: string | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
        }
        Insert: {
          address?: string | null
          center_id: string
          created_at?: string
          date_of_birth?: string | null
          education_level?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id?: string
          nid?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
        }
        Update: {
          address?: string | null
          center_id?: string
          created_at?: string
          date_of_birth?: string | null
          education_level?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          nid?: string | null
          occupation?: string | null
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
      create_training_center: {
        Args: { _address: string; _name: string; _phone: string }
        Returns: {
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
        }
        SetofOptions: {
          from: "*"
          to: "training_centers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invoice_no: { Args: never; Returns: string }
      get_user_center: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      unpublish_expired_batches: { Args: never; Returns: undefined }
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
      document_type:
        | "nid"
        | "education_certificate"
        | "cv"
        | "training_certificate"
        | "photo"
        | "other"
      duration_unit: "hours" | "days" | "weeks" | "months"
      education_level:
        | "none"
        | "jsc"
        | "ssc"
        | "hsc"
        | "diploma"
        | "bachelors"
        | "masters"
      eligibility_gender: "any" | "male" | "female"
      fee_collection_method: "ami_probashi" | "manual"
      payment_method:
        | "cash"
        | "ami_probashi"
        | "bank"
        | "mobile_banking"
        | "other"
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
  graphql_public: {
    Enums: {},
  },
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
      document_type: [
        "nid",
        "education_certificate",
        "cv",
        "training_certificate",
        "photo",
        "other",
      ],
      duration_unit: ["hours", "days", "weeks", "months"],
      education_level: [
        "none",
        "jsc",
        "ssc",
        "hsc",
        "diploma",
        "bachelors",
        "masters",
      ],
      eligibility_gender: ["any", "male", "female"],
      fee_collection_method: ["ami_probashi", "manual"],
      payment_method: [
        "cash",
        "ami_probashi",
        "bank",
        "mobile_banking",
        "other",
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
