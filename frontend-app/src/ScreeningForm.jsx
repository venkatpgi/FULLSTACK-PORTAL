import React, { useState, useRef, useEffect } from "react";
import api from "./api/axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./ScreeningForm.css";

import FormLayout from "./components/FormLayout";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

import { useFormProgress } from "./context/FormProgressContext";

// --- Format date as DD-MM-YYYY for display ---
function formatDateToDDMMYYYY(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// --- Convert date string to YYYY-MM-DD for backend ---
function toYYYYMMDD(ddmmyyyy) {
  if (!ddmmyyyy) return "";
  const [day, month, year] = ddmmyyyy.split("-");
  return `${year}-${month}-${day}`;
}

// --- Helper for datetime-local input ---
const toDateTimeLocalValue = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EditableField = ({
  name,
  children,
  isSaved,
  isEditing,
  activeField,
  setActiveField
}) => {
  const isFieldEditable = !isSaved || (isEditing && activeField === name);

  const childWithProps = React.cloneElement(children, {
    readOnly: !isFieldEditable,
    disabled: !isFieldEditable && children.type === "select"
  });

  return (
    <div className="field-row">
      <div className="field-input">{childWithProps}</div>

      {isSaved && (
        <button
          type="button"
          className={`edit-icon ${activeField === name ? "active" : ""}`}
          onClick={() => setActiveField(name)}
        >
          ✏️
        </button>
      )}
    </div>
  );
};

function ScreeningForm() {
  const navigate = useNavigate();
  const { markFormCompleted } = useFormProgress();
  const { screeningId } = useParams();
  const { resetProgress } = useFormProgress();
  const [errors, setErrors] = useState({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
 
  const [activeField, setActiveField] = useState(null);
  const handlePrint = () => {
  window.print();
}
  const isReadOnly = false;
  const editableProps = {
  isSaved,
  isEditing,
  activeField,
  setActiveField
};
  
  const [formData, setFormData] = useState({
    screening_datetime: "",
    site_name: "",
    site_id: "",
    screened_by: "",
    mother_first_name: "",
    mother_surname: "",
    husband_first_name: "",
    husband_surname: "",
    maternal_uid: "",
    hospital_admission_number: "",
    gestation_weeks: "",
    gestation_days: "",
    gestation_method: "",
    lmp_known: "",
    ga_source: "",   // LMP / EDD / Neither

    lmp_date: "",
    expected_delivery_date: "",
    inclusion_gest_lt_32: false,
    anticipated_dr_resus: false,
    exclusion_present: false,
    exclusion_reasons: "",
    reason_for_insufficient_time: "",
    decision_forego_resuscitation_reason: "",
    other_decision_reason: "",
    major_structural_anomalies_if_yes: "",
    fetal_hydrops: "",
    final_decision: "",
    consent_given: "",
    consent_taken_by: "",
    reason_not_approached: "",
    other_reason: "",
    gestation_known: "",                 // Yes / No
best_ga_weeks: "",
best_ga_days: "",
             

edd_known: "",                       // Yes / No
edd_date: "",

auto_ga_weeks: "",
auto_ga_days: "",

ga_not_determinable: false,
 exclusion_anomaly: "",
  exclusion_anomaly_details: "",

  
  fetal_hydrops_type: "",
  iufd: "",


  decision_forego_resus: "",
  decision_forego_resus_reason: "",

  insufficient_time: "",
  insufficient_time_reason: "",
  relationship_to_participant: "",
relationship_other: "",

  });

  const [message, setMessage] = useState("");
  const [showEndModal, setShowEndModal] = useState(false);
  const [gestationWeeksError, setGestationWeeksError] = useState("");
  const [gestationDaysError, setGestationDaysError] = useState("");
  const dateInputRef = useRef(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
const [consentMessage, setConsentMessage] = useState("");

  const getMissingFields = () => {
  const missing = [];

  if (!formData.site_name) missing.push("Site");
  if (!formData.screened_by) missing.push("Screened By");
  if (!formData.mother_first_name) missing.push("Mother First Name");
  if (!formData.husband_first_name) missing.push("Husband First Name");
  if (!formData.maternal_uid) missing.push("Maternal UID");
  if (!formData.mother_contact) missing.push("Mother Mobile Number");
  if (!formData.husband_contact) missing.push("Husband Mobile Number");

  if (!formData.consent_given) missing.push("Consent");

  if (!formData.exclusion_anomaly) missing.push("Structural Anomaly");
  if (!formData.fetal_hydrops) missing.push("Fetal Hydrops");
  if (!formData.decision_forego_resus) missing.push("Forego Resuscitation");
  if (!formData.insufficient_time) missing.push("Insufficient Time");
  if (!formData.iufd) missing.push("IUFD");

  return missing;
};
const [missingFields, setMissingFields] = useState([]);
const [showMissingModal, setShowMissingModal] = useState(false);
  const validateForm = () => {
  if (!formData.site_name) return "❌ Site is required.";
  if (!formData.screened_by) return "❌ Screened By is required.";
  if (!formData.mother_first_name) return "❌ Mother First Name is required.";
  

  // add your important validations only (not all)
  return null;
};

const path = window.location.pathname;

// Extract form name (form-a, form-b, etc.)
const formName = path.split("/")[1];

// Convert letter to number (a=1, b=2, ..., q=17)
const step = formName
  ? formName.replace("form-", "").charCodeAt(0) - 96
  : 1;
const saveForm = async () => {
  const missing = getMissingFields();

  // 🔴 Show popup if fields are missing
  if (missing.length > 0) {
    setMissingFields(missing);

    // 🔥 AUTO SCROLL TO TOP (FIX YOUR ISSUE)
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setShowMissingModal(true);
  }

  // ✅ Continue saving anyway
  const error = validateForm();
  if (error && missing.length === 0) {
    setMessage(error);

    // 🔥 ALSO SCROLL FOR ERROR MESSAGE
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    return false;
  }

  // ✅ Prepare payload
  const backendDate = formData.edd_date
    ? new Date(formData.edd_date).toISOString().split("T")[0]
    : null;

  const payload = {
    screening_id: formData.screening_id,
    screening_datetime: formData.screening_datetime,
    site_name: formData.site_name,
    site_id: formData.site_id,
    screened_by: formData.screened_by,

    mother_first_name: formData.mother_first_name,
    mother_surname: formData.mother_surname,
    husband_first_name: formData.husband_first_name,
    husband_surname: formData.husband_surname,

    maternal_uid: formData.maternal_uid,
    hospital_admission_number: formData.hospital_admission_number,
    mother_contact: formData.mother_contact || null,
    husband_contact: formData.husband_contact || null,

    // 🔥 SAFE conversion
    gestation_weeks:
      formData.gestation_known === "Yes"
        ? parseInt(formData.best_ga_weeks) || 0
        : parseInt(formData.auto_ga_weeks) || 0,

    gestation_days:
      formData.gestation_known === "Yes"
        ? parseInt(formData.best_ga_days) || 0
        : parseInt(formData.auto_ga_days) || 0,

    exclusion_present:
      formData.exclusion_anomaly === "Yes" ||
      formData.fetal_hydrops === "Yes" ||
      formData.decision_forego_resus === "Yes" ||
      formData.insufficient_time === "Yes" ||
      formData.iufd === "Yes"
        ? true
        : false,
     lmp_date: formData.lmp_date || null,
    expected_delivery_date: backendDate || null,
  };

  console.log("🚀 PAYLOAD SENT:", payload);

  try {
    let res;

    const storedId = localStorage.getItem("current_screening_id");
    let existingId = screeningId || storedId;

    if (existingId && existingId !== "undefined") {
      res = await api.put(`/screenings/${existingId}`, payload);
    } else {
      res = await api.post("/screenings/", payload);
    }

    console.log("✅ RESPONSE:", res.data);

    localStorage.setItem("current_screening_id", res.data.screening_id);
    localStorage.setItem("current_enrollment_id", res.data.enrollment_id);

    // 🟢 Show message
   if (missing.length === 0) {
  setMessage("✅ Form saved successfully");
  setIsSaved(true);
  setIsEditing(false);  // 🔥 lock again
} else {
  setMessage("⚠️ Saved (Incomplete)");
  setIsSaved(false);  // ❌ keep Next disabled
}
setActiveField(null); // 🔥 VERY IMPORTANT

    // 🔥 Scroll to top to show message
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setTimeout(() => setMessage(""), 3000);
    

    return true;
  } catch (err) {
    console.error("❌ FULL ERROR:", err);
    console.error(
      "❌ ERROR RESPONSE FULL:",
      JSON.stringify(err.response?.data, null, 2)
    );

    setMessage("❌ Save failed");

    // 🔥 Scroll to top on error
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setIsSaved(false);
    return false;
  }
};
const handleNext = async () => {
  const success = await saveForm();
  if (!success) return;

  // 🚨 CONSENT CHECK
  if (formData.consent_given !== "Yes") {
    
    localStorage.setItem("enrollment_locked", "true");
    window.dispatchEvent(new Event("storage"));
    console.log("LOCK SET:", localStorage.getItem("enrollment_locked"));
    let msg = "";

    if (formData.consent_given === "No") {
      msg = "Screening completed. Participant cannot be enrolled because consent was refused.";
    } 
    else if (formData.consent_given === "Not approached") {
      msg = "Screening completed. Participant cannot be enrolled because consent was not taken.";
    } 
    else {
      msg = "Screening completed. Participant cannot be enrolled.";
    }

    // ✅ SHOW POPUP
    setConsentMessage(msg);
    setShowConsentModal(true);

    return; // ❌ STOP NAVIGATION
  }

  // ✅ NORMAL FLOW
  markFormCompleted("form_a");
  localStorage.removeItem("enrollment_locked");
  window.dispatchEvent(new Event("storage"));
  navigate(`/form-b/${localStorage.getItem("current_screening_id")}`);
};
const handlePrevious = () => {
  navigate("/dashboard"); // or previous page
};
  // Auto-fill screening_datetime on mount
  useEffect(() => {
    const now = new Date();
    setFormData((prev) => ({
      ...prev,
      screening_datetime: toDateTimeLocalValue(now),
    }));
  }, []);

  

  useEffect(() => {
  if (!formData.site_name) {
    setNurses([]);
    
    return;
  }

  api
  .get(`/sites/${formData.site_name}/screeners`)
  .then(res => {
    setNurses(res.data);
    
  })
    .catch(() => setNurses([]));
}, [formData.site_name]);

useEffect(() => {
  // ✅ If opening fresh Form A (no ID)
  if (!screeningId) {
    localStorage.removeItem("current_screening_id");
    localStorage.removeItem("current_enrollment_id");

    resetProgress();
  }
}, [screeningId]);

useEffect(() => {
  if (!isSaved) {
    setActiveField(null);
  }
}, [isSaved]);
useEffect(() => {
  if (formData.lmp_date) {
    const lmp = new Date(formData.lmp_date);

    const edd = new Date(lmp);
    edd.setDate(edd.getDate() + 280);

    const formatted = edd.toISOString().split("T")[0];

    setFormData(prev => ({
      ...prev,
      edd_date: formatted,
      edd_known: "Yes"
    }));
  }
}, [formData.lmp_date]);

 

  const SITE_ID_MAP = {
  PGIMER: "01",
  GMCH: "02",
  IOG: "03",
  AFMC: "04",
  "GMCH-A": "05",
  AMC: "06",
};

const [nurses, setNurses] = useState([]);
// ✅ Live eligibility calculation
const getEligibilityStatus = () => {
  let weeks = null;
  let days = 0;

  if (formData.gestation_known === "Yes") {
    if (!formData.best_ga_weeks) return null;  // ⛔ IMPORTANT
    weeks = Number(formData.best_ga_weeks);
    days = Number(formData.best_ga_days || 0);
  } 
  else if (
    formData.gestation_known === "No" &&
    formData.edd_known === "Yes"
  ) {
    if (formData.auto_ga_weeks === "" || formData.auto_ga_weeks === null)
      return null;  // ⛔ IMPORTANT

    weeks = Number(formData.auto_ga_weeks);
    days = Number(formData.auto_ga_days || 0);
  }

  if (weeks === null || isNaN(weeks)) return null;

  const total = weeks * 7 + days;
  const min = 25 * 7;
  const max = 31 * 7 + 6;

  if (total < min) return "low";
  if (total > max) return "high";
  return "eligible";
};



const handleContactChange = (e, field) => {
  let value = e.target.value;

  // ✅ allow only numbers
  value = value.replace(/\D/g, "");

  // update form
  setFormData((prev) => ({
    ...prev,
    [field]: value,
  }));

  // validation
  setErrors((prev) => ({
    ...prev,
    [field]:
      value.length === 0 || value.length === 10
        ? ""
        : "Must be 10 digits",
  }));
};
const anyExclusionYes =
  formData.exclusion_anomaly === "Yes" ||
  formData.fetal_hydrops === "Yes" ||
  formData.decision_forego_resus === "Yes" ||
  formData.iufd === "Yes" ||  // ✅ Added
  formData.insufficient_time === "Yes";

const eligibilityStatus = getEligibilityStatus();

const isEligible = eligibilityStatus === "eligible";
const isNotEligible =
  eligibilityStatus === "low" || eligibilityStatus === "high";

  
const gaNotDeterminable =
  formData.gestation_known === "No" &&
  formData.ga_source === "Neither";

const endParticipation = gaNotDeterminable || isNotEligible;


 const gestationPathComplete =
  formData.gestation_known === "Yes" ||
  (formData.gestation_known === "No" && formData.edd_known === "Yes");
  
  const handleChange = (e) => {
   
  let { name, value, type, checked } = e.target;

  if (type === "checkbox") value = checked;

  const nameFields = [
    "screened_by",
    "mother_first_name",
    "mother_surname",
    "husband_first_name",
    "husband_surname",
  ];

  if (nameFields.includes(name)) {
    value = value.replace(/[^a-zA-Z ]/g, "");
  }

  // Validation
  if (name === "gestation_weeks") {
    if (value === "") setGestationWeeksError("");
    else if (isNaN(value) || value < 20 || value > 50)
      setGestationWeeksError("Value must be between 20 and 50 weeks.");
    else setGestationWeeksError("");
  }

  if (name === "gestation_days") {
    if (value === "") setGestationDaysError("");
    else if (isNaN(value) || value < 0 || value > 6)
      setGestationDaysError("Value must be between 0 and 6 days.");
    else setGestationDaysError("");
  }

  // ✅ SITE → SITE ID AUTO MAP
  if (name === "site_name") {
    const siteId = SITE_ID_MAP[value] || "";
    setFormData(prev => ({
      ...prev,
      site_name: value,
      site_id: siteId,
      screened_by: "",
    }));
    return;
  }
 if (name === "ga_source") {
  setFormData(prev => ({
    ...prev,
    ga_source: value,

    // 🔥 RESET BOTH FIELDS WHEN SWITCHING
    lmp_date: "",
    edd_date: "",
    auto_ga_weeks: "",
    auto_ga_days: "",
  }));
  return;
}

if (name === "exclusion_anomaly") {
  setFormData(prev => ({
    ...prev,
    exclusion_anomaly: value,
    exclusion_anomaly_details: value === "Yes" ? prev.exclusion_anomaly_details : "",
  }));
  return;
}
if (name === "fetal_hydrops") {
  setFormData(prev => ({
    ...prev,
    fetal_hydrops: value,
    fetal_hydrops_type: value === "Yes" ? prev.fetal_hydrops_type : "",
  }));
  return;
}
if (name === "decision_forego_resus") {
  setFormData(prev => ({
    ...prev,
    decision_forego_resus: value,
    decision_forego_resus_reason: value === "Yes"
      ? prev.decision_forego_resus_reason
      : "",
  }));
  return;
}
if (name === "decision_forego_resus_reason") {
  setFormData(prev => ({
    ...prev,
    decision_forego_resus_reason: value,
    decision_forego_resus_reason_other:
      value === "Other" ? prev.decision_forego_resus_reason_other : "",
  }));
  return;
}
if (name === "insufficient_time") {
  setFormData(prev => ({
    ...prev,
    insufficient_time: value,
    insufficient_time_reason: value === "Yes"
      ? prev.insufficient_time_reason
      : "",
  }));
  return;
}
if (name === "gestation_known") {
  setFormData(prev => ({
    ...prev,
    gestation_known: value,

    // reset all GA-related fields
    ga_source: "",
    lmp_date: "",
    edd_date: "",
    auto_ga_weeks: "",
    auto_ga_days: "",
    best_ga_weeks: "",
    best_ga_days: "",
  }));
  return;
}
if (name === "consent_given") {
  setFormData(prev => {
    // 🚫 DO NOT RESET during initial load
    if (isInitialLoad) {
      return {
        ...prev,
        consent_given: value,
      };
    }

    // ✅ Only reset when user manually changes
    if (prev.consent_given === value) {
      return prev;
    }

    return {
      ...prev,
      consent_given: value,

      consent_taken_by: "",
      relationship_to_participant: "",
      relationship_other: "",
      reason_for_consent_refusal: "",
      reason_for_consent_refusal_other: "",
      reason_not_approached: "",
      reason_not_approached_other: "",
    };
  });
  return;
}
if (name === "reason_for_consent_refusal") {
  setFormData(prev => ({
    ...prev,
    reason_for_consent_refusal: value,
    reason_for_consent_refusal_other:
      value === "Other" ? prev.reason_for_consent_refusal_other : "",
  }));
  return;
}
if (name === "reason_not_approached") {
  setFormData(prev => ({
    ...prev,
    reason_not_approached: value,
    reason_not_approached_other:
      value === "Other" ? prev.reason_not_approached_other : "",
  }));
  return;
}
if (name === "relationship_to_participant") {
  setFormData(prev => ({
    ...prev,
    relationship_to_participant: value,
    relationship_other:
      value === "Other" ? prev.relationship_other : "",
  }));
  return;
}
  if (name === "maternal_uid") {
  value = value.replace(/[^0-9]/g, "");
}

  // ✅ THIS WAS MISSING (MOST IMPORTANT)
  setFormData(prev => ({
    ...prev,
    [name]: value,
  }));
};

  
  useEffect(() => {
  if (formData.edd_date) {
    const edd = new Date(formData.edd_date);
    const today = new Date();

    const diffDays = Math.floor(
      (280 - (edd - today) / (1000 * 60 * 60 * 24))
    );

    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    setFormData(p => ({
      ...p,
      auto_ga_weeks: weeks,
      auto_ga_days: days,
      ga_not_determinable: false,
    }));
  }
}, [formData.edd_date]);

useEffect(() => {
  let id = screeningId;

  // ✅ fallback from localStorage
  if (!id) {
    id = localStorage.getItem("current_screening_id");
  }

  // ❌ still no id → stop
  if (!id || id === "undefined" || id === "null") {
  return;
}

  // ✅ ensure URL is correct
  if (!screeningId) {
    navigate(`/form-a/${id}`);
  }

  // ✅ fetch data
  api
    .get(`/screenings/by-screening-id/${id}`)
    .then((res) => {
      console.log("CONSENT VALUE:", res.data.consent_taken_by);
  const data = res.data;

  console.log("LOADED DATA:", data);

  setFormData(prev => ({
    ...prev,
    ...data,

    // ✅ GESTATION
    gestation_known: data.gestation_weeks ? "Yes" : "No",
    best_ga_weeks: data.gestation_weeks || "",
    best_ga_days: data.gestation_days || "",

    edd_known: data.expected_delivery_date ? "Yes" : "No",
    edd_date: data.expected_delivery_date || "",

    // ✅ EXCLUSION (RECONSTRUCT FROM STRING)
    exclusion_anomaly: data.exclusion_reasons?.includes("Structural anomaly") ? "Yes" : "No",
    fetal_hydrops: data.exclusion_reasons?.includes("Fetal hydrops") ? "Yes" : "No",
    decision_forego_resus: data.exclusion_reasons?.includes("Forego resuscitation") ? "Yes" : "No",
    insufficient_time: data.exclusion_reasons?.includes("Insufficient time") ? "Yes" : "No",
    iufd: data.exclusion_reasons?.includes("IUFD") ? "Yes" : "No",

    // ✅ CONSENT
    consent_given: data.consent_given || "",
  consent_taken_by: data.consent_taken_by || "",
  relationship_to_participant: data.relationship_to_participant || "",
  relationship_other: data.relationship_other || "",

  reason_for_consent_refusal: data.reason_for_consent_refusal || "",
  reason_for_consent_refusal_other: data.reason_for_consent_refusal_other || "",

  reason_not_approached: data.reason_not_approached || "",
  reason_not_approached_other: data.reason_not_approached_other || "",

  }));
  setIsSaved(true);
    setIsEditing(false);
    setActiveField(null);
  setIsInitialLoad(false);
})
    .catch((err) => {
      console.log("❌ Failed to load screening", err);
    });

}, [screeningId]);



   const YesNoField = ({ label, name, value, onChange }) => {
  return (
    <div className="form-group">
      <label>{label}<span className="required">*</span></label>
      <select
        name={name}
        value={value || ""}
        onChange={onChange}
      >
        <option value="">-- Select --</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </div>
  );
};

  const handleDateChange = (e) => {
    const date = e.target.value; // yyyy-mm-dd
    const formatted = formatDateToDDMMYYYY(date); // dd-mm-yyyy for display
    setFormData((prev) => ({
      ...prev,
      expected_delivery_date: formatted,
    }));
  };

  const handleDateClick = () => {
    dateInputRef.current.showPicker();
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage("");

  // 🚨 1️⃣ GA cannot be determined → stop immediately
  const gaNotDeterminable =
    formData.gestation_known === "No" &&
    formData.edd_known === "No";

  if (gaNotDeterminable) {
    setShowEndModal(true);
    return;
  }

  // 🚨 2️⃣ Calculate final gestational age
  let finalGestWeeks = null;
  let finalGestDays = 0;

  if (formData.gestation_known === "Yes") {
    if (!formData.best_ga_weeks) {
      setMessage("❌ Please enter gestational weeks.");
      return;
    }

    finalGestWeeks = Number(formData.best_ga_weeks);
    finalGestDays = Number(formData.best_ga_days || 0);
  } 
  else if (
    formData.gestation_known === "No" &&
    formData.edd_known === "Yes"
  ) {
    if (
      formData.auto_ga_weeks === "" ||
      formData.auto_ga_weeks === null
    ) {
      setMessage("❌ Gestational age could not be calculated.");
      return;
    }

    finalGestWeeks = Number(formData.auto_ga_weeks);
    finalGestDays = Number(formData.auto_ga_days || 0);
  }

  // 🚨 3️⃣ Protocol eligibility check (25w0d–31w6d)
  const totalDays =
    finalGestWeeks !== null
      ? finalGestWeeks * 7 + finalGestDays
      : null;

  const minDays = 25 * 7;
  const maxDays = 31 * 7 + 6;

  const isEligible =
    totalDays !== null &&
    totalDays >= minDays &&
    totalDays <= maxDays;

  if (!isEligible) {
    setMessage(
      "❌ Participant not eligible. Gestation must be between 25w0d and 31w6d."
    );
    return;
  }
  if (!/^\d{2}-\d{4}$/.test(formData.screening_id)) {
  setMessage("❌ Screening ID must be in format 01-0001");
  return;
}
  // 🚨 4️⃣ Now check gestation validation errors
  if (gestationWeeksError || gestationDaysError) {
    setMessage("❌ Please correct gestation values before submitting.");
    return;
  }

  // 🚨 5️⃣ Only AFTER eligibility → check required fields

if (!formData.site_name) {
  setMessage("❌ Site is required.");
  return;
}

if (!formData.screened_by) {
  setMessage("❌ Screened By is required.");
  return;
}

if (!formData.mother_first_name) {
  setMessage("❌ Mother First Name is required.");
  return;
}



if (!formData.husband_first_name) {
  setMessage("❌ Husband First Name is required.");
  return;
}

if (!formData.maternal_uid) {
  setMessage("❌ Maternal UID (CR Number) is required.");
  return;
}

if (formData.maternal_uid.length > 12) {
  setMessage("❌ Maternal UID cannot exceed 12 digits.");
  return;
}
if (
  (formData.mother_contact &&
    formData.mother_contact.length !== 10) ||
  (formData.husband_contact &&
    formData.husband_contact.length !== 10)
) {
  alert("Contact numbers must be exactly 10 digits");
  return;
}

// 🚨 6️⃣ Exclusion Criteria Mandatory Validation

if (!formData.exclusion_anomaly) {
  setMessage("❌ Please select Major structural anomalies (Yes/No).");
  return;
}

if (!formData.fetal_hydrops) {
  setMessage("❌ Please select Fetal Hydrops (Yes/No).");
  return;
}

if (!formData.decision_forego_resus) {
  setMessage("❌ Please select Decision to forego resuscitation (Yes/No).");
  return;
}

if (!formData.insufficient_time) {
  setMessage("❌ Please select Insufficient time for consent (Yes/No).");
  return;
}

if (!formData.iufd) {
  setMessage("❌ Please select IUFD (Yes/No).");
  return;
}

// 🚨 Subfield validation when Yes is selected

if (
  formData.exclusion_anomaly === "Yes" &&
  !formData.exclusion_anomaly_details
) {
  setMessage("❌ Please specify structural anomaly details.");
  return;
}

if (
  formData.fetal_hydrops === "Yes" &&
  !formData.fetal_hydrops_type
) {
  setMessage("❌ Please select type of Fetal Hydrops.");
  return;
}

if (
  formData.decision_forego_resus === "Yes" &&
  !formData.decision_forego_resus_reason
) {
  setMessage("❌ Please select reason for forego resuscitation.");
  return;
}

if (
  formData.insufficient_time === "Yes" &&
  !formData.insufficient_time_reason
) {
  setMessage("❌ Please specify reason for insufficient time.");
  return;
}

// 🚨 Consent validation

if (!formData.consent_given) {
  setMessage("❌ Please select Consent status.");
  return;
}

if (
  (formData.consent_given === "Yes" ||
    formData.consent_given === "No") &&
  !formData.consent_taken_by
) {
  setMessage("❌ Please select who took the consent.");
  return;
}

if (
  formData.consent_given === "No" &&
  !formData.reason_for_consent_refusal
) {
  setMessage("❌ Please select reason for consent refusal.");
  return;
}

if (
  formData.consent_given === "Not approached" &&
  !formData.reason_not_approached
) {
  setMessage("❌ Please select reason not approached.");
  return;
}

if (
  (formData.consent_given === "Yes" || formData.consent_given === "No") &&
  !formData.relationship_to_participant
) {
  setMessage("❌ Please select relationship to participant.");
  return;
}

if (
  formData.decision_forego_resus === "Yes" &&
  formData.decision_forego_resus_reason === "Other" &&
  !formData.decision_forego_resus_reason_other
) {
  setMessage("❌ Please specify 'Other' reason.");
  return;
}

if (
  formData.relationship_to_participant === "Other" &&
  !formData.relationship_other
) {
  setMessage("❌ Please specify relationship.");
  return;
}

  // ✅ Convert to backend date format
  const backendDate = formData.expected_delivery_date
    ? toYYYYMMDD(formData.expected_delivery_date)
    : "";

  const payload = {
    screening_id: formData.screening_id,
    screening_datetime: formData.screening_datetime,
    site_name: formData.site_name,
    site_id: formData.site_id,
    screened_by: formData.screened_by,

    mother_first_name: formData.mother_first_name,
    mother_surname: formData.mother_surname,
    husband_first_name: formData.husband_first_name,
    husband_surname: formData.husband_surname,

    maternal_uid: formData.maternal_uid,
    hospital_admission_number: formData.hospital_admission_number,
    mother_contact: formData.mother_contact || null,
  husband_contact: formData.husband_contact || null,

    gestation_weeks:
      formData.gestation_known === "Yes"
        ? Number(formData.best_ga_weeks)
        : Number(formData.auto_ga_weeks),

    gestation_days:
      formData.gestation_known === "Yes"
        ? Number(formData.best_ga_days)
        : Number(formData.auto_ga_days),

    gestation_method: formData.gestation_method || null,
    expected_delivery_date: backendDate || null,

    exclusion_present: anyExclusionYes,

    exclusion_reasons: anyExclusionYes
      ? [
          formData.exclusion_anomaly === "Yes" && "Structural anomaly",
          formData.fetal_hydrops === "Yes" && "Fetal hydrops",
          formData.decision_forego_resus === "Yes" && "Forego resuscitation",
          formData.insufficient_time === "Yes" && "Insufficient time",
          formData.iufd === "Yes" && "IUFD",
        ]
          .filter(Boolean)
          .join(", ")
      : null,
// ✅ CONSENT FIELDS ADD THIS
consent_given: formData.consent_given || null,

consent_taken_by:
  formData.consent_given === "Yes" ||
  formData.consent_given === "No"
    ? formData.consent_taken_by
    : null,

relationship_to_participant:
  formData.consent_given === "Yes" ||
  formData.consent_given === "No"
    ? formData.relationship_to_participant
    : null,

relationship_other:
  formData.relationship_to_participant === "Other"
    ? formData.relationship_other
    : null,

reason_for_consent_refusal:
  formData.consent_given === "No"
    ? formData.reason_for_consent_refusal
    : null,

reason_for_consent_refusal_other:
  formData.reason_for_consent_refusal === "Other"
    ? formData.reason_for_consent_refusal_other
    : null,

reason_not_approached:
  formData.consent_given === "Not approached"
    ? formData.reason_not_approached
    : null,

reason_not_approached_other:
  formData.reason_not_approached === "Other"
    ? formData.reason_not_approached_other
    : null,   
  };

  try {
    let res;

const storedId = localStorage.getItem("current_screening_id");

let existingId = null;

if (screeningId && screeningId !== "undefined") {
  existingId = screeningId;
} else if (storedId && storedId !== "undefined" && storedId !== "null") {
  existingId = storedId;
}

if (existingId) {
  res = await api.put(`/screenings/${existingId}`, payload);
} else {
  res = await api.post("/screenings/", payload);
}
    console.log("SCREENING RESPONSE:", res.data);
    console.log("SCREENING ID:", res.data.screening_id);
    const enrollmentId = res.data.enrollment_id;
    localStorage.setItem("current_screening_id", res.data.screening_id);
    localStorage.setItem("current_enrollment_id", res.data.enrollment_id);
    
    markFormCompleted("form_a");

    setTimeout(() => {
      navigate(`/form-b/${res.data.screening_id}`);
    }, 300);
  } catch (err) {
    console.error(err);
    alert("Failed to save screening");
  }
};

  return (
    <>
    
    <form className={`screening-form ${isSaved ? "readonly" : ""}`}>
      <fieldset>
      
      <div className="form-inner">
        
     <div className="form-a-header">
  <div className="form-a-header-main">
    <h2>Form A — Screening Form</h2>
    <span className="form-a-subtitle">
      Eligibility Assessment (Pregnant women &lt;32 weeks gestation)
    </span>
  </div>
</div>
{/* ================= GESTATION ASSESSMENT ================= */}
<div className="form-section soft-blue">
  <h3>Gestation Assessment</h3>

  {/* Gestation known */}
  <div className="form-grid-2">
    <div className="form-group">
      <label>Gestation in weeks clearly known?</label>
      <select
        name="gestation_known"
        value={formData.gestation_known}
        onChange={handleChange}
      >
        <option value="">--Select--</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </div>
  </div>

  {/* ================= IF YES ================= */}
  {formData.gestation_known === "Yes" && (
    <>
      {/* GA */}
      <div className="form-grid-2">
        <div className="form-group">
          <label>Best estimate GA (weeks)<span className="required">*</span></label>
          <input
            type="number"
            name="best_ga_weeks"
            value={formData.best_ga_weeks}
            onChange={handleChange}
            min="10"
            max="50"
          />
        </div>

        <div className="form-group">
          <label>Best estimate GA (days)<span className="required">*</span></label>
          <input
            type="number"
            name="best_ga_days"
            value={formData.best_ga_days}
            onChange={handleChange}
            min="0"
            max="6"
          />
        </div>
      </div>

      {/* OPTIONAL EDD */}
      <div className="form-group">
        <label>Expected Delivery Date (optional)</label>
        <DatePicker
  selected={formData.edd_date ? new Date(formData.edd_date) : null}
  onChange={(date) =>
    setFormData(prev => ({
      ...prev,
      edd_date: date ? date.toISOString().split("T")[0] : ""
    }))
  }
  dateFormat="dd-MM-yyyy"
  placeholderText="Select date"
/>
      </div>

      {/* METHOD */}
      <div className="form-group">
        <label>Method of gestation assessment<span className="required">*</span></label>
        <select
          name="gestation_method"
          value={formData.gestation_method}
          onChange={handleChange}
        >
          <option value="">--Select--</option>
          <option value="LMP">LMP</option>
          <option value="Early USG">Early USG (&lt;24 weeks)</option>
          <option value="Fundal Height">Fundal Height</option>
          <option value="Unknown">Method not known</option>
        </select>
      </div>

      
    </>
  )}

  {/* ================= IF NO ================= */}
  {formData.gestation_known === "No" && (
    <>
      <div className="form-group">
        <label>If No, is any of the following known?</label>
        <select
          name="ga_source"
          value={formData.ga_source || ""}
          onChange={handleChange}
        >
          <option value="">--Select--</option>
          <option value="LMP">LMP</option>
          <option value="EDD">EDD</option>
          <option value="Neither">Neither known</option>
        </select>
      </div>

      {/* ===== LMP FLOW ===== */}
      {formData.ga_source === "LMP" && (
        <div className="form-group">
          <label>LMP Date</label>
          <DatePicker
  selected={formData.lmp_date ? new Date(formData.lmp_date) : null}
  onChange={(date) =>
    setFormData(prev => ({
      ...prev,
      lmp_date: date ? date.toISOString().split("T")[0] : ""
    }))
  }
  dateFormat="dd-MM-yyyy"
  placeholderText="Select date"
/>
        </div>
        
      )
      }
      {formData.ga_source === "LMP" && formData.edd_date && (
  <div className="form-group">
    <label>Expected Delivery Date (Auto-calculated)</label>
    <input
  value={
    formData.edd_date
      ? formatDateToDDMMYYYY(formData.edd_date)
      : ""
  }
  readOnly
  className="readonly-input"
/>
  </div>
)}

      {/* ===== EDD FLOW ===== */}
      {formData.ga_source === "EDD" && (
        <div className="form-group">
          <label>Expected Delivery Date</label>
          <DatePicker
  selected={formData.edd_date ? new Date(formData.edd_date) : null}
  onChange={(date) =>
    setFormData(prev => ({
      ...prev,
      edd_date: date ? date.toISOString().split("T")[0] : ""
    }))
  }
  dateFormat="dd-MM-yyyy"
  placeholderText="Select date"
/>
        </div>
      )}
    </>
  )}

  {/* ================= AUTO GA ================= */}
  {formData.gestation_known === "No" &&
    (formData.ga_source === "EDD" || formData.ga_source === "LMP") &&
    formData.auto_ga_weeks !== "" && (
      <div className="form-group">
        <label>Best calculated gestational age</label>
        <input
          value={`${formData.auto_ga_weeks} weeks ${formData.auto_ga_days} days`}
          readOnly
        />
      </div>
    )}

  {/* ================= STOP CONDITIONS ================= */}

  {/* Neither known */}
  {formData.gestation_known === "No" &&
    formData.ga_source === "Neither" && (
      <div className="alert-danger">
        ❌ Gestational age cannot be determined.<br />
        End participation.
      </div>
    )}

  {/* ≥32 weeks */}
  {eligibilityStatus === "high" && (
    <div className="alert-danger">
      ❌ Gestational age ≥32 weeks.<br />
      Cannot proceed as per protocol.
    </div>
  )}

  {/* <25 weeks */}
  {eligibilityStatus === "low" && (
    <div className="alert-danger">
      ❌ Gestational age &lt;25 weeks.<br />
      Not eligible.
    </div>
  )}
</div>
{gestationPathComplete && !endParticipation && (
<>
  
   {/* ================= IDENTIFICATION ================= */}
<div className="form-section soft-blue">
  <h3>Identification</h3>

  {/* Row 1 */}
  <div className="form-grid-2">
    <div className="form-group">
      <label>Screening ID</label>
      <input
  type="text"
  name="screening_id"
  value={formData.screening_id || ""}
  placeholder="01-0001"
  maxLength={7}
  onChange={(e) => {
    let value = e.target.value;

    // Allow only digits + hyphen
    value = value.replace(/[^0-9-]/g, "");

    // Auto add hyphen after 2 digits
    if (value.length === 2 && !value.includes("-")) {
      value = value + "-";
    }

    // Prevent multiple hyphens
    const parts = value.split("-");
    if (parts.length > 2) return;

    // Limit format: XX-XXXX
    if (parts[0].length > 2) return;
    if (parts[1] && parts[1].length > 4) return;

    setFormData(prev => ({
      ...prev,
      screening_id: value
    }));
  }}
/>
    </div>

    <div className="form-group">
      <label>Site<span className="required">*</span>
      </label>
      <EditableField name="site_name" {...editableProps}>
  <select
    name="site_name"
    value={formData.site_name || ""}
    onChange={handleChange}
  >
    <option value="">--Select--</option>
    <option>PGIMER</option>
    <option>GMCH</option>
    <option>IOG</option>
    <option>AFMC</option>
    <option>GMCH-A</option>
    <option>AMC</option>
  </select>
</EditableField>
    </div>
  </div>

  {/* Row 2 */}
  <div className="form-grid-2">
    

    <div className="form-group">
  <label>Site ID</label>
  <input
    value={formData.site_id || ""}
    readOnly
    className="readonly-input"
  />
</div>

    <div className="form-group">
      <label>Screening Date & Time</label>
      <EditableField name="screening_datetime" {...editableProps}>
  <DatePicker
    selected={
      formData.screening_datetime
        ? new Date(formData.screening_datetime)
        : null
    }
    onChange={(date) =>
      setFormData((prev) => ({
        ...prev,
        screening_datetime: date ? date.toISOString() : ""
      }))
    }
    showTimeSelect
    timeFormat="HH:mm"
    timeIntervals={1}
    dateFormat="dd-MM-yyyy | HH:mm"
  />
</EditableField>
    </div>
  </div>

  {/* Row 3 */}
  <div className="form-grid-2">
    <div className="form-group">
  <label>Screened by<span className="required">*</span></label>
  <EditableField name="screened_by" {...editableProps}>
  <select
    name="screened_by"
    value={formData.screened_by || ""}
    onChange={handleChange}
    disabled={!formData.site_name}
  >
    <option value="">
      {formData.site_name ? "-- Select Nurse --" : "Select Site first"}
    </option>

    {formData.screened_by &&
      !nurses.includes(formData.screened_by) && (
        <option value={formData.screened_by}>
          {formData.screened_by}
        </option>
      )}

    {nurses.map(nurse => (
      <option key={nurse} value={nurse}>
        {nurse}
      </option>
    ))}
  </select>
</EditableField>
</div>


    <div className="form-group">
      {/* intentionally left blank for balance */}
    </div>
  </div>
</div>



   {/* ================= MATERNAL IDENTIFICATION ================= */}
<div className="form-section soft-blue">
  <h3>Maternal Identification</h3>

  {/* Mother */}
  <div className="form-grid-2">
    <div className="form-group">
      <label>Mother’s First Name<span className="required">*</span></label>
      
  <EditableField name="mother_first_name" {...editableProps}>
  <input
    name="mother_first_name"
    value={formData.mother_first_name || ""}
    onChange={handleChange}
  />
</EditableField>

  

    </div>

    <div className="form-group">
      <label>Mother’s Surname</label>
      <EditableField name="mother_surname" {...editableProps}>
  <input
    name="mother_surname"
    value={formData.mother_surname || ""}
    onChange={handleChange}
    placeholder="Optional"
  />
</EditableField>
    </div>
  </div>

  {/* Husband */}
  <div className="form-grid-2">
    <div className="form-group">
      <label>Husband’s First Name<span className="required">*</span></label>
      <EditableField name="husband_first_name" {...editableProps}>
  <input
    name="husband_first_name"
    value={formData.husband_first_name || ""}
    onChange={handleChange}
  />
</EditableField>
    </div>

    <div className="form-group">
      <label>Husband’s Surname</label>
      <EditableField name="husband_surname" {...editableProps}>
  <input
    name="husband_surname"
    value={formData.husband_surname || ""}
    onChange={handleChange}
    placeholder="Optional"
  />
</EditableField>
    </div>
  </div>

  {/* IDs */}
  <div className="form-grid-2">
    <div className="form-group">
  <label>
    Maternal UID (CR Number) <span className="required">*</span>
  </label>
  <EditableField name="maternal_uid" {...editableProps}>
  <input
    name="maternal_uid"
    value={formData.maternal_uid || ""}
    onChange={handleChange}
    maxLength={12}
    inputMode="numeric"
  />
</EditableField>
</div>

    <div className="form-group">
      <label>Hospital Admission Number</label>
      <EditableField name="hospital_admission_number" {...editableProps}>
      <input
  name="hospital_admission_number"
  value={formData.hospital_admission_number || ""}
  maxLength={15}
  inputMode="numeric"
  pattern="[0-9]*"
  placeholder="Enter up to 15 digits"
  onChange={(e) => {
    let value = e.target.value;

    // ✅ Allow only numbers
    value = value.replace(/\D/g, "");

    // ✅ Limit to 15 digits
    if (value.length > 15) return;

    setFormData(prev => ({
      ...prev,
      hospital_admission_number: value
    }));
  }}
/></EditableField>
    </div>
  </div>
  <div className="form-row">
    <div className="form-group">
      <label>Contact (Mother) <span className="required">*</span></label>
      <EditableField name="mother_contact" {...editableProps}>
      <input
  type="text"
  name="mother_contact"
  value={formData.mother_contact || ""}
  maxLength={10}
  inputMode="numeric"
  pattern="\d{10}"
    onChange={(e) => handleContactChange(e, "mother_contact")}
  required
/></EditableField>{errors.mother_contact && (
  <div className="field-error">{errors.mother_contact}</div>
)}
    </div>

    <div className="form-group">
      <label>Contact (Husband) <span className="required">*</span></label>
      <EditableField name="husband_contact" {...editableProps}>
      <input
  type="text"
  name="husband_contact"
  value={formData.husband_contact || ""}
  maxLength={10}
  inputMode="numeric"
  pattern="\d{10}"
  onChange={(e) => handleContactChange(e, "husband_contact")}
  required
/></EditableField>{errors.husband_contact && (
  <div className="field-error">{errors.husband_contact}</div>
)}
    </div>
  </div>
</div>



 



{!endParticipation && (
<div className="form-section soft-blue">
  <h3>Exclusion Criteria</h3>

  <YesNoField
  label="Major structural anomalies or genetic abnormality (suspected/proven)"
  name="exclusion_anomaly"
  value={formData.exclusion_anomaly}
  onChange={handleChange}
/>

{formData.exclusion_anomaly === "Yes" && (
  <div className="followup-box">
    <div className="form-group">
    <label>If yes, specify<span className="required">*</span></label>
    <input
      name="exclusion_anomaly_details"
      value={formData.exclusion_anomaly_details}
      onChange={handleChange}
      placeholder="Enter structural anomaly details"
    />
  </div>
  </div>
)}

  <YesNoField
  label="Fetal Hydrops"
  name="fetal_hydrops"
  value={formData.fetal_hydrops}
  onChange={handleChange}
/>

{formData.fetal_hydrops === "Yes" && (
  <div className="followup-box">
    <div className="form-group">
    <label>Type</label>
    <select
      name="fetal_hydrops_type"
      value={formData.fetal_hydrops_type}
      onChange={handleChange}
    >
      <option value="">-- Select --</option>
      <option>Immune</option>
      <option>Non-immune</option>
      <option>Unclear</option>
    </select>
  </div>
  </div>
)}


  <YesNoField
  label="Decision to forego resuscitation"
  name="decision_forego_resus"
  value={formData.decision_forego_resus}
  onChange={handleChange}
/>

{formData.decision_forego_resus === "Yes" && (
  <div className="followup-box">
    <div className="form-group">
    <label>Reason<span className="required">*</span></label>
    <select
      name="decision_forego_resus_reason"
      value={formData.decision_forego_resus_reason}
      onChange={handleChange}
    >
      <option value="">-- Select --</option>
      <option>Periviable</option>
      <option>Socio-economic</option>
      <option>Major CMF</option>
      <option>Other</option>
    </select>
    {formData.decision_forego_resus_reason === "Other" && (
  <div className="form-group">
  <div className="form-group" style={{marginTop:"10px"}}>
    <label>Please specify<span className="required">*</span></label>
    <input
      name="decision_forego_resus_reason_other"
      value={formData.decision_forego_resus_reason_other || ""}
      placeholder="Enter reason"
      onChange={(e) => {
        let value = e.target.value;

        // ✅ Allow only letters + space
        value = value.replace(/[^a-zA-Z ]/g, "");

        setFormData(prev => ({
          ...prev,
          decision_forego_resus_reason_other: value
        }));
      }}
    /></div>
  </div>
)}
  </div>
  </div>
)}


  <YesNoField
  label="Insufficient time for consent"
  name="insufficient_time"
  value={formData.insufficient_time}
  onChange={handleChange}
/>{formData.insufficient_time === "Yes" && (
  <div className="followup-box">
    <div className="form-group">
    <label>If yes, specify<span className="required">*</span></label>
    <input
      name="insufficient_time_reason"
      value={formData.insufficient_time_reason}
      onChange={handleChange}
      placeholder="Reason for insufficient time"
    />
  </div>
  </div>
)}

<YesNoField
  label="Intrauterine Fetal Death (IUFD)"
  name="iufd"
  value={formData.iufd}
  onChange={handleChange}
/>


</div>
)}

  

{((!endParticipation && !anyExclusionYes) || formData.consent_given) && (
  <div className="form-section soft-blue">
    <h3>Proceed for Consent</h3>

    {/* Consent given */}
    <div className="form-group">
      <label>Consent<span className="required">*</span></label>
      <select
        name="consent_given"
        value={formData.consent_given}
        onChange={handleChange}
      >
        <option value="">--Select--</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
        <option value="Not approached">Not approached</option>
      </select>
    </div>

    {/* ===== If Consent = YES or NO ===== */}
    {(formData.consent_given === "Yes" ||
      formData.consent_given === "No") && (
      <>
        

          {/* Relationship */}
          <div className="form-group">
            <label>
              Relationship to Participant <span className="required">*</span>
            </label>

            <select
              name="relationship_to_participant"
              value={formData.relationship_to_participant || ""}
              onChange={handleChange}
            >
              <option value="">-- Select --</option>
              <option value="Mother">Pregnant Woman</option>
              <option value="Father">Husband</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {formData.relationship_to_participant === "Other" && (
            <div className="form-group">
              <label>Please specify</label>
              <input
                name="relationship_other"
                value={formData.relationship_other || ""}
                onChange={handleChange}
                placeholder="Specify relationship"
              />
            </div>
          )}

        

        {/* Consent Taken By */}
        <div className="form-group">
          <label>
            Consent Taken By <span className="required">*</span>
          </label>

          <select
            name="consent_taken_by"
            value={formData.consent_taken_by || ""}
            onChange={handleChange}
            disabled={!formData.site_name}
          >
            <option value="">
              {formData.site_name
                ? "-- Select Nurse --"
                : "Select Site first"}
            </option>

            {formData.consent_taken_by &&
              !nurses.includes(formData.consent_taken_by) && (
                <option value={formData.consent_taken_by}>
                  {formData.consent_taken_by}
                </option>
            )}

            {nurses.map((nurse) => (
              <option key={nurse} value={nurse}>
                {nurse}
              </option>
            ))}
          </select>
        </div>
      </>
    )}

    {/* ===== If Consent = NO ===== */}
    {formData.consent_given === "No" && (
      <>
        <div className="form-group">
          <label>
            Reason for consent refusal<span className="required">*</span>
          </label>
          <select
            name="reason_for_consent_refusal"
            value={formData.reason_for_consent_refusal || ""}
            onChange={handleChange}
          >
            <option value="">--Select--</option>
            <option>Fear of adverse effects</option>
            <option>Family pressure</option>
            <option>Other</option>
          </select>
        </div>

        {formData.reason_for_consent_refusal === "Other" && (
          <div className="form-group">
            <label>Please specify</label>
            <input
              name="reason_for_consent_refusal_other"
              value={formData.reason_for_consent_refusal_other || ""}
              onChange={handleChange}
              placeholder="Specify reason"
            />
          </div>
        )}
      </>
    )}

    {/* ===== If NOT APPROACHED ===== */}
    {formData.consent_given === "Not approached" && (
      <div className="followup-box">
        <div className="form-group">
          <label>
            Reason not approached<span className="required">*</span>
          </label>
          <select
            name="reason_not_approached"
            value={formData.reason_not_approached || ""}
            onChange={handleChange}
          >
            <option value="">--Select--</option>
            <option>Nurse on leave</option>
            <option>Parent not available</option>
            <option>Missed screening</option>
            <option>Other</option>
          </select>
        </div>

        {formData.reason_not_approached === "Other" && (
          <div className="form-group">
            <label>Please specify</label>
            <input
              name="reason_not_approached_other"
              value={formData.reason_not_approached_other || ""}
              onChange={handleChange}
              placeholder="Specify reason"
            />
          </div>
        )}
      </div>
    )}

  </div>
)}
</>
)}
    <div className="form-navigation">
  {step > 1 && (
  <button
    type="button"
    className="btn btn-secondary"
    onClick={handlePrevious}
  >
    <ArrowLeft size={16} style={{ marginRight: "6px" }} />
    Previous
  </button>
)}

  <button
    type="button"
    className="btn btn-save"
    onClick={saveForm}
  >
    <Save size={16} style={{ marginRight: "6px" }} />
    Save
  </button>

  <button
  type="button"
  className="btn btn-primary"
  onClick={handleNext}
  disabled={!isSaved}
>
    Next
    <ArrowRight size={16} style={{ marginLeft: "6px" }} />
  </button>
  {isSaved && (
  <button
  type="button"
  className="edit-btn"
  onClick={() => setIsEditing(prev => !prev)}
>
  {isEditing ? "✅ Done" : "✏️ Edit"}
</button>
)}
</div>

      {message && <p className="form-message">{message}</p>}
      {showEndModal && (
  <div className="modal-overlay">
    <div className="modal-box">
      <h3>Screening Ended</h3>

      <p>
        Gestational age cannot be determined.
        <br />
        Screening has been ended.
      </p>

      <button
        className="modal-btn"
        onClick={() => setShowEndModal(false)}
      >
        OK
      </button>
    </div>
  </div>
)} 
</div>
</fieldset>
    </form>
    
    {showMissingModal && (
  <div className="modal-overlay">
    <div className="modal-box">

      {/* Title */}
      <div className="modal-title">
  ⚠️ Incomplete Form
</div>

<div className="modal-subtext">
  Please complete required fields
</div>

{missingFields.map((field, index) => (
  <div key={index} className="modal-item">
    {field}
  </div>
))}

<button
  className="modal-btn"
  onClick={() => setShowMissingModal(false)}
>
  Continue Editing
</button>

    </div>
  </div>
)}
{showConsentModal && (
  <div className="consent-overlay">
    <div className="consent-modal">
      <h2>Screening Completed</h2>
      <p>{consentMessage}</p>

      <button
        className="consent-btn"
        onClick={() => setShowConsentModal(false)}
      >
        OK
      </button>
    </div>
  </div>
)}
</>
    
  );
}


export default ScreeningForm;
