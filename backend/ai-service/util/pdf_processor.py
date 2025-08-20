from os import getenv

from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter


class PdfDocumentEmbedder:
    def __init__(self,file_path:str,chuck_size:int=1000,chunk_overlap:int=200):
        load_dotenv()
        self.filepath = file_path
        self.database_url= getenv("KNOWLEDGE_DB_URL")
        self.loader = PyPDFLoader(self.filepath)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chuck_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        # for doc in loaded:
        #     print(doc.page_content)
        docks = self.loader.load_and_split(self.text_splitter)

    def insert_into_db(self,collection_name:str):
        docks = self.loader.load_and_split(self.text_splitter)
        vector_store = PGVector.from_documents(
            embedding=OpenAIEmbeddings(),
            collection_name=collection_name,
            documents=docks,
            connection=self.database_url,
            use_jsonb=True,
        )