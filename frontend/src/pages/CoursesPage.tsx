import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import { SAMPLE_COURSES } from "../data/sample";
import { KnowledgeHubContent } from "./KnowledgeHubPage";

const DIFF_CLASS: Record<string, string> = {
  beginner:     "bg-green-50 text-green-700 border-green-200",
  intermediate: "bg-amber-50 text-amber-700 border-amber-200",
  advanced:     "bg-red-50 text-red-600 border-red-200",
};

const QUIZ_CARDS = [
  { id: "arrays",        title: "Arrays & Hashing", questions: 5, xp: 250, icon: "grid_view",    tag: "Data Structures", desc: "Hash maps, sets, frequency counting, sliding window", color: "#6366F1" },
  { id: "two-pointers",  title: "Two Pointers",      questions: 3, xp: 150, icon: "swipe",        tag: "Algorithms",      desc: "Convergence, fast/slow pointers, palindromes",       color: "#2EC866" },
  { id: "binary-search", title: "Binary Search",     questions: 3, xp: 150, icon: "manage_search",tag: "Algorithms",      desc: "Search spaces, lo/hi/mid, leftmost/rightmost",       color: "#F59E0B" },
];

const MODULE_TYPE_ICON: Record<string, string> = { lesson: "menu_book", challenge: "code", quiz: "quiz" };

function CourseCard({ course }: { course: typeof SAMPLE_COURSES[0] }) {
  const completed = course.modules.filter(m => m.completed).length;

  return (
    <Link
      to={`/courses/${course.id}`}
      className="group flex flex-col bg-white border border-gray-200 hover:border-green-300 rounded-2xl overflow-hidden transition-all shadow-sm"
    >
      {/* Progress accent bar */}
      <div className="h-0.5 w-full bg-gray-100">
        {course.progress > 0 && (
          <div className="h-full bg-[#2EC866]" style={{ width: `${course.progress}%` }} />
        )}
      </div>

      <div className="flex-1 p-5 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#D1FAE5] text-[#16a34a] border border-green-200">
                {course.topic}
              </span>
              <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border", DIFF_CLASS[course.difficulty])}>
                {course.difficulty}
              </span>
            </div>
            <h3 className="text-gray-900 font-bold text-sm leading-snug group-hover:text-gray-700 transition-colors">
              {course.title}
            </h3>
          </div>
          {!course.enrolled && (
            <span className="material-symbols-outlined text-gray-300 text-[16px] flex-shrink-0 mt-0.5 ml-2">lock</span>
          )}
        </div>

        <p className="text-gray-500 text-xs line-clamp-2 mb-4 leading-relaxed flex-1">{course.description}</p>

        <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            {course.estimated_hours}h
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">layers</span>
            {course.modules.length} modules
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">star</span>
            {course.rating}
          </span>
          <span>{course.students.toLocaleString()} learners</span>
        </div>

        {course.enrolled ? (
          <div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-gray-400">{completed}/{course.modules.length} modules</span>
              <span className="text-[#16a34a] font-bold">{course.progress}%</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#2EC866] rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 group-hover:text-[#16a34a] transition-colors font-semibold">
            <span className="material-symbols-outlined text-[14px]">play_arrow</span>
            Start course
          </div>
        )}
      </div>
    </Link>
  );
}

