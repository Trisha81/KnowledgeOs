import Anthropic from '@anthropic-ai/sdk';
import { EmbeddingService } from './embedding.service';
import { PineconeService } from './pinecone.service';
import { ProcessedDoc, Message, GapAnalysis } from '../types';
import { IDocument } from '../models/Document';
import { IUser } from '../models/User';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const hasAnthropicKey = ANTHROPIC_KEY.length > 20 && !ANTHROPIC_KEY.includes('dummy') && !ANTHROPIC_KEY.includes('your_');

let anthropic: Anthropic | null = null;
if (hasAnthropicKey) {
  anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
}

/* ─── Fallback responses (no API key needed) ─────────────────────── */
const FALLBACK_RESPONSES: Record<string, string> = {
  default: `Hello! I'm your **KnowledgeOS AI** assistant. 🤖

I am connected to your enterprise knowledge graph and respect your active Role-Based Access Control (RBAC) permissions.

**Current status:** Anthropic/Pinecone API keys are not detected, so I am running in Offline Demonstration Mode. Try asking me about:
- **HR/Onboarding:** "How do I set up my VPN?" or "What is the policy on travel expenses?"
- **Meetings:** "Summarize the key decisions regarding Q3 marketing."
- **Engineering:** "Why did we choose MongoDB over PostgreSQL in 2024?"
- **Sales:** "Generate an RFP summary" or "Show competitor battlecards."
- **Legal:** "What are the termination conditions in Vendor X agreement?"
- **Compliance:** "Check GDPR compliance."`,

  vpn_travel: `**Source: Employee Handbook v2.4 (HR/IT Hub) 🔒 [RBAC: Employee Verified]**

Here are the answers to your onboarding questions:

**1. VPN Setup Instructions:**
1. Download the Cisco AnyConnect client from the IT Self-Service Portal.
2. Enter the server address: \`vpn.company.com\`
3. Authenticate using your Okta mobile push notification (MFA).
*(For issues, see the "IT Helpdesk Copilot" guide or submit an L1 ticket).*

**2. Travel Expenses Policy:**
- **Per Diem:** $75/day for domestic, $120/day for international travel.
- **Flights:** Must be booked through the TripActions portal; economy class only for flights under 6 hours.
- **Reimbursement:** Submit receipts via Expensify within 30 days of returning.`,

  q3_marketing: `**Source: Transcript_Global_Townhall_Q3.mp4 & Strategy_Sync_July.docx**

**Key Decisions Regarding Q3 Marketing:**
- **Budget Reallocation:** Shifted 15% of the display ad budget towards LinkedIn B2B lead generation.
- **Product Launch:** The "Enterprise AI Hub" launch is delayed to mid-August to align with the revised sales enablement schedule.
- **KPI Focus:** Primary metric shifted from Top-of-Funnel traffic to MQL-to-SQL conversion rates.
- **Action Item:** Sarah's team to finalize the new competitor battlecards by the end of next week.`,

  mongodb_adr: `**Source: ADR-042-Database-Selection (Architectural Decision Records) & System_Diagram_v3.pdf**

**Why we chose MongoDB over PostgreSQL for the User Service (2024):**

In Q1 2024, the Engineering team approved the migration to MongoDB based on the following factors:
1. **Schema Flexibility:** The User Service relies heavily on unstructured, dynamically generated user preferences (e.g., custom dashboard layouts and RBAC nested JSON).
2. **Horizontal Scalability:** We needed out-of-the-box sharding to support our projected 300% user growth across three geographic regions.
3. **Developer Velocity:** It integrated natively with our Node.js/Mongoose stack, reducing serialization overhead compared to our legacy relational mappers.

*Note: Core billing events remain on PostgreSQL for ACID compliance (See ADR-043).*`,

  rfp_automator: `**Source: Historical_RFPs_2024 & Product_Specs_v9**

**RFP Automator Draft:**

Based on past successful proposals and our current technical specs, here are the generated answers for the client questionnaire:

*Q: Does your platform support federated identity management?*
*A: Yes, KnowledgeOS supports full federated identity management via SAML 2.0 and OIDC, integrating seamlessly with Okta, Azure AD, and PingIdentity.*

*Q: What is your data retention policy?*
*A: Our standard data retention policy is 7 years for enterprise accounts, with active continuous archival and verifiable destruction protocols upon contract termination.*`,

  competitor: `**Source: Competitor_Research_AcmeCorp_Q2.pdf**

**Competitor Battlecard: AcmeCorp**

**Key Talking Points for your Call:**
- **Our Advantage:** Our RAG (Retrieval-Augmented Generation) pipeline processes documents 40% faster than AcmeCorp and includes deep image OCR out-of-the-box.
- **Their Weakness:** AcmeCorp struggles with strict Role-Based Access Control (RBAC); they often leak document titles in search results to unauthorized users. We have true zero-trust boundaries at the embedding layer.
- **Pricing Objection:** If they mention AcmeCorp is cheaper, pivot to our superior uptime (99.99% SLA) and included dedicated Customer Success agent.`,

  legal_termination: `**Source: MSA_VendorX_Final_Signed.pdf (Clause 8.2)**

**Termination Conditions in the Vendor X Agreement:**

According to Section 8 of the MSA:
1. **Convenience:** Either party may terminate the agreement for convenience with **90 days** written notice.
2. **Material Breach:** A party may terminate immediately if a material breach remains uncured for **30 days** after written notification.
3. **Data Export:** Upon termination, Vendor X must provide a complete export of our data in CSV/JSON format within 14 days and certify permanent deletion from their servers within 30 days.`,

  compliance: `**Source: Internal_Data_Processing_SOP.docx compared against GDPR_Framework_2024.pdf**

**Regulatory Compliance Check: GDPR**

⚠️ **1 Potential Alignment Risk Detected:**
- **Data Subject Access Requests (DSAR):** Your internal SOP states that DSARs will be fulfilled within 45 days. **GDPR Article 12(3)** mandates processing these requests "without undue delay and in any event within one month."
- *Recommendation: Update the internal SOP timeline to 30 days to align with GDPR requirements.*

✅ **Compliant Areas:**
- Consent mechanisms meet opt-in stringency.
- Data Processing Agreements (DPAs) are properly established with third-party sub-processors.`,
};

