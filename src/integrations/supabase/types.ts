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
      check_ins: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          lat: number | null
          lng: number | null
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          chaos_level: number
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          region: string | null
          slug: string
        }
        Insert: {
          chaos_level?: number
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          region?: string | null
          slug: string
        }
        Update: {
          chaos_level?: number
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          region?: string | null
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aura: number
          avatar_url: string | null
          bio: string | null
          city_id: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          lifetime_sprits: number
          location_consent: boolean
          onboarded: boolean
          rank: Database["public"]["Enums"]["balkan_rank"]
          updated_at: string
        }
        Insert: {
          aura?: number
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id: string
          lifetime_sprits?: number
          location_consent?: boolean
          onboarded?: boolean
          rank?: Database["public"]["Enums"]["balkan_rank"]
          updated_at?: string
        }
        Update: {
          aura?: number
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          lifetime_sprits?: number
          location_consent?: boolean
          onboarded?: boolean
          rank?: Database["public"]["Enums"]["balkan_rank"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_fk"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      sprit_proofs: {
        Row: {
          ai_confidence: number | null
          ai_reason: string | null
          ai_verified: boolean
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          photo_url: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_verified?: boolean
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          photo_url: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reason?: string | null
          ai_verified?: boolean
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          photo_url?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprit_proofs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      streets: {
        Row: {
          city_id: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          city_id: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          city_id?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "streets_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          taken_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          taken_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          taken_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          city_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          ig_handle: string | null
          lat: number | null
          lng: number | null
          name: string
          slug: string
          street_id: string
          type: Database["public"]["Enums"]["venue_type"]
          verified: boolean
        }
        Insert: {
          address?: string | null
          city_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ig_handle?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          slug: string
          street_id: string
          type?: Database["public"]["Enums"]["venue_type"]
          verified?: boolean
        }
        Update: {
          address?: string | null
          city_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ig_handle?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          slug?: string
          street_id?: string
          type?: Database["public"]["Enums"]["venue_type"]
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_street_id_fkey"
            columns: ["street_id"]
            isOneToOne: false
            referencedRelation: "streets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      balkan_rank:
        | "MDS"
        | "CRAI_DE_CARTIER"
        | "SPRITARUL"
        | "CAMATARU_DE_PAHAR"
        | "BOIERUL_NOPTII"
        | "REGELE_CENTRULUI"
        | "ZEU_BALCANIC"
      venue_type: "club" | "bar" | "terasa" | "after" | "pub"
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
      balkan_rank: [
        "MDS",
        "CRAI_DE_CARTIER",
        "SPRITARUL",
        "CAMATARU_DE_PAHAR",
        "BOIERUL_NOPTII",
        "REGELE_CENTRULUI",
        "ZEU_BALCANIC",
      ],
      venue_type: ["club", "bar", "terasa", "after", "pub"],
    },
  },
} as const
