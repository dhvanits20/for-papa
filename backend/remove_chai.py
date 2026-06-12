import sqlite3

def clean_chai():
    conn = sqlite3.connect('memories.db')
    c = conn.cursor()
    c.execute("SELECT id, title, description, tags FROM memories WHERE title LIKE '%chai%' COLLATE NOCASE OR description LIKE '%chai%' COLLATE NOCASE OR tags LIKE '%chai%' COLLATE NOCASE")
    rows = c.fetchall()
    print("Found records:", rows)
    for row in rows:
        c.execute("DELETE FROM memories WHERE id = ?", (row[0],))
        c.execute("DELETE FROM covers WHERE memory_id = ?", (row[0],))
    conn.commit()
    conn.close()
    print("Deleted successfully.")

if __name__ == '__main__':
    clean_chai()
