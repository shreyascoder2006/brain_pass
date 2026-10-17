"""WhatsApp Integration Controller for NeuroScope 3D.

Follows the WhatsApp Chatbot Integration Playbook:
1. Unified plain-text incoming message pipeline.
2. Deterministic regex rules first; closed-domain fallback.
3. Ack-then-defer asynchronous pattern for slow PDF generation and outbound dispatch.
4. Seamless integration with Baileys Node.js bridge on http://127.0.0.1:3001.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import re
import requests
from pathlib import Path
from server.pdf_report import generate_clinical_pdf

log = logging.getLogger("neuroscope.whatsapp")

BRIDGE_URL = "http://127.0.0.1:3001"

# Curated Medical Knowledge Dictionary (Deterministic, zero-hallucination)
MEDICAL_GLOSSARY = {
    "edema": (
        "*Peritumoral Edema (ED)*: Fluid accumulation and swelling in brain tissue surrounding a tumor. "
        "In MRI, it appears bright on T2 and FLAIR sequences. It is caused by leaky blood vessels resulting from tumor growth."
    ),
    "wt": (
        "*Whole Tumor (WT)*: The complete abnormal region identified by NeuroScope, consisting of the Enhancing Tumor (ET), "
        "Necrotic Tumor Core (NET), and Peritumoral Edema (ED)."
    ),
    "whole tumor": (
        "*Whole Tumor (WT)*: The complete abnormal region identified by NeuroScope, consisting of the Enhancing Tumor (ET), "
        "Necrotic Tumor Core (NET), and Peritumoral Edema (ED)."
    ),
    "tc": (
        "*Tumor Core (TC)*: The gross solid tumor mass (Enhancing Tumor + Necrotic Core), excluding the surrounding edema. "
        "This is typically the primary target for surgical resection."
    ),
    "tumor core": (
        "*Tumor Core (TC)*: The gross solid tumor mass (Enhancing Tumor + Necrotic Core), excluding the surrounding edema. "
        "This is typically the primary target for surgical resection."
    ),
    "et": (
        "*Enhancing Tumor (ET)*: Highly active tumor tissue that absorbs Gadolinium contrast agent, showing as bright hyperintense regions on T1Gd scans. "
        "It indicates active cellular proliferation and blood-brain barrier breakdown."
    ),
    "enhancing": (
        "*Enhancing Tumor (ET)*: Highly active tumor tissue that absorbs Gadolinium contrast agent, showing as bright hyperintense regions on T1Gd scans. "
        "It indicates active cellular proliferation and blood-brain barrier breakdown."
    ),
    "dice": (
        "*Dice Similarity Coefficient*: A standard mathematical accuracy metric ranging from 0.0 to 1.0 (1.0 = 100% perfect match). "
        "It measures the 3D overlap between AI segmentation and expert human neuroradiologist tracings."
    ),
    "hd95": (
        "*95th-Percentile Hausdorff Distance (HD95)*: Measures the maximum distance (in millimeters) between the predicted tumor boundary "
        "and the true anatomical boundary, filtering out statistical outliers."
    ),
    "gbm": (
        "*Glioblastoma Multiforme (GBM)*: A fast-growing high-grade (WHO Grade IV) central nervous system tumor. "
        "Requires comprehensive multidisciplinary management including surgery, radiation, and chemotherapy."
    ),
    "glioblastoma": (
        "*Glioblastoma Multiforme (GBM)*: A fast-growing high-grade (WHO Grade IV) central nervous system tumor. "
        "Requires comprehensive multidisciplinary management including surgery, radiation, and chemotherapy."
    ),
    "astrocytoma": (
        "*Astrocytoma*: A primary brain tumor originating from astrocyte glial cells. "
        "Ranges from low-grade (diffuse) to high-grade lesions."
    ),
}

def get_bridge_status() -> dict:
    """Check connectivity with the Baileys WhatsApp bridge."""
    try:
        r = requests.get(f"{BRIDGE_URL}/status", timeout=2.0)
        if r.ok:
            return r.json()
    except Exception as exc:
        log.debug("Bridge status check failed: %s", exc)
    return {"connected": False, "error": "Bridge offline or unreachable"}

def request_pairing_code(phone: str) -> dict:
    """Request an 8-character pairing code from the Baileys bridge."""
    try:
        r = requests.post(f"{BRIDGE_URL}/request-pairing-code", json={"phone": phone}, timeout=15.0)
        return r.json()
    except Exception as exc:
        log.error("Failed to request pairing code for %s: %s", phone, exc)
        return {"ok": False, "error": str(exc)}

def reset_bridge_session() -> dict:
    """Reset WhatsApp bridge session and clear stored credentials."""
    try:
        r = requests.post(f"{BRIDGE_URL}/reset-session", timeout=10.0)
        return r.json()
    except Exception as exc:
        log.error("Failed to reset bridge session: %s", exc)
        return {"ok": False, "error": str(exc)}

def send_whatsapp_text(phone: str, text: str) -> dict:
    """Send text message via Baileys bridge."""
    try:
        r = requests.post(f"{BRIDGE_URL}/send-text", json={"phone": phone, "text": text}, timeout=10.0)
        return r.json()
    except Exception as exc:
        log.error("Failed to send WhatsApp text to %s: %s", phone, exc)
        return {"ok": False, "error": str(exc)}

def send_whatsapp_pdf(phone: str, pdf_bytes: bytes, filename: str, caption: str) -> dict:
    """Send binary PDF document via Baileys bridge."""
    try:
        b64 = base64.b64encode(pdf_bytes).decode("ascii")
        payload = {
            "phone": phone,
            "filename": filename,
            "caption": caption,
            "pdfBase64": b64,
        }
        r = requests.post(f"{BRIDGE_URL}/send-document", json=payload, timeout=25.0)
        return r.json()
    except Exception as exc:
        log.error("Failed to send WhatsApp PDF to %s: %s", phone, exc)
        return {"ok": False, "error": str(exc)}

async def dispatch_report_deferred(phone: str, case_id: str, custom_caption: str | None = None):
    """Ack-then-defer background worker: compiles PDF and pushes to WhatsApp."""
    log.info("Starting deferred PDF compilation for %s (Case: %s)", phone, case_id)
    try:
        pdf_bytes = generate_clinical_pdf(case_id, phone=phone)
        caption = custom_caption or (
            f"📄 *NeuroScope 3D Clinical Diagnostic Report*\n"
            f"• Case ID: {case_id.upper()}\n"
            f"• Confidential diagnostic summary with 3D quantitative volumetrics."
        )
        filename = f"NeuroScope_{case_id.upper()}_Report.pdf"
        res = send_whatsapp_pdf(phone, pdf_bytes, filename=filename, caption=caption)
        log.info("Deferred PDF dispatch result for %s: %s", phone, res)
    except Exception as exc:
        log.error("Error in deferred PDF dispatch for %s: %s", phone, exc)
        send_whatsapp_text(phone, f"⚠️ Unable to compile medical report for {case_id}. Please contact the clinic office.")

def extract_case_id(text: str) -> str:
    """Match case number or ID like 'case 1', 'case 01', 'case-03', 'case_02'."""
    m = re.search(r"case[-_\s]?0?([1-9]|10)\b", text, re.IGNORECASE)
    if m:
        num = int(m.group(1))
        case_map = {
            1: "case_01_right_frontal_gbm",
            2: "case_02_left_temporal_astrocytoma",
            3: "case_03_bilateral_multifocal_mets",
            4: "case_04_left_parietal_meningioma",
            5: "case_05_deep_thalamic_glioma",
            6: "case_06_posterior_fossa_cerebellar",
            7: "case_07_butterfly_corpus_callosum",
            8: "case_08_recurrent_surgical_cavity",
            9: "case_09_small_acoustic_schwannoma",
            10: "case_10_large_diffuse_infiltrative",
        }
        return case_map.get(num, "case_01_right_frontal_gbm")
    return "case_01_right_frontal_gbm"

async def handle_incoming_message(sender_phone: str, text: str) -> dict:
    """Unified inbound message handler following the playbook rules."""
    cleaned = text.strip().lower()
    log.info("Inbound WhatsApp message from %s: %s", sender_phone, cleaned)

    # RULE 1: Report / Results Request
    if re.search(r"\b(report|scan|result|pdf|document|mri|test)\b", cleaned):
        case_id = extract_case_id(cleaned)
        # 1. Immediate ACK
        ack_reply = (
            f"🩺 *NeuroScope Clinic*: Request received.\n"
            f"Preparing your diagnostic report for *{case_id.upper()}*... "
            f"The verified PDF will arrive in this chat in a few moments."
        )
        # 2. Defer heavy PDF generation to background task
        asyncio.create_task(dispatch_report_deferred(sender_phone, case_id))
        return {"replyText": ack_reply, "action": "send_report_deferred", "case_id": case_id}

    # RULE 2: Medical Glossary Lookup
    for term, definition in MEDICAL_GLOSSARY.items():
        if re.search(rf"\b{re.escape(term)}\b", cleaned):
            reply = f"🧠 *NeuroScope Medical Knowledge Base*:\n\n{definition}\n\n_Note: Consult your physician for personalized medical advice._"
            return {"replyText": reply, "action": "glossary_match", "term": term}

    # RULE 3: Contact / Doctor / Appointment
    if re.search(r"\b(doctor|clinic|call|appointment|contact|emergency|help|address)\b", cleaned):
        reply = (
            "🏥 *NeuroScope Neuro-Oncology Clinic*\n"
            "• *Attending Neurosurgeon*: Dr. Aarav Sharma, MD\n"
            "• *Phone*: +91-98765-43210\n"
            "• *Hours*: Mon–Fri 08:00–18:00 IST\n"
            "• *Emergency*: For acute neurological symptoms, call 102/112 or visit nearest emergency room."
        )
        return {"replyText": reply, "action": "clinic_info"}

    # RULE 4: Guarded Default Assistant Reply
    reply = (
        "👋 *Hello from NeuroScope 3D Clinic!*\n\n"
        "How can we assist you today?\n"
        "• Reply *'Report'* (e.g., *'Report Case 1'*) to receive your MRI PDF report.\n"
        "• Ask medical questions like *'What is edema?'* or *'What is WT?'*.\n"
        "• Reply *'Contact'* to reach the clinic staff."
    )
    return {"replyText": reply, "action": "default_guidance"}
