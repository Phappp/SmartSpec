🧩Mối quan hệ giữa các Schema 

USERS (1)
 ├── PROJECTS (n)
 │     ├── VERSIONS (n)
 │     │     ├── INPUTS (n)
 │     │     ├── OUTPUTS (n)
 │     │     │     ├── DATABASES (1)
 │     │     │     ├── TESTCASES (n)
 │     │     │     └── UMLS (1)
 │     │     │           ├── USECASE_DIAGRAMS (n)
 │     │     │           │      └── ACTIVITY_DIAGRAMS (n)
 │     │     │           │             └── SEQUENCE_DIAGRAMS (n)
 │     │     ├── LOGS (n)
 │     │     └── NOTIFICATIONS (n)
 │     └── MEMBERS (embedded)
 │
 └── LOGS, NOTIFICATIONS (cross-project)



🧩Luồng Tạo dữ liệu:

Input (ảnh/docx/audio)
   ↓
AI / Python pipeline xử lý
   ↓
Output
   ├── Database (ERD sinh từ requirement)
   ├── Testcase (từ usecase hoặc db)
   └── UML
         ├── UsecaseDiagram (từ requirement_model)
         ├── ActivityDiagram (từ Usecase)
         └── SequenceDiagram (từ Activity)
   ↓
Lưu toàn bộ vào Version
   ↓
Version gắn vào Project

