import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from "axios";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Configuration ---
const MONGODB_URI = process.env.MONGODB_URI || "";
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAILS = ['servicecalladmin@gmail.com', 'viknes1985@gmail.com', 'jomproadmin@gmail.com'];
const isAdminEmail = (email: string) => ADMIN_EMAILS.includes(email);

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- Mongoose Schemas ---
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Keeping your custom string IDs
  firstName: String,
  lastName: String,
  mobileNumber: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  resetCode: String,
  resetCodeExpires: Number,
  isVerified: { type: Boolean, default: false },
  verificationCode: String,
  verificationCodeExpires: Number
}, { _id: false });
const User = mongoose.model("User", UserSchema);

const ServiceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  state: String,
  town: String,
  category: String,
  providerName: String,
  description: String,
  contactNumber: String,
  operatingHours: String,
  photoUrls: [String], 
  createdBy: { type: String, ref: 'User' }, // Store as String to match User._id
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: String,
  nudgeCount: { type: Number, default: 0 },
  lastNudgeAt: { type: Number, default: 0 },
  isSponsored: { type: Boolean, default: false },
  type: { type: String, enum: ['Provider', 'Referral', 'Admin'], default: 'Provider' },
  isVerified: { type: Boolean, default: false }
}, { 
  _id: false,
  timestamps: true
});
const Service = mongoose.model("Service", ServiceSchema);

const RatingSchema = new mongoose.Schema({
  serviceId: { type: String, ref: 'Service' },
  userId: { type: String, ref: 'User' },
  rating: Number,
  comment: { type: String, default: "" },
  isHidden: { type: Boolean, default: false },
  createdAt: { type: Number, default: Date.now }
});
RatingSchema.index({ serviceId: 1, userId: 1 }, { unique: true });
const Rating = mongoose.model("Rating", RatingSchema);

const SponsorSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: String,
  phone: String,
  email: String,
  photoUrls: [String],
  isEnabled: { type: Boolean, default: true },
  durationDays: { type: Number, default: 30 },
  expiresAt: { type: Number },
  weightage: { type: Number, default: 0 },
  createdAt: { type: Number, default: Date.now }
}, { _id: false });
const Sponsor = mongoose.model("Sponsor", SponsorSchema);

// --- Helper: Seeded Random ---
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const seededShuffle = (array: any[], seed: number) => {
  const newArray = [...array];
  let m = newArray.length, t, i;
  let s = seed;
  while (m) {
    i = Math.floor(seededRandom(s++) * m--);
    t = newArray[m];
    newArray[m] = newArray[i];
    newArray[i] = t;
  }
  return newArray;
};

