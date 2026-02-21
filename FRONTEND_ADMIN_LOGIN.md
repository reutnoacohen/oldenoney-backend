# פרומט לפרונט: דף כניסת אדמין (Admin Login)

הבקאנד מוכן עם כניסת אדמין אמיתית (שם משתמש + סיסמה). השתמשי בפרומט הזה כדי לבנות את דף הכניסה והגנה על דפי האדמין בפרונט.

---

## מה הבקאנד מספק

1. **הרשמת אדמין חדש (פעם אחת)**  
   `POST /api/admin/setup`  
   Body: `{ "setupKey": "...", "username": "...", "password": "..." }`  
   - `setupKey` = הערך של `ADMIN_SETUP_KEY` ב-.env (רק מי שיודע את המפתח יכול ליצור אדמין).  
   - אחרי שנוצר אדמין אחד, הקריאה תחזיר 409 – "Admin already exists".

2. **כניסה (Login)**  
   `POST /api/admin/login`  
   Body: `{ "username": "...", "password": "..." }`  
   Response: `{ "ok": true, "token": "eyJ...", "username": "..." }`  
   - השדה `token` הוא JWT – יש לשמור אותו (localStorage / sessionStorage / cookie) ולשלוח בכל בקשת אדמין.

3. **קריאות לאדמין (לידים וכו')**  
   כל קריאה ל־`/api/admin/leads` (GET, PATCH, POST notes, DELETE) חייבת לכלול:  
   **Header:** `Authorization: Bearer <token>`  
   (או `x-admin-key` אם מוגדר בבקאנד – לסקריפטים).

---

## דרישות לפרונט

### 1. דף כניסה (Login page)

- **URL:** למשל `/admin/login` או `/login` (לא נגיש אחרי כניסה).
- **שדות:** שם משתמש (username), סיסמה (password), כפתור "כניסה".
- **בשליחת הטופס:**  
  - `POST` ל־`<API_BASE>/api/admin/login` עם `{ username, password }`.  
  - אם `response.ok` ו־`data.token`: לשמור את `data.token` (למשל ב־localStorage: `localStorage.setItem("adminToken", data.token)`) ואת `data.username` אם צריך, ואז להפנות ל־דשבורד האדמין (למשל `/admin` או `/admin/leads`).  
  - אם 401: להציג "שם משתמש או סיסמה שגויים".  
  - אם שגיאה אחרת: להציג הודעת שגיאה כללית מ־`data.error`.

### 2. הגנה על דפי אדמין

- בכל דף שמשתמש ב־Admin API (רשימת לידים, עריכת ליד וכו'):  
  - אם **אין** token (למשל `localStorage.getItem("adminToken")` ריק) – להפנות ל־דף הכניסה (`/admin/login`).  
  - אם יש token – לשלוח אותו ב־כל קריאת `fetch` ל־`/api/admin/*`:  
    `headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }` (כולל GET).
- אם בקשת אדמין מחזירה **401**: למחוק את ה-token, להציג הודעה (או לא), ולהפנות ל־דף הכניסה.

### 3. התנתקות (Logout)

- כפתור "התנתקות" שמבצע: מחיקת ה-token (למשל `localStorage.removeItem("adminToken")`) והפניה ל־דף הכניסה.

### 4. דף Setup (אופציונלי)

- אם את רוצה שהמנהל יוכל ליצור את עצמו בפעם הראשונה מהממשק:  
  - דף נפרד (למשל `/admin/setup`) עם שדות: מפתח התקנה (setupKey), שם משתמש, סיסמה (לפחות 6 תווים).  
  - שליחה ל־`POST /api/admin/setup` עם `{ setupKey, username, password }`.  
  - אחרי הצלחה – להפנות ל־דף הכניסה.  
- אחרת: המנהל יכול ליצור אדמין פעם אחת דרך Postman/curl (ראה ADMIN_API.md).

---

## משתני סביבה (פרונט)

- **API Base URL** – כתובת הבקאנד, למשל `http://localhost:8080` או `process.env.NEXT_PUBLIC_API_URL`.  
  כל הקריאות: `${API_BASE}/api/admin/login`, `${API_BASE}/api/admin/leads` וכו'.

---

## סיכום זרימה

1. משתמש נכנס ל־`/admin/login`, מזין username + password, לוחץ כניסה.  
2. פרונט שולח `POST /api/admin/login`, מקבל `token`.  
3. פרונט שומר `token` (localStorage) ומפנה ל־`/admin` (או דשבורד לידים).  
4. בכל קריאה ל־`/api/admin/leads` הפרונט מוסיף `Authorization: Bearer <token>`.  
5. התנתקות: מחיקת token + הפניה ל־`/admin/login`.

---

## דוגמת fetch לכניסה (Login)

```js
const res = await fetch(`${API_BASE}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});
const data = await res.json();
if (data.ok && data.token) {
  localStorage.setItem("adminToken", data.token);
  // redirect to /admin
} else {
  // show data.error (e.g. "Invalid username or password")
}
```

## דוגמת fetch עם token (קריאה ללידים)

```js
const token = localStorage.getItem("adminToken");
if (!token) {
  // redirect to /admin/login
  return;
}
const res = await fetch(`${API_BASE}/api/admin/leads?page=1&limit=20`, {
  headers: { "Authorization": "Bearer " + token },
});
```

---

זה הפרומט המלא לפרונט – דף כניסה, שמירת JWT, שליחת ה־token בכל קריאת אדמין, והתנתקות.
