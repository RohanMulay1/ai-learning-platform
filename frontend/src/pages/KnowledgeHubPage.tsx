import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { useLearnerStore } from "../stores/learnerStore";
import type { KnowledgeDoc, ReviewCardState } from "../stores/learnerStore";
import { SAMPLE_COURSES } from "../data/sample";

/* ── Groq AI extraction ────────────────────────────────────────── */

const GROQ_KEY = (import.meta.env.VITE_GROQ_API_KEY ?? "") as string;

async function extractWithGroq(text: string): Promise<{ concepts: string[]; eli5: string }> {
  if (!GROQ_KEY) throw new Error("NO_KEY");

  const prompt = `You are a computer science study assistant. Analyze this study document and extract key concepts.

Document (first 3000 chars):
${text.slice(0, 3000)}

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "concepts": ["concept1", "concept2"],
  "eli5": "• Simple sentence one\n• Simple sentence two\n• Simple sentence three"
}

Rules:
- concepts: up to 12 CS/programming terms (algorithms, data structures, Big O, patterns). Short noun phrases only.
- eli5: 3-5 bullet points using • prefix. Explain like talking to a smart 10-year-old. No jargon.
- If the document is not about programming/CS, return { "concepts": [], "eli5": "• This document doesn't appear to be about programming or computer science." }`;

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.2,
      }),
    }
  );

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content as string | undefined;
  if (!raw) throw new Error("Empty response");
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed: { concepts?: unknown; eli5?: unknown } = JSON.parse(cleaned);
  return {
    concepts: Array.isArray(parsed.concepts) ? (parsed.concepts as string[]).slice(0, 12) : [],
    eli5: typeof parsed.eli5 === "string" ? parsed.eli5 : "",
  };
}

function getRelatedCourses(concepts: string[]) {
  return SAMPLE_COURSES.filter(course =>
    (course.tags as string[]).some(tag =>
      concepts.some(c =>
        c.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(c.toLowerCase())
      )
    )
  );
}

/* ── Concept extraction heuristic ─────────────────────────── */

function extractConcepts(text: string): string[] {
  const concepts = new Set<string>();

  // Complexity notation: O(n), O(log n), O(n²), etc.
  const complexityRe = /O\([^)]+\)/g;
  for (const m of text.matchAll(complexityRe)) concepts.add(m[0]);

  // Terms after "Definition:", "Concept:", "Algorithm:", etc.
  const defRe = /(?:definition|concept|algorithm|technique|pattern|approach|method)[:\s]+([A-Za-z][A-Za-z\s]{3,30})/gi;
  for (const m of text.matchAll(defRe)) concepts.add(m[1].trim());

  // Capitalized multi-word phrases (likely named concepts)
  const namedRe = /\b([A-Z][a-z]+ (?:[A-Z][a-z]+ )?(?:[A-Z][a-z]+))\b/g;
  for (const m of text.matchAll(namedRe)) {
    if (m[1].split(" ").length >= 2) concepts.add(m[1]);
  }

  // Terms followed by ": " (glossary-style)
  const glossaryRe = /^([A-Za-z][A-Za-z\s\-]{3,40}):\s/gm;
  for (const m of text.matchAll(glossaryRe)) concepts.add(m[1].trim());

  // CS-specific terms
  const csTerms = [
    "hash map", "hash table", "binary search", "two pointers", "sliding window",
    "dynamic programming", "memoization", "tabulation", "BFS", "DFS",
    "linked list", "binary tree", "heap", "stack", "queue", "trie",
    "union find", "topological sort", "Dijkstra", "backtracking",
  ];
  const lower = text.toLowerCase();
  for (const term of csTerms) {
    if (lower.includes(term)) concepts.add(term.charAt(0).toUpperCase() + term.slice(1));
  }

  return [...concepts].slice(0, 12);
}

