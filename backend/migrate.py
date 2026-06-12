import sqlite3

def migrate():
    conn = sqlite3.connect('memories.db')
    try:
        conn.execute("ALTER TABLE memories ADD COLUMN is_favorite INTEGER DEFAULT 0;")
        print("Added is_favorite")
    except Exception as e:
        print(e)
        
    try:
        conn.execute("ALTER TABLE memories ADD COLUMN tags TEXT DEFAULT '[]';")
        print("Added tags")
    except Exception as e:
        print(e)

    try:
        conn.execute("ALTER TABLE memories ADD COLUMN location_name TEXT;")
        print("Added location_name")
    except Exception as e:
        print(e)
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
