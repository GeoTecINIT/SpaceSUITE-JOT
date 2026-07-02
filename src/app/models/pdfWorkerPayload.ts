import { JobOffer } from './jobOffer';

export interface PdfWorkerPayload {
  offer: JobOffer;
  scaleFactor: number;
  assets: {
    poppinsRegular?: string;
    poppinsBold?: string;
    poppinsItalic?: string;
    watermark?: string;
    euLogo?: string;
    spaceSuiteLogo?: string;
  };
}
