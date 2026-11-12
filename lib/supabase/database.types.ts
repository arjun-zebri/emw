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
          languages: string | null
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
          languages?: string | null
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
          languages?: string | null
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
      error_alert_state: {
        Row: { id: boolean; pruned_on: string | null; storm_at: string | null }
        Insert: { id?: boolean; pruned_on?: string | null; storm_at?: string | null }
        Update: { id?: boolean; pruned_on?: string | null; storm_at?: string | null }
        Relationships: []
      }
      error_events: {
        Row: { at: string; browser: string | null; context: Json; digest: string | null; fingerprint: string; id: number; method: string | null; release: string | null; route: string | null }
        Insert: { at?: string; browser?: string | null; context?: Json; digest?: string | null; fingerprint: string; id?: never; method?: string | null; release?: string | null; route?: string | null }
        Update: { at?: string; browser?: string | null; context?: Json; digest?: string | null; fingerprint?: string; id?: never; method?: string | null; release?: string | null; route?: string | null }
        Relationships: [
          { foreignKeyName: "error_events_fingerprint_fkey"; columns: ["fingerprint"]; isOneToOne: false; referencedRelation: "error_issues"; referencedColumns: ["fingerprint"] },
        ]
      }
      error_issues: {
        Row: {
          alerts_sent: number
          area: string
          count: number
          env: string
          fingerprint: string
          first_release: string | null
          first_seen: string
          last_alerted_at: string | null
          last_release: string | null
          last_seen: string
          resolved_at: string | null
          route: string | null
          sample_stack: string | null
          severity: string
          source: string
          title: string
        }
        Insert: {
          alerts_sent?: number
          area: string
          count?: number
          env: string
          fingerprint: string
          first_release?: string | null
          first_seen?: string
          last_alerted_at?: string | null
          last_release?: string | null
          last_seen?: string
          resolved_at?: string | null
          route?: string | null
          sample_stack?: string | null
          severity: string
          source: string
          title: string
        }
        Update: {
          alerts_sent?: number
          area?: string
          count?: number
          env?: string
          fingerprint?: string
          first_release?: string | null
          first_seen?: string
          last_alerted_at?: string | null
          last_release?: string | null
          last_seen?: string
          resolved_at?: string | null
          route?: string | null
          sample_stack?: string | null
          severity?: string
          source?: string
          title?: string
        }
        Relationships: []
      }
      form_attempts: {
        Row: {
          created_at: string
          key_hash: string
          kind: string
        }
        Insert: {
          created_at?: string
          key_hash: string
          kind: string
        }
        Update: {
          created_at?: string
          key_hash?: string
          kind?: string
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
      post_edits: {
        Row: {
          data: Json
          post_id: string
          updated_at: string
        }
        Insert: {
          data: Json
          post_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_edits_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
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
          cover_height: number | null
          cover_path: string | null
          cover_width: number | null
          created_at: string
          description: string
          id: string
          old_slugs: string[]
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
          cover_height?: number | null
          cover_path?: string | null
          cover_width?: number | null
          created_at?: string
          description?: string
          id?: string
          old_slugs?: string[]
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
          cover_height?: number | null
          cover_path?: string | null
          cover_width?: number | null
          created_at?: string
          description?: string
          id?: string
          old_slugs?: string[]
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
      vendor_views: {
        Row: { day: string; vendor_id: string; views: number }
        Insert: { day: string; vendor_id: string; views?: number }
        Update: { day?: string; vendor_id?: string; views?: number }
        Relationships: [
          {
            foreignKeyName: "vendor_views_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
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
          stats_enabled: boolean
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
          stats_enabled?: boolean
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
          stats_enabled?: boolean
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
      next_post_at: { Args: never; Returns: string }
      post_reads: {
        Args: never
        Returns: { last_30: number; slug: string; views: number }[]
      }
      decide_vendor: {
        Args: { note?: string; vendor: string; verdict: Database["public"]["Enums"]["vendor_verdict"] }
        Returns: undefined
      }
      is_team: { Args: never; Returns: boolean }
      is_team_owner: { Args: never; Returns: boolean }
      is_vendor_member: { Args: { vendor: string }; Returns: boolean }
      record_page_view: {
        Args: {
          p_city: string
          p_campaign: string
          p_country: string
          p_device: string
          p_ident: string
          p_lat?: number
          p_lon?: number
          p_path: string
          p_referrer: string
          p_region: string
        }
        Returns: undefined
      }
      record_site_filter: { Args: { p_ident: string; p_kind: string; p_values: string[] }; Returns: undefined }
      record_error: {
        Args: {
          p_area: string
          p_browser: string
          p_context: Json
          p_digest: string
          p_env: string
          p_fingerprint: string
          p_method: string
          p_release: string
          p_route: string
          p_severity: string
          p_source: string
          p_stack: string
          p_title: string
        }
        Returns: Json
      }
      record_site_search: { Args: { p_ident: string; p_matches: number; p_query: string }; Returns: undefined }
      traffic_live: { Args: never; Returns: number }
      traffic_summary: {
        Args: {
          first_day: string
          last_day: string
          prev_first?: string
          prev_last?: string
          p_channel?: string
          p_sites?: string[]
          p_campaign?: string
          p_country?: string
          p_region?: string
          p_city?: string
          p_vendor?: string
        }
        Returns: Json
      }
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
