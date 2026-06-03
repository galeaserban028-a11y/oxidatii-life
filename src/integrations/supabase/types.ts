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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      business_accounts: {
        Row: {
          address: string | null
          brand_name: string
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          instagram_handle: string | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          monthly_credits_cents: number
          owner_user_id: string
          slug: string | null
          tier: Database["public"]["Enums"]["business_tier"]
          tiktok_handle: string | null
          type: Database["public"]["Enums"]["business_type"]
          updated_at: string
          venue_id: string | null
          verified: boolean
          wallet_balance_cents: number
          website: string | null
        }
        Insert: {
          address?: string | null
          brand_name: string
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_handle?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          monthly_credits_cents?: number
          owner_user_id: string
          slug?: string | null
          tier?: Database["public"]["Enums"]["business_tier"]
          tiktok_handle?: string | null
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          venue_id?: string | null
          verified?: boolean
          wallet_balance_cents?: number
          website?: string | null
        }
        Update: {
          address?: string | null
          brand_name?: string
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_handle?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          monthly_credits_cents?: number
          owner_user_id?: string
          slug?: string | null
          tier?: Database["public"]["Enums"]["business_tier"]
          tiktok_handle?: string | null
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          venue_id?: string | null
          verified?: boolean
          wallet_balance_cents?: number
          website?: string | null
        }
        Relationships: []
      }
      campaign_events: {
        Row: {
          campaign_id: string
          cost_cents: number
          created_at: string
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          cost_cents?: number
          created_at?: string
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          cost_cents?: number
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          bid_cents: number
          budget_cents: number
          business_id: string
          city_id: string | null
          clicks: number
          created_at: string
          cta_text: string | null
          cta_url: string | null
          daily_cap_cents: number
          ends_at: string | null
          entry_kind: string | null
          entry_price_text: string | null
          event_starts_at: string | null
          id: string
          image_urls: string[] | null
          impressions: number
          kind: Database["public"]["Enums"]["campaign_kind"]
          party_id: string | null
          pricing_model: string
          schedule: Json
          special_guest: string | null
          spent_cents: number
          starts_at: string
          status: Database["public"]["Enums"]["campaign_status"]
          street: string | null
          subtitle: string | null
          targeting: Json
          theme_color: string | null
          title: string
          updated_at: string
          venue_id: string | null
          video_url: string | null
        }
        Insert: {
          bid_cents?: number
          budget_cents?: number
          business_id: string
          city_id?: string | null
          clicks?: number
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          daily_cap_cents?: number
          ends_at?: string | null
          entry_kind?: string | null
          entry_price_text?: string | null
          event_starts_at?: string | null
          id?: string
          image_urls?: string[] | null
          impressions?: number
          kind?: Database["public"]["Enums"]["campaign_kind"]
          party_id?: string | null
          pricing_model?: string
          schedule?: Json
          special_guest?: string | null
          spent_cents?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          street?: string | null
          subtitle?: string | null
          targeting?: Json
          theme_color?: string | null
          title: string
          updated_at?: string
          venue_id?: string | null
          video_url?: string | null
        }
        Update: {
          bid_cents?: number
          budget_cents?: number
          business_id?: string
          city_id?: string | null
          clicks?: number
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          daily_cap_cents?: number
          ends_at?: string | null
          entry_kind?: string | null
          entry_price_text?: string | null
          event_starts_at?: string | null
          id?: string
          image_urls?: string[] | null
          impressions?: number
          kind?: Database["public"]["Enums"]["campaign_kind"]
          party_id?: string | null
          pricing_model?: string
          schedule?: Json
          special_guest?: string | null
          spent_cents?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          street?: string | null
          subtitle?: string | null
          targeting?: Json
          theme_color?: string | null
          title?: string
          updated_at?: string
          venue_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenged_id: string
          challenger_id: string
          created_at: string
          id: string
          message: string | null
          status: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          challenged_id: string
          challenger_id: string
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          challenged_id?: string
          challenger_id?: string
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: []
      }
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
          country: string
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
          country?: string
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
          country?: string
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
      coin_purchases: {
        Row: {
          amount_cents: number
          coins: number
          created_at: string
          currency: string
          environment: string
          id: string
          pack_id: string
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          coins: number
          created_at?: string
          currency: string
          environment?: string
          id?: string
          pack_id: string
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          coins?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          pack_id?: string
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: string
          last_message_at: string
          party_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind?: string
          last_message_at?: string
          party_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          last_message_at?: string
          party_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_locations: {
        Row: {
          accuracy: number | null
          expires_at: string
          heading: number | null
          lat: number
          lng: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          expires_at?: string
          heading?: number | null
          lat: number
          lng: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          expires_at?: string
          heading?: number | null
          lat?: number
          lng?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          challenge: boolean
          friend_live: boolean
          new_party_in_city: boolean
          party_join: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge?: boolean
          friend_live?: boolean
          new_party_in_city?: boolean
          party_join?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge?: boolean
          friend_live?: boolean
          new_party_in_city?: boolean
          party_join?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parties: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string
          host_id: string
          id: string
          lat: number | null
          lng: number | null
          location_text: string
          spots_total: number
          starts_at: string
          title: string
          venue_id: string | null
          vibe: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string
          host_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_text: string
          spots_total?: number
          starts_at?: string
          title: string
          venue_id?: string | null
          vibe?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string
          host_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_text?: string
          spots_total?: number
          starts_at?: string
          title?: string
          venue_id?: string | null
          vibe?: string | null
        }
        Relationships: []
      }
      party_joins: {
        Row: {
          created_at: string
          id: string
          note: string | null
          party_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          party_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          party_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_joins_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aura: number
          avatar_url: string | null
          bio: string | null
          city_id: string | null
          coin_balance: number
          created_at: string
          current_streak: number
          display_name: string | null
          handle: string | null
          id: string
          is_public: boolean
          last_streak_week: string | null
          lifetime_sprits: number
          location_consent: boolean
          longest_streak: number
          onboarded: boolean
          premium_tier: Database["public"]["Enums"]["premium_tier"] | null
          premium_until: string | null
          rank: Database["public"]["Enums"]["balkan_rank"]
          updated_at: string
        }
        Insert: {
          aura?: number
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          coin_balance?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          handle?: string | null
          id: string
          is_public?: boolean
          last_streak_week?: string | null
          lifetime_sprits?: number
          location_consent?: boolean
          longest_streak?: number
          onboarded?: boolean
          premium_tier?: Database["public"]["Enums"]["premium_tier"] | null
          premium_until?: string | null
          rank?: Database["public"]["Enums"]["balkan_rank"]
          updated_at?: string
        }
        Update: {
          aura?: number
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          coin_balance?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          handle?: string | null
          id?: string
          is_public?: boolean
          last_streak_week?: string | null
          lifetime_sprits?: number
          location_consent?: boolean
          longest_streak?: number
          onboarded?: boolean
          premium_tier?: Database["public"]["Enums"]["premium_tier"] | null
          premium_until?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
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
          media_type: string
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
          media_type?: string
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
          media_type?: string
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          category: string
          created_at: string
          id: string
          rated_id: string
          rater_id: string
          updated_at: string
          value: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          rated_id: string
          rater_id: string
          updated_at?: string
          value: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          rated_id?: string
          rater_id?: string
          updated_at?: string
          value?: number
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
      venue_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_type: string
          photo_url: string
          taken_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          photo_url: string
          taken_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
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
          opening_hours: Json | null
          phone: string | null
          slug: string
          street_id: string | null
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
          opening_hours?: Json | null
          phone?: string | null
          slug: string
          street_id?: string | null
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
          opening_hours?: Json | null
          phone?: string | null
          slug?: string
          street_id?: string | null
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
      wallet_ledger: {
        Row: {
          amount_cents: number
          business_id: string
          campaign_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note: string | null
        }
        Insert: {
          amount_cents: number
          business_id: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
        }
        Update: {
          amount_cents?: number
          business_id?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      business_accounts_public: {
        Row: {
          address: string | null
          brand_name: string | null
          city_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string | null
          instagram_handle: string | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          slug: string | null
          tier: Database["public"]["Enums"]["business_tier"] | null
          tiktok_handle: string | null
          type: Database["public"]["Enums"]["business_type"] | null
          venue_id: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          brand_name?: string | null
          city_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          instagram_handle?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          slug?: string | null
          tier?: Database["public"]["Enums"]["business_tier"] | null
          tiktok_handle?: string | null
          type?: Database["public"]["Enums"]["business_type"] | null
          venue_id?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          brand_name?: string | null
          city_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          instagram_handle?: string | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          slug?: string | null
          tier?: Database["public"]["Enums"]["business_tier"] | null
          tiktok_handle?: string | null
          type?: Database["public"]["Enums"]["business_type"] | null
          venue_id?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      can_view_profile: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _a: string; _b: string }; Returns: boolean }
      is_conversation_member: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      iso_week_start: { Args: { _ts: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator"
      balkan_rank:
        | "MDS"
        | "CRAI_DE_CARTIER"
        | "SPRITARUL"
        | "CAMATARU_DE_PAHAR"
        | "BOIERUL_NOPTII"
        | "REGELE_CENTRULUI"
        | "ZEU_BALCANIC"
      business_tier: "starter" | "growth" | "pro" | "elite"
      business_type: "club" | "bar" | "festival" | "promoter" | "host" | "beach"
      campaign_kind:
        | "boost_feed"
        | "boost_map"
        | "boost_discover"
        | "boost_story"
        | "boost_push"
        | "boost_brand"
      campaign_status: "draft" | "active" | "paused" | "exhausted" | "ended"
      ledger_kind: "topup" | "spend" | "refund" | "bonus" | "adjustment"
      premium_tier: "vip" | "vip_plus" | "pro" | "elite"
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
      app_role: ["admin", "moderator"],
      balkan_rank: [
        "MDS",
        "CRAI_DE_CARTIER",
        "SPRITARUL",
        "CAMATARU_DE_PAHAR",
        "BOIERUL_NOPTII",
        "REGELE_CENTRULUI",
        "ZEU_BALCANIC",
      ],
      business_tier: ["starter", "growth", "pro", "elite"],
      business_type: ["club", "bar", "festival", "promoter", "host", "beach"],
      campaign_kind: [
        "boost_feed",
        "boost_map",
        "boost_discover",
        "boost_story",
        "boost_push",
        "boost_brand",
      ],
      campaign_status: ["draft", "active", "paused", "exhausted", "ended"],
      ledger_kind: ["topup", "spend", "refund", "bonus", "adjustment"],
      premium_tier: ["vip", "vip_plus", "pro", "elite"],
      venue_type: ["club", "bar", "terasa", "after", "pub"],
    },
  },
} as const