function getFallbackResponse(query: string): string {
  const q = query.toLowerCase();
  
  // 1. Enterprise & Internal Ops
  if (q.includes('vpn') || q.includes('travel') || q.includes('expense') || q.includes('onboard')) return FALLBACK_RESPONSES.vpn_travel;
  if (q.includes('q3') || q.includes('marketing') || q.includes('transcript') || q.includes('meeting')) return FALLBACK_RESPONSES.q3_marketing;
  
  // 2. Engineering & IT Support
  if (q.includes('mongodb') || q.includes('postgresql') || q.includes('adr') || q.includes('architecture')) return FALLBACK_RESPONSES.mongodb_adr;
  
  // 3. Sales & Customer Success
  if (q.includes('rfp') || q.includes('proposal') || q.includes('questionnaire')) return FALLBACK_RESPONSES.rfp_automator;
  if (q.includes('competitor') || q.includes('battlecard') || q.includes('talk')) return FALLBACK_RESPONSES.competitor;
  
  // 4. Legal & Compliance
  if (q.includes('termination') || q.includes('contract') || q.includes('vendor')) return FALLBACK_RESPONSES.legal_termination;
  if (q.includes('compliance') || q.includes('gdpr') || q.includes('soc2')) return FALLBACK_RESPONSES.compliance;

  return `I received your question: **"${query}"**\n\n${FALLBACK_RESPONSES.default}`;
}

export class AIService {
  static async processDocument(content: string): Promise<ProcessedDoc> {
    if (!anthropic) {
      return {
        summary: content.slice(0, 200),
        type: 'Guide',
        tags: [],
        faqs: [],
        keyInsights: [],
        category: 'General',
      } as any;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: `You are a knowledge extraction AI. Return ONLY valid JSON:
{
  "summary": "2-3 sentence summary",
  "type": "SOP|FAQ|Key Insight|Guide|Policy",
  "tags": ["tag1", "tag2"],
  "faqs": [{"q": "question", "a": "answer"}],
  "keyInsights": ["insight1", "insight2"],
  "category": "Engineering|HR & People|Finance|..."
}`,
      messages: [{ role: 'user', content: `Process this:\n\n${content}` }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  }

  // RAG-powered chat — gracefully falls back at each failure point
  static async chat(query: string, conversationHistory: Message[]): Promise<string> {
    // ── No Anthropic key → smart local fallback ──
    if (!anthropic) {
      return getFallbackResponse(query);
    }

    // ── Try RAG retrieval (best-effort) ──
    let context = '';
    try {
      const queryEmbedding = await EmbeddingService.embed(query);
      const matches = await PineconeService.query(queryEmbedding, 5);
      context = matches
        .filter((m: any) => (m.metadata as any)?.content)
        .map((m: any) => `[${(m.metadata as any)?.title}]\n${(m.metadata as any)?.content}`)
        .join('\n\n---\n\n');
    } catch {
      // RAG unavailable — answer from Anthropic general knowledge
    }

    const systemPrompt = context
      ? `You are a KnowledgeOS AI assistant. Answer using the context below.
Cite your source as "📚 Source: [document title]" at the end of your answer.
If the answer isn't in the context, say "I don't have this in the knowledge base, but here's what I know:".

CONTEXT:
${context}`
      : `You are KnowledgeOS AI, an intelligent enterprise knowledge management assistant.
You help users find information, understand documents, and navigate their company knowledge base.
The document retrieval service is currently unavailable, so answer from your general knowledge.
Be helpful, concise, and professional. Use markdown formatting when appropriate.`;

    const messages = [
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: query },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  static async analyzeGaps(docs: IDocument[], users: IUser[]): Promise<GapAnalysis> {
    if (!anthropic) {
      return { gaps: [], riskScore: 0 } as any;
    }

    const prompt = `Analyze this knowledge base for gaps and risks.
Docs: ${docs.map(d => `${d.title} (${d.category})`).join(', ')}
Team: ${users.map(u => `${u.name} [${u.active ? 'active' : 'DEPARTED'}]`).join(', ')}
Return JSON: { "gaps": [{"area": "string", "severity": "string", "impact": "string", "recommendation": "string"}], "riskScore": 0 }`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  }
}
