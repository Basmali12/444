// ============= تهيئة Firebase =============
const firebaseConfig = {
  apiKey: "AIzaSyBPapPdivEQO1UPqQdCRTBI6ct8KZDtqyw",
  authDomain: "sjfie-bed64.firebaseapp.com",
  projectId: "sjfie-bed64",
  storageBucket: "sjfie-bed64.firebasestorage.app",
  messagingSenderId: "67450727104",
  appId: "1:67450727104:web:4d271f44bab9740571db25",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ============= متغيرات =============
let currentUser = null;
let currentUserName = "مستخدم";
let activeFilter = "all";
let roomsUnsub = null;
let messagesUnsub = null;
let activeRoomId = null;

// ============= دوال واجهة عامة =============

// زر الرجوع – عدل الرابط حسب تطبيقك الرئيسي
function handleBack() {
  // مثال: يرجع لصفحة الشات الرئيسية:
  // window.location.href = "https://basmali12.github.io/320/";
  alert("هنا اربط رجوع للواجهة الرئيسية (رابط شات أبو أمير).");
}

function forceReloadUser() {
  if (!currentUser) return;
  updateUserLabel();
}

// تحديث اسم المستخدم في الأعلى
function updateUserLabel() {
  const el = document.getElementById("userNameLabel");
  if (!currentUser) {
    el.textContent = "دخول مجهول (لم يتم تسجيل الدخول)";
    return;
  }
  currentUserName =
    currentUser.displayName ||
    (currentUser.email ? currentUser.email.split("@")[0] : "مستخدم");

  el.textContent = `مرحباً، ${currentUserName}`;
}

// ============= Auth =============
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    updateUserLabel();
    startRoomsListener();
  } else {
    // ماكو مستخدم؟ نسجل مجهول لكن حقيقي على السيرفر
    try {
      await auth.signInAnonymously();
    } catch (err) {
      console.error("فشل تسجيل مجهول:", err);
      document.getElementById("userNameLabel").textContent =
        "فشل في الاتصال بالمصادقة.";
    }
  }
});

// ============= الرومات من Firestore =============

function startRoomsListener() {
  if (roomsUnsub) roomsUnsub();

  roomsUnsub = db
    .collection("voiceRooms")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snap) => {
        const rooms = [];
        snap.forEach((doc) => {
          rooms.push({ id: doc.id, ...doc.data() });
        });
        renderRoomsList(rooms);
      },
      (err) => {
        console.error("خطأ جلب الرومات:", err);
      }
    );
}

function changeFilter(filter, btn) {
  activeFilter = filter;
  document
    .querySelectorAll(".filter-chip")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  // سيتم التصفية داخل renderRoomsList
}

function renderRoomsList(allRooms) {
  const list = document.getElementById("roomsList");
  list.innerHTML = "";

  const rooms = allRooms.filter((room) => {
    if (activeFilter === "all") return true;
    return room.type === activeFilter;
  });

  if (!rooms.length) {
    list.innerHTML =
      '<div style="text-align:center; font-size:12px; color:#9ca3af; margin-top:10px;">لا توجد رومات في هذا القسم حالياً.</div>';
    return;
  }

  rooms.forEach((room) => {
    const card = document.createElement("div");
    card.className = "room-card";

    const listeners = room.listenersCount || 0;
    const isLocked = !!room.isLocked;
    const type = room.type || "عام";

    card.innerHTML = `
      <div class="room-main-row">
        <div>
          <div class="room-title">${room.title || "بدون عنوان"}</div>
          <div class="room-subtitle">${room.desc || ""}</div>
        </div>
        <button class="room-join-btn" onclick="enterRoom('${room.id}')">
          <i class="fa-solid fa-door-open"></i>
          دخول
        </button>
      </div>
      <div class="room-meta-row">
        <div class="room-tags">
          <span class="room-tag-pill">
            <i class="fa-solid fa-tag"></i>${type}
          </span>
          ${
            isLocked
              ? '<span class="room-tag-pill lock"><i class="fa-solid fa-lock"></i>مقفلة</span>'
              : '<span class="room-tag-pill"><i class="fa-solid fa-unlock"></i>مفتوحة</span>'
          }
          <span class="room-tag-pill voice-only">
            <i class="fa-solid fa-microphone"></i>صوتي فقط
          </span>
        </div>
        <div class="room-users">
          <i class="fa-solid fa-user-group"></i>
          <span>${listeners} متواجد</span>
        </div>
      </div>
    `;

    list.appendChild(card);
  });
}

