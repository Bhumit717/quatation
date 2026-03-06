import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractedData {
  customerDetails?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items?: Array<{
    description?: string;
    diameter?: string;
    length?: string;
    weight?: string;
    perPiecePrice?: number;
    quantity?: string;
    totalAmount?: number;
  }>;
  portDetails?: string;
  extraDetails?: string;
  advancePayment?: number;
  showTotalValue?: boolean;
  action?: 'append' | 'replace';
  columnHeaders?: Partial<{
    sno: string;
    items: string;
    dia: string;
    length: string;
    weight: string;
    price: string;
    qty: string;
    total: string;
    action: string;
    port: string;
    advance: string;
    extra: string;
    totalValue: string;
    customerLabel: string;
  }>;
}

interface AIDataExtractorProps {
  onDataExtracted: (data: ExtractedData) => void;
}

const SAMBANOVA_API_KEY = "adf310ad-8712-4b66-8694-2451f68be017";
const SARVAM_API_KEY = "sk_mi6fifqj_1vThABgSAQN2rbHFTFtUJYrs";

const AIDataExtractor = ({ onDataExtracted }: AIDataExtractorProps) => {
  const { toast } = useToast();
  const [informalText, setInformalText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isRequestInFlight = useRef(false);

  const extractDataWithAI = async () => {
    if (isRequestInFlight.current || isLoading) {
      console.log("Request already in flight, skipping");
      return;
    }

    if (!informalText.trim()) {
      toast({
        title: "Please enter some text",
        description: "Paste informal data to extract quotation details.",
        variant: "destructive",
      });
      return;
    }

    isRequestInFlight.current = true;
    setIsLoading(true);

    try {
      // Split text into chunks if it's very long (approx > 6000 chars)
      const MAX_CHUNK_SIZE = 6000;
      const textChunks: string[] = [];

      if (informalText.length <= MAX_CHUNK_SIZE) {
        textChunks.push(informalText);
      } else {
        // Simple chunking by lines to avoid cutting in middle of a sentence
        const lines = informalText.split('\n');
        let currentChunk = "";
        for (const line of lines) {
          if ((currentChunk.length + line.length) > MAX_CHUNK_SIZE) {
            textChunks.push(currentChunk);
            currentChunk = line + "\n";
          } else {
            currentChunk += line + "\n";
          }
        }
        if (currentChunk.trim()) textChunks.push(currentChunk);
      }

      const allExtractedData: ExtractedData[] = [];

      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const isLastChunk = i === textChunks.length - 1;

        const prompt = `You are an expert at extracting structured quotation data from informal text. 
${textChunks.length > 1 ? `This is part ${i + 1} of ${textChunks.length} of a long text.` : ""}

Analyze the following text and extract any quotation-related information. Return ONLY a valid JSON object with the following structure (include only fields that have data):

{
  "customerDetails": {
    "name": "customer name if mentioned",
    "address": "customer address if mentioned",
    "phone": "customer phone if mentioned",
    "email": "customer email if mentioned"
  },
  "items": [
    {
      "description": "item description/name",
      "diameter": "diameter in MM if mentioned",
      "length": "length in MM if mentioned", 
      "weight": "weight if mentioned",
      "perPiecePrice": 0,
      "quantity": "quantity as string",
      "totalAmount": 0
    }
  ],
  "portDetails": "shipping port details if mentioned",
  "extraDetails": "any extra terms, conditions, or notes",
  "advancePayment": 70,
  "showTotalValue": true (default),
  "action": "append",
  "columnHeaders": {
    "items": "Label for items column",
    "dia": "Label for diameter column",
    "customerLabel": "Label for customer section"
  }
}

Important rules:
- Extract ALL items mentioned in THIS CHUNK
- Set "action" to "append"
- Keep the response extremely brief. Return ONLY the JSON object. Do not explain anything.
- For prices, extract numeric values only
- For quantities, keep as string (e.g., "100", "50 pcs")
- Calculate totalAmount if price and quantity are available and total is not mentioned
- If a field is not mentioned, omit it from the response
- Return ONLY the JSON object, no explanation or markdown

Text to analyze (Part ${i + 1}):
${chunk}

Context: Return ONLY the raw JSON object.`;

        let response;
        let usedFallback = false;

        try {
          response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${SAMBANOVA_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "Meta-Llama-3.3-70B-Instruct",
              temperature: 0.1,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (!response.ok) throw new Error(`SambaNova Error: ${response.status}`);
        } catch (err) {
          console.warn("SambaNova failed, trying Sarvam AI fallback...", err);
          usedFallback = true;
          response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "api-subscription-key": SARVAM_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sarvam-m",
              temperature: 0.1,
              messages: [{ role: "user", content: prompt }],
            }),
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`AI Service Error (${response.status}): ${errorText || 'Unknown error'}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content;

        if (!responseText) throw new Error("No response from AI");

        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1) {
          const cleanedResponse = responseText.substring(jsonStart, jsonEnd + 1).trim();
          try {
            const parsed = JSON.parse(cleanedResponse);
            allExtractedData.push(parsed);
          } catch (e) {
            console.error("JSON parse error for chunk", i, e);
          }
        }
      }

      if (allExtractedData.length === 0) {
        throw new Error("Could not extract any data from the text.");
      }

      // Merge results
      const mergedData: ExtractedData = {
        customerDetails: {},
        items: [],
        portDetails: "",
        extraDetails: "",
        advancePayment: 70,
        showTotalValue: true,
        action: 'append',
        columnHeaders: {}
      };

      allExtractedData.forEach((data, index) => {
        // Customer details - take first non-empty or most complete
        if (data.customerDetails) {
          mergedData.customerDetails = {
            ...mergedData.customerDetails,
            ...Object.fromEntries(Object.entries(data.customerDetails).filter(([_, v]) => v))
          };
        }

        // Items - collect all
        if (data.items && Array.isArray(data.items)) {
          mergedData.items = [...(mergedData.items || []), ...data.items];
        }

        // Port & Extra - append
        if (data.portDetails) mergedData.portDetails = (mergedData.portDetails ? mergedData.portDetails + " " : "") + data.portDetails;
        if (data.extraDetails) mergedData.extraDetails = (mergedData.extraDetails ? mergedData.extraDetails + "\n" : "") + data.extraDetails;

        // Header overrides
        if (data.columnHeaders) {
          mergedData.columnHeaders = { ...mergedData.columnHeaders, ...data.columnHeaders };
        }

        // Action - use the first chunk's preference if it exists, but default to replace if explicitly stated in text
        if (index === 0 && data.action) mergedData.action = data.action;
      });

      // Final cleanup of merged data
      if (!mergedData.items?.length) delete mergedData.items;
      if (!Object.keys(mergedData.customerDetails || {}).length) delete mergedData.customerDetails;
      if (!mergedData.portDetails) delete mergedData.portDetails;
      if (!mergedData.extraDetails) delete mergedData.extraDetails;

      onDataExtracted(mergedData);

      toast({
        title: textChunks.length > 1 ? `Processed ${textChunks.length} chunks successfully!` : "Data Extracted Successfully!",
        description: "The quotation fields have been auto-filled from your text.",
      });

      setInformalText("");
    } catch (error) {
      console.error("Extraction error:", error);
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Could not extract data from the text.",
        variant: "destructive",
      });
    } finally {
      isRequestInFlight.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Data Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Paste informal quotation data here... 

Example:
Customer Ahmed from Cairo, Egypt needs 500 pieces of copper grounding rods, 16mm diameter, 3000mm length at $45 each. Also 200 pieces of 14mm rods at $35 each. Ship to Alexandria port. 70% advance payment required."
          value={informalText}
          onChange={(e) => setInformalText(e.target.value)}
          className="min-h-[120px] resize-y"
        />
        <Button
          onClick={extractDataWithAI}
          disabled={isLoading || !informalText.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Extract & Auto-Fill Fields
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIDataExtractor;
