import sqlite3

def init_db():
    with sqlite3.connect('whiteboard.db', timeout=10) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")  # Enable WAL mode
        c = conn.cursor()

        # Create tables only if they do not exist
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        ''')
        
        # c.execute('''
        #     CREATE TABLE IF NOT EXISTS whiteboards (
        #         id INTEGER PRIMARY KEY AUTOINCREMENT,
        #         user_id INTEGER NOT NULL,
        #         name TEXT NOT NULL,
        #         data TEXT,
        #         image TEXT,
        #         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        #         FOREIGN KEY (user_id) REFERENCES users (id)
        #     )
        # ''')
        
        conn.commit()
        
        # # Drop existing tables
        # c.execute('DROP TABLE IF EXISTS whiteboards')
        # c.execute('DROP TABLE IF EXISTS users')
        
        # # Create new tables
        # c.execute('''
        #     CREATE TABLE users (
        #         id INTEGER PRIMARY KEY AUTOINCREMENT,
        #         username TEXT UNIQUE NOT NULL,
        #         email TEXT UNIQUE NOT NULL,
        #         password TEXT NOT NULL
        #     )
        # ''')
        
        # c.execute('''
        #     CREATE TABLE whiteboards (
        #         id INTEGER PRIMARY KEY AUTOINCREMENT,
        #         user_id INTEGER NOT NULL,
        #         name TEXT NOT NULL,
        #         data TEXT,
        #         image TEXT,
        #         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        #         FOREIGN KEY (user_id) REFERENCES users (id)
        #     )
        # ''')
        
        # conn.commit()
