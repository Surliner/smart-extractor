
export interface VatBreakdown {
  vatCategory: string; // BT-118 (S, Z, E, AE, etc.)
  vatRate: number;    // BT-119
  vatTaxableAmount: number; // BT-116
  vatAmount: number;   // BT-117
  exemptionReason?: string; // BT-120 (OBLIGATOIRE si non Standard)
}

export interface InvoiceItem {
  articleId: string;
  description: string;
  quantity: number | null;
  unitOfMeasure?: string;
  grossPrice?: number | null;
  discount?: number | null; // BT-147 (Rate %)
  lineAllowanceAmount?: number | null; // BT-136 (€)
  lineChargeAmount?: number | null;    // BT-141 (€)
  unitPrice: number | null;
  taxRate?: number | null;
  lineVatCategory?: string; // BT-151 (OBLIGATOIRE RFE)
  amount: number | null;
}

export enum ErpStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum InvoiceType {
  INVOICE = 'INVOICE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  CORRECTIVE = 'CORRECTIVE', // BT-3: 384
  SELF_INVOICE = 'SELF_INVOICE', // BT-3: 389
}

export enum FacturXProfile {
  MINIMUM = 'MINIMUM',
  BASIC = 'BASIC',
  COMFORT = 'COMFORT',
}

export type OperationCategory = 'GOODS' | 'SERVICES' | 'MIXED';
export type TaxPointType = 'DEBIT' | 'CASH' | 'DELIVERY';
export type ExtractionMode = 'BASIC' | 'ULTIMATE';

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
  id: string;
  companyId: string;
  owner?: string; 
  sessionId?: string;
  extractionMode?: ExtractionMode;
  direction?: 'INBOUND' | 'OUTBOUND';
  facturXProfile?: FacturXProfile;
  businessProcessId?: string;
  operationCategory?: OperationCategory;
  taxPointType?: TaxPointType;
  invoiceType: InvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  extractedAt?: string; 
  dueDate?: string;
  taxPointDate?: string;
  currency: string;
  poNumber?: string; // BT-13
  salesOrderReference?: string; // BT-14
  buyerReference?: string; // BT-10
  contractNumber?: string; // BT-12
  deliveryNoteNumber?: string; // BT-16
  projectReference?: string; // BT-11
  deliveryDate?: string; // BT-72
  supplier: string;
  supplierAddress?: string;
  supplierVat?: string;
  supplierSiret?: string;
  supplierErpCode?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerVat?: string;
  buyerSiret?: string;
  buyerErpCode?: string;
  buyerIban?: string; // BT-91
  buyerBic?: string; // BT-86
  amountExclVat: number | null;
  totalVat?: number | null;
  amountInclVat: number | null;
  amountDueForPayment?: number | null; // BT-115
  prepaidAmount?: number; // BT-113
  roundingAmount?: number; // BT-114
  globalDiscount?: number;
  globalCharge?: number;
  iban?: string;
  bic?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  paymentTermsText?: string; // BT-20
  paymentReference?: string; // BT-83
  paymentMeansCode?: string; // BT-81
  invoiceNote?: string; // BT-22
  originalFilename: string;
  fileData?: string; 
  items?: InvoiceItem[];
  vatBreakdowns?: VatBreakdown[]; 
  erpStatus?: ErpStatus;
  erpReference?: string;
  isMasterMatched?: boolean;
  isBuyerMasterMatched?: boolean;
  isArchived?: boolean;
}

export interface ProcessingLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
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

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

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

export interface LookupTable {
  id: string;
  name: string;
  entries: { key: string; value: string }[];
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
