import os

class Settings:
    PROJECT_NAME: str = "For Papa - Memory Book"
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "for_papa_memories")
    # Base folder for uploaded files
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage")))
    # Curator PIN for owner curation (deleting, setting cover, moderate)
    CURATOR_PIN: str = os.getenv("CURATOR_PIN", "1963") # Default PIN

settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
