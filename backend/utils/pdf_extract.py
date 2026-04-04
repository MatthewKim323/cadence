from __future__ import annotations
import io
import fitz  # PyMuPDF
from .supabase_client import supabase


async def download_and_extract(file_path: str) -> str:
    """Download a file from Supabase Storage and extract its text."""
    res = supabase.storage.from_("writing-samples").download(file_path)

    if file_path.lower().endswith(".pdf"):
        return _extract_pdf(res)

    # plain text / markdown / rtf fallback
    try:
        return res.decode("utf-8")
    except (UnicodeDecodeError, AttributeError):
        return res.decode("latin-1")


def _extract_pdf(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n\n".join(pages)


async def fetch_document_texts(document_ids: list[str], user_id: str) -> list[dict]:
    """Fetch documents metadata + extracted text for a list of doc IDs."""
    result = (
        supabase.table("documents")
        .select("id, filename, category, file_path")
        .eq("user_id", user_id)
        .in_("id", document_ids)
        .execute()
    )
    docs = result.data or []

    extracted = []
    for doc in docs:
        text = await download_and_extract(doc["file_path"])
        extracted.append({
            "id": doc["id"],
            "filename": doc["filename"],
            "category": doc["category"],
            "text": text,
        })
    return extracted
