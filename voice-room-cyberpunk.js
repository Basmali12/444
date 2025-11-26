// === إعداد Firebase / Firestore ===
const firebaseConfig = {
  apiKey: "AIzaSyBPapPdivEQO1UPqQdCRTBI6ct8KZDtqyw",
  authDomain: "sjfie-bed64.firebaseapp.com",
  projectId: "sjfie-bed64",
  storageBucket: "sjfie-bed64.firebasestorage.app",
  messagingSenderId: "67450727104",
  appId: "1:67450727104:web:4d271f44bab9740571db25"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// روم واحد حالياً
const roomDoc = db.collection("voiceRooms").doc("mainRoom");
const messagesCol = roomDoc.collection("messages");

// === اسم المستخدم ===
let currentUserName =
  localStorage.getItem("chat_username") ||
  localStorage.getItem("chat_name") ||
  prompt("اكتب اسمك لعرضه في الروم:", "زائر") ||
  "زائر";

currentUserName = currentUserName.trim() || "زائر";
localStorage.setItem("chat_username", currentUserName);

document.getElementById("currentUserLabel").textContent = currentUserName;

// === حجز المايكات ===
const micButtons = Array.from(document.querySelectorAll(".mic-btn"));

micButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const micNumber = Number(btn.dataset.mic);
    claimMic(micNumber);
  });
});

// يحجز المايك للمستخدم الحالي (مع تحرير أي مايك كان حاجزه)
async function claimMic(micNumber) {
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(roomDoc);
      const data = snap.exists ? snap.data() : {};

      const updates = {};
      // فضّي أي مايكات كنت حاجزها
      for (let i = 1; i <= 5; i++) {
        const field = "mic" + i;
        if (data[field] === currentUserName) {
          updates[field] = null;
        }
      }

      const clickedField = "mic" + micNumber;
      const currentOwner = data[clickedField];

      // إذا كنت حاجز نفس المايك وضغطت مرة ثانية -> تلغيه
      if (currentOwner === currentUserName) {
        updates[clickedField] = null;
      } else {
        // لو ما حجزه أحد أو واحد ثاني، نخليه بإسمك
        updates[clickedField] = currentUserName;
      }

      tx.set(roomDoc, updates, { merge: true });
    });
  } catch (err) {
    console.error("خطأ في حجز المايك:", err);
    alert("صار خطأ بسيط في حجز المايك، حاول مرة ثانية.");
  }
}

// مستمع حي لتغيّرات المايكات
roomDoc.onSnapshot((snap) => {
  const data = snap.exists ? snap.data() : {};
  let activeMics = 0;

  micButtons.forEach((btn) => {
    const micNumber = Number(btn.dataset.mic);
    const field = "mic" + micNumber;
    const ownerName = data[field];
    const ownerLabel = btn.querySelector("[data-owner]");

    btn.classList.remove("self", "busy");

    if (!ownerName) {
      // المايك فاضي
      ownerLabel.textContent = "متاح";
    } else if (ownerName === currentUserName) {
      // أنت حاجز هذا المايك
      btn.classList.add("self");
      ownerLabel.textContent = "أنت";
      activeMics++;
    } else {
      // شخص آخر حاجزه
      btn.classList.add("busy");
      ownerLabel.textContent = ownerName.slice(0, 10);
      activeMics++;
    }
  });

  const subtitle = document.getElementById("roomSubtitle");
  subtitle.textContent = `${activeMics} مايك فعال · شات أبو أمير – Cyberpunk`;
});

// === الشات داخل الروم ===
const messagesContainer = document.getElementById("messagesContainer");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");

// إرسال رسالة
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  try {
    await messagesCol.add({
      text,
      user: currentUserName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    messageInput.value = "";
  } catch (err) {
    console.error("خطأ في إرسال الرسالة:", err);
  }
});

// استلام الرسائل لايف
messagesCol
  .orderBy("createdAt", "asc")
  .limit(100)
  .onSnapshot((snap) => {
    messagesContainer.innerHTML = "";
    snap.forEach((doc) => {
      const msg = doc.data();
      appendMessage(msg);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

function appendMessage(msg) {
  if (!msg || !msg.text || !msg.user) return;

  const wrapper = document.createElement("div");
  wrapper.className = "msg-bubble";
  if (msg.user === currentUserName) wrapper.classList.add("self");

  const header = document.createElement("div");
  header.className = "msg-header";

  const userSpan = document.createElement("span");
  userSpan.textContent = msg.user;

  const timeSpan = document.createElement("span");
  if (msg.createdAt?.toDate) {
    const d = msg.createdAt.toDate();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    timeSpan.textContent = `${hh}:${mm}`;
  } else {
    timeSpan.textContent = "";
  }

  header.appendChild(userSpan);
  header.appendChild(timeSpan);

  const textDiv = document.createElement("div");
  textDiv.className = "msg-text";
  textDiv.textContent = msg.text;

  wrapper.appendChild(header);
  wrapper.appendChild(textDiv);
  messagesContainer.appendChild(wrapper);
}

// عدد الأونلاين (بسيط جداً – مو presence حقيقي)
document.getElementById("onlineLabel").textContent =
  "روم تجريبي – الأعضاء حسب المايكات والرسائل";
