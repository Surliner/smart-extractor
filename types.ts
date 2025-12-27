
export interface VatBreakdown {
  vatCategory: string; // BT-118 (S, Z, E, AE, K, G, O)
  vatRate: number;    // BT-119
  vatTaxableAmount: number; // BT-116
  vatAmount: number;   // BT-117
  exemptionReasonCode?: string; // BT-121
  exemptionReason?: string; // BT-120
}

export interface InvoiceItem {
  articleId: string; // BT-128
  name?: string; // BT-153
  description: string; // BT-129
  quantity: number | null; // BT-129
  unitOfMeasure: string; // BT-130 (Code rec. 20)
  grossPrice: number | null; // BT-148 (Prix avant remise)
  discount: number | null; // BT-147 (Rate %)
  lineAllowanceAmount: number | null; // BT-136 (€)
  lineChargeAmount: number | null;    // BT-141 (€)
  unitPrice: number | null; // BT-146 (Net price)
  taxRate: number | null; // BT-152
  lineVatCategory: string; // BT-151 (OBLIGATOIRE RFE)
  amount: number | null; // BT-131 (Line total HT)
  originCountry?: string; // BT-159 (Pays d'origine)
}

export enum ErpStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum InvoiceType {
  INVOICE = 'INVOICE',
  CREDIT_NOTE = 'CREDIT_NOTE',
}

export enum FacturXProfile {
  MINIMUM = 'MINIMUM',
  BASIC = 'BASIC',
  COMFORT = 'COMFORT',
}

export type OperationCategory = 'GOODS' | 'SERVICES' | 'MIXED';
export type TaxPointType = 'DEBIT' | 'CASH' | 'DELIVERY';
export type ExtractionMode = 'BASIC' | 'ULTIMATE';

export interface UserProfile {
  username: string;
  companyId: string;
  role: UserRole;
  isApproved: boolean;
  createdAt: string;
  companyName?: string;
  companyConfig?: any;
  stats: {
    extractRequests: number;
    totalTokens: number;
    lastActive: string;
  };
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  config?: any;
  userCount?: number;
  totalTokens?: number;
  invoiceCount?: number;
  totalExtracts?: number;
}

export interface PartnerMasterData {
  id: string;
  erpCode: string;
  name: string;
  siret: string;
  vatNumber: string;
  iban?: string;
  bic?: string;
  accountingGroup?: string;
}

export interface InvoiceData {
  // Metadata & System
  id: string;
  companyId: string;
  owner?: string; 
  extractionMode: ExtractionMode;
  extractedAt: string;
  direction: 'INBOUND' | 'OUTBOUND';
  isArchived: boolean;
  erpStatus: ErpStatus;
  erpReference?: string;

  // Header (BG-2)
  facturXProfile: FacturXProfile;
  businessProcessId?: string; // BT-23/24 (Specification ID)
  invoiceType: InvoiceType; // BT-3
  invoiceNumber: string; // BT-1
  invoiceDate: string; // BT-2
  dueDate?: string; // BT-9
  taxPointDate?: string; // BT-7
  currency: string; // BT-5
  poNumber?: string; // BT-13
  buyerReference?: string; // BT-10
  contractNumber?: string; // BT-12
  deliveryNoteNumber?: string; // BT-16
  projectReference?: string; // BT-11
  deliveryDate?: string; // BT-72
  invoiceNote?: string; // BT-22

  // Commercial & Logistics (New Blocks)
  billingPeriod?: {
    startDate?: string; // BT-73
    endDate?: string;   // BT-74
  };
  logistics?: {
    deliverToName?: string;    // BT-70
    deliveryDate?: string;     // BT-72 (duplicated for logic)
    deliverToAddress?: string; // BG-15
  };

  // Parties (BG-4 / BG-7)
  supplier: string; // BT-27
  supplierAddress?: string;
  supplierVat?: string; // BT-31
  supplierSiret?: string; // BT-29
  supplierErpCode?: string;
  isMasterMatched?: boolean;

  buyerName?: string; // BT-44
  buyerAddress?: string;
  buyerVat?: string; // BT-48
  buyerSiret?: string; // BT-47
  buyerErpCode?: string;
  isBuyerMasterMatched?: boolean;

  // Payment (BG-16)
  iban?: string; // BT-84
  bic?: string; // BT-85
  paymentMethod?: string; // BT-81/83
  paymentMeansCode?: string; // BT-81 (Numeric code)
  paymentTermsText?: string; // BT-20

  // Totals (BG-22)
  amountExclVat: number; // BT-109
  globalDiscount?: number; // BT-107
  globalCharge?: number; // BT-108
  totalVat: number; // BT-110
  amountInclVat: number; // BT-112
  prepaidAmount?: number; // BT-113
  roundingAmount?: number; // BT-114
  amountDueForPayment: number; // BT-115

  // Detailed Data
  items: InvoiceItem[]; // BG-25
  vatBreakdowns: VatBreakdown[]; // BG-23

  // File Reference
  originalFilename: string;
  fileData?: string; 
}

export interface ProcessingLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface LookupTable {
  id: string;
  name: string;
  entries: { key: string; value: string }[];
}

export interface ExportColumn {
  header: string;
  type: 'static' | 'field' | 'composite' | 'lookup';
  value: string;
  lookupTableId?: string;
  defaultValue?: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  separator: 'comma' | 'semicolon' | 'tab';
  columns: ExportColumn[];
}

export interface XmlMappingProfile {
  id: string;
  name: string;
  rootTag: string;
  itemTag: string;
  mappings: { btId: string; xmlTag: string; enabled: boolean }[];
}

export interface ErpConfig {
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
}

export interface ExtractionResult {
  invoice: InvoiceData;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
