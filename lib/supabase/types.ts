export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      ActiveDay: {
        Row: {
          createdAt: string
          date: string
          id: string
          templateId: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          date: string
          id: string
          templateId?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          date?: string
          id?: string
          templateId?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ActiveDay_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ActiveTask: {
        Row: {
          blockId: string
          completed: boolean
          createdAt: string
          id: string
          orderIndex: number
          title: string
          updatedAt: string
        }
        Insert: {
          blockId: string
          completed?: boolean
          createdAt?: string
          id: string
          orderIndex: number
          title: string
          updatedAt: string
        }
        Update: {
          blockId?: string
          completed?: boolean
          createdAt?: string
          id?: string
          orderIndex?: number
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ActiveTask_blockId_fkey"
            columns: ["blockId"]
            isOneToOne: false
            referencedRelation: "ActiveTimeBlock"
            referencedColumns: ["id"]
          },
        ]
      }
      ActiveTimeBlock: {
        Row: {
          completionRate: number
          createdAt: string
          dayId: string
          id: string
          orderIndex: number
          startTime: string
          title: string
          updatedAt: string
        }
        Insert: {
          completionRate?: number
          createdAt?: string
          dayId: string
          id: string
          orderIndex: number
          startTime: string
          title: string
          updatedAt: string
        }
        Update: {
          completionRate?: number
          createdAt?: string
          dayId?: string
          id?: string
          orderIndex?: number
          startTime?: string
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ActiveTimeBlock_dayId_fkey"
            columns: ["dayId"]
            isOneToOne: false
            referencedRelation: "ActiveDay"
            referencedColumns: ["id"]
          },
        ]
      }
      ContinuousHabit: {
        Row: {
          category: string
          createdAt: string
          id: string
          isActive: boolean
          reminderTime: string | null
          startDate: string
          targetDays: number
          title: string
          updatedAt: string
          userId: string
        }
        Insert: {
          category: string
          createdAt?: string
          id: string
          isActive?: boolean
          reminderTime?: string | null
          startDate: string
          targetDays?: number
          title: string
          updatedAt: string
          userId: string
        }
        Update: {
          category?: string
          createdAt?: string
          id?: string
          isActive?: boolean
          reminderTime?: string | null
          startDate?: string
          targetDays?: number
          title?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ContinuousHabit_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      DailyEvaluation: {
        Row: {
          comment: string | null
          createdAt: string
          date: string
          id: string
          rating: number
          updatedAt: string
          userId: string
        }
        Insert: {
          comment?: string | null
          createdAt?: string
          date: string
          id: string
          rating: number
          updatedAt: string
          userId: string
        }
        Update: {
          comment?: string | null
          createdAt?: string
          date?: string
          id?: string
          rating?: number
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "DailyEvaluation_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      DayTemplate: {
        Row: {
          createdAt: string
          id: string
          name: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          name: string
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "DayTemplate_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      HabitHistory: {
        Row: {
          category: string
          completedDays: number
          createdAt: string
          endDate: string
          id: string
          startDate: string
          status: string
          title: string
          totalDays: number
          userId: string
        }
        Insert: {
          category: string
          completedDays: number
          createdAt?: string
          endDate: string
          id: string
          startDate: string
          status: string
          title: string
          totalDays: number
          userId: string
        }
        Update: {
          category?: string
          completedDays?: number
          createdAt?: string
          endDate?: string
          id?: string
          startDate?: string
          status?: string
          title?: string
          totalDays?: number
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "HabitHistory_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      HabitRecord: {
        Row: {
          completed: boolean
          createdAt: string
          date: string
          habitId: string
          id: string
        }
        Insert: {
          completed: boolean
          createdAt?: string
          date: string
          habitId: string
          id: string
        }
        Update: {
          completed?: boolean
          createdAt?: string
          date?: string
          habitId?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "HabitRecord_habitId_fkey"
            columns: ["habitId"]
            isOneToOne: false
            referencedRelation: "ContinuousHabit"
            referencedColumns: ["id"]
          },
        ]
      }
      TemplateTask: {
        Row: {
          blockId: string
          createdAt: string
          id: string
          orderIndex: number
          title: string
          updatedAt: string
        }
        Insert: {
          blockId: string
          createdAt?: string
          id: string
          orderIndex: number
          title: string
          updatedAt: string
        }
        Update: {
          blockId?: string
          createdAt?: string
          id?: string
          orderIndex?: number
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "TemplateTask_blockId_fkey"
            columns: ["blockId"]
            isOneToOne: false
            referencedRelation: "TemplateTimeBlock"
            referencedColumns: ["id"]
          },
        ]
      }
      TemplateTimeBlock: {
        Row: {
          createdAt: string
          id: string
          orderIndex: number
          startTime: string
          templateId: string
          title: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          orderIndex: number
          startTime: string
          templateId: string
          title: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          orderIndex?: number
          startTime?: string
          templateId?: string
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "TemplateTimeBlock_templateId_fkey"
            columns: ["templateId"]
            isOneToOne: false
            referencedRelation: "DayTemplate"
            referencedColumns: ["id"]
          },
        ]
      }
      Todo: {
        Row: {
          archived: boolean
          completed: boolean
          createdAt: string
          description: string | null
          dueDate: string | null
          id: string
          priority: string | null
          title: string
          updatedAt: string
          userId: string
        }
        Insert: {
          archived?: boolean
          completed?: boolean
          createdAt?: string
          description?: string | null
          dueDate?: string | null
          id: string
          priority?: string | null
          title: string
          updatedAt: string
          userId: string
        }
        Update: {
          archived?: boolean
          completed?: boolean
          createdAt?: string
          description?: string | null
          dueDate?: string | null
          id?: string
          priority?: string | null
          title?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Todo_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          avatarUrl: string | null
          createdAt: string
          email: string
          id: string
          name: string | null
          updatedAt: string
        }
        Insert: {
          avatarUrl?: string | null
          createdAt?: string
          email: string
          id: string
          name?: string | null
          updatedAt: string
        }
        Update: {
          avatarUrl?: string | null
          createdAt?: string
          email?: string
          id?: string
          name?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never