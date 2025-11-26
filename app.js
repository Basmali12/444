// ===== 1) إعداد Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyBPapPdivEQO1UPqQdCRTBI6ct8KZDtqyw",
  authDomain: "sjfie-bed64.firebaseapp.com",
  projectId: "sjfie-bed64",
  storageBucket: "sjfie-bed64.firebasestorage.app",
  messagingSenderId: "67450727104",
  appId: "1:67450727104:web:4d271f44bab9740571db25"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== 2) متغيرات عامة =====
let myUid = null;
let myName = "";
let myAvatar = "";
let currentRoomId = null;
let currentRoomTitle = "";
let currentRoomSubtitle = "";
let messagesUnsub = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let micToastTimeout = null;

// عناصر DOM
const appEl = document.getElementById("app");
const nameModal = document.getElementById("nameModal");
const nameInput = document.getElementById("nameInput");
const nameError = document.getElementById("nameError");
const headerSubtitle = document.getElementById("headerSubtitle");
const messagesList = document.getElementById("messagesList");
const msgInput = document.getElementById("msgInput");
const micBtn = document.getElementById("micBtn");
const imgInput = document.getElementById("imgInput");
const usersList = document.getElementById("usersList");
const voiceMicsBar = document.getElementById("voiceMicsBar");
const micToast = document.getElementById("micToast");

// ===== 3) تهيئة عند تحميل الصفحة =====
window.addEventListener("load", () => {
  // uid ثابت لكل جهاز
  myUid = localStorage.getItem("chat_uid");
  if (!myUid) {
    myUid = "u_" + Date.now() + "_" + Math.floor(Math.random() * 999999);
    localStorage.setItem("chat_uid", myUid);
  }

  const storedName = localStorage.getItem("chat_display_name");
  const storedAvatar = localStorage.getItem("chat_avatar");

  if (storedName && storedName.trim()) {
    myName = storedName.trim();
    myAvatar = storedAvatar || "";
    nameModal.style.display = "none";
    appEl.style.display = "flex";
    updateAvatarPreview();
    saveUserDoc();
    goHome();
  } else {
    nameModal.style.display = "flex";
    appEl.style.display = "none";
  }

  msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  imgInput.addEventListener("change", handleImageSelect);

  const avatarInput = document.getElementById("avatarInput");
  avatarInput.addEventListener("change", handleAvatarSelect);
});

// ===== 4) الدخول بالاسم فقط =====
function enterWithName() {
  const name = (nameInput.value || "").trim();
  if (!name) {
    nameError.textContent = "الرجاء إدخال اسم.";
    return;
  }
  myName = name;
  localStorage.setItem("chat_display_name", myName);
  nameError.textContent = "";
  nameInput.value = "";

  nameModal.style.display = "none";
  appEl.style.display = "flex";

  updateAvatarPreview();
  saveUserDoc();
  goHome();
}

function goHome() {
  stopMessagesListener();
  currentRoomId = null;
  updateVoiceMicsVisibility();
  showScreen("homeScreen");
  headerSubtitle.textContent = "الواجهة الرئيسية";
}

// ===== 5) شاشة التنقل =====
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function handleBack() {
  goHome();
}

// ===== 6) فتح روم (عام / مجموعة / خاص) =====
function openRoom(roomId, title, subtitle) {
  currentRoomId = roomId;
  currentRoomTitle = title;
  currentRoomSubtitle = subtitle || roomId;

  document.getElementById("chatTitle").textContent = currentRoomTitle;
  document.getElementById("chatRoomLabel").textContent = currentRoomSubtitle;

  updateVoiceMicsVisibility();

  showScreen("chatScreen");
  headerSubtitle.textContent = "غرفة: " + currentRoomTitle;

  startMessagesListener();
}

// شريط المايكات في الشات (مستقبلاً لو حبّيت تربطه بشيء)
function updateVoiceMicsVisibility() {
  if (currentRoomId && currentRoomId.startsWith("voice_")) {
    voiceMicsBar.style.display = "flex";
  } else {
    voiceMicsBar.style.display = "none";
  }
}

