import sqlite3

DATABASE = 'whiteboard.db'

def get_db_connection():
    """Create a new database connection."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # This allows us to access columns by name
    return conn

def init_db():
    """Initialize the database and create the necessary tables."""
    with get_db_connection() as conn:
        c = conn.cursor()
        # Create users table with an email column
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,  -- Added email column
                password TEXT NOT NULL
            )
        ''')
        # Add other tables here as needed
        conn.commit()

# Call init_db() to ensure tables are created when the app starts
if __name__ == '__main__':
    init_db()
