import { useParams, Link, useNavigate } from "react-router-dom";
import { SAMPLE_LESSONS, SAMPLE_COURSES } from "../data/sample";
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Code2, Lightbulb, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import { PomodoroWidget } from "../components/productivity/PomodoroWidget";
import { useLearnerStore } from "../stores/learnerStore";
import type { KnowledgeDoc } from "../stores/learnerStore";

function getRelatedDocs(courseTags: string[], docs: KnowledgeDoc[]): KnowledgeDoc[] {
  return docs.filter(doc =>
    doc.concepts.some(concept =>
      courseTags.some(tag =>
        concept.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(concept.toLowerCase())
      )
    )
  );
}
function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return <h2 key={i} className="text-xl font-extrabold text-gray-900 mt-8 mb-3">{line.slice(3)}</h2>;
    }
    if (line.startsWith("# ")) {
      return <h1 key={i} className="text-2xl font-extrabold text-gray-900 mt-8 mb-3">{line.slice(2)}</h1>;
    }
    if (line.trim() === "") return <div key={i} className="h-3" />;

    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="text-gray-600 leading-relaxed text-base">
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="text-gray-900 font-bold">{part}</strong> : part
        )}
      </p>
    );
  });
}

export function LessonPage() {
  const { lessonId, courseId } = useParams<{ lessonId: string; courseId: string }>();
  const [completed, setCompleted] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const navigate = useNavigate();
  const { knowledgeDocuments } = useLearnerStore();
  const courseTags = SAMPLE_COURSES.find(c => c.id === courseId)?.tags ?? [];
  const relatedDocs = getRelatedDocs(courseTags, knowledgeDocuments);

  const lesson = lessonId ? SAMPLE_LESSONS[lessonId] : null;

  if (!lesson) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link to={courseId ? `/courses/${courseId}` : "/courses"} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm mb-6 transition font-semibold group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to course
        </Link>
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-gray-900 font-extrabold text-xl mb-2">Lesson content coming soon</h2>
          <p className="text-gray-400 text-sm font-medium">This lesson is being prepared by our AI curriculum team.</p>
          <Link to={courseId ? `/courses/${courseId}` : "/courses"} className="inline-flex items-center gap-2 mt-6 btn-primary">
            <ArrowLeft className="w-4 h-4" /> Back to course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-8 py-3.5 flex items-center justify-between" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <Link to={courseId ? `/courses/${courseId}` : "/courses"} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm transition group font-semibold">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to course
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Lesson</span>
        </div>
        <div className="flex items-center gap-3">
          <PomodoroWidget />
          {completed ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
              <CheckCircle className="w-4 h-4" /> Completed
            </div>
          ) : (
            <button
              onClick={() => setCompleted(true)}
              className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-full font-bold transition"
            >
              Mark complete
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">{lesson.title}</h1>

        {/* Content */}
        <div className="space-y-2 mb-10 leading-relaxed">
          {renderContent(lesson.content)}
        </div>

        {/* Key points */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="text-gray-900 font-extrabold">Key Takeaways</h3>
          </div>
          <ul className="space-y-3">
            {lesson.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-extrabold">{i + 1}</span>
                </div>
                <span className="text-gray-700 text-sm leading-relaxed font-medium">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Code example */}
        {lesson.code_example && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Code2 className="w-4 h-4 text-violet-500" />
              <h3 className="text-gray-900 font-extrabold">Code Example</h3>
            </div>
            <div className="bg-gray-900 rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-xs text-gray-500 ml-2 font-medium">Python</span>
              </div>
              <pre className="p-6 text-sm font-mono text-gray-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {lesson.code_example.trim()}
              </pre>
            </div>
          </div>
        )}

        {/* Study Notes */}
        <div className="mb-6">
          <button
            onClick={() => setNotesOpen(v => !v)}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors w-full text-left"
          >
            <FileText className="w-4 h-4" />
            Study Notes
            {relatedDocs.length > 0 && (
              <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-bold">
                {relatedDocs.length} matched
              </span>
            )}
            <span className="ml-auto text-gray-300">
              {notesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {notesOpen && (
            <div className="mt-3 space-y-2">
              {relatedDocs.length > 0 ? (
                relatedDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{doc.filename}</p>
                      <p className="text-xs text-gray-400">{doc.concepts.length} concepts extracted</p>
                    </div>
                    <Link to="/courses?tab=notes" className="text-xs text-violet-600 font-bold hover:text-violet-800 transition-colors">
                      Open →
                    </Link>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-center">
                  <p className="text-sm text-gray-400">
                    No matching notes yet.{" "}
                    <Link to="/courses?tab=notes" className="text-violet-600 font-bold hover:underline">
                      Upload notes for this topic →
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          <Link
            to={courseId ? `/courses/${courseId}` : "/courses"}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm transition font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to course
          </Link>

          {!completed ? (
            <button
              onClick={() => setCompleted(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-6 py-2.5 rounded-full transition"
            >
              <CheckCircle className="w-4 h-4" /> Mark as complete
            </button>
          ) : (
            <Link
              to={courseId ? `/courses/${courseId}` : "/courses"}
              className="btn-primary flex items-center gap-2"
            >
              Next module <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
