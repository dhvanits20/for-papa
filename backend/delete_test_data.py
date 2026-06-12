import sqlite3
import os

db_path = 'memories.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("DELETE FROM memories WHERE title = 'Chai with Papa';")
    cur.execute("DELETE FROM covers WHERE memory_id NOT IN (SELECT id FROM memories);")
    conn.commit()
    conn.close()
    print('Deleted.')
else:
    print('DB not found.')
