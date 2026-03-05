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
      const prompt = `You are an expert at extracting structured quotation data from informal text. 

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
  "showTotalValue": true/false (if user explicitly says to hide or not show total),
  "action": "append or replace (default replace)",
  "columnHeaders": {
    "items": "Label for items column",
    "dia": "Label for diameter column",
    "customerLabel": "Label for customer section"
  }
}

Important rules:
- Extract ALL items mentioned, even if they have partial information
- If the text implies adding to existing data (e.g. "add", "also", "plus"), set "action" to "append". If it implies starting fresh or complete update, use "replace".
- If the user specifically asks to rename a column or label, include it in "columnHeaders"
- Keep the response extremely brief. Return ONLY the JSON object. Do not explain anything.
- If the text is very long, focus on the core quotation details.
- For prices, extract numeric values only
- For quantities, keep as string (e.g., "100", "50 pcs")
- Calculate totalAmount if price and quantity are available and total is not mentioned
- If a field is not mentioned, omit it from the response
- Return ONLY the JSON object, no explanation or markdown

Text to analyze:
${informalText}

Context: If "action" is "append", new items will be added to the current list. If "replace", all existing items will be cleared first. If unsure, use "append" if "add" or "also" is in the text.`;

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
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`SambaNova Error: ${response.status}`);
        }
      } catch (err) {
        console.warn("SambaNova failed or limit reached, trying Sarvam AI fallback...", err);
        usedFallback = true;
        response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "api-subscription-key": SARVAM_API_KEY, // Sarvam often uses this header or Authorization
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sarvam-m",
            temperature: 0.1,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`AI Service Error (${response.status}): ${errorText || 'Unknown error'}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content;

      if (!responseText) {
        throw new Error("No response from AI");
      }

      // Find the first { and the last } in the response to extract JSON
      // This is more robust than simple trimming if the AI adds text before/after
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("AI response did not contain a valid JSON object");
      }

      let cleanedResponse = responseText.substring(jsonStart, jsonEnd + 1).trim();

      const extractedData: ExtractedData = JSON.parse(cleanedResponse);

      onDataExtracted(extractedData);

      toast({
        title: "Data Extracted Successfully!",
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
