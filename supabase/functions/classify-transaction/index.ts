import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "Folha de Pagamento",
  "Impostos e Tributos",
  "Receita de Vendas",
  "Receita de Serviços",
  "Fornecedores / Compras",
  "Aluguel",
  "Serviços Contratados",
  "Despesas Bancárias",
  "Empréstimos e Financiamentos",
  "Retiradas dos Sócios",
  "Antecipação de Recebíveis",
  "Transferência entre Contas",
  "Aporte / Capital Social",
  "Outros",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transactions } = await req.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Envie um array 'transactions' com pelo menos 1 item" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size
    const batch = transactions.slice(0, 50);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = batch
      .map(
        (t: { description: string; type: string; amount: number }, i: number) =>
          `${i + 1}. [${t.type === "credit" ? "CRÉDITO" : "DÉBITO"}] R$ ${t.amount?.toFixed(2) ?? "0.00"} — "${t.description}"`
      )
      .join("\n");

    const systemPrompt = `Você é um contador brasileiro especialista em classificação contábil de extratos bancários.

Dado uma lista de transações bancárias, classifique CADA UMA em uma das categorias abaixo:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

REGRAS:
- Use o tipo (CRÉDITO/DÉBITO) para ajudar: créditos geralmente são receitas, débitos são despesas.
- "Tarifa", "Taxa" → Despesas Bancárias
- "PIX REC", "Recebimento vendas", "Maquininha" → Receita de Vendas
- "Antecipação" → Antecipação de Recebíveis
- "Salário", "Folha", "FGTS", "INSS" → Folha de Pagamento
- "DAS", "DARF", "ISS", "ICMS" → Impostos e Tributos
- Transferências entre contas próprias → Transferência entre Contas
- Se não conseguir classificar com certeza → Outros

Responda usando a tool fornecida. Para cada transação, retorne o índice (1-based) e a categoria escolhida.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Classifique estas ${batch.length} transações:\n\n${prompt}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_transactions",
              description: "Retorna a classificação de cada transação",
              parameters: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Índice da transação (1-based)" },
                        category: { type: "string", enum: CATEGORIES },
                        confidence: { type: "number", description: "Confiança de 0 a 1" },
                      },
                      required: ["index", "category", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["classifications"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_transactions" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro na classificação AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let classifications: Array<{ index: number; category: string; confidence: number }> = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        classifications = parsed.classifications || [];
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
    }

    // Map back to original transactions
    const results = batch.map((t: { description: string; type: string; amount: number }, i: number) => {
      const cls = classifications.find((c) => c.index === i + 1);
      return {
        description: t.description,
        type: t.type,
        amount: t.amount,
        category: cls?.category || "Outros",
        confidence: cls?.confidence ?? 0,
        classifiedBy: cls ? "ai" : "fallback",
      };
    });

    return new Response(
      JSON.stringify({ classifications: results, model: "google/gemini-3-flash-preview", count: results.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("classify-transaction error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
