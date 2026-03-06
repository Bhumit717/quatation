import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, FileDown, Upload, Save, History, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import AIDataExtractor from "./AIDataExtractor";
import qrCodeImage from "@/assets/qr-code.jpeg";
import signatureImg from "@/assets/signature.png";

interface QuotationItem {
  id: string;
  description: string;
  diameter: string;
  length: string;
  weight: string;
  perPiecePrice: number;
  quantity: string;
  totalAmount: number;
  totalOverride: boolean;
}

interface CompanyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
}

interface CustomerDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface ThemeColors {
  headerBg: string;
  headerText: string;
  tableBorder: string;
  bodyBg: string;
}

const QuotationGenerator = () => {
  const { toast } = useToast();
  const [quotationNumber, setQuotationNumber] = useState("Q-001");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: "PATEL IMPEX",
    address: "Rajkot, Gujarat(India) 360024",
    phone: "+91 9974873171/+91 7984133417",
    email: "info@patelimpex.com",
    website: "www.patelimpex.com",
    logo: "/lovable-uploads/5690aa0b-e2fd-441e-8759-456ed41f1a8d.png"
  });

  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: "",
    address: "",
    phone: "",
    email: ""
  });

  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: "1",
      description: "",
      diameter: "",
      length: "",
      weight: "",
      perPiecePrice: 0,
      quantity: "",
      totalAmount: 0,
      totalOverride: false
    }
  ]);

  const [qrCode, setQrCode] = useState(qrCodeImage);
  const [signature, setSignature] = useState(signatureImg);
  const [themeColors, setThemeColors] = useState<ThemeColors>({
    headerBg: "hsl(210, 10%, 24%)",
    headerText: "#ffffff",
    tableBorder: "#cccccc",
    bodyBg: "#ffffff"
  });

  const [columnHeaders, setColumnHeaders] = useState({
    sno: 'S.No.',
    items: 'ITEMS',
    dia: 'Dia MM',
    length: 'Length MM',
    weight: 'Weight',
    price: 'PER PIECE PRICE',
    qty: 'QTY',
    total: 'TOTAL AMOUNT',
    action: 'Action',
    port: 'PORT:',
    advance: 'ADVANCE PAYMENT',
    extra: 'Extra Details:',
    totalValue: 'TOTAL VALUE',
    customerLabel: 'CUSTOMER',
    quotationLabel: 'QUOTATION',
    dateLabel: 'DATE',
    addressLabel: 'Address:',
    phoneLabel: 'Phone:',
    emailLabel: 'E-mail:',
    websiteLabel: 'Website:'
  });

  const [portDetails, setPortDetails] = useState("Alexandria Egypt and UMM qasr iraq");
  const [extraDetails, setExtraDetails] = useState("");
  const [advancePayment, setAdvancePayment] = useState(70);
  const [advanceAmountOverride, setAdvanceAmountOverride] = useState<number | null>(null);
  const [totalValueOverride, setTotalValueOverride] = useState<number | null>(null);
  const [showAdvancePercentage, setShowAdvancePercentage] = useState(true);
  const [showAdvanceValue, setShowAdvanceValue] = useState(true);
  const [showTotalValue, setShowTotalValue] = useState(true);
  const [searchParams] = useSearchParams();

  // Undo/Redo State
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const isInternalChange = useRef(false);

  const getCurrentState = () => ({
    items: JSON.parse(JSON.stringify(items)),
    customerDetails: { ...customerDetails },
    columnHeaders: { ...columnHeaders },
    portDetails,
    extraDetails,
    advancePayment,
    advanceAmountOverride,
    totalValueOverride,
    showAdvancePercentage,
    showAdvanceValue,
    showTotalValue
  });

  const pushUndoState = () => {
    if (isInternalChange.current) return;
    const state = getCurrentState();
    setUndoStack(prev => {
      // Don't save if it's the same as last state
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (JSON.stringify(last) === JSON.stringify(state)) return prev;
      }
      return [...prev.slice(-49), state]; // Keep last 50
    });
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length <= 1) return;
    isInternalChange.current = true;

    const currentState = getCurrentState();
    const prevStack = [...undoStack];
    const targetState = prevStack[prevStack.length - 2];
    const popped = prevStack.pop();

    setRedoStack(prev => [popped, ...prev]);
    setUndoStack(prevStack);

    applyState(targetState);

    setTimeout(() => { isInternalChange.current = false; }, 50);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    isInternalChange.current = true;

    const nextState = redoStack[0];
    const remainingRedo = redoStack.slice(1);

    setUndoStack(prev => [...prev, nextState]);
    setRedoStack(remainingRedo);

    applyState(nextState);

    setTimeout(() => { isInternalChange.current = false; }, 50);
  };

  const applyState = (state: any) => {
    setItems(state.items);
    setCustomerDetails(state.customerDetails);
    setColumnHeaders(state.columnHeaders);
    setPortDetails(state.portDetails);
    setExtraDetails(state.extraDetails);
    setAdvancePayment(state.advancePayment);
    setAdvanceAmountOverride(state.advanceAmountOverride);
    setTotalValueOverride(state.totalValueOverride);
    setShowAdvancePercentage(state.showAdvancePercentage);
    setShowAdvanceValue(state.showAdvanceValue);
    setShowTotalValue(state.showTotalValue);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack]);

  // Initial state save
  useEffect(() => {
    if (undoStack.length === 0) {
      setUndoStack([getCurrentState()]);
    }
  }, []);

  // Load from local storage history if ID is provided
  useEffect(() => {
    const historyId = searchParams.get('id');
    if (historyId) {
      const history = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      const savedData = history.find((h: any) => h.id === historyId);
      if (savedData) {
        setQuotationNumber(savedData.quotationNumber);
        setDate(savedData.date);
        setCompanyDetails(savedData.companyDetails);
        setCustomerDetails(savedData.customerDetails);
        setItems(savedData.items);
        setQrCode(savedData.qrCode);
        setThemeColors(savedData.themeColors);
        setColumnHeaders(savedData.columnHeaders);
        setPortDetails(savedData.portDetails);
        setExtraDetails(savedData.extraDetails);
        setAdvancePayment(savedData.advancePayment);
        setAdvanceAmountOverride(savedData.advanceAmountOverride);
        setTotalValueOverride(savedData.totalValueOverride);
        if (savedData.showAdvancePercentage !== undefined) setShowAdvancePercentage(savedData.showAdvancePercentage);
        if (savedData.showAdvanceValue !== undefined) setShowAdvanceValue(savedData.showAdvanceValue);
        if (savedData.showTotalValue !== undefined) setShowTotalValue(savedData.showTotalValue);

        toast({
          title: "Loaded from History",
          description: `Quotation ${savedData.quotationNumber} has been loaded.`,
        });
      }
    }
  }, [searchParams]);

  const saveToHistory = () => {
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      quotationNumber,
      date,
      companyDetails,
      customerDetails,
      items,
      qrCode,
      signature,
      themeColors,
      columnHeaders,
      portDetails,
      extraDetails,
      advancePayment,
      advanceAmountOverride,
      totalValueOverride,
      showAdvancePercentage,
      showAdvanceValue,
      showTotalValue,
      totalAmount: getTotalValue()
    };

    const history = JSON.parse(localStorage.getItem('quotation_history') || '[]');
    localStorage.setItem('quotation_history', JSON.stringify([newEntry, ...history].slice(0, 50))); // Keep last 50

    toast({
      title: "Saved to History",
      description: "You can view this quotation in the history page.",
    });
  };

  const addItem = () => {
    pushUndoState();
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      description: "",
      diameter: "",
      length: "",
      weight: "",
      perPiecePrice: 0,
      quantity: "",
      totalAmount: 0,
      totalOverride: false
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      pushUndoState();
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number | boolean) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-calculate total if price or quantity changes
        if (field === 'perPiecePrice' || field === 'quantity') {
          const qty = parseFloat(updatedItem.quantity) || 0;
          updatedItem.totalAmount = updatedItem.perPiecePrice * qty;
          updatedItem.totalOverride = false; // Reset override on price/qty change to ensure sync
        }
        if (field === 'totalAmount') {
          updatedItem.totalOverride = true;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyDetails({ ...companyDetails, logo: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setQrCode(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignature(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCalculatedTotal = () => {
    return items.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const getTotalValue = () => {
    return totalValueOverride !== null ? totalValueOverride : getCalculatedTotal();
  };

  const getAdvanceAmount = () => {
    if (advanceAmountOverride !== null) return advanceAmountOverride;
    return (getTotalValue() * advancePayment) / 100;
  };

  const getAdvancePercentage = () => {
    if (advanceAmountOverride !== null) {
      const total = getTotalValue();
      return total > 0 ? (advanceAmountOverride / total) * 100 : 0;
    }
    return advancePayment;
  };

  const handleAIDataExtracted = (data: any) => {
    pushUndoState();
    // Update customer details
    if (data.customerDetails) {
      setCustomerDetails(prev => ({
        ...prev,
        ...(data.customerDetails?.name && { name: data.customerDetails.name }),
        ...(data.customerDetails?.address && { address: data.customerDetails.address }),
        ...(data.customerDetails?.phone && { phone: data.customerDetails.phone }),
        ...(data.customerDetails?.email && { email: data.customerDetails.email }),
      }));
    }

    // Update items
    if (data.items && data.items.length > 0) {
      const extractedItems: QuotationItem[] = data.items.map((item: any, index: number) => {
        const qty = parseFloat(item.quantity || "0") || 0;
        const calcTotal = (item.perPiecePrice || 0) * qty;
        return {
          id: Date.now().toString() + index,
          description: item.description || "",
          diameter: item.diameter || "",
          length: item.length || "",
          weight: item.weight || "",
          perPiecePrice: item.perPiecePrice || 0,
          quantity: item.quantity || "",
          totalAmount: item.totalAmount || calcTotal,
          totalOverride: !!item.totalAmount,
        };
      });

      if (data.action === 'append') {
        // If append, add to existing items. If only one empty item, replace it.
        if (items.length === 1 && !items[0].description) {
          setItems(extractedItems);
        } else {
          setItems(prev => [...prev, ...extractedItems]);
        }
      } else {
        setItems(extractedItems);
      }
    }

    // Update other fields
    if (data.portDetails) setPortDetails(data.portDetails);
    if (data.extraDetails) setExtraDetails(data.extraDetails);
    if (data.advancePayment !== undefined) {
      setAdvancePayment(data.advancePayment);
      setAdvanceAmountOverride(null); // Switch back to % mode when AI gives %
    }
    if (data.showTotalValue !== undefined) {
      setShowTotalValue(data.showTotalValue);
    }
    if (data.columnHeaders) {
      setColumnHeaders(prev => ({ ...prev, ...data.columnHeaders }));
    }
    setTotalValueOverride(null); // Reset total override when AI fills new data
  };

  const getCircularLogoSnapshot = async (src: string): Promise<string | null> => {
    if (!src) return null;
    try {
      let dataUrl = src;
      if (!src.startsWith('data:')) {
        const response = await fetch(src.startsWith('http') ? src : window.location.origin + src);
        const blob = await response.blob();
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      return await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const size = Math.min(img.width, img.height);
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d')!;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    } catch { return src; }
  };

  const pdfRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;
      let y = 15;

      // Helper: parse HSL or hex to RGB
      const parseColor = (color: string): [number, number, number] => {
        const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (hslMatch) {
          const h = parseInt(hslMatch[1]) / 360;
          const s = parseInt(hslMatch[2]) / 100;
          const l = parseInt(hslMatch[3]) / 100;
          let r, g, b;
          if (s === 0) { r = g = b = l; } else {
            const hue2rgb = (p: number, q: number, t: number) => {
              if (t < 0) t += 1; if (t > 1) t -= 1;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
          }
          return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        }
        if (color.startsWith('#')) {
          const hex = color.replace('#', '');
          return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
        }
        return [0, 0, 0];
      };

      const headerBg = parseColor(themeColors.headerBg);
      const headerText = parseColor(themeColors.headerText);

      // Helper: draw filled rect with text
      const drawCell = (x: number, yPos: number, w: number, h: number, text: string, options?: {
        fillColor?: [number, number, number];
        textColor?: [number, number, number];
        bold?: boolean;
        fontSize?: number;
        align?: 'left' | 'center' | 'right';
      }) => {
        const opts = options || {};
        if (opts.fillColor) {
          pdf.setFillColor(...opts.fillColor);
          pdf.rect(x, yPos, w, h, 'F');
        }
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        pdf.rect(x, yPos, w, h);

        pdf.setFontSize(opts.fontSize || 9);
        pdf.setTextColor(...(opts.textColor || [0, 0, 0]));
        if (opts.bold) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }

        let textX = x + 2;
        if (opts.align === 'center') textX = x + w / 2;
        else if (opts.align === 'right') textX = x + w - 2;

        const lines = pdf.splitTextToSize(text, w - 4);
        const textY = yPos + h / 2 - (lines.length - 1) * (opts.fontSize || 9) * 0.18;
        pdf.text(lines, textX, textY, {
          align: opts.align || 'left',
          baseline: 'middle'
        });
      };

      // Load image as data URL
      const loadImageAsDataURL = async (src: string, circular: boolean = false): Promise<string | null> => {
        try {
          if (!src) return null;
          let dataUrl = src;
          if (!src.startsWith('data:')) {
            const response = await fetch(src.startsWith('http') ? src : window.location.origin + src);
            const blob = await response.blob();
            dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
          if (circular) {
            return await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                const size = Math.min(img.width, img.height);
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(dataUrl); return; }
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
                resolve(canvas.toDataURL('image/png'));
              };
              img.onerror = () => resolve(dataUrl);
              img.src = dataUrl;
            });
          }
          return dataUrl;
        } catch { return null; }
      };

      // --- QUOTATION HEADER ---
      drawCell(margin, y, contentWidth, 10, columnHeaders.quotationLabel || 'QUOTATION', {
        fillColor: headerBg, textColor: headerText, bold: true, fontSize: 16, align: 'center'
      });
      y += 10;

      // --- COMPANY INFO SECTION ---
      const logoCol = 20;
      const infoCol = contentWidth - logoCol - 30;
      const dateCol = 30;
      const rowH = 7;

      // Row 1: Company name + DATE header
      drawCell(margin, y, logoCol, rowH * 4, '', {}); // logo area
      drawCell(margin + logoCol, y, infoCol, rowH, companyDetails.name, { bold: true, fontSize: 12 });
      drawCell(margin + logoCol + infoCol, y, dateCol, rowH, columnHeaders.dateLabel || 'DATE', {
        fillColor: headerBg, textColor: headerText, bold: true, fontSize: 9, align: 'center'
      });
      y += rowH;

      // Row 2: Address + date value
      drawCell(margin + logoCol, y, infoCol, rowH, `${columnHeaders.addressLabel} ${companyDetails.address}`, { fontSize: 8 });
      drawCell(margin + logoCol + infoCol, y, dateCol, rowH, date, { bold: true, fontSize: 9, align: 'center' });
      y += rowH;

      // Row 3: Phone + QR area
      drawCell(margin + logoCol, y, infoCol, rowH, `${columnHeaders.phoneLabel} ${companyDetails.phone}`, { fontSize: 8 });
      drawCell(margin + logoCol + infoCol, y, dateCol, rowH * 2, '', {}); // QR area
      y += rowH;

      // Row 4: Email/Website
      drawCell(margin + logoCol, y, infoCol, rowH, `${columnHeaders.emailLabel} ${companyDetails.email}  |  ${columnHeaders.websiteLabel} ${companyDetails.website}`, { fontSize: 8 });
      y += rowH;

      // Add logo image
      try {
        const logoData = await getCircularLogoSnapshot(companyDetails.logo);
        if (logoData) {
          pdf.addImage(logoData, 'PNG', margin + 3, y - rowH * 4 + 3, 14, 14);
        }
      } catch { }

      // Add QR code image
      try {
        const qrData = await loadImageAsDataURL(qrCode);
        if (qrData) {
          pdf.addImage(qrData, 'JPEG', margin + logoCol + infoCol + 5, y - rowH * 2 + 1, 12, 12);
        }
      } catch { }

      y += 4;

      // --- CUSTOMER SECTION ---
      drawCell(margin, y, contentWidth, 9, `${columnHeaders.customerLabel}: ${customerDetails.name}`, {
        bold: true, fontSize: 11, align: 'center'
      });
      y += 13;

      // --- ITEMS TABLE ---
      const hasDescriptions = items.some(item => item.description.trim());
      const hasDiameters = items.some(item => item.diameter.trim());
      const hasLengths = items.some(item => item.length.trim());
      const hasWeights = items.some(item => item.weight.trim());

      // Build columns dynamically
      const cols: { label: string; width: number; key: string }[] = [
        { label: columnHeaders.sno, width: 12, key: 'sno' },
        { label: columnHeaders.items, width: 0, key: 'items' }, // flex
      ];
      if (hasDiameters) cols.push({ label: columnHeaders.dia, width: 18, key: 'dia' });
      if (hasLengths) cols.push({ label: columnHeaders.length, width: 20, key: 'len' });
      if (hasWeights) cols.push({ label: columnHeaders.weight, width: 18, key: 'wgt' });
      cols.push({ label: columnHeaders.price, width: 28, key: 'price' });
      cols.push({ label: columnHeaders.qty, width: 16, key: 'qty' });
      cols.push({ label: columnHeaders.total, width: 28, key: 'total' });

      const fixedWidth = cols.filter(c => c.key !== 'items').reduce((s, c) => s + c.width, 0);
      const itemsCol = cols.find(c => c.key === 'items')!;
      itemsCol.width = contentWidth - fixedWidth;

      const headerH = 8;
      let x = margin;
      cols.forEach(col => {
        drawCell(x, y, col.width, headerH, col.label, {
          fillColor: headerBg, textColor: headerText, bold: true, fontSize: 7, align: 'center'
        });
        x += col.width;
      });
      y += headerH;

      // Item rows
      items.forEach((item, index) => {
        // Calculate row height based on description length
        pdf.setFontSize(8);
        const descLines = pdf.splitTextToSize(item.description || 'Copper Bond Grounding Rod', itemsCol.width - 4);
        const itemRowH = Math.max(7, descLines.length * 3.5 + 3);

        x = margin;
        cols.forEach(col => {
          let text = '';
          let align: 'left' | 'center' | 'right' = 'center';
          let textColor: [number, number, number] = [0, 0, 0];
          let bold = false;

          switch (col.key) {
            case 'sno': text = String(index + 1); break;
            case 'items': text = item.description || 'Copper Bond Grounding Rod'; align = 'left'; break;
            case 'dia': text = item.diameter || '-'; break;
            case 'len': text = item.length || '-'; break;
            case 'wgt': text = item.weight || '-'; break;
            case 'price': text = item.perPiecePrice > 0 ? `${item.perPiecePrice} USD` : ''; break;
            case 'qty': text = item.quantity || ''; break;
            case 'total': text = item.totalAmount > 0 ? `${item.totalAmount.toFixed(0)} USD` : ''; textColor = [220, 38, 38]; bold = true; break;
          }

          drawCell(x, y, col.width, itemRowH, text, {
            fontSize: 8, align, textColor, bold
          });
          x += col.width;
        });
        y += itemRowH;
      });

      if (showTotalValue && getTotalValue() > 0) {
        // Total row
        const totalLabelWidth = contentWidth - cols[cols.length - 1].width;
        drawCell(margin, y, totalLabelWidth, 8, columnHeaders.totalValue, {
          fillColor: [245, 245, 245], bold: true, fontSize: 9, align: 'right'
        });
        drawCell(margin + totalLabelWidth, y, cols[cols.length - 1].width, 8, `${(totalValueOverride !== null ? totalValueOverride : getTotalValue()).toFixed(0)} USD`, {
          fillColor: [245, 245, 245], textColor: [220, 38, 38], bold: true, fontSize: 9, align: 'center'
        });
        y += 12;
      }

      // --- FOOTER ---
      if (portDetails.trim()) {
        drawCell(margin, y, contentWidth, 7, `${columnHeaders.port} ${portDetails}`, { fontSize: 9, align: 'center' });
        y += 7;
      }

      if (advancePayment > 0 || advanceAmountOverride !== null) {
        let advanceText = columnHeaders.advance;
        if (showAdvancePercentage && advancePayment > 0) advanceText += ` (${advancePayment}%)`;
        if (showAdvanceValue) advanceText += `: ${getAdvanceAmount().toFixed(0)} USD`;

        if (showAdvancePercentage || showAdvanceValue) {
          drawCell(margin, y, contentWidth, 7, advanceText, {
            textColor: [220, 38, 38], bold: true, fontSize: 9, align: 'center'
          });
          y += 7;
        }
      }

      if (extraDetails.trim()) {
        pdf.setFontSize(8);
        const extraLines = pdf.splitTextToSize(`Extra Details:\n${extraDetails}`, contentWidth - 4);
        const extraH = Math.max(8, extraLines.length * 3.5 + 4);
        drawCell(margin, y, contentWidth, extraH, `Extra Details:\n${extraDetails}`, { fontSize: 8 });
        y += extraH;
      }

      // Bottom section with signature
      y += 10;
      try {
        const signatureData = await loadImageAsDataURL(signature);
        if (signatureData) {
          pdf.addImage(signatureData, 'PNG', margin + 2, y, 40, 15); // Adjust size as needed
        }
      } catch { }

      // Outer frame
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(1.2);
      pdf.rect(5, 5, pageWidth - 10, pdf.internal.pageSize.getHeight() - 10);

      const fileName = `Quotation_${quotationNumber}_${customerDetails.name || 'Customer'}_${date}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Generated Successfully!",
        description: `Extractable text PDF ${fileName} has been downloaded.`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error generating PDF",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Quotation');

      // Helper function to load image as buffer
      const getImageBuffer = async (imgSrc: string): Promise<ArrayBuffer> => {
        try {
          let url = imgSrc;
          if (!imgSrc.startsWith('data:') && !imgSrc.startsWith('http')) {
            url = window.location.origin + imgSrc;
          }
          const response = await fetch(url);
          const blob = await response.blob();
          return await blob.arrayBuffer();
        } catch (error) {
          console.error('Error loading image:', error);
          throw error;
        }
      };

      // Convert HSL to hex for Excel
      const hslToHex = (hsl: string): string => {
        const hslMatch = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (hslMatch) {
          const h = parseInt(hslMatch[1]) / 360;
          const s = parseInt(hslMatch[2]) / 100;
          const l = parseInt(hslMatch[3]) / 100;

          let r, g, b;
          if (s === 0) {
            r = g = b = l;
          } else {
            const hue2rgb = (p: number, q: number, t: number) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
          }

          const toHex = (x: number) => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          };
          return 'FF' + toHex(r) + toHex(g) + toHex(b);
        }
        return 'FFFFFFFF';
      };

      const headerBgColor = hslToHex(themeColors.headerBg);
      const headerTextColor = themeColors.headerText.startsWith('#')
        ? 'FF' + themeColors.headerText.replace('#', '').toUpperCase()
        : 'FFFFFFFF';

      // Check what columns to show
      const hasDiameters = items.some(item => item.diameter.trim());
      const hasLengths = items.some(item => item.length.trim());
      const hasWeights = items.some(item => item.weight.trim());

      // Calculate column count
      let colCount = 5; // Base: S.No, ITEMS, PER PIECE PRICE, QTY, TOTAL AMOUNT
      if (hasDiameters) colCount++;
      if (hasLengths) colCount++;
      if (hasWeights) colCount++;

      // Set column widths to match PDF proportions
      const columns = [];
      columns.push({ width: 14 });   // S.No
      columns.push({ width: 50 });  // ITEMS
      if (hasDiameters) columns.push({ width: 16 });
      if (hasLengths) columns.push({ width: 16 });
      if (hasWeights) columns.push({ width: 16 });
      columns.push({ width: 22 }); // PER PIECE PRICE
      columns.push({ width: 12 }); // QTY
      columns.push({ width: 22 }); // TOTAL AMOUNT

      worksheet.columns = columns.map((col, i) => ({
        key: `col${i}`,
        width: col.width
      }));

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        left: { style: 'thin' as const },
        right: { style: 'thin' as const }
      };

      let currentRow = 1;
      const startRow = currentRow;

      // Row 1: QUOTATION Header
      const headerRow = worksheet.getRow(currentRow);
      headerRow.height = 28;
      const headerCell = headerRow.getCell(1);
      headerCell.value = 'QUOTATION';
      headerCell.font = { bold: true, size: 18, color: { argb: headerTextColor } };
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: headerBgColor }
      };
      headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
      headerCell.border = thinBorder;
      worksheet.mergeCells(currentRow, 1, currentRow, colCount);

      // Apply border to all merged cells
      for (let i = 1; i <= colCount; i++) {
        headerRow.getCell(i).border = thinBorder;
      }
      currentRow++;

      // Row 2-5: Company info with logo and date/QR
      // Row 2: Logo (rowspan 4) | Company Name | DATE
      const row2 = worksheet.getRow(currentRow);
      row2.height = 30;
      row2.getCell(1).value = ''; // Logo placeholder
      row2.getCell(2).value = companyDetails.name;
      row2.getCell(2).font = { bold: true, size: 14 };
      row2.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      row2.getCell(colCount).value = columnHeaders.dateLabel;
      row2.getCell(colCount).font = { bold: true, color: { argb: headerTextColor } };
      row2.getCell(colCount).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: headerBgColor }
      };
      row2.getCell(colCount).alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells(currentRow, 2, currentRow, colCount - 1);
      for (let i = 1; i <= colCount; i++) {
        row2.getCell(i).border = thinBorder;
      }
      currentRow++;

      // Row 3: Address | Date value
      const row3 = worksheet.getRow(currentRow);
      row3.height = 30;
      row3.getCell(2).value = `${columnHeaders.addressLabel} ${companyDetails.address}`;
      row3.getCell(2).font = { size: 11 };
      row3.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      row3.getCell(colCount).value = date;
      row3.getCell(colCount).font = { bold: true };
      row3.getCell(colCount).alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells(currentRow, 2, currentRow, colCount - 1);
      for (let i = 1; i <= colCount; i++) {
        row3.getCell(i).border = thinBorder;
      }
      currentRow++;

      // Row 4: Phone | QR (rowspan 2)
      const row4 = worksheet.getRow(currentRow);
      row4.height = 45;
      row4.getCell(2).value = `${columnHeaders.phoneLabel} ${companyDetails.phone}`;
      row4.getCell(2).font = { size: 11 };
      row4.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(currentRow, 2, currentRow, colCount - 1);
      worksheet.mergeCells(currentRow, colCount, currentRow + 1, colCount); // QR area
      for (let i = 1; i <= colCount; i++) {
        row4.getCell(i).border = thinBorder;
      }
      currentRow++;

      // Row 5: Email & Website
      const row5 = worksheet.getRow(currentRow);
      row5.height = 45;
      row5.getCell(2).value = `${columnHeaders.emailLabel} ${companyDetails.email}\n${columnHeaders.websiteLabel} ${companyDetails.website}`;
      row5.getCell(2).font = { size: 11 };
      row5.getCell(2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };

      worksheet.mergeCells(currentRow, 2, currentRow, colCount - 1);
      for (let i = 1; i <= colCount; i++) {
        row5.getCell(i).border = thinBorder;
      }

      // Merge logo area (rows 2-5, column 1)
      worksheet.mergeCells(2, 1, 5, 1);

      // Add logo image
      try {
        const logoData = await getCircularLogoSnapshot(companyDetails.logo);

        if (logoData) {
          const base64Data = logoData.split(',')[1];
          const logoImageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          });
          worksheet.addImage(logoImageId, {
            tl: { col: 0.15, row: 1.15 },
            ext: { width: 75, height: 75 }
          });
        }
      } catch (error) {
        console.error('Error adding top logo:', error);
      }

      // Add QR code image
      try {
        const qrBuffer = await getImageBuffer(qrCode);
        const qrImageId = workbook.addImage({
          buffer: qrBuffer,
          extension: 'png',
        });
        worksheet.addImage(qrImageId, {
          tl: { col: colCount - 1, row: currentRow - 2.85 },
          ext: { width: 85, height: 85 }
        });
      } catch (error) {
        console.error('Error adding QR code:', error);
      }

      currentRow++;

      // Empty row
      currentRow++;

      // Customer section
      const customerRow = worksheet.getRow(currentRow);
      customerRow.height = 22;
      customerRow.getCell(1).value = `${columnHeaders.customerLabel}: ${customerDetails.name}`;
      customerRow.getCell(1).font = { bold: true, size: 13 };
      customerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(currentRow, 1, currentRow, colCount);
      for (let i = 1; i <= colCount; i++) {
        customerRow.getCell(i).border = thinBorder;
      }
      currentRow++;

      // Empty row
      currentRow++;

      // Items table header
      const itemsHeaderRow = worksheet.getRow(currentRow);
      itemsHeaderRow.height = 22;
      const headers = [columnHeaders.sno, columnHeaders.items];
      if (hasDiameters) headers.push(columnHeaders.dia);
      if (hasLengths) headers.push(columnHeaders.length);
      if (hasWeights) headers.push(columnHeaders.weight);
      headers.push(columnHeaders.price, columnHeaders.qty, columnHeaders.total);

      headers.forEach((header, idx) => {
        const cell = itemsHeaderRow.getCell(idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: headerTextColor } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: headerBgColor }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;
      });
      currentRow++;

      // Items data rows
      items.forEach((item, index) => {
        const itemRow = worksheet.getRow(currentRow);
        itemRow.height = 40;

        let colIdx = 1;
        const snoCell = itemRow.getCell(colIdx++);
        snoCell.value = index + 1;
        snoCell.alignment = { horizontal: 'center', vertical: 'middle' };
        snoCell.border = thinBorder;

        const descCell = itemRow.getCell(colIdx++);
        descCell.value = item.description || 'Copper Bond Grounding Rod';
        descCell.font = { size: 11 };
        descCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
        descCell.border = thinBorder;

        if (hasDiameters) {
          const diaCell = itemRow.getCell(colIdx++);
          diaCell.value = item.diameter || '-';
          diaCell.alignment = { horizontal: 'center', vertical: 'middle' };
          diaCell.border = thinBorder;
        }

        if (hasLengths) {
          const lenCell = itemRow.getCell(colIdx++);
          lenCell.value = item.length || '-';
          lenCell.alignment = { horizontal: 'center', vertical: 'middle' };
          lenCell.border = thinBorder;
        }

        if (hasWeights) {
          const wgtCell = itemRow.getCell(colIdx++);
          wgtCell.value = item.weight || '-';
          wgtCell.alignment = { horizontal: 'center', vertical: 'middle' };
          wgtCell.border = thinBorder;
        }

        const priceCell = itemRow.getCell(colIdx++);
        priceCell.value = item.perPiecePrice > 0 ? `${item.perPiecePrice} USD` : '';
        priceCell.alignment = { horizontal: 'center', vertical: 'middle' };
        priceCell.border = thinBorder;

        const qtyCell = itemRow.getCell(colIdx++);
        qtyCell.value = item.quantity || '';
        qtyCell.alignment = { horizontal: 'center', vertical: 'middle' };
        qtyCell.border = thinBorder;

        const totalCell = itemRow.getCell(colIdx);
        totalCell.value = item.totalAmount > 0 ? `${item.totalAmount.toFixed(0)} USD` : '';
        totalCell.font = { bold: true, color: { argb: 'FFDC2626' } };
        totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalCell.border = thinBorder;

        currentRow++;
      });

      if (showTotalValue && getTotalValue() > 0) {
        // Total row
        const totalRow = worksheet.getRow(currentRow);
        totalRow.height = 30;

        // Merge all cells except last for "TOTAL VALUE" label
        worksheet.mergeCells(currentRow, 1, currentRow, colCount - 1);
        const totalLabelCell = totalRow.getCell(1);
        totalLabelCell.value = columnHeaders.totalValue;
        totalLabelCell.font = { bold: true };
        totalLabelCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' }
        };
        totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalLabelCell.border = thinBorder;
        for (let i = 2; i < colCount; i++) {
          totalRow.getCell(i).border = thinBorder;
        }

        const totalValueCell = totalRow.getCell(colCount);
        totalValueCell.value = `${(totalValueOverride !== null ? totalValueOverride : getTotalValue()).toFixed(0)} USD`;
        totalValueCell.font = { bold: true, color: { argb: 'FFDC2626' } };
        totalValueCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' }
        };
        totalValueCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalValueCell.border = thinBorder;
        currentRow++;
      }

      // Empty row
      currentRow++;

      // Port details
      if (portDetails.trim()) {
        const portRow = worksheet.getRow(currentRow);
        portRow.height = 30;
        portRow.getCell(1).value = `${columnHeaders.port} ${portDetails}`;
        portRow.getCell(1).font = { size: 12 };
        portRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.mergeCells(currentRow, 1, currentRow, colCount);
        for (let i = 1; i <= colCount; i++) {
          portRow.getCell(i).border = thinBorder;
        }
        currentRow++;
      }

      if ((advancePayment > 0 || advanceAmountOverride !== null) && (showAdvancePercentage || showAdvanceValue)) {
        const advanceRow = worksheet.getRow(currentRow);
        advanceRow.height = 30;
        let advanceText = columnHeaders.advance;
        if (showAdvancePercentage && advancePayment > 0) advanceText += ` (${advancePayment}%)`;
        if (showAdvanceValue) advanceText += `: ${getAdvanceAmount().toFixed(0)} USD`;

        advanceRow.getCell(1).value = advanceText;
        advanceRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FFDC2626' } };
        advanceRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.mergeCells(currentRow, 1, currentRow, colCount);
        for (let i = 1; i <= colCount; i++) {
          advanceRow.getCell(i).border = thinBorder;
        }
        currentRow++;
      }

      // Extra details
      if (extraDetails.trim()) {
        currentRow++; // Empty row
        const extraRow = worksheet.getRow(currentRow);
        extraRow.height = 50;
        extraRow.getCell(1).value = `${columnHeaders.extra}\n${extraDetails}`;
        extraRow.getCell(1).font = { size: 11 };
        extraRow.getCell(1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
        worksheet.mergeCells(currentRow, 1, currentRow, colCount);
        for (let i = 1; i <= colCount; i++) {
          extraRow.getCell(i).border = thinBorder;
        }
      }

      // Bottom Signature
      currentRow++; // Spacer row
      currentRow++; // Image row

      const bottomImageRow = worksheet.getRow(currentRow);
      bottomImageRow.height = 80;
      worksheet.mergeCells(currentRow, 1, currentRow, colCount);

      // We don't necessarily need inner borders for the bottom image cell, it just sits inside the outer frame.
      for (let i = 1; i <= colCount; i++) {
        bottomImageRow.getCell(i).border = {
          left: i === 1 ? { style: 'medium' as const } : undefined,
          right: i === colCount ? { style: 'medium' as const } : undefined,
          bottom: { style: 'medium' as const }
        };
      }

      try {
        const signatureBuffer = await getImageBuffer(signature);
        const signatureImageId = workbook.addImage({
          buffer: signatureBuffer,
          extension: 'png',
        });
        worksheet.addImage(signatureImageId, {
          tl: { col: 0.2, row: currentRow - 1 + 0.2 },
          ext: { width: 150, height: 60 } // Signature width/height
        });
      } catch (error) {
        console.error('Error adding signature to Excel:', error);
      }

      const endRow = currentRow;

      // Add thick OUTER border around entire document (like PDF frame)
      // Top border
      for (let col = 1; col <= colCount; col++) {
        const cell = worksheet.getRow(startRow).getCell(col);
        cell.border = {
          ...cell.border,
          top: { style: 'medium' as const }
        };
      }

      // Bottom border
      for (let col = 1; col <= colCount; col++) {
        const cell = worksheet.getRow(endRow).getCell(col);
        cell.border = {
          ...cell.border,
          bottom: { style: 'medium' as const }
        };
      }

      // Left border
      for (let row = startRow; row <= endRow; row++) {
        const cell = worksheet.getRow(row).getCell(1);
        cell.border = {
          ...cell.border,
          left: { style: 'medium' as const }
        };
      }

      // Right border
      for (let row = startRow; row <= endRow; row++) {
        const cell = worksheet.getRow(row).getCell(colCount);
        cell.border = {
          ...cell.border,
          right: { style: 'medium' as const }
        };
      }

      // Generate and download Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `Quotation_${quotationNumber}_${customerDetails.name || 'Customer'}_${date}.xlsx`;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Excel Generated Successfully!",
        description: `PDF-matched Excel with outer frame border and all styling.`,
      });
    } catch (error) {
      console.error('Excel generation error:', error);
      toast({
        title: "Error generating Excel",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyAsHTML = async () => {
    try {
      // Determine which columns to show, same as PDF logic
      const hasDiameters = items.some(item => item.diameter.trim());
      const hasLengths = items.some(item => item.length.trim());
      const hasWeights = items.some(item => item.weight.trim());

      const cols = [
        { label: columnHeaders.sno, key: 'sno' },
        { label: columnHeaders.items, key: 'items' }
      ];
      if (hasDiameters) cols.push({ label: columnHeaders.dia, key: 'dia' });
      if (hasLengths) cols.push({ label: columnHeaders.length, key: 'len' });
      if (hasWeights) cols.push({ label: columnHeaders.weight, key: 'wgt' });
      cols.push({ label: columnHeaders.price, key: 'price' });
      cols.push({ label: columnHeaders.qty, key: 'qty' });
      cols.push({ label: columnHeaders.total, key: 'total' });

      // Get logo and QR data
      const logoData = companyDetails.logo ? await getCircularLogoSnapshot(companyDetails.logo) : null;
      const qrData = qrCode || null;

      const htmlOutput = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; border: 4px solid #000; padding: 15px; background-color: #ffffff; color: #000;">
  <!-- Header Label -->
  <div style="background-color: ${themeColors.headerBg}; color: ${themeColors.headerText}; text-align: center; padding: 10px; font-weight: bold; font-size: 20px; border: 1px solid #000; margin-bottom: 0;">
    ${columnHeaders.quotationLabel || 'QUOTATION'}
  </div>
  
  <!-- Company Info Table -->
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 15px;">
    <tr>
      <td style="padding: 10px; border-right: 1px solid #000; width: 80px; text-align: center; vertical-align: middle;">
        ${logoData ? `<img src="${logoData}" alt="Logo" style="width: 60px; height: 60px; border-radius: 50%; display: block; margin: 0 auto;" />` : ''}
      </td>
      <td style="padding: 10px; text-align: left; vertical-align: top;">
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${companyDetails.name}</div>
        <div style="font-size: 11px; line-height: 1.4; color: #000;">
          <strong>${columnHeaders.addressLabel}</strong> ${companyDetails.address}<br/>
          <strong>${columnHeaders.phoneLabel}</strong> ${companyDetails.phone}<br/>
          <strong>${columnHeaders.emailLabel}</strong> ${companyDetails.email} | <strong>${columnHeaders.websiteLabel}</strong> ${companyDetails.website}
        </div>
      </td>
      <td style="width: 100px; text-align: center; vertical-align: top; border-left: 1px solid #000; padding: 0;">
        <div style="background-color: ${themeColors.headerBg}; color: ${themeColors.headerText}; padding: 6px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #000;">
          ${columnHeaders.dateLabel || 'DATE'}
        </div>
        <div style="padding: 8px; font-weight: bold; font-size: 12px; border-bottom: 1px solid #000;">
          ${date}
        </div>
        <div style="padding: 5px; height: 50px; display: flex; align-items: center; justify-content: center;">
          ${qrData ? `<img src="${qrData}" alt="QR" style="height: 45px; width: 45px; display: block; margin: 0 auto;" />` : ''}
        </div>
      </td>
    </tr>
  </table>

  <!-- Customer Section -->
  <div style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; margin-bottom: 15px; font-size: 14px; background-color: #f8f9fa;">
    ${columnHeaders.customerLabel || 'CUSTOMER'}: ${customerDetails.name || 'CUSTOMER'}
  </div>

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 15px;">
    <thead>
      <tr style="background-color: ${themeColors.headerBg}; color: ${themeColors.headerText}; font-size: 11px;">
        ${cols.map(col => `<th style="border: 1px solid #000; padding: 8px; text-align: ${col.key === 'items' ? 'left' : 'center'};">${col.label}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${items.map((item, index) => `
        <tr style="font-size: 11px;">
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: left;">${item.description || 'Copper Bond Grounding Rod'}</td>
          ${hasDiameters ? `<td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.diameter || '-'}</td>` : ''}
          ${hasLengths ? `<td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.length || '-'}</td>` : ''}
          ${hasWeights ? `<td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.weight || '-'}</td>` : ''}
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.perPiecePrice > 0 ? item.perPiecePrice + ' USD' : '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.quantity || '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #dc2626;">${item.totalAmount > 0 ? item.totalAmount.toFixed(0) + ' USD' : '-'}</td>
        </tr>
      `).join('')}
      
      <!-- Total Line -->
      ${showTotalValue && getTotalValue() > 0 ? `
        <tr style="background-color: #eeeeee; font-weight: bold; font-size: 12px;">
          <td colspan="${cols.length - 1}" style="border: 1px solid #000; padding: 10px; text-align: right;">${columnHeaders.totalValue || 'Total Content Value'}</td>
          <td style="border: 1px solid #000; padding: 10px; text-align: center; color: #dc2626;">${(totalValueOverride !== null ? totalValueOverride : getTotalValue()).toFixed(0)} USD</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <!-- Additional Info -->
  <div style="font-size: 12px;">
    ${portDetails.trim() ? `
      <div style="border: 1px solid #000; padding: 8px; text-align: center; margin-bottom: 5px; background-color: #ffffff;">
        <strong>${columnHeaders.port || 'PORT'}:</strong> ${portDetails}
      </div>
    ` : ''}
    
    ${(advancePayment > 0 || advanceAmountOverride !== null) && (showAdvancePercentage || showAdvanceValue) ? `
      <div style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: #dc2626; margin-bottom: 5px; background-color: #ffffff;">
        ${columnHeaders.advance || 'ADVANCE'}${(showAdvancePercentage && advancePayment > 0) ? ` (${advancePayment}%)` : ''}: ${getAdvanceAmount().toFixed(0)} USD
      </div>
    ` : ''}
    
    ${extraDetails.trim() ? `
      <div style="border: 1px solid #000; padding: 10px; text-align: left; background-color: #fcfcfc;">
        <strong style="text-decoration: underline; margin-bottom: 5px; display: block;">${columnHeaders.extra || 'Extra Details'}:</strong>
        <div style="white-space: pre-wrap; line-height: 1.5;">${extraDetails}</div>
      </div>
    ` : ''}
  </div>

    <!-- Footer Section with Signature -->
    <div style="margin-top: 25px; border-top: 1px solid #ccc; padding-top: 15px; display: flex; align-items: center; justify-content: flex-start;">
      ${signature ? `<img src="${signature}" alt="Signature" style="max-height: 50px; width: auto;" />` : ''}
    </div>
  </div>
</div>
      `;

      // Copy as HTML
      const type = "text/html";
      const plainText = htmlOutput.replace(/<[^>]*>/g, '').trim();
      const blob = new Blob([htmlOutput], { type });
      const data = [new ClipboardItem({
        [type]: blob,
        ["text/plain"]: new Blob([plainText], { type: "text/plain" })
      })];

      await navigator.clipboard.write(data);

      toast({
        title: "Copied for Email!",
        description: "Quotation table (matching PDF) has been copied. Paste directly into your email.",
      });
    } catch (err) {
      console.error('Failed to copy HTML: ', err);
      toast({
        title: "Copy Failed",
        description: "Your browser might not support copying HTML. Please use PDF download instead.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-quotation-bg p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* AI Data Extractor */}
        <AIDataExtractor onDataExtracted={handleAIDataExtracted} />

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold bg-table-header text-table-header-foreground py-3 rounded">
              QUOTATION GENERATOR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyDetails.name}
                  onChange={(e) => setCompanyDetails({ ...companyDetails, name: e.target.value })}
                  className="font-semibold"
                />
              </div>
              <div>
                <Label htmlFor="quotation-number">Quotation Number</Label>
                <Input
                  id="quotation-number"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company-address">Company Address</Label>
                <Textarea
                  id="company-address"
                  value={companyDetails.address}
                  onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="company-phone">Phone</Label>
                <Input
                  id="company-phone"
                  value={companyDetails.phone}
                  onChange={(e) => setCompanyDetails({ ...companyDetails, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="company-email">Email</Label>
                <Input
                  id="company-email"
                  value={companyDetails.email}
                  onChange={(e) => setCompanyDetails({ ...companyDetails, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="company-website">Website</Label>
                <Input
                  id="company-website"
                  value={companyDetails.website}
                  onChange={(e) => setCompanyDetails({ ...companyDetails, website: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="bg-table-header text-table-header-foreground py-2 px-4 rounded">
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input
                  id="customer-name"
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-address">Address</Label>
                <Textarea
                  id="customer-address"
                  value={customerDetails.address}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="bg-table-header text-table-header-foreground py-2 px-4 rounded">
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
                <thead>
                  <tr className="bg-table-header text-table-header-foreground">
                    {(['sno', 'items', 'dia', 'length', 'weight', 'price', 'qty', 'total', 'action'] as const).map((key) => (
                      <th key={key} className={`border border-table-border px-1 py-1 ${key === 'sno' ? 'w-16' : key === 'items' ? 'min-w-[300px]' : key === 'price' || key === 'total' ? 'w-32' : key === 'action' ? 'w-16' : 'w-24'}`}>
                        <Input
                          value={columnHeaders[key]}
                          onChange={(e) => setColumnHeaders(prev => ({ ...prev, [key]: e.target.value }))}
                          className="border-0 h-8 bg-transparent text-table-header-foreground font-bold text-xs px-1 w-full min-w-0"
                          style={{ color: 'inherit' }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-table-border px-3 py-2 text-center">
                        {index + 1}
                      </td>
                      <td className="border border-table-border px-3 py-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Enter item description"
                          className="border-0 h-8"
                        />
                      </td>
                      <td className="border border-table-border px-3 py-2">
                        <Input
                          value={item.diameter}
                          onChange={(e) => updateItem(item.id, 'diameter', e.target.value)}
                          placeholder="Dia"
                          className="border-0 h-8"
                        />
                      </td>
                      <td className="border border-table-border px-3 py-2">
                        <Input
                          value={item.length}
                          onChange={(e) => updateItem(item.id, 'length', e.target.value)}
                          placeholder="Length"
                          className="border-0 h-8"
                        />
                      </td>
                      <td className="border border-table-border px-3 py-2">
                        <Input
                          value={item.weight}
                          onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                          placeholder="Weight"
                          className="border-0 h-8"
                        />
                      </td>
                      <td className="border border-table-border px-3 py-2">
                        <Input
                          type="number"
                          value={item.perPiecePrice || ''}
                          onChange={(e) => updateItem(item.id, 'perPiecePrice', parseFloat(e.target.value) || 0)}
                          className="border-0 h-8 font-semibold text-center"
                        />
                      </td>
                      <td className="border border-table-border px-3 py-2">
                        <Input
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          placeholder="qty"
                          className="border-0 h-8 text-center"
                        />
                      </td>
                      <td className="border border-table-border px-3 py-2">
                        <Input
                          type="number"
                          value={item.totalAmount || ''}
                          onChange={(e) => updateItem(item.id, 'totalAmount', parseFloat(e.target.value) || 0)}
                          className="border-0 h-8 font-semibold text-red-600 text-center"
                        />
                      </td>
                      <td className="border border-table-border px-3 py-2 text-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={7} className="border border-table-border px-3 py-2 text-right font-bold bg-table-header text-table-header-foreground">
                      <div className="flex items-center justify-end gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="show-total" className="text-xs text-white/70">Show Total</Label>
                          <Switch id="show-total" checked={showTotalValue} onCheckedChange={setShowTotalValue} />
                        </div>
                        <Input
                          value={columnHeaders.totalValue}
                          onChange={(e) => setColumnHeaders(prev => ({ ...prev, totalValue: e.target.value }))}
                          className="border-0 h-8 bg-transparent text-table-header-foreground font-bold text-right px-1 w-48"
                        />
                      </div>
                    </td>
                    <td className="border border-table-border px-3 py-2 text-right font-bold bg-accent text-red-600">
                      <Input
                        type="number"
                        value={totalValueOverride !== null ? totalValueOverride : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTotalValueOverride(isNaN(val) ? null : val);
                        }}
                        className="border-0 h-8 font-semibold text-red-600 text-right"
                        placeholder={getTotalValue().toFixed(0)}
                      />
                    </td>
                    <td className="border border-table-border px-3 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <Button onClick={addItem} className="mt-4" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Footer Details */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <div className="flex gap-2 items-center mb-1">
                <Input
                  value={columnHeaders.port}
                  onChange={(e) => setColumnHeaders(prev => ({ ...prev, port: e.target.value }))}
                  className="h-8 font-semibold w-1/3"
                />
              </div>
              <Input
                id="port-details"
                value={portDetails}
                onChange={(e) => setPortDetails(e.target.value)}
              />
            </div>

            <div>
              <div className="flex gap-2 items-center mb-1">
                <Input
                  value={columnHeaders.extra}
                  onChange={(e) => setColumnHeaders(prev => ({ ...prev, extra: e.target.value }))}
                  className="h-8 font-semibold w-1/3"
                />
              </div>
            </div>
            <Textarea
              id="extra-details"
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              placeholder="Enter any additional details..."
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-slate-50/50">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={columnHeaders.advance}
                      onChange={(e) => setColumnHeaders(prev => ({ ...prev, advance: e.target.value }))}
                      className="h-8 font-semibold w-32"
                    />
                    <span className="text-sm font-medium whitespace-nowrap">(%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="show-pct" className="text-xs text-muted-foreground">Show %</Label>
                    <Switch id="show-pct" checked={showAdvancePercentage} onCheckedChange={setShowAdvancePercentage} />
                  </div>
                </div>
                <Input
                  id="advance-percentage"
                  type="number"
                  value={advanceAmountOverride === null ? advancePayment : getAdvancePercentage().toFixed(2).replace(/\.00$/, '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = parseFloat(val) || 0;
                    setAdvancePayment(num);
                    setAdvanceAmountOverride(null); // Clear override to show calculation
                  }}
                  className="font-semibold text-destructive"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">{columnHeaders.advance} (USD)</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="show-val" className="text-xs text-muted-foreground">Show Value</Label>
                    <Switch id="show-val" checked={showAdvanceValue} onCheckedChange={setShowAdvanceValue} />
                  </div>
                </div>
                <Input
                  type="number"
                  value={advanceAmountOverride !== null ? advanceAmountOverride : getAdvanceAmount().toFixed(2).replace(/\.00$/, '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setAdvanceAmountOverride(num);
                    } else {
                      setAdvanceAmountOverride(null);
                    }
                  }}
                  className="font-semibold text-destructive"
                  placeholder={getAdvanceAmount().toFixed(0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo and QR Code Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="bg-table-header text-table-header-foreground py-2 px-4 rounded">
              Logo & QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Company Logo</Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  {companyDetails.logo && (
                    <div className="border border-input rounded p-2 flex justify-center">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-300">
                        <img src={companyDetails.logo} alt="Logo" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>Signature</Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => signatureInputRef.current?.click()}
                    className="w-full justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Signature
                  </Button>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  {signature && (
                    <div className="border border-input rounded p-2">
                      <img src={signature} alt="Signature" className="h-12 object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="bg-table-header text-table-header-foreground py-2 px-4 rounded">
              Theme Customization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="header-bg">Header Background</Label>
                <Input
                  id="header-bg"
                  type="color"
                  value={themeColors.headerBg}
                  onChange={(e) => setThemeColors({ ...themeColors, headerBg: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="header-text">Header Text</Label>
                <Input
                  id="header-text"
                  type="color"
                  value={themeColors.headerText}
                  onChange={(e) => setThemeColors({ ...themeColors, headerText: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="table-border">Table Border</Label>
                <Input
                  id="table-border"
                  type="color"
                  value={themeColors.tableBorder}
                  onChange={(e) => setThemeColors({ ...themeColors, tableBorder: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="body-bg">Body Background</Label>
                <Input
                  id="body-bg"
                  type="color"
                  value={themeColors.bodyBg}
                  onChange={(e) => setThemeColors({ ...themeColors, bodyBg: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotation Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="bg-table-header text-table-header-foreground py-2 px-4 rounded">
              Quotation Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div
              ref={pdfRef}
              className="w-full border-4 border-black p-4 bg-white"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {/* Header Section */}
              <div
                className="w-full text-center py-3 mb-0 text-white font-bold text-lg border border-black"
                style={{ backgroundColor: themeColors.headerBg, color: themeColors.headerText }}
              >
                <Input
                  value={columnHeaders.quotationLabel}
                  onChange={(e) => setColumnHeaders(prev => ({ ...prev, quotationLabel: e.target.value }))}
                  className="bg-transparent border-0 text-white text-center font-bold text-lg h-8 focus:bg-white/10"
                  style={{ color: themeColors.headerText }}
                />
              </div>

              {/* Company and Date Section */}
              <div className="border border-black border-t-0">
                <div className="flex">
                  <div className="w-20 border-r border-black p-2 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300">
                      <img src={companyDetails.logo} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex">
                      <div className="flex-1 border-r border-black p-2 font-bold text-base">
                        {companyDetails.name}
                      </div>
                      <div className="w-24 text-center py-2 px-1 font-bold text-white text-xs"
                        style={{ backgroundColor: themeColors.headerBg, color: themeColors.headerText }}
                      >
                        <Input
                          value={columnHeaders.dateLabel}
                          onChange={(e) => setColumnHeaders(prev => ({ ...prev, dateLabel: e.target.value }))}
                          className="bg-transparent border-0 text-white text-center font-bold text-[10px] h-6 px-1"
                          style={{ color: themeColors.headerText }}
                        />
                      </div>
                    </div>
                    <div className="flex border-t border-black">
                      <div className="flex-1 border-r border-black p-1 text-[10px] space-y-1">
                        <div className="flex gap-1 items-center">
                          <span className="font-bold">{columnHeaders.addressLabel}</span>
                          <span>{companyDetails.address}</span>
                        </div>
                        <div className="flex gap-1 items-center">
                          <span className="font-bold">{columnHeaders.phoneLabel}</span>
                          <span>{companyDetails.phone}</span>
                        </div>
                        <div className="flex gap-1 items-center">
                          <span className="font-bold">{columnHeaders.emailLabel}</span>
                          <span>{companyDetails.email}</span>
                        </div>
                        <div className="flex gap-1 items-center">
                          <span className="font-bold">{columnHeaders.websiteLabel}</span>
                          <span>{companyDetails.website}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Section */}
              <div className="mt-3 mb-3">
                <div className="border border-black p-3 text-center font-bold text-sm">
                  {columnHeaders.customerLabel || 'CUSTOMER'}: {customerDetails.name || 'THE BOQ LIST'}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-black">
                <div
                  className="grid grid-cols-5 gap-0 text-center py-2 px-1 font-bold text-white text-xs"
                  style={{ backgroundColor: themeColors.headerBg, color: themeColors.headerText }}
                >
                  <div className="border-r border-black px-1">{columnHeaders.sno}</div>
                  <div className="border-r border-black px-1">{columnHeaders.items}</div>
                  <div className="border-r border-black px-1">{columnHeaders.price}</div>
                  <div className="border-r border-black px-1">{columnHeaders.qty}</div>
                  <div className="px-1">{columnHeaders.total}</div>
                </div>

                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-5 gap-0 border-t border-black text-xs">
                    <div className="border-r border-black p-2 text-center">{index + 1}</div>
                    <div className="border-r border-black p-2 text-left">
                      {item.description || 'Copper Bond Grounding Rod'}
                    </div>
                    <div className="border-r border-black p-2 text-center">{item.perPiecePrice > 0 ? `${item.perPiecePrice} USD` : ''}</div>
                    <div className="border-r border-black p-2 text-center">{item.quantity || ''}</div>
                    <div className="p-2 text-center font-bold text-red-600">{item.totalAmount > 0 ? `${item.totalAmount.toFixed(0)} USD` : ''}</div>
                  </div>
                ))}

                {showTotalValue && getTotalValue() > 0 && (
                  <div className="grid grid-cols-5 gap-0 border-t border-black bg-gray-100">
                    <div className="col-span-4 border-r border-black p-2 text-right font-bold text-xs">
                      {columnHeaders.totalValue}
                    </div>
                    <div className="p-2 text-center font-bold text-red-600 text-xs">
                      {(totalValueOverride !== null ? totalValueOverride : getTotalValue()).toFixed(0)} USD
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Information */}
              <div className="mt-3 space-y-0">
                {portDetails.trim() && (
                  <div className="border border-black p-2 text-center text-xs">
                    <strong>{columnHeaders.port}</strong> {portDetails}
                  </div>
                )}
                {(advancePayment > 0 || advanceAmountOverride !== null) && (showAdvancePercentage || showAdvanceValue) && (
                  <div className={`border border-black ${portDetails.trim() ? 'border-t-0' : ''} p-2 text-center text-xs font-bold text-red-600`}>
                    <strong>
                      {columnHeaders.advance}
                      {showAdvancePercentage && advancePayment > 0 ? ` (${advancePayment}%)` : ''}
                      {showAdvanceValue ? ':' : ''}
                    </strong>
                    {showAdvanceValue && ` ${getAdvanceAmount().toFixed(0)} USD`}
                  </div>
                )}
                {extraDetails.trim() && (
                  <div className="border border-black border-t-0 p-2 text-left text-xs">
                    <strong>{columnHeaders.extra}</strong><br />
                    {extraDetails.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < extraDetails.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Signature Section */}
              <div className="mt-8 pt-4 border-t border-gray-300 flex justify-start items-center min-h-20">
                {signature && (
                  <img src={signature} alt="Signature" className="h-16 object-contain" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="text-center space-y-3 pb-10">
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={undoStack.length <= 1} className="h-8">
              Undo (Ctrl+Z)
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={redoStack.length === 0} className="h-8">
              Redo (Ctrl+Y)
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={saveToHistory} variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-50">
              <Save className="h-5 w-5 mr-2" />
              Save to History
            </Button>
            <Link to="/history">
              <Button variant="outline" className="border-purple-500 text-purple-500 hover:bg-purple-50">
                <History className="h-5 w-5 mr-2" />
                View History
              </Button>
            </Link>
            <Button onClick={copyAsHTML} variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <Copy className="h-5 w-5 mr-2" />
              Copy for Email
            </Button>
            <Button onClick={generatePDF} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <FileDown className="h-5 w-5 mr-2" />
              Download PDF
            </Button>
            <Button onClick={generateExcel} variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <FileDown className="h-5 w-5 mr-2" />
              Download Excel
            </Button>
          </div>
        </div>
      </div>
    </div >
  );
};

export default QuotationGenerator;