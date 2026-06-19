from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import random, string
from models import RespiratoryLog
from auth import hash_password, verify_password
from core.security import create_access_token
from db import Base, engine
from db import get_db
from models import SteroidData
import models
from models import (
    Screening, BirthResuscitation, MaternalDetails, PostnatalDay1,
    NICUAdmission, NeonatalMorbidities, StudyOutcomes,
    CranialUltrasound, ROPScreening, CompositeOutcome,
    FiO2AUC, RespCVNeuroLog, InfectGIHemaLog,
    MetabRenalVascEyeLog, SAEReport, AdverseEvents,
    SAEList, User
)
from schemas import (
    ScreeningCreate, ScreeningOut, BirthResuscitationCreate, BirthResuscitationOut,
    MaternalDetailsCreate, MaternalDetailsOut, PostnatalDay1Create, PostnatalDay1Out,
    NICUAdmissionCreate, NICUAdmissionOut, NeonatalMorbiditiesCreate, NeonatalMorbiditiesOut,
    StudyOutcomesCreate, StudyOutcomesOut, CranialUltrasoundCreate, CranialUltrasoundOut,
    ROPScreeningCreate, ROPScreeningOut, CompositeOutcomeCreate, CompositeOutcomeOut,
    FiO2AUCLogCreate, FiO2AUCLogOut, RespCVNeuroLogCreate, RespCVNeuroLogOut,
    InfectGIHemaLogCreate, InfectGIHemaLogOut, MetabRenalVascEyeLogCreate, MetabRenalVascEyeLogOut,
    SAEReportCreate, SAEReportOut, AdverseEventsCreate, AdverseEventsOut,
    SAEListCreate, SAEListOut, UserCreate, UserOut, LoginRequest, LoginResponse
)
from pydantic import BaseModel
from typing import Optional, List
from deps import get_current_user
from routers import enrollment

from sqlalchemy import text
from db import SessionLocal

with engine.connect() as conn:
    db_name = conn.execute(text("SELECT current_database()")).scalar()
    print("👉 CONNECTED DB:", db_name)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PORTAL Trial API")
app.include_router(enrollment.router)

# A4 fix: use the specific origins list instead of ["*"]
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://portal-trial.netlify.app",
    "https://portaltrial.in",
]

