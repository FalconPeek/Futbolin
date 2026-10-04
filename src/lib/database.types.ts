
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "group_members": {
                  Row: {
                    "group_id": string,"joined_at": string | null,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Insert: {
                    "group_id": string,"joined_at"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "created_at": string | null,"created_by": string,"id": string,"invite_code": string,"name": string
                  }
                  Insert: {
                    "created_at"?: string | null,"created_by"?: string,"id"?: string,"invite_code": string,"name": string
                  }
                  Update: {
                    "created_at"?: string | null,"created_by"?: string,"id"?: string,"invite_code"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_players": {
                  Row: {
                    "assists": number,"attendance": Database["public"]['Enums']["attendance_status"],"created_at": string | null,"goals": number,"match_id": string,"team": Database["public"]['Enums']["team_side"] | null,"user_id": string
                  }
                  Insert: {
                    "assists"?: number,"attendance"?: Database["public"]['Enums']["attendance_status"],"created_at"?: string | null,"goals"?: number,"match_id": string,"team"?: Database["public"]['Enums']["team_side"] | null,"user_id": string
                  }
                  Update: {
                    "assists"?: number,"attendance"?: Database["public"]['Enums']["attendance_status"],"created_at"?: string | null,"goals"?: number,"match_id"?: string,"team"?: Database["public"]['Enums']["team_side"] | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_players_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "created_at": string | null,"created_by": string,"finalized_at": string | null,"group_id": string,"id": string,"location": string,"players_per_team": number,"scheduled_at": string,"score_a": number | null,"score_b": number | null,"status": Database["public"]['Enums']["match_status"]
                  }
                  Insert: {
                    "created_at"?: string | null,"created_by"?: string,"finalized_at"?: string | null,"group_id": string,"id"?: string,"location": string,"players_per_team"?: number,"scheduled_at": string,"score_a"?: number | null,"score_b"?: number | null,"status"?: Database["public"]['Enums']["match_status"]
                  }
                  Update: {
                    "created_at"?: string | null,"created_by"?: string,"finalized_at"?: string | null,"group_id"?: string,"id"?: string,"location"?: string,"players_per_team"?: number,"scheduled_at"?: string,"score_a"?: number | null,"score_b"?: number | null,"status"?: Database["public"]['Enums']["match_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"mvp_votes": {
                  Row: {
                    "created_at": string | null,"match_id": string,"voted_id": string,"voter_id": string
                  }
                  Insert: {
                    "created_at"?: string | null,"match_id": string,"voted_id": string,"voter_id"?: string
                  }
                  Update: {
                    "created_at"?: string | null,"match_id"?: string,"voted_id"?: string,"voter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mvp_votes_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mvp_votes_voted_id_fkey"
      columns: ["voted_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mvp_votes_voter_id_fkey"
      columns: ["voter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"player_ratings": {
                  Row: {
                    "group_id": string,"kind": Database["public"]['Enums']["rating_kind"],"rated_id": string,"rater_id": string,"s1": number,"s2": number,"s3": number,"s4": number,"s5": number,"s6": number,"updated_at": string | null
                  }
                  Insert: {
                    "group_id": string,"kind": Database["public"]['Enums']["rating_kind"],"rated_id": string,"rater_id"?: string,"s1": number,"s2": number,"s3": number,"s4": number,"s5": number,"s6": number,"updated_at"?: string | null
                  }
                  Update: {
                    "group_id"?: string,"kind"?: Database["public"]['Enums']["rating_kind"],"rated_id"?: string,"rater_id"?: string,"s1"?: number,"s2"?: number,"s3"?: number,"s4"?: number,"s5"?: number,"s6"?: number,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "player_ratings_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_ratings_rated_id_fkey"
      columns: ["rated_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_ratings_rater_id_fkey"
      columns: ["rater_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string | null,"display_name": string,"id": string,"nickname": string | null,"position": Database["public"]['Enums']["player_position"]
                  }
                  Insert: {
                    "created_at"?: string | null,"display_name": string,"id": string,"nickname"?: string | null,"position"?: Database["public"]['Enums']["player_position"]
                  }
                  Update: {
                    "created_at"?: string | null,"display_name"?: string,"id"?: string,"nickname"?: string | null,"position"?: Database["public"]['Enums']["player_position"]
                  }
                  Relationships: [
                    
                  ]
                },"tournament_matches": {
                  Row: {
                    "away_pens": number | null,"away_score": number | null,"away_team_id": string | null,"created_at": string | null,"home_pens": number | null,"home_score": number | null,"home_team_id": string | null,"id": string,"round": number,"slot": number,"status": Database["public"]['Enums']["tmatch_status"],"tournament_id": string
                  }
                  Insert: {
                    "away_pens"?: number | null,"away_score"?: number | null,"away_team_id"?: string | null,"created_at"?: string | null,"home_pens"?: number | null,"home_score"?: number | null,"home_team_id"?: string | null,"id"?: string,"round": number,"slot": number,"status"?: Database["public"]['Enums']["tmatch_status"],"tournament_id": string
                  }
                  Update: {
                    "away_pens"?: number | null,"away_score"?: number | null,"away_team_id"?: string | null,"created_at"?: string | null,"home_pens"?: number | null,"home_score"?: number | null,"home_team_id"?: string | null,"id"?: string,"round"?: number,"slot"?: number,"status"?: Database["public"]['Enums']["tmatch_status"],"tournament_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournament_matches_away_team_id_fkey"
      columns: ["away_team_id"]
isOneToOne: false
      referencedRelation: "tournament_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_matches_home_team_id_fkey"
      columns: ["home_team_id"]
isOneToOne: false
      referencedRelation: "tournament_teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournament_matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"tournament_teams": {
                  Row: {
                    "color": string,"created_at": string | null,"id": string,"name": string,"tournament_id": string
                  }
                  Insert: {
                    "color": string,"created_at"?: string | null,"id"?: string,"name": string,"tournament_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string | null,"id"?: string,"name"?: string,"tournament_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournament_teams_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"tournaments": {
                  Row: {
                    "created_at": string | null,"created_by": string,"format": Database["public"]['Enums']["tournament_format"],"group_id": string,"id": string,"legs": number,"name": string,"status": Database["public"]['Enums']["tournament_status"]
                  }
                  Insert: {
                    "created_at"?: string | null,"created_by"?: string,"format": Database["public"]['Enums']["tournament_format"],"group_id": string,"id"?: string,"legs"?: number,"name": string,"status"?: Database["public"]['Enums']["tournament_status"]
                  }
                  Update: {
                    "created_at"?: string | null,"created_by"?: string,"format"?: Database["public"]['Enums']["tournament_format"],"group_id"?: string,"id"?: string,"legs"?: number,"name"?: string,"status"?: Database["public"]['Enums']["tournament_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "tournaments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tournaments_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "assign_teams":
{ Args: { "p_assignments": Json,"p_match_id": string }; Returns: undefined
                           },
"create_group":
{ Args: { "p_name": string }; Returns: string
                           },
"finalize_match":
{ Args: { "p_match_id": string,"p_score_a": number,"p_score_b": number,"p_stats": Json }; Returns: undefined
                           },
"generate_invite_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_group_cards":
{ Args: { "p_group_id": string }; Returns: {
              "display_name": string,"kind": Database["public"]['Enums']["rating_kind"],"nickname": string,"position": Database["public"]['Enums']["player_position"],"raters": number,"s1": number,"s2": number,"s3": number,"s4": number,"s5": number,"s6": number,"user_id": string
            }[]
                           },
"get_match_mvp_summary":
{ Args: { "p_match_id": string }; Returns: {
              "closed": boolean,"eligible": number,"mvp_ids": (string)[],"my_vote": string,"votes_cast": number
            }[]
                           },
"is_group_admin":
{ Args: { "gid": string }; Returns: boolean
                           },
"is_group_member":
{ Args: { "gid": string }; Returns: boolean
                           },
"is_match_organizer":
{ Args: { "mid": string }; Returns: boolean
                           },
"is_tournament_organizer":
{ Args: { "tid": string }; Returns: boolean
                           },
"join_group":
{ Args: { "p_code": string }; Returns: string
                           },
"leave_group":
{ Args: { "p_group_id": string }; Returns: undefined
                           },
"match_group_id":
{ Args: { "mid": string }; Returns: string
                           },
"rating_kind_for":
{ Args: { "uid": string }; Returns: Database["public"]['Enums']["rating_kind"]
                           },
"remove_member":
{ Args: { "p_group_id": string,"p_user_id": string }; Returns: undefined
                           },
"report_tournament_result":
{ Args: { "p_away": number,"p_away_pens"?: number,"p_home": number,"p_home_pens"?: number,"p_match_id": string }; Returns: undefined
                           },
"set_attendance":
{ Args: { "p_match_id": string,"p_status": Database["public"]['Enums']["attendance_status"] }; Returns: undefined
                           },
"set_member_role":
{ Args: { "p_group_id": string,"p_role": Database["public"]['Enums']["member_role"],"p_user_id": string }; Returns: undefined
                           },
"shares_group":
{ Args: { "uid": string }; Returns: boolean
                           },
"start_tournament":
{ Args: { "p_fixtures": Json,"p_tournament_id": string }; Returns: undefined
                           },
"tournament_group_id":
{ Args: { "tid": string }; Returns: string
                           },
"vote_mvp":
{ Args: { "p_match_id": string,"p_voted_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "attendance_status": "confirmado"|"baja","match_status": "programado"|"finalizado"|"cancelado","member_role": "admin"|"member","player_position": "POR"|"LI"|"DFC"|"LD"|"CAI"|"CAD"|"MCD"|"MC"|"MCO"|"MI"|"MD"|"EI"|"ED"|"SD"|"DC","rating_kind": "campo"|"arquero","team_side": "A"|"B","tmatch_status": "pendiente"|"jugado","tournament_format": "liga"|"eliminacion","tournament_status": "borrador"|"en_curso"|"finalizado"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "attendance_status": ["confirmado", "baja"],"match_status": ["programado", "finalizado", "cancelado"],"member_role": ["admin", "member"],"player_position": ["POR", "LI", "DFC", "LD", "CAI", "CAD", "MCD", "MC", "MCO", "MI", "MD", "EI", "ED", "SD", "DC"],"rating_kind": ["campo", "arquero"],"team_side": ["A", "B"],"tmatch_status": ["pendiente", "jugado"],"tournament_format": ["liga", "eliminacion"],"tournament_status": ["borrador", "en_curso", "finalizado"]
          }
        }
} as const
