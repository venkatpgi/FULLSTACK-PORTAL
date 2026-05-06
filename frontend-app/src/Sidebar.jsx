import { NavLink } from "react-router-dom";
import { useFormProgress } from "./context/FormProgressContext";
import "./Sidebar.css";
import { useState, useEffect } from "react";
const sections = [
  {
    title: "Core Forms",
    items: [
      { id: "form_a", label: "Screening", path: "/form-a", icon: "🧾" },
      { id: "form_b", label: "Birth & Resuscitation", path: "/form-b", icon: "👶" },
      { id: "form_c", label: "Maternal Details", path: "/form-c", icon: "🤰" },
    ],
  },
  {
    title: "Clinical",
    items: [
      { id: "form_d", label: "Postnatal Day 1", path: "/form-d", icon: "📅" },
      { id: "form_e", label: "NICU Admission", path: "/form-e", icon: "🏥" },
      { id: "form_f", label: "Morbidities", path: "/form-f", icon: "🧠" },
    ],
  },
  {
    title: "Outcomes",
    items: [
      { id: "form_j", label: "Composite Outcome", path: "/form-j", icon: "📈" },
      { id: "form_g", label: "Outcomes", path: "/form-g", icon: "📊" },
      { id: "form_h", label: "Cranial USG", path: "/form-h", icon: "🩻"},
      { id: "form_i", label: "ROP Screening", path: "/form-i", icon: "👁" },
      
    ],
  },
  {
    title: "Monitoring Logs",
    items: [
      { id: "fio2_auc", label: "FiO₂ AUC", path: "/fio2-auc", icon: "🫁" },
      { id: "vs6_1", label: "Resp / CV / Neuro", path: "/vs6-1", icon: "❤️" },
      { id: "infect_gi_hema", label: "Infect / GI / Hema", path: "/infect-gi-hema-log", icon: "🦠" },
      { id: "metab_renal_vasc_eye", label: "Metab / Renal / Eye", path: "/metab-renal-vasc-eye-log", icon: "🧪" },
    ],
  },
  {
    title: "Safety",
    items: [
      { id: "form_y_sae", label: "SAE Form", path: "/form-y-sae", icon: "⚠️" },
      { id: "adverse_events", label: "Adverse Events", path: "/adverse-events", icon: "📋" },
      { id: "sae_list", label: "SAE Listing", path: "/sae-list", icon: "📑" },
    ],
  },
];

export default function Sidebar() {
  const { completedForms = [], isProgressLoaded } = useFormProgress();

  const screeningId = localStorage.getItem("current_screening_id");
  const enrollmentId = localStorage.getItem("current_enrollment_id");

  // ✅ REQUIRED FIRST 4 FORMS
  const REQUIRED_FORMS = ["form_a", "form_b"];
  const [isEnrollmentLocked, setIsEnrollmentLocked] = useState(
  localStorage.getItem("enrollment_locked") === "true"
);

useEffect(() => {
  const checkLock = () => {
    setIsEnrollmentLocked(localStorage.getItem("enrollment_locked") === "true");
  };

  window.addEventListener("storage", checkLock);

  // ALSO CHECK ON MOUNT
  checkLock();

  return () => window.removeEventListener("storage", checkLock);
}, []);
  // ✅ CHECK IF UNLOCKED
  const isUnlocked = REQUIRED_FORMS.every((id) =>
    completedForms.includes(id)
  );

  // 🔥 dynamic routes
  const getPath = (form) => {
    if (form.id === "form_a" && screeningId) return `/form-a/${screeningId}`;
    if (form.id === "form_b" && screeningId) return `/form-b/${screeningId}`;
    if (form.id === "form_c" && enrollmentId) return `/form-c/${enrollmentId}`;
    if (form.id === "form_d" && enrollmentId) return `/form-d/${enrollmentId}`;
    if (form.id === "form_e" && enrollmentId) return `/form-e/${enrollmentId}`;

    if (enrollmentId) {
    return `${form.path}/${enrollmentId}`;
  }

  return form.path;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">PORTAL TRIAL</div>

      {sections.map((section) => (
        <div key={section.title} className="sidebar-section">
          <div className="section-title">{section.title}</div>

          {section.items.map((form) => {
            const completed = completedForms.includes(form.id);

            // 🔒 LOCK LOGIC
            const isLocked =
  isEnrollmentLocked ||
  (!isProgressLoaded
    ? true
    : (!REQUIRED_FORMS.includes(form.id) && !isUnlocked));
          if (!isProgressLoaded) {
  return <aside className="sidebar">Loading...</aside>;
}
            return (
              <NavLink
                key={form.id}
                to={isLocked ? "#" : getPath(form)}
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    if (isEnrollmentLocked) {
  alert("Participant cannot be enrolled as consent was not given.");
} else {
  alert("Complete required forms to unlock.");
}
                  }
                }}
                className={({ isActive }) =>
                  `sidebar-item 
                  ${isActive ? "active" : ""} 
                  ${isLocked ? "locked" : ""}`
                }
              >
                <div className="icon-box">
                  <span>{form.icon}</span>
                </div>

                <span className="label">{form.label}</span>

                <span
                  className={`status-icon ${
                    isLocked
                      ? "locked"
                      : completed
                      ? "done"
                      : "pending"
                  }`}
                >
                  {isLocked ? "🔒" : completed ? "✔" : "○"}
                </span>
              </NavLink>
            );
          })}
        </div>
      ))}
    </aside>
  );
}