function startMessagesListener() {
  stopMessagesListener();
  if (!currentRoomId) return;

  messagesUnsub = db.collection("messages")
    .where("room", "==", currentRoomId)
    .orderBy("timestamp", "asc")
    .onSnapshot((snapshot) => {
      messagesList.innerHTML = "";
      snapshot.forEach((doc) => {
        const msg = doc.data();
        renderMessage(msg);
      });
      scrollToBottom();
    });
}

function stopMessagesListener() {
  if (messagesUnsub) {
    messagesUnsub();
    messagesUnsub = null;
  }
}

// ===== 7) رسم رسالة =====
function renderMessage(msg) {
  const div = document.createElement("div");
  const isMine = msg.senderId === myUid;

  div.className = "message " + (isMine ? "mine" : "other");

  const timeText = msg.timestamp
    ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  let inner = "";

  if (!isMine) {
    inner += `<div class="msg-header">`;
    if (msg.senderAvatar) {
      inner += `<img class="msg-avatar" src="${msg.senderAvatar}" alt="">`;
    } else {
      const initial = (msg.senderName || "?").slice(0,1);
      inner += `<div class="msg-avatar" style="display:flex;align-items:center;justify-content:center;font-size:12px;">${initial}</div>`;
    }
    inner += `<span class="msg-sender">${msg.senderName || "مستخدم"}</span>`;
    inner += `</div>`;
  }

  if (msg.type === "image") {
    inner += `<img src="${msg.content}" class="msg-img">`;
  } else if (msg.type === "audio") {
    inner += `<audio controls src="${msg.content}"></audio>`;
  } else {
    inner += `<div class="msg-text">${msg.content || ""}</div>`;
  }

  inner += `<div class="msg-time">${timeText}</div>`;

  div.innerHTML = inner;
  messagesList.appendChild(div);
}

function scrollToBottom() {
  messagesList.scrollTop = messagesList.scrollHeight;
}

// ===== 8) إرسال رسالة =====
function sendMessage() {
  const text = (msgInput.value || "").trim();
  if (!text || !currentRoomId) return;

  pushMessageToFirestore(text, "text");
  msgInput.value = "";
}

function pushMessageToFirestore(content, type) {
  if (!myName || !currentRoomId) return;

  db.collection("messages").add({
    room: currentRoomId,
    senderId: myUid,
    senderName: myName,
    senderAvatar: myAvatar || null,
    type: type,
    content: content,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ===== 9) صور الرسائل =====
function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file || !currentRoomId) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.src = ev.target.result;
    img.onload = function() {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const maxW = 600;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      pushMessageToFirestore(dataUrl, "image");
      imgInput.value = "";
    };
  };
  reader.readAsDataURL(file);
}

// ===== 10) تسجيل صوت (رسائل صوتية في الشات) =====
async function toggleRecording() {
  if (!currentRoomId) {
    alert("أدخل غرفة أولاً.");
    return;
  }
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          pushMessageToFirestore(reader.result, "audio");
        };
      };
      mediaRecorder.start();
      isRecording = true;
      micBtn.classList.add("recording");
      setTimeout(() => {
        if (isRecording) toggleRecording();
      }, 60000);
    } catch (err) {
      alert("يجب السماح بالمايكروفون.");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    micBtn.classList.remove("recording");
  }
}

// ===== 11) الملف الشخصي =====
function openProfile() {
  document.getElementById("profileNameInput").value = myName || "";
  document.getElementById("profileError").textContent = "";
  updateAvatarPreview();
  document.getElementById("profileModal").style.display = "flex";
}

function closeProfile() {
  document.getElementById("profileModal").style.display = "none";
}

function updateAvatarPreview() {
  const avatarPreview = document.getElementById("avatarPreview");
  if (myAvatar) {
    avatarPreview.src = myAvatar;
  } else {
    const baseName = myName || "U";
    avatarPreview.src =
      "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(baseName) +
      "&background=111827&color=fff";
  }
}

function handleAvatarSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    myAvatar = ev.target.result;
    localStorage.setItem("chat_avatar", myAvatar);
    updateAvatarPreview();
    saveUserDoc();
  };
  reader.readAsDataURL(file);
}