// إنشاء روم جديد
async function createRoomPrompt() {
  const title = prompt("اسم الروم الصوتي:");
  if (!title) return;

  const type =
    prompt(
      "نوع الروم (تعارف / سوالف / ألعاب / صدافة / إشعارات):",
      "تعارف"
    ) || "تعارف";

  const desc = prompt("وصف بسيط للروم:", "جلسة دردشة صوتية") || "";

  try {
    await db.collection("voiceRooms").add({
      title,
      type,
      desc,
      isLocked: false,
      listenersCount: 0,
      hostUid: currentUser ? currentUser.uid : null,
      hostName: currentUserName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    alert("تم إنشاء الروم بنجاح ✅");
  } catch (err) {
    console.error(err);
    alert("فشل إنشاء الروم: " + err.message);
  }
}

// ============= الدخول إلى روم =============
async function enterRoom(roomId) {
  activeRoomId = roomId;

  // زيادة عدد المتواجدين
  try {
    await db
      .collection("voiceRooms")
      .doc(roomId)
      .update({
        listenersCount: firebase.firestore.FieldValue.increment(1),
      });
  } catch (e) {
    console.warn("تعذر تحديث عدد المتواجدين:", e.message);
  }

  // قراءة بيانات الروم مرة واحدة
  const doc = await db.collection("voiceRooms").doc(roomId).get();
  if (!doc.exists) {
    alert("الروم غير موجود.");
    return;
  }
  const room = doc.data();

  document.getElementById("roomTitle").textContent = room.title || "بدون عنوان";
  document.getElementById("roomSubTitle").textContent =
    room.desc || "روم صوتي";

  document.getElementById(
    "roomListeners"
  ).innerHTML = `<i class="fa-solid fa-user"></i> ${
    room.listenersCount || 0
  } متواجد`;

  renderMicsGrid(room);

  // إظهار شاشة الروم
  document.getElementById("roomsScreen").classList.remove("screen-active");
  document.getElementById("roomScreen").classList.add("screen-active");

  // بدء الاستماع للرسائل
  startMessagesListener(roomId);
}

// الخروج من الروم
async function closeRoom() {
  if (activeRoomId) {
    try {
      await db
        .collection("voiceRooms")
        .doc(activeRoomId)
        .update({
          listenersCount: firebase.firestore.FieldValue.increment(-1),
        });
    } catch (e) {
      console.warn("تعذر تخفيض عدد المتواجدين:", e.message);
    }
  }

  if (messagesUnsub) {
    messagesUnsub();
    messagesUnsub = null;
  }

  activeRoomId = null;

  document.getElementById("roomScreen").classList.remove("screen-active");
  document.getElementById("roomsScreen").classList.add("screen-active");
}

// ============= شبكة المايكات (شكل فقط حالياً) =============
function renderMicsGrid(room) {
  const grid = document.querySelector(".mics-grid");
  grid.innerHTML = "";

  const hostName = room.hostName || "المضيف";
  const names = [hostName, "زهراء", "محمد", "سارة", "حسين", "مريم", "علي", "نور", "حسن", "رنا"];

  names.slice(0, 10).forEach((name, index) => {
    const item = document.createElement("div");
    item.className = "mic-item";

    const letter = name.trim().charAt(0);

    item.innerHTML = `
      <div class="mic-avatar">
        <span>${letter}</span>
      </div>
      <div class="mic-name">${name}</div>
      ${
        index === 0
          ? '<div class="mic-muted"><i class="fa-solid fa-crown"></i> المضيف</div>'
          : ""
      }
    `;

    grid.appendChild(item);
  });
}

// ============= رسائل الروم من Firestore =============
function startMessagesListener(roomId) {
  if (messagesUnsub) messagesUnsub();

  messagesUnsub = db
    .collection("voiceRooms")
    .doc(roomId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .onSnapshot(
      (snap) => {
        const container = document.getElementById("roomMessages");
        container.innerHTML = "";
        snap.forEach((doc) => {
          const m = doc.data();
          const div = document.createElement("div");
          div.className = "room-msg";
          div.innerHTML = `<span>${m.senderName}:</span> ${m.text}`;
          container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
      },
      (err) => {
        console.error("خطأ في رسائل الروم:", err);
      }
    );
}

async function sendRoomMessage() {
  if (!activeRoomId) return;
  const input = document.getElementById("roomMsgInput");
  const text = input.value.trim();
  if (!text) return;

  try {
    await db
      .collection("voiceRooms")
      .doc(activeRoomId)
      .collection("messages")
      .add({
        text,
        senderUid: currentUser ? currentUser.uid : null,
        senderName: currentUserName,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    input.value = "";
  } catch (err) {
    console.error(err);
    alert("فشل إرسال الرسالة: " + err.message);
  }
}

function roomInputKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendRoomMessage();
  }
}

// عند إغلاق الصفحة حاول نقلل عدد المتواجدين
window.addEventListener("beforeunload", () => {
  if (activeRoomId) {
    db.collection("voiceRooms")
      .doc(activeRoomId)
      .update({
        listenersCount: firebase.firestore.FieldValue.increment(-1),
      })
      .catch(() => {});
  }
});
