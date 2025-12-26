
export interface InvoiceItem {
  articleId: string;
  description: string;
  quantity: number | null;
  unitOfMeasure?: string;
  grossPrice?: number | null;
  discount?: number | null;
  unitPrice: number | null;
  taxRate?: number | null;
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

export interface SageX3Config {
  endpoint: string;
  folder: string;
  user: string;
  pass: string;
  poolAlias?: string;
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
  poNumber?: string;
  buyerReference?: string;
  contractNumber?: string;
  deliveryNoteNumber?: string;
  projectReference?: string;
  receivingAdviceNumber?: string;
  paymentReference?: string;
  deliveryDate?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
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
  amountExclVat: number | null;
  totalVat?: number | null;
  amountInclVat: number | null;
  prepaidAmount?: number;
  globalDiscount?: number;
  globalCharge?: number;
  iban?: string;
  bic?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  paymentMeansCode?: string;
  notes?: string;
  originalFilename: string;
  fileData?: string; 
  items?: InvoiceItem[];
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

export interface UserActivity {
  id: string;
  timestamp: string;
  action: string;
  details?: string;
}

export interface UserProfile {
  username: string;
  companyId: string;
  companyName?: string;
  companyConfig?: any;
  password?: string;
  role: UserRole;
  isApproved: boolean;
  createdAt: string;
  stats: {
    extractRequests: number;
    totalTokens: number;
    lastActive: string;
    lastLogin?: string;
  };
  loginHistory: string[];
  activityLog: UserActivity[];
  securityQuestion?: string;
  securityAnswer?: string;
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
  sageConfig?: SageX3Config;
}

export interface ExtractionResult {
  invoice: InvoiceData;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
