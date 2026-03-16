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

const ADMIN_EMAILS = ['servicecalladmin@gmail.com', 'viknes1985@gmail.com'];
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
  resetCodeExpires: Number
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
  createdAt: { type: Number, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: String,
  nudgeCount: { type: Number, default: 0 },
  lastNudgeAt: { type: Number, default: 0 },
  isSponsored: { type: Boolean, default: false },
  type: { type: String, enum: ['Provider', 'Referral', 'Admin'], default: 'Provider' },
  isVerified: { type: Boolean, default: false }
}, { _id: false });
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
  createdAt: { type: Number, default: Date.now }
}, { _id: false });
const Sponsor = mongoose.model("Sponsor", SponsorSchema);

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
  app.post("/api/auth/signup", async (req, res) => {
    const id = Math.random().toString(36).substring(2, 15);
    try {
      const newUser = new User({ ...req.body, _id: id });
      await newUser.save();
      res.json({ id, ...req.body });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email, password });
      if (user) {
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
        from: 'Service Call <onboarding@resend.dev>',
        to: [email],
        subject: 'Password Reset Code',
        html: `<p>Your reset code is: <strong>${code}</strong></p>`
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

  // --- Service Routes ---
  app.get("/api/services", async (req, res) => {
    const { state, town, category, search, createdBy, status, isAdmin, minRating, maxRating, page = 1, limit = 20 } = req.query;
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
      const services = await Service.find(filter).sort({ createdAt: -1 });
      const enriched = await Promise.all(services.map(async (s: any) => {
        const allRatings = await Rating.find({ serviceId: s._id });
        const visibleRatings = allRatings.filter(r => !r.isHidden);
        const userObj = await User.findById(s.createdBy);
        
        // Mask name helper
        const maskName = (firstName: string) => {
          if (!firstName) return "Anonymous";
          if (firstName.length <= 1) return firstName;
          return firstName[0] + "*".repeat(Math.min(3, firstName.length - 1));
        };

        const ratingsWithUsers = await Promise.all(allRatings.map(async (r) => {
          const rater = await User.findById(r.userId);
          return {
            ...r.toObject(),
            id: r._id,
            raterName: rater ? `${maskName(rater.firstName)} ${rater.lastName ? rater.lastName[0] + '.' : ''}` : "Anonymous"
          };
        }));

        return {
          ...s.toObject(),
          id: String(s._id),
          createdBy: String(s.createdBy),
          creatorName: userObj ? `${userObj.firstName} ${userObj.lastName}` : "Unknown",
          avgRating: visibleRatings.length ? visibleRatings.reduce((a, b) => a + b.rating, 0) / visibleRatings.length : 0,
          ratingCount: visibleRatings.length,
          allRatings: ratingsWithUsers // Admin will use this
        };
      }));

      // Filter by rating if provided
      let filtered = enriched;
      if (minRating !== undefined || maxRating !== undefined) {
        const min = parseFloat(minRating as string) || 0;
        const max = parseFloat(maxRating as string) || 5;
        filtered = enriched.filter(s => s.avgRating >= min && s.avgRating <= max);
      }

      // Sponsored Logic: Interleave sponsored services
      // Only apply this logic for the main "Find" or "Home" views (where status is approved and not filtering by user)
      let result: any[] = [];
      if (filter.status === 'approved' && !createdBy) {
        const sponsored = filtered.filter(s => s.isSponsored);
        const nonSponsored = filtered.filter(s => !s.isSponsored);

        // Shuffle sponsored
        for (let i = sponsored.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sponsored[i], sponsored[j]] = [sponsored[j], sponsored[i]];
        }

        let sponsoredIdx = 0;

        // Add some sponsored at the top (up to 2)
        while (sponsoredIdx < sponsored.length && result.length < 2) {
          result.push(sponsored[sponsoredIdx++]);
        }

        // Interleave the rest: every 5 non-sponsored, add 1 sponsored
        for (let i = 0; i < nonSponsored.length; i++) {
          result.push(nonSponsored[i]);
          if ((i + 1) % 5 === 0 && sponsoredIdx < sponsored.length) {
            result.push(sponsored[sponsoredIdx++]);
          }
        }

        // Add remaining sponsored if any
        while (sponsoredIdx < sponsored.length) {
          result.push(sponsored[sponsoredIdx++]);
        }
      } else {
        result = filtered;
      }

      // Apply pagination to the final result
      const total = result.length;
      const skip = (Number(page) - 1) * Number(limit);
      const paginated = result.slice(skip, skip + Number(limit));

      res.json({
        services: paginated,
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
            from: 'Service Call <onboarding@resend.dev>',
            to: ADMIN_EMAILS,
            subject: 'New Service Submission for Verification',
            html: `
              <h3>New Service Submission</h3>
              <p><strong>Provider:</strong> ${req.body.providerName}</p>
              <p><strong>Category:</strong> ${req.body.category}</p>
              <p><strong>Location:</strong> ${req.body.town}, ${req.body.state}</p>
              <p>Please log in to the admin panel to verify this submission.</p>
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
              from: 'Service Call <onboarding@resend.dev>',
              to: [user.email],
              subject: `Service Submission ${status.charAt(0).toUpperCase() + status.slice(1)}`,
              html: `
                <h3>Service Submission Status Update</h3>
                <p>Your service submission for <strong>${service.providerName}</strong> has been <strong>${status}</strong>.</p>
                ${status === 'approved' ? '<p>It is now visible to all users.</p>' : `<p><strong>Reason for rejection:</strong> ${rejectionReason || 'No reason provided.'}</p><p>Please log in to your profile to make changes and resubmit.</p>`}
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
            from: 'Service Call <onboarding@resend.dev>',
            to: ADMIN_EMAILS,
            subject: 'Service Approval Nudge',
            html: `
              <h3>Service Approval Nudge</h3>
              <p>User is nudging for approval of: <strong>${service.providerName}</strong></p>
              <p>This is nudge #${service.nudgeCount} for this week.</p>
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
      const newSponsor = new Sponsor({
        _id: id,
        name,
        phone,
        email,
        photoUrls: processedUrls.filter(u => u !== ""),
        isEnabled: true,
        durationDays: duration,
        expiresAt: expiresAt
      });
      await newSponsor.save();
      res.json({ id, ...newSponsor.toObject() });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/sponsors/:id", async (req, res) => {
    const { id } = req.params;
    const { adminEmail, isEnabled, durationDays, name, phone, email, photoUrls } = req.body;
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
      res.json(topCategories);
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
