export enum Category {
  AIR_CONDITIONER = "Air Conditioner",
  CARPENTRY = "Carpentry",
  CLEANING = "Cleaning",
  CONSTRUCTION = "Construction",
  ELECTRICAL = "Electrical related",
  FOOD_AND_BEVERAGE = "Food and Beverage",
  LOCKSMITH = "Locksmith",
  PAINTING = "Painting",
  GARDENING = "Gardering",
  PLUMBER = "Plumber",
  ROOF_CLEANING = "Roof Cleaning",
  TAILORING = "Tailoring",
  TRANSPORTATION = "Transportation",
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
  createdAt: string | number;
  updatedAt?: string | number;
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
  role: 'admin' | 'client';
  createdAt: string;
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
  rank: number;
}