SITE_NURSES = {
    "PGIMER": [
        "Geetika",
        "Navkiran Kaur",
        "Priyanka Thakur",
        "Seemran Kaur",
        "Tanvi Saini",
        "Yashvi Jolly",
        "Dr. Mannat Guliani",
        "Dr. Shalini Dhiman"
    ],
    "GMCH": [
        "Anosh",
        "Arushu",
        "Arzoo",
        "Muskan",
        "Vanika",
        "Dr. Manpreet Kaur"
    ],
    "IOG": [
        "Yashvi Jolly"
    ],
    "AFMC": [
        "Mannat Guliani",
        "Shalini Dhiman"
    ],
    "GMCH-A": [
        "Nurse A",
        "Nurse B"
    ],
    "AMC": [
        "Nurse A",
        "Nurse B"
    ]
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Auth / site-isolation helpers  (A1, A2, A5)
# ----------------------------

def _require_superadmin(current_user: User):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")


def _check_enrollment_access(db: Session, enrollment_id: str, current_user: User) -> Screening:
    """Look up the screening for this enrollment and enforce site isolation."""
    screening = db.query(Screening).filter(Screening.enrollment_id == enrollment_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if current_user.role != "superadmin" and current_user.site_name != screening.site_name:
        raise HTTPException(status_code=403, detail="Access denied: enrollment belongs to another site")
    return screening


def _check_screening_site(screening: Screening, current_user: User):
    if current_user.role != "superadmin" and current_user.site_name != screening.site_name:
        raise HTTPException(status_code=403, detail="Access denied: screening belongs to another site")


# ----------------------------
# Helper: Auto-generate IDs
# ----------------------------
def generate_screening_id(site_id: str):
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{site_id}-{timestamp}-{random_suffix}"


# ----------------------------
# Firebase import (superadmin only)
# ----------------------------
@app.post("/import-from-firebase/")
def import_from_firebase(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)
    screening_id = data.get("screening_id")
    existing = db.query(Screening).filter(Screening.screening_id == screening_id).first()
    if existing:
        return {"message": "Already exists"}
    new_entry = Screening(
        screening_id=screening_id,
        site_name=data.get("site_name"),
        site_id=data.get("site_id"),
        screened_by=data.get("screened_by"),
        mother_first_name=data.get("mother_first_name"),
        mother_surname=data.get("mother_surname"),
        husband_first_name=data.get("husband_first_name"),
        husband_surname=data.get("husband_surname"),
        maternal_uid=data.get("maternal_uid"),
        hospital_admission_number=data.get("hospital_admission_number"),
        gestation_weeks=data.get("gestation_weeks"),
        gestation_days=data.get("gestation_days"),
        expected_delivery_date=data.get("expected_delivery_date"),
        exclusion_present=data.get("exclusion_present"),
        exclusion_reasons=data.get("exclusion_reasons"),
        consent_given=data.get("consent_given"),
        consent_taken_by=data.get("consent_taken_by"),
        relationship_to_participant=data.get("relationship_to_participant"),
        relationship_other=data.get("relationship_other"),
        reason_not_approached=data.get("reason_not_approached"),
        screening_datetime=datetime.now(),
        created_at=datetime.now(),
        screening_status="Pending"
    )
    db.add(new_entry)
    db.commit()
    return {"message": "Imported successfully"}


# ----------------------------
# ROOT — public health check
# ----------------------------
@app.get("/")
def root():
    return {"message": "PORTAL Trial API is running!"}


# Screener list — no patient data, safe to leave public
@app.get("/sites/{site_name}/screeners")
def get_site_screeners(site_name: str):
    nurses = SITE_NURSES.get(site_name)
    if not nurses:
        return []
    return nurses


# ----------------------------
# FORM A — SCREENINGS
# ----------------------------

@app.get("/screenings/", response_model=list[ScreeningOut])
def get_screenings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Screening).order_by(Screening.created_at.desc())
    if current_user.role != "superadmin":
        query = query.filter(Screening.site_name == current_user.site_name)
    return query.all()


def compute_screening_status(data):
    if data.gestation_weeks is None:
        return "Screen Failure"
    if data.gestation_weeks >= 32:
        return "Screen Failure"
    if data.exclusion_present:
        return "Screen Failure"
    if data.consent_given == "Yes":
        return "Eligible"
    return "Not Eligible"


@app.post("/screenings/", response_model=ScreeningOut)
def create_screening(
    screening: ScreeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "superadmin" and current_user.site_name != screening.site_name:
        raise HTTPException(status_code=403, detail="Cannot create screening for another site")
    try:
        screening_id = screening.screening_id or generate_screening_id(screening.site_id)
        status = compute_screening_status(screening)
        db_screening = Screening(
            screening_id=screening_id,
            enrollment_id=screening.enrollment_id,
            screening_datetime=screening.screening_datetime,
            created_at=datetime.now(),
            screening_status=status,
            site_name=screening.site_name,
            site_id=screening.site_id,
            screened_by=screening.screened_by,
            mother_first_name=screening.mother_first_name,
            mother_surname=screening.mother_surname,
            husband_first_name=screening.husband_first_name,
            husband_surname=screening.husband_surname,
            maternal_uid=screening.maternal_uid,
            hospital_admission_number=screening.hospital_admission_number,
            mother_contact=screening.mother_contact,
            husband_contact=screening.husband_contact,
            gestation_weeks=screening.gestation_weeks,
            gestation_days=screening.gestation_days,
            gestation_method=screening.gestation_method,
            expected_delivery_date=screening.expected_delivery_date,
            exclusion_present=screening.exclusion_present,
            exclusion_reasons=screening.exclusion_reasons,
            consent_given=screening.consent_given,
            consent_taken_by=screening.consent_taken_by,
            relationship_to_participant=screening.relationship_to_participant,
            relationship_other=screening.relationship_other,
            reason_not_approached=screening.reason_not_approached,
        )
        db.add(db_screening)
        db.commit()
        db.refresh(db_screening)
        return db_screening
    except HTTPException:
        raise
    except Exception as e:
        print("🔥 SCREENING ERROR:", e)
        raise HTTPException(status_code=400, detail=f"Unexpected error: {str(e)}")


@app.get("/screenings/{screening_id}", response_model=ScreeningOut)
def get_screening(
    screening_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(Screening).filter(Screening.screening_id == screening_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Screening not found")
    _check_screening_site(entry, current_user)
    return entry


@app.put("/screenings/{screening_id}", response_model=ScreeningOut)
def update_screening(
    screening_id: str,
    updated_data: ScreeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(Screening).filter(Screening.screening_id == screening_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Screening not found")
    _check_screening_site(entry, current_user)
    try:
        update_data = updated_data.model_dump(exclude_unset=True)
        update_data.pop("screening_id", None)
        for key, value in update_data.items():
            setattr(entry, key, value)
        db.commit()
        db.refresh(entry)
        if not entry.screening_id:
            raise HTTPException(status_code=400, detail="Screening ID lost during update")
        return entry
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating entry: {str(e)}")


@app.delete("/screenings/{id}")
def delete_screening(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)
    entry = db.query(Screening).filter(Screening.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Screening entry not found")
    try:
        db.delete(entry)
        db.commit()
        return {"message": f"Entry with ID {id} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting entry: {str(e)}")


# ----------------------------
# USERS  (A2 fix: superadmin only)
# ----------------------------

@app.post("/users/", response_model=UserOut)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_superadmin(current_user)
    hashed_pwd = hash_password(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_pwd,
        role=user.role,
        site_name=user.site_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ----------------------------
# AUTH — public login endpoint
# ----------------------------

@app.post("/auth/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({
        "sub": user.username,
        "role": user.role,
        "site_name": user.site_name,
    })
    return {
        "access_token": token,
        "role": user.role,
        "site_name": user.site_name,
    }


# ----------------------------
# FORM B — BIRTH RESUSCITATION
# ----------------------------

@app.post("/birth-resuscitation/")
def create_birth_resuscitation(
    data: BirthResuscitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    print("📦 Received Birth Resuscitation data:", data.model_dump())
    entry = BirthResuscitation(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@app.get("/birth-resuscitation/{enrollment_id}", response_model=BirthResuscitationOut)
def get_birth_resuscitation(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    entry = db.query(BirthResuscitation).filter(BirthResuscitation.enrollment_id == enrollment_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Birth Resuscitation not found")
    return entry


@app.put("/birth-resuscitation/{enrollment_id}", response_model=BirthResuscitationOut)
def update_birth_resuscitation(
    enrollment_id: str,
    updated_data: BirthResuscitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    entry = db.query(BirthResuscitation).filter(BirthResuscitation.enrollment_id == enrollment_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        update_data = updated_data.model_dump(exclude_unset=True)
        update_data.pop("enrollment_id", None)
        for key, value in update_data.items():
            setattr(entry, key, value)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ----------------------------
# FORM C — MATERNAL DETAILS
# ----------------------------

@app.post("/maternal-details/", response_model=MaternalDetailsOut)
def create_maternal_details(
    data: MaternalDetailsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = MaternalDetails(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/maternal-details/{enrollment_id}")
def get_maternal_details(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    return db.query(MaternalDetails).filter(MaternalDetails.enrollment_id == enrollment_id).first()


# ----------------------------
# FORM D — POSTNATAL DAY 1
# ----------------------------

@app.post("/postnatal-day1/", response_model=PostnatalDay1Out)
def create_postnatal_day1(
    data: PostnatalDay1Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = PostnatalDay1(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/postnatal-day1/{enrollment_id}")
def get_postnatal_day1(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    record = db.query(PostnatalDay1).filter(PostnatalDay1.enrollment_id == enrollment_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Form D not found")
    return record


# ----------------------------
# FORM E — NICU ADMISSION
# ----------------------------

@app.post("/nicu-admission/", response_model=NICUAdmissionOut)
def create_nicu_admission(
    data: NICUAdmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = NICUAdmission(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/nicu-admission/{enrollment_id}", response_model=list[NICUAdmissionOut])
def get_nicu_admission(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    return db.query(NICUAdmission).filter(NICUAdmission.enrollment_id == enrollment_id).all()


# ----------------------------
# FORM F — NEONATAL MORBIDITIES
# ----------------------------

@app.post("/neonatal-morbidities/", response_model=NeonatalMorbiditiesOut)
def create_neonatal_morbidities(
    data: NeonatalMorbiditiesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = NeonatalMorbidities(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/neonatal-morbidities/{enrollment_id}", response_model=list[NeonatalMorbiditiesOut])
def get_neonatal_morbidities(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    return db.query(NeonatalMorbidities).filter(NeonatalMorbidities.enrollment_id == enrollment_id).all()


# ----------------------------
# FORM G — STUDY OUTCOMES
# ----------------------------

@app.post("/study-outcomes/", response_model=StudyOutcomesOut)
def create_study_outcomes(
    data: StudyOutcomesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = StudyOutcomes(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ----------------------------
# CRANIAL ULTRASOUND
# ----------------------------

@app.post("/cranial-ultrasound/", response_model=CranialUltrasoundOut)
def create_cranial_ultrasound(
    data: CranialUltrasoundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = CranialUltrasound(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ----------------------------
# ROP SCREENING
# ----------------------------

@app.post("/rop-screening/", response_model=ROPScreeningOut)
def create_rop_screening(
    data: ROPScreeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = ROPScreening(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ----------------------------
# FORM J — COMPOSITE OUTCOME
# ----------------------------

@app.post("/composite-outcome/", response_model=CompositeOutcomeOut)
def create_composite_outcome(
    data: CompositeOutcomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    allowed_fields = CompositeOutcome.__table__.columns.keys()
    filtered_data = {k: v for k, v in data.model_dump().items() if k in allowed_fields}
    record = CompositeOutcome(**filtered_data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/composite-outcome/{enrollment_id}", response_model=list[CompositeOutcomeOut])
def get_composite_outcome(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    return (
        db.query(CompositeOutcome)
        .filter(CompositeOutcome.enrollment_id == enrollment_id)
        .order_by(CompositeOutcome.created_at.desc())
        .all()
    )


# ----------------------------
# FiO2 AUC
# ----------------------------

@app.post("/fio2-auc/", response_model=FiO2AUCLogOut)
def create_fio2_auc(
    data: FiO2AUCLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = FiO2AUC(
        enrollment_id=data.enrollment_id,
        total_auc=data.total_auc,
        mean_daily_fio2=data.mean_daily_fio2,
        excess_o2_auc=data.excess_o2_auc,
        fio2_logs=data.fio2_logs
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/fio2-auc/{enrollment_id}", response_model=list[FiO2AUCLogOut])
def get_fio2_auc(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    return (
        db.query(FiO2AUC)
        .filter(FiO2AUC.enrollment_id == enrollment_id)
        .order_by(FiO2AUC.created_at.desc())
        .all()
    )


# ----------------------------
# RESP / CV / NEURO LOG
# ----------------------------

@app.post("/resp-cv-neuro-log/", response_model=RespCVNeuroLogOut)
def create_resp_cv_neuro_log(
    data: RespCVNeuroLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = RespCVNeuroLog(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/resp-cv-neuro-log/{enrollment_id}", response_model=list[RespCVNeuroLogOut])
def get_resp_cv_neuro_log(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    return (
        db.query(RespCVNeuroLog)
        .filter(RespCVNeuroLog.enrollment_id == enrollment_id)
        .order_by(RespCVNeuroLog.created_at.desc())
        .all()
    )


# ----------------------------
# INFECT / GI / HEMA LOG
# ----------------------------

@app.post("/infect-gi-hema-log/", response_model=InfectGIHemaLogOut)
def create_infect_gi_hema_log(
    data: InfectGIHemaLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = InfectGIHemaLog(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ----------------------------
# METAB / RENAL / VASC / EYE LOG
# ----------------------------

@app.post("/metab-renal-vasc-eye-log/", response_model=MetabRenalVascEyeLogOut)
def create_metab_renal_vasc_eye_log(
    data: MetabRenalVascEyeLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = MetabRenalVascEyeLog(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ----------------------------
# SAE REPORT
# ----------------------------

@app.post("/sae-report/", response_model=SAEReportOut)
def create_sae_report(
    data: SAEReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = SAEReport(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ----------------------------
# ADVERSE EVENTS
# ----------------------------

@app.post("/adverse-events/", response_model=AdverseEventsOut)
def create_adverse_events(
    data: AdverseEventsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = AdverseEvents(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ----------------------------
# SAE LIST
# ----------------------------

@app.post("/sae-list/", response_model=SAEListOut)
def create_sae_list(
    data: SAEListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data.enrollment_id, current_user)
    record = SAEList(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ----------------------------
# ENROLLMENT STATUS
# ----------------------------

@app.get("/enrollment-status/{enrollment_id}")
def get_enrollment_status(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    screening = _check_enrollment_access(db, enrollment_id, current_user)
    form_b = db.query(BirthResuscitation).filter(BirthResuscitation.enrollment_id == enrollment_id).first() is not None
    form_c = db.query(MaternalDetails).filter(MaternalDetails.enrollment_id == enrollment_id).first() is not None
    form_d = db.query(PostnatalDay1).filter(PostnatalDay1.enrollment_id == enrollment_id).first() is not None

    if not form_b:
        next_form = "form-b"
    elif not form_c:
        next_form = "form-c"
    elif not form_d:
        next_form = "form-d"
    else:
        next_form = "completed"

    return {
        "enrollment_id": enrollment_id,
        "screening_status": screening.screening_status,
        "form_a": True,
        "form_b": form_b,
        "form_c": form_c,
        "form_d": form_d,
        "next_form": next_form,
    }


# ----------------------------
# SCREENING LOOKUPS (alternate routes)
# ----------------------------

@app.get("/screenings/by-screening-id/{screening_id}", response_model=ScreeningOut)
def get_screening_by_screening_id(
    screening_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(Screening).filter(Screening.screening_id == screening_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Screening not found")
    _check_screening_site(entry, current_user)
    return entry


@app.get("/screenings/by-enrollment/{enrollment_id}", response_model=ScreeningOut)
def get_screening_by_enrollment(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(Screening).filter(Screening.enrollment_id == enrollment_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Screening not found")
    _check_screening_site(entry, current_user)
    return entry


# ----------------------------
# RESPIRATORY LOG
# ----------------------------

@app.post("/respiratory-log")
def save_log(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, data["enrollment_id"], current_user)
    log = RespiratoryLog(
        enrollment_id=data["enrollment_id"],
        date=data["date"],
        support_mode=data["support_mode"].upper().replace(" ", "_")
    )
    db.add(log)
    db.commit()
    return {"message": "Saved"}


@app.get("/respiratory-summary/{enrollment_id}")
def get_summary(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    logs = db.query(RespiratoryLog).filter(RespiratoryLog.enrollment_id == enrollment_id).all()

    cpap_days = sum(1 for l in logs if l.support_mode == "CPAP")
    nippv_days = sum(1 for l in logs if l.support_mode == "NIPPV")
    hfnc_days = sum(1 for l in logs if l.support_mode == "HFNC")
    imv_days = sum(1 for l in logs if l.support_mode in ["IMV", "SIMV", "HFOV"])
    nasal_days = sum(1 for l in logs if l.support_mode in ["NASAL_CANNULA", "NC"])
    extubation_failure_episodes = sum(1 for l in logs if l.support_mode == "EXTUBATION_FAILURE")
    extubation_failure = "Yes" if extubation_failure_episodes > 0 else "No"

    steroid = db.query(SteroidData).filter(SteroidData.enrollment_id == enrollment_id).first()
    steroid_age_days = steroid.steroid_age_days if steroid else None
    pulmonary_hemorrhage = steroid.pulmonary_hemorrhage if steroid else None
    pulmonary_hypertension = steroid.pulmonary_hypertension if steroid else None
    pneumothorax = steroid.pneumothorax if steroid else None
    chest_drain = steroid.chest_drain if steroid else None

    return {
        "cpap": "Yes" if cpap_days else "No",
        "cpap_days": cpap_days,
        "nippv": "Yes" if nippv_days else "No",
        "nippv_days": nippv_days,
        "imv": "Yes" if imv_days else "No",
        "imv_days": imv_days,
        "hfnc": "Yes" if hfnc_days else "No",
        "hfnc_days": hfnc_days,
        "nasal_cannula": "Yes" if nasal_days else "No",
        "nasal_cannula_days": nasal_days,
        "steroid_age_days": steroid_age_days,
        "pulmonary_hemorrhage": pulmonary_hemorrhage,
        "pulmonary_hypertension": pulmonary_hypertension,
        "pneumothorax": pneumothorax,
        "chest_drain": chest_drain,
        "extubation_failure": extubation_failure,
        "extubation_failure_episodes": extubation_failure_episodes,
    }


@app.post("/respiratory-log-bulk")
def save_logs(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollment_id = data["enrollment_id"]
    _check_enrollment_access(db, enrollment_id, current_user)
    logs = data["logs"]
    db.query(RespiratoryLog).filter(RespiratoryLog.enrollment_id == enrollment_id).delete()
    for log in logs:
        new_log = RespiratoryLog(
            enrollment_id=enrollment_id,
            date=log["date"],
            support_mode=log["support_mode"].upper().replace(" ", "_")
        )
        db.add(new_log)
    db.commit()
    return {"message": "Replaced successfully"}


@app.get("/respiratory-log/{enrollment_id}")
def get_logs(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_enrollment_access(db, enrollment_id, current_user)
    return db.query(RespiratoryLog).filter(RespiratoryLog.enrollment_id == enrollment_id).all()


# ----------------------------
# STEROID DATA
# ----------------------------

@app.post("/steroid-data")
def save_steroid(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollment_id = data["enrollment_id"]
    _check_enrollment_access(db, enrollment_id, current_user)
    existing = db.query(SteroidData).filter(SteroidData.enrollment_id == enrollment_id).first()
    if existing:
        existing.steroid_age_days = data.get("steroid_age_days")
        existing.pulmonary_hemorrhage = data.get("pulmonary_hemorrhage")
        existing.pulmonary_hypertension = data.get("pulmonary_hypertension")
        existing.pneumothorax = data.get("pneumothorax")
        existing.chest_drain = data.get("chest_drain")
    else:
        new = SteroidData(
            enrollment_id=enrollment_id,
            steroid_age_days=data.get("steroid_age_days"),
            pulmonary_hemorrhage=data.get("pulmonary_hemorrhage"),
            pulmonary_hypertension=data.get("pulmonary_hypertension"),
            pneumothorax=data.get("pneumothorax"),
            chest_drain=data.get("chest_drain")
        )
        db.add(new)
    db.commit()
    return {"message": "Steroid saved"}
