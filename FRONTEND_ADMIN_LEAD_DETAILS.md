# פרומפט לפרונט: הצגת נתוני ליד בדף פרטי ליד (Lead Details)

**מטרה:** בדף "פרטי ליד" (למשל `/admin/leads/[id]`) יוצגו **כל נתוני הליד** שהשרת מחזיר – שם, אימייל, טלפון, מקור, נושא, הודעה, תאריך יצירה, סטטוס וכו'.

---

## דרישות

1. **קריאה ל־API**  
   - **GET** ל־`<BASE_URL>/api/admin/leads/<id>`  
   - `id` = מזהה הליד (מה־URL, למשל מפרמטר המסלול `/admin/leads/:id` או `[id]`).  
   - **Header:** `Authorization: Bearer <token>` (ה־token של האדמין).

2. **תשובת השרת**  
   - **200:** `{ "ok": true, "lead": { ... } }`  
     **`lead`** מכיל את כל השדות, למשל:  
     `_id`, `name`, `email`, `phone`, `subject`, `message`, `source`, `status`, `createdAt`, `updatedAt`, `notes`, `tags`, `utm`, `lastContactedAt`, `nextFollowUpAt`.  
   - **404:** ליד לא נמצא.  
   - **401:** אין הרשאה – להפנות ל־login.

3. **תצוגה בדף**  
   - אחרי קבלת התשובה, לשמור את הליד ב־state: `setLead(data.lead)`.  
   - להציג את הערכים **מהליד** ב־state, לא מקבועים:
     - **שם** ← `lead.name`
     - **אימייל** ← `lead.email`
     - **טלפון** ← `lead.phone`
     - **מקור** ← `lead.source`
     - **נושא** ← `lead.subject`
     - **הודעה** ← `lead.message`
     - **תאריך יצירה** ← `lead.createdAt` (לפרמט לתאריך קריא, למשל עם `new Date(lead.createdAt).toLocaleDateString()`)
     - **סטטוס** ← `lead.status` (ה־dropdown כבר יכול להציג את הערך הנוכחי מ־`lead.status`).
   - אם `lead` עדיין `null` (טרם נטען) – להציג "טוען..." ולא מקלות.  
   - אם יש שגיאה (404 / רשת) – להציג הודעה מתאימה.

4. **אימות**  
   - אם אין token – להפנות ל־דף כניסה.  
   - אם התשובה 401 – למחוק token ולהפנות ל־login.

---

## דוגמת קוד (רעיון)

```ts
// לדוגמה – דף פרטי ליד (React), id מה־URL
const [lead, setLead] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const { id } = useParams(); // או איך שמקבלים את ה־id

useEffect(() => {
  const token = localStorage.getItem("adminToken");
  if (!token) {
    window.location.href = "/admin/login";
    return;
  }
  if (!id) return;
  fetch(`${BASE_URL}/api/admin/leads/${id}`, {
    headers: { "Authorization": "Bearer " + token },
  })
    .then((res) => res.json())
    .then((data) => {
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        window.location.href = "/admin/login";
        return;
      }
      if (data.ok) setLead(data.lead);
      else setError(data.error || "שגיאה");
    })
    .catch(() => setError("שגיאת רשת"))
    .finally(() => setLoading(false));
}, [id]);

// ב־JSX:
// אם loading – "טוען..."
// אם error – הודעת שגיאה
// אם lead – להציג: lead.name, lead.email, lead.phone, lead.source, lead.subject, lead.message, lead.createdAt, lead.status
// (לא להציג "-" כשהערך קיים – להשתמש ב־lead.name וכו')
```

**הערה:** בדוגמה יש באג – יש לבדוק `res.status === 401` לפני או בתוך ה־then (למשל לשמור את `res` ולבדוק בתוך ה־then). מומלץ: `const res = await fetch(...); const data = await res.json(); if (res.status === 401) { ... } else if (data.ok) setLead(data.lead);`.

---

## סיכום

- **GET /api/admin/leads/:id** עם **Authorization: Bearer &lt;token&gt;**.
- לשמור את **`data.lead`** ב־state.
- למלא את כל השדות במסך **מהאובייקט lead** (name, email, phone, source, subject, message, createdAt, status).
- לטפל ב־loading (טוען), ב־404/שגיאה וב־401 (הפניה ל־login).
