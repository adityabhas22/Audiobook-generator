from fastapi import UploadFile
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import io

async def extract_text(file: UploadFile) -> str:
    """
    Extract text content from uploaded file (txt or epub)
    """
    content = await file.read()
    
    if file.filename.endswith('.txt'):
        return content.decode('utf-8')
    
    elif file.filename.endswith('.epub'):
        # Create a BytesIO object from the content
        epub_file = io.BytesIO(content)
        book = epub.read_epub(epub_file)
        
        # Extract text from all chapters
        text_content = []
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                text_content.append(soup.get_text())
        
        return '\n'.join(text_content)
    
    else:
        raise ValueError("Unsupported file format. Please upload a .txt or .epub file") 