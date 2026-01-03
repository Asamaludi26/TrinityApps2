
import { ParsedScanResult } from '../types';

// Universal parser for QR and Barcodes
export const parseScanData = (data: string): ParsedScanResult => {
    const raw = data.trim();
    let result: ParsedScanResult = { raw };

    // Regex patterns
    const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{12})$/;
    const ASSET_ID_REGEX = /^AST-\d{4,}$/;
    const SERIAL_NUMBER_REGEX = /^[A-Z0-9-]{6,}$/i;

    // 1. Try to parse as JSON (Smart QR)
    try {
        const jsonData = JSON.parse(raw);
        
        // V1 Format (Legacy): { type: 'asset', id: '...' }
        if (jsonData.type === 'asset' && (jsonData.id || jsonData.sn)) {
            result.id = jsonData.id;
            result.serialNumber = jsonData.sn;
            result.macAddress = jsonData.mac ? jsonData.mac.replace(/[:-]/g, '').toUpperCase() : undefined;
            if (jsonData.name) result.name = jsonData.name;
            return result;
        }

        // V2 Format (Minified): { t: 'a', i: '...' }
        // t = type (a=asset), i = id, s = serial, m = mac
        if (jsonData.t === 'a' && jsonData.i) {
            result.id = jsonData.i;
            if (jsonData.s) result.serialNumber = jsonData.s;
            if (jsonData.m) result.macAddress = jsonData.m;
            return result;
        }

    } catch (e) {
        // Not a JSON, continue to regex fallback
    }

    // 2. Try to parse as key-value pairs (e.g., "SN:123, MAC:ABC")
    const pairs = raw.split(/[,;\n\r]/).map(p => p.trim());
    let foundKeyValue = false;
    for (const pair of pairs) {
        const parts = pair.split(/[:=]/).map(p => p.trim());
        if (parts.length === 2) {
            const key = parts[0].toLowerCase();
            const value = parts[1];
            if (key.includes('sn') || key.includes('serial')) {
                result.serialNumber = value;
                foundKeyValue = true;
            } else if (key.includes('mac')) {
                result.macAddress = value.replace(/[:-]/g, '').toUpperCase();
                foundKeyValue = true;
            } else if (key.includes('id') || key.includes('asset')) {
                result.id = value;
                foundKeyValue = true;
            }
        }
    }
    if (foundKeyValue) {
        return result;
    }
    
    // 3. Raw String Identification
    if (ASSET_ID_REGEX.test(raw)) {
        result.id = raw;
        return result;
    }

    if (MAC_REGEX.test(raw)) {
        result.macAddress = raw.replace(/[:-]/g, '').toUpperCase();
        return result;
    }
    
    if (SERIAL_NUMBER_REGEX.test(raw)) {
        result.serialNumber = raw;
        return result;
    }

    return result;
};
