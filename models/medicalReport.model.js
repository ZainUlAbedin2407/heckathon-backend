import mongoose from "mongoose";

const medicalReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    title: {
      type: String,
      required: [true, "Report title is required"],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    reportType: {
      type: String,
      required: [true, "Report type is required"],
      enum: [
        "blood_test",
        "x_ray",
        "mri",
        "ct_scan",
        "ultrasound",
        "ecg",
        "urine_test",
        "stool_test",
        "biopsy",
        "pathology",
        "other",
      ],
    },

    reportDate: {
      type: Date,
      required: [true, "Report date is required"],
    },

    hospitalName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    doctorName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    // Cloudinary file information
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },

    filePublicId: {
      type: String,
      required: [true, "File public ID is required"],
    },

    fileName: {
      type: String,
      required: [true, "File name is required"],
    },

    fileSize: {
      type: Number,
      required: [true, "File size is required"],
    },

    fileType: {
      type: String,
      required: [true, "File type is required"],
    },

    // AI-generated summary
    aiSummary: {
      type: String,
      default: "",
    },

    // AI-generated insights
    aiInsights: {
      type: String,
      default: "",
    },

    // Key findings extracted by AI
    keyFindings: [{
      finding: String,
      value: String,
      unit: String,
      status: {
        type: String,
        enum: ["normal", "abnormal", "critical", "pending"],
        default: "pending"
      }
    }],

    // AI processing status
    aiProcessed: {
      type: Boolean,
      default: false,
    },

    aiProcessedAt: {
      type: Date,
    },

    // Privacy and security
    isPrivate: {
      type: Boolean,
      default: true,
    },

    // Tags for easy searching
    tags: [{
      type: String,
      trim: true,
    }],

    // Report status
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "error"],
      default: "uploaded",
    },

    // Error message if processing fails
    errorMessage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
medicalReportSchema.index({ userId: 1, reportDate: -1 });
medicalReportSchema.index({ reportType: 1 });
medicalReportSchema.index({ tags: 1 });
medicalReportSchema.index({ status: 1 });

export default mongoose.model("MedicalReport", medicalReportSchema);
