// utils/hash.util.ts
import crypto from 'crypto';
import { UploadedFile } from 'express-fileupload';

export class HashUtil {
    static calculateFileHash(file: UploadedFile): string {
        return crypto
            .createHash('md5')
            .update(file.data)
            .update(file.name)
            .update(file.size.toString())
            .digest('hex');
    }

    static calculateTextHash(text: string): string {
        const cleanText = text.trim().replace(/\s+/g, ' ');
        return crypto
            .createHash('md5')
            .update(cleanText)
            .digest('hex');
    }

    static isFileDuplicate(hash: string, existingHashes: string[]): boolean {
        return existingHashes.includes(hash);
    }
}