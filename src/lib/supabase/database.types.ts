
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            "couple_balance": {
                  Row: {
                    "net_minor": string | null,"paid_minor": string | null,"settled_in_minor": string | null,"settled_out_minor": string | null,"share_minor": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"couple_expenses": {
                  Row: {
                    "amount_minor": string | null,"category_id": string | null,"created_at": string | null,"created_by": string | null,"description": string | null,"id": string | null,"moved_from_me": boolean | null,"parts": Json | null,"payer_user_id": string | null,"split_mode": string | null,"split_percents": (number)[] | null,"transaction_date": string | null,"updated_at": string | null,"updated_by": string | null,"version": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "amount_minor"?: never,"category_id"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"description"?: string | null,"id"?: string | null,"moved_from_me"?: never,"parts"?: never,"payer_user_id"?: string | null,"split_mode"?: string | null,"split_percents"?: (number)[] | null,"transaction_date"?: string | null,"updated_at"?: string | null,"updated_by"?: string | null,"version"?: number | null
                         }
                        Update: {
                           "amount_minor"?: never,"category_id"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"description"?: string | null,"id"?: string | null,"moved_from_me"?: never,"parts"?: never,"payer_user_id"?: string | null,"split_mode"?: string | null,"split_percents"?: (number)[] | null,"transaction_date"?: string | null,"updated_at"?: string | null,"updated_by"?: string | null,"version"?: number | null
                         }
                        Relationships: [
                    
                  ]
                },"couple_members": {
                  Row: {
                    "display_name": string | null,"join_order": number | null,"role": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"couple_month_summary": {
                  Row: {
                    "by_category": Json | null,"count": number | null,"month": string | null,"total_minor": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"couple_settlements": {
                  Row: {
                    "amount_minor": string | null,"created_at": string | null,"created_by": string | null,"from_user_id": string | null,"id": string | null,"note": string | null,"settlement_date": string | null,"status": string | null,"to_user_id": string | null,"version": number | null,"voided_at": string | null,"voided_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "amount_minor"?: never,"created_at"?: string | null,"created_by"?: string | null,"from_user_id"?: string | null,"id"?: string | null,"note"?: string | null,"settlement_date"?: string | null,"status"?: string | null,"to_user_id"?: string | null,"version"?: number | null,"voided_at"?: string | null,"voided_by"?: string | null
                         }
                        Update: {
                           "amount_minor"?: never,"created_at"?: string | null,"created_by"?: string | null,"from_user_id"?: string | null,"id"?: string | null,"note"?: string | null,"settlement_date"?: string | null,"status"?: string | null,"to_user_id"?: string | null,"version"?: number | null,"voided_at"?: string | null,"voided_by"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"couple_transaction_months": {
                  Row: {
                    "count": number | null,"month": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"me_month_summary": {
                  Row: {
                    "by_category": Json | null,"consumption_minor": string | null,"month": string | null,"private_minor": string | null,"shared_part_minor": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"my_couple": {
                  Row: {
                    "group_id": string | null,"invitation_email": string | null,"invitation_expired": boolean | null,"invitation_expires_at": string | null,"invitation_id": string | null,"join_order": number | null,"role": string | null,"status": string | null,"version": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"my_profile": {
                  Row: {
                    "display_name": string | null,"first_entry_completed": boolean | null,"theme": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "display_name"?: string | null,"first_entry_completed"?: never,"theme"?: string | null
                         }
                        Update: {
                           "display_name"?: string | null,"first_entry_completed"?: never,"theme"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"my_recent_categories": {
                  Row: {
                    "category_id": string | null,"last_used_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"my_shared_parts": {
                  Row: {
                    "amount_minor": string | null,"category_id": string | null,"description": string | null,"id": string | null,"my_part_minor": string | null,"payer_user_id": string | null,"transaction_date": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"my_transaction_months": {
                  Row: {
                    "count": number | null,"month": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"my_transactions": {
                  Row: {
                    "amount_minor": string | null,"category_id": string | null,"created_at": string | null,"currency": string | null,"description": string | null,"id": string | null,"moved_to_transaction_id": string | null,"transaction_date": string | null,"type": string | null,"updated_at": string | null,"version": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "amount_minor"?: never,"category_id"?: string | null,"created_at"?: string | null,"currency"?: string | null,"description"?: string | null,"id"?: string | null,"moved_to_transaction_id"?: string | null,"transaction_date"?: string | null,"type"?: string | null,"updated_at"?: string | null,"version"?: number | null
                         }
                        Update: {
                           "amount_minor"?: never,"category_id"?: string | null,"created_at"?: string | null,"currency"?: string | null,"description"?: string | null,"id"?: string | null,"moved_to_transaction_id"?: string | null,"transaction_date"?: string | null,"type"?: string | null,"updated_at"?: string | null,"version"?: number | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "complete_first_entry":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"create_transaction":
{ Args: { "p_amount_minor": string,"p_category_id": string,"p_description": string,"p_idempotency_key": string,"p_transaction_date": string,"p_type": string }; Returns: Json
                           },
"ensure_profile":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"set_theme":
{ Args: { "p_theme": string }; Returns: Json
                           },
"update_display_name":
{ Args: { "p_display_name": string }; Returns: Json
                           },
"update_transaction":
{ Args: { "p_amount_minor": string,"p_category_id": string,"p_description": string,"p_expected_version": number,"p_idempotency_key": string,"p_transaction_date": string,"p_transaction_id": string }; Returns: Json
                           },
"void_transaction":
{ Args: { "p_expected_version": number,"p_idempotency_key": string,"p_reason": string,"p_transaction_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
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
  "public": {
          Enums: {
            
          }
        }
} as const
