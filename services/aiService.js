import MedicalReport from "../models/medicalReport.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createWorker } from "tesseract.js";
import { v2 as cloudinary } from "cloudinary";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Extract text from PDF
const extractTextFromPDF = async (fileUrl) => {
  try {
    const pdf = await import("pdf-parse");
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const data = await pdf.default(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error("PDF text extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

// Extract text from image using OCR
const extractTextFromImage = async (fileUrl) => {
  try {
    const worker = await createWorker();
    const { data: { text } } = await worker.recognize(fileUrl);
    await worker.terminate();
    return text;
  } catch (error) {
    console.error("OCR text extraction error:", error);
    throw new Error("Failed to extract text from image");
  }
};

// Extract text from medical report
const extractTextFromReport = async (fileUrl, fileType) => {
  if (fileType === 'application/pdf') {
    return await extractTextFromPDF(fileUrl);
  } else if (fileType.startsWith('image/')) {
    return await extractTextFromImage(fileUrl);
  } else {
    throw new Error("Unsupported file type for text extraction");
  }
};

// Generate AI summary using Gemini
const generateAISummary = async (extractedText, reportType) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
    You are a medical AI assistant. Analyze this ${reportType} report and provide:
    
    1. A simple, easy-to-understand summary in plain English (2-3 paragraphs)
    2. Key findings with normal/abnormal/critical status
    3. Important insights and recommendations
    
    Medical Report Text:
    ${extractedText}
    
    Please format your response as JSON with the following structure:
    {
      "summary": "Simple summary in plain English",
      "insights": "Important insights and recommendations",
      "keyFindings": [
        {
          "finding": "Test name or measurement",
          "value": "Actual value",
          "unit": "Unit of measurement",
          "status": "normal/abnormal/critical",
          "description": "What this means in simple terms"
        }
      ]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      // If JSON parsing fails, return a structured response
      return {
        summary: text,
        insights: "Please consult with a healthcare professional for detailed analysis.",
        keyFindings: []
      };
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate AI summary");
  }
};

// Process medical report with AI
export const processMedicalReport = async (reportId) => {
  try {
    const report = await MedicalReport.findById(reportId);
    
    if (!report) {
      console.error("Report not found:", reportId);
      return;
    }

    // Update status to processing
    report.status = "processing";
    await report.save();

    // Extract text from the medical report
    const extractedText = await extractTextFromReport(report.fileUrl, report.fileType);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the medical report");
    }

    // Generate AI summary
    const aiAnalysis = await generateAISummary(extractedText, report.reportType);

    // Update report with AI analysis
    report.aiSummary = aiAnalysis.summary || "";
    report.aiInsights = aiAnalysis.insights || "";
    report.keyFindings = aiAnalysis.keyFindings || [];
    report.aiProcessed = true;
    report.aiProcessedAt = new Date();
    report.status = "processed";
    report.errorMessage = "";

    await report.save();

    console.log(`Successfully processed medical report: ${reportId}`);

  } catch (error) {
    console.error("Error processing medical report:", error);
    
    // Update report with error status
    try {
      const report = await MedicalReport.findById(reportId);
      if (report) {
        report.status = "error";
        report.errorMessage = error.message;
        await report.save();
      }
    } catch (updateError) {
      console.error("Error updating report status:", updateError);
    }
  }
};

// Batch process multiple reports
export const batchProcessReports = async (reportIds) => {
  const results = [];
  
  for (const reportId of reportIds) {
    try {
      await processMedicalReport(reportId);
      results.push({ reportId, status: 'success' });
    } catch (error) {
      results.push({ reportId, status: 'error', error: error.message });
    }
  }
  
  return results;
};

// Get AI processing queue status
export const getProcessingQueueStatus = async () => {
  try {
    const processingCount = await MedicalReport.countDocuments({ status: 'processing' });
    const pendingCount = await MedicalReport.countDocuments({ status: 'uploaded' });
    const errorCount = await MedicalReport.countDocuments({ status: 'error' });
    
    return {
      processing: processingCount,
      pending: pendingCount,
      errors: errorCount
    };
  } catch (error) {
    console.error("Error getting processing queue status:", error);
    return { processing: 0, pending: 0, errors: 0 };
  }
};
