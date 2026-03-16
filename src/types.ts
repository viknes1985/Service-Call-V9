export enum Category {
  AIR_CONDITIONER = "Air Conditioner",
  CARPENTERING = "Carpentering",
  CLEANING = "Cleaning",
  CONSTRUCTION = "Construction",
  ELECTRICAL = "Electrical related",
  LOCKSMITH = "Locksmith",
  PAINTING = "Painting",
  PLANTING = "Planting",
  PLUMBER = "Plumber",
  ROOF_CLEANING = "Roof Cleaning",
  TAILORING = "Tailoring",
  WELDING = "Welding",
  OTHERS = "Others"
}

export interface Rating {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  createdAt: number;
  raterName?: string;
}

export interface Service {
  id: string;
  state: string;
  town: string;
  category: Category;
  providerName: string;
  description: string;
  contactNumber: string;
  operatingHours: string;
  photoUrls?: string[];
  createdAt: number;
  createdBy: string;
  creatorName?: string;
  avgRating?: number;
  ratingCount?: number;
  userRating?: number;
  status: 'pending' | 'approved' | 'rejected';
  nudgeCount: number;
  lastNudgeAt: number;
  isSponsored?: boolean;
  type: 'Provider' | 'Referral' | 'Admin';
  isVerified: boolean;
  allRatings?: Rating[];
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email: string;
}

export interface Sponsor {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrls: string[];
  isEnabled: boolean;
  durationDays: number;
  expiresAt: number;
  createdAt: number;
}
