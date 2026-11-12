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
      email_switches: {
        Row: {
          enabled: boolean
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled: boolean
          id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          created_at: string
          cultures: string[]
          email: string
          emailed_to: string | null
          guests: string | null
          id: string
          message: string
          name: string
          phone: string | null
          read_at: string | null
          region: string | null
          replied_at: string | null
          source: string | null
          source_detail: string | null
          traditions: string | null
          vendor_id: string
          venue: string | null
          wedding_date: string | null
        }
        Insert: {
          created_at?: string
          cultures?: string[]
          email: string
          emailed_to?: string | null
          guests?: string | null
          id?: string
          message?: string
          name: string
          phone?: string | null
          read_at?: string | null
          region?: string | null
          replied_at?: string | null
          source?: string | null
          source_detail?: string | null
          traditions?: string | null
          vendor_id: string
          venue?: string | null
          wedding_date?: string | null
        }
        Update: {
          created_at?: string
          cultures?: string[]
          email?: string
          emailed_to?: string | null
          guests?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          read_at?: string | null
          region?: string | null
          replied_at?: string | null
          source?: string | null
          source_detail?: string | null
          traditions?: string | null
          vendor_id?: string
          venue?: string | null
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_attempts: {
        Row: {
          created_at: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          ip_hash?: string
        }
        Relationships: []
      }
      post_vendors: {
        Row: {
          position: number
          post_id: string
          vendor_id: string
        }
        Insert: {
          position?: number
          post_id: string
          vendor_id: string
        }
        Update: {
          position?: number
          post_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_vendors_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author: string
          body: Json
          category: string
          cover_alt: string
          cover_path: string | null
          created_at: string
          description: string
          id: string
          published_at: string | null
          slug: string
          standfirst: string
          status: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          body?: Json
          category: string
          cover_alt?: string
          cover_path?: string | null
          created_at?: string
          description?: string
          id?: string
          published_at?: string | null
          slug: string
          standfirst?: string
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          body?: Json
          category?: string
          cover_alt?: string
          cover_path?: string | null
          created_at?: string
          description?: string
          id?: string
          published_at?: string | null
          slug?: string
          standfirst?: string
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          name: string | null
          role: Database["public"]["Enums"]["team_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          name?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          name?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_decisions: {
        Row: {
          created_at: string
          decided_by: string | null
          id: string
          note: string
          vendor_id: string
          verdict: Database["public"]["Enums"]["vendor_verdict"]
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          id?: string
          note?: string
          vendor_id: string
          verdict: Database["public"]["Enums"]["vendor_verdict"]
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          id?: string
          note?: string
          vendor_id?: string
          verdict?: Database["public"]["Enums"]["vendor_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "vendor_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendor_decisions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_members: {
        Row: {
          created_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_members_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_photos: {
        Row: {
          alt: string
          created_at: string
          height: number | null
          id: string
          path: string
          position: number
          vendor_id: string
          width: number | null
        }
        Insert: {
          alt?: string
          created_at?: string
          height?: number | null
          id?: string
          path: string
          position?: number
          vendor_id: string
          width?: number | null
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number | null
          id?: string
          path?: string
          position?: number
          vendor_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_photos_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_review_notes: {
        Row: {
          applicant_id: string | null
          categories_original: string | null
          confidence: Database["public"]["Enums"]["review_confidence"] | null
          created_at: string
          notes: string
          registered_emails: string | null
          source: string
          updated_at: string
          vendor_id: string
          years_attended: string | null
        }
        Insert: {
          applicant_id?: string | null
          categories_original?: string | null
          confidence?: Database["public"]["Enums"]["review_confidence"] | null
          created_at?: string
          notes?: string
          registered_emails?: string | null
          source?: string
          updated_at?: string
          vendor_id: string
          years_attended?: string | null
        }
        Update: {
          applicant_id?: string | null
          categories_original?: string | null
          confidence?: Database["public"]["Enums"]["review_confidence"] | null
          created_at?: string
          notes?: string
          registered_emails?: string | null
          source?: string
          updated_at?: string
          vendor_id?: string
          years_attended?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_review_notes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          based: string | null
          created_at: string
          discipline: string
          email: string | null
          facebook: string | null
          featured: boolean
          large_tile: boolean
          id: string
          instagram: string | null
          languages: string[]
          lede: string
          legacy_slug: string | null
          name: string
          person: string | null
          phone: string | null
          quote: string | null
          service_area: string[]
          services: string[]
          signoff: string | null
          slug: string
          status: Database["public"]["Enums"]["vendor_status"]
          story: string[]
          travels: string | null
          updated_at: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          based?: string | null
          created_at?: string
          discipline?: string
          email?: string | null
          facebook?: string | null
          featured?: boolean
          large_tile?: boolean
          id?: string
          instagram?: string | null
          languages?: string[]
          lede?: string
          legacy_slug?: string | null
          name: string
          person?: string | null
          phone?: string | null
          quote?: string | null
          service_area?: string[]
          services?: string[]
          signoff?: string | null
          slug: string
          status?: Database["public"]["Enums"]["vendor_status"]
          story?: string[]
          travels?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          based?: string | null
          created_at?: string
          discipline?: string
          email?: string | null
          facebook?: string | null
          featured?: boolean
          large_tile?: boolean
          id?: string
          instagram?: string | null
          languages?: string[]
          lede?: string
          legacy_slug?: string | null
          name?: string
          person?: string | null
          phone?: string | null
          quote?: string | null
          service_area?: string[]
          services?: string[]
          signoff?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          story?: string[]
          travels?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vendor_queue: {
        Row: {
          confidence: Database["public"]["Enums"]["review_confidence"] | null
          cover_path: string | null
          created_at: string
          discipline: string
          flags: string[]
          id: string
          missing: string[]
          name: string
          photo_count: number
          readiness: number
          slug: string
          status: Database["public"]["Enums"]["vendor_status"]
        }
        Relationships: []
      }
    }
    Functions: {
      can_write_vendor_photo: {
        Args: { object_name: string }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      decide_vendor: {
        Args: { note?: string; vendor: string; verdict: Database["public"]["Enums"]["vendor_verdict"] }
        Returns: undefined
      }
      is_team: { Args: never; Returns: boolean }
      is_team_owner: { Args: never; Returns: boolean }
      is_vendor_member: { Args: { vendor: string }; Returns: boolean }
    }
    Enums: {
      post_status: "draft" | "scheduled" | "published"
      review_confidence: "High" | "Medium" | "Low"
      team_role: "owner" | "editor"
      vendor_verdict: "approved" | "declined" | "reopened"
      vendor_status: "draft" | "published" | "hidden"
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
      post_status: ["draft", "scheduled", "published"],
      review_confidence: ["High", "Medium", "Low"],
      team_role: ["owner", "editor"],
      vendor_verdict: ["approved", "declined", "reopened"],
      vendor_status: ["draft", "published", "hidden"],
    },
  },
} as const
