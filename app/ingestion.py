from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from supabase import create_client
from app.config import settings
import os

def run_ingestion():
    print("Loading PDF documents from data/ ...")
    loader = DirectoryLoader(
        "data",
        glob="*.pdf",
        loader_cls=PyPDFLoader,
        show_progress=True
    )
    documents = loader.load()
    print(f"Loaded {len(documents)} page(s) from PDFs.")

    # Add category metadata based on filename (e.g. "services.pdf" -> category "services")
    for doc in documents:
        source_path = doc.metadata.get("source", "")
        filename = os.path.basename(source_path)
        category = os.path.splitext(filename)[0]
        doc.metadata["category"] = category
        doc.metadata["filename"] = filename

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100
    )
    chunks = splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunk(s).")

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=settings.google_api_key
    )

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    # Clear old documents to prevent duplicate matches in search
    print("Clearing old documents from Supabase...")
    supabase.table("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    for i, chunk in enumerate(chunks):
        vector = embeddings.embed_query(chunk.page_content)
        supabase.table("documents").insert({
            "content": chunk.page_content,
            "metadata": chunk.metadata,
            "embedding": vector
        }).execute()
        print(f"Inserted chunk {i+1}/{len(chunks)} [{chunk.metadata.get('category')}]")

    print("Ingestion complete.")

if __name__ == "__main__":
    run_ingestion()