function saveProfile() {
  const newName = (document.getElementById("profileNameInput").value || "").trim();
  const err = document.getElementById("profileError");
  if (!newName) {
    err.textContent = "الرجاء إدخال اسم صحيح.";
    return;
  }
  myName = newName;
  localStorage.setItem("chat_display_name", myName);
  err.textContent = "تم حفظ الاسم.";
  saveUserDoc();
  setTimeout(() => closeProfile(), 800);
}

// حفظ المستخدم في كولكشن users
function saveUserDoc() {
  if (!myUid) return;
  db.collection("users").doc(myUid).set(
    {
      uid: myUid,
      displayName: myName || "مستخدم",
      avatar: myAvatar || null,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

// ===== 12) شاشة المستخدمين + دردشة خاصة =====
function openUsersScreen() {
  showScreen("usersScreen");
  headerSubtitle.textContent = "المستخدمون";
  loadUsersList();
}

function loadUsersList() {
  usersList.innerHTML = "جارِ التحميل...";
  db.collection("users")
    .orderBy("lastSeen", "desc")
    .limit(100)
    .get()
    .then((snapshot) => {
      usersList.innerHTML = "";
      snapshot.forEach((doc) => {
        const u = doc.data();
        if (!u.uid || u.uid === myUid) return;

        const item = document.createElement("div");
        item.className = "user-item";
        item.onclick = () => openPrivateChat(u.uid, u.displayName || "مستخدم");

        let avatarHtml = "";
        if (u.avatar) {
          avatarHtml = `<img src="${u.avatar}" alt="">`;
        } else {
          const initial = (u.displayName || "م").slice(0, 1);
          avatarHtml = `<span class="user-initial">${initial}</span>`;
        }

        item.innerHTML = `
          <div class="user-avatar">${avatarHtml}</div>
          <div class="user-info">
            <h4>${u.displayName || "مستخدم"}</h4>
            <p>دردشة خاصة</p>
          </div>
        `;
        usersList.appendChild(item);
      });
      if (!usersList.innerHTML.trim()) {
        usersList.innerHTML = "<p>ماكو مستخدمين غيرك حالياً.</p>";
      }
    })
    .catch(() => {
      usersList.innerHTML = "<p>خطأ في تحميل المستخدمين.</p>";
    });
}

function openPrivateChat(otherUid, otherName) {
  const ids = [myUid, otherUid].sort();
  const roomId = "dm_" + ids[0] + "_" + ids[1];
  openRoom(roomId, "دردشة خاصة", "مع: " + otherName);
}

// ===== 13) شاشة المجموعات =====
function openGroupsScreen() {
  showScreen("groupsScreen");
  headerSubtitle.textContent = "المجموعات";
}

// ===== 14) الغرف الصوتية – تفتح صفحة Cyberpunk فقط =====
function openVoiceRoomsScreen() {
  showScreen("voiceRoomsScreen");
  headerSubtitle.textContent = "الغرف الصوتية";
}

// ===== 15) TOAST المايك في الشات =====
function showMicToast() {
  if (!micToast) return;
  micToast.style.display = "block";
  requestAnimationFrame(() => {
    micToast.classList.add("show");
  });

  if (micToastTimeout) clearTimeout(micToastTimeout);
  micToastTimeout = setTimeout(() => {
    hideMicToast();
  }, 3500);
}

function hideMicToast() {
  if (!micToast) return;
  micToast.classList.remove("show");
  micToastTimeout = setTimeout(() => {
    micToast.style.display = "none";
  }, 250);
}

// شريط المايكات في الشات (مو مرتبط بـ WebRTC – مجرد شكل حالياً)
function handleMicClick(slot) {
  showMicToast();
}

// ===== 16) فتح روم الصوت السايبر بانك من داخل شات أبو أمير =====
function goToVoiceRoom(roomId, roomName) {
  const userName =
    localStorage.getItem("chat_display_name") ||
    localStorage.getItem("voiceUserName") ||
    "ضيف";

  const url =
    "voice-room-cyberpunk.html" +
    "?roomId=" + encodeURIComponent(roomId) +
    "&roomName=" + encodeURIComponent(roomName) +
    "&user=" + encodeURIComponent(userName);

  window.location.href = url;
}
