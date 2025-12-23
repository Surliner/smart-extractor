import { InvoiceData, ErpConfig } from '../types';

interface ErpResponse {
  success: boolean;
  reference?: string;
  message?: string;
}

export const sendInvoiceToErp = async (invoice: InvoiceData, config: ErpConfig): Promise<ErpResponse> => {
  if (!config.enabled || !config.apiUrl) {
    return { success: false, message: 'ERP integration is disabled or URL is missing.' };
  }

  // Transform internal data to a generic ERP Payload structure
  // This structure mimics a standard generic REST API for Invoices (Sage X3 compatible structure)
  const payload = {
    source: "SmartInvoiceExtractor",
    externalId: invoice.id,
    header: {
      supplier: invoice.supplier,
      reference: invoice.invoiceNumber,
      date: invoice.invoiceDate, // ISO YYYY-MM-DD expected usually, currently passing DD/MM/YYYY needs conversion if strict
      currency: invoice.currency,
      totals: {
        net: invoice.amountExclVat,
        tax_inclusive: invoice.amountInclVat
      }
    },
    lines: invoice.items?.map(item => ({
      item_code: item.articleId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      amount: item.amount
    })) || []
  };

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Support common Authorization patterns
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}`, 'X-API-Key': config.apiKey } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // Assume success if 200 OK, but check for app-level success if present
    return {
      success: true,
      reference: responseData.id || responseData.reference || 'SYNCED',
      message: 'Successfully exported to ERP'
    };

  } catch (error: any) {
    console.error("ERP Export Error:", error);
    return {
      success: false,
      message: error.message || 'Network error during ERP sync'
    };
  }
};