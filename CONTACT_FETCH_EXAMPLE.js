/**
 * דוגמה לשליחת ליד מ-Contact.tsx – גרסה שמוגנת מפני תשובה ריקה/לא-JSON
 *
 * ב-Contact.tsx עדכני:
 * 1. הודעת שגיאה: description: data?.error || data?.message || "שגיאה בשליחת ההודעה..."
 * 2. body יכול לכלול subject (ה-backend תומך ב-subject ו-source)
 */

async function submitLead(formData) {
  const url = "http://localhost:8080/api/leads"; // או המשתנה שלכן ל-API
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      subject: formData.subject,
      message: formData.message,
      source: formData.subject ?? formData.source ?? "",
    }),
  });

  const text = await res.text();
  if (!text) {
    throw new Error("שגיאת שרת – אין תשובה");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("שגיאת שרת – תשובה לא תקינה");
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || "שגיאה בשמירת הליד");
  }

  return data;
}

// שימוש ב-handleSubmit (React):
// try {
//   const data = await submitLead(formData);
//   // הצלחה – data.lead
// } catch (e) {
//   toast({ description: e.message, variant: "destructive" });
// }
