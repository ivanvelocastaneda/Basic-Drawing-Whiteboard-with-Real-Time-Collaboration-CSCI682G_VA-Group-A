Basic Drawing Whiteboard with Real-Time Collaboration
This project is a collaborative whiteboard application developed for CSCI682G. It allows users to draw, save, and collaborate in real-time, with additional features like login, signup, and dashboard management.

How to Run the Project
Follow these steps to set up and run the project on your local machine:

Prerequisites
Ensure you have Python 3.8+ installed on your system.

Steps
1. Clone the Repository
git clone https://github.com/ivanvelocastaneda/Basic-Drawing-Whiteboard-with-Real-Time-Collaboration-CSCI682G_VA-Group-A.git  

2. Navigate into the Project Directory
cd Basic-Drawing-Whiteboard-with-Real-Time-Collaboration-CSCI682G_VA-Group-A  

3. Install Required Packages
- Install the necessary dependencies using pip:
- py -m pip install Flask Flask-SocketIO Flask-WTF marshmallow Flask-Bcrypt Flask-CORS python-dotenv  

4. Set Up Environment Variables
- Create a .env file in the project directory and add the following content:
- SECRET_KEY=da20f0d728d30f46136d75acf500ca580a47f9bd48f8eda9  

5. Run the Server
- Start the Flask server:
py server.py  

6. Access the Application
Open a web browser and go to http://127.0.0.1:5000 to access the whiteboard application.


Structure of the Project
collaborative-whiteboard/  
│  
├── server.py                  # Flask server  
├── requirements.txt           # Dependencies  
├── .gitignore                 # Git ignore rules  
│  
├── static/                    # Static assets  
│   ├── js/  
│   │   ├── whiteboard.js      # JavaScript file for drawing functionality  
│   │   └── signupAndLogin.js  # JavaScript file for signup and login functionalities  
│   └── css/                   # CSS files for styling  
│       ├── whiteboard.css     # Styles for the whiteboard interface  
│       ├── login.css          # Styles for the login interface  
│       ├── signup.css         # Styles for the signup interface  
│       └── dashboard.css      # Styles for the dashboard interface  
│  
└── templates/                 # HTML templates  
    ├── index.html             # Main whiteboard interface  
    ├── login.html             # Login frontend interface  
    ├── signup.html            # Signup frontend interface  
    └── dashboard.html         # Dashboard frontend interface  
Dependencies
These are the key Python libraries used in the project:

Flask==2.1.2
Flask-SocketIO==5.2.0
For a complete list, refer to requirements.txt.

Enjoy collaborating in real-time!
