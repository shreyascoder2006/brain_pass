"""Clinical PDF Generator for NeuroScope 3D studies using ReportLab."""

from __future__ import annotations

import io
import json
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

ROOT = Path(__file__).resolve().parents[2]

def generate_clinical_pdf(case_id: str = "case_01_right_frontal_gbm", phone: str = "") -> bytes:
    """Generate a pixel-perfect multi-page clinical PDF report for a given case."""
    study_dir = ROOT / "sample_studies" / case_id
    meta_path = study_dir / "metadata.json"
    
    # Default metadata if not found
    meta = {
        "id": case_id,
        "name": "Right Frontal Glioblastoma (High-Grade)",
        "clinical_presentation": "Aggressive high-grade lesion with thick irregular enhancing rim and central necrotic core.",
        "tumor_location": "Right Frontal Lobe (+x, +y)",
        "metrics": {
            "whole_tumor_ml": 50.5,
            "tumor_core_ml": 20.4,
            "enhancing_tumor_ml": 13.2,
            "edema_ml": 30.1,
        }
    }
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0a192f"),
        alignment=TA_LEFT,
    )
    subtitle_style = ParagraphStyle(
        "DocSub",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#0284c7"),
        alignment=TA_LEFT,
    )
    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
    )
    meta_bold = ParagraphStyle(
        "MetaBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )
    h2_style = ParagraphStyle(
        "Heading2Custom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )
    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER,
    )

    story = []

    # 1. Header with branding & date
    header_data = [
        [
            Paragraph("NEUROSCOPE 3D CLINICAL WORKSTATION", subtitle_style),
            Paragraph("CONFIDENTIAL MEDICAL REPORT", ParagraphStyle("Conf", parent=meta_bold, alignment=TA_RIGHT, textColor=colors.HexColor("#dc2626"))),
        ],
        [
            Paragraph("Neuro-Oncology & 3D Digital Twin Report", title_style),
            Paragraph("Protocol: BraTS mpMRI (4-Seq)", ParagraphStyle("Prot", parent=meta_style, alignment=TA_RIGHT)),
        ]
    ]
    t_header = Table(header_data, colWidths=[360, 180])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

    # 2. Patient & Clinical Context Table
    patient_info = [
        [
            Paragraph("Case Identifier:", meta_bold),
            Paragraph(f"<b>{meta.get('id', case_id).upper()}</b>", meta_style),
            Paragraph("Recipient Phone:", meta_bold),
            Paragraph(phone or "+91 (Clinic Registered)", meta_style),
        ],
        [
            Paragraph("Clinical Presentation:", meta_bold),
            Paragraph(meta.get("name", "Brain Neoplasm"), meta_style),
            Paragraph("Analysis Engine:", meta_bold),
            Paragraph("MONAI SegResNet (v0.5.4)", meta_style),
        ],
        [
            Paragraph("Lesion Location:", meta_bold),
            Paragraph(meta.get("tumor_location", "Cerebral Cortex"), meta_style),
            Paragraph("Inference Mode:", meta_bold),
            Paragraph("2-Pass Flip-TTA (Isotropic)", meta_style),
        ],
    ]
    t_patient = Table(patient_info, colWidths=[120, 160, 110, 150])
    t_patient.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_patient)
    story.append(Spacer(1, 12))

    # 3. Volumetric Quantification Table
    story.append(Paragraph("1. Volumetric Quantification & Compartment Analysis", h2_style))
    m = meta.get("metrics", {})
    wt = m.get("whole_tumor_ml", 0.0)
    tc = m.get("tumor_core_ml", 0.0)
    et = m.get("enhancing_tumor_ml", 0.0)
    ed = m.get("edema_ml", max(0.0, wt - tc))

    metrics_table_data = [
        [
            Paragraph("Compartment", meta_bold),
            Paragraph("BraTS Label", meta_bold),
            Paragraph("Volume (mL)", meta_bold),
            Paragraph("Clinical Significance", meta_bold),
        ],
        [
            Paragraph("<b>Whole Tumor (WT)</b>", body_style),
            Paragraph("ED + TC (Labels 1+2+4)", meta_style),
            Paragraph(f"<b>{wt:.2f} mL</b>", body_style),
            Paragraph("Total disease envelope including peritumoral infiltrative edema.", meta_style),
        ],
        [
            Paragraph("<b>Tumor Core (TC)</b>", body_style),
            Paragraph("ET + NET (Labels 1+4)", meta_style),
            Paragraph(f"<b>{tc:.2f} mL</b>", body_style),
            Paragraph("Gross neoplastic core excluding surrounding edema.", meta_style),
        ],
        [
            Paragraph("<b>Enhancing Tumor (ET)</b>", body_style),
            Paragraph("Active Neoplasm (Label 4)", meta_style),
            Paragraph(f"<b>{et:.2f} mL</b>", body_style),
            Paragraph("Viable, hyper-vascularized tissue taking up gadolinium contrast.", meta_style),
        ],
        [
            Paragraph("<b>Peritumoral Edema (ED)</b>", body_style),
            Paragraph("Vasogenic Swelling (Label 2)", meta_style),
            Paragraph(f"<b>{ed:.2f} mL</b>", body_style),
            Paragraph("Fluid accumulation in white matter tracts surrounding lesion.", meta_style),
        ],
    ]
    t_metrics = Table(metrics_table_data, colWidths=[130, 110, 80, 220])
    t_metrics.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_metrics)
    story.append(Spacer(1, 12))

    # 4. Multi-Sequence MRI Visual Cross-Sections
    story.append(Paragraph("2. Multi-Planar Orthogonal & Overlay Views", h2_style))
    quad_path = study_dir / "2d_slices" / "diagnostic_quad_sheet.png"
    if not quad_path.exists():
        quad_path = ROOT / "public" / "samples" / "test_studies" / case_id / "diagnostic_quad_sheet.png"

    if quad_path.exists():
        img = RLImage(str(quad_path), width=530, height=220)
        story.append(img)
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            "<i>Figure 1: Co-registered 4-panel diagnostic view (T1 Native, T1Gd Post-Contrast, T2-Weighted, and Multi-Compartment Color Overlay: Green=Edema, Amber=Necrotic Core, Red=Active Tumor).</i>",
            meta_style
        ))
    else:
        story.append(Paragraph("<i>[Visual MRI cross-sections available in NeuroScope 3D 3D Studio]</i>", meta_style))

    story.append(Spacer(1, 10))

    # 5. Clinical Impression & Actionable Recommendations
    story.append(Paragraph("3. Automated Impression & Multidisciplinary Summary", h2_style))
    story.append(Paragraph(
        f"Automated segmentation identifies a lesion located predominantly in the <b>{meta.get('tumor_location', 'cerebral parenchyma')}</b> with an estimated total volume of <b>{wt:.1f} mL</b>. "
        f"Active gadolinium-enhancing components comprise approximately <b>{et:.1f} mL</b> ({(et/max(0.1, wt)*100):.1f}% of whole tumor burden). "
        f"Surrounding peritumoral T2/FLAIR hyperintensity spans <b>{ed:.1f} mL</b>, consistent with vasogenic edema.",
        body_style
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>Action Recommendations:</b> Correlate with clinical neurology examination, patient functional baseline (Karnofsky score), and historical scans to determine growth trajectory. "
        "Review 3D digital twin in NeuroScope 3D Studio prior to stereotactic or surgical intervention.",
        body_style
    ))
    story.append(Spacer(1, 14))

    # 6. Disclaimer Footer
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=8))
    story.append(Paragraph(
        "<b>CLINICAL DISCLAIMER:</b> This report is generated by NeuroScope 3D as a decision-support and surgical visualization aid. "
        "Machine learning predictions are based on statistical feature extraction and do not constitute an independent definitive diagnosis. "
        "All interpretations must be validated by a board-certified neuroradiologist or attending neurosurgeon.",
        ParagraphStyle("Disc", parent=meta_style, fontSize=7.5, leading=10, textColor=colors.HexColor("#64748b"))
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

if __name__ == "__main__":
    pdf_bytes = generate_clinical_pdf("case_01_right_frontal_gbm")
    out_test = ROOT / "backend" / "testdata" / "sample_report.pdf"
    out_test.write_bytes(pdf_bytes)
    print(f"Generated test PDF report: {out_test} ({len(pdf_bytes)} bytes)")
