import sys
try:
    import pypdf
    print("pypdf installed")
except ImportError:
    pypdf = None

try:
    import pdfplumber
    print("pdfplumber installed")
except ImportError:
    pdfplumber = None

try:
    import fitz # PyMuPDF
    print("fitz installed")
except ImportError:
    fitz = None

def extract(pdf_path, txt_path):
    print(f"Extracting {pdf_path} to {txt_path}...")
    text = ""
    if fitz:
        doc = fitz.open(pdf_path)
        for page in doc:
            text += page.get_text()
    elif pdfplumber:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    elif pypdf:
        reader = pypdf.PdfReader(pdf_path)
        for page in reader.pages:
            text += page.extract_text() or ""
    else:
        # Try to use any fallback or print error
        print("No PDF extraction library available.")
        return False
    
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Done!")
    return True

extract("scratch/Contrato 2026-429.pdf", "scratch/contrato_text.txt")
extract("scratch/Presupuesto 2026-429.pdf", "scratch/presupuesto_text.txt")
