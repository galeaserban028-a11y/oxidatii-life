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
      avatar_frames: {
        Row: {
          created_at: string
          css_class: string
          emoji: string | null
          id: string
          name: string
          premium_tier_required:
            | Database["public"]["Enums"]["premium_tier"]
            | null
          price_coins: number
        }
        Insert: {
          created_at?: string
          css_class: string
          emoji?: string | null
          id: string
          name: string
          premium_tier_required?:
            | Database["public"]["Enums"]["premium_tier"]
            | null
          price_coins: number
        }
        Update: {
          created_at?: string
          css_class?: string
          emoji?: string | null
          id?: string
          name?: string
          premium_tier_required?:
            | Database["public"]["Enums"]["premium_tier"]
            | null
          price_coins?: number
        }
        Relationships: []
      }
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
          pro_tier: string | null
          pro_until: string | null
          reputation_score: number
          slug: string | null
          tier: Database["public"]["Enums"]["business_tier"]
          tiktok_handle: string | null
          total_reviews: number
          total_visits: number
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
          pro_tier?: string | null
          pro_until?: string | null
          reputation_score?: number
          slug?: string | null
          tier?: Database["public"]["Enums"]["business_tier"]
          tiktok_handle?: string | null
          total_reviews?: number
          total_visits?: number
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
          pro_tier?: string | null
          pro_until?: string | null
          reputation_score?: number
          slug?: string | null
          tier?: Database["public"]["Enums"]["business_tier"]
          tiktok_handle?: string | null
          total_reviews?: number
          total_visits?: number
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          venue_id?: string | null
          verified?: boolean
          wallet_balance_cents?: number
          website?: string | null
        }
        Relationships: []
      }
      business_battles: {
        Row: {
          business_id: string
          category: string
          city_id: string | null
          created_at: string
          id: string
          score: number
          stake_cents: number
          week_start: string
        }
        Insert: {
          business_id: string
          category: string
          city_id?: string | null
          created_at?: string
          id?: string
          score?: number
          stake_cents?: number
          week_start?: string
        }
        Update: {
          business_id?: string
          category?: string
          city_id?: string | null
          created_at?: string
          id?: string
          score?: number
          stake_cents?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_battles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_battles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      business_offers: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          max_redemptions: number | null
          min_user_rating: number | null
          redeemed_count: number
          reward_text: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          max_redemptions?: number | null
          min_user_rating?: number | null
          redeemed_count?: number
          reward_text: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          max_redemptions?: number | null
          min_user_rating?: number | null
          redeemed_count?: number
          reward_text?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reviews: {
        Row: {
          business_id: string
          check_in_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          check_in_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          check_in_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_reviews_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
        ]
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
      chat_gift_catalog: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          price_coins: number
        }
        Insert: {
          created_at?: string
          emoji: string
          id: string
          name: string
          price_coins: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          price_coins?: number
        }
        Relationships: []
      }
      chat_gifts: {
        Row: {
          conversation_id: string
          created_at: string
          gift_id: string
          id: string
          message_id: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          gift_id: string
          id?: string
          message_id?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          gift_id?: string
          id?: string
          message_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "chat_gift_catalog"
            referencedColumns: ["id"]
          },
        ]
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
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_boosts: {
        Row: {
          cost_coins: number
          created_at: string
          expires_at: string
          id: string
          kind: string
          starts_at: string
          target_id: string | null
          user_id: string
        }
        Insert: {
          cost_coins: number
          created_at?: string
          expires_at: string
          id?: string
          kind: string
          starts_at?: string
          target_id?: string | null
          user_id: string
        }
        Update: {
          cost_coins?: number
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          starts_at?: string
          target_id?: string | null
          user_id?: string
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
      coin_spends: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          ref_id?: string | null
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
      offer_redemptions: {
        Row: {
          check_in_id: string | null
          code: string
          id: string
          offer_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          check_in_id?: string | null
          code?: string
          id?: string
          offer_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          check_in_id?: string | null
          code?: string
          id?: string
          offer_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_redemptions_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_redemptions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "business_offers"
            referencedColumns: ["id"]
          },
        ]
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
      private_locations: {
        Row: {
          created_at: string
          id: string
          label: string
          lat: number
          lng: number
          radius_m: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          lat: number
          lng: number
          radius_m?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          lat?: number
          lng?: number
          radius_m?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_frame_id: string | null
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
          map_auto_ghost_hours: number
          map_ghost: boolean
          map_hide_from_live_list: boolean
          map_precision: string
          map_require_reciprocity: boolean
          map_visibility: string
          onboarded: boolean
          premium_tier: Database["public"]["Enums"]["premium_tier"] | null
          premium_until: string | null
          rank: Database["public"]["Enums"]["balkan_rank"]
          updated_at: string
        }
        Insert: {
          active_frame_id?: string | null
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
          map_auto_ghost_hours?: number
          map_ghost?: boolean
          map_hide_from_live_list?: boolean
          map_precision?: string
          map_require_reciprocity?: boolean
          map_visibility?: string
          onboarded?: boolean
          premium_tier?: Database["public"]["Enums"]["premium_tier"] | null
          premium_until?: string | null
          rank?: Database["public"]["Enums"]["balkan_rank"]
          updated_at?: string
        }
        Update: {
          active_frame_id?: string | null
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
          map_auto_ghost_hours?: number
          map_ghost?: boolean
          map_hide_from_live_list?: boolean
          map_precision?: string
          map_require_reciprocity?: boolean
          map_visibility?: string
          onboarded?: boolean
          premium_tier?: Database["public"]["Enums"]["premium_tier"] | null
          premium_until?: string | null
          rank?: Database["public"]["Enums"]["balkan_rank"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_frame_id_fkey"
            columns: ["active_frame_id"]
            isOneToOne: false
            referencedRelation: "avatar_frames"
            referencedColumns: ["id"]
          },
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
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_venue_id_fkey"
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
      user_frames: {
        Row: {
          acquired_at: string
          frame_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          frame_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          frame_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_frames_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "avatar_frames"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      can_view_live_location: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
      claim_business_offer: {
        Args: { _check_in_id?: string; _offer_id: string }
        Returns: Json
      }
      claim_profile_boost: { Args: never; Returns: Json }
      get_business_contact: {
        Args: { _business_id: string }
        Returns: {
          contact_email: string
          contact_phone: string
        }[]
      }
      get_business_wallet: {
        Args: { _business_id: string }
        Returns: {
          monthly_credits_cents: number
          wallet_balance_cents: number
        }[]
      }
      get_profile_card: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          handle: string
          id: string
          is_public: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_business_visit: {
        Args: { _business_id: string }
        Returns: undefined
      }
      is_blocked: { Args: { _a: string; _b: string }; Returns: boolean }
      is_conversation_member: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      iso_week_start: { Args: { _ts: string }; Returns: string }
      spend_coins: {
        Args: { _amount: number; _kind: string; _ref_id?: string }
        Returns: number
      }
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
