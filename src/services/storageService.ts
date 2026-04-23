import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import app from "./firebase";

const storage = getStorage(app);

export type FileType = "pdf" | "image" | "other";

export interface UploadResult {
  url: string;
    path: string;
      name: string;
        size: number;
          type: FileType;
          }

          export interface UploadProgress {
            progress: number;   // 0-100
              status: "uploading" | "done" | "error";
              }

              // Determine file type from mime type
              const getFileType = (mimeType: string): FileType => {
                if (mimeType === "application/pdf") return "pdf";
                  if (mimeType.startsWith("image/")) return "image";
                    return "other";
                    };

                    // Build storage path: users/{userId}/notes/{noteId}/{filename}
                    const buildPath = (userId: string, noteId: string, filename: string): string =>
                      `users/${userId}/notes/${noteId}/${Date.now()}_${filename}`;

                      /**
                       * Upload a file to Firebase Storage with progress tracking.
                        * Returns a promise that resolves with the download URL and metadata.
                         */
                         export const uploadFile = (
                           userId: string,
                             noteId: string,
                               fileUri: string,
                                 fileName: string,
                                   mimeType: string,
                                     onProgress?: (p: UploadProgress) => void
                                     ): Promise<UploadResult> => {
                                       return new Promise(async (resolve, reject) => {
                                           try {
                                                 const path = buildPath(userId, noteId, fileName);
                                                       const storageRef = ref(storage, path);

                                                             // Fetch the file as a blob from the local URI
                                                                   const response = await fetch(fileUri);
                                                                         const blob = await response.blob();

                                                                               const uploadTask = uploadBytesResumable(storageRef, blob, {
                                                                                       contentType: mimeType,
                                                                                             });

                                                                                                   uploadTask.on(
                                                                                                           "state_changed",
                                                                                                                   (snapshot) => {
                                                                                                                             const progress = Math.round(
                                                                                                                                         (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                                                                                                                                                   );
                                                                                                                                                             onProgress?.({ progress, status: "uploading" });
                                                                                                                                                                     },
                                                                                                                                                                             (error) => {
                                                                                                                                                                                       onProgress?.({ progress: 0, status: "error" });
                                                                                                                                                                                                 reject(error);
                                                                                                                                                                                                         },
                                                                                                                                                                                                                 async () => {
                                                                                                                                                                                                                           const url = await getDownloadURL(uploadTask.snapshot.ref);
                                                                                                                                                                                                                                     onProgress?.({ progress: 100, status: "done" });
                                                                                                                                                                                                                                               resolve({
                                                                                                                                                                                                                                                           url,
                                                                                                                                                                                                                                                                       path,
                                                                                                                                                                                                                                                                                   name: fileName,
                                                                                                                                                                                                                                                                                               size: blob.size,
                                                                                                                                                                                                                                                                                                           type: getFileType(mimeType),
                                                                                                                                                                                                                                                                                                                     });
                                                                                                                                                                                                                                                                                                                             }
                                                                                                                                                                                                                                                                                                                                   );
                                                                                                                                                                                                                                                                                                                                       } catch (err) {
                                                                                                                                                                                                                                                                                                                                             reject(err);
                                                                                                                                                                                                                                                                                                                                                 }
                                                                                                                                                                                                                                                                                                                                                   });
                                                                                                                                                                                                                                                                                                                                                   };
                                                                                                                                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                                                                                                   /**
                                                                                                                                                                                                                                                                                                                                                    * Delete a file from Firebase Storage by its storage path.
                                                                                                                                                                                                                                                                                                                                                     */
                                                                                                                                                                                                                                                                                                                                                     export const deleteFile = async (storagePath: string): Promise<void> => {
                                                                                                                                                                                                                                                                                                                                                       const fileRef = ref(storage, storagePath);
                                                                                                                                                                                                                                                                                                                                                         await deleteObject(fileRef);
                                                                                                                                                                                                                                                                                                                                                         };
