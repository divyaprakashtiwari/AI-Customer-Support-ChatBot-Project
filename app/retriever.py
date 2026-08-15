from langchain_google_genai import GoogleGenerativeAIEmbeddings
from supabase import create_client
from app.config import settings

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=settings.google_api_key
)

supabase = create_client(settings.supabase_url, settings.supabase_service_key)

def retrieve_context(query: str, match_count: int = 5):
    query_vector = embeddings.embed_query(query)

    response = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_vector,
            "match_count": match_count,
            "filter": {}
        }
    ).execute()

    results = response.data
    return results

if __name__ == "__main__":
    test_query = "What is your refund policy?"
    results = retrieve_context(test_query)
    print(f"Query: {test_query}\n")
    for i, r in enumerate(results):
        print(f"--- Match {i+1} (similarity: {r['similarity']:.3f}) ---")
        print(r['content'])
        print()