function generateELI5(text: string): string {
  const sentences = text
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);

  if (sentences.length === 0) return "No content to simplify.";

  const simplified = sentences.slice(0, 5).map(s => {
    return "• " + s
      .replace(/\b(?:furthermore|additionally|consequently|subsequently|aforementioned)\b/gi, "also")
      .replace(/\b(?:utilizes?|employs?)\b/gi, "uses")
      .replace(/\b(?:demonstrates?)\b/gi, "shows")
      .replace(/\binvariant\b/gi, "rule that stays true")
      .replace(/\bcomputational complexity\b/gi, "how fast/slow it is");
  });

  return simplified.join("\n");
}

function conceptsToFlashcards(
  concepts: string[],
  text: string,
  docId: string,
): ReviewCardState[] {
  return concepts.map((concept, i) => {
    // Find the sentence that contains this concept
    const lower = text.toLowerCase();
    const cLower = concept.toLowerCase();
    const idx = lower.indexOf(cLower);
    let definition = "A key concept from your study material.";
    if (idx !== -1) {
      const start = Math.max(0, text.lastIndexOf(".", idx - 1) + 1);
      const end = text.indexOf(".", idx + 1);
      if (end !== -1) definition = text.slice(start, end + 1).trim();
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      challengeId: `knowledge-${docId}-${i}`,
      challengeTitle: concept,
      skillTags: ["Knowledge Hub"],
      difficulty: "easy" as const,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: tomorrow.toISOString().slice(0, 10),
      lastReviewed: null,
      lastMasteryScore: 0.5,
    };
  });
}

/* ── Components ────────────────────────────────────────────── */

function DocCard({ doc, onPushToQueue }: { doc: KnowledgeDoc; onPushToQueue: (doc: KnowledgeDoc) => void }) {
  const [eli5, setEli5] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const relatedCourses = getRelatedCourses(doc.concepts);

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#D1FAE5] border border-green-200 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#16a34a] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{doc.filename}</p>
              <p className="text-[10px] text-gray-400">
                {doc.concepts.length} concepts · {Math.round(doc.rawText.length / 1000)}KB · {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Analyzed</span>
          </div>
        </div>

        {/* ELI5 toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setEli5(v => !v)}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all",
              eli5
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-gray-100 border-gray-200 text-gray-500 hover:border-green-300"
            )}
          >
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: eli5 ? "'FILL' 1" : "'FILL' 0" }}>psychology</span>
            ELI5 Mode
          </button>
          <button
            onClick={() => setOpen(v => !v)}
            className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            Preview
            <span className="material-symbols-outlined text-[13px]">{open ? "expand_less" : "expand_more"}</span>
          </button>
        </div>

        {open && (
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 leading-relaxed mb-3 max-h-32 overflow-y-auto whitespace-pre-wrap border border-gray-200">
            {eli5 ? doc.eli5Text : doc.rawText.slice(0, 600) + (doc.rawText.length > 600 ? "…" : "")}
          </div>
        )}

        {/* Concept chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {doc.concepts.slice(0, 8).map(c => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#16a34a] border border-green-200 font-medium">{c}</span>
          ))}
          {doc.concepts.length > 8 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">+{doc.concepts.length - 8}</span>
          )}
        </div>

        {/* Related courses */}
        {relatedCourses.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Related Courses</p>
            <div className="flex flex-wrap gap-1.5">
              {relatedCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium hover:bg-indigo-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[11px]">school</span>
                  {course.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => onPushToQueue(doc)}
          disabled={doc.flashcardsAdded}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
            doc.flashcardsAdded
              ? "bg-gray-100 text-gray-400 cursor-default"
              : "bg-[#2EC866] hover:bg-[#1EA34E] text-white active:scale-[0.98]"
          )}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {doc.flashcardsAdded ? "check_circle" : "add_circle"}
          </span>
          {doc.flashcardsAdded ? `${doc.concepts.length} cards added to queue` : `Add ${doc.concepts.length} flashcards to Review Queue`}
        </button>
      </div>
    </div>
  );
}

/* ── Content (embeddable in CoursesPage tabs) ──────────────── */

