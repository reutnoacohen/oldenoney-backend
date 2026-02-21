# פרומפט לפרונט: הצגת לידים בדף admin/leads

הבקאנד מחזיר לידים ב־**GET /api/admin/leads**. דף **admin/leads** (או admin/lrads – לפי המסלול אצלך) צריך לקרוא ל־API, לקבל את הרשימה ולהציג אותה.

---

## דרישות

1. **אימות**  
   - בדף admin/leads (או לפניו): אם אין token (למשל `localStorage.getItem("adminToken")`), להפנות ל־דף כניסה (למשל `/admin/login`).  
   - בכל קריאה ל־API לשלוח:  
     **Header:** `Authorization: Bearer <token>`  
     (ה־token שנשמר אחרי login).

2. **קריאה ל־API**  
   - **GET** ל־`<BASE_URL>/api/admin/leads`  
     אפשר עם query: `?page=1&limit=20` (או limit אחר).  
   - BASE_URL = כתובת הבקאנד (למשל `http://localhost:8080` או משתנה סביבה).

3. **תשובת השרת**  
   - **200:**  
     `{ "ok": true, "items": [ ... ], "page": 1, "limit": 20, "total": N, "totalPages": M }`  
     **`items`** = מערך של לידים. כל ליד מכיל בין השאר:  
     `_id`, `name`, `email`, `phone`, `subject`, `message`, `source`, `status`, `createdAt`, `updatedAt`, `notes`, `tags`, `utm`, `isDeleted`, `lastContactedAt`, `nextFollowUpAt`.  
   - **401:**  
     למחוק את ה־token, להפנות ל־דף כניסה (או להציג "פג תוקף – התחברי מחדש").

4. **תצוגה בדף**  
   - להציג את **`data.items`** בטבלה או כרשימת כרטיסים.  
   - עמודות/שדות מומלצים: שם, אימייל, טלפון, נושא (subject), הודעה (או תקציר), מקור (source), סטטוס (status), תאריך (createdAt).  
   - אם `items.length === 0` – להציג הודעה כמו "אין לידים" או "טרם התקבלו לידים".  
   - אופציונלי: pagination לפי `page`, `totalPages`, `total` (כפתורי "הבא" / "הקודם" או מספרי עמודים).

5. **מצבי UI**  
   - **טוען:** להציג ספינר/טקסט "טוען..." בזמן ה־fetch.  
   - **שגיאה:** אם ה־fetch נכשל או `data.ok === false`, להציג הודעת שגיאה (למשל מ־`data.error`).  
   - **401:** כנ"ל – להציג הודעה ולהפנות ל־login.

---

## דוגמת קוד (React)

```ts
const [leads, setLeads] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const token = localStorage.getItem("adminToken");
  if (!token) {
    window.location.href = "/admin/login";
    return;
  }
  fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/leads?page=1&limit=50`, {
    headers: { "Authorization": "Bearer " + token },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.ok) setLeads(data.items);
      else setError(data.error || "שגיאה");
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        window.location.href = "/admin/login";
      }
    })
    .catch(() => setError("שגיאת רשת"))
    .finally(() => setLoading(false));
}, []);

// ב־JSX: אם loading – "טוען..."; אם error – הודעת שגיאה; אחרת טבלה/רשימה של leads
// (למשל lead.name, lead.email, lead.phone, lead.subject, lead.createdAt).
```

(בפרויקט שלך להתאים: שם משתנה ה־API, מסלול login, ולטפל ב־res.status לפני res.json() אם צריך.)

---

## סיכום לפרונט

- דף **admin/leads**: רק למשתמשים מחוברים (בדיקת token).  
- **GET /api/admin/leads** עם **Authorization: Bearer &lt;token&gt;**.  
- להציג את **items** מהתשובה (טבלה או כרטיסים).  
- לטפל ב־loading, בשגיאות וב־401 (הפניה ל־login).