// --- Helper: ImgBB Upload ---
const saveToImgBB = async (base64Str: string): Promise<string> => {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  try {
    const base64Data = base64Str.split(',')[1];
    const formData = new URLSearchParams();
    formData.append("image", base64Data);
    const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData);
    return response.data.data.url;
  } catch (error: any) {
    console.error("ImgBB Upload Error:", error.message);
    return "";
  }
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json({ limit: '10mb' }));

  // --- Auth Routes ---
  app.post("/api/auth/send-verification", async (req, res) => {
    const { email } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.isVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 600000; // 10 minutes

      if (existingUser) {
        existingUser.verificationCode = code;
        existingUser.verificationCodeExpires = expires;
        await existingUser.save();
      } else {
        // We don't create the user yet, just send the code
        // Or we can create a temporary record. Let's use a separate collection or just handle it in signup.
        // Actually, the user's request implies they key in the number during signup.
      }

      await resend.emails.send({
        from: 'JomPro <noreply@jompro.com>',
        to: [email],
        subject: 'Your JomPro Verification Code',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">Welcome to JomPro!</h2>
            <p>Thank you for signing up. To complete your registration, please use the following 6-digit verification code:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    const { email, code } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.isVerified) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const user = await User.findOne({ email });
      if (!user || user.verificationCode !== code || (user.verificationCodeExpires && user.verificationCodeExpires < Date.now())) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      user.isVerified = true;
      user.verificationCode = "";
      user.verificationCodeExpires = 0;
      await user.save();

      res.json({ id: user._id, email, firstName: user.firstName, lastName: user.lastName, mobileNumber: user.mobileNumber });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Helper to ensure user exists for verification
  app.post("/api/auth/prepare-signup", async (req, res) => {
    const { email, firstName, lastName, mobileNumber, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (user && user.isVerified) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 600000;

      if (!user) {
        user = new User({
          _id: Math.random().toString(36).substring(2, 15),
          email,
          password,
          firstName,
          lastName,
          mobileNumber,
          isVerified: false,
          verificationCode: code,
          verificationCodeExpires: expires
        });
      } else {
        user.password = password;
        user.firstName = firstName;
        user.lastName = lastName;
        user.mobileNumber = mobileNumber;
        user.verificationCode = code;
        user.verificationCodeExpires = expires;
      }
      await user.save();

      await resend.emails.send({
        from: 'JomPro <noreply@jompro.com>',
        to: [email],
        subject: 'Your JomPro Verification Code',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">Welcome to JomPro!</h2>
            <p>Thank you for signing up. To complete your registration, please use the following 6-digit verification code:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
          </div>
        `
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email, password });
      if (user) {
        if (!user.isVerified) {
          return res.status(403).json({ error: "Please verify your email first", unverified: true });
        }
        // FIX: Ensure the ID is explicitly returned as 'id' for frontend consistency
        const userData = user.toObject();
        res.json({
          ...userData,
          id: user._id 
        });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "Email not found" });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetCode = code;
      user.resetCodeExpires = Date.now() + 600000;
      await user.save();

      await resend.emails.send({
        from: 'JomPro <noreply@jompro.com>',
        to: [email],
        subject: 'Password Reset Code - JomPro',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">Reset Your Password</h2>
            <p>We received a request to reset your JomPro password. Use the following 6-digit code to proceed:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `
      });
      res.json({ message: "Code sent" });
    } catch (err) {
      res.status(500).json({ error: "Failed to process reset" });
    }
  });

  app.post("/api/auth/verify-reset-code", async (req, res) => {
    const { email, code } = req.body;
    try {
      const user = await User.findOne({ email, resetCode: code });
      if (user && user.resetCodeExpires && user.resetCodeExpires > Date.now()) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Invalid or expired code" });
      }
    } catch (err) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
      const user = await User.findOne({ email, resetCode: code });
      if (user && user.resetCodeExpires && user.resetCodeExpires > Date.now()) {
        user.password = newPassword;
        user.resetCode = "";
        user.resetCodeExpires = 0;
        await user.save();
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Invalid or expired code" });
      }
    } catch (err) {
      res.status(500).json({ error: "Reset failed" });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      if (user.password !== oldPassword) {
        return res.status(401).json({ error: "Incorrect old password" });
      }

      user.password = newPassword;
      await user.save();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    const { adminEmail, search, page = 1, limit = 20 } = req.query;
    if (!isAdminEmail(adminEmail as string)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      let filter: any = {};
      if (search) {
        filter.$or = [
          { firstName: new RegExp(search as string, 'i') },
          { lastName: new RegExp(search as string, 'i') },
          { mobileNumber: new RegExp(search as string, 'i') },
          { email: new RegExp(search as string, 'i') }
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const users = await User.find(filter).skip(skip).limit(Number(limit)).sort({ firstName: 1 });
      const total = await User.countDocuments(filter);

      res.json({
        users: users.map(u => ({
          id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          mobileNumber: u.mobileNumber,
          email: u.email
        })),
        total,
        pages: Math.ceil(total / Number(limit))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    const { adminEmail, firstName, lastName, mobileNumber, email } = req.body;

    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (mobileNumber) user.mobileNumber = mobileNumber;
      if (email) user.email = email;

      await user.save();
      res.json({ success: true, user: { ...user.toObject(), id: user._id } });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    const { adminEmail } = req.query;

    if (!isAdminEmail(adminEmail as string)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if user is an admin - don't allow deleting other admins via this endpoint easily
      if (isAdminEmail(user.email)) {
        return res.status(403).json({ error: "Cannot delete an admin user" });
      }

      await User.findByIdAndDelete(id);
      
      // Also delete their services
      await Service.deleteMany({ createdBy: id });
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Service Routes ---
  app.get("/api/services", async (req, res) => {
    const { state, town, category, search, createdBy, status, isAdmin, minRating, maxRating, page = 1, limit = 10 } = req.query;
    const currentPage = Number(page);
    const itemsPerPage = 10;

    let filter: any = {};
    if (state) filter.state = state;
    if (town) filter.town = town;
    if (category) filter.category = category;
    
    // If not admin and not looking at own services, only show approved
    if (isAdmin !== 'true' && !createdBy) {
      filter.status = 'approved';
    } else if (status) {
      filter.status = status;
    }

    if (createdBy) filter.createdBy = createdBy;
    
    if (search) {
      filter.$or = [
        { providerName: new RegExp(search as string, 'i') },
        { description: new RegExp(search as string, 'i') }
      ];
    }

    try {
      // Helper to enrich a list of services efficiently
      const enrichServices = async (services: any[]) => {
        const serviceIds = services.map(s => String(s._id || s.id));
        const creatorIds = [...new Set(services.map(s => String(s.createdBy)))];

        // Fetch all ratings for these services in one go
        const allRatings = await Rating.find({ serviceId: { $in: serviceIds } });
        
        // Fetch all creators in one go
        const creators = await User.find({ _id: { $in: creatorIds } });
        const creatorMap = new Map(creators.map(u => [String(u._id), u]));

        // Fetch all raters in one go
        const raterIds = [...new Set(allRatings.map(r => String(r.userId)))];
        const raters = await User.find({ _id: { $in: raterIds } });
        const raterMap = new Map(raters.map(u => [String(u._id), u]));

        const maskName = (firstName: string) => {
          if (!firstName) return "Anonymous";
          if (firstName.length <= 1) return firstName;
          return firstName[0] + "*".repeat(Math.min(3, firstName.length - 1));
        };

        return services.map(s => {
          const sId = String(s._id || s.id);
          const sRatings = allRatings.filter(r => String(r.serviceId) === sId);
          const visibleRatings = sRatings.filter(r => !r.isHidden);
          const userObj = creatorMap.get(String(s.createdBy));

          const ratingsWithUsers = sRatings.map(r => {
            const rater = raterMap.get(String(r.userId));
            const rObj = r.toObject ? r.toObject() : r;
            return {
              ...rObj,
              id: r._id || r.id,
              raterName: rater ? `${maskName(rater.firstName)} ${rater.lastName ? rater.lastName[0] + '.' : ''}` : "Anonymous"
            };
          });

          const sObj = s.toObject ? s.toObject() : s;
          return {
            ...sObj,
            id: sId,
            createdBy: String(s.createdBy),
            creatorName: userObj ? `${userObj.firstName} ${userObj.lastName}` : "Unknown",
            avgRating: visibleRatings.length ? visibleRatings.reduce((a, b) => a + b.rating, 0) / visibleRatings.length : 0,
            ratingCount: visibleRatings.length,
            allRatings: ratingsWithUsers
          };
        });
      };

      // Special logic for the main "Find" view (8+1+1 layout)
      if (filter.status === 'approved' && !createdBy && isAdmin !== 'true') {
        const min = parseFloat(minRating as string) || 0;
        const max = parseFloat(maxRating as string) || 5;

        // Aggregation pipeline for services with rating filter
        const getBasePipeline = (extraMatch: any) => [
          { $match: { ...filter, ...extraMatch } },
          {
            $lookup: {
              from: 'ratings',
              let: { sId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$serviceId', { $toString: '$$sId' }] }, isHidden: { $ne: true } } }
              ],
              as: 'ratings'
            }
          },
          {
            $addFields: {
              avgRating: {
                $cond: [
                  { $gt: [{ $size: '$ratings' }, 0] },
                  { $avg: '$ratings.rating' },
                  0
                ]
              }
            }
          },
          { $match: { avgRating: { $gte: min, $lte: max } } }
        ];

        // 1. Determine availability of Sponsored (Type B) and Sponsor Ads (Type A)
        const sponsoredPipeline = getBasePipeline({ isSponsored: true });
        const allSponsored = await Service.aggregate(sponsoredPipeline);
        
        const activeSponsors = await Sponsor.find({ isEnabled: true, expiresAt: { $gt: Date.now() } });
        
        const hasSponsored = allSponsored.length > 0;
        const hasSponsorAd = activeSponsors.length > 0;

        // 2. Calculate how many regular services we need to reach 10 total
        const countB = hasSponsored ? 1 : 0;
        const countA = hasSponsorAd ? 1 : 0;
        const countRegularNeeded = 10 - countB - countA;

        // 3. Get regular non-sponsored services
        const nonSponsoredPipeline = getBasePipeline({ isSponsored: { $ne: true } });
        const totalNonSponsoredResult = await Service.aggregate([...nonSponsoredPipeline, { $count: 'total' }]);
        const totalNonSponsored = totalNonSponsoredResult.length > 0 ? totalNonSponsoredResult[0].total : 0;

        const nonSponsoredServices = await Service.aggregate([
          ...nonSponsoredPipeline,
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (currentPage - 1) * countRegularNeeded },
          { $limit: countRegularNeeded }
        ]);

        // 4. Select 1 sponsored service (Type B) - Random but avoiding adjacent repeats
        let sponsoredService: any = null;
        if (hasSponsored) {
          const index = (currentPage - 1) % allSponsored.length;
          sponsoredService = allSponsored[index];
        }

        // 5. Select 1 sponsor advertisement (Type A) - Based on weightage
        let sponsorAd: any = null;
        if (hasSponsorAd) {
          // Weighted random selection - deterministic based on page
          const totalWeight = activeSponsors.reduce((sum, s) => sum + (s.weightage || 0), 0);
          if (totalWeight > 0) {
            let randomVal = seededRandom(currentPage * 1000) * totalWeight;
            for (const sponsor of activeSponsors) {
              if (randomVal < (sponsor.weightage || 0)) {
                sponsorAd = sponsor;
                break;
              }
              randomVal -= (sponsor.weightage || 0);
            }
          }
          // Fallback
          if (!sponsorAd) {
            const index = (currentPage - 1) % activeSponsors.length;
            sponsorAd = activeSponsors[index];
          }
        }

        // Enrich the services
        const servicesToEnrich = [...nonSponsoredServices];
        if (sponsoredService) servicesToEnrich.push(sponsoredService);
        
        const enriched = await enrichServices(servicesToEnrich);
        
        // Split back
        const enrichedNonSponsored = enriched.filter(s => !s.isSponsored).slice(0, countRegularNeeded);
        const enrichedSponsored = enriched.find(s => s.isSponsored);

        // Build the page items
        let pageItems: any[] = enrichedNonSponsored.map(s => ({ type: 'service', data: s }));
        if (enrichedSponsored) pageItems.push({ type: 'service', data: enrichedSponsored });
        if (sponsorAd) pageItems.push({ type: 'sponsor', data: sponsorAd });

        // Shuffle the items for variety - deterministic based on page
        pageItems = seededShuffle(pageItems, currentPage * 500);

        const totalPages = Math.ceil(totalNonSponsored / countRegularNeeded);

        res.json({
          services: pageItems,
          total: totalNonSponsored,
          pages: totalPages || 1
        });
        return;
      }

      // Default logic for other views (Admin, Profile, etc.)
      const total = await Service.countDocuments(filter);
      const services = await Service.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((currentPage - 1) * Number(limit))
        .limit(Number(limit));
      
      const enriched = await enrichServices(services);
      
      let result = enriched.map(s => ({ type: 'service', data: s }));
      if (minRating !== undefined || maxRating !== undefined) {
        const min = parseFloat(minRating as string) || 0;
        const max = parseFloat(maxRating as string) || 5;
        result = result.filter(s => s.data.avgRating >= min && s.data.avgRating <= max);
      }

      res.json({
        services: result,
        total,
        pages: Math.ceil(total / Number(limit))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/services", async (req, res) => {
    const id = Math.random().toString(36).substring(2, 15);
    try {
      const processedUrls = await Promise.all((req.body.photoUrls || []).map((url: string) => saveToImgBB(url)));
      const isServiceAdmin = isAdminEmail(req.body.adminEmail || "");
      const newService = new Service({
        ...req.body,
        _id: id,
        photoUrls: processedUrls.filter(u => u !== ""),
        status: 'pending',
        type: isServiceAdmin ? 'Admin' : (req.body.type === 'Consumer' ? 'Referral' : (req.body.type || 'Provider'))
      });
      await newService.save();

      // Notify Admin
      try {
        console.log("Attempting to send admin notification email to:", ADMIN_EMAILS);
        if (!process.env.RESEND_API_KEY) {
          console.warn("RESEND_API_KEY is not set. Email notification skipped.");
        } else {
          const emailResponse = await resend.emails.send({
            from: 'JomPro <noreply@jompro.com>',
            to: ADMIN_EMAILS,
            subject: 'New Service Submission for Verification - JomPro',
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h3 style="color: #2563eb;">New Service Submission</h3>
                <p>A new service has been submitted for verification on JomPro.</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                  <p><strong>Provider:</strong> ${req.body.providerName}</p>
                  <p><strong>Category:</strong> ${req.body.category}</p>
                  <p><strong>Location:</strong> ${req.body.town}, ${req.body.state}</p>
                </div>
                <p>Please log in to the admin panel to verify this submission.</p>
              </div>
            `
          });
          console.log("Admin notification email response:", emailResponse);
        }
      } catch (emailErr: any) {
        console.error("Admin notification email failed:", emailErr.message);
      }

      res.json({ id, photoUrls: processedUrls });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/services/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, adminEmail, rejectionReason } = req.body;

    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const service = await Service.findById(id);
      if (!service) return res.status(404).json({ error: "Service not found" });

      service.status = status;
      if (status === 'rejected' && rejectionReason) {
        service.rejectionReason = rejectionReason;
      } else if (status === 'approved') {
        service.rejectionReason = "";
      }
      
      await service.save();

      // Notify User
      const user = await User.findById(service.createdBy);
      if (user && user.email) {
        try {
          console.log("Attempting to send status update email to:", user.email);
          if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY is not set. Email notification skipped.");
          } else {
            const emailResponse = await resend.emails.send({
              from: 'JomPro <noreply@jompro.com>',
              to: [user.email],
              subject: `Service Submission ${status.charAt(0).toUpperCase() + status.slice(1)} - JomPro`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h3 style="color: #2563eb;">Service Submission Status Update</h3>
                  <p>Your service submission for <strong>${service.providerName}</strong> has been <strong>${status}</strong>.</p>
                  <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    ${status === 'approved' ? '<p style="color: #059669; font-weight: bold;">Congratulations! Your service is now live and visible to all users on JomPro.</p>' : `<p style="color: #dc2626; font-weight: bold;">Reason for rejection:</p><p>${rejectionReason || 'No reason provided.'}</p><p>Please log in to your profile to make changes and resubmit.</p>`}
                  </div>
                  <p>Thank you for using JomPro!</p>
                </div>
              `
            });
            console.log("Status update email response:", emailResponse);
          }
        } catch (emailErr) {
          console.error("User notification email failed:", emailErr);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/services/:id/nudge", async (req, res) => {
    const { id } = req.params;
    try {
      const service = await Service.findById(id);
      if (!service) return res.status(404).json({ error: "Service not found" });

      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      // Reset nudge count if last nudge was more than a week ago
      if (service.lastNudgeAt < oneWeekAgo) {
        service.nudgeCount = 0;
      }

      if (service.nudgeCount >= 3) {
        return res.status(400).json({ error: "Max nudges (3) reached for this week." });
      }

      service.nudgeCount += 1;
      service.lastNudgeAt = now;
      await service.save();

      // Notify Admin
      try {
        console.log("Attempting to send nudge email to:", ADMIN_EMAILS);
        if (!process.env.RESEND_API_KEY) {
          console.warn("RESEND_API_KEY is not set. Email notification skipped.");
        } else {
          const emailResponse = await resend.emails.send({
            from: 'JomPro <noreply@jompro.com>',
            to: ADMIN_EMAILS,
            subject: 'Service Approval Nudge - JomPro',
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h3 style="color: #2563eb;">Service Approval Nudge</h3>
                <p>A user is nudging for the approval of their service: <strong>${service.providerName}</strong></p>
                <p>This is nudge <strong>#${service.nudgeCount}</strong> for this week.</p>
                <p>Please review the submission in the admin panel.</p>
              </div>
            `
          });
          console.log("Admin nudge email response:", emailResponse);
        }
      } catch (emailErr: any) {
        console.error("Admin nudge email failed:", emailErr.message);
      }

      res.json({ success: true, nudgeCount: service.nudgeCount });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/services/:id/sponsored", async (req, res) => {
    const { id } = req.params;
    const { isSponsored, adminEmail } = req.body;

    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const service = await Service.findById(id);
      if (!service) return res.status(404).json({ error: "Service not found" });

      service.isSponsored = isSponsored;
      await service.save();
      res.json({ success: true, isSponsored: service.isSponsored });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/services/:id/verify", async (req, res) => {
    const { id } = req.params;
    const { isVerified, adminEmail } = req.body;

    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const service = await Service.findById(id);
      if (!service) return res.status(404).json({ error: "Service not found" });

      service.isVerified = isVerified;
      await service.save();
      res.json({ success: true, isVerified: service.isVerified });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/services/:id/ratings/:ratingId/hide", async (req, res) => {
    const { ratingId } = req.params;
    const { isHidden, adminEmail } = req.body;

    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const rating = await Rating.findById(ratingId);
      if (!rating) return res.status(404).json({ error: "Rating not found" });

      rating.isHidden = isHidden;
      await rating.save();
      res.json({ success: true, isHidden: rating.isHidden });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/services/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const processedUrls = await Promise.all((req.body.photoUrls || []).map((url: string) => saveToImgBB(url)));
      const updated = await Service.findByIdAndUpdate(id, {
        ...req.body,
        photoUrls: processedUrls.filter(u => u !== ""),
        status: 'pending', // Reset to pending on edit/resubmission
        rejectionReason: "" // Clear rejection reason
      }, { new: true });

      // Notify User about edit
      const user = await User.findById(updated?.createdBy);
      if (user && user.email) {
        await resend.emails.send({
          from: 'JomPro <noreply@jompro.com>',
          to: [user.email],
          subject: 'Service Updated - JomPro',
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h3 style="color: #2563eb;">Service Updated Successfully</h3>
              <p>Your service <strong>${updated?.providerName}</strong> has been updated and resubmitted for verification.</p>
              <p>We will notify you once it has been reviewed.</p>
            </div>
          `
        });
      }

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  // --- Rating Route ---
  app.post("/api/services/:id/rate", async (req, res) => {
    const { id } = req.params;
    const { userId, rating, comment } = req.body;
    
    if (!userId || !rating) return res.status(400).json({ error: "Missing userId or rating" });
    
    try {
      await Rating.findOneAndUpdate(
        { serviceId: id, userId: userId },
        { rating, comment: comment || "", createdAt: Date.now() },
        { upsert: true, new: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Sponsor Routes ---
  app.get("/api/sponsors", async (req, res) => {
    try {
      const sponsors = await Sponsor.find().sort({ createdAt: -1 });
      res.json(sponsors.map(s => ({ ...s.toObject(), id: s._id })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sponsors", async (req, res) => {
    const { adminEmail, name, phone, email, photoUrls, durationDays } = req.body;
    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const id = Math.random().toString(36).substring(2, 15);
    const duration = durationDays || 30;
    const expiresAt = Date.now() + (duration * 24 * 60 * 60 * 1000);
    
    try {
      const processedUrls = await Promise.all((photoUrls || []).map((url: string) => saveToImgBB(url)));
      
      // Redistribute weightage equally for all sponsors including the new one
      const existingSponsors = await Sponsor.find();
      const totalSponsors = existingSponsors.length + 1;
      const equalWeight = Math.floor(100 / totalSponsors);
      const remainder = 100 % totalSponsors;

      const newSponsor = new Sponsor({
        _id: id,
        name,
        phone,
        email,
        photoUrls: processedUrls.filter(u => u !== ""),
        isEnabled: true,
        durationDays: duration,
        expiresAt: expiresAt,
        weightage: equalWeight + (remainder > 0 ? 1 : 0)
      });
      await newSponsor.save();

      // Update existing sponsors
      for (let i = 0; i < existingSponsors.length; i++) {
        const s = existingSponsors[i];
        s.weightage = equalWeight + (i + 1 < remainder ? 1 : 0);
        await s.save();
      }

      res.json({ id, ...newSponsor.toObject() });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/sponsors/:id", async (req, res) => {
    const { id } = req.params;
    const { adminEmail, isEnabled, durationDays, name, phone, email, photoUrls, weightage } = req.body;
    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const sponsor = await Sponsor.findById(id);
      if (!sponsor) return res.status(404).json({ error: "Sponsor not found" });

      if (isEnabled !== undefined) sponsor.isEnabled = isEnabled;
      if (name !== undefined) sponsor.name = name;
      if (phone !== undefined) sponsor.phone = phone;
      if (email !== undefined) sponsor.email = email;
      
      if (photoUrls !== undefined && Array.isArray(photoUrls)) {
        const processedUrls = await Promise.all(photoUrls.map((url: string) => saveToImgBB(url)));
        sponsor.photoUrls = processedUrls.filter(u => u !== "");
      }

      if (durationDays !== undefined) {
        sponsor.durationDays = durationDays;
        // Recalculate expiry from now if duration is updated
        sponsor.expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
      }

      if (weightage !== undefined) {
        sponsor.weightage = weightage;
        const otherSponsors = await Sponsor.find({ _id: { $ne: id } });
        if (otherSponsors.length > 0) {
          const remainingWeight = 100 - weightage;
          const equalWeight = Math.floor(remainingWeight / otherSponsors.length);
          const remainder = remainingWeight % otherSponsors.length;
          for (let i = 0; i < otherSponsors.length; i++) {
            const s = otherSponsors[i];
            s.weightage = equalWeight + (i < remainder ? 1 : 0);
            await s.save();
          }
        }
      }
      
      await sponsor.save();
      res.json({ id, ...sponsor.toObject() });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/sponsors/:id", async (req, res) => {
    const { id } = req.params;
    const { adminEmail } = req.query;
    if (!isAdminEmail(adminEmail as string)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      await Sponsor.findByIdAndDelete(id);
      
      // Redistribute weightage equally for remaining sponsors
      const remainingSponsors = await Sponsor.find();
      if (remainingSponsors.length > 0) {
        const equalWeight = Math.floor(100 / remainingSponsors.length);
        const remainder = 100 % remainingSponsors.length;
        for (let i = 0; i < remainingSponsors.length; i++) {
          const s = remainingSponsors[i];
          s.weightage = equalWeight + (i < remainder ? 1 : 0);
          await s.save();
        }
      }
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Top Categories Route ---
  app.get("/api/top-categories", async (req, res) => {
    try {
      const topCategories = await Service.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            thumbnails: { $push: { $arrayElemAt: ["$photoUrls", 0] } }
          }
        },
        {
          $project: {
            category: "$_id",
            count: 1,
            thumbnails: {
              $filter: {
                input: "$thumbnails",
                as: "thumb",
                cond: { $and: [ { $ne: ["$$thumb", null] }, { $ne: ["$$thumb", ""] } ] }
              }
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
        {
          $project: {
            _id: 0,
            category: 1,
            count: 1,
            thumbnails: { $slice: ["$thumbnails", 4] }
          }
        }
      ]);
      const activeSponsors = await Sponsor.find({ isEnabled: true }).limit(2);
      res.json({ categories: topCategories, sponsors: activeSponsors });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Production Build Handling ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
}

startServer();