function CourseDetail({ courseId }: { courseId: string }) {
  const navigate = useNavigate();
  const course = SAMPLE_COURSES.find(c => c.id === courseId);
  if (!course) return <div className="p-8 text-gray-500">Course not found.</div>;

  const nextIdx = course.modules.findIndex(m => !m.completed);

  function handleStart(mod: typeof SAMPLE_COURSES[0]["modules"][0]) {
    if (mod.type === "challenge" && (mod as any).challenge_id) navigate(`/challenge/${(mod as any).challenge_id}`);
    else if (mod.type === "quiz"  && (mod as any).quiz_id)      navigate(`/quiz/${(mod as any).quiz_id}`);
    else if ((mod as any).lesson_id)                            navigate(`/lesson/${courseId}/${(mod as any).lesson_id}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link to="/courses" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-6 transition group font-medium">
        <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        Back to courses
      </Link>

      {/* Course header */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-7 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#D1FAE5] text-[#16a34a] border border-green-200">
                {course.topic}
              </span>
              <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border", DIFF_CLASS[course.difficulty])}>
                {course.difficulty}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-gray-500 text-sm leading-relaxed">{course.description}</p>
          </div>
          {course.enrolled && (
            <div className="flex-shrink-0 text-center bg-[#D1FAE5] border border-green-200 rounded-xl p-4 min-w-[72px]">
              <div className="text-2xl font-extrabold text-[#16a34a]">{course.progress}%</div>
              <div className="text-gray-500 text-[10px] mt-0.5">complete</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-5 text-xs text-gray-400 pt-4 mt-4 border-t border-gray-100">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>{course.estimated_hours} hours</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">layers</span>{course.modules.length} modules</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">star</span>{course.rating}</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span>{course.students.toLocaleString()}</span>
        </div>
      </div>

      {/* Module list */}
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Course Content</h2>
      <div className="flex flex-col gap-2">
        {course.modules.map((mod, idx) => {
          const isNext = idx === nextIdx;
          const isLocked = !mod.completed && idx > nextIdx;

          return (
            <div key={mod.id} className={cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all",
              mod.completed ? "bg-white border-gray-200 opacity-70"
              : isNext      ? "bg-white border-green-300 shadow-sm"
              : "bg-gray-50 border-gray-100 opacity-40"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                mod.completed ? "bg-green-50 text-green-600"
                : isNext      ? "bg-[#2EC866] text-white"
                : "bg-gray-100 text-gray-300"
              )}>
                {mod.completed
                  ? <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  : <span className="material-symbols-outlined text-[14px]">{MODULE_TYPE_ICON[mod.type]}</span>
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-semibold truncate">{mod.title}</p>
                <p className="text-gray-400 text-[11px] truncate">{mod.description}</p>
              </div>

              <span className="text-gray-300 text-[11px] flex-shrink-0">{mod.duration}</span>

              {isNext && (
                <button
                  onClick={() => handleStart(mod)}
                  className="btn-shine flex-shrink-0 bg-[#2EC866] hover:bg-[#1EA34E] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all duration-150 active:scale-95"
                >
                  {mod.type === "lesson" ? "Read" : mod.type === "quiz" ? "Quiz" : "Solve"}
                </button>
              )}
              {isLocked && (
                <span className="material-symbols-outlined text-gray-200 text-[16px] flex-shrink-0">lock</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabSwitcher({ tab, setTab }: { tab: "courses" | "notes"; setTab: (t: "courses" | "notes") => void }) {
  return (
    <div className="flex items-center gap-1 mb-7 p-1 bg-gray-100 rounded-xl w-fit">
      {(["courses", "notes"] as const).map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={cn(
            "btn-shine px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 active:scale-[0.97]",
            tab === t
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          {t === "courses" ? (
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">school</span>
              Courses
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">library_books</span>
              My Notes
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function CoursesPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate  = useNavigate();

  if (id) return <CourseDetail courseId={id} />;

  const tab = searchParams.get("tab") === "notes" ? "notes" : "courses";
  const setTab = (t: "courses" | "notes") => setSearchParams(t === "notes" ? { tab: "notes" } : {});

  if (tab === "notes") {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <TabSwitcher tab={tab} setTab={setTab} />
        <KnowledgeHubContent />
      </div>
    );
  }

  const enrolled  = SAMPLE_COURSES.filter(c => c.enrolled);
  const available = SAMPLE_COURSES.filter(c => !c.enrolled);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <TabSwitcher tab={tab} setTab={setTab} />
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Learning Paths</h1>
        <p className="text-gray-500 text-sm mt-1">Structured courses with AI-guided exercises. Learn concepts, then apply them in real challenges.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Enrolled",    value: enrolled.length,                                                                              color: "#6366F1" },
          { label: "In Progress", value: SAMPLE_COURSES.filter(c => c.enrolled && c.progress > 0 && c.progress < 100).length,          color: "#F59E0B" },
          { label: "Completed",   value: SAMPLE_COURSES.filter(c => c.progress === 100).length,                                        color: "#2EC866" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
            <div className="text-gray-400 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {enrolled.length > 0 && (
        <section className="mb-9">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Continue Learning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolled.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      )}

      {available.length > 0 && (
        <section className="mb-9">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Explore Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {available.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      )}

      {/* Quizzes */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Practice Quizzes</h2>
        <p className="text-gray-400 text-xs mb-4">Test conceptual understanding. MCQ with full explanations and XP rewards.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUIZ_CARDS.map(q => (
            <button
              key={q.id}
              onClick={() => navigate(`/quiz/${q.id}`)}
              className="btn-shine group text-left bg-white border border-gray-200 hover:border-gray-300 rounded-2xl overflow-hidden transition-all duration-150 shadow-sm active:scale-[0.98]"
            >
              <div className="h-0.5" style={{ background: q.color }} />
              <div className="p-5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: q.color + "1a", border: `1px solid ${q.color}33` }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: q.color }}>{q.icon}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{q.tag}</p>
                <h3 className="text-gray-900 font-bold text-sm mb-2 group-hover:text-gray-700 transition-colors">{q.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed mb-4">{q.desc}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-[11px]">{q.questions} questions</span>
                    <span className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: q.color }}>
                      <span className="material-symbols-outlined text-[12px]">bolt</span>+{q.xp} XP
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-[#2EC866] transition-colors">
                    arrow_forward
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
