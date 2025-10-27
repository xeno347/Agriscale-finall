// apps/field-manager/src/lib/baseurl.ts

// --- API Configuration ---
// Base URL for the FastAPI Backend (Used by apiService.ts)
export const FASTAPI_BASE_URL: string = "http://localhost:8000";

// --- S3 Configuration (Used for constructing the final image URL) ---
export const AWS_REGION: string = "us-east-1"; 
export const S3_BUCKET_NAME: string = "agriscale-photo-upload-um7riwja"; 

// The static URL helper is not strictly needed after the fix but kept clean:
export const buildStaticS3Url = (fileKey: string): string => {
    return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`;
};