export function KnowledgeHubContent() {
  const { knowledgeDocuments, addKnowledgeDoc, addKnowledgeCards } = useLearnerStore();
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (file.name.endsWith(".pdf")) {
      setProcessing("PDF text extraction coming soon. Try .txt or .md files.");
      setTimeout(() => setProcessing(null), 3000);
      return;
    }

    setProcessing(`Analyzing ${file.name} with AI…`);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = (e.target?.result as string) ?? "";
      let concepts: string[];
      let eli5Text: string;

      try {
        const result = await extractWithGroq(text);
        concepts = result.concepts.length > 0 ? result.concepts : extractConcepts(text);
        eli5Text = result.eli5 || generateELI5(text);
      } catch {
        // Graceful fallback to client-side heuristics if Gemini fails/unavailable
        concepts = extractConcepts(text);
        eli5Text = generateELI5(text);
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const doc: KnowledgeDoc = {
        id,
        filename: file.name,
        rawText: text,
        eli5Text,
        concepts,
        flashcardsAdded: false,
        uploadedAt: Date.now(),
      };
      addKnowledgeDoc(doc);
      setProcessing(null);
    };
    reader.readAsText(file);
  }, [addKnowledgeDoc]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) processFile(f);
  }

  function handlePushToQueue(doc: KnowledgeDoc) {
    const cards = conceptsToFlashcards(doc.concepts, doc.rawText, doc.id);
    addKnowledgeCards(cards);
    // Mark doc as added
    const updated: KnowledgeDoc = { ...doc, flashcardsAdded: true };
    addKnowledgeDoc(updated);
  }

  const totalConcepts = knowledgeDocuments.reduce((s, d) => s + d.concepts.length, 0);
  const totalCards = knowledgeDocuments.filter(d => d.flashcardsAdded).reduce((s, d) => s + d.concepts.length, 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Knowledge Hub</h1>
        <p className="text-gray-500 text-sm">Upload your study notes and let the AI extract concepts, generate ELI5 summaries, and push flashcards into your review queue.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Documents", value: knowledgeDocuments.length, color: "#6366F1", icon: "description" },
          { label: "Concepts extracted", value: totalConcepts, color: "#2EC866", icon: "lightbulb" },
          { label: "Cards in queue", value: totalCards, color: "#F59E0B", icon: "history_edu" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
            </div>
            <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-10 mb-8 text-center transition-all cursor-pointer",
          dragging ? "border-[#2EC866] bg-[#D1FAE5]/40" : "border-gray-200 hover:border-green-300 bg-gray-50"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {processing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#2EC866] border-t-transparent animate-spin" />
            <p className="text-sm text-[#16a34a] font-bold">{processing}</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#D1FAE5] border border-green-200 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#16a34a] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>upload_file</span>
            </div>
            <p className="text-gray-900 font-bold mb-1">Drop files here or click to browse</p>
            <p className="text-gray-500 text-sm">Supports .txt and .md — AI extracts concepts automatically</p>
            <div className="flex justify-center gap-2 mt-3">
              {[".txt", ".md"].map(ext => (
                <span key={ext} className="text-[10px] px-2 py-0.5 rounded-full bg-white text-gray-500 border border-gray-200 font-mono">{ext}</span>
              ))}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-300 border border-gray-100 font-mono">.pdf (soon)</span>
            </div>
          </>
        )}
      </div>

      {/* Document list */}
      {knowledgeDocuments.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Your Documents</h2>
          <div className="flex flex-col gap-4">
            {[...knowledgeDocuments].reverse().map(doc => (
              <DocCard key={doc.id} doc={doc} onPushToQueue={handlePushToQueue} />
            ))}
          </div>
        </div>
      )}

      {knowledgeDocuments.length === 0 && (
        <div className="text-center py-12 text-gray-300">
          <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">library_books</span>
          <p className="text-sm">No documents yet. Upload your first study file above.</p>
        </div>
      )}
    </div>
  );
}

export function KnowledgeHubPage() {
  return <KnowledgeHubContent />;
}
