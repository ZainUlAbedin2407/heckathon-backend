import MedicalReport from "../models/medicalReport.model.js";
import { createError } from "../utils/createError.js";
import { successHandler } from "../middlewares/successHandler.js";
import { uploadToCloudinaryBuffer } from "../utils/cloudinary.js";
import { processMedicalReport } from "../services/aiService.js";

// Upload medical report
export const uploadMedicalReport = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      reportType, 
      reportDate, 
      hospitalName, 
      doctorName, 
      tags 
    } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!title || !reportType || !reportDate) {
      return next(createError(400, "Title, report type, and report date are required"));
    }

    if (!req.file) {
      return next(createError(400, "Medical report file is required"));
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return next(createError(400, "Only JPEG, PNG, and PDF files are allowed"));
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      return next(createError(400, "File size must be less than 10MB"));
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinaryBuffer(
      req.file.buffer,
      "hackathon/medical-reports"
    );

    // Create medical report
    const medicalReport = new MedicalReport({
      userId,
      title,
      description: description || "",
      reportType,
      reportDate: new Date(reportDate),
      hospitalName: hospitalName || "",
      doctorName: doctorName || "",
      fileUrl: uploadResult.secure_url,
      filePublicId: uploadResult.public_id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status: "uploaded"
    });

    await medicalReport.save();

    // Process with AI in background
    processMedicalReport(medicalReport._id).catch(err => {
      console.error("AI processing error:", err);
    });

    successHandler(res, 201, "Medical report uploaded successfully", {
      id: medicalReport._id,
      title: medicalReport.title,
      status: medicalReport.status,
      fileUrl: medicalReport.fileUrl
    });

  } catch (error) {
    next(error);
  }
};

// Get all medical reports for a user with filters
export const getUserMedicalReports = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { 
      page = 1, 
      limit = 10, 
      reportType, 
      status, 
      search,
      sortBy = 'reportDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { userId };
    
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { hospitalName: { $regex: search, $options: 'i' } },
        { doctorName: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;
    
    const reports = await MedicalReport.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-filePublicId');

    const total = await MedicalReport.countDocuments(query);

    // Get report type counts for filters
    const reportTypeCounts = await MedicalReport.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$reportType",
          count: { $sum: 1 }
        }
      }
    ]);

    successHandler(res, 200, "Medical reports fetched successfully", {
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReports: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      filters: {
        reportTypes: reportTypeCounts,
        statuses: ['uploaded', 'processing', 'processed', 'error']
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get single medical report
export const getMedicalReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const report = await MedicalReport.findOne({ _id: id, userId });
    
    if (!report) {
      return next(createError(404, "Medical report not found"));
    }

    successHandler(res, 200, "Medical report fetched successfully", report);

  } catch (error) {
    next(error);
  }
};

// Update medical report
export const updateMedicalReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.fileUrl;
    delete updateData.filePublicId;
    delete updateData.fileName;
    delete updateData.fileSize;
    delete updateData.fileType;
    delete updateData.userId;
    delete updateData.aiProcessed;
    delete updateData.aiProcessedAt;

    // Convert tags string to array if provided
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
    }

    const report = await MedicalReport.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!report) {
      return next(createError(404, "Medical report not found"));
    }

    successHandler(res, 200, "Medical report updated successfully", report);

  } catch (error) {
    next(error);
  }
};

// Delete medical report
export const deleteMedicalReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const report = await MedicalReport.findOne({ _id: id, userId });
    
    if (!report) {
      return next(createError(404, "Medical report not found"));
    }

    // Delete from Cloudinary
    try {
      const { v2: cloudinary } = await import("cloudinary");
      await cloudinary.uploader.destroy(report.filePublicId);
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
    }

    await MedicalReport.findByIdAndDelete(id);

    successHandler(res, 200, "Medical report deleted successfully");

  } catch (error) {
    next(error);
  }
};

// Get medical report statistics
export const getMedicalReportStats = async (req, res, next) => {
  try {
    const userId = req.userId;

    const stats = await MedicalReport.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          processedReports: { $sum: { $cond: [{ $eq: ["$aiProcessed", true] }, 1, 0] } },
          pendingReports: { $sum: { $cond: [{ $eq: ["$status", "uploaded"] }, 1, 0] } },
          processingReports: { $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] } },
          errorReports: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
          totalFileSize: { $sum: "$fileSize" }
        }
      }
    ]);

    const reportTypeCounts = await MedicalReport.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: "$reportType",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const recentReports = await MedicalReport.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title reportType status createdAt');

    const result = stats[0] || {
      totalReports: 0,
      processedReports: 0,
      pendingReports: 0,
      processingReports: 0,
      errorReports: 0,
      totalFileSize: 0
    };

    result.reportTypeBreakdown = reportTypeCounts;
    result.recentReports = recentReports;

    successHandler(res, 200, "Medical report statistics fetched successfully", result);

  } catch (error) {
    next(error);
  }
};

// Reprocess medical report with AI
export const reprocessMedicalReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const report = await MedicalReport.findOne({ _id: id, userId });
    
    if (!report) {
      return next(createError(404, "Medical report not found"));
    }

    // Reset AI processing status
    report.aiProcessed = false;
    report.aiProcessedAt = null;
    report.status = "uploaded";
    report.aiSummary = "";
    report.aiInsights = "";
    report.keyFindings = [];
    report.errorMessage = "";
    
    await report.save();

    // Process with AI in background
    processMedicalReport(report._id).catch(err => {
      console.error("AI reprocessing error:", err);
    });

    successHandler(res, 200, "Medical report queued for reprocessing", {
      id: report._id,
      status: report.status
    });

  } catch (error) {
    next(error);
  }
};

// Get AI processing status
export const getAIProcessingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const report = await MedicalReport.findOne({ _id: id, userId })
      .select('status aiProcessed aiProcessedAt errorMessage');
    
    if (!report) {
      return next(createError(404, "Medical report not found"));
    }

    successHandler(res, 200, "AI processing status fetched successfully", {
      status: report.status,
      aiProcessed: report.aiProcessed,
      aiProcessedAt: report.aiProcessedAt,
      errorMessage: report.errorMessage
    });

  } catch (error) {
    next(error);
  }
};
