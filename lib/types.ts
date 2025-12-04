export interface Profile {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface Preference {
  id: string
  name: string
  category: string | null
  created_at: string
}

export interface UserPreference {
  id: string
  user_id: string
  preference_id: string | null
  custom_preference: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  budget_limit: number | null
  custom_message: string | null
  join_code: string
  admin_secret: string
  creator_id: string | null
  created_at: string
}

export interface Participant {
  id: string
  group_id: string
  user_id: string | null
  name: string
  contact: string
  wishlist: string | null
  created_at: string
}

export interface Assignment {
  id: string
  group_id: string
  giver_id: string
  receiver_id: string
  created_at: string
}
